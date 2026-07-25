'use client'

import React from 'react'
import { motion } from 'framer-motion'
import type { StyleType } from '../lib/types'

type Props = {
  selected: StyleType | null
  onSelect: (style: StyleType) => void
}

const STYLES: { value: StyleType; title: string; desc: string }[] = [
  { value: 'mode', title: 'モード', desc: 'マットでシャープな端正さ' },
  { value: 'clean', title: 'クリーン', desc: '素肌っぽいナチュラルな清潔感' },
  { value: 'glow', title: 'グロウ', desc: '内側から発光するうるおいツヤ' },
]

export default function StyleSelect({ selected, onSelect }: Props) {
  return (
    <div className="bg-ivory rounded-sm border border-line p-8">
      <p className="text-xs tracking-editorial text-accent mb-3">STYLE — なりたい系統</p>
      <h2 className="font-serif text-2xl mb-6 text-ink">
        どんな仕上がりになりたいですか？
      </h2>
      <div className="grid grid-cols-1 gap-3">
        {STYLES.map((s, i) => {
          const active = selected === s.value
          return (
            <motion.button
              key={s.value}
              onClick={() => onSelect(s.value)}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              whileHover={{ x: 4 }}
              whileTap={{ scale: 0.99 }}
              className={`flex items-baseline gap-4 text-left px-5 py-4 rounded-sm border transition-colors ${
                active ? 'border-accent bg-accent-soft' : 'border-line hover:border-accent'
              }`}
            >
              <span className="font-serif text-lg text-ink w-24 shrink-0">{s.title}</span>
              <span className="text-sm text-muted">{s.desc}</span>
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}
