// "진짜 MBTI 찾기" — 알던 MBTI(페르소나) vs 검사가 찾은 진짜 MBTI를 비교하는 모듈.
// 공용 셸(test.html 러너, share/dashboard/me)이 REAL_MBTI_MODULE.meta/questions/score/
// buildProfile/renderResult/renderSummaryViz/renderCompareViz 로 소비한다.
//
// 로드 순서 의존성: mbti/questions.js → mbti/types.js → mbti/module.js →
//   real-mbti/stories.js → real-mbti/module.js
//   재사용(전역): MBTI_AXES, MBTI_QUESTIONS, MBTI_TYPES, MBTI_SCALE,
//                 _mbtiScore, _renderDichBars, _renderCompareDich, REAL_STORIES
//
// 선입력(prelude): 사용자가 "알고 있다고 생각하는" MBTI를 먼저 받아
//   러너가 scores.known 으로 병합 → 결과에서 진짜 검사 결과와 비교한다.

/* ---------- 상수 ---------- */
// 켈시(Keirsey) 기질 4분류 — 두 번째 후보 유형의 "추구" 방향을 한 단어로.
const RM_KEIRSEY = { NT: "전략적", NF: "이상적", SJ: "체계적", SP: "실전적" };

const RM_ALL16 = [
  "INTJ", "INTP", "ENTJ", "ENTP",
  "INFJ", "INFP", "ENFJ", "ENFP",
  "ISTJ", "ISFJ", "ESTJ", "ESFJ",
  "ISTP", "ISFP", "ESTP", "ESFP",
];

const RM_AXIS_ORDER = ["EI", "SN", "TF", "JP"];
const RM_MIDPOINT = 50; // 50% 이상이면 두 번째 글자 쪽으로 판정
const RM_BANBAN_MARGIN = 10; // 중앙(50%)에서 ±10 이내면 "반반"

// 축 글자별 한글 라벨 (letter 타일·바 표시용)
const RM_LETTER_LABEL = {
  E: "외향", I: "내향",
  S: "감각", N: "직관",
  T: "사고", F: "감정",
  J: "판단", P: "인식",
};

/* ---------- 헬퍼 ---------- */
// 코드의 기질(NT/NF/SJ/SP) 판정: N이면 F로 NF/NT, S이면 J로 SJ/SP.
function _rmTemperament(code) {
  const N = code[1] === "N";
  const F = code[2] === "F";
  const J = code[3] === "J";
  if (N) return F ? "NF" : "NT";
  return J ? "SJ" : "SP";
}

// 특정 코드에 대한 사용자 "동의도"(0~100): 각 축에서 그 코드가 가리키는 글자 쪽 % 평균.
// scores[axis] 는 "두 번째 글자(I/N/F/P)" 쪽 %.
function _rmAgree(scores, code) {
  let sum = 0;
  RM_AXIS_ORDER.forEach((a, i) => {
    const pct = scores[a] ?? RM_MIDPOINT;
    const isSecond = code[i] === MBTI_AXES[a][1];
    sum += isSecond ? pct : 100 - pct;
  });
  return sum / 4;
}

/* ---------- 프로필 ---------- */
// scores: { EI, SN, TF, JP }(2번째 글자 쪽 %) + known(선입력 코드 or "UNKNOWN").
function _rmBuildProfile(scores) {
  // 진짜 유형 코드 (축별 50% 기준)
  const letters = {};
  RM_AXIS_ORDER.forEach((a) => {
    letters[a] = scores[a] >= RM_MIDPOINT ? MBTI_AXES[a][1] : MBTI_AXES[a][0];
  });
  const realCode = letters.EI + letters.SN + letters.TF + letters.JP;

  // 16유형 전체를 동의도 내림차순으로 정렬
  const fullRanking = RM_ALL16
    .map((c) => ({ code: c, raw: _rmAgree(scores, c) }))
    .sort((a, b) => b.raw - a.raw);
  const top = fullRanking[0].raw || 1; // 0 분모 방지
  const ranking = fullRanking
    .slice(0, 4)
    .map((r) => ({ code: r.code, pct: Math.round((r.raw / top) * 100) }));
  const second = ranking[1];

  // 반반: 중앙에서 ±RM_BANBAN_MARGIN 이내인 축 키 목록
  const banban = RM_AXIS_ORDER.filter(
    (a) => Math.abs((scores[a] ?? RM_MIDPOINT) - RM_MIDPOINT) <= RM_BANBAN_MARGIN
  );

  // 추구: 2위 후보의 기질로 "본질(진짜 유형) × 추구(기질)" 표현
  const group = _rmTemperament(second.code);
  const realTitle = (MBTI_TYPES[realCode] && MBTI_TYPES[realCode].title) || realCode;
  const pursuit = {
    group,
    phrase: `같은 ${realTitle} 중 가장 ${RM_KEIRSEY[group]}(${group})인 유형`,
  };

  // 알던 MBTI: 전체 16 순위 기준으로 몇 위인지
  let known = null;
  if (scores.known && scores.known !== "UNKNOWN") {
    const idx = fullRanking.findIndex((r) => r.code === scores.known);
    known = { code: scores.known, rank: idx >= 0 ? idx + 1 : null };
  }

  const t = MBTI_TYPES[realCode] || {};
  const type = {
    code: realCode,
    title: t.title || realCode,
    role: t.title || realCode,
    emoji: t.emoji || "🕵️",
  };

  return {
    type,
    letters,
    scores,
    ranking, // [{code, pct} × 4], 1위 pct=100
    second: { code: second.code, pct: second.pct },
    banban, // 축 키 배열
    pursuit, // { group, phrase }
    known, // { code, rank } | null
    story: REAL_STORIES[realCode] || null,
  };
}

