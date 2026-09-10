// 공유 뷰 — 공개(비로그인) 요약 카드 렌더러.
// share.html?id=<share_id> 로 진입 → get_shared_result RPC 조회 → 요약 카드 렌더.
// 전역 sb(auth.js)·getTest(registry.js)·renderRadar(radar.js) 에 의존한다.
// 프로필은 row.test_id 로 테스트 모듈을 찾아 t.buildProfile(scores) 로 계산한다.

const root = document.getElementById("share-root");

// 메시지/오류 카드 렌더 — message 는 사용자 입력이 아니지만 일관성 위해 textContent 로 채운다.
// withCta 가 true 면 홈/검사 CTA 링크를 덧붙인다(미존재 결과 케이스).
function renderMessage(message, withCta) {
  const card = document.createElement("article");
  card.className = "share-card share-card--msg";

  const msg = document.createElement("p");
  msg.className = "sc-msg";
  msg.textContent = message;
  card.appendChild(msg);

  if (withCta) {
    const home = document.createElement("a");
    home.className = "btn btn-ghost";
    home.href = "index.html";
    home.textContent = "홈으로";
    card.appendChild(home);

    const retry = document.createElement("a");
    retry.className = "btn btn-primary";
    retry.href = "index.html";
    retry.textContent = "나도 검사하기";
    card.appendChild(retry);
  }

  root.replaceChildren(card);
}

// 요약 카드 렌더 — nickname 은 사용자 입력이므로 반드시 textContent 로만 채운다.
function renderCard(nickname, profile, scores, t) {
  const card = document.createElement("article");
  card.className = "share-card";
  // 스켈레톤은 innerHTML 로 만들되, 텍스트 필드는 아래에서 textContent 로 채운다.
  card.innerHTML = `
    <header class="sc-cover">
      <span class="sc-kicker">OCEAN 성격 검사</span>
      <div class="sc-emoji" aria-hidden="true"></div>
      <h2 class="sc-name"></h2>
      <p class="sc-type"></p>
      <p class="sc-role"></p>
    </header>
    <div class="sc-viz"></div>
    <blockquote class="sc-summary"></blockquote>`;

  const type = profile.type;
  card.querySelector(".sc-emoji").textContent = type.emoji || "";
  card.querySelector(".sc-name").textContent = `${nickname} 님`;
  card.querySelector(".sc-type").textContent = type.title;
  card.querySelector(".sc-role").textContent = `${type.code} · ${type.role}`;
  card.querySelector(".sc-summary").textContent = `“${profile.summary}”`;

  root.replaceChildren(card);
  t.renderSummaryViz(card.querySelector(".sc-viz"), scores);
}

async function main() {
  try {
    const id = new URLSearchParams(window.location.search).get("id");
    if (!id || !id.trim()) {
      renderMessage("공유할 결과 링크가 아니에요", false);
      return;
    }

    const { data, error } = await sb.rpc("get_shared_result", { p_share_id: id });
    const row = data && data[0];
    if (error || !row) {
      renderMessage("결과를 찾을 수 없어요", true);
      return;
    }

    const scores = row.scores;
    const t = getTest(row.test_id) || getTest("ocean");
    if (!t) {
      renderMessage("결과를 찾을 수 없어요", true);
      return;
    }
    const profile = t.buildProfile(scores);
    renderCard(row.nickname, profile, scores, t);
  } catch (e) {
    renderMessage("결과를 찾을 수 없어요", true);
  }
}

main();
