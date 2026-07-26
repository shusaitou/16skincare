import { describe, expect, it } from 'vitest'
import {
  buildScoreTrends,
  buildWeeklyReview,
  daysBetween,
  isoToDateKey,
  rediagnosisSuggestion,
} from '../lib/progress'
import type { DiagnosisHistoryEntry, RecommendedStep, RoutineLog } from '../lib/types'

const RESULT = { gender: 'women', skin: 'dry', color: 'autumn', style: 'mode' } as const

// created_at はローカル時刻で作る（isoToDateKey はローカル日付に落とすため）
function entry(
  id: string,
  localDate: [number, number, number],
  totals: Record<string, number>
): DiagnosisHistoryEntry {
  const [y, m, d] = localDate
  return {
    id,
    created_at: new Date(y, m - 1, d, 12, 0).toISOString(),
    result: { ...RESULT },
    totals,
    steps: [],
  }
}

function step(id: string, description = id): RecommendedStep {
  return { id, step_order: 10, description }
}

describe('daysBetween / isoToDateKey', () => {
  it('日数の差を返す', () => {
    expect(daysBetween('2026-07-01', '2026-07-31')).toBe(30)
    expect(daysBetween('2026-07-31', '2026-07-01')).toBe(-30)
    expect(daysBetween('2026-07-25', '2026-07-25')).toBe(0)
  })

  it('月・年をまたいでも正しい', () => {
    expect(daysBetween('2025-12-31', '2026-01-01')).toBe(1)
    expect(daysBetween('2024-02-28', '2024-03-01')).toBe(2) // 閏年
  })

  it('夏時間の無い日本時間でもズレない（ローカル日付に落とす）', () => {
    const iso = new Date(2026, 6, 25, 23, 30).toISOString()
    expect(isoToDateKey(iso)).toBe('2026-07-25')
  })

  it('不正な日時は空文字を返す', () => {
    expect(isoToDateKey('not-a-date')).toBe('')
  })
})

describe('rediagnosisSuggestion', () => {
  const logs: RoutineLog[] = [
    { date: '2026-07-20', stepIds: ['a'] },
    { date: '2026-07-21', stepIds: ['a', 'b'] },
    { date: '2026-07-22', stepIds: [] }, // 実施ゼロの日は数えない
  ]

  it('履歴が無ければすすめない', () => {
    expect(rediagnosisSuggestion(null, logs, '2026-07-25')).toEqual({
      suggest: false,
      daysSince: 0,
      activeDays: 0,
    })
  })

  it('30日未満ならすすめない', () => {
    const latest = entry('1', [2026, 7, 1], {})
    const r = rediagnosisSuggestion(latest, [], '2026-07-25')
    expect(r.suggest).toBe(false)
    expect(r.daysSince).toBe(24)
  })

  it('30日経ったらすすめる', () => {
    const latest = entry('1', [2026, 6, 25], {})
    const r = rediagnosisSuggestion(latest, [], '2026-07-25')
    expect(r.suggest).toBe(true)
    expect(r.daysSince).toBe(30)
  })

  it('前回の診断以降に実施した日数を数える', () => {
    const latest = entry('1', [2026, 6, 25], {})
    const r = rediagnosisSuggestion(latest, logs, '2026-07-25')
    // 2026-07-20 と 07-21（07-22 は stepIds が空なので除外）
    expect(r.activeDays).toBe(2)
  })

  it('診断より前の記録は数えない', () => {
    const latest = entry('1', [2026, 7, 21], {})
    const r = rediagnosisSuggestion(latest, logs, '2026-08-25')
    expect(r.activeDays).toBe(1) // 07-21 のみ
  })

  it('間隔は呼び出し側で変えられる', () => {
    const latest = entry('1', [2026, 7, 18], {})
    expect(rediagnosisSuggestion(latest, [], '2026-07-25', 7).suggest).toBe(true)
    expect(rediagnosisSuggestion(latest, [], '2026-07-25', 14).suggest).toBe(false)
  })
})

