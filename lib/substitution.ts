import { CORRECTION_STEP, TECHNIQUES } from './techniques'
import { colorLabel } from './recommend'
import type { ColorType, CosmeticTone, OwnedCosmetic, RecommendedStep } from './types'

// 「提案された製品を、手持ちのコスメで代替できるか」の判定。
//
// 判定の方針:
//   1. カテゴリで照合する。製品名での一致は現実的でない（表記ゆれ・廃番が多い）ため。
//   2. 役割が重なるカテゴリは代替として認める（例: BB は化粧下地の代わりになる）。
//   3. 色物（リップ・チーク等）は、カテゴリが合っていても色味が違えば断定しない。
//      パーソナルカラーと違う／不明なときは「要確認」に落とす。
//      持っていないのに「使える」と言い切らないことを優先している。

export type SubstitutionStatus =
  | 'have' // 手持ちでまかなえる
  | 'check-color' // 同じカテゴリは持っているが、色味の確認が必要
  | 'need' // 手持ちに無い（買い足し候補）
  | 'no-product' // そもそも製品を使わない工程

// 役割が重なるカテゴリ。キーの工程に対して、値のカテゴリでも代替できる。
export const CATEGORY_SUBSTITUTES: Record<string, string[]> = {
  化粧下地: ['BB・下地'],
  'BB・下地': ['化粧下地'],
  // BB は下地とファンデを兼ねる
  ファンデーション: ['BB・下地'],
  // どちらも「油分でうるおいを閉じ込める」役割
  乳液: ['保湿クリーム'],
  保湿クリーム: ['乳液'],
}

// パーソナルカラーの影響を受けるカテゴリ（色味の確認が要るもの）
export const COLOR_SENSITIVE_CATEGORIES = [
  'リップ',
  'チーク',
  'アイシャドウ',
  'アイライナー',
  'アイブロウ',
]

export function isColorSensitive(category: string): boolean {
  return COLOR_SENSITIVE_CATEGORIES.includes(category)
}

// 手法マスターに登場する全カテゴリ（登録フォームの選択肢に使う）。
// TECHNIQUES から算出しているので、手法を足してもここが古くならない。
export function allProductCategories(): string[] {
  const set = new Set<string>()
  const collect = (products?: { category: string }[]) => {
    for (const p of products ?? []) set.add(p.category)
  }
  for (const t of TECHNIQUES) collect(t.products)
  collect(CORRECTION_STEP.products)
  return [...set].sort()
}

// あるカテゴリの工程を、どのカテゴリの手持ちで満たせるか（自分自身を含む）
export function acceptableCategories(required: string): string[] {
  return [required, ...(CATEGORY_SUBSTITUTES[required] ?? [])]
}

export interface StepSubstitution {
  stepId: string
  status: SubstitutionStatus
  // 代替に使える手持ちコスメ（見つかった場合）
  matched?: OwnedCosmetic
  // その工程が必要とするカテゴリ（製品の「一例」が複数あれば複数）
  requiredCategories: string[]
  // 表示用の補足（「BBで代替」「色味が違う」など）
  note?: string
}

/**
 * 1工程を判定する。
 *
 * products は「代表製品の一例」なので、複数あっても組み合わせて使うものではなく
 * 選択肢の列挙。したがって **どれか1つのカテゴリを満たせれば代替できる** とみなす。
 */
export function judgeStep(
  step: RecommendedStep,
  owned: OwnedCosmetic[],
  color: ColorType
): StepSubstitution {
  const requiredCategories = [...new Set((step.products ?? []).map((p) => p.category))]

  if (requiredCategories.length === 0) {
    return { stepId: step.id, status: 'no-product', requiredCategories }
  }

  // 「そのまま使える」ものを優先し、無ければ「要確認」を拾う
  let fallback: StepSubstitution | null = null

  for (const required of requiredCategories) {
    const accepted = acceptableCategories(required)

    for (const item of owned) {
      if (!accepted.includes(item.category)) continue

      const viaSubstitute = item.category !== required
      const substituteNote = viaSubstitute ? `手持ちの「${item.category}」で代替` : undefined

      if (!isColorSensitive(required)) {
        return {
          stepId: step.id,
          status: 'have',
          matched: item,
          requiredCategories,
          note: substituteNote,
        }
      }

      // 色物: 色味が一致 or ニュートラルならそのまま使える
      if (item.tone === color || item.tone === 'neutral') {
        return {
          stepId: step.id,
          status: 'have',
          matched: item,
          requiredCategories,
          note: substituteNote ?? toneNote(item.tone, color),
        }
      }

      // 色味が違う / 未登録 → 断定せず「要確認」に落とす
      fallback ??= {
        stepId: step.id,
        status: 'check-color',
        matched: item,
        requiredCategories,
        note: toneNote(item.tone, color),
      }
    }
  }

  return fallback ?? { stepId: step.id, status: 'need', requiredCategories }
}

function toneNote(tone: CosmeticTone | undefined, color: ColorType): string {
  if (tone === 'neutral') return 'どのタイプでも使いやすい色味'
  if (tone === undefined) return '色味が未登録です。似合う色か確認してください'
  if (tone === color) return `${colorLabel(color)}に合う色味`
  return `${colorLabel(tone)}寄りの色味です。${colorLabel(color)}の手持ちと比べてみてください`
}

export function judgeAll(
  steps: RecommendedStep[],
  owned: OwnedCosmetic[],
  color: ColorType
): StepSubstitution[] {
  return steps.map((s) => judgeStep(s, owned, color))
}

export interface SubstitutionSummary {
  have: number
  checkColor: number
  need: number
  // 製品が必要な工程の数（no-product を除く）
  totalWithProduct: number
  // まかなえている割合（0-100）。要確認は「まかなえている」に含めない
  coverage: number
}

export function summarize(subs: StepSubstitution[]): SubstitutionSummary {
  const have = subs.filter((s) => s.status === 'have').length
  const checkColor = subs.filter((s) => s.status === 'check-color').length
  const need = subs.filter((s) => s.status === 'need').length
  const totalWithProduct = have + checkColor + need
  return {
    have,
    checkColor,
    need,
    totalWithProduct,
    coverage: totalWithProduct > 0 ? Math.round((have / totalWithProduct) * 100) : 0,
  }
}

// 買い足し候補のカテゴリ（重複を除く）。買い物リストとして出す用。
export function shoppingCategories(subs: StepSubstitution[]): string[] {
  const set = new Set<string>()
  for (const s of subs) {
    if (s.status !== 'need') continue
    // 代替が効くカテゴリが複数ある場合は、代表として最初のものを挙げる
    if (s.requiredCategories[0]) set.add(s.requiredCategories[0])
  }
  return [...set]
}
