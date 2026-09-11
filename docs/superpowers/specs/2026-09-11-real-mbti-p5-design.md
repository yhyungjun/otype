# 설계: P5 — "진짜 MBTI 찾기" (페르소나 vs 진짜 · KKTI 결과 로직)

- **날짜:** 2026-09-11
- **대상:** 오션(OCEAN) 멀티테스트 플랫폼
- **상태:** 설계 승인됨(사용자 확정 2026-09-11).

## 배경 / 목표

기존 "MBTI 유형 검사"와 **별도의 4번째 테스트**로, KKTI(kkti.co.kr)의 **"알던 MBTI(페르소나) vs 진짜
MBTI(검사)"** 프레이밍을 가져온다. 사용자가 검사 전 "자신이 아는 MBTI"를 선입력하고, 검사 결과로 진짜
유형을 진단해 **알던 것 vs 진짜**를 비교해 준다. 같은 16유형 엔진을 쓰되 차별점은 **선입력 + 결과 로직**.

참조 실제 결과: `https://www.kkti.co.kr/v4/result/58f2da50393e7e9aea38e3e6`

## 결정 사항 (사용자 확정)

1. 별도 테스트, 이름 **"진짜 MBTI 찾기"**.
2. 채점: 기존 MBTI 32문항 Likert 엔진 재사용(축별 %). 결과 로직이 핵심.
3. 결과 로직은 KKTI 결과 페이지 구성을 반영.
4. "당신의 이야기" 서사(4비트)는 **유형별 원작**.

## KKTI 결과 로직 (반영 대상)

1. **알던 MBTI(선입력) vs 진짜 유형** — 다른 글자 강조.
2. **1위 유형 + 2위 후보(%)** — 자가검사 페르소나 편향 고지 + 2위 제시.
3. **본질 × 추구성격** — 예 "ESTJ × NT" (2위 유형의 기질군이 '추구' 방향) + 생성 문구.
4. **선호도 강도(축별 %) + 반반 지표** — ≈50% 축은 "반반" 표시.
5. **가까운 유형 TOP4(% 매칭) + 알던 것 위치** — "알고 있던 ENTJ는 2위!".
6. **당신의 이야기(4비트)** — 👁 당신은(페르소나) → 🔎 검사 결과는(간극) → 💡 사실은(진짜) → ❤️ 괜찮습니다(위로).

## 상세 설계

### 1. 플랫폼 확장 — 검사 전 "선입력 스텝(prelude)"

현재 러너에는 검사 전 입력 단계가 없다. 모듈이 옵션으로 `prelude`를 선언하면 러너가 문항 전에 선입력
화면을 보여준다.

- **module.meta.prelude**(옵션): `{ key:"known", title, hint, options:[{value,label},…], allowSkip:{value,label} }`.
  real-mbti의 prelude = "당신이 아는 MBTI는?" 16유형 + "잘 모르겠어요".
- **test.html**: `#view-prelude` 뷰 추가(제목·힌트·옵션 그리드).
- **test-runner.js**: `test.meta.prelude` 있으면 `beginTest` 시 문항 대신 prelude 먼저 표시 → 선택 시
  `state.prelude[key]=value` 저장 후 문항 시작. prelude 없으면 기존대로 바로 문항.
- **전달·저장**: `finish()`에서 `scores = test.score(answers)` 후 **`scores.known = state.prelude.known`**(스키마
  무변경 — scores jsonb에 병합). `buildProfile(scores)`가 `scores.known`을 읽어 비교. (다른 모듈은 무영향.)

### 2. real-mbti 모듈 `tests/real-mbti/`

```
tests/real-mbti/stories.js  # REAL_STORIES: code → { you, test, truth, ok } (유형별 4비트 원작 서사)
tests/real-mbti/module.js   # REAL_MBTI_MODULE (MBTI 엔진 재사용 + KKTI 결과 로직)
```

