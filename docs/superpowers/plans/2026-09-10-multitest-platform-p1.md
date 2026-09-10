# 멀티테스트 플랫폼 P1 (기반) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** OCEAN 단일 검사를 "공용 셸 + 테스트별 모듈" 구조의 멀티테스트 플랫폼 기반으로 전환한다(허브 홈 + `test.html?id=ocean` 러너, `results` 테이블 일반화). 기존 OCEAN 경험·저장·공유는 회귀 없이 유지.

**Architecture:** 공용 셸(허브·러너·저장·공유·마이페이지·레이더·인증)은 테스트 무관 인터페이스에만 의존한다. 각 테스트는 `tests/<id>/index.js` 모듈이 `meta·questions·score·buildProfile·renderResult`를 노출한다. OCEAN이 첫 모듈. 저장은 `results`(`test_id` 포함) 테이블.

**Tech Stack:** 빌드 없는 Vanilla JS(정적), `@supabase/supabase-js@2`(CDN UMD), Supabase(Postgres RLS·RPC), GitHub Pages. 검증: `node --check`(구문) · agent-browser(동작) · Supabase MCP/`curl`(DB).

**참조 스펙:** `docs/superpowers/specs/2026-09-09-multitest-platform-p1-design.md`
**대상 Supabase:** ref `ydejsjrjminbyuquywuo`

---

## 파일 구조 (P1 종료 시)

| 파일 | 책임 | 변경 |
|---|---|---|
| `tests/registry.js` | 테스트 목록 `TESTS`(id·meta·module 참조) + `getTest(id)` | 신규 |
| `tests/ocean/questions.js` | `FACTORS` + `QUESTIONS` | 이동(from `data/questions.js`) |
| `tests/ocean/archetypes.js` | `TYPES` + `buildProfile(FACTORS,pct)` 등 | 이동(from `data/archetypes.js`) |
| `tests/ocean/module.js` | `OCEAN_MODULE` = {meta, questions, score, buildProfile, renderResult} + 결과 마크업 템플릿 | 신규(현 app.js 결과 렌더 이관) |
| `test-runner.js` | 공용 러너: `?id`→모듈, 인증 게이트, 문항 UI, 채점, 결과 mount, 저장·공유·이미지 | 신규(app.js 분해) |
| `test.html` | 러너용 뷰(인트로·discover·문항·결과 mount) + 스크립트 로드 | 신규 |
| `hub.js` | 허브: `TESTS`를 카드로 렌더 + 헤더 auth | 신규 |
| `index.html` | 허브로 개편(검사/결과 섹션 제거, 테스트 목록) | 수정 |
| `radar.js`·`auth.js` | 공용(유지) | 무변경 |
| `share.js`·`dashboard.js`·`me.js` | `test_id`→모듈 `buildProfile`; 테이블 `results`; 스크립트 경로 | 수정 |
| `share.html`·`dashboard.html`·`me.html` | 스크립트 로드 경로(레지스트리+모듈) 갱신 | 수정 |
| `styles.css` | 허브 카드 스타일(append) | 수정 |
| `app.js`·`data/` | 분해 후 제거 | 삭제 |
| Supabase | `results` rename + `test_id` + RPC 갱신 | 마이그레이션(게이트) |

**모듈 인터페이스 계약(모든 태스크가 이 시그니처를 따른다):**
```js
// tests/<id>/module.js 가 전역 상수로 노출 (예: const OCEAN_MODULE = {...})
{
  meta: { id, name, tagline, icon, scaleSize, scaleLabels:[low,high] },
  questions,                       // [{ text, factor, reverse? }]
  score(answers),                  // number[] → scores 객체 (예: {O,C,E,A,N})
  buildProfile(scores),            // → { type:{title,code,role,emoji}, levels, summary, ... }
  renderResult(mountEl, ctx),      // ctx={scores, profile, nickname}; mountEl 안에 상세 결과 DOM 생성
}
```

---

## Task 0: 마이그레이션 SQL 준비 (적용 금지 — 승인 게이트)

**Files:**
- Create: `docs/superpowers/migrations/2026-09-10-results-generalize.sql`

- [ ] **Step 1: 마이그레이션 SQL 파일 작성**

