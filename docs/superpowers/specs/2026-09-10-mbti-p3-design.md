# 설계: P3 — 두 번째 테스트(16가지 성격유형) + 플랫폼 뷰 확장

- **날짜:** 2026-09-10
- **대상:** 오션(OCEAN) 멀티테스트 플랫폼
- **상태:** 설계 승인됨(사용자 확정 2026-09-10).

## 배경 / 목표

P1에서 "공용 셸 + 테스트별 모듈" 플랫폼을 세웠다. P3은 **두 번째 테스트(16가지 성격유형, MBTI형)**를
모듈로 추가해 플랫폼을 검증한다. OCEAN은 5축 레이더지만 16유형은 **4개 이분축(E/I·S/N·T/F·J/P)**
이라, 공용 요약 카드가 "scores→레이더" 고정인 부분을 **모듈이 자기 시각화를 렌더하도록 확장**한다
(하이브리드의 실제 검증 지점).

**상표/저작권(확정):** 공식 MBTI® 문항·명칭은 사용 불가. **원작 문항**을 작성하고 이름은
**"16가지 성격유형 검사"**로 한다(본문에서 "MBTI 스타일/융 심리유형" 설명은 가능). 채점 축 매핑은
방법론(저작권 대상 아님)만 참고.

## 결정 사항 (사용자 확정)

1. 두 번째 테스트 = 16가지 성격유형(MBTI형). 문항은 **원작**, 이름은 "16가지 성격유형 검사".
2. 결과 페이지 리치니스 = **중간**(유형코드+별명+이모지 · 4 이분 바 · 설명 · 강점/약점 · 추천 직무).
3. 비교(P2)도 유형별 시각화로 일반화(모듈 위임).

## 상세 설계

### 1. 모듈 인터페이스 확장

기존: `meta · questions · score · buildProfile · renderResult · (renderDiscoverPreviews?)`.
**추가(공용 셸이 뷰를 모듈에 위임하도록):**
- `renderSummaryViz(container, scores)` — 공용 요약 카드(share/dashboard/me)의 "시각화 영역"을 채운다.
  OCEAN=레이더 SVG, 16유형=4개 이분 바.
- `renderCompareViz(container, datasets)` — 비교 모달의 시각화. `datasets=[{scores,color,label},…]`.
  OCEAN=오버레이 레이더(기존 `renderCompareRadar`를 모듈이 감쌈), 16유형=축별 두 값 나란히 바.

공용 카드 셸(kicker·emoji·name·type·summary·액션)은 그대로 두고, **레이더 생성부만** 모듈 호출로 교체.

### 2. OCEAN 모듈 보강 (회귀 없이)

- `renderSummaryViz(container, scores)`: 현재 share/dashboard/me가 만들던 `<svg class="sc-radar" viewBox="0 0 460 420">`
  를 생성해 `renderRadar(svg, scores, buildProfile(scores).levels)` 호출 후 container에 append.
- `renderCompareViz(container, datasets)`: `<svg class="cmp-radar" viewBox="0 0 460 420">` 생성 →
  `renderCompareRadar(svg, datasets.map(d=>({pct:d.scores, color:d.color})))`.
- 결과 화면(renderResult)·기존 레이더 렌더는 불변.

### 3. 16유형 모듈 `tests/mbti/`

```
tests/mbti/questions.js  # AXES 메타 + QUESTIONS(원작 32문항)
tests/mbti/types.js      # TYPES16: code→{title(별명), emoji, summary, description, strengths[], blindspots[], careers[]}
tests/mbti/module.js     # MBTI_MODULE (인터페이스 구현)
```

- **meta:** `{ id:"mbti", name:"16가지 성격유형 검사", tagline, icon:"🧭", scaleSize:5, scaleLabels:["전혀 아니다",…,"매우 그렇다"] }`.
- **questions:** 원작 **32문항**(Likert 5점). 각 문항 `{ text, axis:"EI"|"SN"|"TF"|"JP", keyed:"+"|"-" }`, 축당 8문항.
  `keyed:"+"`는 응답값이 클수록 해당 축의 **두 번째 글자 쪽**(I/N/F/P), `"-"`는 반대(E/S/T/J)로 정의(구현 일관).
  (OCEAN과 동일 포맷이라 공용 러너 그대로 동작.)
- **score(answers) → scores:** 축별 합산 후 **0~100 %로 정규화**하되 방향 고정 —
  `scores = { EI, SN, TF, JP }` 에서 값은 **각 축 두 번째 글자(I/N/F/P) 쪽 비율(%)**.
  (예: `EI=30` → I 30%/E 70%.) 미응답은 중립(3) 처리.
