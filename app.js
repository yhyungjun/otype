// Supabase (공개 키 — RLS로 보호됨)
const SUPABASE_URL = "https://ydejsjrjminbyuquywuo.supabase.co";
const SUPABASE_ANON = "sb_publishable_xIO_-uuvgxT0KkiTUF4Hng_izDPe-UZ";
const NICK_MAX = 20;

const state = {
  index: 0,
  nickname: "",
  answers: new Array(QUESTIONS.length).fill(null),
};

const views = {
  intro: document.getElementById("view-intro"),
  name: document.getElementById("view-name"),
  test: document.getElementById("view-test"),
  result: document.getElementById("view-result"),
};

function show(name) {
  Object.values(views).forEach((v) => v.classList.remove("active"));
  views[name].classList.add("active");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

/* ---------- 검사 렌더 ---------- */
function renderQuestion() {
  const i = state.index;
  const q = QUESTIONS[i];
  const total = QUESTIONS.length;

  document.getElementById("q-counter").textContent = `${i + 1} / ${total}`;
  const pct = Math.round(((i + 1) / total) * 100);
  document.getElementById("q-percent").textContent = `${pct}%`;
  document.getElementById("progress-bar").style.width = `${pct}%`;

  document.getElementById("q-index").textContent = `Q${i + 1}`;
  document.getElementById("q-text").textContent = q.text;

  const box = document.getElementById("scale-options");
  box.innerHTML = "";
  SCALE.forEach((opt) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "scale-btn" + (state.answers[i] === opt.value ? " selected" : "");
    btn.setAttribute("role", "radio");
    btn.setAttribute("aria-checked", state.answers[i] === opt.value);
    btn.innerHTML = `<span class="marker"></span><span>${opt.label}</span>`;
    btn.addEventListener("click", () => selectAnswer(opt.value));
    box.appendChild(btn);
  });

  document.getElementById("btn-prev").style.visibility = i === 0 ? "hidden" : "visible";
}

function selectAnswer(value) {
  state.answers[state.index] = value;
  renderQuestion();
  setTimeout(() => {
    if (state.index < QUESTIONS.length - 1) {
      state.index += 1;
      renderQuestion();
    } else {
      finish();
    }
  }, 220);
}

/* ---------- 채점 ---------- */
function computeScores() {
  const raw = { O: 0, C: 0, E: 0, A: 0, N: 0 };
  QUESTIONS.forEach((q, i) => {
    const v = state.answers[i] ?? 3; // 미응답 시 중립 처리
    raw[q.factor] += q.keyed === "+" ? v : 6 - v;
  });
  // 각 특성 10문항 → 합계 10~50 → 0~100 백분율
  const pct = {};
  Object.keys(raw).forEach((k) => {
    pct[k] = Math.round(((raw[k] - 10) / 40) * 100);
  });
  return pct;
}

/* ---------- 레이더 차트 (오각형) ---------- */
const RADAR_ORDER = ["O", "C", "E", "A", "N"]; // 위에서 시계방향
const LEVEL_EN = { H: "HIGH", M: "MEDIUM", L: "LOW" };

function radarPoint(cx, cy, radius, i, frac) {
  const angle = (-90 + i * 72) * (Math.PI / 180);
  return [cx + radius * frac * Math.cos(angle), cy + radius * frac * Math.sin(angle)];
}

