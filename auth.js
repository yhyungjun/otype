// Supabase 인증 모듈 — 전역 `sb`(클라이언트)와 `Auth`(헬퍼)를 노출한다.
// supabase-js UMD 전역 `supabase.createClient`에 의존하므로 CDN 스크립트 뒤에 로드한다.
const SUPABASE_URL = "https://ydejsjrjminbyuquywuo.supabase.co";
const SUPABASE_ANON = "sb_publishable_xIO_-uuvgxT0KkiTUF4Hng_izDPe-UZ";

const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON);

const AUTOSTART_KEY = "otype:autostart";

const Auth = {
  async getSession() {
    const { data } = await sb.auth.getSession();
    return data.session;
  },
  // provider: "kakao" | "google" — 로그인 후 검사로 자동 진입하도록 플래그를 남기고 리다이렉트한다.
  signIn(provider) {
    sessionStorage.setItem(AUTOSTART_KEY, "1");
    const redirectTo = window.location.href.split("#")[0].split("?")[0];
    const options = { redirectTo };
    // 카카오는 account_email 동의가 비즈앱 전용이라 기본 요청 스코프(account_email)가 거부됨
    // → 닉네임만 요청해 이메일 스코프를 제외한다
    if (provider === "kakao") options.scopes = "profile_nickname";
    return sb.auth.signInWithOAuth({ provider, options });
  },
  async signOut() {
    await sb.auth.signOut();
    window.location.reload();
  },
  // 소셜 프로필에서 표시 이름 취득. 없으면 이메일 앞부분, 그것도 없으면 "사용자".
  displayName(session) {
    const m = session?.user?.user_metadata || {};
    const email = session?.user?.email || "";
    return m.name || m.full_name || m.nickname || (email ? email.split("@")[0] : "") || "사용자";
  },
};