- **buildProfile(scores):** 각 축 `>=50 ? 두번째글자 : 첫번째글자`로 4글자 코드 → `TYPES16[code]`.
  반환 `{ type:{ code, title, role:title, emoji }, letters:{EI:'E'|'I',…}, scores, summary, description, strengths, blindspots, careers }`.
- **renderResult(mountEl, {scores, profile, nickname}):** 유형 코드(대형)+이모지+별명, **4 이분 바**
  (각 축 두 극 라벨 + 마커), 설명 문단, 강점/약점 리스트, 추천 직무 칩. (중간 리치니스)
- **renderSummaryViz(container, scores):** 컴팩트 **4 이분 바**(카드용).
- **renderCompareViz(container, datasets):** 축별로 두 결과 값을 나란히 바로 비교(색상별).

### 4. 레지스트리

`tests/registry.js`의 `TESTS`에 `MBTI_MODULE` 추가. 스크립트 로드(모든 페이지)에 mbti 모듈 3파일 추가.
→ 허브에 카드 2개, `test.html?id=mbti`로 진행.

### 5. 공용 셸 배선 변경 (뷰 위임)

- `share.js`·`dashboard.js`·`me.js`: 요약 카드에서 `<svg class=sc-radar>`+`renderRadar` 직접 생성 →
  `getTest(test_id).renderSummaryViz(vizContainer, scores)`로 교체(모듈이 svg/바를 넣음).
- `me.js` 비교(openCompare): `renderCompareRadar(...)` 직접 호출 → `getTest(test_id).renderCompareViz(container, datasets)`.
- 카드 셸·가드(같은 test_id)·이미지 저장 로직은 유지.

### 6. 저장/DB

변경 없음. `results.test_id='mbti'`, `scores`=`{EI,SN,TF,JP}`, `type_code`='INTJ' 등, `type_title`=별명.
`get_shared_result` RPC는 이미 `test_id` 반환 → share/dashboard가 mbti 모듈로 렌더.

### 7. 스타일

`styles.css` append: 이분 바(`.dich-bar`/축 라벨/마커), 16유형 결과 레이아웃, 비교 바형. 기존 토큰·다크 카드 재사용.

## 파일 영향 요약

| 파일 | 변경 |
|---|---|
| `tests/mbti/{questions,types,module}.js` | 신규(원작 문항·16유형 데이터·모듈) |
| `tests/registry.js` | mbti 등록 |
| `tests/ocean/module.js` | `renderSummaryViz`/`renderCompareViz` 추가(레이더 위임) |
| `share.js`·`dashboard.js`·`me.js` | 요약/비교 뷰를 모듈 위임으로 교체 |
| `index.html`·`test.html`·`share.html`·`dashboard.html`·`me.html` | mbti 모듈 스크립트 로드 추가 |
| `styles.css` | 이분 바·16유형 결과 스타일 append |
| DB | 변경 없음 |

## 범위 밖

친구와 교차-테스트 비교, 유형 궁합, A/T 5번째 축, 16유형 초정밀 카피(중간 리치니스까지).

## 수용 기준 (P3)

- [ ] 허브에 **테스트 2개**(오션·16유형) 카드가 뜨고, `test.html?id=mbti`로 16유형 검사를 완료할 수 있다.
- [ ] 32문항 응답 → **4글자 유형 코드 + 별명 + 이모지 + 4 이분 바 + 설명/강점/약점/직무**가 결과에 렌더된다.
- [ ] 로그인 사용자의 16유형 결과가 저장되고(`test_id='mbti'`), **공유 링크·share.html**에서 요약 카드(이분 바)로 열린다.
- [ ] **마이페이지**에서 오션·16유형 결과가 각 테스트 그룹으로 보이고, 각자 올바른 시각화(레이더/이분 바)로 렌더된다.
- [ ] **비교**: 같은 테스트끼리 비교 시 해당 시각화(오션=오버레이 레이더, 16유형=이분 바)로 열리고, 다른 테스트끼리는 안내로 막힌다.
- [ ] **OCEAN 회귀 없음**: 오션 결과·공유·대시보드·마이페이지·비교 레이더가 그대로 동작(모듈 위임 후에도 동일 렌더).
- [ ] **모듈+레지스트리 항목만**으로 테스트가 추가됐음을 확인(공용 셸 로직은 뷰 위임 확장 외 변경 없음).
- [ ] 이름은 "16가지 성격유형 검사" — 어디에도 "MBTI®" 브랜딩/제휴 암시 없음.
- [ ] 모바일 레이아웃(허브 2카드·이분 바·16유형 결과·비교) 안 깨짐. DB/RLS 변경 없음.