```sql
-- 멀티테스트 일반화: ocean_results → results, test_id 추가, RPC 갱신
-- ⚠️ 라이브 적용은 사용자 승인 + 프런트 컷오버(테이블명 results 참조)와 함께.
alter table public.ocean_results rename to results;

alter table public.results
  add column if not exists test_id text not null default 'ocean';  -- 기존 행 'ocean' 백필

create or replace function public.get_shared_result(p_share_id uuid)
returns table (nickname text, scores jsonb, created_at timestamptz, test_id text)
language sql security definer set search_path = public
as $$
  select nickname, scores, created_at, test_id
  from public.results
  where share_id = p_share_id
  limit 1;
$$;
grant execute on function public.get_shared_result(uuid) to anon, authenticated;
```

- [ ] **Step 2: 커밋 (적용 아님)**

```bash
git add docs/superpowers/migrations/2026-09-10-results-generalize.sql
git commit -m "docs(db): results 일반화 마이그레이션 SQL 준비(적용 전 게이트)"
```

---

## Task 1: OCEAN 모듈 추출 + 레지스트리

**Files:**
- Move: `data/questions.js` → `tests/ocean/questions.js`
- Move: `data/archetypes.js` → `tests/ocean/archetypes.js`
- Create: `tests/ocean/module.js`
- Create: `tests/registry.js`

- [ ] **Step 1: 파일 이동(내용 무변경)**

```bash
mkdir -p tests/ocean
git mv data/questions.js tests/ocean/questions.js
git mv data/archetypes.js tests/ocean/archetypes.js
```
`FACTORS`·`QUESTIONS`(questions.js), `TYPES`·`buildProfile`(archetypes.js) 전역은 그대로 유지.

- [ ] **Step 2: `tests/ocean/module.js` 작성 — 채점·프로필·결과 렌더 이관**

현 `app.js`의 `computeScores`(채점)와 결과 렌더(`finish`의 저장/공유 제외 부분: 커버·레이더·표본바·특성카드·강점/블라인드·커리어·협업·요약)를 이 모듈로 옮긴다. `renderResult`는 `mountEl.innerHTML = 템플릿` 후 값 채움(현 index.html `#view-result` 내부 마크업을 템플릿 문자열로 이관).

```js
// OCEAN 모듈 — 문항/채점/프로필/결과 렌더를 캡슐화. 전역 FACTORS·QUESTIONS·TYPES·buildProfile·
// renderRadar 에 의존(로드 순서: questions→archetypes→radar→module).
const OCEAN_MODULE = {
  meta: {
    id: "ocean",
    name: "오션 성격 검사",
    tagline: "Big Five(OCEAN)로 나를 알아보는 50문항 검사",
    icon: "🌊",
    scaleSize: 5,
    scaleLabels: ["전혀 아니다", "매우 그렇다"],
  },
  questions: QUESTIONS,

  // 현 app.js computeScores 로직을 answers 인자 기반 순수 함수로 이관.
  score(answers) {
    const sums = {}, counts = {};
    QUESTIONS.forEach((q, i) => {
      const raw = answers[i];
      if (raw == null) return;
      const val = q.reverse ? OCEAN_MODULE.meta.scaleSize + 1 - raw : raw;
      sums[q.factor] = (sums[q.factor] || 0) + val;
      counts[q.factor] = (counts[q.factor] || 0) + 1;
    });
    const pct = {};
    Object.keys(FACTORS).forEach((k) => {
      const avg = counts[k] ? sums[k] / counts[k] : 3;         // 1..5 평균
      pct[k] = Math.round(((avg - 1) / (OCEAN_MODULE.meta.scaleSize - 1)) * 100);
    });
    return pct;
  },

  buildProfile(scores) {
    return buildProfile(FACTORS, scores);
  },

  // mountEl 안에 OCEAN 상세 결과 DOM을 만든다. 현 finish()의 렌더 본문을 이곳으로 이관.
  renderResult(mountEl, { scores, profile, nickname }) {
    mountEl.innerHTML = OCEAN_MODULE._resultTemplate();
    // ↓ 현 finish()의 DOM 채움 로직을 mountEl.querySelector 기준으로 그대로 이관
    //   (r-kicker/r-emoji/r-title/r-sub/r-intro/r-foot, radar, norm-bars, trait-grid,
    //    strength-list, blindspot-list, career-block, collab-block, r-summary)
    // renderRadar(mountEl.querySelector("#radar"), scores, profile.levels);
    // … (아래 Step 3에서 실제 코드로 채운다)
  },

  _resultTemplate() {
    // 현 index.html의 <section id="view-result"> **내부** 마크업을 그대로 문자열로 반환.
    return `…`; // Step 3에서 실제 마크업으로 채운다
  },
};
```

