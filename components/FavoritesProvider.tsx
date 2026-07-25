'use client'

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { useAuth } from './AuthProvider'
import {
  addFavorite,
  listFavorites,
  removeFavorite,
} from '../lib/favoritesRepository'
import type { FavoriteItem, FavoriteType } from '../lib/types'

// お気に入りを1か所で持つ。結果画面に並ぶ多数のボタンが個別に問い合わせないようにする。

interface FavoritesContextValue {
  favorites: FavoriteItem[]
  loading: boolean
  isFavorite: (type: FavoriteType, key: string) => boolean
  toggle: (item: Omit<FavoriteItem, 'created_at'>) => Promise<void>
  remove: (type: FavoriteType, key: string) => Promise<void>
  error: string | null
}

const FavoritesContext = createContext<FavoritesContextValue>({
  favorites: [],
  loading: false,
  isFavorite: () => false,
  toggle: async () => {},
  remove: async () => {},
  error: null,
})

export function useFavorites(): FavoritesContextValue {
  return useContext(FavoritesContext)
}

export default function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading, dataVersion } = useAuth()
  const [favorites, setFavorites] = useState<FavoriteItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const userId = user?.id ?? null

  useEffect(() => {
    // 認証状態が確定してから読む（確定前に読むとローカル→リモートで二度読みになる）
    if (authLoading) return
    let cancelled = false
    setLoading(true)
    listFavorites(userId)
      .then((list) => {
        if (!cancelled) {
          setFavorites(list)
          setError(null)
        }
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [userId, authLoading, dataVersion])

  const isFavorite = useCallback(
    (type: FavoriteType, key: string) => favorites.some((f) => f.type === type && f.key === key),
    [favorites]
  )

  const remove = useCallback(
    async (type: FavoriteType, key: string) => {
      const before = favorites
      setFavorites(before.filter((f) => !(f.type === type && f.key === key)))
      try {
        await removeFavorite(userId, type, key)
      } catch (e) {
        setFavorites(before) // 失敗したら元に戻す
        setError((e as Error).message)
      }
    },
    [favorites, userId]
  )

  const toggle = useCallback(
    async (item: Omit<FavoriteItem, 'created_at'>) => {
      if (favorites.some((f) => f.type === item.type && f.key === item.key)) {
        await remove(item.type, item.key)
        return
      }
      const before = favorites
      const optimistic: FavoriteItem = { ...item, created_at: new Date().toISOString() }
      setFavorites([optimistic, ...before])
      try {
        await addFavorite(userId, item)
        setError(null)
      } catch (e) {
        setFavorites(before)
        setError((e as Error).message)
      }
    },
    [favorites, remove, userId]
  )

  const value = useMemo<FavoritesContextValue>(
    () => ({ favorites, loading, isFavorite, toggle, remove, error }),
    [favorites, loading, isFavorite, toggle, remove, error]
  )

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>
}
