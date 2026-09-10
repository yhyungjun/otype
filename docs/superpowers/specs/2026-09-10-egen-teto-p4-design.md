# 설계: P4 — 인트로 일반화 + 에겐·테토 기질 테스트(세 번째 테스트)

- **날짜:** 2026-09-10
- **대상:** 오션(OCEAN) 멀티테스트 플랫폼
- **상태:** 설계 승인됨(사용자 확정 2026-09-10).

## 배경 / 목표

P3에서 두 번째 테스트(16가지 성격유형)를 추가했으나, `test.html`의 **인트로(히어로·통계·예시문항·
디스커버·FAQ)가 OCEAN 하드코딩**이라 `test.html?id=mbti`에서도 "오션 성격 검사·50문항" 카피가 뜨는
**실결함**이 남았다(P1에서 TODO로 미뤄둔 부분). P4는 **① 인트로를 `test.meta` 기반으로 일반화**하고,
**② 세 번째 테스트 "에겐·테토 기질 테스트"**를 추가한다. 에겐·테토는 성별 무관 호르몬-기질 밈으로,
16유형과 **다른 모델(2축·4유형 스펙트럼)**이라 플랫폼 다양성을 넓힌다.

## 결정 사항 (사용자 확정)

1. 인트로를 test.meta 기반으로 일반화(모든 테스트가 올바른 시작 화면).
2. 3번째 테스트 = 에겐·테토 기질(2축 4유형), **원작 문항**, 결과 중간 리치니스 + 연애 인사이트.

## 상세 설계

### 1. 인트로 일반화

**module.meta 확장(모든 모듈):**
```
meta: { …기존…, introLead, durationMin, sampleQuestion, faq?:[{q,a}] }
```
- `introLead`: 히어로 아래 설명(1~2줄).
- `durationMin`: 예상 소요(분).
- `sampleQuestion`: 예시 문항 문장.
- `faq`: 선택. 있으면 FAQ 렌더, 없으면 FAQ 섹션 숨김.

**`test.html` 인트로 구조 정리 + `test-runner.js` 채움:**
- 히어로 제목 = `meta.name`, 리드 = `meta.introLead`, 통계 = `[${questions.length} 문항, ${meta.durationMin}분 소요]`, 예시 카드 = `meta.sampleQuestion`.
- **디스커버 섹션**: 모듈에 `renderDiscoverPreviews`가 있으면 표시·채움(OCEAN만), 없으면 섹션 제거(MBTI·에겐테토).
- **FAQ 섹션**: `meta.faq` 있으면 렌더, 없으면 섹션 제거.
- 러너가 인트로를 `show("intro")` 전에 1회 채운다(러너는 테스트 무관 — meta만 읽음).

**OCEAN·MBTI 모듈 meta 보강(회귀 없이):** OCEAN은 현재 인트로 텍스트를 `introLead/durationMin/sampleQuestion/faq`
로 옮겨 **동일하게** 재현(디스커버는 그대로). MBTI는 자기 introLead/durationMin/sampleQuestion(+선택 faq) 제공.

### 2. 에겐·테토 모듈 `tests/egen-teto/`

```
tests/egen-teto/questions.js  # AXES + QUESTIONS(원작 20문항)
tests/egen-teto/types.js      # ET_TYPES(4유형)
tests/egen-teto/module.js     # ET_MODULE
```

- **모델(2축):**
  - `teto`(테토 성향 %): 클수록 주도·직설·추진·리더십. (낮으면 에겐: 다정·섬세·공감·차분)
  - `extro`(외향 성향 %): 클수록 표현·활발. (낮으면 내향: 절제·정돈)
- **4유형(code = (teto>=50?'T':'E') + (extro>=50?'O':'I')):**
  | code | 유형명 | 이모지 |
  |---|---|---|
  | TO | 불꽃 리더 (테토·외향) | 🔥 |
  | TI | 조용한 승부사 (테토·내향) | 🎯 |
  | EO | 따뜻한 무드메이커 (에겐·외향) | ☀️ |
  | EI | 섬세한 힐러 (에겐·내향) | 🌙 |
