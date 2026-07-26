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
- **手持ちコスメでの代替判定** (`lib/substitution.ts`, `app/cosmetics`): 手持ちのコスメを登録すると、
  各工程が「手持ちでOK / 色味を確認 / 買い足し」のどれかに判定される。結果画面の上部に
  「製品が必要な13工程のうち3工程は手持ちでまかなえます」と充足率を表示し、
  買い足し候補のカテゴリも一覧化する。

  判定の考え方:
  - **カテゴリで照合する**。製品名の完全一致は表記ゆれ・廃番が多く現実的でないため。
  - **役割が重なるカテゴリは代替として認める**（BB → 化粧下地 / 保湿クリーム → 乳液 など）。
    `CATEGORY_SUBSTITUTES` に定義。
  - **色物は断定しない**。リップ・チーク等はカテゴリが合っていても、パーソナルカラーと
    色味が違う／未登録なら「色味を確認」に落とす。**持っていないのに「使える」と
    言い切らないこと**を優先している。
  - `products` は「代表製品の一例」の列挙（組み合わせて使うものではない）なので、
    どれか1カテゴリを満たせば代替できると判定する。

  登録は `/cosmetics` のフォームか、結果画面の各製品にある「持ってる?」ボタンから。
  保存先は localStorage（端末ごとの持ち物に近いため、ログイン不要ですぐ使える）。

- **登録の3段階** (`app/cosmetics`): 手前ほど手間が少ない。
  1. **カテゴリをタップ** (`components/CategoryPicker.tsx`) — 代替判定は
     **カテゴリしか見ていない**ので、これだけで判定は成立する。製品名を打たせないのが
     登録のハードルを下げる一番の近道。色物はタップ後に色味チップが出る。
  2. **バーコード** (`components/BarcodeScanner.tsx`) — JAN を読んで製品名まで自動入力。
     標準の `BarcodeDetector` を使い、非対応環境（iOS Safari）では数字の手入力に
     フォールバックする（ライブラリを足さない方針）。
  3. **手入力（予測変換つき）** — 上記で拾えないものだけ。

- **商品データの照会** (`app/api/product/route.ts`, `lib/productLookup.ts`):
  - `GET /api/product?jan=…` — JAN から商品を引く。**Open Beauty Facts**（キー不要）を
    優先し、外れたら楽天にフォールバック。
  - `GET /api/product?q=…` — 楽天市場商品検索APIでキーワード検索（化粧品ジャンルに限定）。
  - 商品名からアプリのカテゴリを推定する（`inferCategory`）。「化粧下地」を「化粧水」と
    取り違えないよう、**具体的なルールを先**に置いている。推定は外れる前提で、
    UI では必ずユーザーが確認・修正できるようにしている。
  - ショップ独自の販促文字（`【送料無料】`など）は `cleanProductName` で除去。
    **店名(`shopName`)をブランドとして扱わない**（誤情報になるため）。
  - **楽天への問い合わせは必ず化粧品ジャンルに絞る**（`buildRakutenUrl`）。
    絞らないと、コスメ以外のバーコード（お菓子など）やキーワードで
    無関係な商品が候補に出る。URLを直書きすると付け忘れるため、
    組み立てを1関数に集約し、テストでジャンル指定を固定している。
  - `RAKUTEN_APP_ID` はサーバー側のみ（`NEXT_PUBLIC_` を付けない）。
    **未設定でもアプリは動く** — JAN 照会は Open Beauty Facts が担当し、
    キーワード検索はアプリ内カタログだけになる。

  - **レート制限対策** (`lib/rateLimit.ts`): 楽天は上限値を公開していないが、
    429 と「短時間に同じURLへ繰り返しアクセスすると一定時間応答しなくなる」ことは
    ドキュメントに明記されている。**制限はアプリID単位＝全ユーザー共有**なので、
    1人の連打で全員が止まる。安全側に倒して次の3段構えにしている。
    1. 入力補完のデバウンスを 800ms（打鍵ごとに投げない）
    2. サーバー側で楽天呼び出しを毎秒1回に制限。順番待ちが 2.5秒を超えるなら
       待たずに諦め、アプリ内カタログの候補だけで動く
    3. 同じ問い合わせは1日キャッシュ（`revalidate: 86400`）するので外部APIに行かない

    > スロットルは実行インスタンス単位なので、サーバーレスでは全体の上限を
    > 厳密に保証しない（緩和策）。厳密にやるなら Redis 等の共有ストアが要る。

  > ⚠️ 既定のジャンルID `100939`（美容・コスメ・香水）は**未検証**です。
  > 楽天のアプリIDが無いと確認できないため、暫定値として置いています。
  > キーを設定した後、コスメ以外が出る／何も出ない場合は
  > `RAKUTEN_GENRE_ID` で上書きしてください（コード変更は不要）。
  > 確認方法は `.env.local.example` に記載しています。

- **入力補完** (`lib/productCatalog.ts`, `components/AutocompleteInput.tsx`):
  ブランド・製品名の入力に予測候補を出す。
  - **ひらがな入力でカタカナに当たる**（「びおれ」→ ビオレ）。全角英数・大文字小文字・
    長音や中黒の揺れも吸収する（`normalizeJa`）。
  - ブランドを先に入れると、**製品名の候補がそのブランドのものに絞られる**。
    候補を選ぶとブランドが未入力なら自動で補完される。
  - 前方一致を部分一致より先に並べる。
  - `<datalist>` ではなく自前のコンボボックスにしたのは、ブラウザ間で挙動が揃わず、
    候補にブランド名を添えて表示できないため。キーボード（↑↓ / Enter / Esc）に対応。

  > ⚠️ **製品名の候補は自分で作らない**。候補は手法マスター(`techniques.ts`)と、
  > ユーザー自身が登録済みのものだけから生成している。うろ覚えの製品名を候補に出すと
  > 存在しない商品を勧めることになるため（`lib/muses.ts` で実在人物名を既定で空に
  > しているのと同じ方針）。ブランド名は実在が明確なので一覧を持っている。
  > 候補はあくまで入力補助で、**一覧に無い値も自由に入力できる**。

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
app/cosmetics/page.tsx      手持ちコスメの登録・管理
lib/substitution.ts         手持ちで代替できるかの判定ロジック
lib/ownedStore.ts           手持ちコスメのストア（zustand + localStorage）
lib/productCatalog.ts       入力補完の候補（ブランド一覧・製品索引・日本語の正規化）
lib/productLookup.ts        商品名の整形とカテゴリ推定・JAN検証
lib/rateLimit.ts            外部API呼び出しのスロットル
app/api/product/route.ts    商品照会API（楽天 / Open Beauty Facts）
components/AutocompleteInput.tsx 予測変換つき入力欄（コンボボックス）
components/CategoryPicker.tsx タップだけで登録するカテゴリ選択
components/BarcodeScanner.tsx バーコード読み取り（手入力フォールバックつき）
components/SubstitutionSummary.tsx 充足率と買い足し候補のサマリー
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
