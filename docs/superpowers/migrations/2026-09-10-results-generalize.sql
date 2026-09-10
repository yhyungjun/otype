-- 멀티테스트 일반화: ocean_results → results, test_id 추가, RPC 갱신
-- ⚠️ 라이브 적용은 사용자 승인 + 프런트 컷오버(테이블명 results 참조)와 함께.
alter table public.ocean_results rename to results;

alter table public.results
  add column if not exists test_id text not null default 'ocean';  -- 기존 행 'ocean' 백필

create or replace function public.get_shared_result(p_share_id uuid)
returns table (nickname text, scores jsonb, created_at timestamptz, test_id text)
language sql security definer set search_path = public
as $$
  select nickname, scores, created_at, test_id
  from public.results
  where share_id = p_share_id
  limit 1;
$$;
grant execute on function public.get_shared_result(uuid) to anon, authenticated;
