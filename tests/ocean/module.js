// OCEAN(Big Five) 테스트 모듈 — 문항·채점·프로필·결과 렌더를 고정 인터페이스 뒤로 캡슐화.
// 공용 셸(test.html 러너)이 OCEAN_MODULE.meta/questions/score/buildProfile/renderResult 로 소비한다.
//
// 로드 순서 의존성: questions.js → archetypes.js → radar.js → module.js
//   - questions.js: FACTORS, QUESTIONS (전역)
//   - archetypes.js: TYPES, buildProfile(FACTORS, pct) (전역) — 아래에서 _buildProfile 로 참조
//   - radar.js: RADAR_ORDER, LEVEL_EN, renderRadar (전역)
//
// 이 모듈은 러너의 책임(state / saveResult / show() / 공유·저장 버튼)을 참조하지 않는다.
// renderResult 는 페이지에 미리 존재하는 id 에 의존하지 않고, mountEl 안에 자체 마크업을 생성한다.

// archetypes.js 의 전역 buildProfile(FACTORS, pct) 를 모듈 메서드명과 구분해 보존.
const _buildProfile = buildProfile;

/* ---------- 채점 (app.js computeScores 를 순수 함수로 이식) ---------- */
// answers: number[](1..5, questions 인덱스 정렬; 미응답은 null). 미응답 시 중립(3)로 처리.
// 역채점 문항(keyed "-")은 6 - 값. 각 특성 10문항 합계(10~50) → 0~100 백분율.
function _score(answers) {
  const raw = { O: 0, C: 0, E: 0, A: 0, N: 0 };
  QUESTIONS.forEach((q, i) => {
    const v = answers[i] ?? 3; // 미응답 시 중립 처리
    raw[q.factor] += q.keyed === "+" ? v : 6 - v;
  });
  const pct = {};
  Object.keys(raw).forEach((k) => {
    pct[k] = Math.round(((raw[k] - 10) / 40) * 100);
  });
  return pct;
}

/* ---------- 표본 비교 바 렌더 (app.js 이식) ---------- */
function _renderNormBars(container, norms) {
  container.innerHTML = "";
  norms.forEach(({ key, pct, topPercent }) => {
    const f = FACTORS[key];
    const row = document.createElement("div");
    row.className = "norm-row";
    row.innerHTML = `
      <div class="norm-label">
        <span class="norm-factor-en">${f.english}</span>
        <span class="norm-factor-kr">${f.name}</span>
      </div>
      <div class="norm-bar-wrap">
        <div class="norm-bar-track">
          <div class="norm-bar-fill" style="width:${pct}%;background:${f.color}"></div>
        </div>
      </div>
      <span class="norm-top">상위 약 ${topPercent}%</span>`;
    container.appendChild(row);
  });
}

/* ---------- 커리어 적합도 렌더 (app.js 이식) ---------- */
function _renderCareer(container, career) {
  container.innerHTML = "";
  const chips = document.createElement("div");
  chips.className = "career-chips";
  career.roles.forEach((role) => {
    const chip = document.createElement("span");
    chip.className = "career-chip";
    chip.textContent = role;
    chips.appendChild(chip);
  });
  container.appendChild(chips);
  const note = document.createElement("p");
  note.className = "career-note";
  note.textContent = career.note;
  container.appendChild(note);
}

/* ---------- 협업 인사이트 렌더 (app.js 이식) ---------- */
function _renderCollab(container, collab) {
  container.innerHTML = "";
  const ul = document.createElement("ul");
  ul.className = "collab-list";
  collab.forEach((text) => {
    const li = document.createElement("li");
    li.textContent = text;
    ul.appendChild(li);
  });
  container.appendChild(ul);
}

/* ---------- 랜딩 카드 미리보기 (app.js SAMPLE_PCT/renderTraitMiniBars/populateDiscoverPreviews 이식) ---------- */
// 랜딩 카드 미리보기용 샘플 프로필 (실행가/The Executor 유형)
const SAMPLE_PCT = { O: 62, C: 82, E: 48, A: 66, N: 35 };

// 랜딩 카드 미니 특성 바 렌더
function _renderTraitMiniBars(container, pct, levels) {
  container.innerHTML = "";
  ["O", "C", "E", "A", "N"].forEach((k) => {
    const f = FACTORS[k];
    const row = document.createElement("div");
    row.className = "dcm-row";

    const labelEl = document.createElement("div");
    labelEl.className = "dcm-label";
    const enSpan = document.createElement("span");
    enSpan.className = "dcm-en";
    enSpan.textContent = f.english;
    const krSpan = document.createElement("span");
    krSpan.className = "dcm-kr";
    krSpan.textContent = f.name;
    labelEl.appendChild(enSpan);
    labelEl.appendChild(krSpan);

    const trackEl = document.createElement("div");
    trackEl.className = "dcm-track";
    const fillEl = document.createElement("div");
    fillEl.className = "dcm-fill";
    fillEl.style.width = pct[k] + "%";
    fillEl.style.background = f.color;
    trackEl.appendChild(fillEl);

    const levelEl = document.createElement("span");
    levelEl.className = "dcm-level";
    levelEl.textContent = LEVEL_EN[levels[k]];

    row.appendChild(labelEl);
    row.appendChild(trackEl);
    row.appendChild(levelEl);
    container.appendChild(row);
  });
}

