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

// 표본 비교용 규범 앵커 — 실제 IPIP 모집단 규범이 아닌 근사 기준값입니다.
// mean/sd 는 0–100 정규화 척도 위의 추정치이며, 필요에 따라 조정 가능합니다.
const NORMS = {
  O: { mean: 63, sd: 16 },
  C: { mean: 61, sd: 17 },
  E: { mean: 52, sd: 19 },
  A: { mean: 68, sd: 15 },
  N: { mean: 49, sd: 19 },
};

// Abramowitz-Stegun 근사를 이용한 표준정규 누적분포함수
function normalCdf(z) {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989422804014327 * Math.exp(-z * z / 2);
  const p = d * t * (0.319381530 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  return z > 0 ? 1 - p : p;
}

// 표본 비교 데이터 — 각 특성의 백분위 및 상위 % 계산
// 반환: ["O","C","E","A","N"] 고정 순서의 배열
function buildNormComparison(pct) {
  return ["O", "C", "E", "A", "N"].map((key) => {
    const z = (pct[key] - NORMS[key].mean) / NORMS[key].sd;
    const raw = Math.round(normalCdf(z) * 100);
    const percentile = Math.min(99, Math.max(1, raw));
    const topPercent = 100 - percentile;
    return { key, pct: pct[key], percentile, topPercent };
  });
}

// 성향 기반 커리어 추천 — 두드러진 특성에서 역할 태그를 수집해 상위 3–5개 반환
function buildCareer(FACTORS, levels) {
  const roleMap = {
    O: { H: ["기획", "R&D", "콘텐츠", "디자인"], L: ["운영", "품질관리", "회계"] },
    C: { H: ["PM", "프로젝트관리", "재무", "엔지니어링"], L: ["크리에이티브", "초기 스타트업"] },
    E: { H: ["영업", "마케팅", "HR", "PR"], L: ["연구", "분석", "개발", "집필"] },
    A: { H: ["상담", "CS", "교육", "조율"], L: ["협상", "감사", "비평"] },
    N: { L: ["위기관리", "리더십", "고압 환경"], H: ["리스크 감지", "품질검수", "안전관리"] },
  };

  const collected = [];
  ["O", "C", "E", "A", "N"].forEach((k) => {
    const lv = levels[k];
    const tags = roleMap[k][lv];
    if (tags) collected.push(...tags);
  });

  // 중복 제거 후 상위 3–5개 유지
  const deduped = [...new Set(collected)];
  const roles = deduped.length > 0 ? deduped.slice(0, 5) : ["기획·운영 전반", "조율형 역할"];

  // 가장 두드러진 1–2개 특성을 note 문장에 인용
  const notable = ["O", "C", "E", "A", "N"].filter((k) => levels[k] !== "M");
  let note;
  if (notable.length === 0) {
    note = "여러 특성이 고르게 균형을 이루고 있어 기획·운영 전반에서 유연하게 강점을 발휘할 수 있습니다.";
  } else {
    const top = notable.slice(0, 2).map((k) => {
      if (k === "N") return levels[k] === "L" ? "정서적 안정감" : "예민한 감수성";
      return (levels[k] === "H" ? "높은 " : "낮은 ") + FACTORS[k].name;
    });
    const traitStr = top.join("과 ");
    const roleStr = roles.slice(0, 2).join(", ");
    note = `${traitStr}이 두드러져 ${roleStr} 같은 역할에서 강점을 발휘합니다. 이는 성향 기반 추천으로, 개인 경험과 맥락을 함께 고려해 보세요.`;
  }

  return { roles, note };
}

// 협업 스타일 — 팀 역할·소통·팁을 담은 3개 불렛 반환
function buildCollab(FACTORS, levels) {
  // 균형형 폴백: 모든 특성이 M인 경우
  const allM = ["O", "C", "E", "A", "N"].every((k) => levels[k] === "M");
  if (allM) {
    return [
      "팀 역할: 상황에 맞춰 유연하게 여러 역할을 오가는 균형형 팀원입니다.",
      "소통 스타일: 주도와 경청 사이 균형을 유지하며 상황에 따라 적절한 방식을 선택합니다.",
      "협업 팁: 어느 한 역할에 안주하지 말고 상황별 강점을 의식적으로 꺼내쓰세요.",
    ];
  }

  // 불렛 1: 팀에서의 역할 — H 또는 L인 특성 중 CORE_PRIORITY 순서로 tiebreak
  const notable = CORE_PRIORITY.filter((k) => levels[k] === "H" || levels[k] === "L");
  // CORE_PRIORITY 순서로 필터했으므로 첫 번째가 tiebreak 기준 dominant
  const dominant = notable.length > 0 ? notable[0] : CORE_PRIORITY[0];
  const dominantLv = levels[dominant];

  const roleDesc = {
    O: { H: "새로운 아이디어를 제안하고 가능성을 열어주는 혁신가 역할을 자연스럽게 맡습니다", L: "검증된 방법으로 팀의 실행력을 뒷받침하는 실무형 역할이 잘 맞습니다" },
    C: { H: "계획을 체계화하고 일정을 관리하는 신뢰할 수 있는 실행자 역할을 합니다", L: "유연한 사고로 변화에 빠르게 반응하는 적응형 팀원 역할을 합니다" },
    E: { H: "적극적으로 소통하며 팀 분위기를 이끄는 에너지 공급원 역할을 합니다", L: "깊이 있는 분석과 신중한 판단으로 팀의 균형을 잡아주는 역할을 합니다" },
    A: { H: "팀 내 갈등을 조율하고 구성원들의 마음을 모아주는 화합형 역할을 합니다", L: "솔직한 피드백으로 팀이 더 나은 방향을 찾도록 이끄는 비판적 사고자 역할을 합니다" },
    N: { H: "위험 신호를 미리 감지해 팀이 대비할 수 있도록 돕는 리스크 감지자 역할을 합니다", L: "어떤 압박 상황에서도 팀의 정서적 닻이 되어주는 안정감 있는 역할을 합니다", M: "상황에 따라 다양한 역할을 유연하게 수행하는 적응형 팀원입니다" },
  };
  const bullet1 = "팀 역할: " + ((roleDesc[dominant] && roleDesc[dominant][dominantLv]) || roleDesc.N.M);

  // 불렛 2: 소통 스타일 — E × A 조합
  const eHigh = levels.E === "H";
  const eLow = levels.E === "L";
  const aHigh = levels.A === "H";
  const aLow = levels.A === "L";

  let commStyle;
  if (eHigh && aHigh) commStyle = "적극적으로 먼저 다가가면서도 상대의 감정을 세심하게 살피는 따뜻한 주도형 소통을 합니다";
  else if (eHigh && aLow) commStyle = "주도적으로 의견을 내고 직언도 서슴지 않는 추진형 소통을 합니다";
  else if (eLow && aHigh) commStyle = "말보다 경청을 앞세우며 상대의 감정을 존중하는 배려형 소통을 합니다";
  else if (eLow && aLow) commStyle = "신중하게 논리를 정리한 뒤 핵심만 명확하게 전달하는 분석형 소통을 합니다";
  else commStyle = "상황에 맞춰 적극적인 소통과 신중한 경청을 균형 있게 활용합니다";
  const bullet2 = "소통 스타일: " + commStyle + ".";

  // 불렛 3: 협업 팁 — 가장 두드러진 블라인드스팟 영역 기반
  const tipMap = {
    O: { H: "아이디어를 끝까지 실행으로 이어가는 마무리 루틴을 만들어두면 협업 성과가 한층 높아집니다", L: "팀원의 새로운 제안에 열린 자세로 탐색 시간을 함께 주면 시너지를 키울 수 있습니다" },
    C: { H: "완벽을 추구하다 위임이 어려워질 수 있으니, 팀원에게 믿고 맡기는 연습이 협업 효율을 높입니다", L: "마감과 진행 상황을 공유하는 짧은 체크인을 습관화하면 팀 신뢰를 높일 수 있습니다" },
    E: { H: "먼저 말하기 전에 한 박자 멈추고 팀원의 의견을 이끌어내는 질문을 더하면 더 풍부한 협업이 됩니다", L: "기여와 의견을 적극적으로 표현해야 팀이 당신의 강점을 충분히 활용할 수 있습니다" },
    A: { H: "NO 라고 말하는 연습을 통해 자신의 역량을 지켜야 팀 전체에도 지속 가능한 기여가 됩니다", L: "피드백을 줄 때 상대의 감정을 먼저 인정한 뒤 논리를 제시하면 메시지가 더 잘 전달됩니다" },
    N: { H: "걱정을 팀과 공유할 때 해결 방향과 함께 제시하면 불안보다 대비 신호로 받아들여질 수 있습니다", L: "팀원의 감정 신호에 귀 기울이는 시간을 의식적으로 가지면 관계의 깊이가 더해집니다" },
  };
  const tipLv = levels[dominant];
  const tipText = (tipMap[dominant] && tipMap[dominant][tipLv]) ||
    "서로의 강점을 확인하고 역할을 명확히 분담하면 팀 전체의 성과를 높일 수 있습니다";
  const bullet3 = "협업 팁: " + tipText + ".";

  return [bullet1, bullet2, bullet3];
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
    career: buildCareer(FACTORS, levels),
    collab: buildCollab(FACTORS, levels),
    norms: buildNormComparison(pct),
  };
}
