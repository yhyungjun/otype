-- 2026-10-01 · 테스트별 참여수 공개 RPC (적용됨: add_get_test_counts_rpc)
-- results 는 RLS 로 소유자만 SELECT 가능 → security definer 함수가 집계값(test_id, cnt)만 반환.
-- 허브 카드 메타(참여 N명)와 테스트 인트로 스탯이 anon/authenticated 로 호출한다.

create or replace function public.get_test_counts()
returns table(test_id text, cnt bigint)
language sql
security definer
set search_path = public
stable
as $$
  select test_id, count(*)::bigint as cnt
  from public.results
  group by test_id;
$$;

revoke all on function public.get_test_counts() from public;
grant execute on function public.get_test_counts() to anon, authenticated;

-- 검증: set role anon; select * from public.get_test_counts(); reset role;
