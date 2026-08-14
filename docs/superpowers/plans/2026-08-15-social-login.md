# 소셜 로그인(로그인 필수 게이트) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** OCEAN 성격 검사에 카카오·구글 소셜 로그인 필수 게이트를 붙여, 로그인해야 검사를 시작·저장할 수 있게 하고 결과를 `auth.uid`에 귀속시킨다.

**Architecture:** 정적 사이트에 `@supabase/supabase-js`(CDN)를 얹고 `signInWithOAuth`로 클라이언트 전용 OAuth를 처리한다(별도 콜백 라우트 불필요 — supabase-js가 복귀 URL에서 세션을 자동 감지). 인증 로직은 `auth.js`(전역 `sb` 클라이언트 + `Auth` 헬퍼)로 분리하고, `app.js`는 이를 소비한다. 저장은 anon REST 직접 호출 대신 로그인 JWT가 붙는 `sb.from().insert()`로 바꾸고, RLS를 `authenticated` 전용으로 교체한다.

**Tech Stack:** Vanilla JS(빌드 없음), `@supabase/supabase-js@2`(CDN UMD), Supabase Auth(Kakao·Google), Postgres RLS.

**참조 스펙:** `docs/superpowers/specs/2026-08-14-social-login-design.md`

**대상 프로젝트:** Supabase ref `ydejsjrjminbyuquywuo`

---

## 파일 구조

| 파일 | 책임 | 변경 |
|---|---|---|
| `auth.js` | Supabase 클라이언트 생성 + 인증 헬퍼(`Auth.getSession/signIn/signOut/displayName`) | **신규** |
| `index.html` | supabase-js·auth.js 스크립트 로드, `view-name`→`view-login` 교체, 헤더 로그인 상태 영역 | 수정 |
| `styles.css` | 카카오·구글 버튼, 헤더 auth-status 스타일 | 수정 |
| `app.js` | 게이트 분기·로그인/로그아웃 액션·세션 UI·자동시작, 저장을 인증 insert로 교체 | 수정 |
| (DB 마이그레이션) | `ocean_results`에 `user_id` 추가 + RLS를 authenticated 전용으로 교체 | Supabase |

**현재 확인된 사실(변경 근거):**
- `index.html`: 스크립트 로드 262–265, `view-name` 섹션 140–155, 헤더 77–87.
- `app.js`: `SUPABASE_URL/ANON`·`NICK_MAX` 상수 1–4, 이름입력 로직 `goToNameEntry`/`submitName` 193–230, 키다운 리스너 240–245, `saveResult` 248–269, 액션 디스패치 346–357.
- `ocean_results` 컬럼: `id, created_at, nickname(NOT NULL), type_code, type_title, type_role, scores(NOT NULL), answers`. RLS 켜짐. 정책은 `anon_insert_results`(INSERT·anon·CHECK nickname 길이 1~20) 하나, SELECT 정책 없음.

---

## Task 0: 사전 준비 (사용자 수행 — 코드 아님, 게이트)

로그인은 아래가 끝나야 로컬/운영에서 동작한다. **Task 1~4 코드는 이 작업 없이도 작성·커밋 가능하나, Task 6 E2E는 이 작업이 선행되어야 한다.**

- [ ] **Step 1: 구글 OAuth 클라이언트 생성**
  - Google Cloud Console → API 및 서비스 → 사용자 인증 정보 → OAuth 2.0 클라이언트 ID 생성(웹 애플리케이션).
  - 승인된 리디렉션 URI에 `https://ydejsjrjminbyuquywuo.supabase.co/auth/v1/callback` 추가.
  - `client id`/`client secret` 확보.

- [ ] **Step 2: 카카오 앱 생성**
  - Kakao Developers → 앱 생성 → App Settings > App > Platform Key에서 **REST API 키**(= client_id) 확보.
  - 같은 화면에서 **Kakao Login Redirect URI**에 `https://ydejsjrjminbyuquywuo.supabase.co/auth/v1/callback` 등록.
  - **Kakao Login Client Secret** 활성화 후 값 확보.
  - Product Settings > Kakao Login > General에서 **State ON**.
  - Consent Items에서 `profile_nickname` 동의 설정(이름 취득용). 이메일은 Biz App만 가능하므로 생략.

