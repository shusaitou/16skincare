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

ファイル構成の雛形を追加しました: Next.js App Router (TypeScript), TailwindCSS, Supabase クライアント。

次に行うことの候補:
- 診断画面(`app/diagnosis`)の実装
- Supabase スキーマ（questions, options, makeup_techniques, technique_tags）の作成
- API ルートでの診断保存とレコメンドロジック実装
