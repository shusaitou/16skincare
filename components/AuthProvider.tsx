'use client'

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { isSupabaseConfigured, supabase } from '../lib/supabaseClient'
import { mergeLocalHistory } from '../lib/historyRepository'
import { mergeLocalFavorites } from '../lib/favoritesRepository'
import { mergeLocalRoutineLogs } from '../lib/routineRepository'

// アプリ全体でログイン状態を共有する。
// 未ログインでも各機能は localStorage で動くため、user が null でも UI は壊れない。

export interface AuthUser {
  id: string
  email: string | null
}

interface AuthContextValue {
  user: AuthUser | null
  loading: boolean
  // Supabase の env が設定されているか（未設定ならログイン UI を出さない）
  configured: boolean
  // ログイン直後のローカルデータ引き継ぎが終わると増える。
  // 一覧系はこれを依存に入れて、引き継いだデータを即座に反映する。
  dataVersion: number
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: false,
  configured: false,
  dataVersion: 0,
  signOut: async () => {},
})

export function useAuth(): AuthContextValue {
  return useContext(AuthContext)
}

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(isSupabaseConfigured)
  const [dataVersion, setDataVersion] = useState(0)
  // 同じユーザーで何度もローカルデータ移行を走らせないための記録
  const mergedFor = useRef<string | null>(null)

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }

    let cancelled = false

    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return
      const session = data.session
      setUser(session ? { id: session.user.id, email: session.user.email ?? null } : null)
      setLoading(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return
      setUser(session ? { id: session.user.id, email: session.user.email ?? null } : null)
      setLoading(false)
    })

    return () => {
      cancelled = true
      sub.subscription.unsubscribe()
    }
  }, [])

  // ログインしたら、未ログイン中に貯めたローカルデータをアカウントへ引き継ぐ。
  // 失敗してもログイン自体は成功扱いにする（ローカルデータは消さずに残る）。
  useEffect(() => {
    if (!user || mergedFor.current === user.id) return
    mergedFor.current = user.id
    ;(async () => {
      const results = await Promise.allSettled([
        mergeLocalHistory(user.id),
        mergeLocalFavorites(user.id),
        mergeLocalRoutineLogs(user.id),
      ])
      for (const r of results) {
        if (r.status === 'rejected') {
          console.warn('ローカルデータの引き継ぎに失敗しました', r.reason)
        }
      }
      // 一部だけ成功した場合も、成功したぶんは一覧に反映させたいので常に通知する
      setDataVersion((v) => v + 1)
    })()
  }, [user])

  const signOut = useCallback(async () => {
    if (!supabase) return
    await supabase.auth.signOut()
    mergedFor.current = null
    setUser(null)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({ user, loading, configured: isSupabaseConfigured, dataVersion, signOut }),
    [user, loading, dataVersion, signOut]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
