'use client'

import React from 'react'
import { motion } from 'framer-motion'
import type { Gender } from '../lib/types'

type Props = {
  selected: Gender | null
  onSelect: (gender: Gender) => void
}

const GENDERS: { value: Gender; title: string; sub: string }[] = [
  { value: 'women', title: 'レディース', sub: "Women's" },
  { value: 'men', title: 'メンズ', sub: "Men's" },
]

export default function GenderSelect({ selected, onSelect }: Props) {
  return (
    <div className="bg-ivory rounded-sm border border-line p-8">
      <p className="text-xs tracking-editorial text-accent mb-2">STEP 0 — GENDER</p>
      <h2 className="font-serif text-2xl mb-6 text-ink">
        まず、あなたに合わせて
        <br />
        提案を最適化します
      </h2>
      <div className="grid grid-cols-2 gap-4">
        {GENDERS.map((g, i) => {
          const active = selected === g.value
          return (
            <motion.button
              key={g.value}
              onClick={() => onSelect(g.value)}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
              className={`aspect-[4/5] flex flex-col items-center justify-center rounded-sm border transition-colors ${
                active
                  ? 'border-accent bg-accent-soft'
                  : 'border-line hover:border-accent'
              }`}
            >
              <span className="font-serif text-xl text-ink">{g.title}</span>
              <span className="text-xs tracking-editorial text-muted mt-1">{g.sub}</span>
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}
