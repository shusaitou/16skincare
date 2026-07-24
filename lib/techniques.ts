import type { MakeupTechnique } from './types'

// makeup_techniques + technique_tags のモックデータ。
// Supabase 接続後は lib/recommend.ts の getTechniques() をクエリに差し替えるだけでよい。
//
// タグの考え方:
//   - style タグ: どの「なりたい系統」向けの手法か（mode / clean / glow）
//   - color タグ: どのパーソナルカラー向けか（spring / summer / autumn / winter）
//   - skin  タグ: その手法が前提とする / 促進する肌傾向（例: mode=マット肌は乾燥を促進）
//   - タグが無い軸は「万能（どのユーザーにも適用可）」を意味する
export const TECHNIQUES: MakeupTechnique[] = [
  // ---- 共通ベーススキンケア（style/color タグ無し = 全員に適用） ----
  {
    id: 't-base-cleanse',
    step_order: 10,
    description: 'ぬるま湯で摩擦を抑えて洗顔し、余分な皮脂と汚れを落とす。',
    tags: [],
  },
  {
    id: 't-base-lotion',
    step_order: 20,
    description: '化粧水をハンドプレスでなじませ、次の工程の浸透を高める。',
    tags: [],
  },

  // ---- なりたい系統別のベースメイク手法 ----
  {
    id: 't-mode-matte',
    step_order: 40,
    description: 'マット下地とパウダーファンデでシャープな陶器肌をつくる。',
    tags: [
      { technique_id: 't-mode-matte', tag_type: 'style', tag_value: 'mode' },
      // マット肌手法は乾燥を促進するため、skin=dry と相反する
      { technique_id: 't-mode-matte', tag_type: 'skin', tag_value: 'dry' },
    ],
  },
  {
    id: 't-clean-natural',
    step_order: 40,
    description: '薄膜のトーンアップ下地で毛穴を自然にカバーし、清潔感のある素肌感に。',
    tags: [{ technique_id: 't-clean-natural', tag_type: 'style', tag_value: 'clean' }],
  },
  {
    id: 't-glow-dewy',
    step_order: 40,
    description: '艶下地とクッションファンデで、内側から発光するようなツヤ肌に。',
    tags: [{ technique_id: 't-glow-dewy', tag_type: 'style', tag_value: 'glow' }],
  },

  // ---- パーソナルカラー（4シーズン）別のポイントメイク ----
  {
    id: 't-color-spring',
    step_order: 60,
    description: 'コーラル〜ピーチ系で明るい血色感をプラスし、華やかさを引き出す。',
    tags: [{ technique_id: 't-color-spring', tag_type: 'color', tag_value: 'spring' }],
  },
  {
    id: 't-color-summer',
    step_order: 60,
    description: 'ローズ〜ラベンダー系でソフトな透明感を出し、上品にまとめる。',
    tags: [{ technique_id: 't-color-summer', tag_type: 'color', tag_value: 'summer' }],
  },
  {
    id: 't-color-autumn',
    step_order: 60,
    description: 'テラコッタ〜ブラウン系で深みのある温かさを足し、こなれ感を出す。',
    tags: [{ technique_id: 't-color-autumn', tag_type: 'color', tag_value: 'autumn' }],
  },
  {
    id: 't-color-winter',
    step_order: 60,
    description: 'ビビッドピンク〜プラム系でくっきりした華やかさと透明感を強調する。',
    tags: [{ technique_id: 't-color-winter', tag_type: 'color', tag_value: 'winter' }],
  },

  // ---- 系統別の仕上げ ----
  {
    id: 't-mode-brow',
    step_order: 80,
    description: '直線的な平行眉ときりっとしたアイラインでモードな抜け感をつくる。',
    tags: [{ technique_id: 't-mode-brow', tag_type: 'style', tag_value: 'mode' }],
  },
  {
    id: 't-clean-brow',
    step_order: 80,
    description: '毛流れを活かしたアーチ眉で、やわらかく清潔感のある目もとに。',
    tags: [{ technique_id: 't-clean-brow', tag_type: 'style', tag_value: 'clean' }],
  },
  {
    id: 't-glow-highlight',
    step_order: 80,
    description: '高い位置にハイライトを重ね、ツヤの立体感を強調する。',
    tags: [{ technique_id: 't-glow-highlight', tag_type: 'style', tag_value: 'glow' }],
  },
]

// 補正処理で先頭に挿入する「高保湿スキンケア工程」
export const CORRECTION_STEP = {
  id: 't-correction-hydration',
  description:
    '【補正】選択された仕上がりが乾燥を招きやすいため、化粧下地の前に高保湿美容液・保湿クリームで水分と油分をしっかり補給する。',
}
