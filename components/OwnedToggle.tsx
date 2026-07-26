'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { useOwnedStore } from '../lib/ownedStore'
import type { Product } from '../lib/types'

// 提案された製品の横に置く「持ってる」トグル。
// 手持ちコスメの登録を、別画面へ移動せずその場で済ませられるようにする。
export default function OwnedToggle({ product }: { product: Product }) {
  const { has, toggle, hydrated } = useOwnedStore()

  // localStorage 読み込み前は判定できないので、SSR と同じ見た目で出す
  const active = hydrated && has(product)

  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.92 }}
      onClick={() =>
        toggle({ category: product.category, name: product.name, brand: product.brand })
      }
      aria-pressed={active}
      title={active ? '手持ちから外す' : '手持ちに追加する'}
      className={`shrink-0 text-xs px-2.5 py-1 rounded-full border transition-colors ${
        active
          ? 'bg-accent border-accent text-ivory'
          : 'border-line text-muted hover:border-accent hover:text-accent'
      }`}
    >
      {active ? '持ってる' : '持ってる?'}
    </motion.button>
  )
}
