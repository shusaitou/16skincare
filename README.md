# 16skincare

このリポジトリは「肌質×パーソナルカラー」でメイク提案を行うWebアプリの雛形です。

セットアップ手順（ローカル）:

1. Node.js（推奨: 18.x 以上）をインストール
2. 依存をインストール

```bash
npm install
```

3. Supabase のプロジェクトを作成し、環境変数を設定

ファイル `.env.local` を作成し、以下を設定してください:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

4. 開発サーバー起動

```bash
npm run dev
```

## 実装済み

- **診断UI** (`app/diagnosis`): Framer Motion による画面遷移アニメーション、進捗バー、戻る機能、Zustand による回答state管理。全6問（肌質×2 / カラー×2 / 系統×2）。
- **コアアルゴリズム** (`lib/recommend.ts`): タグベースの動的フィルタリング。「なりたい系統」でメイク手法を抽出 → 肌質との矛盾を検出 → 相反する場合は高保湿スキンケア工程を先頭に自動挿入（補正処理）。
- **モックデータ** (`lib/techniques.ts`): `makeup_techniques` / `technique_tags` を Supabase スキーマと同形状で用意。DB 接続後は `getTechniques()` をクエリに差し替えるだけ。

## ディレクトリ

```
app/diagnosis/page.tsx    診断フロー（SPA）
components/QuestionCard.tsx 設問カード
components/ResultView.tsx   診断結果＋レコメンド表示
lib/types.ts              共有型（DBスキーマ対応）
lib/diagnosisStore.ts     設問データ + Zustandストア + スコア集計
lib/techniques.ts         手法・タグのモックデータ
lib/recommend.ts          コアアルゴリズム
lib/supabaseClient.ts     Supaクライアント
```

## 次にやること（Supabase / Vercel 担当と連携）

- Supabase スキーマ（questions, options, makeup_techniques, technique_tags）の作成
- API ルートでの診断保存と、`lib/recommend.ts` を使ったレコメンドの DB 版
- `.env.local` に Supabase の URL / anon key を設定（`.env.local.example` 参照）
