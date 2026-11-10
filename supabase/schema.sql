-- Stat Eleven 클라우드 세이브 테이블
-- Supabase 대시보드 → SQL Editor 에 붙여넣고 Run

create table if not exists public.game_saves (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  data       jsonb       not null,
  version    integer     not null default 1,
  summary    jsonb,
  updated_at timestamptz not null default now()
);

-- 본인 세이브만 읽고 쓸 수 있도록 행 단위 보안(RLS) 적용
alter table public.game_saves enable row level security;

drop policy if exists "read own save" on public.game_saves;
create policy "read own save" on public.game_saves
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "insert own save" on public.game_saves;
create policy "insert own save" on public.game_saves
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "update own save" on public.game_saves;
create policy "update own save" on public.game_saves
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "delete own save" on public.game_saves;
create policy "delete own save" on public.game_saves
  for delete to authenticated
  using ((select auth.uid()) = user_id);