- **meta:** `{ id:"egen-teto", name:"에겐·테토 기질 테스트", tagline:"주도냐 수용이냐 — 나의 기질 성향", icon:"⚡", scaleSize:5, scaleLabels:["전혀 아니다"…"매우 그렇다"], introLead, durationMin:3, sampleQuestion, faq }`.
- **questions:** 원작 **20문항**(teto 10, extro 10, 각 축 +/− 균형), Likert 5점. `{ text, axis:"teto"|"extro", keyed:"+"|"-" }`. `keyed:"+"`=응답 클수록 해당 성향(테토/외향) 강함.
- **score(answers) → { teto, extro }** (각 0~100 %): 축별 평균(1~5)→`round(((avg-1)/4)*100)`. 미응답 중립(3).
- **buildProfile(scores):** code 계산 → `ET_TYPES[code]`. 반환 `{ type:{code, title, role:title, emoji}, axis:{teto,extro}, scores, summary, description, strengths[], charm(매력포인트), attracted(끌리는 상대 유형 설명) }`.
- **renderResult(mountEl, {scores, profile}):** 유형명 대형+이모지, **스펙트럼 바 2개**(에겐—테토, 내향—외향; 마커=%), 설명, 강점, **매력 포인트 + 끌리는 상대**(연애 인사이트). (중간 리치니스)
- **renderSummaryViz(container, scores):** 컴팩트 스펙트럼 바 2개(카드용).
- **renderCompareViz(container, datasets):** 축별 두 값 나란히 바.
- 바 시각화는 기존 `.dich` 스타일 재사용(에겐테토는 2행).

### 3. 레지스트리 + 로드

`tests/registry.js`의 `TESTS`에 `ET_MODULE` 추가. 5개 HTML(index·test·share·dashboard·me) 스크립트 로드에
egen-teto 3파일 추가(ocean/mbti 모듈 다음, registry 앞).

### 4. 저장/DB

변경 없음. `results.test_id='egen-teto'`, `scores={teto,extro}`, `type_code`='TO' 등, `type_title`=유형명.

### 5. 스타일

`styles.css` append: 스펙트럼 바(기존 `.dich` 재사용 또는 `.spec-*` 신규), 에겐테토 결과 레이아웃(매력/연애 블록). 다크 카드 토큰 재사용.

## 파일 영향 요약

| 파일 | 변경 |
|---|---|
| `test.html` | 인트로 구조 정리(러너가 채우도록 id/구조) |
| `test-runner.js` | 인트로를 meta로 채움 + 디스커버/FAQ 토글 |
| `tests/ocean/module.js`·`tests/mbti/module.js` | meta에 introLead/durationMin/sampleQuestion/faq 추가 |
| `tests/egen-teto/{questions,types,module}.js` | 신규 |
| `tests/registry.js` | egen-teto 등록 |
| `index/test/share/dashboard/me .html` | egen-teto 스크립트 로드 |
| `styles.css` | 스펙트럼 바·에겐테토 결과 스타일 append |
| DB | 변경 없음 |

## 범위 밖

성별 입력(에겐남/테토녀 4×성별), 궁합 매칭 상세, 초정밀 카피(중간까지).

## 수용 기준 (P4)

- [ ] `test.html?id=<any>`의 인트로(제목·리드·통계·예시문항)가 **해당 테스트 meta**로 표시된다(오션·16유형·에겐테토 각각 올바른 카피). 디스커버는 OCEAN만, FAQ는 meta.faq 있는 테스트만.
- [ ] **OCEAN 인트로 회귀 없음**(기존 히어로·통계·예시·디스커버·FAQ 동일 재현).
- [ ] 허브에 **테스트 3개** 카드. `test.html?id=egen-teto`로 20문항 검사 완료 → **4유형 중 하나 + 이모지 + 스펙트럼 바 2개 + 설명/강점/매력·끌리는 상대**가 렌더된다.
- [ ] 에겐테토 결과 저장(`test_id='egen-teto'`), 공유 링크·share.html·마이페이지·비교에서 **스펙트럼 바** 시각화로 올바르게 렌더된다(모듈 위임).
- [ ] 비교: 같은 테스트끼리(에겐테토·에겐테토)만 열리고 다른 테스트끼리는 안내로 막힌다.
- [ ] OCEAN·16유형 회귀 없음(결과·공유·마이페이지·비교).
- [ ] 이름은 "에겐·테토 기질 테스트"(밈 용어) — 상표/저작권 이슈 없음. DB/RLS 변경 없음. 모바일 안 깨짐.