- **의존(재사용):** `MBTI_QUESTIONS·MBTI_AXES·MBTI_TYPES`(tests/mbti/*) 전역. 로드 순서: mbti → real-mbti.
- **meta:** `{ id:"real-mbti", name:"진짜 MBTI 찾기", tagline:"알던 MBTI 말고, 진짜 나를 찾다", icon:"🕵️",
  scaleSize:5, scaleLabels, introLead, durationMin:5, sampleQuestion, faq,
  prelude:{ key:"known", title:"당신이 알고 있는 MBTI는?", hint:"검사가 찾은 '진짜'와 비교해 드려요",
            options:16유형, allowSkip:{value:"UNKNOWN", label:"잘 모르겠어요"} } }`.
- **questions:** `MBTI_QUESTIONS`(재사용).
- **score(answers):** MBTI score 로직 재사용 → `{EI,SN,TF,JP}`(각 2번째 글자 %).
- **buildProfile(scores):**
  - real type(1위): 각 축 `>=50?2번째:1번째` → code.
  - **랭킹:** 16유형 각각 agreement = 축별 "그 유형 글자 쪽 사용자 %" 평균. 1위를 100%로 정규화 후 내림차순 → TOP4. 2위 = rank2.
  - **반반:** `|score-50| <= 10`(40~60) 축을 `banban:true`로 표시.
  - **추구성격:** rank2 유형의 기질군(NT/NF/SJ/SP) → 생성 문구 "같은 {1위} 중 가장 {NT:전략적/NF:이상적/SJ:체계적/SP:실전적}인 {1위}". (별명 64개 미작성)
  - **known 비교:** `scores.known`(UNKNOWN이면 생략)의 랭킹 위치 → "알고 있던 {known}은 {n}위!".
  - 반환: `{ type:{code,title,role,emoji}(=MBTI_TYPES[code]), letters, scores, ranking:[{code,pct,badge}], banban:[axis…], pursuit:{group,phrase}, known:{code, rank}|null, story:REAL_STORIES[code] }`.
- **renderResult(mountEl,{scores,profile}):** KKTI 순서로 다크 카드 렌더 — ①알던 vs 진짜(글자 타일, 다른 글자 강조) ②1·2위(%) ③본질×추구(생성문구) ④축별 % + 반반 바 ⑤TOP4 랭킹(+알던 것 뱃지) ⑥당신의 이야기 4비트(👁🔎💡❤️). (게이트 없음 — 전부 공개)
- **renderSummaryViz(container,scores):** 공유/마이페이지 카드용 — 진짜 유형 + 이분 바(MBTI `_renderDichBars` 재사용) + "알던 것 {known}" 뱃지(있으면).
- **renderCompareViz(container,datasets):** MBTI 비교 바 재사용.
- (선택) **renderDiscoverPreviews:** 디스커버 카드(페르소나 vs 진짜 · 진짜 유형 · 반반 지표 · 가까운 유형 · 당신의 이야기).

### 3. stories.js — 유형별 원작 서사(16 × 4비트)

`REAL_STORIES[code] = { you, test, truth, ok }` — 각 1~2문장 원작 한국어. 페르소나(남들이 아는 나)→
검사 간극→진짜 나→위로. 16유형 전부.

### 4. 레지스트리 + 로드 + 저장

- `tests/registry.js`: `TESTS`에 `REAL_MBTI_MODULE` 추가(mbti 뒤).
- 5개 HTML: `tests/real-mbti/{stories,module}.js`를 `tests/mbti/module.js` 뒤·registry 앞에 로드.
- 저장/DB: 변경 없음. `results.test_id='real-mbti'`, `scores={EI,SN,TF,JP,known}`, `type_code`=진짜 코드.

### 5. 스타일

`styles.css` append: 알던vs진짜 글자 타일, 랭킹 리스트(뱃지 ME/기존), 반반 배지, 당신의 이야기 4비트 블록, 선입력 그리드(`#view-prelude`). 다크 카드·기존 `.dich` 재사용.

## 파일 영향 요약

| 파일 | 변경 |
|---|---|
| `test.html` | `#view-prelude` 뷰 추가 |
| `test-runner.js` | prelude 스텝 처리 + scores.known 병합 |
| `tests/real-mbti/{stories,module}.js` | 신규 |
| `tests/registry.js` | real-mbti 등록 |
| `index/test/share/dashboard/me .html` | real-mbti 2파일 로드 |
| `styles.css` | 결과·선입력·랭킹 스타일 append |
| `tests/mbti/*` | 무변경(전역 재사용) |
| DB | 변경 없음 |

## 범위 밖

상세해설 게이트(우리는 공개), 유료/컨설팅, A/B 강제선택 문항(우리 Likert 유지), 추구성격 별명 64종.

## 수용 기준 (P5)

- [ ] 허브에 테스트 4개. `test.html?id=real-mbti` → **선입력("아는 MBTI")** → 32문항 → 결과.
- [ ] 결과에 **알던 vs 진짜**(글자 타일·차이 강조), **1·2위(%)**, **본질×추구(생성문구)**, **축별 %+반반**, **TOP4 랭킹(+알던 것 위치)**, **당신의 이야기(4비트 원작)** 가 렌더된다.
- [ ] "잘 모르겠어요" 선택 시 알던-것 비교는 생략하고 나머지는 정상.
- [ ] 저장(`test_id='real-mbti'`, scores에 known 포함), 공유/마이페이지/비교에서 진짜 유형(+알던 것 뱃지)로 렌더.
- [ ] 기존 3개 테스트(오션·MBTI·에겐테토) 회귀 없음(러너 prelude 확장이 prelude 없는 테스트에 무영향).
- [ ] "MBTI®" 브랜딩/제휴 암시 없음(문항 원작·검사명 "진짜 MBTI 찾기", FAQ에 공식 MBTI®와 별개 명시). DB/RLS 변경 없음. 모바일 안 깨짐.
