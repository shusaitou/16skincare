import { describe, expect, it } from 'vitest'
import { isValidTime, msUntilNext, reminderMessage } from '../lib/reminder'

const MINUTE = 60 * 1000
const HOUR = 60 * MINUTE

describe('isValidTime', () => {
  it('HH:MM 形式だけを受理する', () => {
    expect(isValidTime('21:00')).toBe(true)
    expect(isValidTime('00:00')).toBe(true)
    expect(isValidTime('23:59')).toBe(true)
    expect(isValidTime('24:00')).toBe(false)
    expect(isValidTime('9:00')).toBe(false)
    expect(isValidTime('21:60')).toBe(false)
    expect(isValidTime(undefined)).toBe(false)
  })
})

describe('msUntilNext', () => {
  it('同じ日のこれから来る時刻までを返す', () => {
    const now = new Date(2026, 6, 25, 20, 0)
    expect(msUntilNext('21:00', now)).toBe(1 * HOUR)
  })

  it('既に過ぎた時刻なら翌日の同時刻までを返す', () => {
    const now = new Date(2026, 6, 25, 22, 0)
    expect(msUntilNext('21:00', now)).toBe(23 * HOUR)
  })

  it('ちょうど同時刻なら翌日ぶん（常に正の値）', () => {
    const now = new Date(2026, 6, 25, 21, 0, 0, 0)
    expect(msUntilNext('21:00', now)).toBe(24 * HOUR)
  })

  it('日付をまたぐ設定でも正しく計算する', () => {
    const now = new Date(2026, 6, 25, 23, 30)
    expect(msUntilNext('00:15', now)).toBe(45 * MINUTE)
  })
})

describe('reminderMessage', () => {
  it('未実施があれば件数を伝える', () => {
    expect(reminderMessage(3).body).toContain('3')
  })

  it('全て実施済みなら完了メッセージを返す', () => {
    expect(reminderMessage(0).title).toContain('完了')
    expect(reminderMessage(-1).title).toContain('完了')
  })
})