describe('buildScoreTrends', () => {
  it('診断が1件だけなら推移を作らない', () => {
    expect(buildScoreTrends([entry('1', [2026, 7, 25], { dry: 8 })], 'skin')).toEqual([])
    expect(buildScoreTrends([], 'skin')).toEqual([])
  })

  it('軸内の割合に正規化する（スコアの絶対値に依存しない）', () => {
    const history = [
      entry('2', [2026, 7, 25], { dry: 2, oily: 2, combination: 2, normal: 2 }), // 各25%
      entry('1', [2026, 6, 25], { dry: 8 }), // dry 100%
    ]
    const trends = buildScoreTrends(history, 'skin')
    const dry = trends.find((t) => t.key === 'dry')!
    // 古い順に並ぶ: 100% → 25%
    expect(dry.points.map((p) => p.percent)).toEqual([100, 25])
    expect(dry.delta).toBe(-75)
  })

  it('新しい順の入力を、古い順の系列に並べ替える', () => {
    const history = [
      entry('3', [2026, 7, 25], { dry: 4 }),
      entry('2', [2026, 6, 25], { dry: 4 }),
      entry('1', [2026, 5, 25], { dry: 4 }),
    ]
    const dry = buildScoreTrends(history, 'skin').find((t) => t.key === 'dry')!
    expect(dry.points.map((p) => p.date)).toEqual(['2026-05-25', '2026-06-25', '2026-07-25'])
  })

  it('4つの肌質すべての系列を返す', () => {
    const history = [
      entry('2', [2026, 7, 25], { dry: 4 }),
      entry('1', [2026, 6, 25], { dry: 4 }),
    ]
    expect(buildScoreTrends(history, 'skin').map((t) => t.key)).toEqual([
      'dry',
      'oily',
      'combination',
      'normal',
    ])
  })

  it('カラー軸も同様に扱える', () => {
    const history = [
      entry('2', [2026, 7, 25], { spring: 4 }),
      entry('1', [2026, 6, 25], { winter: 4 }),
    ]
    const trends = buildScoreTrends(history, 'color')
    expect(trends.map((t) => t.key)).toEqual(['spring', 'summer', 'autumn', 'winter'])
    expect(trends.find((t) => t.key === 'spring')!.points.map((p) => p.percent)).toEqual([0, 100])
  })

  it('totals が空でも 0% として壊れずに扱う', () => {
    const history = [entry('2', [2026, 7, 25], {}), entry('1', [2026, 6, 25], {})]
    const dry = buildScoreTrends(history, 'skin').find((t) => t.key === 'dry')!
    expect(dry.points.every((p) => p.percent === 0)).toBe(true)
    expect(dry.delta).toBe(0)
  })
})

describe('buildWeeklyReview', () => {
  const steps = [step('t-a', '洗顔'), step('t-b', '化粧水'), step('t-c', '日焼け止め')]

  it('直近7日ぶんだけを集計する', () => {
    const logs: RoutineLog[] = [
      { date: '2026-07-25', stepIds: ['t-a'] },
      { date: '2026-07-19', stepIds: ['t-a'] }, // 7日前（範囲内）
      { date: '2026-07-18', stepIds: ['t-a'] }, // 8日前（範囲外）
    ]
    const r = buildWeeklyReview(logs, steps, '2026-07-25')
    expect(r.from).toBe('2026-07-19')
    expect(r.to).toBe('2026-07-25')
    expect(r.activeDays).toBe(2)
    expect(r.totalChecks).toBe(2)
  })

  it('続いた工程と落ちた工程を仕分ける', () => {
    const logs: RoutineLog[] = [
      { date: '2026-07-25', stepIds: ['t-a', 't-b'] },
      { date: '2026-07-24', stepIds: ['t-a'] },
      { date: '2026-07-23', stepIds: ['t-a'] },
    ]
    const r = buildWeeklyReview(logs, steps, '2026-07-25')
    expect(r.kept[0]).toMatchObject({ stepId: 't-a', doneDays: 3 })
    expect(r.kept.map((k) => k.stepId)).toEqual(['t-a', 't-b'])
    // 一度もチェックされていない工程
    expect(r.dropped.map((d) => d.stepId)).toEqual(['t-c'])
  })

  it('記録が1日も無い週は、全工程を「落ちた」と責めない', () => {
    const r = buildWeeklyReview([], steps, '2026-07-25')
    expect(r.activeDays).toBe(0)
    expect(r.kept).toEqual([])
    expect(r.dropped).toEqual([])
  })

  it('手順が無い場合でも壊れない', () => {
    const r = buildWeeklyReview([{ date: '2026-07-25', stepIds: ['x'] }], [], '2026-07-25')
    expect(r.activeDays).toBe(1)
    expect(r.kept).toEqual([])
  })

  it('実施率は 0〜1 に収まる', () => {
    const logs: RoutineLog[] = Array.from({ length: 7 }, (_, i) => ({
      date: `2026-07-${19 + i}`,
      stepIds: ['t-a'],
    }))
    const r = buildWeeklyReview(logs, steps, '2026-07-25')
    expect(r.kept[0].rate).toBe(1)
    expect(r.kept[0].doneDays).toBe(7)
  })
})
