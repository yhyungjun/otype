// 마이페이지 — 로그인 사용자의 검사 결과를 모아 카드로 보여준다.
// 소유자 SELECT RLS(own_select_results) 덕분에 본인 행만 조회된다.
// 전역 의존: sb·Auth(auth.js), getTest(tests/registry.js), renderRadar(radar.js).
// 프로필은 row.test_id 로 테스트 모듈을 찾아 t.buildProfile(scores) 로 계산한다.

const root = document.getElementById("me-root");

const compareSel = new Map(); // rowId → row (최대 2)
const CMP_COLORS = ["#4b8ffc", "#f5a623"];

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

function fmtDate(iso) {
  const d = new Date(iso);
  return `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()}.`;
}

function shareUrl(shareId) {
  const u = new URL("share.html", location.href);
  u.searchParams.set("id", shareId);
  return u.href;
}

// 헤더 로그인 상태(이름 · 로그아웃)
function renderAuth(session) {
  const el = document.getElementById("auth-status");
  if (!el) return;
  el.innerHTML = "";
  if (!session) return;
  const name = document.createElement("span");
  name.className = "auth-name";
  name.textContent = `${Auth.displayName(session)} 님`;
  const out = document.createElement("button");
  out.className = "auth-logout";
  out.textContent = "로그아웃";
  out.addEventListener("click", () => sb.auth.signOut().then(() => location.reload()));
  el.append(name, out);
}

// 로그인(마이페이지는 자동시작 플래그 없이 자체 OAuth 호출 — auth.js signIn과 달리 검사 자동진입 안 함)
function login(provider) {
  const redirectTo = location.href.split("#")[0].split("?")[0];
  const options = { redirectTo };
  if (provider === "custom:kakao") options.scopes = "openid profile_nickname";
  sb.auth.signInWithOAuth({ provider, options });
}

function renderLogin() {
  const card = document.createElement("div");
  card.className = "name-card";
  card.innerHTML = `
    <span class="name-badge">로그인이 필요해요</span>
    <h2 class="name-title">내 결과를 보려면 로그인하세요</h2>
    <p class="name-sub">검사 결과는 로그인 계정에 안전하게 저장됩니다.</p>
    <button class="btn btn-lg btn-kakao" data-p="custom:kakao">카카오로 시작하기</button>
    <button class="btn btn-lg btn-google" data-p="google">구글로 시작하기</button>
    <a class="btn btn-ghost" href="index.html">홈으로</a>`;
  card.querySelectorAll("[data-p]").forEach((b) => b.addEventListener("click", () => login(b.dataset.p)));
  root.replaceChildren(card);
}

// 내 결과 카드 — 텍스트는 textContent로만 주입.
function resultCard(row) {
  const profile = getTest(row.test_id || "ocean").buildProfile(row.scores);
  const type = profile.type;

  const card = document.createElement("article");
  card.className = "share-card";

  const cover = document.createElement("header");
  cover.className = "sc-cover";
  const kicker = document.createElement("span");
  kicker.className = "sc-kicker";
  kicker.textContent = `검사일 · ${fmtDate(row.created_at)}`;
  const emoji = document.createElement("div");
  emoji.className = "sc-emoji";
  emoji.setAttribute("aria-hidden", "true");
  emoji.textContent = type.emoji || "";
  const title = document.createElement("h2");
  title.className = "sc-name";
  title.textContent = type.title;
  const sub = document.createElement("p");
  sub.className = "sc-type";
  sub.textContent = `${type.code} · ${type.role}`;
  cover.append(kicker, emoji, title, sub);

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("class", "sc-radar");
  svg.setAttribute("viewBox", "0 0 460 420");
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", "Big Five 레이더 차트");

  const summary = document.createElement("blockquote");
  summary.className = "sc-summary";
  summary.textContent = `“${profile.summary}”`;

  const actions = document.createElement("div");
  actions.className = "sc-actions";

  const copy = document.createElement("button");
  copy.className = "sc-btn";
  copy.textContent = "공유 링크 복사";
  copy.addEventListener("click", () => {
    navigator.clipboard?.writeText(shareUrl(row.share_id)).then(
      () => toast("공유 링크를 복사했어요 ✓"),
      () => toast("복사에 실패했어요")
    );
  });

  const img = document.createElement("button");
  img.className = "sc-btn";
  img.textContent = "이미지 저장";
  img.addEventListener("click", () => saveCardImage(card, row, img));

  const cmp = document.createElement("button");
  cmp.className = "sc-btn sc-compare";
  cmp.textContent = "비교";
  cmp.setAttribute("aria-pressed", "false");
  cmp.addEventListener("click", () => toggleCompare(row, card, cmp));

  actions.append(copy, img, cmp);

  card.append(cover, svg, summary, actions);
  renderRadar(svg, row.scores, profile.levels);
  return card;
}

