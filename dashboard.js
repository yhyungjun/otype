// 친구 결과 대시보드 — 친구 공유 코드(share_id)를 localStorage에 모아 요약 카드로 렌더한다.
// 전역 의존: sb(auth.js), getTest(tests/registry.js), renderRadar(radar.js).
// 프로필은 row.test_id 로 테스트 모듈을 찾아 t.buildProfile(scores) 로 계산한다.

const FRIENDS_KEY = "otype:friends";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ── localStorage 입출력 (잘못된 JSON은 빈 배열로 안전 처리) ──
function loadFriends() {
  try {
    const raw = localStorage.getItem(FRIENDS_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function saveFriends(ids) {
  localStorage.setItem(FRIENDS_KEY, JSON.stringify(ids));
}

// 입력값에서 share_id(uuid) 파싱. 전체 URL(share.html?id=…)이든 raw uuid든 처리.
// 유효한 uuid가 아니면 null 반환.
function parseShareId(input) {
  const trimmed = (input || "").trim();
  if (!trimmed) return null;

  let candidate = trimmed;
  if (trimmed.includes("id=")) {
    try {
      candidate = new URL(trimmed).searchParams.get("id") || "";
    } catch {
      const m = trimmed.match(/[?&]id=([^&\s]+)/);
      candidate = m ? m[1] : "";
    }
  }
  candidate = candidate.trim();
  return UUID_RE.test(candidate) ? candidate.toLowerCase() : null;
}

// 아주 가벼운 토스트 (app.js 패턴 재사용).
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

// ── 카드 생성 헬퍼 ──

// 삭제 버튼 — 검증된 uuid만 data-id로 echo.
function makeRemoveButton(id) {
  const btn = document.createElement("button");
  btn.className = "sc-remove";
  btn.dataset.action = "remove-friend";
  btn.dataset.id = id;
  btn.textContent = "삭제";
  return btn;
}

// 성공 요약 카드. 텍스트는 모두 textContent로 주입(XSS 방지).
function buildSummaryCard(id, row) {
  const t = getTest(row.test_id || "ocean");
  const profile = t.buildProfile(row.scores);
  const type = profile.type;

  const card = document.createElement("article");
  card.className = "share-card";

  const cover = document.createElement("header");
  cover.className = "sc-cover";

  const kicker = document.createElement("span");
  kicker.className = "sc-kicker";
  kicker.textContent = "OCEAN 성격 검사";

  const emoji = document.createElement("div");
  emoji.className = "sc-emoji";
  emoji.setAttribute("aria-hidden", "true");
  emoji.textContent = type.emoji || "";

  const name = document.createElement("h2");
  name.className = "sc-name";
  name.textContent = `${row.nickname} 님`;

  const typeEl = document.createElement("p");
  typeEl.className = "sc-type";
  typeEl.textContent = type.title;

  const role = document.createElement("p");
  role.className = "sc-role";
  role.textContent = `${type.code} · ${type.role}`;

  cover.append(kicker, emoji, name, typeEl, role);

  const viz = document.createElement("div");
  viz.className = "sc-viz";

  const summary = document.createElement("blockquote");
  summary.className = "sc-summary";
  summary.textContent = `“${profile.summary}”`;

  card.append(cover, viz, summary, makeRemoveButton(id));

  // viz 컨테이너가 DOM에 붙은 뒤 모듈에 시각화 위임.
  t.renderSummaryViz(viz, row.scores);
  return card;
}

// 오류/안내 카드. hasRemove=false 면 삭제 버튼 생략(빈 상태용).
function buildMessageCard(message, id, hasRemove = true) {
  const card = document.createElement("article");
  card.className = "share-card share-card--msg";

  const msg = document.createElement("p");
  msg.className = "sc-msg";
  msg.textContent = message;
  card.appendChild(msg);

  if (hasRemove) card.appendChild(makeRemoveButton(id));
  return card;
}

// 저장된 id 하나를 카드 요소로 변환(성공/실패 모두 카드 반환).
async function renderCard(id) {
  try {
    const { data, error } = await sb.rpc("get_shared_result", { p_share_id: id });
    const row = Array.isArray(data) ? data[0] : null;
    if (error || !row) return buildMessageCard("불러오기 실패", id);
    return buildSummaryCard(id, row);
  } catch {
    return buildMessageCard("불러오기 실패", id);
  }
}

// ── 전체 그리드 렌더 ──
async function render() {
  const grid = document.getElementById("friend-grid");
  const ids = loadFriends();

  if (!ids.length) {
    grid.replaceChildren(
      buildMessageCard("아직 추가한 친구 결과가 없어요. 공유 코드를 붙여넣어 보세요.", "", false)
    );
    return;
  }

  // 순서를 유지한 채 동시 렌더.
  const cards = await Promise.all(ids.map(renderCard));
  grid.replaceChildren(...cards);
}

// ── 이벤트 ──
function addFriend() {
  const input = document.getElementById("friend-input");
  const id = parseShareId(input.value);
  if (!id) {
    toast("코드 형식이 올바르지 않아요");
    return;
  }

  const ids = loadFriends();
  if (ids.includes(id)) {
    toast("이미 추가된 친구예요");
    input.value = "";
    return;
  }

  saveFriends([...ids, id]);
  input.value = "";
  render();
}

function removeFriend(id) {
  saveFriends(loadFriends().filter((x) => x !== id));
  render();
}

document.addEventListener("submit", (e) => {
  if (e.target.classList.contains("friend-add")) {
    e.preventDefault();
    addFriend();
  }
});

document.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-action='remove-friend']");
  if (btn) removeFriend(btn.dataset.id);
});

render();
