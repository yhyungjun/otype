// 성격 유형 판정 + 종합 분석 생성
// - 유형: 중앙(50)에서 가장 크게 벗어난 특성을 핵심축으로, 방향(high/low)에 따라 유형명 부여
// - 유형 코드는 핵심축 특성 문자(O/C/E/A/N), 균형형은 M

function levelOf(pct) {
  if (pct >= 60) return "H";
  if (pct <= 40) return "L";
  return "M";
}

// 유형 정의 — 핵심축 × 방향
const TYPES = {
  O: {
    high: { title: "The Visionary", code: "유형 O", role: "비전가", core: "O",
      intro: "새로운 아이디어와 가능성에 이끌리는 창의적 탐험가입니다. 남들이 보지 못한 연결을 발견하고, 익숙한 틀을 넘어 실험하기를 즐깁니다.",
      summary: "호기심으로 세상을 넓게 읽고 새로운 길을 여는 탐험형." },
    low: { title: "The Pragmatist", code: "유형 O", role: "실용가", core: "O",
      intro: "검증된 방식과 현실 감각을 신뢰하는 실용주의자입니다. 화려한 아이디어보다 확실하게 작동하는 해법에 집중합니다.",
      summary: "검증된 방식으로 확실한 결과를 만드는 현실형." },
  },
  C: {
    high: { title: "The Executor", code: "유형 C", role: "실행가", core: "C",
      intro: "높은 자기 훈련과 긴 시간 지평, 그리고 '하겠다고 말한 것을 실제로 해내는' 강력한 습관을 지닌 유형입니다. 화려하지 않아도 끝까지 완수하는 신뢰가 가장 큰 무기입니다.",
      summary: "스스로 세운 기준을 꾸준히 지켜내는 믿음직한 실행형." },
    low: { title: "The Free Spirit", code: "유형 C", role: "자유인", core: "C",
      intro: "틀에 얽매이지 않고 흐름을 따라 가볍게 움직이는 자유인입니다. 즉흥적이고 유연해 변화하는 상황에 빠르게 적응합니다.",
      summary: "틀에 매이지 않고 유연하게 흐르는 자유형." },
  },
  E: {
    high: { title: "The Connector", code: "유형 E", role: "연결자", core: "E",
      intro: "사람과 사람을 잇고 어디서든 분위기를 데우는 에너지의 중심입니다. 적극적으로 나서 관계를 만들고 함께할 때 힘을 냅니다.",
      summary: "사람들을 이어 활력을 만드는 연결형." },
    low: { title: "The Thinker", code: "유형 E", role: "사색가", core: "E",
      intro: "조용히 안으로 파고들어 깊이 사유하는 사색가입니다. 혼자만의 시간 속에서 생각을 정제하고 신중하게 움직입니다.",
      summary: "조용한 깊이로 파고드는 사색형." },
  },
  A: {
    high: { title: "The Harmonizer", code: "유형 A", role: "조율가", core: "A",
      intro: "따뜻함과 배려로 사람들 사이의 긴장을 풀어내는 조율가입니다. 조화를 소중히 여기고 협력 속에서 최선을 끌어냅니다.",
      summary: "배려로 조화를 이끄는 따뜻한 조율형." },
    low: { title: "The Challenger", code: "유형 A", role: "도전가", core: "A",
      intro: "솔직하고 독립적이며 자기 소신이 분명한 도전가입니다. 불편한 진실도 마주하고 논리로 문제를 정면 돌파합니다.",
      summary: "소신과 논리로 정면 돌파하는 도전형." },
  },
  N: {
    high: { title: "The Sentinel", code: "유형 N", role: "감지자", core: "N",
      intro: "위험과 감정의 미세한 신호를 예민하게 포착하는 감지자입니다. 섬세한 촉으로 남들이 놓치는 것을 먼저 알아챕니다.",
      summary: "미세한 신호를 먼저 감지하는 섬세형." },
    low: { title: "The Anchor", code: "유형 N", role: "안정가", core: "N",
      intro: "어떤 압박 속에서도 흔들리지 않는 정서적 닻입니다. 침착하게 중심을 잡고 빠르게 회복하며 주변에 안정감을 줍니다.",
      summary: "흔들림 없이 중심을 잡는 안정형." },
  },
  M: {
    title: "The Balancer", code: "유형 M", role: "조화인", core: null,
    intro: "어느 한쪽으로 치우치지 않고 여러 특성이 고르게 균형을 이루는 유형입니다. 상황에 맞춰 다른 모습을 꺼내 쓰는 적응력이 강점입니다.",
    summary: "치우침 없이 균형을 잡는 적응형.",
  },
};