async function saveCardImage(cardEl, row, btn) {
  if (typeof html2canvas === "undefined") { toast("이미지 저장을 사용할 수 없어요"); return; }
  const type = getTest(row.test_id || "ocean").buildProfile(row.scores).type;
  const original = btn?.textContent;
  if (btn) { btn.disabled = true; btn.textContent = "생성 중…"; }
  try {
    const canvas = await html2canvas(cardEl, {
      backgroundColor: "#0f1b34", scale: 2, useCORS: true, logging: false,
      ignoreElements: (el) => el.classList?.contains("sc-actions"),
    });
    const d = new Date(row.created_at);
    const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
    const name = `${row.test_id || "ocean"}_${type.title.replace(/^The\s+/, "").replace(/\s+/g, "_")}_${ymd}.png`;
    canvas.toBlob((blob) => {
      if (!blob) { toast("이미지 생성에 실패했어요"); return; }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = name; a.click();
      URL.revokeObjectURL(url);
      toast("이미지를 저장했어요 ✓");
    }, "image/png");
  } catch (e) { console.error(e); toast("이미지 생성에 실패했어요"); }
  finally { if (btn) { btn.disabled = false; btn.textContent = original; } }
}

// ===== 두 결과 비교 =====
function toggleCompare(row, cardEl, btn) {
  const key = row.id;
  if (compareSel.has(key)) {
    compareSel.delete(key);
    cardEl.classList.remove("is-selected");
    btn.setAttribute("aria-pressed", "false");
  } else {
    if (compareSel.size >= 2) { toast("두 개까지 선택할 수 있어요"); return; }
    compareSel.set(key, row);
    cardEl.classList.add("is-selected");
    btn.setAttribute("aria-pressed", "true");
  }
  renderCompareBar();
}

function renderCompareBar() {
  let bar = document.querySelector(".compare-bar");
  if (compareSel.size < 2) { bar?.remove(); return; }
  if (!bar) {
    bar = document.createElement("div");
    bar.className = "compare-bar";
    document.body.appendChild(bar);
  }
  bar.innerHTML = "";
  const label = document.createElement("span");
  label.textContent = "2개 선택됨";
  const go = document.createElement("button");
  go.className = "btn btn-primary";
  go.textContent = "비교하기";
  go.addEventListener("click", openCompare);
  const clear = document.createElement("button");
  clear.className = "btn btn-ghost";
  clear.textContent = "선택 해제";
  clear.addEventListener("click", clearCompare);
  bar.append(label, go, clear);
}

function clearCompare() {
  compareSel.clear();
  document.querySelectorAll(".share-card.is-selected").forEach((c) => c.classList.remove("is-selected"));
  document.querySelectorAll(".sc-compare").forEach((b) => b.setAttribute("aria-pressed", "false"));
  renderCompareBar();
}

function openCompare() {
  const rows = [...compareSel.values()];
  if (rows.length !== 2) return;
  if ((rows[0].test_id || "ocean") !== (rows[1].test_id || "ocean")) {
    toast("같은 테스트끼리만 비교할 수 있어요");
    return;
  }
  const items = rows.map((row, i) => {
    const profile = getTest(row.test_id || "ocean").buildProfile(row.scores);
    return { row, profile, color: CMP_COLORS[i] };
  });

  const backdrop = document.createElement("div");
  backdrop.className = "compare-backdrop";
  const modal = document.createElement("div");
  modal.className = "compare-modal";

  const heads = document.createElement("div");
  heads.className = "cmp-heads";
  items.forEach((it) => {
    const h = document.createElement("div");
    h.className = "cmp-head";
    const dot = document.createElement("span");
    dot.className = "cmp-dot";
    dot.style.background = it.color;
    const t = document.createElement("div");
    const title = document.createElement("div");
    title.className = "cmp-title";
    title.textContent = `${it.profile.type.emoji || ""} ${it.profile.type.title}`;
    const date = document.createElement("div");
    date.className = "cmp-date";
    date.textContent = fmtDate(it.row.created_at);
    t.append(title, date);
    h.append(dot, t);
    heads.appendChild(h);
  });

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("class", "cmp-radar");
  svg.setAttribute("viewBox", "0 0 460 420");
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", "비교 레이더 차트");

  const legend = document.createElement("div");
  legend.className = "cmp-legend";
  items.forEach((it) => {
    const l = document.createElement("span");
    l.className = "cmp-leg";
    const d = document.createElement("i");
    d.style.background = it.color;
    l.append(d, document.createTextNode(fmtDate(it.row.created_at)));
    legend.appendChild(l);
  });

  const acts = document.createElement("div");
  acts.className = "sc-actions";
  const saveBtn = document.createElement("button");
  saveBtn.className = "sc-btn";
  saveBtn.textContent = "이미지 저장";
  const closeBtn = document.createElement("button");
  closeBtn.className = "sc-btn";
  closeBtn.textContent = "닫기";
  closeBtn.addEventListener("click", () => backdrop.remove());
  backdrop.addEventListener("click", (e) => { if (e.target === backdrop) backdrop.remove(); });
  acts.append(saveBtn, closeBtn);

  modal.append(heads, svg, legend, acts);
  backdrop.appendChild(modal);
  document.body.appendChild(backdrop);
  renderCompareRadar(svg, items.map((it) => ({ pct: it.row.scores, color: it.color })));

  saveBtn.addEventListener("click", async () => {
    if (typeof html2canvas === "undefined") { toast("이미지 저장을 사용할 수 없어요"); return; }
    const canvas = await html2canvas(modal, {
      backgroundColor: "#0f1b34", scale: 2, useCORS: true,
      ignoreElements: (el) => el.classList?.contains("sc-actions"),
    });
    canvas.toBlob((blob) => {
      if (!blob) { toast("이미지 생성에 실패했어요"); return; }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = "compare.png"; a.click();
      URL.revokeObjectURL(url);
      toast("이미지를 저장했어요 ✓");
    }, "image/png");
  });
}