/* ---------- 결과 렌더 ---------- */
// mountEl(#result-mount, .result-view 안): 다크 카드 마크업을 직접 생성.
// 텍스트는 textContent 로 삽입(외부 데이터 안전 삽입). KKTI 순서로 구성.
function _rmRenderResult(mountEl, { scores, profile }) {
  mountEl.innerHTML = "";
  const { type, ranking, second, banban, pursuit, known, story } = profile;
  const realCode = type.code;

  const section = (mod) => {
    const el = document.createElement("div");
    el.className = "rm-section" + (mod ? " " + mod : "");
    return el;
  };
  const head = (text) => {
    const h = document.createElement("h3");
    h.className = "sec-head";
    h.textContent = text;
    return h;
  };

  /* 1) 알던 vs 진짜 (커버) */
  const cover = section("rm-cover");
  cover.appendChild(head("알던 MBTI vs 진짜 MBTI"));

  const vs = document.createElement("div");
  vs.className = "rm-vs";

  // 알던 쪽
  const knownBox = document.createElement("div");
  knownBox.className = "rm-vs-col";
  const knownLabel = document.createElement("p");
  knownLabel.className = "rm-vs-label";
  knownLabel.textContent = "당신이 알고 있는 MBTI";
  const knownCode = document.createElement("p");
  knownCode.className = "rm-vs-code rm-vs-code--known";
  knownCode.textContent = known ? known.code : "미입력";
  knownBox.append(knownLabel, knownCode);

  const arrow = document.createElement("div");
  arrow.className = "rm-vs-arrow";
  arrow.setAttribute("aria-hidden", "true");
  arrow.textContent = "→";

  // 진짜 쪽 — 4개 letter 타일 (알던 것과 다른 글자는 강조)
  const realBox = document.createElement("div");
  realBox.className = "rm-vs-col";
  const realLabel = document.createElement("p");
  realLabel.className = "rm-vs-label";
  realLabel.textContent = "검사가 찾은 진짜";
  const tiles = document.createElement("div");
  tiles.className = "rm-tiles";
  realCode.split("").forEach((ch, i) => {
    const tile = document.createElement("span");
    const isDiff = known && known.code[i] !== ch;
    tile.className = "rm-tile" + (isDiff ? " rm-tile--diff" : "");
    tile.textContent = ch;
    tiles.appendChild(tile);
  });
  realBox.append(realLabel, tiles);

  vs.append(knownBox, arrow, realBox);
  cover.appendChild(vs);

  const rankLine = document.createElement("p");
  rankLine.className = "rm-rankline";
  rankLine.textContent = `1위 ${realCode} 100% · 2위 ${second.code} ${second.pct}%`;
  cover.appendChild(rankLine);
  mountEl.appendChild(cover);

  /* 2) 본질 × 추구 */
  const essence = section();
  essence.appendChild(head("본질 × 추구"));
  const essLine = document.createElement("p");
  essLine.className = "rm-essence-code";
  essLine.textContent = `${realCode} × ${pursuit.group}`;
  const essPhrase = document.createElement("p");
  essPhrase.className = "rm-essence-phrase";
  essPhrase.textContent = pursuit.phrase;
  essence.append(essLine, essPhrase);
  mountEl.appendChild(essence);

  /* 3) 선호도 강도 (이분 바 + 반반 배지) */
  const pref = section();
  pref.appendChild(head("선호도 강도"));
  const bars = document.createElement("div");
  _renderDichBars(bars, scores, false);
  pref.appendChild(bars);
  if (banban.length) {
    const banRow = document.createElement("div");
    banRow.className = "rm-banban-row";
    banban.forEach((axis) => {
      const [left, right] = MBTI_AXES[axis];
      const badge = document.createElement("span");
      badge.className = "rm-banban-badge";
      badge.textContent = `${left}·${right} 반반`;
      banRow.appendChild(badge);
    });
    pref.appendChild(banRow);
  }
  mountEl.appendChild(pref);

  /* 4) 나와 가까운 유형 TOP4 */
  const near = section();
  near.appendChild(head("나와 가까운 유형 TOP 4"));
  const list = document.createElement("div");
  list.className = "rm-rank-list";
  ranking.forEach((r, i) => {
    const row = document.createElement("div");
    row.className = "rm-rank-row" + (i === 0 ? " rm-rank-row--top" : "");

    const rank = document.createElement("span");
    rank.className = "rm-rank-num";
    rank.textContent = String(i + 1);

    const code = document.createElement("span");
    code.className = "rm-rank-code";
    code.textContent = r.code;

    const pct = document.createElement("span");
    pct.className = "rm-rank-pct";
    pct.textContent = r.pct + "%";

    const badges = document.createElement("span");
    badges.className = "rm-rank-badges";
    if (i === 0) {
      const me = document.createElement("span");
      me.className = "rm-rank-badge rm-rank-badge--me";
      me.textContent = "ME";
      badges.appendChild(me);
    }
    if (known && r.code === known.code) {
      const kb = document.createElement("span");
      kb.className = "rm-rank-badge rm-rank-badge--known";
      kb.textContent = "기존";
      badges.appendChild(kb);
    }

    row.append(rank, code, pct, badges);
    list.appendChild(row);
  });
  near.appendChild(list);
  if (known) {
    const note = document.createElement("p");
    note.className = "rm-rank-note";
    note.textContent = known.rank
      ? `알고 있던 ${known.code}은 ${known.rank}위!`
      : `알고 있던 ${known.code}은 순위 밖이에요.`;
    near.appendChild(note);
  }
  mountEl.appendChild(near);

  /* 5) 당신의 이야기 (4비트) */
  if (story) {
    const storySec = section();
    storySec.appendChild(head("당신의 이야기"));
    const beats = [
      { icon: "👁", text: story.you },
      { icon: "🔎", text: story.test },
      { icon: "💡", text: story.truth },
      { icon: "❤️", text: story.ok },
    ];
    beats.forEach((b) => {
      const beat = document.createElement("div");
      beat.className = "rm-beat";
      const ic = document.createElement("span");
      ic.className = "rm-beat-ic";
      ic.setAttribute("aria-hidden", "true");
      ic.textContent = b.icon;
      const p = document.createElement("p");
      p.className = "rm-beat-text";
      p.textContent = b.text;
      beat.append(ic, p);
      storySec.appendChild(beat);
    });
    mountEl.appendChild(storySec);
  }

  /* 안내 */
  const foot = section();
  const disc = document.createElement("p");
  disc.className = "mbti-disclaimer";
  disc.textContent =
    "자기보고식 검사 결과인 만큼 절대적 정의가 아니라, 알던 나와 진짜 나를 견주어 보는 참고 틀로 활용하시길 권합니다.";
  foot.appendChild(disc);
  mountEl.appendChild(foot);
}