- [ ] **Step 3: `renderResult`/`_resultTemplate` 실제 코드 채우기**

`_resultTemplate()`은 현재 `index.html`의 `<section id="view-result" class="view result-view">` **안쪽 전체 마크업**(커버~result-actions 직전까지, 단 공유/저장 버튼 영역 `result-actions` 제외)을 그대로 문자열로 옮긴다. `renderResult`는 현재 `finish()`(app.js) 본문에서 `document.getElementById(...)` 부분을 `mountEl.querySelector(...)`로 바꿔 그대로 이관한다(레이더는 `renderRadar(mountEl.querySelector("#radar"), scores, profile.levels)`; 특성카드·표본바·커리어·협업 렌더 함수 `renderNormBars/renderTraitCards/renderCareer/renderCollab`도 이 모듈 안 헬퍼로 이동). `state`·`saveResult`·`show()` 참조는 넣지 않는다(그건 러너 책임).

Run: `node --check tests/ocean/module.js`
Expected: 통과.

- [ ] **Step 4: `tests/registry.js` 작성**

```js
// 테스트 레지스트리 — 공용 셸이 test_id로 모듈을 찾는 단일 진입점.
// 모듈 스크립트(각 tests/<id>/module.js)가 먼저 로드돼 전역 상수를 노출해야 한다.
const TESTS = [OCEAN_MODULE];                 // 새 테스트는 여기 + 스크립트 로드만 추가
const TEST_MAP = Object.fromEntries(TESTS.map((t) => [t.meta.id, t]));
function getTest(id) { return TEST_MAP[id] || null; }
```

Run: `node --check tests/registry.js`
Expected: 통과.

- [ ] **Step 5: 커밋**

```bash
git add tests/
git commit -m "feat(platform): OCEAN 모듈 추출(문항·채점·프로필·결과렌더) + 테스트 레지스트리"
```

---

## Task 2: 공용 러너 `test.html` + `test-runner.js`

**Files:**
- Create: `test.html`
- Create: `test-runner.js`

- [ ] **Step 1: `test.html` 작성 — 러너 뷰 + 스크립트 로드**

`index.html`에서 인트로 hero·discover·FAQ·문항(`view-test`) 섹션을 가져오고, 결과는 **범용 mount** `<section id="view-result" class="view"><div id="result-mount"></div><div class="result-actions">…공유/저장/다시/복사 버튼…</div></section>` 로 둔다. 헤더/푸터는 기존 페이지와 동일. 스크립트 로드(모든 모듈 + 레지스트리 + 러너):

```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="auth.js"></script>
<script src="tests/ocean/questions.js"></script>
<script src="tests/ocean/archetypes.js"></script>
<script src="radar.js"></script>
<script src="tests/ocean/module.js"></script>
<script src="tests/registry.js"></script>
<script src="test-runner.js"></script>
```
(discover 미리보기는 OCEAN 전용이므로 P1에선 `test.html`의 인트로에 그대로 두되, 값 채움은 러너가 `getTest(id)` 모듈로 처리 — Step 3.)

- [ ] **Step 2: `test-runner.js` 작성 — 골격(모듈 해석·게이트·상태)**

```js
// 공용 러너 — ?id로 모듈을 정해 인트로·문항·결과·저장·공유를 진행.
const params = new URLSearchParams(location.search);
const test = getTest(params.get("id") || "");
const state = { index: 0, answers: [], nickname: "", userId: null, lastShareId: null, lastResult: null };

const views = {
  intro: document.getElementById("view-intro"),
  login: document.getElementById("view-login"),
  test: document.getElementById("view-test"),
  result: document.getElementById("view-result"),
};
function show(name){ Object.values(views).forEach(v=>v&&v.classList.remove("active")); views[name].classList.add("active"); window.scrollTo({top:0,behavior:"smooth"}); }

function guardTest(){
  if (test) return true;
  document.querySelector("main").innerHTML =
    '<section class="view active"><div class="name-card"><h2 class="name-title">테스트를 찾을 수 없어요</h2>'
    + '<a class="btn btn-primary btn-lg" href="index.html">테스트 목록으로</a></div></section>';
  return false;
}
```