// 핵심축 우선순위(동점 시) — PDF 예시(성실성 우선)에 맞춤
const CORE_PRIORITY = ["C", "O", "E", "A", "N"];
const STRONG_THRESHOLD = 12; // |pct-50| 가 이보다 작으면 균형형

function pickType(pct) {
  const devs = Object.keys(pct).map((k) => ({ k, dev: pct[k] - 50 }));
  const maxAbs = Math.max(...devs.map((d) => Math.abs(d.dev)));
  if (maxAbs < STRONG_THRESHOLD) return TYPES.M;

  const contenders = devs.filter((d) => Math.abs(d.dev) >= maxAbs - 4); // 근소 동점 묶기
  contenders.sort((a, b) => CORE_PRIORITY.indexOf(a.k) - CORE_PRIORITY.indexOf(b.k));
  const core = contenders[0];
  const dir = core.dev > 0 ? "high" : "low";
  return TYPES[core.k][dir];
}

// 핵심축을 뺀 나머지 중 두드러진 특성을 문장으로 (커버 소개 보강용)
function secondaryClause(FACTORS, levels, coreKey) {
  const label = (k, lv) => {
    if (k === "N") return lv === "H" ? "예민한 감수성" : "정서적 안정감";
    return (lv === "H" ? "높은 " : "낮은 ") + FACTORS[k].name;
  };
  const notable = [];
  ["O", "C", "E", "A", "N"].forEach((k) => {
    if (k === coreKey) return;
    if (levels[k] === "H" || (k === "N" && levels[k] === "L")) notable.push(label(k, levels[k]));
  });
  if (!notable.length) return "";
  const joined = notable.slice(0, 2).join("과 ");
  return ` 여기에 ${joined}이 더해져 한층 입체적인 프로필을 이룹니다.`;
}

// 강점 목록
function buildStrengths(FACTORS, levels, type) {
  const out = [];
  if (levels.O === "H") out.push(FACTORS.O.strength.high);
  if (levels.C === "H") out.push(FACTORS.C.strength.high);
  if (levels.E === "H") out.push(FACTORS.E.strength.high);
  if (levels.A === "H") out.push(FACTORS.A.strength.high);
  if (levels.N === "L") out.push(FACTORS.N.strength.low);
  if (out.length < 2) {
    out.push("여러 특성이 균형 잡혀 상황에 맞춰 유연하게 대응하는 적응력");
  }
  return out;
}

// 블라인드 스팟 목록 — 각 특성 레벨별 주의점 중 두드러진 것 우선 3개
function buildBlindspots(FACTORS, pct, levels) {
  const items = ["O", "C", "E", "A", "N"].map((k) => {
    const lv = levels[k];
    const bs = FACTORS[k].blindspot[lv === "H" ? "high" : lv === "L" ? "low" : "mid"];
    const prefix =
      k === "N"
        ? lv === "H" ? "높은 신경성 → " : lv === "L" ? "낮은 신경성 → " : "중간 신경성 → "
        : (lv === "H" ? "높은 " : lv === "L" ? "낮은 " : "중간 ") + FACTORS[k].name + " → ";
    return { notable: lv !== "M", text: prefix + bs };
  });
  items.sort((a, b) => Number(b.notable) - Number(a.notable));
  return items.slice(0, 3).map((i) => i.text);
}

function buildProfile(FACTORS, pct) {
  const levels = {};
  Object.keys(pct).forEach((k) => (levels[k] = levelOf(pct[k])));
  const type = pickType(pct);
  const intro = type.intro + (type.core ? secondaryClause(FACTORS, levels, type.core) : "");
  return {
    type,
    levels,
    intro,
    strengths: buildStrengths(FACTORS, levels, type),
    blindspots: buildBlindspots(FACTORS, pct, levels),
    summary: type.summary,
  };
}
