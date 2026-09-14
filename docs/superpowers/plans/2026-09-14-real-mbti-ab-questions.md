# 진짜 MBTI 찾기 — A/B 시나리오 문항 전환 Plan

> REQUIRED SUB-SKILL: superpowers:subagent-driven-development.

**Goal:** "진짜 MBTI 찾기"의 문항을 (MBTI 유형검사와 동일하게 재사용하던 Likert 문항 대신) **KKTI식 A/B 양자택일 시나리오 원작 문항**으로 교체한다. 러너에 A/B 문항 타입을 추가한다. 기존 3테스트(Likert) 회귀 없음.

**배경:** P5에서 real-mbti가 `MBTI_QUESTIONS`를 재사용 → KKTI 링크 지문과 다르고 MBTI 유형검사와 동일. 사용자가 A/B 시나리오(링크와 동일 방식)로 요청.

## 설계 결정
- **문항 형식 플래그:** `module.meta.format = "choice"`(real-mbti). 미지정/`"likert"`면 기존 5점(오션·MBTI·에겐테토).
- **A/B 문항 shape:** `{ axis:"EI"|"SN"|"TF"|"JP", a:"<A 시나리오>", b:"<B 시나리오>" }`. 규약: **A = 1번째 글자(E/S/T/J) 쪽, B = 2번째 글자(I/N/F/P) 쪽.**
- **응답 저장:** choice 테스트는 `state.answers[i] = "a" | "b"`.
- **채점(choice):** 축별 "b(2번째 글자)" 선택 수 / 축 문항 수 × 100 → `{EI,SN,TF,JP}`(2번째 글자 %). buildProfile(랭킹·반반·추구·서사)은 그대로 이 %를 받으므로 무변경.

---

## Task 1: 러너 A/B 문항 타입 지원

**Files:** Modify `test-runner.js` (필요 시 `test.html`/`styles.css`)

- [ ] **Step 1: `renderQuestion` 분기** — `test.meta.format === "choice"`면 `#scale-options`에 **두 개의 A/B 버튼**(q.a, q.b, 각 `.choice-btn`)을 렌더(선택 상태 표시). 아니면 기존 Likert 스케일. 진행바·이전/다음·`#q-index`·`#q-text` 처리:
  - choice일 때 `#q-text`는 "더 가까운 쪽을 선택하세요" 같은 안내 또는 비움, 실제 문장은 A/B 버튼 안에. (Likert는 기존대로 `#q-text = q.text`.)
- [ ] **Step 2: `selectAnswer` 분기** — choice면 값 `"a"|"b"` 저장, likert면 숫자. 이후 자동 진행(다음 문항/`finish`) 로직 동일. 선택 표시(선택된 버튼 강조) choice에도 적용.
- [ ] **Step 3: styles.css** — `.choice-btn`(다크/라이트 무관, 세로 2개, 큰 터치영역, 선택 강조) append.
- [ ] **Step 4: 검증** — `node --check test-runner.js`. agent-browser: 기존 `test.html?id=mbti`(likert) 문항 정상(스케일 5). choice는 Task 2 후. **likert 테스트 회귀 없음** 확인.
- [ ] **Step 5: 커밋** `git commit -m "feat(runner): A/B(choice) 문항 타입 지원(기존 likert 유지)"`

---

## Task 2: real-mbti A/B 문항 + 채점 전환

**Files:** Create `tests/real-mbti/questions.js`(A/B 32문항); Modify `tests/real-mbti/module.js`; Modify 5 HTML(questions.js 로드 추가)

- [ ] **Step 1: `tests/real-mbti/questions.js`** — 원작 **A/B 시나리오 32문항**(축당 8), KKTI풍(사회적 상황·"~라는 말을 듣는다"류). shape `{axis, a, b}` (a=1번째 글자 쪽, b=2번째 글자 쪽). 예:
  - TF: a "결정할 때 효율과 원칙을 먼저 따져서 '냉철하다'는 말을 듣는다" / b "결정할 때 상대 마음을 먼저 살펴서 '따뜻하다'는 말을 듣는다"
  - EI: a "모임 뒤에 오히려 기운이 차서 다음 약속을 잡는다" / b "모임 뒤엔 혼자 충전할 시간이 꼭 필요하다"
  전역 `const REAL_MBTI_QUESTIONS = [...]` (+필요시 `REAL_MBTI_AXES` 재사용 = MBTI_AXES).
- [ ] **Step 2: `tests/real-mbti/module.js` 수정**
  - `meta.format = "choice"` 추가. `meta.sampleQuestion`은 A/B 예시(또는 한 줄 안내)로.
  - `questions: REAL_MBTI_QUESTIONS`(MBTI_QUESTIONS 재사용 제거).
  - `score(answers)`: A/B 채점 — 축별 `b` 개수/축 문항수 ×100 → `{EI,SN,TF,JP}`. (`_mbtiScore` 재사용 제거.) `MBTI_AXES`로 축 검증.
  - buildProfile/renderResult/renderSummaryViz/renderCompareViz/stories/prelude: **무변경**(축 % 그대로 소비).
- [ ] **Step 3: 5 HTML 로드** — `tests/real-mbti/questions.js`를 `tests/real-mbti/stories.js` **앞**(module.js 앞)에 추가(index·test·share·dashboard·me).
- [ ] **Step 4: 검증** — `node --check tests/real-mbti/*.js`. agent-browser `test.html?id=real-mbti`: choice 문항(A/B 버튼) 렌더. eval: `REAL_MBTI_QUESTIONS.length===32`, 축당 8. `REAL_MBTI_MODULE.score(new Array(32).fill('b'))` → 각 축 100(전부 2번째 글자). `score(new Array(32).fill('a'))` → 각 축 0. buildProfile 결과 정상(랭킹/반반/추구/서사). MBTI 유형검사와 **문항이 다른지**(REAL_MBTI_QUESTIONS !== MBTI_QUESTIONS) 확인.
- [ ] **Step 5: 커밋** `git commit -m "feat(real-mbti): A/B 시나리오 원작 32문항 + A/B 채점(MBTI 문항 재사용 제거)"`

---

## Task 3: E2E + 배포
- [ ] real-mbti: 선입력→A/B 32문항→결과(랭킹/반반/추구/서사) mock 확인. likert 3테스트 회귀 없음. `node --check` 전체.
- [ ] push, PR(base main), 머지, Pages 반영(`tests/real-mbti/questions.js` 200, A/B 문항 렌더) 확인.

## Self-Review
- 커버리지: A/B 러너(T1)·real-mbti A/B 문항·채점(T2)·배포(T3). 결과 로직 무변경(축 % 계약 유지).
- 식별자: `meta.format`, `state.answers="a"|"b"`, `REAL_MBTI_QUESTIONS`, score 반환 {EI,SN,TF,JP} 일관.
- 리스크: (a) 러너 choice 분기가 likert 회귀 없게. (b) A/B a/b 극성(1번째/2번째 글자) 일관 — score와 문항 규약 일치 검산(all-b→100, all-a→0). (c) 32문항 원작 품질.