- [ ] **Step 3: Supabase 제공자 활성화**
  - Supabase 대시보드 → Authentication → Sign In / Providers.
  - **Google** ON + client id/secret 입력.
  - **Kakao** ON + REST API 키/secret 입력. 이메일 미요청이므로 **Allow users without an email** ON.

- [ ] **Step 4: 리다이렉트 허용 URL 등록**
  - Supabase → Authentication → URL Configuration.
  - Site URL: `https://yhyungjun.github.io/otype/`
  - Redirect URLs에 다음 추가: `https://yhyungjun.github.io/otype/**`, `http://localhost:4173/**`

- [ ] **Step 5: 확인**
  - 대시보드 Providers 목록에 Google·Kakao가 Enabled로 보이면 완료.

---

## Task 1: Supabase 클라이언트 + Auth 모듈

**Files:**
- Create: `auth.js`
- Modify: `index.html:262-265` (스크립트 로드에 supabase-js·auth.js 추가)

- [ ] **Step 1: `auth.js` 작성**

```js
// Supabase 인증 모듈 — 전역 `sb`(클라이언트)와 `Auth`(헬퍼)를 노출한다.
// supabase-js UMD 전역 `supabase.createClient`에 의존하므로 CDN 스크립트 뒤에 로드한다.
const SUPABASE_URL = "https://ydejsjrjminbyuquywuo.supabase.co";
const SUPABASE_ANON = "sb_publishable_xIO_-uuvgxT0KkiTUF4Hng_izDPe-UZ";

const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON);

const AUTOSTART_KEY = "otype:autostart";

const Auth = {
  async getSession() {
    const { data } = await sb.auth.getSession();
    return data.session;
  },
  // provider: "kakao" | "google" — 로그인 후 검사로 자동 진입하도록 플래그를 남기고 리다이렉트한다.
  signIn(provider) {
    sessionStorage.setItem(AUTOSTART_KEY, "1");
    const redirectTo = window.location.href.split("#")[0].split("?")[0];
    return sb.auth.signInWithOAuth({ provider, options: { redirectTo } });
  },
  async signOut() {
    await sb.auth.signOut();
    window.location.reload();
  },
  // 소셜 프로필에서 표시 이름 취득. 없으면 이메일 앞부분, 그것도 없으면 "사용자".
  displayName(session) {
    const m = session?.user?.user_metadata || {};
    const email = session?.user?.email || "";
    return m.name || m.full_name || m.nickname || (email ? email.split("@")[0] : "") || "사용자";
  },
};
```

- [ ] **Step 2: `index.html` 스크립트 로드 수정**

`index.html` 262–265의 스크립트 블록을 아래로 교체(supabase-js CDN과 `auth.js`를 `app.js` 앞에 추가):

```html
  <script src="vendor/html2canvas.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
  <script src="auth.js"></script>
  <script src="data/questions.js"></script>
  <script src="data/archetypes.js"></script>
  <script src="app.js"></script>
```

- [ ] **Step 3: 검증 — 콘솔에 클라이언트 노출 확인**

Run: `node server.js` 실행 후 브라우저 `http://localhost:4173`에서 개발자도구 콘솔:
```js
typeof sb, typeof Auth   // 기대: 'object', 'object'
await Auth.getSession()  // 기대: null (미로그인)
```
Expected: `sb`, `Auth`가 정의되고 `getSession()`이 에러 없이 `null` 반환.

- [ ] **Step 4: 커밋**

```bash
git add auth.js index.html
git commit -m "feat(auth): Supabase 클라이언트·인증 헬퍼 모듈 추가"
```

---

## Task 2: 로그인 화면 + 스타일 + 헤더 상태 영역

