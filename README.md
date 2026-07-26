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
app/cosmetics/page.tsx    手持ちコスメの登録・管理
lib/substitution.ts       手持ちで代替できるかの判定ロジック
lib/ownedStore.ts         手持ちコスメのストア（zustand + localStorage）
lib/productCatalog.ts     入力補完の候補（ブランド一覧・製品索引・日本語の正規化）
components/AutocompleteInput.tsx 予測変換つき入力欄（コンボボックス）
components/SubstitutionSummary.tsx 充足率と買い足し候補のサマリー
```

## 次にやること（Supabase / Vercel 担当と連携）

- Supabase スキーマ（questions, options, makeup_techniques, technique_tags）の作成
- API ルートでの診断保存と、`lib/recommend.ts` を使ったレコメンドの DB 版
- `.env.local` に Supabase の URL / anon key を設定（`.env.local.example` 参照）
