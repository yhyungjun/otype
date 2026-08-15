# 설계: 친구 결과 공유 대시보드 (요약 카드 · 공개 링크)

- **날짜:** 2026-08-15
- **대상:** 오션(OCEAN) 성격 검사 (정적 사이트 + Supabase)
- **상태:** 승인됨 (사용자 승인 2026-08-15). 단, §2 DB 마이그레이션은 실제 적용 전 별도 승인 게이트.

## 배경 / 문제

로그인 사용자가 검사하면 결과가 `ocean_results`에 `user_id`로 저장되고 **RLS로 소유자만 조회** 가능
(`user_id = auth.uid()`). 사용자는 친구끼리 검사 결과를 공유하고 싶어 한다 — "코드/링크를 보내면
서로 결과를 보는" 형태 + 여러 명을 모아보는 대시보드.

따라서 핵심 과제는 **"소유자만 읽기"를 유지하면서 특정 결과 1건만 안전하게 공개하는 읽기 경로**를
만드는 것이다.

## 결정 사항 (사용자 확정)

1. **공유 모델:** 개인 공유 링크/코드 + 대시보드에서 친구 코드 모아보기.
2. **열람 권한:** 링크만 있으면 누구나(비로그인 OK). 추측 불가능한 공유 토큰 기반 공개 읽기.
3. **공유 범위:** 요약 카드만 — 이름 · 유형 · 레이더 · 한 줄 요약. 원본 응답(1~5)·상세 리포트는 제외.
4. **친구 목록:** localStorage(기기 로컬) MVP. 서버 동기화는 후속(YAGNI).
5. **노출 동의:** 이름·유형·레이더·점수가 링크 보유자에게 공개되는 것을 수용.

## ⚠️ 조율 게이트 (하드)

`ocean_results`는 병렬 세션이 현재 수정 중인 테이블이다. §2의 컬럼 추가 + RPC 마이그레이션은
**Supabase 라이브 프로젝트에 실제 적용하기 전 반드시 사용자 명시 승인**을 받고, 병렬 스키마/RLS
작업과 충돌이 없는지 확인한다. 프론트엔드 코드·문서·마이그레이션 SQL은 먼저 준비할 수 있다.

## 상세 설계

### 1. 전체 흐름

- 로그인 사용자 검사 완료 → 결과 페이지 **"공유 링크 복사"** → `share_id` 기반 링크 생성.
- 친구가 링크 열기(`share.html?id=<share_id>`, 비로그인) → RPC로 요약 데이터 조회 → 요약 카드 렌더.
- **대시보드**(`dashboard.html`) → 친구 코드/링크 추가(localStorage) → 저장된 코드마다 요약 카드 표시.

### 2. 백엔드 (Supabase) — 적용 전 승인 게이트

마이그레이션 SQL(초안, 적용 전 검토·조율):

```sql
-- 1) 공유 토큰 컬럼
alter table public.ocean_results
  add column if not exists share_id uuid not null default gen_random_uuid();
create unique index if not exists ocean_results_share_id_key on public.ocean_results (share_id);

-- 2) 공개 읽기용 RPC (유일한 공개 경로; 최소 노출: 이름 + 점수만)
create or replace function public.get_shared_result(p_share_id uuid)
returns table (nickname text, scores jsonb, created_at timestamptz)
language sql
security definer
set search_path = public
as $$
  select nickname, scores, created_at
  from public.ocean_results
  where share_id = p_share_id
  limit 1;
$$;

-- 3) anon 실행 권한 (테이블 직접 접근 RLS는 소유자-읽기 그대로 유지)
grant execute on function public.get_shared_result(uuid) to anon, authenticated;
```

- RLS는 기존 소유자-읽기 정책 유지 → 직접 `select`로는 남의 결과 접근 불가.
- RPC는 `answers`·`user_id`·다른 행을 절대 반환하지 않음. 반환은 `{ nickname, scores, created_at }`뿐.
- 요약 카드의 유형·한 줄 요약·레이더는 반환된 `scores`로 클라이언트가 `buildProfile(FACTORS, scores)`
  로 재계산 → 서버는 점수+이름만 노출(최소 노출 원칙).

### 3. 공유 링크 생성 (`app.js` — 최소 변경)

- `saveResult`의 insert를 `select("share_id").single()`(또는 `Prefer: return=representation`)로 바꿔
  삽입된 행의 `share_id`를 받아 `state.lastShareId`에 저장.
