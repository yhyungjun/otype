# 설계: 멀티테스트 플랫폼 P1 — 기반(공용 셸 + 테스트별 모듈)

- **날짜:** 2026-09-09
- **대상:** 오션(OCEAN) 성격 검사 → 멀티테스트 플랫폼 (정적 사이트 + Supabase)
- **상태:** 설계 승인됨(사용자 확정 2026-09-09). 단, §4 DB rename 마이그레이션은 실제 적용 전 별도 승인 게이트.

## 배경 / 목표

현재 앱은 OCEAN 단일 검사에 하드코딩돼 있다(`data/questions.js`·`data/archetypes.js`·`app.js`,
`ocean_results` 테이블). 사용자는 **여러 종류의 테스트를 계속 추가하는 본격 멀티테스트 플랫폼**을
원하며, 구조는 **공용 셸 + 테스트별 모듈(하이브리드)** 로 합의했다.

P1의 목표는 **"OCEAN을 첫 모듈로 하는 멀티테스트 기반"** 을 세우는 것이다. 새 테스트를 추가할 때
공용 셸(저장·공유·마이페이지·러너·레이더)은 건드리지 않고 **모듈 + 레지스트리 항목만** 추가하면
되도록 만든다. P1에서는 실제 두 번째 테스트를 만들지 않는다(P3). 기존 OCEAN 사용 경험·저장 데이터·
공유 링크는 **회귀 없이 유지**한다.

## 결정 사항 (사용자 확정)

1. **범위:** 본격 멀티테스트 플랫폼.
2. **구조:** 공용 셸 + 테스트별 모듈(하이브리드).
3. **순서:** P1 기반 먼저 → 그 위에 마이페이지/기능(P2) → 두 번째 테스트(P3).
4. **라우팅/홈:** 허브 홈(`index.html`) + 테스트별 페이지(`test.html?id=<testId>`).

## ⚠️ 조율 게이트 (하드)

§4의 `ocean_results` → `results` **rename + `test_id` 추가 + RPC 갱신** 마이그레이션은 라이브
Supabase에 적용하기 전 **사용자 명시 승인**을 받는다. 프런트엔드 코드·문서·마이그레이션 SQL은 먼저
준비할 수 있고, rename은 저장/조회 코드(`results`로 참조)와 **함께/직전에** 적용한다(컷오버).

## 상세 설계

### 1. 페이지 / 라우팅

| 페이지 | 역할 | 비고 |
|---|---|---|
| `index.html` (허브) | 레지스트리의 테스트 목록을 카드로 렌더. 헤더 auth·푸터 내비. | 현재 index의 검사/결과 흐름은 `test.html`로 이동 |
| `test.html?id=<testId>` (공용 러너) | `?id`로 모듈 로드 → 인트로·discover·문항·결과 진행. 로그인 게이트·저장·공유·이미지. | 잘못된/누락 id → 허브로 안내 |
| `share.html` | 공개 요약 카드. RPC의 `test_id`로 해당 모듈 `buildProfile` 사용. | 링크 형식 유지(하위호환) |
| `dashboard.html` | 친구 요약 카드. 각 결과의 `test_id`로 모듈 선택. | localStorage 유지 |
| `me.html` | 내 결과(전체 테스트). P1에선 `test_id` 인지만, 멀티 UI는 P2. | |

### 2. 파일 구조 (하이브리드)

```
tests/
  registry.js            # TESTS 배열: [{ id, name, tagline, icon, module }]
  ocean/
    questions.js         # (data/questions.js 이동) FACTORS + QUESTIONS
    archetypes.js        # (data/archetypes.js 이동) TYPES + buildProfile + 채점 보조
    index.js             # 모듈 글루: OceanModule 노출(§3 인터페이스)
test-runner.js           # 공용 러너(현 app.js의 검사·결과·저장·공유 흐름을 일반화)
hub.js                   # 허브(테스트 목록 렌더 + 헤더 auth)
radar.js                 # 공용(유지)
auth.js                  # 공용(유지)
results.js               # (선택) 저장/조회 헬퍼: saveResult(testId, …)·getSharedResult
```

- 스크립트 로드 순서(모든 페이지): supabase → auth.js → (필요 모듈의 questions/archetypes) → radar.js → 페이지 스크립트.
- **주의:** `data/questions.js`·`data/archetypes.js`를 `tests/ocean/`로 옮기면 이를 로드하던 모든 페이지
  (index·share·dashboard·me)의 `<script src>` 경로를 갱신해야 한다.

### 3. 테스트 모듈 인터페이스

각 테스트 모듈은 아래를 전역(또는 registry 등록 객체)으로 노출한다. 공용 셸은 **이 인터페이스에만**
의존한다.

```js
const OceanModule = {
  meta: {
    id: "ocean",
    name: "오션 성격 검사",
    tagline: "Big Five(OCEAN) 50문항",
    icon: "🌊",            // 허브 카드용
    scaleSize: 5,           // 응답 척도(점수 버튼 개수)
    scaleLabels: ["전혀 아니다", "매우 그렇다"],
  },
  questions,                // [{ text, factor, reverse? }, …] (문항 배열)
  score(answers) { … },     // answers[] → scores 객체(예: {O,C,E,A,N})
  buildProfile(scores) { … },// → { type:{ title, code, role, emoji }, levels, summary, … }
  renderResult(el, ctx) { … },// el에 상세 결과 UI 렌더. ctx = { scores, profile, nickname }
};
```

