import type { MakeupTechnique } from './types'

// makeup_techniques + technique_tags のモックデータ。
// Supabase 接続後は lib/recommend.ts の getTechniques() をクエリに差し替えるだけでよい。
//
// タグの考え方:
//   - style タグ: どの「なりたい系統」向けの手法か（mode / clean / glow）
//   - color タグ: どのパーソナルカラー向けか（warm / cool）
//   - skin  タグ: その手法が前提とする / 促進する肌傾向（例: mode=マット肌は乾燥を促進）
//   - タグが無い軸は「万能（どのユーザーにも適用可）」を意味する
export const TECHNIQUES: MakeupTechnique[] = [
  // ---- 共通ベーススキンケア（style/color タグ無し = 全員に適用） ----
  {
    id: 't-base-cleanse',
    step_order: 10,
    title: '洗顔・クレンジング',
    description: 'ぬるま湯で肌への摩擦を抑えながら洗顔し、余分な皮脂と汚れを落とす。',
    tags: [],
  },
  {
    id: 't-base-lotion',
    step_order: 20,
    title: '化粧水で整える',
    description: 'ハンドプレスで化粧水をなじませ、次の工程の浸透を高める。',
    tags: [],
  },

  // ---- なりたい系統別のベースメイク手法 ----
  {
    id: 't-mode-matte',
    step_order: 40,
    title: 'マットベースメイク',
    description: '皮脂を抑えるマット系下地とパウダーファンデでシャープな陶器肌をつくる。',
    tags: [
      { technique_id: 't-mode-matte', tag_type: 'style', tag_value: 'mode' },
      // マット肌手法は乾燥を促進するため、skin=dry と相反する
      { technique_id: 't-mode-matte', tag_type: 'skin', tag_value: 'dry' },
    ],
  },
  {
    id: 't-clean-natural',
    step_order: 40,
    title: 'セミマットな清潔感ベース',
    description: '薄膜のトーンアップ下地で毛穴を自然にカバーし、清潔感のある素肌感を演出。',
    tags: [{ technique_id: 't-clean-natural', tag_type: 'style', tag_value: 'clean' }],
  },
  {
    id: 't-glow-dewy',
    step_order: 40,
    title: 'グロウ（ツヤ）ベース',
    description: '保湿系の艶下地とクッションファンデで、内側から発光するようなツヤ肌に。',
    tags: [{ technique_id: 't-glow-dewy', tag_type: 'style', tag_value: 'glow' }],
  },

  // ---- パーソナルカラー別のポイントメイク ----
  {
    id: 't-color-warm-cheek',
    step_order: 60,
    title: 'ウォームカラーのチーク・リップ',
    description: 'コーラル〜テラコッタ系で血色感を足し、暖色の肌なじみを活かす。',
    tags: [{ technique_id: 't-color-warm-cheek', tag_type: 'color', tag_value: 'warm' }],
  },
  {
    id: 't-color-cool-cheek',
    step_order: 60,
    title: 'クールカラーのチーク・リップ',
    description: 'ローズ〜プラム系で透明感を強調し、涼しげな印象に仕上げる。',
    tags: [{ technique_id: 't-color-cool-cheek', tag_type: 'color', tag_value: 'cool' }],
  },

  // ---- 系統別の仕上げ ----
  {
    id: 't-mode-brow',
    step_order: 80,
    title: 'シャープな平行眉・アイライン',
    description: '直線的な眉ときりっとしたアイラインでモードな抜け感を作る。',
    tags: [{ technique_id: 't-mode-brow', tag_type: 'style', tag_value: 'mode' }],
  },
  {
    id: 't-clean-brow',
    step_order: 80,
    title: 'ふんわりアーチ眉',
    description: '毛流れを活かしたアーチ眉で、やわらかく清潔感のある目もとに。',
    tags: [{ technique_id: 't-clean-brow', tag_type: 'style', tag_value: 'clean' }],
  },
  {
    id: 't-glow-highlight',
    step_order: 80,
    title: 'ハイライトで立体ツヤ',
    description: '高い位置にハイライトを重ね、ツヤの立体感を強調する。',
    tags: [{ technique_id: 't-glow-highlight', tag_type: 'style', tag_value: 'glow' }],
  },
]

// 補正処理で先頭に挿入する「高保湿スキンケア工程」
export const CORRECTION_STEP = {
  id: 't-correction-hydration',
  title: '【補正】高保湿スキンケア工程',
  description:
    '選択された仕上がりが乾燥を招きやすいため、化粧下地の前に高保湿美容液・保湿クリームでしっかり水分と油分を補給する。',
}