- 결과 액션 영역에 **"공유 링크 복사"** 버튼(`data-action="share"`) 추가 →
  `${location.origin}${basePath}share.html?id=${state.lastShareId}` 를 클립보드 복사 + 토스트.
  기존 `copy`/`save-image` 핸들러와 동일 패턴.
- **주의:** `app.js`는 병렬 auth 세션도 편집 중 → 이 변경은 최소·국소로, 충돌 위험을 문서에 명시.

### 4. 공유 뷰 `share.html` + `share.js` (신규 · 격리)

- `<script>`로 `data/questions.js`, `data/archetypes.js`, supabase UMD, `auth.js`(또는 sb 클라이언트),
  공용 레이더 함수, `share.js` 로드.
- `share.js`: 쿼리 `id` 읽기 → `sb.rpc("get_shared_result", { p_share_id: id })` →
  요약 카드(이름 · 유형명/코드/역할 · 레이더 · 한 줄 요약) 렌더.
- 오류/미존재 id → "결과를 찾을 수 없어요" 안내 + 홈/검사 CTA.
- OG 태그(제목·설명·이미지)로 카톡/SNS 공유 시 미리보기.

### 5. 대시보드 `dashboard.html` + `dashboard.js` (신규 · 격리)

- 친구 코드/링크 입력창 → `share_id` 파싱(전체 URL 붙여넣어도 `id=` 추출) → localStorage 목록에
  추가(중복 제거). 각 항목 삭제 가능.
- 저장된 코드마다 RPC 호출 → 요약 카드 그리드로 표시. 실패 항목은 "불러오기 실패" 카드.
- (옵션) 로그인 상태면 내 최신 결과 카드도 상단에 표시.
- 친구 목록 저장 키: `otype:friends`(JSON 배열). 서버 동기화 없음(MVP).

### 6. 렌더 재사용 / 격리

- `buildProfile`(archetypes.js)는 이미 순수 함수 → 공유·대시보드에서 그대로 사용.
- 레이더 렌더는 현재 `drawRadar`가 `#radar` 고정 + 결과 다크테마 색을 사용 → **임의 SVG 요소에
  그리는 공용 함수 `renderRadar(svgEl, pct, levels, opts)` 로 추출**(app.js·share·dashboard 공유).
  추출 시 결과 페이지 동작 회귀 없어야 함.
- 요약 카드 스타일은 결과 커버(`.profile-cover`) 축소판 재사용 또는 신규 경량 카드 스타일.

## 파일 영향 요약

| 파일 | 변경 |
|---|---|
| `data/archetypes.js` | 변경 없음(그대로 사용) |
| `app.js` | 최소: share_id 캡처 + "공유 링크 복사" 버튼/핸들러; `renderRadar` 추출 |
| `index.html` | 결과 액션에 "공유 링크 복사" 버튼 1개 |
| `share.html` / `share.js` | 신규 |
| `dashboard.html` / `dashboard.js` | 신규 |
| `styles.css` | 공유/대시보드 카드·그리드 스타일(신규, 기존 토큰 재사용) |
| Supabase | `share_id` 컬럼 + `get_shared_result` RPC (승인 게이트) |

## 범위 밖 (YAGNI)

서버측 친구목록 · 그룹/방 · 친구맺기(상호 연결) · 전체 리포트 공유 · 원본 응답 공유 · 짧은 커스텀 코드.

## 수용 기준

- [ ] 로그인 사용자가 결과에서 공유 링크를 복사할 수 있다(유효한 `share_id` 포함).
- [ ] 비로그인 상태에서 공유 링크를 열면 그 사람의 요약 카드(이름·유형·레이더·한 줄)가 보인다.
- [ ] RPC는 `answers`·`user_id`·타 행을 노출하지 않는다(점수+이름+생성일만).
- [ ] 직접 `select`로 남의 결과를 읽으려 하면 RLS가 막는다(회귀 없음).
- [ ] 대시보드에서 친구 코드/링크를 추가·삭제하고, 여러 요약 카드를 모아 볼 수 있다(localStorage 유지).
- [ ] 잘못된/삭제된 id는 안전한 안내로 처리(크래시 없음).
- [ ] 기존 검사·채점·로그인·결과 저장·이미지 저장 흐름에 회귀가 없다.
- [ ] 모바일 레이아웃에서 공유 카드·대시보드 그리드가 깨지지 않는다.
