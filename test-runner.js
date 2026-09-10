// 공용 러너 — ?id 로 지정한 테스트 모듈을 호스팅한다. 테스트 비의존(test-agnostic).
// 문항·채점·프로필·결과 렌더는 전부 모듈(test.*)에 위임하고, 러너는 흐름/인증/저장/공유만 담당한다.
// 인증·저장은 auth.js의 전역 `sb`/`Auth` 사용. 레지스트리 getTest 로 모듈 해석.

const AUTOSELECT_DELAY_MS = 220;

// 모듈 해석: ?id 로 등록된 테스트를 찾는다. 없으면 not-found 카드로 대체하고 중단.
const test = getTest(new URLSearchParams(location.search).get("id"));

function guardTest() {
  const main = document.querySelector("main.container");
  if (!main) return;
  main.innerHTML = `
    <section class="view active">
      <div class="name-card">
        <span class="name-badge">앗</span>
        <h2 class="name-title">테스트를 찾을 수 없어요</h2>
        <p class="name-sub">요청하신 검사가 존재하지 않거나 준비 중이에요.</p>
        <a class="btn btn-primary btn-lg" href="index.html">홈으로</a>
      </div>
    </section>`;
}

if (!test) {
  guardTest();
} else {
  runTest(test);
}

function runTest(test) {
  const state = {
    index: 0,
    answers: [],
    nickname: "",
    userId: null,
    lastShareId: null,
    lastResult: null,
  };

  const views = {
    intro: document.getElementById("view-intro"),
    login: document.getElementById("view-login"),
    test: document.getElementById("view-test"),
    result: document.getElementById("view-result"),
  };

  function show(name) {
    Object.values(views).forEach((v) => v.classList.remove("active"));
    views[name].classList.add("active");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /* ---------- 인트로 렌더 (test.meta 기반; 디스커버/FAQ 토글) ---------- */
  // 인트로 화면(hero/스탯/예시문항/디스커버/FAQ)을 test.meta 로 채운다. 러너는 test-agnostic 유지.
  function renderIntro(test) {
    const meta = test.meta;

    document.getElementById("intro-title").textContent = meta.name;
    document.getElementById("intro-lead").textContent = meta.introLead || meta.tagline || "";
    document.getElementById("stat-count").textContent = String(test.questions.length);
    document.getElementById("stat-duration").textContent = meta.durationMin ? `${meta.durationMin}분` : "—";
    document.getElementById("intro-sample").textContent = meta.sampleQuestion || "";
    document.getElementById("intro-start").textContent = `${meta.name} 시작하기`;

    // 디스커버: 미리보기 렌더러가 있는 테스트만 노출.
    const discover = document.getElementById("intro-discover");
    if (typeof test.renderDiscoverPreviews === "function") {
      test.renderDiscoverPreviews(document);
      discover.hidden = false;
    } else {
      discover.hidden = true;
    }

    // FAQ: meta.faq 가 있으면 재구성, 없으면 섹션 숨김.
    const faqSection = document.getElementById("intro-faq");
    if (meta.faq?.length) {
      const list = document.getElementById("faq-list");
      list.innerHTML = "";
      meta.faq.forEach(({ q, a }) => {
        const details = document.createElement("details");
        const summary = document.createElement("summary");
        summary.textContent = q;
        const p = document.createElement("p");
        p.textContent = a;
        details.append(summary, p);
        list.appendChild(details);
      });
      faqSection.hidden = false;
    } else {
      faqSection.hidden = true;
    }
  }

  /* ---------- 검사 렌더 (모듈의 questions/scaleSize/scaleLabels 로 일반화) ---------- */
  function renderQuestion() {
    const i = state.index;
    const q = test.questions[i];
    const total = test.questions.length;

    document.getElementById("q-counter").textContent = `${i + 1} / ${total}`;
    const pct = Math.round(((i + 1) / total) * 100);
    document.getElementById("q-percent").textContent = `${pct}%`;
    document.getElementById("progress-bar").style.width = `${pct}%`;

    document.getElementById("q-index").textContent = `Q${i + 1}`;
    document.getElementById("q-text").textContent = q.text;

    const box = document.getElementById("scale-options");
    box.innerHTML = "";
    const size = test.meta.scaleSize;
    const labels = test.meta.scaleLabels || [];
    for (let value = 1; value <= size; value++) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "scale-btn" + (state.answers[i] === value ? " selected" : "");
      btn.setAttribute("role", "radio");
      btn.setAttribute("aria-checked", state.answers[i] === value);
      // 값별 라벨(모듈이 값 개수만큼 제공). 없으면 숫자로 폴백 → 어떤 테스트든 일반 동작.
      const labelText = document.createElement("span");
      labelText.textContent = labels[value - 1] || String(value);
      const marker = document.createElement("span");
      marker.className = "marker";
      btn.appendChild(marker);
      btn.appendChild(labelText);
      btn.addEventListener("click", () => selectAnswer(value));
      box.appendChild(btn);
    }

    document.getElementById("btn-prev").style.visibility = i === 0 ? "hidden" : "visible";
  }

  function selectAnswer(value) {
    state.answers[state.index] = value;
    renderQuestion();
    setTimeout(() => {
      if (state.index < test.questions.length - 1) {
        state.index += 1;
        renderQuestion();
      } else {
        finish();
      }
    }, AUTOSELECT_DELAY_MS);
  }

  /* ---------- 결과 (채점·프로필·렌더를 모듈에 위임) ---------- */
  function finish() {
    const scores = test.score(state.answers);
    const profile = test.buildProfile(scores);
    state.lastResult = { scores, profile };
    test.renderResult(document.getElementById("result-mount"), {
      scores,
      profile,
      nickname: state.nickname,
    });
    saveResult(scores, profile);
    show("result");
  }

  /* ---------- 액션 ---------- */
  function start() {
    state.index = 0;
    state.answers = new Array(test.questions.length).fill(null);
    renderQuestion();
    show("test");
  }

  // 로그인 게이트: 세션 없으면 로그인 화면, 있으면 검사 시작
  async function beginFlow() {
    const session = await Auth.getSession();
    if (!session) { show("login"); return; }
    beginTest(session);
  }

  function beginTest(session) {
    state.nickname = Auth.displayName(session);
    state.userId = session.user.id;
    start();
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
    mine.textContent = "내 결과";
    const out = document.createElement("button");
    out.className = "auth-logout";
    out.dataset.action = "logout";
    out.textContent = "로그아웃";
    el.append(name, mine, out);
  }

  // Supabase 저장 (로그인 사용자 insert, 실패해도 결과 화면은 정상 표시).
  // test_id 를 포함해 results 테이블에 저장하고, share_id 를 받아 공유 링크 생성에 사용한다.
  function saveResult(scores, profile) {
    state.lastShareId = null;
    updateShareButton();
    if (!state.nickname || !state.userId) return;
    sb.from("results")
      .insert({
        // user_id를 명시적으로 전송(컬럼 기본값 auth.uid()가 insert 시점에 채워지지 않는 문제 회피).
        // RLS의 WITH CHECK(user_id = auth.uid())가 위조를 막는다.
        test_id: test.meta.id,
        user_id: state.userId,
        nickname: state.nickname,
        type_code: profile.type.code,
        type_title: profile.type.title,
        type_role: profile.type.role,
        scores,
        answers: state.answers,
      })
      .select("share_id")
      .single()
      .then(({ data, error }) => {
        if (error) { console.error("결과 저장 실패:", error.message); return; }
        state.lastShareId = data?.share_id || null;
        updateShareButton();
      })
      .catch((e) => console.error("결과 저장 네트워크 오류:", e));
  }

  // 공유 버튼은 share_id가 준비되기 전까지 비활성.
  function updateShareButton() {
    const btn = document.querySelector('[data-action="share"]');
    if (btn) btn.disabled = !state.lastShareId;
  }

  // 결과 요약 카드 공개 링크(share.html?id=…)를 클립보드에 복사. 배포 경로는 현재 문서 기준으로 해석.
  function shareResult() {
    if (!state.lastShareId) { toast("공유 링크를 준비 중이에요"); return; }
    const url = new URL("share.html", location.href);
    url.searchParams.set("id", state.lastShareId);
    navigator.clipboard?.writeText(url.href).then(
      () => toast("공유 링크를 복사했어요 ✓"),
      () => toast("복사에 실패했어요")
    );
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
    const { profile } = state.lastResult || {};
    if (!profile) return;
    const text = `[${test.meta.name}] ${state.nickname ? `${state.nickname}님 · ` : ""}${profile.type.title} · ${profile.type.code} ${profile.type.role}\n한 줄 요약: ${profile.summary}`;
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

      const title = state.lastResult?.profile?.type?.title || test.meta.name;
      const prefix = test.meta.id;   // 테스트별 파일명(러너를 테스트 무관하게)
      const fileName = `${prefix}_${title.replace(/^The\s+/, "").replace(/\s+/g, "_")}.png`;
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
    if (action === "start") beginFlow();
    else if (action === "login-kakao") Auth.signIn("custom:kakao");
    else if (action === "login-google") Auth.signIn("google");
    else if (action === "logout") Auth.signOut();
    else if (action === "prev") { if (state.index > 0) { state.index -= 1; renderQuestion(); } }
    else if (action === "restart" || action === "home") { show("intro"); }
    else if (action === "copy") copyResult();
    else if (action === "share") shareResult();
    else if (action === "save-image") saveImage(btn);
  });

  // 세션 변화 → 헤더 갱신. 로그인 직후(자동시작 플래그)면 검사로 바로 진입.
  sb.auth.onAuthStateChange((event, session) => {
    updateAuthUI(session);
    // 실제 로그인(SIGNED_IN)에서만 자동시작 — 지속 세션의 페이지 로드(INITIAL_SESSION)나 묵은 플래그로 오작동 방지
    if (event === "SIGNED_IN" && session && sessionStorage.getItem(AUTOSTART_KEY)) {
      sessionStorage.removeItem(AUTOSTART_KEY);
      beginTest(session);
    }
  });

  renderQuestion();
  // 인트로를 test.meta 로 채운 뒤 노출(디스커버 미리보기 렌더도 renderIntro 내부에서 수행).
  renderIntro(test);
  show("intro");
}
