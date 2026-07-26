-- =============================================================================
-- 16skincare: users テーブルの RLS 修正（0001 の後に必ず実行してください）
--
-- 【なぜ必要か】
-- 0001 では users に対して自前のポリシー（users_select_own 等）だけを
-- drop してから作り直していました。しかし users には初期構築時に作られた
-- 別名の緩いポリシー（誰でも select / insert できるもの）が残っており、
-- PostgreSQL の PERMISSIVE ポリシーは OR で評価されるため、
-- 1つでも通るものがあるとアクセスが許可されてしまいます。
--
-- 実測（anon キー = リポジトリに公開されている鍵）:
--   - users の全行が読めた            → 全ユーザーの肌質データが公開状態
--   - users への INSERT が 201 で成功 → 誰でも任意の行を作れる状態
--   （diagnosis_history / favorites / routine_logs / マスタ系は正しく 42501 で遮断）
--
-- 【このSQLですること】
--   1. users に残っている全ポリシーを名前に関係なく一旦削除する
--   2. 「自分の行だけ」の正しいポリシーだけを作り直す
--   3. 検証で混入したゴミ行を削除する
--   4. auth_id を NOT NULL + auth.users への外部キーにして、
--      そもそも所有者不明の行を作れないようにする
--
-- 再実行しても安全です。
-- =============================================================================

alter table public.users enable row level security;

-- --- 1. 既存ポリシーを名前に関係なく全削除 -----------------------------------
do $$
declare
  pol record;
begin
  for pol in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'users'
  loop
    execute format('drop policy %I on public.users', pol.policyname);
  end loop;
end $$;

-- --- 2. 検証で混入したゴミ行の削除 -------------------------------------------
-- auth_id が無い行（所有者不明）と、疎通確認に使ったゼロUUIDの行。
-- 実ユーザーの auth_id はランダムな UUID v4 なのでゼロUUIDと衝突しません。
delete from public.users where auth_id is null;
delete from public.users where auth_id = '00000000-0000-0000-0000-000000000000';

-- --- 3. 所有者不明の行を作れないようにする -----------------------------------
alter table public.users alter column auth_id set not null;

do $$
begin
  alter table public.users
    add constraint users_auth_id_fkey
    foreign key (auth_id) references auth.users (id) on delete cascade;
exception
  when duplicate_object then null; -- 既に同じ外部キーがある
end $$;

-- --- 4. 正しいポリシーだけを作り直す -----------------------------------------
create policy "users_select_own" on public.users
  for select using (auth.uid() = auth_id);

create policy "users_insert_own" on public.users
  for insert with check (auth.uid() = auth_id);

create policy "users_update_own" on public.users
  for update using (auth.uid() = auth_id)
               with check (auth.uid() = auth_id);

create policy "users_delete_own" on public.users
  for delete using (auth.uid() = auth_id);

-- =============================================================================
-- 実行後の確認（ターミナルから。<URL> <ANON_KEY> は .env.local.example の値）
--
--   U="<URL>"; K="<ANON_KEY>"
--   # 期待: [] （他人の行が1件も見えない）
--   curl -s -H "apikey: $K" "$U/rest/v1/users?select=*"
--   # 期待: 42501 row-level security
--   curl -s -X POST "$U/rest/v1/users" -H "apikey: $K" \
--     -H "Authorization: Bearer $K" -H "Content-Type: application/json" -d '{}'
-- =============================================================================