- **공용 셸이 소유(테스트 무관):** 로그인 게이트, 문항 러너 UI(진행바·척도 버튼·이전/다음),
  결과 저장, 공유 링크·요약 복사·이미지 저장, 공유 요약 카드의 공통 부분(이름·유형명·이모지·요약·레이더),
  마이페이지·대시보드 조회.
- **모듈이 소유(테스트 특유):** 문항, 채점(`score`), 유형/요약 산출(`buildProfile`), **상세 결과 화면**
  (`renderResult` — OCEAN의 레이더·특성카드·표본비교·커리어·협업·종합). OCEAN은 현 `app.js`의 결과 렌더
  본문(`finish`의 저장/공유 제외 부분)을 이 함수로 이관한다.
- **레이더 공유:** `renderRadar`(radar.js)는 공용. 모듈이 `scores`+`levels`를 넘겨 그린다. 레이더가
  없는 테스트는 요약 카드에서 레이더를 생략(모듈 meta 플래그로 제어 — P1은 OCEAN만이라 항상 표시).

### 4. 데이터 모델 (마이그레이션 — 승인 게이트)

```sql
-- 1) 테이블 일반화: rename + test_id
alter table public.ocean_results rename to results;
alter table public.results
  add column if not exists test_id text not null default 'ocean';  -- 기존 32행 'ocean' 백필

-- 2) 공개 읽기 RPC가 test_id도 반환(share/dashboard가 올바른 모듈로 렌더)
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

- rename은 기존 인덱스(`ocean_results_share_id_key`)·RLS 정책(`auth_insert_results`,
  `own_select_results`)을 그대로 데리고 간다. `share_id`·소유자 읽기·anon 차단·공유 링크 **불변**.
- 프런트의 테이블 참조(`sb.from("ocean_results")`)를 모두 **`results`** 로 갱신하고 insert에 `test_id`
  포함. 저장 코드와 rename을 함께 컷오버.

### 5. 공용 셸 배선 요약

- **저장:** `saveResult(testId, nickname, userId, profile, scores, answers)` → `results` insert
  (`test_id` 포함) + `.select("share_id").single()`(소유자 select RLS 필요 — 이미 존재).
- **공유 뷰(share.js):** RPC → `{ nickname, scores, created_at, test_id }` → `registry[test_id].module.buildProfile(scores)`
  로 유형·요약·레이더 렌더. 미지 test_id → 안전 안내.
- **대시보드(dashboard.js)/마이페이지(me.js):** 각 행의 `test_id`로 모듈 선택해 카드 렌더.
- **허브(hub.js):** `TESTS`를 카드 그리드로. 카드 클릭 → `test.html?id=<id>`.

### 6. 하위호환

- 기존 저장 행·공유 링크(`share.html?id=…`)·로그인 세션 모두 유지.
- `index.html`은 허브로 바뀌지만 OCEAN은 카드 1클릭으로 진입. (기존 북마크는 허브를 보게 됨 — 허용.)

## 파일 영향 요약

| 파일 | 변경 |
|---|---|
| `data/questions.js`·`data/archetypes.js` | `tests/ocean/`로 이동(+ 채점 `score` 정리) |
| `tests/ocean/index.js`·`tests/registry.js` | 신규 |
| `app.js` | 분해 → `hub.js`(허브) + `test-runner.js`(러너) + ocean 모듈의 `renderResult`; 제거/이동 |
| `index.html` | 허브로 개편(검사/결과 섹션은 `test.html`로 이동), 스크립트 로드 변경 |
| `test.html`·`test-runner.js` | 신규(공용 러너) |
| `share.html/js`·`dashboard.html/js`·`me.html/js` | `test_id` 인지화 + 스크립트 경로·테이블명 갱신 |
| `styles.css` | 허브 카드 스타일(신규, 기존 토큰 재사용) |
| Supabase | `results` rename + `test_id` + RPC 갱신 (승인 게이트) |

## 범위 밖 (P2 / P3)

- **P2:** 마이페이지 멀티테스트 UI(테스트별 그룹/필터), 결과 삭제(DELETE RLS), 두 결과 비교, 결과 이미지 저장.
- **P3:** 실제 두 번째 테스트 모듈 추가(플랫폼 검증 — 셸 무수정으로 되는지).
- 서버측 친구목록, 전체 리포트 공유, 커스텀 결과 일러스트.

## 수용 기준 (P1)

- [ ] 허브(`index.html`)가 레지스트리 기반 테스트 목록을 보여주고, OCEAN 카드 클릭 시 `test.html?id=ocean`로 이동한다.
- [ ] `test.html?id=ocean`에서 인트로·문항(50)·채점·상세 결과·저장·공유·이미지가 **기존과 동일하게** 동작(회귀 없음).
- [ ] `results` 테이블 rename + `test_id` 백필('ocean'); 기존 행·공유 링크가 그대로 resolve.
- [ ] 새 저장은 `test_id='ocean'`로 기록되고, `share_id`를 정상 캡처(소유자 select RLS 경로).
- [ ] `share.html`·`dashboard.html`이 `test_id`로 올바른 모듈을 골라 요약 카드를 렌더.
- [ ] RPC가 `test_id`를 포함해 반환하되 `answers`·`user_id`·타 행은 노출하지 않음; anon 직접 select 차단 유지.
- [ ] 잘못된/누락 `?id`, 미지 `test_id`는 안전 안내(크래시 없음).
- [ ] 새 테스트 추가가 **모듈+레지스트리 항목만**으로 가능한 인터페이스임을 코드 리뷰로 확인(실제 2번째 테스트는 P3).
- [ ] 모바일 레이아웃(허브 카드·러너·결과)이 깨지지 않음.