/* ---------- 요약 viz (공유·대시보드·마이페이지) ---------- */
function _rmRenderSummaryViz(container, scores) {
  container.innerHTML = "";
  const bars = document.createElement("div");
  _renderDichBars(bars, scores, true);
  container.appendChild(bars);
  if (scores.known && scores.known !== "UNKNOWN") {
    const badge = document.createElement("span");
    badge.className = "rm-known-mini";
    badge.textContent = `알던 것 ${scores.known}`;
    container.appendChild(badge);
  }
}

/* ---------- 디스커버 카드 (인트로 "검사 후 무엇을 알 수 있나요?") ---------- */
const RM_DISCOVER_CARDS = [
  {
    emoji: "🎭",
    title: "페르소나 vs 진짜",
    desc: "내가 알던 MBTI와 검사가 찾은 진짜를 나란히 비교해요.",
    preview(el) {
      const p = document.createElement("p");
      p.className = "mbti-dcp-line";
      p.textContent = "예: 알던 ENTJ → 진짜 ESTJ, 어떤 글자가 달랐는지 짚어줘요.";
      el.appendChild(p);
    },
  },
  {
    emoji: "🕵️",
    title: "진짜 유형",
    desc: "32문항으로 네 지표를 다시 재어 진짜 유형을 도출해요.",
    preview(el) {
      const p = document.createElement("p");
      p.className = "mbti-dcp-line";
      p.textContent = "1위 유형과 근소한 2위 후보까지 함께 알려드려요.";
      el.appendChild(p);
    },
  },
  {
    emoji: "⚖️",
    title: "반반 지표",
    desc: "50%에 가까워 어느 쪽이라 단정하기 어려운 축을 짚어줘요.",
    preview(el) {
      _renderDichBars(el, { EI: 48, SN: 71, TF: 52, JP: 63 }, true);
    },
  },
  {
    emoji: "🧭",
    title: "가까운 유형 TOP 4",
    desc: "나와 성향이 가까운 유형을 순위로 보여줘요.",
    preview(el) {
      const p = document.createElement("p");
      p.className = "mbti-dcp-line";
      p.textContent = "알고 있던 유형이 몇 위인지도 함께 확인할 수 있어요.";
      el.appendChild(p);
    },
  },
  {
    emoji: "📖",
    title: "당신의 이야기",
    desc: "페르소나에서 진짜 나까지, 네 장면의 짧은 서사를 건네요.",
    preview(el) {
      const p = document.createElement("p");
      p.className = "mbti-dcp-line";
      p.textContent = "👁 알던 나 · 🔎 간극 · 💡 진짜 나 · ❤️ 위로 순으로 읽어드려요.";
      el.appendChild(p);
    },
  },
];

