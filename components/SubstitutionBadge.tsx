'use client'

import React from 'react'
import type { StepSubstitution } from '../lib/substitution'

// 各工程に付く判定バッジ。
// 「手持ちでOK / 色味を確認 / 買い足し」の3状態を一目で分かるようにする。
const STYLES: Record<
  Exclude<StepSubstitution['status'], 'no-product'>,
  { label: string; className: string }
> = {
  have: {
    label: '手持ちでOK',
    className: 'bg-accent text-ivory border-accent',
  },
  'check-color': {
    label: '色味を確認',
    className: 'bg-accent-soft text-accent border-accent/40',
  },
  need: {
    label: '買い足し',
    className: 'bg-ivory text-muted border-line',
  },
}

export default function SubstitutionBadge({ sub }: { sub: StepSubstitution }) {
  if (sub.status === 'no-product') return null
  const style = STYLES[sub.status]

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <span
        className={`inline-block text-xs px-2.5 py-1 rounded-full border whitespace-nowrap ${style.className}`}
      >
        {style.label}
      </span>
    </span>
  )
}

// バッジの下に出す補足（手持ちの製品名・色味の注意など）
export function SubstitutionNote({ sub }: { sub: StepSubstitution }) {
  if (sub.status === 'no-product' || sub.status === 'need') return null
  return (
    <p className="text-xs text-muted mt-1.5 leading-relaxed">
      {sub.matched && (
        <span className="text-ink">
          {sub.matched.brand ? `${sub.matched.brand} ` : ''}
          {sub.matched.name}
        </span>
      )}
      {sub.note && <span>{sub.matched ? ' — ' : ''}{sub.note}</span>}
    </p>
  )
}
