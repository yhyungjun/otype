// 허브 — 레지스트리의 테스트를 카드로 렌더. 카드 클릭 → test.html?id=<id>. 헤더 로그인 상태 표시.

function renderHub() {
  const grid = document.getElementById("test-grid");
  grid.replaceChildren(...TESTS.map((t) => {
    const a = document.createElement("a");
    a.className = "test-card";
    a.href = `test.html?id=${encodeURIComponent(t.meta.id)}`;
    const icon = document.createElement("div"); icon.className = "tc-icon"; icon.textContent = t.meta.icon || "🧪";
    const name = document.createElement("h3"); name.className = "tc-name"; name.textContent = t.meta.name;
    const tag = document.createElement("p"); tag.className = "tc-tag"; tag.textContent = t.meta.tagline || "";
    const meta = document.createElement("p"); meta.className = "tc-meta"; meta.dataset.testId = t.meta.id;
    meta.textContent = cardBasics(t);
    const body = document.createElement("div"); body.className = "tc-body"; body.append(name, tag, meta);
    a.append(icon, body);
    return a;
  }));
  fillParticipants(grid);
}

// 카드 메타의 고정 부분: 소요시간 · 문항수
function cardBasics(t) {
  return [t.meta.durationMin ? `약 ${t.meta.durationMin}분` : null, `${t.questions.length}문항`].filter(Boolean).join(" · ");
}

// 참여수는 RPC 응답 후 앞에 붙인다(MIN_PARTICIPANTS_TO_SHOW 미만이면 생략).
function fillParticipants(grid) {
  loadTestCounts().then((counts) => {
    grid.querySelectorAll(".tc-meta").forEach((meta) => {
      const n = counts[meta.dataset.testId] || 0;
      if (n < MIN_PARTICIPANTS_TO_SHOW) return;
      meta.textContent = `${participantsLabel(n)} · ${meta.textContent}`;
    });
  });
}

// 헤더 로그인 상태 표시(제공자 제공 이름은 textContent로 안전하게 삽입)
function updateAuthUI(session) {
  const el = document.getElementById("auth-status");
  if (!el) return;
  el.innerHTML = "";
  if (!session) return;
  const name = document.createElement("span");
  name.className = "auth-name";
  name.textContent = `${Auth.displayName(session)} 님`;
  const mine = document.createElement("a");
  mine.className = "auth-link";
  mine.href = "me.html";
  mine.textContent = "내 도감";
  const out = document.createElement("button");
  out.className = "auth-logout";
  out.dataset.action = "logout";
  out.textContent = "로그아웃";
  out.addEventListener("click", () => sb.auth.signOut().then(() => location.reload()));
  el.append(name, mine, out);
}

sb.auth.onAuthStateChange((_e, s) => updateAuthUI(s));
Auth.getSession().then(updateAuthUI);
renderHub();
