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

describe('computeResult — 肌質', () => {
  it('乾燥寄りの回答は dry になる', () => {
    const r = computeResult(answers(['q1', 'q1a'], ['q2', 'q2a']))
    expect(r.skin).toBe('dry')
  })
  it('テカり寄りの回答は oily になる', () => {
    const r = computeResult(answers(['q1', 'q1b'], ['q2', 'q2b']))
    expect(r.skin).toBe('oily')
  })
})

describe('computeResult — パーソナルカラー4シーズン', () => {
  // q3: ゴールド(a)=spring+autumn / シルバー(b)=summer+winter
  // q4: 明るい(a)=spring+summer / 深い(b)=autumn+winter
  it('ゴールド × 明るい → スプリング', () => {
    expect(computeResult(answers(['q3', 'q3a'], ['q4', 'q4a'])).color).toBe('spring')
  })
  it('ゴールド × 深い → オータム', () => {
    expect(computeResult(answers(['q3', 'q3a'], ['q4', 'q4b'])).color).toBe('autumn')
  })
  it('シルバー × 明るい → サマー', () => {
    expect(computeResult(answers(['q3', 'q3b'], ['q4', 'q4a'])).color).toBe('summer')
  })
  it('シルバー × 深い → ウィンター', () => {
    expect(computeResult(answers(['q3', 'q3b'], ['q4', 'q4b'])).color).toBe('winter')
  })
})
