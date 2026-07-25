import { describe, expect, it } from 'vitest'
import { diffResults, withDiffs } from '../lib/historyDiff'
import type { DiagnosisHistoryEntry, DiagnosisResult } from '../lib/types'

const base: DiagnosisResult = { gender: 'women', skin: 'dry', color: 'autumn', style: 'mode' }

function entry(id: string, created_at: string, result: DiagnosisResult): DiagnosisHistoryEntry {
  return { id, created_at, result, totals: {}, steps: [] }
}

describe('diffResults', () => {
  it('変化が無ければ空配列', () => {
    expect(diffResults(base, { ...base })).toEqual([])
  })

  it('肌質の変化を日本語ラベルで返す', () => {
    const changes = diffResults(base, { ...base, skin: 'normal' })
    expect(changes).toEqual([{ axis: '肌質', from: '乾燥肌', to: '普通肌' }])
  })

  it('複数軸が変わればすべて返す', () => {
    const changes = diffResults(base, { ...base, skin: 'oily', color: 'winter', style: 'glow' })
    expect(changes.map((c) => c.axis)).toEqual(['肌質', 'パーソナルカラー', 'なりたい系統'])
  })

  it('性別は診断ではなく設定なので差分に含めない', () => {
    expect(diffResults(base, { ...base, gender: 'men' })).toEqual([])
  })
})

describe('withDiffs', () => {
  it('新しい順の履歴に、1つ前との差分を添える', () => {
    const rows = withDiffs([
      entry('3', '2026-07-25T10:00:00Z', { ...base, skin: 'normal' }),
      entry('2', '2026-06-25T10:00:00Z', { ...base, skin: 'combination' }),
      entry('1', '2026-05-25T10:00:00Z', base),
    ])

    expect(rows[0].changes).toEqual([{ axis: '肌質', from: '混合肌', to: '普通肌' }])
    expect(rows[1].changes).toEqual([{ axis: '肌質', from: '乾燥肌', to: '混合肌' }])
    // 最古の1件は比較対象が無い
    expect(rows[2].isFirst).toBe(true)
    expect(rows[2].changes).toEqual([])
  })

  it('1件だけならその1件が「はじめての診断」になる', () => {
    const rows = withDiffs([entry('1', '2026-07-25T10:00:00Z', base)])
    expect(rows).toHaveLength(1)
    expect(rows[0].isFirst).toBe(true)
  })

  it('空配列でも壊れない', () => {
    expect(withDiffs([])).toEqual([])
  })
})