**Files:**
- Modify: `index.html:140-155` (`view-name` → `view-login`)
- Modify: `index.html:77-87` (헤더에 auth-status 영역)
- Modify: `styles.css` (버튼·헤더 스타일 추가)

- [ ] **Step 1: `view-name` 섹션을 `view-login`으로 교체**

`index.html` 140–155의 `<section id="view-name" ...>...</section>` 전체를 아래로 교체:

```html
    <section id="view-login" class="view">
      <div class="name-card">
        <span class="name-badge">시작하기 전에</span>
        <h2 class="name-title">소셜 계정으로 로그인</h2>
        <p class="name-sub">로그인하면 검사를 시작하고 결과가 안전하게 저장됩니다.</p>
        <button class="btn btn-lg btn-kakao" data-action="login-kakao">카카오로 시작하기</button>
        <button class="btn btn-lg btn-google" data-action="login-google">구글로 시작하기</button>
        <p class="name-error" id="login-error"></p>
        <button class="btn btn-ghost" data-action="home">홈으로</button>
      </div>
    </section>
```

- [ ] **Step 2: 헤더에 로그인 상태 영역 추가**

`index.html` 77–87의 헤더를 아래로 교체(브레드크럼과 상태영역을 우측 그룹으로 묶어 로그아웃 상태 레이아웃 회귀를 막음):

```html
  <header class="site-header">
    <div class="container header-inner">
      <a class="brand" href="#" data-action="home">
        <img class="brand-logo" src="assets/logo-mark.svg" alt="" width="26" height="26" /> OCEAN
      </a>
      <div class="header-right">
        <nav class="breadcrumb" aria-label="breadcrumb">
          <span>홈</span> <span class="sep">›</span> <span>테스트</span>
          <span class="sep">›</span> <span class="current">오션 성격 검사</span>
        </nav>
        <div id="auth-status" class="auth-status"></div>
      </div>
    </div>
  </header>
```

- [ ] **Step 3: 스타일 추가**

`styles.css` 213줄(`.name-card .btn-ghost { width: 100%; }`) 바로 뒤에 추가:

```css
/* 소셜 로그인 */
.btn-kakao { background: #FEE500; color: #191600; }
.btn-kakao:hover { background: #f5dc00; }
.btn-google { background: #fff; color: #1f1f1f; border: 1px solid var(--line); }
.btn-google:hover { background: #f6f8fa; }
.header-right { display: flex; align-items: center; gap: 16px; }
.auth-status { display: flex; align-items: center; gap: 10px; }
.auth-name { font-size: 0.9rem; color: var(--muted); font-weight: 600; }
.auth-logout { background: transparent; border: 0; color: var(--muted); font-size: 0.85rem; cursor: pointer; text-decoration: underline; padding: 0; }
```

- [ ] **Step 4: 검증 — 로그인 화면 렌더**

Run: `http://localhost:4173`에서 브라우저 콘솔로 로그인 뷰 강제 표시:
```js
document.getElementById('view-intro').classList.remove('active');
document.getElementById('view-login').classList.add('active');
```
Expected: 카카오(노랑)·구글(흰색) 버튼이 세로로 꽉 차게 표시. (아직 클릭 동작은 Task 3에서 연결)

- [ ] **Step 5: 커밋**

```bash
git add index.html styles.css
git commit -m "feat(auth): 로그인 화면·헤더 상태 영역·소셜 버튼 스타일 추가"
```

---

## Task 3: 흐름 재배선 (게이트·로그인·로그아웃·세션 UI)

**Files:**
- Modify: `app.js` (상수·views·이름입력 제거, 게이트/인증 함수 추가, 액션 디스패치·초기화)

- [ ] **Step 1: 상단 상수 정리 (`app.js:1-4`)**

`app.js` 1–4를 아래로 교체(클라이언트는 `auth.js`의 전역 `sb` 사용, `NICK_MAX`는 이름입력 제거로 불필요):

```js
// 인증·저장은 auth.js의 전역 `sb`/`Auth` 사용
```

`state` 객체(현 6–10)는 그대로 둔다.

- [ ] **Step 2: views 매핑 교체 (`app.js:12-17`)**

