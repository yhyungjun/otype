// 마이페이지 — 로그인 사용자의 검사 결과를 모아 카드로 보여준다.
// 소유자 SELECT RLS(own_select_results) 덕분에 본인 행만 조회된다.
// 전역 의존: sb·Auth(auth.js), FACTORS(questions.js), buildProfile(archetypes.js), renderRadar(radar.js).

const root = document.getElementById("me-root");

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
  const profile = buildProfile(FACTORS, row.scores);
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

  const copy = document.createElement("button");
  copy.className = "sc-remove";
  copy.textContent = "공유 링크 복사";
  copy.addEventListener("click", () => {
    navigator.clipboard?.writeText(shareUrl(row.share_id)).then(
      () => toast("공유 링크를 복사했어요 ✓"),
      () => toast("복사에 실패했어요")
    );
  });

  card.append(cover, svg, summary, copy);
  renderRadar(svg, row.scores, profile.levels);
  return card;
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
    .from("ocean_results")
    .select("id, created_at, type_code, type_title, type_role, scores, share_id")
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
  const grid = document.createElement("div");
  grid.className = "share-grid";
  data.forEach((row) => grid.appendChild(resultCard(row)));
  root.replaceChildren(grid);
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