// 랜딩 카드 미리보기 채우기 (root 하위 .dc-preview 요소들을 샘플 프로필로 채운다)
function _renderDiscoverPreviews(root) {
  const scope = root || document;
  const sp = _buildProfile(FACTORS, SAMPLE_PCT);

  scope.querySelectorAll(".dc-preview").forEach((el) => {
    const key = el.dataset.preview;
    if (!key) return;

    if (key === "traits") {
      _renderTraitMiniBars(el, SAMPLE_PCT, sp.levels);

    } else if (key === "type") {
      el.innerHTML = "";

      const headline = document.createElement("p");
      headline.className = "dcp-type-title";
      headline.textContent = sp.type.title;

      const sub = document.createElement("p");
      sub.className = "dcp-type-sub";
      sub.textContent = sp.type.code + " · " + sp.type.role;

      const sumEl = document.createElement("p");
      sumEl.className = "dcp-type-summary";
      sumEl.textContent = sp.summary;

      el.appendChild(headline);
      el.appendChild(sub);
      el.appendChild(sumEl);

    } else if (key === "career") {
      _renderCareer(el, sp.career);

    } else if (key === "collab") {
      _renderCollab(el, sp.collab);

    } else if (key === "growth") {
      el.innerHTML = "";

      const sLabel = document.createElement("p");
      sLabel.className = "dcp-growth-label dcp-growth-label--strength";
      sLabel.textContent = "강점";

      const sList = document.createElement("ul");
      sList.className = "dcp-growth-list";
      sp.strengths.slice(0, 3).forEach((s) => {
        const li = document.createElement("li");
        li.textContent = s;
        sList.appendChild(li);
      });

      const bLabel = document.createElement("p");
      bLabel.className = "dcp-growth-label dcp-growth-label--blind";
      bLabel.textContent = "주의할 지점";

      const bList = document.createElement("ul");
      bList.className = "dcp-growth-list dcp-growth-list--blind";
      sp.blindspots.slice(0, 3).forEach((b) => {
        const li = document.createElement("li");
        li.textContent = b;
        bList.appendChild(li);
      });

      el.appendChild(sLabel);
      el.appendChild(sList);
      el.appendChild(bLabel);
      el.appendChild(bList);

    } else if (key === "norms") {
      _renderNormBars(el, sp.norms);
    }
  });
}

/* ---------- 결과 뷰 내부 마크업 (index.html #view-result 의 inner, .result-actions 제외) ---------- */
function _resultTemplate() {
  return `
      <!-- 커버 -->
      <div class="profile-cover">
        <div class="cover-logo"><img class="cover-logo-mark" src="assets/logo-mark.svg" alt="" width="28" height="28" /> OCEAN</div>
        <div class="cover-kicker"><span id="r-kicker">나 는 누 구 인 가</span><span class="kicker-line"></span></div>
        <div class="cover-emoji" id="r-emoji" aria-hidden="true"></div>
        <h1 class="cover-title" id="r-title">The Executor</h1>
        <p class="cover-sub" id="r-sub">유형 C · 실행가</p>
        <p class="cover-intro" id="r-intro">소개</p>

        <div class="radar-wrap">
          <svg id="radar" viewBox="0 0 460 420" role="img" aria-label="Big Five 레이더 차트"></svg>
        </div>

        <div class="cover-foot">
          <span>OCEAN · Big Five Profile</span>
          <span id="r-foot">The Executor · 유형 C</span>
        </div>
      </div>

      <!-- 프로필 카드 -->
      <div class="profile-section">
        <h2 class="ps-title">Your Big Five Profile</h2>
        <p class="ps-sub">OCEAN 5개 특성 · 백분위 척도 기반 해석</p>
        <div class="trait-grid" id="trait-grid"></div>
      </div>

      <!-- 표본 비교 -->
      <div class="norm-section">
        <h3 class="sec-head">표본 비교</h3>
        <p class="norm-caption">근사 기준과 비교해 각 특성의 상대적 위치를 확인합니다.</p>
        <div id="norm-bars"></div>
        <p class="norm-disclaimer">근사 추정치 · 실제 표본 규준이 아닌 근사 기준과의 비교입니다.</p>
      </div>

      <!-- 종합 분석 -->
      <div class="analysis">
        <h3 class="sec-head">종합 분석</h3>
        <div class="analysis-cols">
          <div class="analysis-card strengths">
            <h4>강점</h4>
            <ul id="strength-list"></ul>
          </div>
          <div class="analysis-card blindspots">
            <h4>주의할 지점 (블라인드 스팟)</h4>
            <ul id="blindspot-list"></ul>
          </div>
        </div>
      </div>

      <!-- 커리어 적합도 -->
      <div class="career-section">
        <h3 class="sec-head">커리어 적합도</h3>
        <div id="career-block"></div>
        <p class="career-disclaimer">성향 기반 추천 · 절대적 기준은 아닙니다.</p>
      </div>

      <!-- 협업 인사이트 -->
      <div class="collab-section">
        <h3 class="sec-head">협업 인사이트</h3>
        <div id="collab-block"></div>
      </div>

      <!-- 한 줄 요약 -->
      <div class="summary-block">
        <h3 class="sec-head">한 줄 요약</h3>
        <blockquote id="r-summary">요약</blockquote>
        <p class="disclaimer">자기보고식 검사 결과인 만큼 절대적 정의가 아니라, 자기 이해를 돕는 참고 틀로 활용하시길 권합니다.</p>
      </div>`;
}