`name:` 항목을 `login:`으로 교체:

```js
const views = {
  intro: document.getElementById("view-intro"),
  login: document.getElementById("view-login"),
  test: document.getElementById("view-test"),
  result: document.getElementById("view-result"),
};
```

- [ ] **Step 3: 이름입력 로직 제거 후 게이트/인증 함수로 교체 (`app.js:193-245`)**

`goToNameEntry`(193–201), `submitName`(203–230), `start`(232–237), 키다운 리스너(239–245)를 아래로 교체(`start`는 유지·이동, 이름입력 관련은 삭제):

```js
function start() {
  state.index = 0;
  state.answers = new Array(QUESTIONS.length).fill(null);
  renderQuestion();
  show("test");
}

// 로그인 게이트: 세션 없으면 로그인 화면, 있으면 검사 시작
async function beginFlow() {
  const session = await Auth.getSession();
  if (!session) { show("login"); return; }
  beginTest(session);
}

function beginTest(session) {
  state.nickname = Auth.displayName(session);
  start();
}

// 헤더 로그인 상태 표시(제공자 제공 이름은 textContent로 안전하게 삽입)
function updateAuthUI(session) {
  const el = document.getElementById("auth-status");
  if (!el) return;
  el.innerHTML = "";
  if (!session) return;
  const name = document.createElement("span");
  name.className = "auth-name";
  name.textContent = `${Auth.displayName(session)} 님`;
  const out = document.createElement("button");
  out.className = "auth-logout";
  out.dataset.action = "logout";
  out.textContent = "로그아웃";
  el.append(name, out);
}
```

- [ ] **Step 4: 액션 디스패치 수정 (`app.js:346-357`)**

`start`/`submit-name` 분기를 게이트·로그인·로그아웃으로 교체:

```js
document.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-action]");
  const action = btn?.dataset.action;
  if (!action) return;
  e.preventDefault();
  if (action === "start") beginFlow();
  else if (action === "login-kakao") Auth.signIn("kakao");
  else if (action === "login-google") Auth.signIn("google");
  else if (action === "logout") Auth.signOut();
  else if (action === "prev") { if (state.index > 0) { state.index -= 1; renderQuestion(); } }
  else if (action === "restart" || action === "home") { show("intro"); }
  else if (action === "copy") copyResult();
  else if (action === "save-image") saveImage(btn);
});
```

- [ ] **Step 5: 초기화 — 세션 구독 + 자동시작 (`app.js:359-361`)**

파일 끝 `renderQuestion(); show("intro");`를 아래로 교체:

```js
// 세션 변화 → 헤더 갱신. 로그인 직후(자동시작 플래그)면 검사로 바로 진입.
sb.auth.onAuthStateChange((_event, session) => {
  updateAuthUI(session);
  if (session && sessionStorage.getItem(AUTOSTART_KEY)) {
    sessionStorage.removeItem(AUTOSTART_KEY);
    beginTest(session);
  }
});

renderQuestion();
show("intro");
```

- [ ] **Step 6: 검증 — 게이트 동작(미로그인)**

Run: `http://localhost:4173`에서 "오션 성격 검사 응시하기" 클릭.
Expected: 이름 입력이 아니라 **로그인 화면**이 뜬다. 콘솔에 `ReferenceError`(예: `submitName`/`NICK_MAX`) 없음.

- [ ] **Step 7: 커밋**

```bash
git add app.js
git commit -m "feat(auth): 로그인 필수 게이트·로그인/로그아웃·세션 UI 배선"
```

---

## Task 4: 인증 사용자로 결과 저장

**Files:**
- Modify: `app.js:248-269` (`saveResult`)

- [ ] **Step 1: `saveResult`를 인증 insert로 교체**

`app.js` 248–269의 `saveResult`를 아래로 교체(anon REST 직접 호출 → 로그인 JWT가 붙는 `sb` 클라이언트. `user_id`는 DB 기본값 `auth.uid()`로 채워지므로 전송하지 않음):