- [ ] **Step 3: `test-runner.js` — 문항 UI·채점·결과(모듈 위임)**

현 `app.js`의 `renderQuestion`·`selectAnswer`·문항 진행을 러너로 이관하되 `QUESTIONS` 대신 `test.questions`, 척도 개수는 `test.meta.scaleSize` 사용. 완료 시:

```js
function finish(){
  const scores = test.score(state.answers);
  const profile = test.buildProfile(scores);
  state.lastResult = { scores, profile };
  test.renderResult(document.getElementById("result-mount"), { scores, profile, nickname: state.nickname });
  saveResult(scores, profile);   // Task 4의 공용 저장(test.meta.id 포함)
  show("result");
}
```

Run: `node --check test-runner.js`
Expected: 통과.

- [ ] **Step 4: `test-runner.js` — 인증 게이트·저장·공유·이미지·디스패치**

현 app.js의 `beginFlow/beginTest/updateAuthUI/saveResult/updateShareButton/shareResult/copyResult/toast/saveImage`·클릭 디스패치·`onAuthStateChange`를 러너로 이관. 변경점: `saveResult`는 `results` 테이블 + `test_id: test.meta.id` 포함(§Task 5 컷오버까지는 로컬에선 실패 가능 — 주석 명시). `copyResult`는 `test.meta.name` 사용. 자동시작 후 `beginTest`.

Run: `node --check test-runner.js`
Expected: 통과.

- [ ] **Step 5: 브라우저 검증(마이그레이션 전 — 렌더/채점/결과까지)**

```bash
node server.js &   # http://localhost:4173
```
agent-browser로 `http://localhost:4173/test.html?id=ocean` 열기 → 인트로→문항 50 응답(자동)→결과. 확인: 결과 커버(이모지·유형)·레이더 5축·특성카드·요약 렌더. (저장은 Task 5 후) 콘솔 오류 없음.
Expected: 결과 화면이 기존 OCEAN과 동일하게 렌더. `?id=none`은 "테스트를 찾을 수 없어요".

- [ ] **Step 6: 커밋**

```bash
git add test.html test-runner.js
git commit -m "feat(platform): 공용 러너 test.html/test-runner.js (모듈 위임 검사 흐름)"
```

---

## Task 3: 허브 홈 `index.html` + `hub.js`

**Files:**
- Modify: `index.html` (허브로 개편)
- Create: `hub.js`
- Modify: `styles.css` (허브 카드 스타일 append)

- [ ] **Step 1: `index.html`을 허브로 개편**

`<main>` 안을 테스트 목록 컨테이너로 교체: `<section class="view active"><h1>성격 테스트</h1><p class="lead">…</p><div id="test-grid" class="test-grid"></div></section>`. 검사/결과 섹션 마크업은 제거(러너로 이동함). 헤더 auth·푸터(마이페이지·대시보드) 유지. 스크립트 로드:

```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="auth.js"></script>
<script src="tests/ocean/questions.js"></script>
<script src="tests/ocean/archetypes.js"></script>
<script src="radar.js"></script>
<script src="tests/ocean/module.js"></script>
<script src="tests/registry.js"></script>
<script src="hub.js"></script>
```

- [ ] **Step 2: `hub.js` 작성 — 카드 렌더 + 헤더 auth**

```js
// 허브 — 레지스트리의 테스트를 카드로 렌더. 카드 클릭 → test.html?id=<id>.
function renderHub(){
  const grid = document.getElementById("test-grid");
  grid.replaceChildren(...TESTS.map((t) => {
    const a = document.createElement("a");
    a.className = "test-card";
    a.href = `test.html?id=${encodeURIComponent(t.meta.id)}`;
    const icon = document.createElement("div"); icon.className = "tc-icon"; icon.textContent = t.meta.icon || "🧪";
    const name = document.createElement("h3"); name.className = "tc-name"; name.textContent = t.meta.name;
    const tag = document.createElement("p"); tag.className = "tc-tag"; tag.textContent = t.meta.tagline || "";
    a.append(icon, name, tag);
    return a;
  }));
}
// 헤더 로그인 상태(현 app.js updateAuthUI 이관: 이름·내 결과·로그아웃)
function updateAuthUI(session){ /* app.js updateAuthUI 그대로 이관 */ }
sb.auth.onAuthStateChange((_e, s) => updateAuthUI(s));
Auth.getSession().then(updateAuthUI);
renderHub();
```

