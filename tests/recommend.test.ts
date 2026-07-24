import { describe, expect, it } from 'vitest'
import { buildRecommendation } from '../lib/recommend'
import { CORRECTION_STEP } from '../lib/techniques'
import type { DiagnosisResult } from '../lib/types'

const base: DiagnosisResult = { skin: 'oily', color: 'spring', style: 'clean' }

describe('buildRecommendation — 補正処理', () => {
  it('乾燥肌 × モード系（マット）は矛盾するため高保湿工程を先頭に挿入する', () => {
    const rec = buildRecommendation({ skin: 'dry', color: 'autumn', style: 'mode' })
    expect(rec.steps[0].id).toBe(CORRECTION_STEP.id)
    expect(rec.steps[0].isCorrection).toBe(true)
    expect(rec.steps[0].step_order).toBe(0)
    expect(rec.correctionReason).toBeDefined()
  })

  it('脂性肌 × モード系は矛盾しないため補正を挿入しない', () => {
    const rec = buildRecommendation({ skin: 'oily', color: 'autumn', style: 'mode' })
    expect(rec.steps.some((s) => s.isCorrection)).toBe(false)
    expect(rec.correctionReason).toBeUndefined()
  })

  it('乾燥肌でも清潔感系（skin:dryタグ無し）なら補正しない', () => {
    const rec = buildRecommendation({ skin: 'dry', color: 'summer', style: 'clean' })
    expect(rec.steps.some((s) => s.isCorrection)).toBe(false)
  })
})

describe('buildRecommendation — フィルタリング', () => {
  it('選択したカラー(季)以外の color 技法は含まれない', () => {
    const rec = buildRecommendation({ ...base, color: 'winter' })
    const ids = rec.steps.map((s) => s.id)
    expect(ids).toContain('t-color-winter')
    expect(ids).not.toContain('t-color-spring')
    expect(ids).not.toContain('t-color-summer')
    expect(ids).not.toContain('t-color-autumn')
  })

  it('選択した系統以外の style 技法は含まれない', () => {
    const rec = buildRecommendation({ ...base, style: 'glow' })
    const ids = rec.steps.map((s) => s.id)
    expect(ids).toContain('t-glow-dewy')
    expect(ids).toContain('t-glow-highlight')
    expect(ids).not.toContain('t-mode-matte')
    expect(ids).not.toContain('t-clean-natural')
  })

  it('タグ無しの共通ベース手法は常に含まれる', () => {
    const rec = buildRecommendation(base)
    const ids = rec.steps.map((s) => s.id)
    expect(ids).toContain('t-base-cleanse')
    expect(ids).toContain('t-base-lotion')
  })

  it('手順は step_order 昇順（補正は先頭）に並ぶ', () => {
    const rec = buildRecommendation({ skin: 'dry', color: 'spring', style: 'mode' })
    const orders = rec.steps.map((s) => s.step_order)
    const sorted = [...orders].sort((a, b) => a - b)
    expect(orders).toEqual(sorted)
    expect(orders[0]).toBe(0) // 補正ステップ
  })

  it('result をそのまま返す', () => {
    const input: DiagnosisResult = { skin: 'oily', color: 'summer', style: 'glow' }
    expect(buildRecommendation(input).result).toEqual(input)
  })
})