function drawRadar(pct, levels) {
  const svg = document.getElementById("radar");
  const cx = 230, cy = 200, R = 118;
  const grid = [0.25, 0.5, 0.75, 1];
  let out = "";

  // 배경 격자 오각형
  grid.forEach((g) => {
    const pts = RADAR_ORDER.map((_, i) => radarPoint(cx, cy, R, i, g).map((n) => n.toFixed(1)).join(",")).join(" ");
    out += `<polygon points="${pts}" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>`;
  });
  // 축선
  RADAR_ORDER.forEach((_, i) => {
    const [x, y] = radarPoint(cx, cy, R, i, 1);
    out += `<line x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>`;
  });
  // 데이터 폴리곤
  const dataPts = RADAR_ORDER.map((k, i) => radarPoint(cx, cy, R, i, Math.max(pct[k], 4) / 100).map((n) => n.toFixed(1)).join(",")).join(" ");
  out += `<polygon points="${dataPts}" fill="rgba(49,130,246,0.30)" stroke="#3182f6" stroke-width="2.5" stroke-linejoin="round"/>`;
  // 정점 점 + 라벨
  RADAR_ORDER.forEach((k, i) => {
    const f = FACTORS[k];
    const [dx, dy] = radarPoint(cx, cy, R, i, Math.max(pct[k], 4) / 100);
    out += `<circle cx="${dx.toFixed(1)}" cy="${dy.toFixed(1)}" r="5" fill="${f.color}" stroke="#0f1b34" stroke-width="2"/>`;

    const [lx, ly] = radarPoint(cx, cy, R + 30, i, 1);
    const anchor = i === 0 ? "middle" : lx > cx + 4 ? "start" : lx < cx - 4 ? "end" : "middle";
    out += `<text x="${lx.toFixed(1)}" y="${(ly - 2).toFixed(1)}" text-anchor="${anchor}" class="radar-axis-label" fill="${f.color}">${f.english}</text>`;
    out += `<text x="${lx.toFixed(1)}" y="${(ly + 13).toFixed(1)}" text-anchor="${anchor}" class="radar-axis-level">${LEVEL_EN[levels[k]]}</text>`;
  });

  svg.innerHTML = out;
}

/* ---------- 결과 렌더 (PDF 프로필 형식) ---------- */
function finish() {
  const pct = computeScores();
  const profile = buildProfile(FACTORS, pct);
  const { type, levels, intro, strengths, blindspots, summary } = profile;

  // 커버
  document.getElementById("r-kicker").textContent = state.nickname
    ? `${state.nickname} 님, 나는 누구인가`
    : "나 는 누 구 인 가";
  document.getElementById("r-title").textContent = type.title;
  document.getElementById("r-sub").textContent = `${type.code} · ${type.role}`;
  document.getElementById("r-intro").textContent = intro;
  document.getElementById("r-foot").textContent = `${type.title} · ${type.code}`;

  drawRadar(pct, levels);

  // 특성 카드
  const grid = document.getElementById("trait-grid");
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
  const sList = document.getElementById("strength-list");
  sList.innerHTML = strengths.map((s) => `<li>${s}</li>`).join("");
  const bList = document.getElementById("blindspot-list");
  bList.innerHTML = blindspots.map((b) => `<li>${b}</li>`).join("");

  // 한 줄 요약
  document.getElementById("r-summary").innerHTML =
    `<strong>“${summary}”</strong> 스스로의 강점과 그늘을 함께 이해할 때, 이 프로필은 가장 큰 힘을 발휘합니다.`;

  state.lastResult = { pct, profile };
  saveResult(pct, profile);
  show("result");
}

/* ---------- 액션 ---------- */
function goToNameEntry() {
  const input = document.getElementById("nickname-input");
  const err = document.getElementById("name-error");
  input.classList.remove("invalid");
  err.textContent = "";
  input.value = state.nickname || "";
  show("name");
  setTimeout(() => input.focus(), 60);
}

function submitName() {
  const input = document.getElementById("nickname-input");
  const err = document.getElementById("name-error");
  const name = input.value.trim();
  if (name.length < 1) {
    input.classList.add("invalid");
    err.textContent = "닉네임을 입력해 주세요.";
    input.focus();
    return;
  }
  if (name.length > NICK_MAX) {
    input.classList.add("invalid");
    err.textContent = `닉네임은 최대 ${NICK_MAX}자까지 가능합니다.`;
    return;
  }
  state.nickname = name;
  start();
}

function start() {
  state.index = 0;
  state.answers = new Array(QUESTIONS.length).fill(null);
  renderQuestion();
  show("test");
}