/* ---------- 결과 렌더 (app.js finish() 의 렌더 본문 이식; 채점·저장·show 는 제외) ---------- */
// mountEl: 결과 마크업을 그려 넣을 컨테이너. ctx = { scores, profile, nickname }.
function _renderResult(mountEl, { scores, profile, nickname }) {
  const pct = scores;
  mountEl.innerHTML = _resultTemplate();

  const { type, levels, intro, strengths, blindspots, summary } = profile;

  // 커버
  mountEl.querySelector("#r-kicker").textContent = nickname
    ? `${nickname} 님, 나는 누구인가`
    : "나 는 누 구 인 가";
  mountEl.querySelector("#r-emoji").textContent = type.emoji || "";
  mountEl.querySelector("#r-title").textContent = type.title;
  mountEl.querySelector("#r-sub").textContent = `${type.code} · ${type.role}`;
  mountEl.querySelector("#r-intro").textContent = intro;
  mountEl.querySelector("#r-foot").textContent = `${type.title} · ${type.code}`;

  // 레이더 (radar.js 공용 렌더러)
  renderRadar(mountEl.querySelector("#radar"), pct, levels);

  // 표본 비교
  _renderNormBars(mountEl.querySelector("#norm-bars"), profile.norms);

  // 특성 카드
  const grid = mountEl.querySelector("#trait-grid");
  grid.innerHTML = "";
  RADAR_ORDER.forEach((k) => {
    const f = FACTORS[k];
    const lv = levels[k];
    const desc = lv === "H" ? f.desc.high : lv === "L" ? f.desc.low : f.desc.mid;
    const card = document.createElement("div");
    card.className = "trait-card";
    card.innerHTML = `
      <div class="tc-head">
        <span class="tc-name">${f.english} <em>${f.name}</em></span>
        <span class="tc-pill" style="color:${f.color};border-color:${f.color}">${LEVEL_EN[lv]}</span>
      </div>
      <div class="tc-slider">
        <div class="tc-track">
          <span class="tc-fill" style="background:linear-gradient(90deg,${f.color}55,${f.color})"></span>
          <span class="tc-knob" style="border:3px solid ${f.color}"></span>
        </div>
        <div class="tc-scale">
          <span class="${lv === "L" ? "on" : ""}">LOW</span>
          <span class="${lv === "M" ? "on" : ""}">MEDIUM</span>
          <span class="${lv === "H" ? "on" : ""}">HIGH</span>
        </div>
      </div>
      <p class="tc-desc">${desc}</p>`;
    grid.appendChild(card);
    requestAnimationFrame(() => {
      const w = Math.min(Math.max(pct[k], 3), 100);
      card.querySelector(".tc-fill").style.width = `${w}%`;
      card.querySelector(".tc-knob").style.left = `${w}%`;
    });
  });

  // 종합 분석
  const sList = mountEl.querySelector("#strength-list");
  sList.innerHTML = strengths.map((s) => `<li>${s}</li>`).join("");
  const bList = mountEl.querySelector("#blindspot-list");
  bList.innerHTML = blindspots.map((b) => `<li>${b}</li>`).join("");

  // 커리어 적합도 · 협업 인사이트
  _renderCareer(mountEl.querySelector("#career-block"), profile.career);
  _renderCollab(mountEl.querySelector("#collab-block"), profile.collab);

  // 한 줄 요약
  mountEl.querySelector("#r-summary").innerHTML =
    `<strong>“${summary}”</strong> 스스로의 강점과 그늘을 함께 이해할 때, 이 프로필은 가장 큰 힘을 발휘합니다.`;
}

/* ---------- 모듈 인터페이스 ---------- */
const OCEAN_MODULE = {
  meta: {
    id: "ocean",
    name: "오션(OCEAN) 성격 검사",
    tagline: "나는 누구인가 — Big Five 기반 성격 프로필",
    icon: "🌊",
    scaleSize: 5,
    scaleLabels: ["전혀 아니다", "매우 그렇다"],
  },
  questions: QUESTIONS,
  score(answers) {
    return _score(answers);
  },
  buildProfile(scores) {
    return _buildProfile(FACTORS, scores);
  },
  renderResult(mountEl, ctx) {
    _renderResult(mountEl, ctx);
  },
  renderDiscoverPreviews(root) {
    _renderDiscoverPreviews(root);
  },
};
