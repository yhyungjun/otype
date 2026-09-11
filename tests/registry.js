// 테스트 레지스트리 — 공용 셸이 test_id로 모듈을 찾는 단일 진입점.
const TESTS = [OCEAN_MODULE, MBTI_MODULE, REAL_MBTI_MODULE, ET_MODULE];
const TEST_MAP = Object.fromEntries(TESTS.map((t) => [t.meta.id, t]));
function getTest(id) { return TEST_MAP[id] || null; }
