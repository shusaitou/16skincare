import { describe, expect, it } from 'vitest'
import { buildRecommendation } from '../lib/recommend'
import { CORRECTION_STEP } from '../lib/techniques'
import type { DiagnosisResult } from '../lib/types'

const base: DiagnosisResult = {
  gender: 'women',
  skin: 'oily',
  color: 'spring',
  style: 'clean',
}

describe('buildRecommendation — 補正処理', () => {
  it('乾燥肌 × モード系（マット）は矛盾するため高保湿工程を先頭に挿入する', () => {
    const rec = buildRecommendation({ ...base, skin: 'dry', color: 'autumn', style: 'mode' })
    expect(rec.steps[0].id).toBe(CORRECTION_STEP.id)
    expect(rec.steps[0].isCorrection).toBe(true)
    expect(rec.steps[0].step_order).toBe(0)
    expect(rec.correctionReason).toBeDefined()
  })

  it('脂性肌 × モード系は矛盾しないため補正を挿入しない', () => {
    const rec = buildRecommendation({ ...base, skin: 'oily', style: 'mode' })
    expect(rec.steps.some((s) => s.isCorrection)).toBe(false)
    expect(rec.correctionReason).toBeUndefined()
  })

  it('乾燥肌でも清潔感系（skin:dryタグ無し）なら補正しない', () => {
    const rec = buildRecommendation({ ...base, skin: 'dry', style: 'clean' })
    expect(rec.steps.some((s) => s.isCorrection)).toBe(false)
  })
})

describe('buildRecommendation — フィルタリング', () => {
  it('選択したカラー(季)以外の color 技法は含まれない', () => {
    const rec = buildRecommendation({ ...base, color: 'winter' })
    const ids = rec.steps.map((s) => s.id)
    expect(ids).toContain('t-cheek-winter')
    expect(ids).toContain('t-eyeshadow-winter')
    expect(ids).not.toContain('t-cheek-spring')
    expect(ids).not.toContain('t-eyeshadow-summer')
  })

  it('選択した系統以外の style 技法は含まれない', () => {
    const rec = buildRecommendation({ ...base, style: 'glow' })
    const ids = rec.steps.map((s) => s.id)
    expect(ids).toContain('t-primer-glow')
    expect(ids).toContain('t-highlight')
    expect(ids).not.toContain('t-primer-mode')
    expect(ids).not.toContain('t-primer-clean')
  })

  it('タグ無しの共通ベース手法は常に含まれる', () => {
    const rec = buildRecommendation(base)
    const ids = rec.steps.map((s) => s.id)
    expect(ids).toContain('t-cleanse')
    expect(ids).toContain('t-lotion')
  })

  it('手順は step_order 昇順（補正は先頭）に並ぶ', () => {
    const rec = buildRecommendation({ ...base, skin: 'dry', style: 'mode' })
    const orders = rec.steps.map((s) => s.step_order)
    const sorted = [...orders].sort((a, b) => a - b)
    expect(orders).toEqual(sorted)
    expect(orders[0]).toBe(0) // 補正ステップ
  })

  it('result をそのまま返す', () => {
    const input: DiagnosisResult = {
      gender: 'men',
      skin: 'oily',
      color: 'summer',
      style: 'glow',
    }
    expect(buildRecommendation(input).result).toEqual(input)
  })
})

describe('buildRecommendation — 性別の出し分け', () => {
  it('メンズはメンズ専用手法を含み、レディース専用(color/仕上げ)は含まない', () => {
    const rec = buildRecommendation({ ...base, gender: 'men' })
    const ids = rec.steps.map((s) => s.id)
    expect(ids).toContain('t-men-aftershave')
    expect(ids).toContain('t-men-brow')
    expect(ids).not.toContain('t-cheek-spring') // women 限定
    expect(ids).not.toContain('t-brow-clean') // women 限定
  })

  it('レディースはレディース手法を含み、メンズ専用は含まない', () => {
    const rec = buildRecommendation({ ...base, gender: 'women' })
    const ids = rec.steps.map((s) => s.id)
    expect(ids).toContain('t-cheek-spring')
    expect(ids).not.toContain('t-men-aftershave')
    expect(ids).not.toContain('t-men-brow')
  })

  it('unisex のベース手法は男女どちらにも含まれる', () => {
    const men = buildRecommendation({ ...base, gender: 'men' }).steps.map((s) => s.id)
    const women = buildRecommendation({ ...base, gender: 'women' }).steps.map((s) => s.id)
    for (const id of ['t-cleanse', 't-lotion']) {
      expect(men).toContain(id)
      expect(women).toContain(id)
    }
  })

  it('レディースのフルメイクは十分な工程数になる', () => {
    const rec = buildRecommendation({ ...base, gender: 'women' })
    // スキンケア＋ベース＋ポイントメイクで概ね10工程以上
    expect(rec.steps.length).toBeGreaterThanOrEqual(10)
  })
})

describe('buildRecommendation — 成分・製品の受け渡し', () => {
  it('各ステップに成分・製品が含まれうる（洗顔ステップで確認）', () => {
    const rec = buildRecommendation(base)
    const cleanse = rec.steps.find((s) => s.id === 't-cleanse')!
    expect(cleanse.ingredients && cleanse.ingredients.length).toBeGreaterThan(0)
    expect(cleanse.products && cleanse.products.length).toBeGreaterThan(0)
  })

  it('補正ステップにも成分・製品が付与される', () => {
    const rec = buildRecommendation({ ...base, skin: 'dry', style: 'mode' })
    expect(rec.steps[0].isCorrection).toBe(true)
    expect(rec.steps[0].products && rec.steps[0].products.length).toBeGreaterThan(0)
  })
})
