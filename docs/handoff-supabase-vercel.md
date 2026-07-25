# 【依頼】Supabase セットアップ & Vercel デプロイ

16skincare アプリに「アカウント・診断履歴・お気に入り・ルーティン記録・PWA」を追加しました。
アプリ側の実装は完了していますが、**Supabase の設定が終わるまでアカウント機能は動きません**。
以下の作業をお願いします。

- 対象リポジトリ: `shusaitou/16skincare`
- 対象ブランチ: `account`
- Supabase プロジェクト URL / anon キー: リポジトリの `.env.local.example` を参照

作業は **A（Supabase）→ B（Vercel）→ C（検証）** の順で進めてください。
A の 1 が終わらないとアプリのログイン機能は動きません。

---

## A. Supabase

### A-1. マイグレーション SQL の実行（必須・最優先）

リポジトリの `supabase/migrations/0001_account_features.sql` を、
Supabase ダッシュボード → **SQL Editor** → New query に貼り付けて Run してください。

```bash
# macOS ならこれでクリップボードにコピーできます
pbcopy < supabase/migrations/0001_account_features.sql
```

このSQLで作られるもの:

| 対象 | 内容 |
| --- | --- |
| `diagnosis_history` | 診断履歴（手順のスナップショット付き） |
| `favorites` | お気に入り（手順・製品のブックマーク） |
| `routine_logs` | 日々のルーティン実施記録 |
| 既存 `users` | RLS ポリシーと `auth_id` の一意制約を追加 |

**再実行しても安全**な書き方（`if not exists` / `drop policy if exists`）にしてあります。

> ⚠️ **`users` テーブルの RLS はこのSQLで初めて有効になります。**
> このアプリはブラウザから anon キーで Supabase に直接アクセスする構成で、
> anon キーはリポジトリに公開されています。つまり **RLS が唯一の防御線**です。
> 「とりあえず動かすために RLS を無効化する」ことは絶対にしないでください。
> 動かない場合は RLS を切るのではなく、ポリシーの条件（`auth.uid() = auth_id`）を確認してください。

確認済みの前提（こちらで調査済み）:
- `users.auth_id` は `uuid` 型 → SQLはそのまま通ります
- `questions` / `options` / `makeup_techniques` / `technique_tags` は作成済み・データ入り → **触りません**

### A-2. メール認証の有効化（必須）

**Authentication → Sign In / Providers → Email** を有効化してください。

- 開発・デモ段階では、同じ画面の **Confirm email を OFF** にしてください。
  ON のままだと、新規登録してもメールのリンクを踏むまでログインできず、動作確認が止まります。
- 本番公開時に Confirm email を ON に戻す想定です。

アプリ側は「メール＋パスワード」と「マジックリンク」の両方に対応済みなので、
プロバイダの追加設定は不要です。

### A-3. URL 設定（デプロイ後に必須）

**Authentication → URL Configuration**

| 項目 | 値 |
| --- | --- |
| Site URL | `https://<本番ドメイン>` |
| Redirect URLs | `https://<本番ドメイン>/**` と `http://localhost:3000/**` |

マジックリンクとメール確認の戻り先に使われます。**未設定だとリンクを踏んでもログインが完了しません。**
Vercel のプレビューURLでも確認したい場合は、プレビュー用ドメインのパターンも追加してください。

---

## B. Vercel

### B-1. 環境変数

以下2つを **Production / Preview / Development すべて**に設定してください（値は `.env.local.example` 参照）。

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
```

> ⚠️ **`NEXT_PUBLIC_*` はビルド時にコードへ埋め込まれます。**
> 値を後から変更した場合、再デプロイしないと反映されません。
> 「環境変数を直したのに動かない」時はこれが原因のことが多いです。

> ⚠️ **`service_role` キーは絶対に設定しないでください。**
> このアプリはブラウザから直接 Supabase を呼ぶ構成で、`NEXT_PUBLIC_*` は
> クライアントに露出します。service_role キーを入れると RLS が全て無効化され、
> 全ユーザーのデータが誰でも読み書きできる状態になります。

### B-2. デプロイ

- Framework は Next.js が自動検出されます（追加のビルド設定は不要）
- ビルドコマンド・出力ディレクトリはデフォルトのままで通ります
- `.env.local` はリポジトリに含まれていません（gitignore 済み）。**コミットしないでください。**

CLI から行う場合:

```bash
npx vercel link
npx vercel env add NEXT_PUBLIC_SUPABASE_URL production
npx vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
npx vercel --prod
```

---

## C. 検証

### C-1. テーブルが作成されたか

`<URL>` と `<ANON_KEY>` は `.env.local.example` の値に置き換えてください。

```bash
U="<URL>"; K="<ANON_KEY>"
for t in diagnosis_history favorites routine_logs; do
  curl -s -o /dev/null -w "$t %{http_code}\n" -H "apikey: $K" "$U/rest/v1/$t?select=*&limit=1"
done
```

**期待値: 3つとも `200`。** マイグレーション前は `404` です。

### C-2. RLS が効いているか（重要）

未ログイン状態で他人の行を書き込めないことを確認します。

```bash
curl -s -X POST "$U/rest/v1/diagnosis_history" \
  -H "apikey: $K" -H "Authorization: Bearer $K" -H "Content-Type: application/json" \
  -d '{"auth_id":"00000000-0000-0000-0000-000000000000","gender":"women","skin_type":"dry","color_type":"autumn","style":"mode"}'
```

**期待値: `401` か `403`、`row-level security policy` を含むエラー。**
ここで `201`（作成成功）が返ったら **RLS が効いていません**。A-1 のSQLを実行し直してください。

### C-3. アプリ上での動作確認

1. `/login` で新規登録 → そのままログインできる（Confirm email が OFF の場合）
2. `/diagnosis` で診断を最後まで進める
3. `/mypage` の各タブを確認
   - **ルーティン**: 今日のチェックリストが出て、チェックが保存される
   - **診断履歴**: さっきの診断が記録されている（2回目以降は前回との差分が出る）
   - **お気に入り**: 結果画面で ☆ を押したものが並ぶ
4. ログアウト → 再ログインしてデータが残っていることを確認
5. 別の端末・ブラウザでログインして、同じデータが見えることを確認

---

## 補足

### やらなくていいこと

`makeup_techniques` に `gender` 列が無いことは確認済みですが、**今回は対応不要**です。
手順データはアプリ内の `lib/techniques.ts`（モック）から読んでいます。
DB スキーマの拡張（`gender` 列 / 成分・製品の子テーブル / 手順ガイドの子テーブル）は、
`lib/recommend.ts` の `getTechniques()` を DB クエリに差し替える段階で改めて相談させてください。

### 補足: Supabase 未設定でもアプリは壊れません

未ログイン時は localStorage に保存し、ログインした瞬間にアカウントへ引き継ぐ設計です。
そのため設定作業の途中でもアプリ自体は動きます。
「ログインできない」「別端末でデータが見えない」場合が、この設定漏れのサインです。

### 詰まったら

- ログインできない → A-2 の Confirm email 設定、A-3 の URL 設定
- ログインは通るがデータが保存されない → A-1 のSQL未実行、または C-2 で RLS の条件ミス
- ローカルでは動くが本番で動かない → B-1 の環境変数（設定後に再デプロイしたか）
