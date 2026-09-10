// 16가지 성격유형 검사 모듈 — 문항·채점·프로필·결과 렌더를 고정 인터페이스 뒤로 캡슐화.
// 공용 셸(test.html 러너, share/dashboard/me)이 MBTI_MODULE.meta/questions/score/
// buildProfile/renderResult/renderSummaryViz/renderCompareViz 로 소비한다.
//
// 로드 순서 의존성: questions.js → types.js → module.js
//   - questions.js: MBTI_AXES, MBTI_SCALE, MBTI_QUESTIONS (전역)
//   - types.js: MBTI_TYPES (전역)
//
// 시각화는 레이더가 아닌 4개의 이분(dichotomy) 바를 사용한다.
// score 는 각 축의 "두 번째 글자(I/N/F/P)" 쪽 백분율(0~100)을 반환한다.

const MBTI_AXIS_ORDER = ["EI", "SN", "TF", "JP"];
const MBTI_NEUTRAL = 3; // 미응답 시 중립 처리
const MBTI_MIDPOINT = 50; // 50% 이상이면 두 번째 글자 쪽으로 판정

// 축 글자별 한글 라벨 (바 양끝 표시용)
const MBTI_LETTER_LABEL = {
  E: "외향", I: "내향",
  S: "감각", N: "직관",
  T: "사고", F: "감정",
  J: "판단", P: "인식",
};

/* ---------- 채점 ---------- */
// answers: number[](1..5, questions 인덱스 정렬; 미응답은 null → 중립 3).
// keyed "+" → v 그대로(값 클수록 2번째 글자 쪽), "-" → 6 - v(값 클수록 1번째 글자 쪽).
// 축별 평균(1..5)을 0~100(%) 으로: 2번째 글자(I/N/F/P) 쪽 비율.
function _mbtiScore(answers) {
  const acc = {};
  MBTI_AXIS_ORDER.forEach((a) => (acc[a] = { sum: 0, count: 0 }));
  MBTI_QUESTIONS.forEach((q, i) => {
    const v = answers[i] ?? MBTI_NEUTRAL;
    const dir = q.keyed === "+" ? v : 6 - v;
    acc[q.axis].sum += dir;
    acc[q.axis].count += 1;
  });
  const pct = {};
  MBTI_AXIS_ORDER.forEach((a) => {
    const avg = acc[a].count ? acc[a].sum / acc[a].count : MBTI_NEUTRAL;
    pct[a] = Math.round(((avg - 1) / 4) * 100);
  });
  return pct; // { EI, SN, TF, JP } — 각 값은 2번째 글자(I/N/F/P) 쪽 %
}

/* ---------- 프로필 ---------- */
// scores: { EI, SN, TF, JP } (2번째 글자 쪽 %). 50% 이상이면 2번째 글자로 확정.
function _mbtiBuildProfile(scores) {
  const letters = {};
  MBTI_AXIS_ORDER.forEach((a) => {
    letters[a] = scores[a] >= MBTI_MIDPOINT ? MBTI_AXES[a][1] : MBTI_AXES[a][0];
  });
  const code = letters.EI + letters.SN + letters.TF + letters.JP;
  const t = MBTI_TYPES[code] || {};
  return {
    type: {
      code,
      title: t.title || code,
      role: t.title || code,
      emoji: t.emoji || "🧭",
    },
    letters,
    scores,
    summary: t.summary || "",
    description: t.description || "",
    strengths: t.strengths || [],
    blindspots: t.blindspots || [],
    careers: t.careers || [],
  };
}