```js
// Supabase 저장 (로그인 사용자 insert, 실패해도 결과 화면은 정상 표시)
function saveResult(pct, profile) {
  if (!state.nickname) return;
  sb.from("ocean_results")
    .insert({
      nickname: state.nickname,
      type_code: profile.type.code,
      type_title: profile.type.title,
      type_role: profile.type.role,
      scores: pct,
      answers: state.answers,
    })
    .then(({ error }) => {
      if (error) console.error("결과 저장 실패:", error.message);
    });
}
```

- [ ] **Step 2: 검증 — 구문/참조 무결성**

Run: `http://localhost:4173` 로드 후 콘솔에 오류 없음 확인. (실제 저장은 Task 5 마이그레이션 + 로그인 후 Task 6에서 검증)
Expected: 페이지 정상 로드, `saveResult` 참조 오류 없음.

- [ ] **Step 3: 커밋**

```bash
git add app.js
git commit -m "feat(auth): 결과 저장을 로그인 사용자 insert로 전환"
```

---

## Task 5: DB 마이그레이션 (user_id + RLS 교체)

> **순서 주의(컷오버):** 이 마이그레이션은 anon insert를 제거하므로, 실행 즉시 **구버전(anon 저장) 프런트엔드는 저장이 실패**한다. 새 프런트엔드 배포(머지)와 **함께/직전에** 적용할 것.

**Files:**
- Migration(Supabase): `add_user_id_and_auth_rls_to_ocean_results`

- [ ] **Step 1: (사전 확인) 현재 정책 스냅샷**

Run (Supabase SQL Editor 또는 MCP `execute_sql`):
```sql
select policyname, cmd, roles from pg_policies where tablename='ocean_results';
```
Expected: `anon_insert_results | INSERT | {anon}` 한 줄.

- [ ] **Step 2: 마이그레이션 적용**

Supabase MCP `apply_migration`(name: `add_user_id_and_auth_rls_to_ocean_results`) 또는 SQL Editor에서 실행:
```sql
alter table public.ocean_results
  add column if not exists user_id uuid references auth.users(id) default auth.uid();

drop policy if exists anon_insert_results on public.ocean_results;

create policy auth_insert_results on public.ocean_results
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and char_length(nickname) between 1 and 20
  );
```

- [ ] **Step 3: 검증 — 정책이 authenticated 전용으로 바뀜**

Run:
```sql
select policyname, cmd, roles from pg_policies where tablename='ocean_results';
select column_name from information_schema.columns where table_name='ocean_results' and column_name='user_id';
```
Expected: `auth_insert_results | INSERT | {authenticated}` 한 줄, `user_id` 컬럼 존재.

- [ ] **Step 4: 검증 — 익명 insert가 거부되는지 (실 요청)**

Run:
```bash
curl -i -X POST 'https://ydejsjrjminbyuquywuo.supabase.co/rest/v1/ocean_results' \
  -H "apikey: sb_publishable_xIO_-uuvgxT0KkiTUF4Hng_izDPe-UZ" \
  -H "Authorization: Bearer sb_publishable_xIO_-uuvgxT0KkiTUF4Hng_izDPe-UZ" \
  -H "Content-Type: application/json" \
  -d '{"nickname":"rls-test","scores":{"O":1}}'
```
Expected: HTTP **401/403**, 본문에 RLS 위반(코드 `42501` 또는 "violates row-level security policy"). 201이 나오면 실패 — 정책을 재확인한다.

---

## Task 6: E2E 검증 (성공 기준 대조) + 배포

> 선행: Task 0 완료(제공자 설정), Task 1~5 적용. 로컬 검증은 `http://localhost:4173`가 Redirect URLs에 등록돼 있어야 한다.

- [ ] **Step 1: 게이트(기준 1)** — 미로그인 상태로 "응시하기" 클릭 → 로그인 화면 표시.

- [ ] **Step 2: 카카오 로그인 왕복(기준 2)** — "카카오로 시작하기" → 카카오 인증 → 사이트 복귀 → **검사 화면 자동 진입**. 헤더에 "○○ 님 · 로그아웃" 표시.

