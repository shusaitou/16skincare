'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { useFavorites } from './FavoritesProvider'
import type { FavoriteItem } from '../lib/types'

type Props = {
  item: Omit<FavoriteItem, 'created_at'>
  // 手順用の大きめボタン / 製品行に添える小さめボタン
  size?: 'md' | 'sm'
  label?: string
}

// 手順・製品をブックマークするボタン。押した瞬間に見た目が変わる（楽観更新）。
export default function FavoriteButton({ item, size = 'md', label = 'お気に入り' }: Props) {
  const { isFavorite, toggle } = useFavorites()
  const active = isFavorite(item.type, item.key)

  const box = size === 'sm' ? 'w-6 h-6 text-[11px]' : 'w-8 h-8 text-sm'

  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.85 }}
      onClick={() => void toggle(item)}
      aria-pressed={active}
      aria-label={active ? `${label}から外す` : `${label}に追加`}
      title={active ? `${label}から外す` : `${label}に追加`}
      className={`${box} shrink-0 rounded-full border flex items-center justify-center transition-colors ${
        active
          ? 'bg-accent border-accent text-ivory'
          : 'border-line text-muted hover:border-accent hover:text-accent'
      }`}
    >
      {active ? '★' : '☆'}
    </motion.button>
  )
}
