import { describe, expect, it } from 'vitest'
import {
  activeDatesOf,
  addDays,
  completionRate,
  computeStreak,
  dateKey,
  parseDateKey,
  recentDays,
} from '../lib/streak'

describe('日付ユーティリティ', () => {
  it('ローカル日付を YYYY-MM-DD に整形する', () => {
    expect(dateKey(new Date(2026, 6, 25))).toBe('2026-07-25')
    expect(dateKey(new Date(2026, 0, 3))).toBe('2026-01-03')
  })

  it('深夜でも UTC 変換で前日にずれない', () => {
    // toISOString() を使うと JST 0:30 は前日の UTC 15:30 になってしまう
    expect(dateKey(new Date(2026, 6, 25, 0, 30))).toBe('2026-07-25')
    expect(dateKey(new Date(2026, 6, 25, 23, 59))).toBe('2026-07-25')
  })

  it('月またぎ・年またぎで日付を加減算できる', () => {
    expect(addDays('2026-07-31', 1)).toBe('2026-08-01')
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31')
    expect(addDays('2024-02-28', 1)).toBe('2024-02-29') // 閏年
  })

  it('parseDateKey は dateKey の逆変換になっている', () => {
    expect(dateKey(parseDateKey('2026-07-25'))).toBe('2026-07-25')
  })

  it('recentDays は today を末尾に古い順で返す', () => {
    expect(recentDays(3, '2026-07-25')).toEqual(['2026-07-23', '2026-07-24', '2026-07-25'])
  })
})

describe('computeStreak', () => {
  it('記録が無ければすべて 0', () => {
    expect(computeStreak([], '2026-07-25')).toEqual({ current: 0, longest: 0, totalDays: 0 })
  })

  it('今日を含む連続を数える', () => {
    const dates = ['2026-07-23', '2026-07-24', '2026-07-25']
    expect(computeStreak(dates, '2026-07-25')).toEqual({
      current: 3,
      longest: 3,
      totalDays: 3,
    })
  })

  it('今日が未実施でも昨日まで続いていれば連続は途切れない', () => {
    const dates = ['2026-07-23', '2026-07-24']
    expect(computeStreak(dates, '2026-07-25').current).toBe(2)
  })

  it('2日以上空いたら現在の連続は 0 になる', () => {
    const dates = ['2026-07-20', '2026-07-21', '2026-07-22']
    const r = computeStreak(dates, '2026-07-25')
    expect(r.current).toBe(0)
    expect(r.longest).toBe(3)
  })

  it('途切れがある場合、最長は最も長い連続を返す', () => {
    const dates = [
      '2026-07-01',
      '2026-07-02',
      '2026-07-03',
      '2026-07-04', // 4連続
      '2026-07-10', // 途切れ
      '2026-07-24',
      '2026-07-25', // 2連続（現在）
    ]
    expect(computeStreak(dates, '2026-07-25')).toEqual({
      current: 2,
      longest: 4,
      totalDays: 7,
    })
  })

  it('重複した日付は1日として数える', () => {
    const dates = ['2026-07-25', '2026-07-25', '2026-07-24']
    expect(computeStreak(dates, '2026-07-25')).toEqual({
      current: 2,
      longest: 2,
      totalDays: 2,
    })
  })

  it('月をまたぐ連続も途切れない', () => {
    const dates = ['2026-07-30', '2026-07-31', '2026-08-01']
    expect(computeStreak(dates, '2026-08-01').current).toBe(3)
  })
})

describe('activeDatesOf / completionRate', () => {
  it('チェックが1つも無い日は実施日に数えない', () => {
    const logs = [
      { date: '2026-07-25', stepIds: ['a', 'b'] },
      { date: '2026-07-24', stepIds: [] },
    ]
    expect(activeDatesOf(logs)).toEqual(['2026-07-25'])
  })

  it('達成率は 0〜1 に収まる', () => {
    expect(completionRate({ date: 'd', stepIds: ['a', 'b'] }, 4)).toBe(0.5)
    expect(completionRate(undefined, 4)).toBe(0)
    expect(completionRate({ date: 'd', stepIds: ['a'] }, 0)).toBe(0)
    // 手順が減った後も 1 を超えない
    expect(completionRate({ date: 'd', stepIds: ['a', 'b', 'c'] }, 2)).toBe(1)
  })
})
