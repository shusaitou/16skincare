import type { RoutineLog } from './types'

// ルーティンの継続を可視化するための日付ユーティリティ＋集計。
// 日付は常に「ユーザーのローカル日付」を 'YYYY-MM-DD' 文字列で扱う。
// UTC 変換を挟むと日本時間の深夜に日付がずれるため、toISOString() は使わない。

export function dateKey(date: Date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// 'YYYY-MM-DD' を（ローカル時刻の）Date に戻す
export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(key: string, delta: number): string {
  const date = parseDateKey(key)
  date.setDate(date.getDate() + delta)
  return dateKey(date)
}

// today を末尾とする直近 count 日分のキー（古い順）
export function recentDays(count: number, today: string = dateKey()): string[] {
  const days: string[] = []
  for (let i = count - 1; i >= 0; i--) days.push(addDays(today, -i))
  return days
}

export interface StreakSummary {
  current: number // 現在の連続日数
  longest: number // 過去最長の連続日数
  totalDays: number // 実施した延べ日数
}

/**
 * 実施日の集合から連続日数を集計する。
 *
 * 「実施した日」= 手順を1つ以上チェックした日。
 * current は today から遡って数えるが、今日まだ未実施でも昨日まで続いていれば
 * 連続は途切れていない扱いにする（日付が変わった瞬間に 0 になると継続の妨げになるため）。
 */
export function computeStreak(
  activeDates: Iterable<string>,
  today: string = dateKey()
): StreakSummary {
  const set = new Set(activeDates)
  const sorted = [...set].sort()
  if (sorted.length === 0) return { current: 0, longest: 0, totalDays: 0 }

  // --- 最長連続 ---
  let longest = 1
  let run = 1
  for (let i = 1; i < sorted.length; i++) {
    run = addDays(sorted[i - 1], 1) === sorted[i] ? run + 1 : 1
    if (run > longest) longest = run
  }

  // --- 現在の連続（今日 or 昨日を起点に遡る） ---
  let cursor = set.has(today) ? today : set.has(addDays(today, -1)) ? addDays(today, -1) : null
  let current = 0
  while (cursor && set.has(cursor)) {
    current++
    cursor = addDays(cursor, -1)
  }

  return { current, longest, totalDays: sorted.length }
}

// ログから「1つ以上チェックした日」を取り出す
export function activeDatesOf(logs: RoutineLog[]): string[] {
  return logs.filter((l) => l.stepIds.length > 0).map((l) => l.date)
}

// その日の達成率（0〜1）。totalSteps が 0 のときは 0 を返す。
export function completionRate(log: RoutineLog | undefined, totalSteps: number): number {
  if (!log || totalSteps <= 0) return 0
  return Math.min(1, log.stepIds.length / totalSteps)
}
