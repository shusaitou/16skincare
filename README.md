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

> `NEXT_PUBLIC_*` は**ビルド時に埋め込まれる**ため、値を変えたら再ビルドが必要です。

4. DB スキーマを作成（アカウント機能を使う場合）

Supabase ダッシュボードの SQL Editor で
[`supabase/migrations/0001_account_features.sql`](supabase/migrations/0001_account_features.sql)
を実行してください（再実行しても安全です）。診断履歴・お気に入り・ルーティン記録のテーブルと、
「自分の行だけ読み書きできる」RLS ポリシーが作成されます。

あわせて Authentication → Providers で **Email** を有効化します。
開発中はメール確認（Confirm email）をオフにすると、登録直後にそのままログインできます。

5. 開発サーバー起動

```bash
npm run dev
```

## 実装済み

- **診断UI** (`app/diagnosis`): コスメ誌エディトリアル風デザイン（明朝見出し・暖色ニュートラル）。Framer Motion による画面遷移、進捗バー、戻る機能、Zustand で state 管理。フローは `性別 → 肌質×2・カラー×2 → なりたい系統 → 結果`。
- **性別対応**: 冒頭でメンズ/レディースを選択し、手法の `gender`(unisex/men/women) で出し分け。メンズ専用手法（ヒゲ剃り後保湿・皮脂対策・ナチュラル眉）を用意。
- **16タイプ診断** (`lib/persona.ts`): 肌質(4: 乾燥/脂性/混合/普通)×パーソナルカラー(4シーズン)=**ちょうど16タイプ**。型名・コード・強み・注意点を合成生成（MBTI風のアイデンティティ）。
- **参考メイク（ミューズ）** (`lib/muses.ts`): 色×系統から「参考にしたい雰囲気」と検索キーワードを提示。実在人物名は誤情報回避のため既定は空で、検証済みリストを差し込める構造。
- **カラーパレット** (`lib/palette.ts`): シーズン別に「似合う色／苦手な色／似合う金属」を色見本で表示。
- **スコア可視化** (`components/ScoreChart.tsx`): 肌質・カラーのスコア内訳を横棒で表示（単一系列・accent一色）。
- **シェアカード** (`components/ShareCard.tsx`): 結果をカード化し、PNG保存／Web Share／テキストコピーに対応（html-to-image）。
- **成分・製品提案**: 各手順に「注目成分」と「代表製品の一例」を表示（免責つき）。
- **コアアルゴリズム** (`lib/recommend.ts`): タグベースの動的フィルタリング。性別・系統・カラーで手法を抽出 → 肌質との矛盾を検出 → 相反時は高保湿工程を先頭に自動挿入（補正処理）。
- **API** (`app/api/diagnosis`): 入力検証 → users保存(任意) → 手順をJSON返却。
- **テスト** (`tests/`): Vitest で補正・フィルタ・性別出し分け・成分/製品受け渡し・バリデーションを検証（`npm test`）。
- **モックデータ** (`lib/techniques.ts`): DB 接続後は `getTechniques()` をクエリに差し替えるだけ。

### リテンション機能（アカウント / 履歴 / お気に入り / ルーティン / PWA）

これらは **未ログインでも動作**します。未ログイン時は localStorage に保存し、
ログインした瞬間に Supabase のアカウントへ引き継がれます（`merge*` 系関数）。
Supabase 未設定でもアプリは壊れません。

- **アカウント & 診断履歴** (`app/login`, `lib/historyRepository.ts`): メールアドレス＋パスワード /
  マジックリンクでログイン。診断が終わるたびに `diagnosis_history` に1件記録され、
  そのときの手順（steps）もスナップショットとして残ります。
- **再診断の変化を比較** (`lib/historyDiff.ts`): 履歴一覧で、1つ前の診断からの差分
  （例: 乾燥肌 → 混合肌）を表示。
- **お気に入り** (`lib/favoritesRepository.ts`, `components/FavoriteButton.tsx`): 結果画面の各手順・
  各製品の ☆ でブックマーク。楽観更新で即座に反映し、失敗時は元に戻します。
- **ルーティン・チェックリスト** (`components/RoutineChecklist.tsx`, `lib/streak.ts`):
  最新の診断結果の手順を今日のチェックリストとして表示。連続日数 / 最長記録 / 実施日数と、
  直近4週間の達成率ヒートマップで継続を可視化します。日付は常にローカル日付で扱うため、
  深夜に日付がずれません。
- **リマインド** (`components/ReminderSettings.tsx`, `lib/reminder.ts`): 指定時刻に通知。
  通知タップで `?tab=routine` に戻ります。
- **PWA** (`public/manifest.webmanifest`, `public/sw.js`): ホーム画面に追加でき、
  オフラインでも起動可能。Service Worker は本番ビルドでのみ登録されます（HMR との衝突回避）。

> リマインドの制約: Web Push（アプリを閉じていても届く通知）にはサーバーと VAPID 鍵が必要なため、
> 現状は**アプリを開いている間に届くローカル通知**です。UI にもその旨を明記しています。

### 続けた結果を見せる（記録タブ）

診断 → ルーティン → チェック で終わらせず、「で、どうなったの？」に答えるための画面
(`components/ProgressPanel.tsx`, `lib/progress.ts`)。マイページの **記録** タブ。

- **再診断のおすすめ**: 前回の診断から30日経つと表示。その間のルーティン実施日数も添える
- **今週の記録**: 実施した日数・チェック回数と、続いている工程 / 今週チェックしなかった工程。
  落ちた工程が多い週は時短モードへ誘導する
