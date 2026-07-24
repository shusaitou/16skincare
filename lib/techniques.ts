import type { MakeupTechnique } from './types'

// makeup_techniques + technique_tags + 拡張(gender/成分/製品) のモックデータ。
// Supabase 接続後は lib/recommend.ts の getTechniques() をクエリに差し替えるだけでよい。
//
// タグ/属性の考え方:
//   - gender:    対象性別。unisex は全員、men/women はその性別を選んだ人にのみ表示
//   - style タグ: どの「なりたい系統」向けの手法か（mode / clean / glow）
//   - color タグ: どのパーソナルカラー向けか（spring / summer / autumn / winter）
//   - skin  タグ: その手法が前提とする / 促進する肌傾向（例: mode=マット肌は乾燥を促進）
//   - ingredients: そのステップで注目したい成分（一般的な指針）
//   - products:  そのカテゴリの代表製品の「一例」（成分・使用は各製品表示を優先）

// 製品提示に添える免責
export const PRODUCT_DISCLAIMER =
  '※製品はカテゴリの一例です。配合成分・使用方法は各製品のパッケージ表示をご確認ください。'

export const TECHNIQUES: MakeupTechnique[] = [
  // ---- 共通ベーススキンケア（全員） ----
  {
    id: 't-base-cleanse',
    step_order: 10,
    gender: 'unisex',
    description: 'ぬるま湯で摩擦を抑えて洗顔し、余分な皮脂と汚れを落とす。',
    ingredients: ['アミノ酸系洗浄成分', 'グリセリン'],
    products: [
      { name: 'ザ フェイス 泡タイプ', brand: 'ビオレ', category: '洗顔料' },
      { name: '泡洗顔料', brand: 'キュレル', category: '洗顔料' },
    ],
    tags: [],
  },
  {
    id: 't-base-lotion',
    step_order: 20,
    gender: 'unisex',
    description: '化粧水をハンドプレスでなじませ、次の工程の浸透を高める。',
    ingredients: ['ヒアルロン酸', 'グリセリン', 'ハトムギエキス'],
    products: [
      { name: '化粧水・敏感肌用 高保湿タイプ', brand: '無印良品', category: '化粧水' },
      { name: 'スキンコンディショナー（ハトムギ化粧水）', brand: 'ナチュリエ', category: '化粧水' },
    ],
    tags: [],
  },

  // ---- メンズ向けスキンケア ----
  {
    id: 't-men-aftershave',
    step_order: 15,
    gender: 'men',
    description: 'ヒゲ剃り後の肌は乾燥・炎症しやすいため、低刺激の保湿で整える。',
    ingredients: ['グリチルリチン酸2K（抗炎症）', 'ヒアルロン酸', 'グリセリン'],
    products: [
      { name: 'アフターシェービングローション', brand: 'ニベアメン', category: 'アフターシェーブ' },
      { name: '乳液・敏感肌用', brand: '無印良品', category: '乳液' },
    ],
    tags: [],
  },
  {
    id: 't-men-sebum-base',
    step_order: 35,
    gender: 'men',
    description: '皮脂・テカリを抑えるベースで、自然につや消しした清潔感のある肌に。',
    ingredients: ['皮脂吸着パウダー', 'サリチル酸（BHA）'],
    products: [
      { name: 'スキンケアベース（BBミルク）', brand: 'ウーノ', category: 'BB・化粧下地' },
      { name: '皮脂くずれ防止 化粧下地', brand: 'プリマヴィスタ', category: '化粧下地' },
    ],
    tags: [],
  },
  {
    id: 't-men-brow',
    step_order: 82,
    gender: 'men',
    description: '不要な毛だけ整え、眉尻を軽く足してナチュラルで清潔感のある眉に。',
    products: [{ name: '3Dアイブロウカラー', brand: 'KATE', category: 'アイブロウ' }],
    tags: [],
  },

  // ---- なりたい系統別のベースメイク手法（全員） ----
  {
    id: 't-mode-matte',
    step_order: 40,
    gender: 'unisex',
    description: 'マット下地とパウダーファンデでシャープな陶器肌をつくる。',
    ingredients: ['皮脂吸着パウダー', 'シリカ'],
    products: [
      { name: '皮脂くずれ防止 化粧下地', brand: 'プリマヴィスタ', category: '化粧下地' },
      { name: 'ドラマティックパウダリー UV', brand: 'マキアージュ', category: 'パウダーファンデ' },
    ],
    tags: [
      { technique_id: 't-mode-matte', tag_type: 'style', tag_value: 'mode' },
      // マット肌手法は乾燥を促進するため、skin=dry と相反する
      { technique_id: 't-mode-matte', tag_type: 'skin', tag_value: 'dry' },
    ],
  },
  {
    id: 't-clean-natural',
    step_order: 40,
    gender: 'unisex',
    description: '薄膜のトーンアップ下地で毛穴を自然にカバーし、清潔感のある素肌感に。',
    ingredients: ['トーンアップ成分', 'UVカット成分'],
    products: [
      { name: 'UVイデア XL プロテクショントーンアップ', brand: 'ラ ロッシュ ポゼ', category: '化粧下地' },
      { name: 'UVウルトラフィットベースN', brand: 'セザンヌ', category: '化粧下地' },
    ],
    tags: [{ technique_id: 't-clean-natural', tag_type: 'style', tag_value: 'clean' }],
  },
  {
    id: 't-glow-dewy',
    step_order: 40,
    gender: 'unisex',
    description: '艶下地とクッションファンデで、内側から発光するようなツヤ肌に。',
    ingredients: ['保湿ヒアルロン酸', 'パール／光拡散パウダー'],
    products: [
      { name: 'モイスチュアライジング ファンデーション プライマー', brand: 'ポール & ジョー', category: '化粧下地' },
    ],
    tags: [{ technique_id: 't-glow-dewy', tag_type: 'style', tag_value: 'glow' }],
  },

  // ---- パーソナルカラー（4シーズン）別のポイントメイク（レディース） ----
  {
    id: 't-color-spring',
    step_order: 60,
    gender: 'women',
    description: 'コーラル〜ピーチ系のチーク・リップで明るい血色感をプラス。',
    products: [{ name: 'クリームチーク', brand: 'キャンメイク', category: 'チーク' }],
    tags: [{ technique_id: 't-color-spring', tag_type: 'color', tag_value: 'spring' }],
  },
  {
    id: 't-color-summer',
    step_order: 60,
    gender: 'women',
    description: 'ローズ〜ラベンダー系のチーク・リップでソフトな透明感を出す。',
    products: [{ name: 'ナチュラル チークN', brand: 'セザンヌ', category: 'チーク' }],
    tags: [{ technique_id: 't-color-summer', tag_type: 'color', tag_value: 'summer' }],
  },
  {
    id: 't-color-autumn',
    step_order: 60,
    gender: 'women',
    description: 'テラコッタ〜ブラウン系のチーク・リップで深みのある温かさを足す。',
    products: [{ name: 'クリームチーク', brand: 'キャンメイク', category: 'チーク' }],
    tags: [{ technique_id: 't-color-autumn', tag_type: 'color', tag_value: 'autumn' }],
  },
  {
    id: 't-color-winter',
    step_order: 60,
    gender: 'women',
    description: 'ビビッドピンク〜プラム系のチーク・リップで華やかさと透明感を強調。',
    products: [{ name: 'ナチュラル チークN', brand: 'セザンヌ', category: 'チーク' }],
    tags: [{ technique_id: 't-color-winter', tag_type: 'color', tag_value: 'winter' }],
  },

  // ---- 系統別の仕上げ（レディース） ----
  {
    id: 't-mode-brow',
    step_order: 80,
    gender: 'women',
    description: '直線的な平行眉ときりっとしたアイラインでモードな抜け感をつくる。',
    products: [{ name: 'デザイニングアイブロウ 3D', brand: 'KATE', category: 'アイブロウ' }],
    tags: [{ technique_id: 't-mode-brow', tag_type: 'style', tag_value: 'mode' }],
  },
  {
    id: 't-clean-brow',
    step_order: 80,
    gender: 'women',
    description: '毛流れを活かしたアーチ眉で、やわらかく清潔感のある目もとに。',
    products: [{ name: 'デザイニングアイブロウ 3D', brand: 'KATE', category: 'アイブロウ' }],
    tags: [{ technique_id: 't-clean-brow', tag_type: 'style', tag_value: 'clean' }],
  },
  {
    id: 't-glow-highlight',
    step_order: 90,
    gender: 'women',
    description: '高い位置にハイライトを重ね、ツヤの立体感を強調する。',
    products: [{ name: 'パールグロウハイライト', brand: 'セザンヌ', category: 'ハイライト' }],
    tags: [{ technique_id: 't-glow-highlight', tag_type: 'style', tag_value: 'glow' }],
  },
]

// 補正処理で先頭に挿入する「高保湿スキンケア工程」
export const CORRECTION_STEP = {
  id: 't-correction-hydration',
  description:
    '【補正】選択された仕上がりが乾燥を招きやすいため、化粧下地の前に高保湿美容液・保湿クリームで水分と油分をしっかり補給する。',
  ingredients: ['セラミド', 'ヒアルロン酸', 'ワセリン／スクワラン'],
  products: [
    { name: '潤浸保湿 フェイスクリーム', brand: 'キュレル', category: '保湿クリーム' },
    { name: 'エイジングケア 薬用リンクルケア美容液', brand: '無印良品', category: '美容液' },
  ],
}