function messageCard(text) {
  const card = document.createElement("article");
  card.className = "share-card share-card--msg";
  const p = document.createElement("p");
  p.className = "sc-msg";
  p.textContent = text;
  card.appendChild(p);
  return card;
}

async function renderResults(session) {
  const { data, error } = await sb
    .from("results")
    .select("id, created_at, test_id, type_code, type_title, type_role, scores, share_id")
    .eq("user_id", session.user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("결과 조회 실패:", error.message);
    root.replaceChildren(messageCard("결과를 불러오지 못했어요"));
    return;
  }
  if (!data.length) {
    const empty = document.createElement("div");
    empty.className = "name-card";
    empty.innerHTML = `
      <span class="name-badge">아직 결과가 없어요</span>
      <h2 class="name-title">첫 검사를 시작해 보세요</h2>
      <p class="name-sub">검사를 완료하면 결과가 여기에 저장됩니다.</p>
      <a class="btn btn-primary btn-lg" href="index.html">검사하러 가기</a>`;
    root.replaceChildren(empty);
    return;
  }
  // 테스트별 그룹화 — 첫 등장 순서 유지(데이터는 이미 created_at desc)
  const groups = [];
  const byId = new Map();
  data.forEach((row) => {
    const id = row.test_id || "ocean";
    let group = byId.get(id);
    if (!group) {
      const meta = getTest(id)?.meta;
      group = { id, name: meta?.name || id, icon: meta?.icon || "", rows: [] };
      byId.set(id, group);
      groups.push(group);
    }
    group.rows.push(row);
  });

  let activeFilter = "all";

  function paint() {
    const wrap = document.createElement("div");

    const tabs = document.createElement("div");
    tabs.className = "me-tabs";
    const tabDefs = [{ id: "all", label: "전체" }, ...groups.map((g) => ({ id: g.id, label: g.name }))];
    tabDefs.forEach((def) => {
      const tab = document.createElement("button");
      tab.className = "me-tab" + (def.id === activeFilter ? " active" : "");
      tab.textContent = def.label;
      tab.addEventListener("click", () => { activeFilter = def.id; paint(); });
      tabs.appendChild(tab);
    });
    wrap.appendChild(tabs);

    groups
      .filter((g) => activeFilter === "all" || g.id === activeFilter)
      .forEach((g) => {
        const head = document.createElement("h2");
        head.className = "me-group-head";
        head.textContent = `${g.icon} ${g.name} · ${g.rows.length}`;
        wrap.appendChild(head);

        const grid = document.createElement("div");
        grid.className = "share-grid";
        g.rows.forEach((row) => grid.appendChild(resultCard(row)));
        wrap.appendChild(grid);
      });

    root.replaceChildren(wrap);
  }

  paint();
}

async function main() {
  try {
    const session = await Auth.getSession();
    renderAuth(session);
    if (!session) { renderLogin(); return; }
    await renderResults(session);
  } catch (e) {
    console.error(e);
    root.replaceChildren(messageCard("문제가 발생했어요"));
  }
}

main();
