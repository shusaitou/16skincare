import { supabase } from './supabaseClient'
import { LOCAL_KEYS, readLocal, writeLocal } from './localStore'
import { dateKey } from './streak'
import type { RoutineLog } from './types'

// 毎日のルーティン実施記録。
//   userId あり → Supabase(routine_logs) / userId なし → localStorage
//
// 「行の存在 = その手順を実施した」というモデル。チェックを外したら行を消す。
// 日付はユーザーのローカル日付 'YYYY-MM-DD'（lib/streak.ts の dateKey）。

const LOCAL_RETAIN_DAYS = 120 // ローカルは直近ぶんだけ保持

interface RoutineRow {
  log_date: string
  step_id: string
}

function readLocalLogs(): RoutineLog[] {
  return readLocal<RoutineLog[]>(LOCAL_KEYS.routine, [])
}

function writeLocalLogs(logs: RoutineLog[]): void {
  const sorted = [...logs].filter((l) => l.stepIds.length > 0).sort((a, b) => (a.date < b.date ? 1 : -1))
  writeLocal(LOCAL_KEYS.routine, sorted.slice(0, LOCAL_RETAIN_DAYS))
}

// 行の配列を「日付ごと」にまとめる
function groupRows(rows: RoutineRow[]): RoutineLog[] {
  const byDate = new Map<string, string[]>()
  for (const row of rows) {
    // Postgres の date は 'YYYY-MM-DD' で返るが、環境によっては時刻が付くので切る
    const date = row.log_date.slice(0, 10)
    const list = byDate.get(date)
    if (list) list.push(row.step_id)
    else byDate.set(date, [row.step_id])
  }
  return [...byDate.entries()]
    .map(([date, stepIds]) => ({ date, stepIds }))
    .sort((a, b) => (a.date < b.date ? 1 : -1))
}

// since 以降（含む）のログを新しい日付順で返す
export async function listRoutineLogs(
  userId: string | null,
  since: string
): Promise<RoutineLog[]> {
  if (userId && supabase) {
    const { data, error } = await supabase
      .from('routine_logs')
      .select('log_date, step_id')
      .eq('auth_id', userId)
      .gte('log_date', since)
      .order('log_date', { ascending: false })
    if (error) throw new Error(error.message)
    return groupRows(data as RoutineRow[])
  }
  return readLocalLogs().filter((l) => l.date >= since)
}

export async function toggleRoutineStep(
  userId: string | null,
  stepId: string,
  done: boolean,
  date: string = dateKey()
): Promise<void> {
  if (userId && supabase) {
    if (done) {
      const { error } = await supabase
        .from('routine_logs')
        .upsert(
          { auth_id: userId, log_date: date, step_id: stepId },
          { onConflict: 'auth_id,log_date,step_id' }
        )
      if (error) throw new Error(error.message)
    } else {
      const { error } = await supabase
        .from('routine_logs')
        .delete()
        .eq('auth_id', userId)
        .eq('log_date', date)
        .eq('step_id', stepId)
      if (error) throw new Error(error.message)
    }
    return
  }

  const logs = readLocalLogs()
  const day = logs.find((l) => l.date === date)
  if (done) {
    if (day) {
      if (!day.stepIds.includes(stepId)) day.stepIds = [...day.stepIds, stepId]
      writeLocalLogs(logs)
    } else {
      writeLocalLogs([{ date, stepIds: [stepId] }, ...logs])
    }
  } else if (day) {
    day.stepIds = day.stepIds.filter((id) => id !== stepId)
    writeLocalLogs(logs)
  }
}

// ログイン直後、ローカルの記録を Supabase へ引き継ぐ。戻り値は移行した行数。
export async function mergeLocalRoutineLogs(userId: string): Promise<number> {
  if (!supabase) return 0
  const local = readLocalLogs()
  const rows = local.flatMap((l) =>
    l.stepIds.map((stepId) => ({ auth_id: userId, log_date: l.date, step_id: stepId }))
  )
  if (rows.length === 0) return 0

  const { error } = await supabase
    .from('routine_logs')
    .upsert(rows, { onConflict: 'auth_id,log_date,step_id' })
  if (error) throw new Error(error.message)

  writeLocal(LOCAL_KEYS.routine, [])
  return rows.length
}