- [ ] **Step 3: `styles.css` — 허브 카드 스타일 append**

```css
/* ===== 허브: 테스트 목록 카드 ===== */
.test-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px,1fr)); gap: 16px; margin-top: 24px; }
.test-card { display: block; text-decoration: none; background: var(--card); border: 1px solid var(--line); border-radius: 16px; padding: 24px; box-shadow: var(--shadow-sm); transition: transform .12s ease, box-shadow .2s; }
.test-card:hover { transform: translateY(-2px); box-shadow: 0 10px 24px rgba(0,0,0,.08); }
.tc-icon { font-size: 2.4rem; line-height: 1; }
.tc-name { font-size: 1.15rem; margin: 12px 0 6px; color: var(--text); }
.tc-tag { font-size: .9rem; color: var(--muted); line-height: 1.5; }
```

- [ ] **Step 4: 브라우저 검증**

agent-browser로 `http://localhost:4173/index.html` → 테스트 카드(오션) 표시, 클릭 시 `test.html?id=ocean` 이동 확인. 모바일 폭에서 1열.
Expected: 허브 카드 렌더·이동 정상, 콘솔 오류 없음.

- [ ] **Step 5: 커밋**

```bash
git add index.html hub.js styles.css
git commit -m "feat(platform): 허브 홈(테스트 목록 카드) + hub.js"
```

---

## Task 4: share/dashboard/me 테스트 인지화

**Files:**
- Modify: `share.html`·`dashboard.html`·`me.html` (스크립트 로드: data/ → tests/ + 레지스트리·모듈)
- Modify: `share.js`·`dashboard.js`·`me.js`

- [ ] **Step 1: 3개 html 스크립트 로드 갱신**

각 페이지의 `<script src="data/questions.js">`·`data/archetypes.js`를 아래로 교체(레지스트리·모듈 추가):

```html
<script src="tests/ocean/questions.js"></script>
<script src="tests/ocean/archetypes.js"></script>
<script src="radar.js"></script>
<script src="tests/ocean/module.js"></script>
<script src="tests/registry.js"></script>
<script src="share.js"></script>   <!-- 또는 dashboard.js / me.js -->
```

- [ ] **Step 2: `share.js` — test_id로 모듈 선택**

RPC 결과에 `test_id` 포함. 프로필 산출을 모듈 경유로 교체:
```js
const t = getTest(row.test_id) || getTest("ocean");
const profile = t.buildProfile(row.scores);
```
(카드 마크업·textContent·renderRadar는 유지. `buildProfile(FACTORS, …)` 직접 호출 → `t.buildProfile(…)`.)

- [ ] **Step 3: `dashboard.js`·`me.js` — 동일 패턴 + 테이블명**

`buildProfile(FACTORS, row.scores)` → `getTest(row.test_id||"ocean").buildProfile(row.scores)`. `me.js`의 조회 `sb.from("ocean_results")` → `sb.from("results")`, `.select(...)`에 `test_id` 추가.

- [ ] **Step 4: 구문 검증**

Run: `node --check share.js && node --check dashboard.js && node --check me.js`
Expected: 통과.

- [ ] **Step 5: 커밋**

```bash
git add share.html share.js dashboard.html dashboard.js me.html me.js
git commit -m "feat(platform): share/dashboard/me 를 test_id 인지형으로 전환"
```

---

## Task 5: 마이그레이션 적용(게이트) + 컷오버 + E2E + 정리

> **순서 주의(컷오버):** rename 즉시 구버전(테이블 `ocean_results` 참조) 코드는 저장/조회 실패. 새 프런트(테이블 `results`)와 **함께** 적용/배포.

**Files:**
- Modify: `test-runner.js`(saveResult 테이블 `results`+`test_id`) — Task 2에서 이미 반영됐으면 확인만
- Delete: `app.js`

- [ ] **Step 1: (사용자 승인) 마이그레이션 적용**