/* ---------- 이분 바 렌더 (공용) ---------- */
// container 안에 4개 축 바를 생성. compact=true 면 라벨/여백을 줄인 요약형.
function _renderDichBars(container, scores, compact) {
  container.innerHTML = "";
  const wrap = document.createElement("div");
  wrap.className = compact ? "dich dich--compact" : "dich";

  MBTI_AXIS_ORDER.forEach((axis) => {
    const [left, right] = MBTI_AXES[axis];
    const pct = Math.min(Math.max(scores[axis] ?? MBTI_MIDPOINT, 0), 100);
    const rightWins = pct >= MBTI_MIDPOINT;

    const row = document.createElement("div");
    row.className = "dich-row";

    const endL = document.createElement("div");
    endL.className = "dich-end l" + (rightWins ? "" : " on");
    const lLetter = document.createElement("b");
    lLetter.textContent = left;
    endL.appendChild(lLetter);
    if (!compact) {
      const lName = document.createElement("span");
      lName.textContent = MBTI_LETTER_LABEL[left];
      endL.appendChild(lName);
    }

    const track = document.createElement("div");
    track.className = "dich-track";
    const fill = document.createElement("div");
    fill.className = "dich-fill" + (rightWins ? " to-r" : " to-l");
    // fill 은 우세한 쪽에서 중앙까지의 크기를 표현: 두 번째 글자 우세면 좌→pct, 아니면 우→(100-pct)
    fill.style.width = (rightWins ? pct : 100 - pct) + "%";
    track.appendChild(fill);

    const endR = document.createElement("div");
    endR.className = "dich-end r" + (rightWins ? " on" : "");
    const rLetter = document.createElement("b");
    rLetter.textContent = right;
    endR.appendChild(rLetter);
    if (!compact) {
      const rName = document.createElement("span");
      rName.textContent = MBTI_LETTER_LABEL[right];
      endR.appendChild(rName);
    }

    row.append(endL, track, endR);
    wrap.appendChild(row);
  });

  container.appendChild(wrap);
}

/* ---------- 비교 바 렌더 ---------- */
// datasets: [{ scores, color, label }, …]. 축마다 각 데이터셋의 마커를 겹쳐 표시.
function _renderCompareDich(container, datasets) {
  container.innerHTML = "";
  const wrap = document.createElement("div");
  wrap.className = "dich dich--compare";

  MBTI_AXIS_ORDER.forEach((axis) => {
    const [left, right] = MBTI_AXES[axis];

    const row = document.createElement("div");
    row.className = "dich-row dich-row--cmp";

    const endL = document.createElement("div");
    endL.className = "dich-end l";
    const lb = document.createElement("b");
    lb.textContent = left;
    endL.appendChild(lb);

    const track = document.createElement("div");
    track.className = "dich-track dich-track--cmp";
    datasets.forEach((d) => {
      const pct = Math.min(Math.max(d.scores[axis] ?? MBTI_MIDPOINT, 0), 100);
      const marker = document.createElement("span");
      marker.className = "dich-marker";
      marker.style.left = pct + "%";
      marker.style.background = d.color;
      if (d.label) marker.title = d.label;
      track.appendChild(marker);
    });

    const endR = document.createElement("div");
    endR.className = "dich-end r";
    const rb = document.createElement("b");
    rb.textContent = right;
    endR.appendChild(rb);

    row.append(endL, track, endR);
    wrap.appendChild(row);
  });

  container.appendChild(wrap);
}

