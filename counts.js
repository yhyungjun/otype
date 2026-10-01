// 테스트별 참여수 — 공개 RPC get_test_counts(security definer, 집계값만 반환).
// 허브 카드와 테스트 인트로가 공유한다. 조회 실패 시 빈 객체를 돌려주고 화면은 참여수 없이 렌더한다.
// 참여수가 적을 때는 숨겨서(MIN_PARTICIPANTS_TO_SHOW 미만) 새 테스트가 빈약해 보이지 않게 한다.
const MIN_PARTICIPANTS_TO_SHOW = 10;

let _testCountsPromise = null;

function loadTestCounts() {
  if (!_testCountsPromise) {
    _testCountsPromise = sb
      .rpc("get_test_counts")
      .then(({ data, error }) => {
        if (error) { console.error("참여수 조회 실패:", error.message); return {}; }
        return Object.fromEntries((data || []).map((r) => [r.test_id, Number(r.cnt) || 0]));
      })
      .catch((e) => { console.error("참여수 조회 네트워크 오류:", e); return {}; });
  }
  return _testCountsPromise;
}

function participantsLabel(n) {
  return `참여 ${n.toLocaleString("ko-KR")}명`;
}
