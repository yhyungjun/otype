// Big Five (OCEAN) — IPIP 50-item Big-Five Factor Markers (Goldberg, public domain)
// 각 문항: { text, factor, keyed } — keyed "+" 는 정채점, "-" 는 역채점(6 - 값)
// factor: O(개방성) C(성실성) E(외향성) A(우호성) N(신경성)
// english 는 JobCannon 프로필 브랜드 명칭(Discipline·Empathy·Sensitivity)을 따른다.

const FACTORS = {
  O: {
    key: "O",
    name: "개방성",
    english: "Openness",
    color: "#8ab4f8",
    blurb: "상상력, 호기심, 새로운 경험에 대한 열림 정도",
    desc: {
      high: "호기심이 많고 상상력이 풍부하며 새로운 아이디어와 경험에 활짝 열려 있습니다. 추상적 사고와 예술적 감수성이 두드러집니다.",
      mid: "새로운 아이디어에 열려 있으면서도 검증된 방식의 안정감을 함께 취합니다. 상황에 따라 탐색과 실용 사이 균형을 잡습니다.",
      low: "현실적이고 익숙한 것을 선호하며 검증된 방식에서 안정감을 느낍니다. 실용적이고 구체적인 접근을 중시합니다.",
    },
    strength: { high: "새로운 관점으로 문제를 바라보고 창의적 대안을 만들어내는 힘" },
    blindspot: {
      high: "관심이 넓어 초점이 흩어지고 마무리가 흐려질 여지",
      mid: "검증된 방식을 선호해 파격적 혁신의 기회를 놓칠 여지",
      low: "익숙한 틀에 머물러 변화와 새로운 시도에 소극적일 여지",
    },
  },
  C: {
    key: "C",
    name: "성실성",
    english: "Discipline",
    color: "#3182f6",
    blurb: "계획성, 책임감, 목표를 향한 자기통제 정도",
    desc: {
      high: "체계적이고 신뢰할 수 있으며 목표 지향적입니다. 계획한 일을 끝까지 마무리하고 즉흥보다 질서를 선호합니다. 이 프로필의 핵심 엔진입니다.",
      mid: "필요할 때 계획적으로 움직이면서도 상황에 따라 유연함을 발휘합니다. 구조와 자유 사이에서 균형을 유지합니다.",
      low: "유연하고 즉흥적이며 상황의 흐름을 따라 자유롭게 움직입니다. 규칙보다 즉각적인 대응을 선호합니다.",
    },
    strength: { high: "계획을 세우고 끝까지 완수하는 높은 책임감과 신뢰성" },
    blindspot: {
      high: "완벽주의·과도한 통제, 즉흥 상황에서의 스트레스",
      mid: "우선순위가 흐려지면 추진력이 다소 약해질 여지",
      low: "계획성과 마감 관리가 느슨해 일관성이 흔들릴 여지",
    },
  },
  E: {
    key: "E",
    name: "외향성",
    english: "Extraversion",
    color: "#1b64da",
    blurb: "사교성, 활력, 외부 자극에서 에너지를 얻는 정도",
    desc: {
      high: "사교적이고 활기차며 사람들과 어울릴 때 에너지를 얻습니다. 새로운 만남과 자극을 즐깁니다.",
      mid: "사교적이면서도 혼자 집중하는 시간의 가치를 압니다. 상황에 맞춰 나서기와 물러서기를 조절하는 유연한 영역입니다.",
      low: "차분하고 신중하며 혼자만의 시간에서 에너지를 회복합니다. 깊이 있는 소수의 관계를 선호합니다.",
    },
    strength: { high: "사람들에게 먼저 다가가 분위기를 이끄는 활력과 추진력" },
    blindspot: {
      high: "말이 앞서 경청이 줄고 신중함이 부족해질 여지",
      mid: "에너지 배분에 따라 몰입도가 달라질 여지",
      low: "존재감을 드러내지 않아 기여가 저평가될 여지",
    },
  },
  A: {
    key: "A",
    name: "우호성",
    english: "Empathy",
    color: "#5b9bf7",
    blurb: "공감, 협력, 타인에 대한 배려 정도",
    desc: {
      high: "따뜻하고 협조적이며 신뢰를 중시합니다. 타인을 잘 읽고 조화를 추구하며 갈등 상황에서 서로 이기는 해법을 찾으려 합니다.",
      mid: "협력적이면서도 필요할 땐 자기 입장을 분명히 합니다. 배려와 소신 사이에서 균형을 잡습니다.",
      low: "솔직하고 독립적이며 자기 주장이 분명합니다. 경쟁적이고 논리적인 판단을 중시합니다.",
    },
    strength: { high: "타인을 배려하고 조화를 이끄는 따뜻한 협업 능력" },
    blindspot: {
      high: "조화를 위해 자기 의견을 접거나 거절을 어려워함",
      mid: "상황에 따라 배려와 소신 사이에서 흔들릴 여지",
      low: "솔직함이 지나쳐 관계에서 마찰을 빚을 여지",
    },
  },
  N: {
    key: "N",
    name: "신경성",
    english: "Sensitivity",
    color: "#9cc0ff",
    blurb: "스트레스, 불안, 정서적 기복을 느끼는 정도",
    desc: {
      high: "감정을 민감하게 느끼고 위험을 미리 감지합니다. 섬세한 만큼 스트레스에 영향을 받기 쉽습니다.",
      mid: "감정을 적절히 인식하면서도 대체로 안정을 유지합니다. 상황에 따라 긴장과 이완을 오갑니다.",
      low: "정서적으로 안정적이고 압박이나 변화 앞에서 침착합니다. 스트레스에 쉽게 흔들리지 않아, 꾸준한 회복력으로 이어집니다.",
    },
    strength: { low: "압박·변화 속에서도 흔들리지 않는 정서적 침착함", high: "위험 신호를 예민하게 포착하는 섬세한 감각" },
    blindspot: {
      high: "걱정과 감정 기복이 에너지를 소모시킬 여지",
      mid: "스트레스가 누적되면 기복이 커질 여지",
      low: "위험 신호나 부정적 감정을 과소평가할 여지",
    },
  },
};

