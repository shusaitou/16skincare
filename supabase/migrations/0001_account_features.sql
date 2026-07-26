-- =============================================================================
-- 16skincare: アカウント / 診断履歴 / お気に入り / ルーティン記録
-- Supabase SQL Editor にそのまま貼り付けて実行してください（再実行しても安全）。
--
-- 前提: Supabase Auth（メール認証）を有効化していること。
-- 方針: 全テーブルで RLS を有効にし、「自分の行だけ」読み書きできるようにする。
--       クライアント（anon key）から直接アクセスするため、RLS が唯一の防御線です。
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 0. 既存 users テーブルの RLS
--    auth_id の型が uuid / text どちらでも動くよう ::text で比較しています。
-- -----------------------------------------------------------------------------
alter table if exists public.users enable row level security;

do $$
begin
  if exists (select 1 from pg_tables where schemaname = 'public' and tablename = 'users') then
    drop policy if exists "users_select_own" on public.users;
    drop policy if exists "users_insert_own" on public.users;
    drop policy if exists "users_update_own" on public.users;

    create policy "users_select_own" on public.users
      for select using (auth.uid()::text = auth_id::text);
    create policy "users_insert_own" on public.users
      for insert with check (auth.uid()::text = auth_id::text);
    create policy "users_update_own" on public.users
      for update using (auth.uid()::text = auth_id::text)
                   with check (auth.uid()::text = auth_id::text);
  end if;
end $$;

-- users.auth_id に一意制約が無いと upsert(onConflict: 'auth_id') が失敗します。
do $$
begin
  if exists (select 1 from pg_tables where schemaname = 'public' and tablename = 'users') then
    begin
      alter table public.users add constraint users_auth_id_key unique (auth_id);
    exception
      when duplicate_table then null;  -- 既に同名制約がある
      when duplicate_object then null; -- 既に一意制約がある
    end;
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- 1. 診断履歴
--    再診断のたびに1行増える。steps は生成した手順のスナップショット（jsonb）で、
--    アルゴリズムを後から変更しても「当時の提案」を再現できるようにしておく。
-- -----------------------------------------------------------------------------
create table if not exists public.diagnosis_history (
  id           uuid primary key default gen_random_uuid(),
  auth_id      uuid not null references auth.users (id) on delete cascade,
  gender       text not null check (gender in ('men', 'women')),
  skin_type    text not null check (skin_type in ('dry', 'oily', 'combination', 'normal')),
  color_type   text not null check (color_type in ('spring', 'summer', 'autumn', 'winter')),
  style        text not null check (style in ('mode', 'clean', 'glow')),
  totals       jsonb not null default '{}'::jsonb,
  steps        jsonb not null default '[]'::jsonb,
  correction_reason text,
  created_at   timestamptz not null default now()
);

create index if not exists diagnosis_history_auth_id_created_at_idx
  on public.diagnosis_history (auth_id, created_at desc);

alter table public.diagnosis_history enable row level security;

drop policy if exists "diagnosis_history_select_own" on public.diagnosis_history;
drop policy if exists "diagnosis_history_insert_own" on public.diagnosis_history;
drop policy if exists "diagnosis_history_delete_own" on public.diagnosis_history;

create policy "diagnosis_history_select_own" on public.diagnosis_history
  for select using (auth.uid() = auth_id);
create policy "diagnosis_history_insert_own" on public.diagnosis_history
  for insert with check (auth.uid() = auth_id);
create policy "diagnosis_history_delete_own" on public.diagnosis_history
  for delete using (auth.uid() = auth_id);

-- -----------------------------------------------------------------------------
-- 2. お気に入り（手順 / 製品のブックマーク）
--    item_key は手順なら technique_id、製品なら "brand::name"。
--    label / sublabel は表示用スナップショット（マスタが変わっても一覧が壊れない）。
-- -----------------------------------------------------------------------------
create table if not exists public.favorites (
  id         uuid primary key default gen_random_uuid(),
  auth_id    uuid not null references auth.users (id) on delete cascade,
  item_type  text not null check (item_type in ('step', 'product')),
  item_key   text not null,
  label      text not null,
  sublabel   text,
  created_at timestamptz not null default now(),
  unique (auth_id, item_type, item_key)
);

create index if not exists favorites_auth_id_created_at_idx
  on public.favorites (auth_id, created_at desc);

alter table public.favorites enable row level security;

drop policy if exists "favorites_select_own" on public.favorites;
drop policy if exists "favorites_insert_own" on public.favorites;
drop policy if exists "favorites_delete_own" on public.favorites;

create policy "favorites_select_own" on public.favorites
  for select using (auth.uid() = auth_id);
create policy "favorites_insert_own" on public.favorites
  for insert with check (auth.uid() = auth_id);
create policy "favorites_delete_own" on public.favorites
  for delete using (auth.uid() = auth_id);

-- -----------------------------------------------------------------------------
-- 3. ルーティン記録（日付 × 手順のチェック）
--    log_date はユーザーのローカル日付を 'YYYY-MM-DD' で保存する（タイムゾーン非依存）。
--    チェックを外したら行を削除する運用なので、行の存在 = 実施済み。
-- -----------------------------------------------------------------------------
create table if not exists public.routine_logs (
  id         uuid primary key default gen_random_uuid(),
  auth_id    uuid not null references auth.users (id) on delete cascade,
  log_date   date not null,
  step_id    text not null,
  created_at timestamptz not null default now(),
  unique (auth_id, log_date, step_id)
);

create index if not exists routine_logs_auth_id_log_date_idx
  on public.routine_logs (auth_id, log_date desc);

alter table public.routine_logs enable row level security;

drop policy if exists "routine_logs_select_own" on public.routine_logs;
drop policy if exists "routine_logs_insert_own" on public.routine_logs;
drop policy if exists "routine_logs_delete_own" on public.routine_logs;

create policy "routine_logs_select_own" on public.routine_logs
  for select using (auth.uid() = auth_id);
create policy "routine_logs_insert_own" on public.routine_logs
  for insert with check (auth.uid() = auth_id);
create policy "routine_logs_delete_own" on public.routine_logs
  for delete using (auth.uid() = auth_id);
