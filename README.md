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

- **診断UI** (`app/diagnosis`): コスメ誌エディトリアル風デザイン（明朝見出し・暖色ニュートラル）。Framer Motion による画面遷移、進捗バー、戻る機能、Zustand で state 管理。フローは `性別 → 肌質×2・カラー×2 → なりたい系統 → 結果`。
- **性別対応**: 冒頭でメンズ/レディースを選択し、手法の `gender`(unisex/men/women) で出し分け。メンズ専用手法（ヒゲ剃り後保湿・皮脂対策・ナチュラル眉）を用意。
- **成分・製品提案**: 各手順に「注目成分」と「代表製品の一例」を表示（免責つき）。
- **コアアルゴリズム** (`lib/recommend.ts`): タグベースの動的フィルタリング。性別・系統・カラーで手法を抽出 → 肌質との矛盾を検出 → 相反時は高保湿工程を先頭に自動挿入（補正処理）。
- **API** (`app/api/diagnosis`): 入力検証 → users保存(任意) → 手順をJSON返却。
- **テスト** (`tests/`): Vitest で補正・フィルタ・性別出し分け・成分/製品受け渡し・バリデーションを検証（`npm test`）。
- **モックデータ** (`lib/techniques.ts`): DB 接続後は `getTechniques()` をクエリに差し替えるだけ。

### DB担当への申し送り（スキーマ拡張が必要な項目）
- `makeup_techniques` に `gender`(text: unisex/men/women) 列を追加
- 手法の成分・製品は子テーブル（例: `technique_ingredients` / `technique_products`）が必要
- `technique_tags.tag_type` の CHECK制約は現状 skin/color/style のまま（gender はタグではなく列で持つ想定）

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