const QUESTIONS = [
  // Extraversion
  { text: "나는 파티에서 분위기를 이끄는 사람이다.", factor: "E", keyed: "+" },
  { text: "나는 말수가 적은 편이다.", factor: "E", keyed: "-" },
  { text: "나는 사람들과 함께 있을 때 편안함을 느낀다.", factor: "E", keyed: "+" },
  { text: "나는 주로 뒤로 물러나 있는 편이다.", factor: "E", keyed: "-" },
  { text: "나는 먼저 대화를 시작하는 편이다.", factor: "E", keyed: "+" },
  { text: "나는 딱히 할 말이 별로 없다.", factor: "E", keyed: "-" },
  { text: "나는 모임에서 여러 사람과 두루 이야기한다.", factor: "E", keyed: "+" },
  { text: "나는 남의 주목을 받는 것을 좋아하지 않는다.", factor: "E", keyed: "-" },
  { text: "나는 사람들의 관심의 중심이 되어도 괜찮다.", factor: "E", keyed: "+" },
  { text: "나는 낯선 사람들 앞에서는 조용해진다.", factor: "E", keyed: "-" },

  // Agreeableness
  { text: "나는 타인의 일에 별로 관심이 없다.", factor: "A", keyed: "-" },
  { text: "나는 사람들에게 관심이 많다.", factor: "A", keyed: "+" },
  { text: "나는 남에게 상처 주는 말을 할 때가 있다.", factor: "A", keyed: "-" },
  { text: "나는 다른 사람의 감정에 공감한다.", factor: "A", keyed: "+" },
  { text: "나는 남의 문제에는 별로 흥미가 없다.", factor: "A", keyed: "-" },
  { text: "나는 마음이 따뜻한 편이다.", factor: "A", keyed: "+" },
  { text: "나는 사실 다른 사람에게 큰 관심이 없다.", factor: "A", keyed: "-" },
  { text: "나는 다른 사람을 위해 시간을 낸다.", factor: "A", keyed: "+" },
  { text: "나는 타인의 감정을 잘 느낀다.", factor: "A", keyed: "+" },
  { text: "나는 사람들을 편안하게 만들어 준다.", factor: "A", keyed: "+" },

  // Conscientiousness
  { text: "나는 항상 미리 준비되어 있다.", factor: "C", keyed: "+" },
  { text: "나는 물건을 아무 데나 늘어놓는 편이다.", factor: "C", keyed: "-" },
  { text: "나는 세부 사항에 주의를 기울인다.", factor: "C", keyed: "+" },
  { text: "나는 일을 엉망으로 만들 때가 있다.", factor: "C", keyed: "-" },
  { text: "나는 해야 할 일을 곧바로 처리한다.", factor: "C", keyed: "+" },
  { text: "나는 물건을 제자리에 두는 것을 자주 잊는다.", factor: "C", keyed: "-" },
  { text: "나는 정돈된 상태를 좋아한다.", factor: "C", keyed: "+" },
  { text: "나는 맡은 의무를 소홀히 할 때가 있다.", factor: "C", keyed: "-" },
  { text: "나는 계획과 일정을 따른다.", factor: "C", keyed: "+" },
  { text: "나는 일을 꼼꼼하고 정확하게 처리한다.", factor: "C", keyed: "+" },

  // Neuroticism
  { text: "나는 쉽게 스트레스를 받는다.", factor: "N", keyed: "+" },
  { text: "나는 대체로 편안하고 느긋하다.", factor: "N", keyed: "-" },
  { text: "나는 여러 가지를 자주 걱정한다.", factor: "N", keyed: "+" },
  { text: "나는 우울한 기분을 거의 느끼지 않는다.", factor: "N", keyed: "-" },
  { text: "나는 작은 일에도 쉽게 동요한다.", factor: "N", keyed: "+" },
  { text: "나는 쉽게 기분이 상한다.", factor: "N", keyed: "+" },
  { text: "나는 기분이 자주 바뀐다.", factor: "N", keyed: "+" },
  { text: "나는 감정 기복이 잦은 편이다.", factor: "N", keyed: "+" },
  { text: "나는 쉽게 짜증이 난다.", factor: "N", keyed: "+" },
  { text: "나는 자주 울적함을 느낀다.", factor: "N", keyed: "+" },

  // Openness
  { text: "나는 어휘가 풍부한 편이다.", factor: "O", keyed: "+" },
  { text: "나는 추상적인 개념을 이해하기 어려워한다.", factor: "O", keyed: "-" },
  { text: "나는 상상력이 생생하고 풍부하다.", factor: "O", keyed: "+" },
  { text: "나는 추상적인 아이디어에는 흥미가 없다.", factor: "O", keyed: "-" },
  { text: "나는 좋은 아이디어를 잘 떠올린다.", factor: "O", keyed: "+" },
  { text: "나는 상상력이 뛰어난 편은 아니다.", factor: "O", keyed: "-" },
  { text: "나는 무언가를 빠르게 이해한다.", factor: "O", keyed: "+" },
  { text: "나는 어려운 개념이나 표현을 즐겨 사용한다.", factor: "O", keyed: "+" },
  { text: "나는 여러 가지를 곰곰이 성찰하는 시간을 갖는다.", factor: "O", keyed: "+" },
  { text: "나는 아이디어가 넘친다.", factor: "O", keyed: "+" },
];

const SCALE = [
  { value: 1, label: "전혀 아니다" },
  { value: 2, label: "아니다" },
  { value: 3, label: "보통이다" },
  { value: 4, label: "그렇다" },
  { value: 5, label: "매우 그렇다" },
];