- **診断スコアの推移**: 再診断のたびのスコアを軸内の割合（%）に正規化してスパークライン表示。
  設問数が変わっても比較できる

> ⚠️ **表現の制約（薬機法）**: ここで扱うのは「診断の回答にもとづくスコアの推移」と
> 「実施日数」という**事実だけ**です。「肌が改善した」「効果があった」といった
> 化粧品の効能を主張する表現は使いません。UI にも
> 「診断の回答にもとづくスコアの推移であり、肌の状態の測定値ではありません」と明記しています。
> 文言を変える際もこの方針を守ってください（`lib/progress.ts` 冒頭にも記載）。

### 初心者サポート（時短モード / インタラクティブ手順カード）

- **時短・ミニマムメイクモード** (`lib/recommend.ts` の `stepsForMode`):
  「フルルーティン ⇄ 時短・最低限」を切り替え。時短は**性別ごとにちょうど3ステップ**
  （男性: 保湿 → BB → 眉 / 女性: 保湿 → 下地 → リップ）になるよう、手法側の
  `minimalFor` で指定しています。結果画面とマイページのルーティン、どちらでも切り替え可能。
  - 補正（高保湿工程）が発生する組み合わせでも、時短では**工程を増やさず注意書きで伝える**
    ため、「3ステップ」の約束が崩れません。
  - `steps` は常に全件返し `isMinimal` フラグで絞る方式なので、履歴に保存した
    スナップショットからも時短モードを再現できます（DBスキーマの変更不要）。
- **インタラクティブ手順カード** (`components/StepSlides.tsx`, `components/FaceMap.tsx`):
  1ステップずつスライド表示し、**「顔のどこに・どのくらいの量・どの方向に」**を
  SVG の顔マップ（塗る範囲のハイライト＋動かす方向の矢印）で示します。
  量（パール大など）・コツ・やりがちな失敗を各ステップに添付。矢印キーでも送れます。
  - ガイドデータは `lib/stepGuides.ts` に technique_id をキーで分離（将来の
    `technique_guides` 子テーブルを想定）。全手法ぶん定義済みで、テストで網羅性を検証しています。

> **なぜ AI 画像生成ではなく SVG か**: この図の情報は「位置と方向」そのものです。
> 生成画像では「頬骨の高い位置から斜め上へ」を指示どおりに描けず、手順ごとに絵柄も変わります。
> SVG なら座標で正確に指定でき、全手順で画風が揃い、オフラインでも表示でき、追加コストも
> かかりません。AI 画像が向くのは「完成イメージの雰囲気」側（＝ミューズ機能）です。

### DB担当への申し送り（スキーマ拡張が必要な項目）
- `makeup_techniques` に `gender`(text: unisex/men/women) 列を追加
- 手法の成分・製品は子テーブル（例: `technique_ingredients` / `technique_products`）が必要
- `technique_tags.tag_type` の CHECK制約は現状 skin/color/style のまま（gender はタグではなく列で持つ想定）

## ディレクトリ

```
app/diagnosis/page.tsx      診断フロー（SPA）
app/login/page.tsx          ログイン / 新規登録
app/mypage/page.tsx         マイページ（ルーティン・履歴・お気に入り・設定）
components/QuestionCard.tsx 設問カード
components/ResultView.tsx   診断結果＋レコメンド表示
components/AuthProvider.tsx ログイン状態の共有＋ローカルデータの引き継ぎ
components/RoutineChecklist.tsx 今日のチェックリスト＋継続の可視化
components/StepSlides.tsx   1ステップずつのインタラクティブ手順カード
components/FaceMap.tsx      塗る位置・方向を示すSVG顔マップ
components/RoutineModeToggle.tsx フル ⇄ 時短の切り替え
lib/stepGuides.ts           塗り方ガイド（量・方向・コツ）
lib/types.ts                共有型（DBスキーマ対応）
lib/diagnosisStore.ts       設問データ + Zustandストア + スコア集計
lib/techniques.ts           手法・タグのモックデータ
lib/recommend.ts            コアアルゴリズム
lib/supabaseClient.ts       Supabaseクライアント
lib/historyRepository.ts    診断履歴（Supabase / localStorage）
lib/favoritesRepository.ts  お気に入り（Supabase / localStorage）
lib/routineRepository.ts    ルーティン記録（Supabase / localStorage）
lib/streak.ts               日付ユーティリティ＋連続日数の集計
lib/progress.ts             再診断のおすすめ・スコア推移・週次の振り返り
components/ProgressPanel.tsx 記録タブ（続けた結果の可視化）
supabase/migrations/        DBスキーマ（SQL Editor で実行）
public/manifest.webmanifest PWAマニフェスト
public/sw.js                Service Worker（オフライン＋通知）
```

## デプロイ（Vercel）

1. Vercel でこのリポジトリをインポート（Framework は Next.js が自動検出されます）
2. Environment Variables に `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` を設定
   （Production / Preview / Development すべてに）
3. Supabase の Authentication → URL Configuration で、本番URLを設定
   - **Site URL**: `https://<your-app>.vercel.app`
   - **Redirect URLs**: `https://<your-app>.vercel.app/**`（マジックリンクの戻り先に必要）
4. デプロイ

CLI から行う場合:

```bash
npx vercel link
npx vercel env add NEXT_PUBLIC_SUPABASE_URL production
npx vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
npx vercel --prod
```

## 次にやること

- Supabase スキーマ（questions, options, makeup_techniques, technique_tags）の作成と、
  `getTechniques()` の DB クエリ化
- Web Push（サーバー + VAPID 鍵）による、アプリを閉じていても届くリマインド
