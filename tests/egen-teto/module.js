// 에겐·테토 기질 테스트 모듈 — 문항·채점·프로필·결과 렌더를 고정 인터페이스 뒤로 캡슐화.
// 공용 셸(test.html 러너, share/dashboard/me)이 ET_MODULE.meta/questions/score/
// buildProfile/renderResult/renderSummaryViz/renderCompareViz 로 소비한다.
//
// 로드 순서 의존성: questions.js → types.js → module.js
//   - questions.js: ET_AXES, ET_SCALE, ET_QUESTIONS (전역)
//   - types.js: ET_TYPES (전역)
//
// 시각화는 레이더가 아닌 2개의 스펙트럼(dichotomy) 바를 사용한다.
//   teto  바: 좌 "에겐" ↔ 우 "테토", fill = scores.teto%
//   extro 바: 좌 "내향" ↔ 우 "외향", fill = scores.extro%

const ET_AXIS_ORDER = ["teto", "extro"];
const ET_NEUTRAL = 3; // 미응답 시 중립 처리
const ET_MIDPOINT = 50; // 50% 이상이면 두 번째 라벨(테토/외향) 쪽으로 판정

/* ---------- 채점 ---------- */
// answers: number[](1..5, questions 인덱스 정렬; 미응답은 null → 중립 3).
// keyed "+" → v 그대로(값 클수록 테토/외향 쪽), "-" → 6 - v(값 클수록 에겐/내향 쪽).
// 축별 평균(1..5)을 0~100(%) 으로: 테토/외향 쪽 비율.
function _etScore(answers) {
  const acc = {};
  ET_AXIS_ORDER.forEach((a) => (acc[a] = { sum: 0, count: 0 }));
  ET_QUESTIONS.forEach((q, i) => {
    const v = answers[i] ?? ET_NEUTRAL;
    const dir = q.keyed === "+" ? v : 6 - v;
    acc[q.axis].sum += dir;
    acc[q.axis].count += 1;
  });
  const pct = {};
  ET_AXIS_ORDER.forEach((a) => {
    const avg = acc[a].count ? acc[a].sum / acc[a].count : ET_NEUTRAL;
    pct[a] = Math.round(((avg - 1) / 4) * 100);
  });
  return pct; // { teto, extro } — 각 값은 테토/외향 쪽 %
}

/* ---------- 프로필 ---------- */
// scores: { teto, extro } (테토/외향 쪽 %). 50% 이상이면 해당 쪽으로 확정.
function _etBuildProfile(scores) {
  const teto = scores.teto ?? ET_MIDPOINT;
  const extro = scores.extro ?? ET_MIDPOINT;
  const code = (teto >= ET_MIDPOINT ? "T" : "E") + (extro >= ET_MIDPOINT ? "O" : "I");
  const t = ET_TYPES[code] || {};
  return {
    type: {
      code,
      title: t.title || code,
      role: t.title || "",
      emoji: t.emoji || "⚡",
    },
    axis: { teto, extro },
    scores,
    summary: t.summary || "",
    description: t.description || "",
    strengths: t.strengths || [],
    charm: t.charm || "",
    attracted: t.attracted || "",
  };
}

/* ---------- 스펙트럼 바 렌더 (공용) ---------- */
// container 안에 2개 축 바(teto·extro)를 생성. compact=true 면 라벨/여백을 줄인 요약형.
function _renderSpectrumBars(container, scores, compact) {
  container.innerHTML = "";
  const wrap = document.createElement("div");
  wrap.className = compact ? "dich dich--compact" : "dich";

  ET_AXIS_ORDER.forEach((axis) => {
    const [left, right] = ET_AXES[axis];
    const pct = Math.min(Math.max(scores[axis] ?? ET_MIDPOINT, 0), 100);
    const rightWins = pct >= ET_MIDPOINT;

    const row = document.createElement("div");
    row.className = "dich-row";

    const endL = document.createElement("div");
    endL.className = "dich-end l" + (rightWins ? "" : " on");
    const lLabel = document.createElement("b");
    lLabel.textContent = left;
    endL.appendChild(lLabel);

    const track = document.createElement("div");
    track.className = "dich-track";
    const fill = document.createElement("div");
    fill.className = "dich-fill" + (rightWins ? " to-r" : " to-l");
    // fill 은 우세한 쪽에서 중앙까지의 크기를 표현: 테토/외향 우세면 좌→pct, 아니면 우→(100-pct)
    fill.style.width = (rightWins ? pct : 100 - pct) + "%";
    track.appendChild(fill);

    const endR = document.createElement("div");
    endR.className = "dich-end r" + (rightWins ? " on" : "");
    const rLabel = document.createElement("b");
    rLabel.textContent = right;
    endR.appendChild(rLabel);

    row.append(endL, track, endR);
    wrap.appendChild(row);
  });

  container.appendChild(wrap);
}

