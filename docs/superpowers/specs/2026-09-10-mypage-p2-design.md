# 설계: 마이페이지 P2 — 이미지 저장 · 두 결과 비교 · 테스트별 그룹/필터

- **날짜:** 2026-09-10
- **대상:** 오션(OCEAN) 멀티테스트 플랫폼의 마이페이지(`me.html`/`me.js`)
- **상태:** 설계 승인됨(사용자 확정 2026-09-10).

## 배경 / 목표

P1에서 마이페이지(`me.html`)는 로그인 사용자의 결과를 `results`(RLS 소유자-읽기)에서 조회해 카드로
보여준다. P2는 마이페이지에 **① 결과 이미지 저장, ② 두 결과 비교(오버레이 레이더), ③ 테스트별
그룹/필터**를 더한다. **결과 삭제는 이번 범위 밖**(사용자 미선택) → DELETE RLS·DB 변경 없음.

모든 기능은 클라이언트 측이며 기존 조회 쿼리(`results` where `user_id=auth.uid()`, `test_id` 포함)를
그대로 사용한다. 공용 셸 원칙 유지: 테스트 특유 로직은 모듈(`getTest(test_id)`)로 위임.

## 결정 사항 (사용자 확정)

1. 기능: 이미지 저장 · 두 결과 비교 · 테스트별 그룹/필터. (삭제 제외)
2. 비교 표시: **오버레이 레이더**(한 차트에 두 결과 폴리곤 색상 달리 + 범례).

## 상세 설계

### 1. 데이터 (변경 없음)

`me.js`의 조회는 이미 `id, created_at, test_id, type_code, type_title, type_role, scores, share_id`를
가져온다(P1 Task4). 프로필은 `getTest(row.test_id || "ocean").buildProfile(row.scores)`로 계산.
P2는 새 컬럼·정책·마이그레이션 없음.

### 2. 테스트별 그룹/필터

- 조회한 rows에서 **존재하는 test_id 집합**을 뽑아 필터 탭을 만든다: `[전체, <테스트별>]`.
  탭 라벨은 `getTest(id)?.meta.name`(없으면 id). 기본 활성 = 전체.
- 결과를 `test_id`로 그룹핑. 각 그룹은 **헤더**(아이콘 `meta.icon` + 이름 `meta.name` + 개수) +
  그 그룹의 `.share-grid`(카드들, 검사일 desc). 그룹 순서는 최신 결과가 있는 테스트 우선.
- 필터 탭 클릭 → 해당 test_id 그룹만 표시(전체면 모두). 현재 OCEAN 단일이라 `[전체, 오션…]` 2탭.

### 3. 결과 이미지 저장 (카드별)

- 각 결과 카드 하단 액션에 **"이미지 저장"** 버튼 추가(기존 "공유 링크 복사" 옆).
- `saveCardImage(cardEl, row)`: `html2canvas(cardEl, { backgroundColor: <다크 카드색>, scale: 2, useCORS: true })`
  → PNG 다운로드. 파일명 `${row.test_id}_${type.title.replace(/^The\s+/,'').replace(/\s+/g,'_')}_${YYYYMMDD}.png`.
- `me.html`에 `vendor/html2canvas.min.js` 로드 추가.
- 카드는 `.share-card`(다크). 배경색은 카드 계산 스타일 또는 고정 다크값(`#141a2e` 등 `.share-card` 배경과 일치)으로.
  버튼은 캡처 대상에서 제외되도록 캡처 직전 임시 숨김 또는 `onclone`에서 `.sc-actions` 숨김.

### 4. 두 결과 비교 (오버레이 레이더)

- 각 카드에 **"비교" 토글**(체크박스형 버튼). 선택 상태를 `state.compare = Set<rowId>`로 관리, **최대 2개**.
  3번째 선택 시도 → 가장 오래된 선택 해제 또는 무시(안내 토스트). 선택된 카드는 시각 강조.
