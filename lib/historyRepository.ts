import { supabase } from './supabaseClient'
import { LOCAL_KEYS, localId, readLocal, writeLocal } from './localStore'
import type {
  DiagnosisHistoryEntry,
  DiagnosisResult,
  RecommendedStep,
} from './types'

// 診断履歴の読み書き。
//   userId あり → Supabase(diagnosis_history) / userId なし → localStorage
// 呼び出し側は同じ型で扱えるよう、どちらも DiagnosisHistoryEntry[] を新しい順で返す。

const LOCAL_LIMIT = 30 // ローカルは無限に増やさない

export interface NewHistoryEntry {
  result: DiagnosisResult
  totals: Record<string, number>
  steps: RecommendedStep[]
  correctionReason?: string
}

// Supabase の行 → アプリの型
interface HistoryRow {
  id: string
  created_at: string
  gender: DiagnosisResult['gender']
  skin_type: DiagnosisResult['skin']
  color_type: DiagnosisResult['color']
  style: DiagnosisResult['style']
  totals: Record<string, number> | null
  steps: RecommendedStep[] | null
  correction_reason: string | null
}

function fromRow(row: HistoryRow): DiagnosisHistoryEntry {
  return {
    id: row.id,
    created_at: row.created_at,
    result: {
      gender: row.gender,
      skin: row.skin_type,
      color: row.color_type,
      style: row.style,
    },
    totals: row.totals ?? {},
    steps: row.steps ?? [],
    correctionReason: row.correction_reason ?? undefined,
  }
}

function readLocalHistory(): DiagnosisHistoryEntry[] {
  return readLocal<DiagnosisHistoryEntry[]>(LOCAL_KEYS.history, [])
}

// 新しい順（created_at 降順）で返す
export async function listHistory(userId: string | null): Promise<DiagnosisHistoryEntry[]> {
  if (userId && supabase) {
    const { data, error } = await supabase
      .from('diagnosis_history')
      .select('*')
      .eq('auth_id', userId)
      .order('created_at', { ascending: false })
      .limit(50)
    if (error) throw new Error(error.message)
    return (data as HistoryRow[]).map(fromRow)
  }
  return readLocalHistory()
}

export async function saveHistory(
  userId: string | null,
  input: NewHistoryEntry
): Promise<DiagnosisHistoryEntry> {
  const entry: DiagnosisHistoryEntry = {
    id: localId('hist'),
    created_at: new Date().toISOString(),
    ...input,
  }

  if (userId && supabase) {
    const { data, error } = await supabase
      .from('diagnosis_history')
      .insert({
        auth_id: userId,
        gender: input.result.gender,
        skin_type: input.result.skin,
        color_type: input.result.color,
        style: input.result.style,
        totals: input.totals,
        steps: input.steps,
        correction_reason: input.correctionReason ?? null,
      })
      .select()
      .single()
    if (error) throw new Error(error.message)

    // users テーブルの「現在のタイプ」も最新に揃えておく
    await supabase
      .from('users')
      .upsert(
        {
          auth_id: userId,
          current_skin_type: input.result.skin,
          current_color_type: input.result.color,
        },
        { onConflict: 'auth_id' }
      )

    return fromRow(data as HistoryRow)
  }

  const next = [entry, ...readLocalHistory()].slice(0, LOCAL_LIMIT)
  writeLocal(LOCAL_KEYS.history, next)
  return entry
}

export async function deleteHistory(userId: string | null, id: string): Promise<void> {
  if (userId && supabase) {
    const { error } = await supabase
      .from('diagnosis_history')
      .delete()
      .eq('auth_id', userId)
      .eq('id', id)
    if (error) throw new Error(error.message)
    return
  }
  writeLocal(
    LOCAL_KEYS.history,
    readLocalHistory().filter((h) => h.id !== id)
  )
}

// 最新の診断（= 今のルーティンの元ネタ）。無ければ null。
export async function latestHistory(
  userId: string | null
): Promise<DiagnosisHistoryEntry | null> {
  const list = await listHistory(userId)
  return list[0] ?? null
}

/**
 * ログイン直後に、未ログイン中の履歴を Supabase へ引き継ぐ。
 * 同じ診断を何度も積まないよう、リモートに同時刻・同結果が無いものだけを送る。
 * 戻り値は移行した件数。
 */
export async function mergeLocalHistory(userId: string): Promise<number> {
  if (!supabase) return 0
  const local = readLocalHistory()
  if (local.length === 0) return 0

  const remote = await listHistory(userId)
  const seen = new Set(remote.map((h) => `${h.created_at}|${signatureOf(h)}`))
  const pending = local.filter((h) => !seen.has(`${h.created_at}|${signatureOf(h)}`))

  if (pending.length > 0) {
    const { error } = await supabase.from('diagnosis_history').insert(
      pending.map((h) => ({
        auth_id: userId,
        gender: h.result.gender,
        skin_type: h.result.skin,
        color_type: h.result.color,
        style: h.result.style,
        totals: h.totals,
        steps: h.steps,
        correction_reason: h.correctionReason ?? null,
        created_at: h.created_at,
      }))
    )
    if (error) throw new Error(error.message)
  }

  writeLocal(LOCAL_KEYS.history, [])
  return pending.length
}

function signatureOf(h: DiagnosisHistoryEntry): string {
  const { gender, skin, color, style } = h.result
  return `${gender}:${skin}:${color}:${style}`
}