- [ ] **Step 3: 구글 로그인 왕복(기준 2)** — 로그아웃 후 "구글로 시작하기" → 인증 → 복귀 → 검사 진입.

- [ ] **Step 4: 이름 자동화(기준 3)** — 검사 완료 결과 화면의 이름이 소셜 프로필 이름(카카오 닉네임/구글 이름)으로 표시.

- [ ] **Step 5: 저장 귀속(기준 4)** — 검사 1건 완료 후:
```sql
select nickname, user_id, created_at from public.ocean_results order by created_at desc limit 1;
```
Expected: 방금 결과의 `user_id`가 non-null(로그인 사용자 id).

- [ ] **Step 6: RLS(기준 5)** — Task 5 Step 4의 익명 insert 거부 재확인.

- [ ] **Step 7: 세션 유지·로그아웃(기준 6)** — 새로고침 후 재로그인 없이 헤더에 로그인 유지, "응시하기"가 바로 검사로 진입. "로그아웃" 클릭 → 새로고침되며 게이트 복원.

- [ ] **Step 8: 회귀(기준 7)** — 검사 진행/채점/레이더/특성카드/이미지 저장/요약 복사가 기존대로 동작.

- [ ] **Step 9: 배포** — 브랜치 머지로 GitHub Pages 반영. (Task 5 마이그레이션이 이미 적용돼 있어야 함 — 순서 주의 참조.)

- [ ] **Step 10: README 갱신(선택)** — `README.md` "구조" 항목에 `auth.js 로그인(카카오·구글)` 한 줄 추가 후 커밋:
```bash
git add README.md
git commit -m "docs: 소셜 로그인 도입 반영"
```

---

## Phase 2 (이연) — 네이버 로그인

Supabase가 **Custom OAuth2 제공자**(무료 3개)를 지원하므로, 초기 계획의 커스텀 Edge Function 대신 **`custom:naver`** 로 훨씬 단순하게 붙일 수 있다(별도 스펙/플랜으로 진행):
- 대시보드 → Auth Providers → New Provider → Manual(OAuth2):
  - identifier `custom:naver`, client id/secret(네이버 개발자센터),
  - Authorization `https://nid.naver.com/oauth2.0/authorize`,
  - Token `https://nid.naver.com/oauth2.0/token`,
  - UserInfo `https://openapi.naver.com/v1/nid/me`,
  - 콜백 URL(폼에 표시)을 네이버 앱에 등록.
- 클라이언트: `Auth.signIn("custom:naver")` + 로그인 화면에 "네이버" 버튼 추가.

---

## Self-Review

**1. Spec 커버리지**
- 게이트(스펙 §4/§11-1) → Task 3. 카카오·구글(§2/§11-2) → Task 0·1·2·3. 이름 자동화(§5/§11-3) → `Auth.displayName`+Task 3/6. 저장 귀속(§6/§11-4) → Task 4·5. RLS(§6/§11-5) → Task 5. 세션 유지(§4/§11-6) → Task 3(onAuthStateChange)·6. 회귀(§11-7) → Task 6-8. 수동설정(§7) → Task 0. 네이버(§8) → Phase 2. 테스트(§10) → Task 5·6. **누락 없음.**

**2. Placeholder 스캔** — TBD/TODO/모호 지시 없음. 모든 코드 스텝에 실제 코드 포함. (Task 0·6은 수동 절차라 코드 대신 구체 행동/명령/기대결과 명시.)

**3. 타입/식별자 일관성** — `sb`, `Auth`, `AUTOSTART_KEY`, `beginFlow`, `beginTest`, `updateAuthUI`, `start`, `saveResult` 정의/사용 일치. `views.login`(뷰 키)과 `show("login")` 일치. 액션 문자열 `login-kakao`/`login-google`/`logout`이 index.html의 `data-action`과 일치. DB 컬럼/정책명(`user_id`, `auth_insert_results`) 마이그레이션·검증 쿼리 일치.