// 닉네임 입력에서 Enter 로 시작
document.getElementById("nickname-input").addEventListener("keydown", (e) => {
  if (e.key === "Enter") { e.preventDefault(); submitName(); }
});

// Supabase 저장 (익명 insert, 실패해도 결과 화면은 정상 표시)
function saveResult(pct, profile) {
  if (!state.nickname) return;
  fetch(`${SUPABASE_URL}/rest/v1/ocean_results`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_ANON,
      Authorization: `Bearer ${SUPABASE_ANON}`,
      Prefer: "return=minimal",
    },
    body: JSON.stringify({
      nickname: state.nickname,
      type_code: profile.type.code,
      type_title: profile.type.title,
      type_role: profile.type.role,
      scores: pct,
      answers: state.answers,
    }),
  })
    .then((res) => { if (!res.ok) console.error("결과 저장 실패:", res.status); })
    .catch((e) => console.error("결과 저장 네트워크 오류:", e));
}

function toast(msg) {
  let el = document.querySelector(".toast");
  if (!el) {
    el = document.createElement("div");
    el.className = "toast";
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.add("show");
  setTimeout(() => el.classList.remove("show"), 1800);
}

function copyResult() {
  const { pct, profile } = state.lastResult || {};
  if (!profile) return;
  const order = ["O", "C", "E", "A", "N"];
  const lines = order.map((k) => `${FACTORS[k].english}(${FACTORS[k].name}) ${pct[k]}%`).join(" · ");
  const who = state.nickname ? `${state.nickname}님 · ` : "";
  const text = `[오션(OCEAN) 성격 검사] ${who}${profile.type.title} · ${profile.type.code} ${profile.type.role}\n${lines}\n한 줄 요약: ${profile.summary}`;
  navigator.clipboard?.writeText(text).then(
    () => toast("결과 요약을 복사했어요 ✓"),
    () => toast("복사에 실패했어요")
  );
}

/* ---------- 결과 이미지 저장 ---------- */
async function saveImage(triggerBtn) {
  const node = document.querySelector(".result-view");
  if (!node || typeof html2canvas === "undefined") {
    toast("이미지 저장을 사용할 수 없어요");
    return;
  }
  const original = triggerBtn?.innerHTML;
  if (triggerBtn) { triggerBtn.disabled = true; triggerBtn.textContent = "이미지 생성 중…"; }

  try {
    const canvas = await html2canvas(node, {
      backgroundColor: "#100d24",
      scale: 2,
      useCORS: true,
      logging: false,
      onclone: (doc) => {
        // 캡처본에서 액션 버튼 숨기기
        const actions = doc.querySelector(".result-view .result-actions");
        if (actions) actions.style.display = "none";
        // 그라데이션 타이틀은 캡처 시 단색으로 고정(투명 렌더 방지)
        const title = doc.querySelector(".result-view .cover-title");
        if (title) {
          title.style.background = "none";
          title.style.webkitTextFillColor = "#b9a6ff";
          title.style.color = "#b9a6ff";
        }
      },
    });

    const title = state.lastResult?.profile?.type?.title || "BigFive";
    const fileName = `BigFive_${title.replace(/^The\s+/, "").replace(/\s+/g, "_")}.png`;
    canvas.toBlob((blob) => {
      if (!blob) { toast("이미지 생성에 실패했어요"); return; }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
      toast("이미지를 저장했어요 ✓");
    }, "image/png");
  } catch (err) {
    console.error(err);
    toast("이미지 생성에 실패했어요");
  } finally {
    if (triggerBtn) { triggerBtn.disabled = false; triggerBtn.innerHTML = original; }
  }
}

document.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-action]");
  const action = btn?.dataset.action;
  if (!action) return;
  e.preventDefault();
  if (action === "start") goToNameEntry();
  else if (action === "submit-name") submitName();
  else if (action === "prev") { if (state.index > 0) { state.index -= 1; renderQuestion(); } }
  else if (action === "restart" || action === "home") { show("intro"); }
  else if (action === "copy") copyResult();
  else if (action === "save-image") saveImage(btn);
});

renderQuestion();
show("intro");
