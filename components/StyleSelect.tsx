'use client'

import React from 'react'
import { motion } from 'framer-motion'
import type { StyleType } from '../lib/types'

type Props = {
  selected: StyleType | null
  onSelect: (style: StyleType) => void
}

const STYLES: { value: StyleType; title: string; desc: string; emoji: string }[] = [
  { value: 'mode', title: 'モード系', desc: 'マットでシャープな端正さ', emoji: '🖤' },
  { value: 'clean', title: '清潔感重視', desc: '素肌っぽいナチュラルさ', emoji: '🤍' },
  { value: 'glow', title: 'ツヤ・グロウ系', desc: '内側から発光するうるおい', emoji: '✨' },
]

export default function StyleSelect({ selected, onSelect }: Props) {
  return (
    <div className="p-6 bg-white rounded-2xl shadow-sm border border-gray-100">
      <span className="inline-block text-xs font-medium text-blue-600 bg-blue-50 rounded-full px-3 py-1 mb-3">
        なりたい系統
      </span>
      <h2 className="text-lg font-semibold mb-4 text-gray-800">
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
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`flex items-center gap-3 text-left p-4 rounded-xl border transition-colors ${
                active
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
              }`}
            >
              <span className="text-2xl">{s.emoji}</span>
              <span>
                <span className="block font-medium text-gray-800">{s.title}</span>
                <span className="block text-sm text-gray-500">{s.desc}</span>
              </span>
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}
