import { describe, expect, it } from 'vitest'
import { QUESTIONS, computeResult, type Option } from '../lib/diagnosisStore'

// QUESTIONS から選択肢を id で取り出すヘルパー
function opt(questionId: string, optionId: string): Option {
  const q = QUESTIONS.find((q) => q.id === questionId)!
  return q.options.find((o) => o.id === optionId)!
}

function answers(...pairs: [string, string][]): Record<string, Option> {
  const map: Record<string, Option> = {}
  for (const [q, o] of pairs) map[q] = opt(q, o)
  return map
}

describe('computeResult — 肌質（4問）', () => {
  it('乾燥寄りの回答は dry になる', () => {
    const r = computeResult(answers(['q1', 'q1a'], ['q2', 'q2a'], ['q3', 'q3a'], ['q4', 'q4a']))
    expect(r.skin).toBe('dry')
  })
  it('テカり寄りの回答は oily になる', () => {
    const r = computeResult(answers(['q1', 'q1b'], ['q2', 'q2b'], ['q3', 'q3b'], ['q4', 'q4b']))
    expect(r.skin).toBe('oily')
  })
  it('多数決で優勢な方に倒れる（dry3 : oily1 → dry）', () => {
    const r = computeResult(answers(['q1', 'q1a'], ['q2', 'q2a'], ['q3', 'q3a'], ['q4', 'q4b']))
    expect(r.skin).toBe('dry')
  })
})

describe('computeResult — パーソナルカラー4シーズン（特徴ベース）', () => {
  // アンダートーン: q5血管/q6日焼け → warm=spring+autumn / cool=summer+winter
  // 明度: q7瞳/q8顔立ち → light=spring+summer / deep=autumn+winter
  it('暖(緑血管) × 明(明るい瞳) → スプリング', () => {
    expect(computeResult(answers(['q5', 'q5a'], ['q7', 'q7a'])).color).toBe('spring')
  })
  it('暖(緑血管) × 深(深い瞳) → オータム', () => {
    expect(computeResult(answers(['q5', 'q5a'], ['q7', 'q7b'])).color).toBe('autumn')
  })
  it('涼(青血管) × 明(明るい瞳) → サマー', () => {
    expect(computeResult(answers(['q5', 'q5b'], ['q7', 'q7a'])).color).toBe('summer')
  })
  it('涼(青血管) × 深(深い瞳) → ウィンター', () => {
    expect(computeResult(answers(['q5', 'q5b'], ['q7', 'q7b'])).color).toBe('winter')
  })
  it('4問そろって暖×明が優勢 → スプリング', () => {
    const r = computeResult(
      answers(['q5', 'q5a'], ['q6', 'q6a'], ['q7', 'q7a'], ['q8', 'q8a'])
    )
    expect(r.color).toBe('spring')
  })
})
