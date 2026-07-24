'use client'

import React from 'react'
import { motion } from 'framer-motion'
import type { ColorType, DiagnosisResult, SkinType } from '../lib/types'
import type { ScoreKey } from '../lib/diagnosisStore'
import { colorLabel, skinLabel } from '../lib/recommend'

type Totals = Partial<Record<ScoreKey, number>>

type Props = {
  totals: Totals
  result: DiagnosisResult
}

// 診断スコアを「グループ内の割合」として横棒で可視化する。
// 単一系列の magnitude 表示なので色は accent 一色、勝者のみ濃く。
export default function ScoreChart({ totals, result }: Props) {
  const skinRows: { key: SkinType; label: string }[] = [
    { key: 'dry', label: skinLabel('dry') },
    { key: 'oily', label: skinLabel('oily') },
  ]
  const colorRows: { key: ColorType; label: string }[] = [
    { key: 'spring', label: colorLabel('spring') },
    { key: 'summer', label: colorLabel('summer') },
    { key: 'autumn', label: colorLabel('autumn') },
    { key: 'winter', label: colorLabel('winter') },
  ]

  return (
    <div className="bg-ivory rounded-sm border border-line p-8">
      <p className="text-xs tracking-editorial text-accent mb-1">DIAGNOSIS SCORE</p>
      <h3 className="font-serif text-xl text-ink mb-6">スコアの内訳</h3>

      <p className="text-xs tracking-editorial text-muted mb-3">肌質の傾向</p>
      <BarGroup rows={skinRows} totals={totals} winner={result.skin} />

      <p className="text-xs tracking-editorial text-muted mt-6 mb-3">
        パーソナルカラーの傾向
      </p>
      <BarGroup rows={colorRows} totals={totals} winner={result.color} />
    </div>
  )
}

function BarGroup<T extends ScoreKey>({
  rows,
  totals,
  winner,
}: {
  rows: { key: T; label: string }[]
  totals: Totals
  winner: T
}) {
  const sum = rows.reduce((acc, r) => acc + (totals[r.key] ?? 0), 0)
  return (
    <div className="space-y-2.5">
      {rows.map((r) => {
        const value = totals[r.key] ?? 0
        const pct = sum > 0 ? Math.round((value / sum) * 100) : 0
        const isWinner = r.key === winner
        return (
          <div key={r.key} className="flex items-center gap-3">
            <span
              className={`w-32 shrink-0 text-sm ${
                isWinner ? 'text-ink' : 'text-muted'
              }`}
            >
              {r.label}
            </span>
            <div className="flex-1 h-2.5 bg-accent-soft/50 rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: isWinner ? '#B5806A' : '#D8BFB2' }}
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ type: 'spring', stiffness: 100, damping: 20 }}
              />
            </div>
            <span
              className={`w-10 shrink-0 text-right text-sm tabular-nums ${
                isWinner ? 'text-ink' : 'text-muted'
              }`}
            >
              {pct}%
            </span>
          </div>
        )
      })}
    </div>
  )
}
