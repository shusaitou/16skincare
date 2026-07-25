import { supabase } from './supabaseClient'
import type { DiagnosisResult } from './types'

export type SaveStatus = 'saved' | 'skipped' | 'error'

export interface SaveOutcome {
  status: SaveStatus
  message?: string
}

// 診断結果を users テーブルに保存する（auth_id で upsert）。
// - Supabase 未設定、または auth_id 未指定の場合は 'skipped'（エラーにしない）
// - 保存に失敗しても呼び出し側は手順を返せるよう、例外を投げず結果を返す
//
// ※ users には RLS（auth.uid() = auth_id）を設定しているため、API ルートの
//    匿名クライアントから他人の auth_id を指定して書き込むことはできない（= 'error' になる）。
//    ログイン中ユーザーの「現在のタイプ」更新は、セッションを持つブラウザ側から
//    lib/historyRepository.ts の saveHistory() が行う。
export async function saveUserDiagnosis(
  result: DiagnosisResult,
  authId?: string
): Promise<SaveOutcome> {
  if (!supabase) {
    return { status: 'skipped', message: 'Supabase が未設定のため保存をスキップしました' }
  }
  if (!authId) {
    return { status: 'skipped', message: 'auth_id が無いため保存をスキップしました' }
  }

  const { error } = await supabase
    .from('users')
    .upsert(
      {
        auth_id: authId,
        current_skin_type: result.skin,
        current_color_type: result.color,
      },
      { onConflict: 'auth_id' }
    )

  if (error) {
    return { status: 'error', message: error.message }
  }
  return { status: 'saved' }
}
