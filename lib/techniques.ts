import type { MakeupTechnique } from './types'

// makeup_techniques + technique_tags + 拡張(gender/成分/製品) のモックデータ。
// Supabase 接続後は lib/recommend.ts の getTechniques() をクエリに差し替えるだけでよい。
//
// タグ/属性の考え方:
//   - gender:    対象性別。unisex は全員、men/women はその性別を選んだ人にのみ表示
//   - style タグ: なりたい系統向けの質感（mode / clean / glow）
//   - color タグ: パーソナルカラー向けの色（spring / summer / autumn / winter）
//   - skin  タグ: その手法が前提とする / 促進する肌傾向（例: mode=マット肌は乾燥を促進）
//   - ingredients: 注目したい成分（一般的な指針）
//   - products:  そのカテゴリの代表製品の「一例」（成分・使用は各製品表示を優先）
//
// step_order（工程の順序）:
//   10-30 スキンケア / 35-55 ベースメイク / 60-84 ポイントメイク

export const PRODUCT_DISCLAIMER =
  '※製品はカテゴリの一例です。配合成分・使用方法は各製品のパッケージ表示をご確認ください。'

export const TECHNIQUES: MakeupTechnique[] = [
  // ============ スキンケア（共通） ============
  {
    id: 't-cleanse',
    step_order: 10,
    gender: 'unisex',
    description: 'ぬるま湯で摩擦を抑えて洗顔し、余分な皮脂と汚れを落とす。',
    ingredients: ['アミノ酸系洗浄成分', 'グリセリン'],
    products: [{ name: 'ザ フェイス 泡タイプ', brand: 'ビオレ', category: '洗顔料' }],
    tags: [],
  },
  {
    id: 't-lotion',
    step_order: 20,
    gender: 'unisex',
    description: '化粧水をハンドプレスでなじませ、水分を届けて肌を整える。',
    ingredients: ['ヒアルロン酸', 'グリセリン', 'ハトムギエキス'],
    products: [
      { name: '化粧水・敏感肌用 高保湿タイプ', brand: '無印良品', category: '化粧水' },
    ],
    tags: [],
  },
  {
    id: 't-emulsion',
    step_order: 25,
    gender: 'unisex',
    description: '乳液で水分を挟み込み、油分でうるおいを閉じ込める。',
    minimalFor: ['men', 'women'],
    ingredients: ['スクワラン', 'グリセリン'],
    products: [{ name: '乳液・敏感肌用', brand: '無印良品', category: '乳液' }],
    tags: [],
  },
  {
    id: 't-sunscreen',
    step_order: 30,
    gender: 'unisex',
    description: '朝は日焼け止めで紫外線から守る。メイク前の必須工程。',
    ingredients: ['UVカット成分（SPF/PA）'],
    products: [
      { name: 'UV アクアリッチ ウォータリーエッセンス', brand: 'ビオレ', category: '日焼け止め' },
    ],
    tags: [],
  },

  // ============ メンズ向けスキンケア ============
  {
    id: 't-men-aftershave',
    step_order: 15,
    gender: 'men',
    description: 'ヒゲ剃り後の肌は乾燥・炎症しやすいため、低刺激の保湿で整える。',
    ingredients: ['グリチルリチン酸2K（抗炎症）', 'ヒアルロン酸'],
    products: [
      { name: 'アフターシェービングローション', brand: 'ニベアメン', category: 'アフターシェーブ' },
    ],
    tags: [],
  },

  // ============ ベースメイク ============
  // メンズの皮脂対策ベース
  {
    id: 't-men-sebum-base',
    step_order: 35,
    gender: 'men',
    description: '皮脂・テカリを抑えるBBで、自然につや消しした清潔感のある肌に。',
    minimalFor: ['men'],
    ingredients: ['皮脂吸着パウダー', 'サリチル酸（BHA）'],
    products: [{ name: 'スキンケアベース（BBミルク）', brand: 'ウーノ', category: 'BB・下地' }],
    tags: [],
  },

  // 化粧下地（系統別・全員）
  {
    id: 't-primer-mode',
    step_order: 40,
    gender: 'unisex',
    description: '皮脂くずれ防止のマット下地で、シャープな陶器肌の土台をつくる。',
    minimalFor: ['women'],
    ingredients: ['皮脂吸着パウダー', 'シリカ'],
    products: [
      { name: '皮脂くずれ防止 化粧下地', brand: 'プリマヴィスタ', category: '化粧下地' },
    ],
    tags: [
      { technique_id: 't-primer-mode', tag_type: 'style', tag_value: 'mode' },
      // マット肌手法は乾燥を促進するため、skin=dry と相反する
      { technique_id: 't-primer-mode', tag_type: 'skin', tag_value: 'dry' },
    ],
  },
  {
    id: 't-primer-clean',
    step_order: 40,
    gender: 'unisex',
    description: '薄膜のトーンアップ下地で毛穴を自然にカバーし、清潔感のある素肌感に。',
    minimalFor: ['women'],
    ingredients: ['トーンアップ成分', 'UVカット成分'],
    products: [
      { name: 'UVイデア XL プロテクショントーンアップ', brand: 'ラ ロッシュ ポゼ', category: '化粧下地' },
    ],
    tags: [{ technique_id: 't-primer-clean', tag_type: 'style', tag_value: 'clean' }],
  },
  {
    id: 't-primer-glow',
    step_order: 40,
    gender: 'unisex',
    description: '艶下地でうるおいを仕込み、内側から発光するツヤ肌の土台に。',
    minimalFor: ['women'],
    ingredients: ['保湿ヒアルロン酸', 'パール／光拡散パウダー'],
    products: [
      { name: 'モイスチュアライジング ファンデーション プライマー', brand: 'ポール & ジョー', category: '化粧下地' },
    ],
    tags: [{ technique_id: 't-primer-glow', tag_type: 'style', tag_value: 'glow' }],
  },

  // ファンデーション（系統別・レディース）
  {
    id: 't-foundation-mode',
    step_order: 45,
    gender: 'women',
    description: 'パウダーファンデを薄く重ね、マットで均一な陶器肌に仕上げる。',
    products: [{ name: 'ドラマティックパウダリー UV', brand: 'マキアージュ', category: 'ファンデーション' }],
    tags: [{ technique_id: 't-foundation-mode', tag_type: 'style', tag_value: 'mode' }],
  },
  {
    id: 't-foundation-clean',
    step_order: 45,
    gender: 'women',
    description: '薄づきのファンデをスポンジでなじませ、素肌っぽく均一に整える。',
    products: [{ name: 'ラスティング カバーファンデーション', brand: 'セザンヌ', category: 'ファンデーション' }],
    tags: [{ technique_id: 't-foundation-clean', tag_type: 'style', tag_value: 'clean' }],
  },
  {
    id: 't-foundation-glow',
    step_order: 45,
    gender: 'women',
    description: 'ツヤ系ファンデ／クッションで、みずみずしく発光する肌に仕上げる。',
    products: [{ name: 'フィットミー ルミナス+スムース', brand: 'メイベリン', category: 'ファンデーション' }],
    tags: [{ technique_id: 't-foundation-glow', tag_type: 'style', tag_value: 'glow' }],
  },

  // コンシーラー（レディース・全系統）
  {
    id: 't-concealer',
    step_order: 50,
    gender: 'women',
    description: 'クマ・赤み・気になる部分をコンシーラーでピンポイントにカバー。',
    products: [{ name: 'カバーパーフェクション チップコンシーラー', brand: 'the SAEM', category: 'コンシーラー' }],
    tags: [],
  },

  // フェイスパウダー（モード＝マット仕上げ・レディース）
  {
    id: 't-powder-mode',
    step_order: 55,
    gender: 'women',
    description: 'フェイスパウダーでテカリを抑え、サラッとしたマットな質感に固定する。',
    ingredients: ['皮脂吸着パウダー'],
    products: [{ name: 'ノーセバム ミネラルパウダー', brand: 'イニスフリー', category: 'フェイスパウダー' }],
    tags: [{ technique_id: 't-powder-mode', tag_type: 'style', tag_value: 'mode' }],
  },

  // ============ ポイントメイク ============
  // アイブロウ（系統別・レディース）
  {
    id: 't-brow-mode',
    step_order: 60,
    gender: 'women',
    description: '直線的な平行眉で、シャープでモードな抜け感をつくる。',
    products: [{ name: 'デザイニングアイブロウ 3D', brand: 'KATE', category: 'アイブロウ' }],
    tags: [{ technique_id: 't-brow-mode', tag_type: 'style', tag_value: 'mode' }],
  },
  {
    id: 't-brow-clean',
    step_order: 60,
    gender: 'women',
    description: '毛流れを活かしたアーチ眉で、やわらかく清潔感のある目もとに。',
    products: [{ name: '超細芯アイブロウ', brand: 'セザンヌ', category: 'アイブロウ' }],
    tags: [{ technique_id: 't-brow-clean', tag_type: 'style', tag_value: 'clean' }],
  },
  {
    id: 't-brow-glow',
    step_order: 60,
    gender: 'women',
    description: 'ふんわりナチュラル眉にパウダーを重ね、やわらかい立体感を出す。',
    products: [{ name: 'デザイニングアイブロウ 3D', brand: 'KATE', category: 'アイブロウ' }],
    tags: [{ technique_id: 't-brow-glow', tag_type: 'style', tag_value: 'glow' }],
  },

  // メンズ眉
  {
    id: 't-men-brow',
    step_order: 62,
    gender: 'men',
    description: '不要な毛だけ整え、眉尻を軽く足してナチュラルで清潔感のある眉に。',
    minimalFor: ['men'],
    products: [{ name: '3Dアイブロウカラー', brand: 'KATE', category: 'アイブロウ' }],
    tags: [],
  },

  // アイシャドウ（シーズン別・レディース）
  {
    id: 't-eyeshadow-spring',
    step_order: 65,
    gender: 'women',
    description: 'コーラル〜アプリコットのアイシャドウで、明るくフレッシュな目もとに。',
    products: [{ name: 'パーフェクトスタイリストアイズ', brand: 'キャンメイク', category: 'アイシャドウ' }],
    tags: [{ technique_id: 't-eyeshadow-spring', tag_type: 'color', tag_value: 'spring' }],
  },
  {
    id: 't-eyeshadow-summer',
    step_order: 65,
    gender: 'women',
    description: 'ローズ〜ラベンダーのアイシャドウで、涼しげでソフトな透明感を。',
    products: [{ name: 'トーンアップアイシャドウ', brand: 'セザンヌ', category: 'アイシャドウ' }],
    tags: [{ technique_id: 't-eyeshadow-summer', tag_type: 'color', tag_value: 'summer' }],
  },
  {
    id: 't-eyeshadow-autumn',
    step_order: 65,
    gender: 'women',
    description: 'ブラウン〜ゴールドのアイシャドウで、深みとこなれ感のある目もとに。',
    products: [{ name: 'スキニーリッチシャドウ', brand: 'excel', category: 'アイシャドウ' }],
    tags: [{ technique_id: 't-eyeshadow-autumn', tag_type: 'color', tag_value: 'autumn' }],
  },
  {
    id: 't-eyeshadow-winter',
    step_order: 65,
    gender: 'women',
    description: 'プラム〜モーヴのアイシャドウで、くっきりした華やかさと深みを。',
    products: [{ name: 'リッチカラーアイズ', brand: 'Visée', category: 'アイシャドウ' }],
    tags: [{ technique_id: 't-eyeshadow-winter', tag_type: 'color', tag_value: 'winter' }],
  },

  // アイライン（系統別・レディース）
  {
    id: 't-eyeliner-mode',
    step_order: 70,
    gender: 'women',
    description: 'ブラックのリキッドで、きりっと跳ね上げたシャープなアイラインを。',
    products: [{ name: 'リキッド アイライナー', brand: 'ラブ・ライナー', category: 'アイライナー' }],
    tags: [{ technique_id: 't-eyeliner-mode', tag_type: 'style', tag_value: 'mode' }],
  },
  {
    id: 't-eyeliner-clean',
    step_order: 70,
    gender: 'women',
    description: 'ブラウンで細く、まつ毛の隙間を埋める程度のナチュラルなラインを。',
    products: [{ name: 'スムースリキッドアイライナー', brand: 'ヒロインメイク', category: 'アイライナー' }],
    tags: [{ technique_id: 't-eyeliner-clean', tag_type: 'style', tag_value: 'clean' }],
  },
  {
    id: 't-eyeliner-glow',
    step_order: 70,
    gender: 'women',
    description: '目のキワにブラウンを控えめに引き、ツヤ感を邪魔しない抜け感に。',
    products: [{ name: 'ラスティンファインE ペンシル', brand: 'デジャヴュ', category: 'アイライナー' }],
    tags: [{ technique_id: 't-eyeliner-glow', tag_type: 'style', tag_value: 'glow' }],
  },

  // マスカラ（レディース・全系統）
  {
    id: 't-mascara',
    step_order: 72,
    gender: 'women',
    description: 'ビューラーで上げた後、マスカラでまつ毛を伸ばして目もとを強調。',
    products: [{ name: 'ロング&カールマスカラ', brand: 'ヒロインメイク', category: 'マスカラ' }],
    tags: [],
  },

  // チーク（シーズン別・レディース）
  {
    id: 't-cheek-spring',
    step_order: 75,
    gender: 'women',
    description: 'コーラル〜ピーチのチークを頬の高い位置に入れ、明るい血色感を。',
    products: [{ name: 'クリームチーク', brand: 'キャンメイク', category: 'チーク' }],
    tags: [{ technique_id: 't-cheek-spring', tag_type: 'color', tag_value: 'spring' }],
  },
  {
    id: 't-cheek-summer',
    step_order: 75,
    gender: 'women',
    description: 'ローズ〜ラベンダーのチークをふんわり入れ、ソフトな透明感を。',
    products: [{ name: 'ナチュラル チークN', brand: 'セザンヌ', category: 'チーク' }],
    tags: [{ technique_id: 't-cheek-summer', tag_type: 'color', tag_value: 'summer' }],
  },
  {
    id: 't-cheek-autumn',
    step_order: 75,
    gender: 'women',
    description: 'テラコッタ〜ブラウンのチークで、深みのある温かさとこなれ感を。',
    products: [{ name: 'クリームチーク', brand: 'キャンメイク', category: 'チーク' }],
    tags: [{ technique_id: 't-cheek-autumn', tag_type: 'color', tag_value: 'autumn' }],
  },
  {
    id: 't-cheek-winter',
    step_order: 75,
    gender: 'women',
    description: 'ローズ〜プラムのチークを頬に効かせ、華やかで凛とした印象に。',
    products: [{ name: 'ナチュラル チークN', brand: 'セザンヌ', category: 'チーク' }],
    tags: [{ technique_id: 't-cheek-winter', tag_type: 'color', tag_value: 'winter' }],
  },

  // リップ（シーズン別・レディース）
  {
    id: 't-lip-spring',
    step_order: 78,
    gender: 'women',
    description: 'コーラル〜オレンジのリップで、明るくヘルシーな血色の唇に。',
    minimalFor: ['women'],
    products: [{ name: 'リップティント N', brand: 'オペラ', category: 'リップ' }],
    tags: [{ technique_id: 't-lip-spring', tag_type: 'color', tag_value: 'spring' }],
  },
  {
    id: 't-lip-summer',
    step_order: 78,
    gender: 'women',
    description: 'ローズ〜モーヴのリップで、上品でやわらかい涼感の唇に。',
    minimalFor: ['women'],
    products: [{ name: 'ジューシーラスティングティント', brand: 'rom&nd', category: 'リップ' }],
    tags: [{ technique_id: 't-lip-summer', tag_type: 'color', tag_value: 'summer' }],
  },
  {
    id: 't-lip-autumn',
    step_order: 78,
    gender: 'women',
    description: 'テラコッタ〜ブラウンのリップで、深みのあるこなれた唇に。',
    minimalFor: ['women'],
    products: [{ name: 'ジューシーラスティングティント', brand: 'rom&nd', category: 'リップ' }],
    tags: [{ technique_id: 't-lip-autumn', tag_type: 'color', tag_value: 'autumn' }],
  },
  {
    id: 't-lip-winter',
    step_order: 78,
    gender: 'women',
    description: 'フューシャ〜プラムのリップで、くっきり華やかな唇に。',
    minimalFor: ['women'],
    products: [{ name: 'リップティント N', brand: 'オペラ', category: 'リップ' }],
    tags: [{ technique_id: 't-lip-winter', tag_type: 'color', tag_value: 'winter' }],
  },

  // ハイライト（グロウ＝ツヤ仕上げ・レディース）
  {
    id: 't-highlight',
    step_order: 82,
    gender: 'women',
    description: '頬骨や鼻筋の高い位置にハイライトを重ね、ツヤの立体感を強調する。',
    products: [{ name: 'パールグロウハイライト', brand: 'セザンヌ', category: 'ハイライト' }],
    tags: [{ technique_id: 't-highlight', tag_type: 'style', tag_value: 'glow' }],
  },

  // シェーディング（モード＝立体マット仕上げ・レディース）
  {
    id: 't-shading',
    step_order: 84,
    gender: 'women',
    description: 'フェイスラインや鼻筋にシェーディングを入れ、引き締まった小顔印象に。',
    products: [{ name: 'シェーディングパウダー', brand: 'キャンメイク', category: 'シェーディング' }],
    tags: [{ technique_id: 't-shading', tag_type: 'style', tag_value: 'mode' }],
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
  ],
}