function _rmRenderDiscoverPreviews(grid) {
  RM_DISCOVER_CARDS.forEach((c) => {
    const details = document.createElement("details");
    details.className = "discover-card";

    const summary = document.createElement("summary");
    const icWrap = document.createElement("span");
    icWrap.className = "ic-wrap";
    icWrap.textContent = c.emoji;

    const h3 = document.createElement("h3");
    h3.textContent = c.title;
    const p = document.createElement("p");
    p.textContent = c.desc;
    summary.append(icWrap, h3, p);

    const preview = document.createElement("div");
    preview.className = "dc-preview";
    c.preview(preview);

    details.append(summary, preview);
    grid.appendChild(details);
  });
}

/* ---------- 모듈 인터페이스 ---------- */
const REAL_MBTI_MODULE = {
  meta: {
    id: "real-mbti",
    name: "진짜 MBTI 찾기",
    tagline: "알던 MBTI 말고, 진짜 나를 찾다",
    icon: "🕵️",
    scaleSize: 5,
    scaleLabels: MBTI_SCALE.map((s) => s.label),
    introLead:
      "내가 알고 있다고 믿던 MBTI(페르소나)와, 32문항 검사가 짚어낸 '진짜' 유형을 나란히 비교해 드려요. 어느 글자에서 간극이 생겼는지, 나와 가까운 유형은 무엇인지 확인하고, 마지막엔 당신만의 짧은 이야기를 건넵니다.",
    durationMin: 5,
    sampleQuestion: "처음 보는 사람에게도 먼저 말을 거는 편이다.",
    faq: [
      { q: "‘진짜 MBTI 찾기’는 무엇인가요?", a: "먼저 스스로 알고 있다고 생각하는 MBTI를 입력하고, 32문항 검사를 마치면 검사가 찾은 진짜 유형과 나란히 비교해 주는 검사입니다." },
      { q: "공식 MBTI® 검사인가요?", a: "아니요. MBTI가 대중화한 4지표·16유형 방식을 참고해 자체 제작한 문항으로 만든 검사이며, 공식 MBTI® 검사와는 별개입니다." },
      { q: "알던 MBTI를 모르면 못 하나요?", a: "괜찮아요. ‘잘 모르겠어요’를 선택하면 비교 없이 진짜 유형과 가까운 유형, 당신의 이야기를 그대로 보여드립니다." },
    ],
    prelude: {
      key: "known",
      title: "당신이 알고 있는 MBTI는?",
      hint: "검사가 찾은 ‘진짜’와 비교해 드려요",
      options: RM_ALL16.map((c) => ({ value: c, label: c })),
      allowSkip: { value: "UNKNOWN", label: "잘 모르겠어요" },
    },
  },
  questions: MBTI_QUESTIONS,
  score(answers) {
    return _mbtiScore(answers);
  },
  buildProfile(scores) {
    return _rmBuildProfile(scores);
  },
  renderResult(mountEl, ctx) {
    _rmRenderResult(mountEl, ctx);
  },
  renderSummaryViz(container, scores) {
    _rmRenderSummaryViz(container, scores);
  },
  renderCompareViz(container, datasets) {
    _renderCompareDich(container, datasets);
  },
  renderDiscoverPreviews(grid) {
    _rmRenderDiscoverPreviews(grid);
  },
};