- 2개 선택되면 화면 하단에 **플로팅 "비교하기" 바** 노출(선택 2개 요약 + 비교 버튼 + 선택 해제).
- **가드**: 두 선택의 `test_id`가 다르면 비교 불가 → "같은 테스트끼리만 비교할 수 있어요" 토스트, 패널 안 염.
- **비교 패널(모달)**: 화면 오버레이. 내용:
  - 상단: 두 결과 헤더(이모지·유형·검사일)를 좌/우 색상 태그와 함께.
  - **오버레이 레이더**: `renderCompareRadar(svgEl, [{pct, levels, color, label}, {pct, levels, color, label}])`.
  - 범례: 각 데이터셋 색상 + 라벨(검사일 또는 유형).
  - 액션: "이미지 저장"(패널을 `saveCardImage`로 캡처) · "닫기".
- 모달·바는 `me.js`가 동적으로 생성(me.html은 html2canvas 로드 외 변경 최소).

### 5. `radar.js` 확장 — `renderCompareRadar`

- 기존 `renderRadar(svgEl, pct, levels, opts)`는 그대로 두고, **새 함수** 추가:
  ```
  renderCompareRadar(svgEl, datasets, opts)
    datasets: [{ pct, levels?, color, label }, …]  // P2는 길이 2
  ```
- 배경 격자·축선·축 라벨(영문, FACTORS 색상 대신 중립색)은 1회만. 각 dataset은 자기 `color`로
  반투명 폴리곤 + 스트로크 + 정점 점. 범례는 패널 쪽에서 렌더(또는 opts.legend).
- `RADAR_ORDER`·`FACTORS`·`radarPoint` 재사용. 결과 화면 `renderRadar` 회귀 없어야 함.
- 두 데이터셋 색상 기본: A=`#4b8ffc`(파랑), B=`#f5a623`(앰버) 등 대비색(opts로 override 가능).

### 6. 스타일 (`styles.css` append)

필터 탭(`.me-tabs`/`.me-tab`), 그룹 헤더(`.me-group-head`), 카드 액션 영역(`.sc-actions`) + "이미지 저장"·
"비교" 버튼, 선택 강조(`.share-card.is-selected`), 비교 바(`.compare-bar`), 비교 모달(`.compare-modal`/
`.compare-backdrop`)·범례(`.cmp-legend`). 기존 토큰·다크 카드 스타일 재사용. append만.

## 파일 영향 요약

| 파일 | 변경 |
|---|---|
| `me.html` | html2canvas 로드 추가(그 외 최소) |
| `me.js` | 그룹/필터 렌더, 카드 액션(이미지 저장·비교 토글), 비교 바·모달, 이미지 저장 로직 |
| `radar.js` | `renderCompareRadar` 추가(기존 renderRadar 불변) |
| `styles.css` | 탭·그룹헤더·카드액션·선택강조·비교바·모달·범례 스타일(append) |
| DB/RLS | 변경 없음 |

## 범위 밖

결과 삭제(미선택), 친구 결과와 비교, 다중(>2) 비교, P3 두 번째 테스트, 시간축 추이 그래프.

## 수용 기준 (P2)

- [ ] 마이페이지가 결과를 **테스트별 그룹**으로 보여주고, **필터 탭**(전체/테스트별)으로 걸러진다.
- [ ] 각 카드를 **PNG로 저장**할 수 있다(파일명에 테스트·유형·날짜, 액션 버튼은 캡처에서 제외).
- [ ] **비교 토글로 2개 선택** → "비교하기" → **오버레이 레이더**로 두 결과가 색상 달리 겹쳐 보인다(+범례).
- [ ] 서로 **다른 test_id**를 고르면 안내 토스트로 막힌다(패널 안 열림).
- [ ] 비교 패널도 **이미지 저장** 가능.
- [ ] 기존 마이페이지 흐름(로그인 게이트·조회·공유 링크 복사·빈 상태) **회귀 없음**.
- [ ] `renderRadar`(결과·공유·대시보드 레이더) **회귀 없음**.
- [ ] 모바일 레이아웃(탭·카드 액션·비교 모달)이 깨지지 않는다.
- [ ] DB/RLS/마이그레이션 변경 **없음**.
