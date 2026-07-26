import { describe, expect, it } from 'vitest'
import { buildRecommendation, stepsForMode } from '../lib/recommend'
import { TECHNIQUES } from '../lib/techniques'
import type { ColorType, DiagnosisResult, Gender, StyleType } from '../lib/types'

// 時短・ミニマムメイクモード（3ステップ限定）の検証。
// 「3ステップ」はユーザーへの約束なので、全ての性別×系統×カラーの
// 組み合わせで本当に3つになることを網羅的に確かめる。

const GENDERS: Gender[] = ['men', 'women']
const COLORS: ColorType[] = ['spring', 'summer', 'autumn', 'winter']
const STYLES: StyleType[] = ['mode', 'clean', 'glow']
const SKINS: DiagnosisResult['skin'][] = ['dry', 'oily', 'combination', 'normal']

function minimalOf(result: DiagnosisResult) {
  return stepsForMode(buildRecommendation(result).steps, 'minimal')
}

describe('時短モードのステップ数', () => {
  it('全ての組み合わせでちょうど3ステップになる', () => {
    for (const gender of GENDERS) {
      for (const skin of SKINS) {
        for (const color of COLORS) {
          for (const style of STYLES) {
            const steps = minimalOf({ gender, skin, color, style })
            expect(
              steps.length,
              `${gender}/${skin}/${color}/${style} が ${steps.length} ステップ`
            ).toBe(3)
          }
        }
      }
    }
  })

  it('補正が入る組み合わせでも3ステップのまま（補正は工程として足さない）', () => {
    // mode × dry は補正が発生する組み合わせ
    const result: DiagnosisResult = {
      gender: 'women',
      skin: 'dry',
      color: 'autumn',
      style: 'mode',
    }
    const full = buildRecommendation(result)
    expect(full.correctionReason).toBeTruthy()
    expect(full.steps.some((s) => s.isCorrection)).toBe(true)

    const minimal = stepsForMode(full.steps, 'minimal')
    expect(minimal).toHaveLength(3)
    expect(minimal.some((s) => s.isCorrection)).toBe(false)
  })

  it('時短でもスキンケア（保湿）が必ず先頭に来る', () => {
    for (const gender of GENDERS) {
      const steps = minimalOf({ gender, skin: 'dry', color: 'spring', style: 'clean' })
      expect(steps[0].id).toBe('t-emulsion')
    }
  })

  it('性別ごとに想定どおりの3ステップになる', () => {
    const women = minimalOf({ gender: 'women', skin: 'normal', color: 'winter', style: 'glow' })
    // 保湿 → 下地 → リップ
    expect(women.map((s) => s.id)).toEqual(['t-emulsion', 't-primer-glow', 't-lip-winter'])

    const men = minimalOf({ gender: 'men', skin: 'normal', color: 'winter', style: 'glow' })
    // 保湿 → BB → 眉
    expect(men.map((s) => s.id)).toEqual(['t-emulsion', 't-men-sebum-base', 't-men-brow'])
  })

  it('時短の手順は step_order 順に並ぶ', () => {
    const steps = minimalOf({ gender: 'women', skin: 'oily', color: 'summer', style: 'clean' })
    const orders = steps.map((s) => s.step_order)
    expect([...orders].sort((a, b) => a - b)).toEqual(orders)
  })
})

describe('full モードとの関係', () => {
  const result: DiagnosisResult = {
    gender: 'women',
    skin: 'normal',
    color: 'spring',
    style: 'clean',
  }

  it('full は全件を返し、時短はその部分集合になる', () => {
    const { steps } = buildRecommendation(result)
    const full = stepsForMode(steps, 'full')
    const minimal = stepsForMode(steps, 'minimal')

    expect(full).toEqual(steps)
    expect(minimal.length).toBeLessThan(full.length)
    for (const s of minimal) {
      expect(full.some((f) => f.id === s.id)).toBe(true)
    }
  })

  it('steps は常に全件返るので、履歴のスナップショットから時短を再現できる', () => {
    const { steps } = buildRecommendation(result)
    // 保存 → 読み出しを JSON 経由で再現
    const restored = JSON.parse(JSON.stringify(steps))
    expect(stepsForMode(restored, 'minimal')).toHaveLength(3)
  })
})

describe('minimalFor の定義', () => {
  it('minimalFor を持つ手法は、その性別で必ず表示されうる gender 設定になっている', () => {
    for (const t of TECHNIQUES) {
      if (!t.minimalFor) continue
      for (const g of t.minimalFor) {
        expect(
          t.gender === 'unisex' || t.gender === g,
          `${t.id} は ${g} 向けの最低限メイクに指定されているが gender=${t.gender}`
        ).toBe(true)
      }
    }
  })
})