Supabase MCP `apply_migration`(name `results_generalize`)로 Task 0 SQL 적용.

- [ ] **Step 2: DB 검증(SQL)**

```sql
select
  exists(select 1 from information_schema.tables where table_name='results') as has_results,
  exists(select 1 from information_schema.columns where table_name='results' and column_name='test_id') as has_test_id,
  (select count(*) from public.results where test_id='ocean') as backfilled;
```
Expected: `has_results=true, has_test_id=true, backfilled=32`(이상).

- [ ] **Step 3: 모든 테이블 참조가 `results` 인지 확인**

Run: `grep -rn "ocean_results" *.js tests/ || echo "clean"`
Expected: `clean` (참조 없음). 남아있으면 `results`로 교체 후 재확인.

- [ ] **Step 4: app.js 제거(분해 완료)**

```bash
git rm app.js
```
(index.html·test.html이 app.js를 로드하지 않는지 grep으로 확인: `grep -rn "app.js" *.html` → 없음.)

- [ ] **Step 5: E2E — 공개 읽기(anon) 최소 노출·차단 유지**

```bash
curl -s -X POST 'https://ydejsjrjminbyuquywuo.supabase.co/rest/v1/rpc/get_shared_result' \
 -H "apikey: sb_publishable_xIO_-uuvgxT0KkiTUF4Hng_izDPe-UZ" -H "Authorization: Bearer sb_publishable_xIO_-uuvgxT0KkiTUF4Hng_izDPe-UZ" \
 -H "Content-Type: application/json" -d '{"p_share_id":"3bb145fc-a2b5-43d6-9323-17936bc66bec"}'
```
Expected: `[{"nickname":…,"scores":…,"created_at":…,"test_id":"ocean"}]` (test_id 포함). anon 직접 `results` select → `42501`.

- [ ] **Step 6: E2E — 로컬 전체 흐름(agent-browser)**

`http://localhost:4173/` 허브 → 오션 카드 → 검사 완료 → 결과 렌더 → (로그인 상태면) 저장·공유 링크 활성. `share.html?id=<신규 share_id>` 비로그인 열람 → 요약 카드. `dashboard.html`·`me.html` 렌더.
Expected: 기존과 동일, 회귀 없음.

- [ ] **Step 7: 커밋 + PR + 배포**

```bash
git add -A
git commit -m "refactor(platform): app.js/data 제거, results 컷오버 완료(P1)"
git push -u origin feat/multitest-p1
gh pr create --base main --title "feat: 멀티테스트 플랫폼 P1(기반)" --body "허브+러너+모듈화+results 일반화. 스펙: docs/.../2026-09-09-multitest-platform-p1-design.md"
```
머지 → GitHub Pages 반영 확인(허브·`test.html?id=ocean` 200, 라이브 검사 1회).

---

## Self-Review

**1. Spec 커버리지**
- 허브+테스트 페이지(§1) → Task 3·2. 파일구조/모듈 이관(§2) → Task 1. 모듈 인터페이스(§3) → Task 1(계약)·2(러너 위임). 데이터모델/RPC(§4) → Task 0·5. share/dashboard/me 인지화(§5) → Task 4. 하위호환(§6) → Task 0(rename 유지)·5(share_id·RLS 검증). 수용기준 → Task 2·3·5의 검증 스텝. **누락 없음.**

**2. Placeholder 스캔** — `_resultTemplate`/`renderResult`의 `…`는 "현 index.html/finish 코드를 그대로 이관"이라는 구체 지시가 붙은 이관 표식(신규 로직 아님). 그 외 TBD/TODO 없음.

**3. 타입/식별자 일관성** — 모듈 계약(`meta.id`, `score`, `buildProfile`, `renderResult`)이 registry(`getTest`)·runner(`test.score`/`test.buildProfile`/`test.renderResult`)·share/dashboard/me(`getTest(row.test_id).buildProfile`)에서 일치. 테이블명 `results`·컬럼 `test_id`·RPC 반환 `test_id` 일치.

**주의(리스크):** Task 1 Step 3(결과 렌더 이관)이 가장 회귀 위험이 큼 — OCEAN 결과 화면을 `mountEl` 기준으로 옮길 때 요소 id 조회를 `mountEl.querySelector`로 바꾸는 것을 빠짐없이 확인.
