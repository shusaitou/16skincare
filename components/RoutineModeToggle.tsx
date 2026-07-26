'use client'

import React from 'react'
import { motion } from 'framer-motion'
import type { RoutineMode } from '../lib/types'

type Props = {
  mode: RoutineMode
  onChange: (mode: RoutineMode) => void
  fullCount: number
  minimalCount: number
  // マイページのルーティンでは「今日は」という文脈で見せる
  context?: 'result' | 'routine'
}

// フルルーティン ⇄ 時短（最低限メイク）の切り替え。
// 情報量が多すぎて手が止まるのを防ぐのが目的なので、
// 「時間がない日はこれだけでいい」と分かる文言を添える。
export default function RoutineModeToggle({
  mode,
  onChange,
  fullCount,
  minimalCount,
  context = 'result',
}: Props) {
  const options: { id: RoutineMode; label: string; note: string; count: number }[] = [
    {
      id: 'full',
      label: 'フルルーティン',
      note: 'じっくり仕上げる日に',
      count: fullCount,
    },
    {
      id: 'minimal',
      label: '時短・最低限',
      note: context === 'routine' ? '時間がない日はこれだけ' : 'まずはここから始めたい人へ',
      count: minimalCount,
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-px bg-line border border-line rounded-sm overflow-hidden">
      {options.map((opt) => {
        const active = mode === opt.id
        return (
          <button
            key={opt.id}
            onClick={() => onChange(opt.id)}
            aria-pressed={active}
            disabled={opt.count === 0}
            className={`relative text-left px-4 py-3 transition-colors disabled:opacity-40 ${
              active ? 'bg-ink text-cream' : 'bg-ivory text-ink hover:bg-cream'
            }`}
          >
            <span className="flex items-baseline gap-2">
              <span className="text-sm">{opt.label}</span>
              <span className={`text-xs ${active ? 'text-cream/70' : 'text-accent'}`}>
                {opt.count}ステップ
              </span>
            </span>
            <span className={`block text-xs mt-0.5 ${active ? 'text-cream/70' : 'text-muted'}`}>
              {opt.note}
            </span>
            {active && (
              <motion.span
                layoutId={`routine-mode-${context}`}
                className="absolute inset-x-0 bottom-0 h-0.5 bg-accent"
              />
            )}
          </button>
        )
      })}
    </div>
  )
}
