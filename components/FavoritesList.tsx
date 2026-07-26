'use client'

import React from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { useFavorites } from './FavoritesProvider'
import type { FavoriteItem, FavoriteType } from '../lib/types'

const TYPE_LABEL: Record<FavoriteType, string> = {
  step: '手順',
  product: '製品',
}

// ブックマークした手順・製品の一覧（種別ごとにまとめて表示）。
export default function FavoritesList() {
  const { favorites, loading, remove, error } = useFavorites()

  if (loading) return <p className="text-sm text-muted">読み込み中…</p>

  if (favorites.length === 0) {
    return (
      <div className="bg-ivory rounded-sm border border-line p-6">
        <p className="text-sm text-muted leading-relaxed mb-4">
          お気に入りはまだありません。診断結果の各手順・製品にある ☆ を押すと、ここに集まります。
        </p>
        <Link
          href="/diagnosis"
          className="inline-block px-5 py-2.5 bg-ink text-cream rounded-sm hover:bg-accent transition-colors text-sm"
        >
          診断結果を見る →
        </Link>
      </div>
    )
  }

  const groups: FavoriteType[] = ['step', 'product']

  return (
    <div className="space-y-6">
      {error && (
        <p className="text-sm text-ink bg-accent-soft border border-accent/30 rounded-sm p-3">
          {error}
        </p>
      )}
      {groups.map((type) => {
        const items = favorites.filter((f) => f.type === type)
        if (items.length === 0) return null
        return (
          <section key={type} className="bg-ivory rounded-sm border border-line p-6">
            <p className="text-xs tracking-editorial text-accent mb-4">
              {TYPE_LABEL[type]} — {items.length}件
            </p>
            <ul className="space-y-3">
              {items.map((item) => (
                <FavoriteRow
                  key={`${item.type}-${item.key}`}
                  item={item}
                  onRemove={() => void remove(item.type, item.key)}
                />
              ))}
            </ul>
          </section>
        )
      })}
    </div>
  )
}

function FavoriteRow({ item, onRemove }: { item: FavoriteItem; onRemove: () => void }) {
  return (
    <motion.li
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex items-start gap-3 pb-3 border-b border-line last:border-0 last:pb-0"
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm text-ink leading-relaxed">{item.label}</p>
        {item.sublabel && <p className="text-xs text-muted mt-1">{item.sublabel}</p>}
      </div>
      <button
        onClick={onRemove}
        aria-label="お気に入りから外す"
        className="shrink-0 w-7 h-7 rounded-full border border-accent bg-accent text-ivory text-xs hover:bg-ivory hover:text-accent transition-colors"
      >
        ★
      </button>
    </motion.li>
  )
}
