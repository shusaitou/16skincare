import type {
  ColorType,
  DiagnosisResult,
  MakeupTechnique,
  RecommendationResponse,
  RecommendedStep,
  SkinType,
  StyleType,
  TagValue,
} from './types'
import { CORRECTION_STEP, TECHNIQUES } from './techniques'

// 肌質ごとの「相反するタグ値」定義（データ駆動で拡張可能）。
// 例: 乾燥肌(dry) にとって、マット肌前提の手法（skin:dry タグを持つ mode 系）は
//     さらに乾燥を促進するため矛盾する。
const SKIN_CONFLICTS: Record<SkinType, TagValue[]> = {
  dry: ['dry'], // マット/乾燥前提の手法は乾燥肌に不向き
  oily: [], // 現状の手法セットでは脂性肌の明確な矛盾は無し
}

// データ取得層。Supabase 接続後はここを
//   const { data } = await supabase.from('makeup_techniques').select('*, technique_tags(*)')
// に差し替えるだけでよい（呼び出し側の型は変わらない）。
export function getTechniques(): MakeupTechnique[] {
  return TECHNIQUES
}

// 手法が指定した (tag_type, tag_value) のタグを持つか
function hasTag(t: MakeupTechnique, tagType: 'style' | 'color' | 'skin', value: TagValue) {
  return t.tags.some((tag) => tag.tag_type === tagType && tag.tag_value === value)
}

// その軸のタグを1つでも持つか（持たない = 万能ステップ）
function hasAxis(t: MakeupTechnique, tagType: 'style' | 'color' | 'skin') {
  return t.tags.some((tag) => tag.tag_type === tagType)
}

/**
 * タグベースの動的フィルタリング（技術要件 3. コアアルゴリズム）
 *
 *  1. なりたい系統(style)・カラー(color)に合致する手法を抽出（軸タグを持たない手法は万能として通過）
 *  2. 抽出結果に、肌質(skin)と相反するタグが含まれていないかチェック
 *  3. 相反する場合、「高保湿スキンケア工程」を配列の先頭に自動挿入（補正処理）
 *  4. step_order 順に並べた最終手順リストを返す
 */
export function buildRecommendation(
  result: DiagnosisResult,
  techniques: MakeupTechnique[] = getTechniques()
): RecommendationResponse {
  const { gender, skin, color, style } = result

  // --- 1. 性別・嗜好（系統・カラー）でフィルタ ---
  const selected = techniques.filter((t) => {
    // gender 軸: unisex は全員、それ以外はユーザーの性別に一致した場合のみ通過
    const genderOk = t.gender === 'unisex' || t.gender === gender
    // style 軸: ユーザーの系統に一致、または style タグ無し（万能）なら通過
    const styleOk = !hasAxis(t, 'style') || hasTag(t, 'style', style)
    // color 軸: ユーザーのカラーに一致、または color タグ無し（万能）なら通過
    const colorOk = !hasAxis(t, 'color') || hasTag(t, 'color', color)
    return genderOk && styleOk && colorOk
  })

  // --- 2. 肌質との矛盾チェック ---
  const conflicts = SKIN_CONFLICTS[skin] ?? []
  const conflicting = selected.filter((t) =>
    t.tags.some((tag) => tag.tag_type === 'skin' && conflicts.includes(tag.tag_value))
  )
  const needsCorrection = conflicting.length > 0

  // --- 並び替え（step_order 昇順） ---
  const steps: RecommendedStep[] = [...selected]
    .sort((a, b) => a.step_order - b.step_order)
    .map((t) => ({
      id: t.id,
      step_order: t.step_order,
      description: t.description,
      image_url: t.image_url,
      ingredients: t.ingredients,
      products: t.products,
    }))

  // --- 3. 補正処理: 高保湿工程を先頭に挿入 ---
  if (needsCorrection) {
    steps.unshift({
      id: CORRECTION_STEP.id,
      step_order: 0,
      description: CORRECTION_STEP.description,
      ingredients: CORRECTION_STEP.ingredients,
      products: CORRECTION_STEP.products,
      isCorrection: true,
    })
  }

  const correctionReason = needsCorrection
    ? `「${styleLabel(style)}」の仕上がりは乾燥を促進しやすく、${skinLabel(
        skin
      )}と相反するため、高保湿スキンケア工程を先頭に補正挿入しました。`
    : undefined

  // --- 4. JSON として返却 ---
  return { result, steps, correctionReason }
}

// --- 表示用ラベル ---
export function genderLabel(g: DiagnosisResult['gender']): string {
  return { men: 'メンズ', women: 'レディース' }[g]
}
export function skinLabel(s: SkinType): string {
  return { dry: '乾燥肌', oily: '脂性肌' }[s]
}
export function colorLabel(c: ColorType): string {
  return {
    spring: 'スプリング（イエベ春）',
    summer: 'サマー（ブルベ夏）',
    autumn: 'オータム（イエベ秋）',
    winter: 'ウィンター（ブルベ冬）',
  }[c]
}
export function styleLabel(s: StyleType): string {
  return { mode: 'モード系', clean: '清潔感重視', glow: 'ツヤ・グロウ系' }[s]
}