/* ---------- 결과 렌더 ---------- */
// mountEl(#result-mount, .result-view 안): 다크 카드 마크업을 직접 생성.
// 텍스트는 textContent 로 삽입(외부 데이터 안전 삽입).
function _mbtiRenderResult(mountEl, { scores, profile }) {
  mountEl.innerHTML = "";
  const { type, description, strengths, blindspots, careers, summary } = profile;

  // 커버
  const cover = document.createElement("div");
  cover.className = "mbti-cover";
  const emoji = document.createElement("div");
  emoji.className = "mbti-emoji";
  emoji.setAttribute("aria-hidden", "true");
  emoji.textContent = type.emoji;
  const codeEl = document.createElement("h1");
  codeEl.className = "mbti-code";
  codeEl.textContent = type.code;
  const titleEl = document.createElement("p");
  titleEl.className = "mbti-title";
  titleEl.textContent = type.title;
  cover.append(emoji, codeEl, titleEl);
  if (summary) {
    const sumEl = document.createElement("p");
    sumEl.className = "mbti-summary";
    sumEl.textContent = summary;
    cover.appendChild(sumEl);
  }
  // 커버 안 이분 바
  const coverBars = document.createElement("div");
  cover.appendChild(coverBars);
  _renderDichBars(coverBars, scores, false);
  mountEl.appendChild(cover);

  // 설명
  if (description) {
    const descSec = document.createElement("div");
    descSec.className = "mbti-section";
    const dh = document.createElement("h3");
    dh.className = "sec-head";
    dh.textContent = "유형 설명";
    const dp = document.createElement("p");
    dp.className = "mbti-desc";
    dp.textContent = description;
    descSec.append(dh, dp);
    mountEl.appendChild(descSec);
  }

  // 강점 / 블라인드스팟
  const analysis = document.createElement("div");
  analysis.className = "mbti-section";
  const ah = document.createElement("h3");
  ah.className = "sec-head";
  ah.textContent = "강점과 주의할 지점";
  analysis.appendChild(ah);
  const cols = document.createElement("div");
  cols.className = "mbti-cols";

  const makeCard = (label, items, modifier) => {
    const card = document.createElement("div");
    card.className = "mbti-card " + modifier;
    const h4 = document.createElement("h4");
    h4.textContent = label;
    const ul = document.createElement("ul");
    items.forEach((s) => {
      const li = document.createElement("li");
      li.textContent = s;
      ul.appendChild(li);
    });
    card.append(h4, ul);
    return card;
  };
  cols.appendChild(makeCard("강점", strengths, "mbti-card--strength"));
  cols.appendChild(makeCard("주의할 지점 (블라인드 스팟)", blindspots, "mbti-card--blind"));
  analysis.appendChild(cols);
  mountEl.appendChild(analysis);

  // 추천 직무
  if (careers.length) {
    const careerSec = document.createElement("div");
    careerSec.className = "mbti-section";
    const ch = document.createElement("h3");
    ch.className = "sec-head";
    ch.textContent = "어울리는 직무";
    const chips = document.createElement("div");
    chips.className = "mbti-chips";
    careers.forEach((role) => {
      const chip = document.createElement("span");
      chip.className = "mbti-chip";
      chip.textContent = role;
      chips.appendChild(chip);
    });
    const note = document.createElement("p");
    note.className = "mbti-disclaimer";
    note.textContent = "성향 기반 참고 추천 · 절대적 기준은 아닙니다.";
    careerSec.append(ch, chips, note);
    mountEl.appendChild(careerSec);
  }

  // 안내
  const foot = document.createElement("div");
  foot.className = "mbti-section";
  const disc = document.createElement("p");
  disc.className = "mbti-disclaimer";
  disc.textContent =
    "자기보고식 검사 결과인 만큼 절대적 정의가 아니라, 자기 이해를 돕는 참고 틀로 활용하시길 권합니다.";
  foot.appendChild(disc);
  mountEl.appendChild(foot);
}

/* ---------- 모듈 인터페이스 ---------- */
const MBTI_MODULE = {
  meta: {
    id: "mbti",
    name: "16가지 성격유형 검사",
    tagline: "네 갈래로 나를 읽는 16유형 검사",
    icon: "🧭",
    scaleSize: 5,
    scaleLabels: MBTI_SCALE.map((s) => s.label),
  },
  questions: MBTI_QUESTIONS,
  score(answers) {
    return _mbtiScore(answers);
  },
  buildProfile(scores) {
    return _mbtiBuildProfile(scores);
  },
  renderResult(mountEl, ctx) {
    _mbtiRenderResult(mountEl, ctx);
  },
  renderSummaryViz(container, scores) {
    _renderDichBars(container, scores, true);
  },
  renderCompareViz(container, datasets) {
    _renderCompareDich(container, datasets);
  },
};
