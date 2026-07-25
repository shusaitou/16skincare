import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

// env が揃っている場合のみ実クライアントを生成する。
// Supabase 未設定の間は null を返し、呼び出し側で保存をスキップできるようにする。
export const isSupabaseConfigured = Boolean(url && anonKey)

// ブラウザではセッションを localStorage に永続化し、リロードしてもログインを保つ。
// サーバー（API ルート）から import されたときは永続化しない（共有状態を持たせない）。
const isBrowser = typeof window !== 'undefined'

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url, anonKey, {
      auth: {
        persistSession: isBrowser,
        autoRefreshToken: isBrowser,
        detectSessionInUrl: isBrowser, // マジックリンクのコールバックを処理する
      },
    })
  : null
