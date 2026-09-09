-- 마이그레이션: 친구 결과 공유 대시보드 (share_id 컬럼 + 공개 읽기 RPC)
-- 대상: Supabase ref ydejsjrjminbyuquywuo · public.ocean_results
-- 참조 스펙: docs/superpowers/specs/2026-08-15-share-dashboard-design.md §2
--
-- ⚠️ 적용 전 하드 승인 게이트: 사용자 명시 승인 후에만 라이브 적용.
-- ⚠️ 컷오버 순서: 이 마이그레이션은 새 프런트엔드 배포와 함께/직전에 적용.
--    (구 프런트엔드는 share_id 컬럼이 없어도 정상 동작하지만, 새 저장 코드는
--     insert 시 .select("share_id")를 요구하므로 컬럼이 있어야 저장이 성공한다.)
--
-- 현재 DB 사실(적용 판단 근거):
--   - user_id 컬럼 이미 존재(default auth.uid()).
--   - INSERT 정책 auth_insert_results(authenticated)만 존재. SELECT 정책 없음
--     → 직접 select는 전면 차단(소유자 포함). 공개 읽기는 오직 아래 RPC로만.

-- 1) 공유 토큰 컬럼 (기존 행은 각각 새 uuid로 백필됨)
alter table public.ocean_results
  add column if not exists share_id uuid not null default gen_random_uuid();

create unique index if not exists ocean_results_share_id_key
  on public.ocean_results (share_id);

-- 2) 공개 읽기용 RPC — 유일한 공개 경로. 최소 노출(이름·점수·생성일만).
--    answers·user_id·다른 행은 절대 반환하지 않는다.
create or replace function public.get_shared_result(p_share_id uuid)
returns table (nickname text, scores jsonb, created_at timestamptz)
language sql
security definer
set search_path = public
as $$
  select nickname, scores, created_at
  from public.ocean_results
  where share_id = p_share_id
  limit 1;
$$;

-- 3) anon·authenticated 실행 권한 (테이블 직접 접근 RLS는 그대로: 직접 select 불가)
grant execute on function public.get_shared_result(uuid) to anon, authenticated;