/* ---------- 비교 바 렌더 ---------- */
// datasets: [{ scores, color, label }, …]. 축마다 각 데이터셋의 마커를 겹쳐 표시.
function _renderCompareSpectrum(container, datasets) {
  container.innerHTML = "";
  const wrap = document.createElement("div");
  wrap.className = "dich dich--compare";

  ET_AXIS_ORDER.forEach((axis) => {
    const [left, right] = ET_AXES[axis];

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
      const pct = Math.min(Math.max(d.scores[axis] ?? ET_MIDPOINT, 0), 100);
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
function _etRenderResult(mountEl, { scores, profile }) {
  mountEl.innerHTML = "";
  const { type, description, strengths, summary, charm, attracted } = profile;

  // 커버
  const cover = document.createElement("div");
  cover.className = "mbti-cover et-cover";
  const emoji = document.createElement("div");
  emoji.className = "mbti-emoji";
  emoji.setAttribute("aria-hidden", "true");
  emoji.textContent = type.emoji;
  const titleEl = document.createElement("h1");
  titleEl.className = "mbti-title et-cover-title";
  titleEl.textContent = type.title;
  cover.append(emoji, titleEl);
  if (summary) {
    const sumEl = document.createElement("p");
    sumEl.className = "mbti-summary";
    sumEl.textContent = summary;
    cover.appendChild(sumEl);
  }
  // 커버 안 스펙트럼 바 2개
  const coverBars = document.createElement("div");
  cover.appendChild(coverBars);
  _renderSpectrumBars(coverBars, scores, false);
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

  // 강점
  if (strengths.length) {
    const strSec = document.createElement("div");
    strSec.className = "mbti-section";
    const sh = document.createElement("h3");
    sh.className = "sec-head";
    sh.textContent = "강점";
    const card = document.createElement("div");
    card.className = "mbti-card mbti-card--strength";
    const ul = document.createElement("ul");
    strengths.forEach((s) => {
      const li = document.createElement("li");
      li.textContent = s;
      ul.appendChild(li);
    });
    card.appendChild(ul);
    strSec.append(sh, card);
    mountEl.appendChild(strSec);
  }

  // 매력 포인트
  if (charm) {
    const charmSec = document.createElement("div");
    charmSec.className = "mbti-section";
    const ch = document.createElement("h3");
    ch.className = "sec-head";
    ch.textContent = "매력 포인트";
    const box = document.createElement("div");
    box.className = "et-highlight et-highlight--charm";
    const p = document.createElement("p");
    p.textContent = charm;
    box.appendChild(p);
    charmSec.append(ch, box);
    mountEl.appendChild(charmSec);
  }

  // 끌리는 상대
  if (attracted) {
    const attrSec = document.createElement("div");
    attrSec.className = "mbti-section";
    const ah = document.createElement("h3");
    ah.className = "sec-head";
    ah.textContent = "끌리는 상대";
    const box = document.createElement("div");
    box.className = "et-highlight et-highlight--attracted";
    const p = document.createElement("p");
    p.textContent = attracted;
    box.appendChild(p);
    attrSec.append(ah, box);
    mountEl.appendChild(attrSec);
  }

  // 안내
  const foot = document.createElement("div");
  foot.className = "mbti-section";
  const disc = document.createElement("p");
  disc.className = "mbti-disclaimer";
  disc.textContent =
    "재미로 보는 성향 밈 테스트입니다. 성별·호르몬과 무관한 자기 이해용 참고 틀로 활용하시길 권합니다.";
  foot.appendChild(disc);
  mountEl.appendChild(foot);
}

/* ---------- 모듈 인터페이스 ---------- */
const ET_MODULE = {
  meta: {
    id: "egen-teto",
    name: "에겐·테토 기질 테스트",
    tagline: "주도냐 수용이냐 — 나의 기질 성향",
    icon: "⚡",
    scaleSize: 5,
    scaleLabels: ET_SCALE.map((s) => s.label),
    introLead:
      "성별과 무관한 ‘기질 성향’ 테스트예요. 20문항으로 테토(주도)–에겐(수용), 외향–내향 성향을 읽어드려요.",
    durationMin: 3,
    sampleQuestion: "갈등이 생기면 피하지 않고 정면으로 부딪힌다.",
  },
  questions: ET_QUESTIONS,
  score(answers) {
    return _etScore(answers);
  },
  buildProfile(scores) {
    return _etBuildProfile(scores);
  },
  renderResult(mountEl, ctx) {
    _etRenderResult(mountEl, ctx);
  },
  renderSummaryViz(container, scores) {
    _renderSpectrumBars(container, scores, true);
  },
  renderCompareViz(container, datasets) {
    _renderCompareSpectrum(container, datasets);
  },
};
