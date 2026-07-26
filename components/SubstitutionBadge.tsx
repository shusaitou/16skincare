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

// バッジの下に出す補足（手持ちの製品名・色味の注意・成分の照合結果）
export function SubstitutionNote({ sub }: { sub: StepSubstitution }) {
  if (sub.status === 'no-product' || sub.status === 'need') return null
  return (
    <div className="mt-1.5">
      <p className="text-xs text-muted leading-relaxed">
        {sub.matched && (
          <span className="text-ink">
            {sub.matched.brand ? `${sub.matched.brand} ` : ''}
            {sub.matched.name ?? sub.matched.category}
          </span>
        )}
        {sub.note && <span>{sub.matched ? ' — ' : ''}{sub.note}</span>}
      </p>
      <IngredientNote sub={sub} />
    </div>
  )
}

// 手順の「注目成分」が手持ちに入っているかを示す。
// 全成分表示から分かるのは有無だけで配合量は分からないため、
// 「入っている／見当たらない」以上のことは言わない。
function IngredientNote({ sub }: { sub: StepSubstitution }) {
  const checks = sub.ingredientChecks
  if (!checks || checks.length === 0) return null

  const present = checks.filter((c) => c.verdict === 'present')
  const absent = checks.filter((c) => c.verdict === 'absent')
  if (present.length === 0 && absent.length === 0) return null

  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
      <span className="text-[11px] text-muted">注目成分</span>
      {present.map((c) => (
        <span
          key={c.required}
          title={c.found?.join(' / ')}
          className="text-[11px] bg-accent-soft text-accent px-2 py-0.5 rounded-full"
        >
          ✓ {c.required}
        </span>
      ))}
      {absent.map((c) => (
        <span
          key={c.required}
          className="text-[11px] border border-line text-muted px-2 py-0.5 rounded-full"
        >
          {c.required} は入っていません
        </span>
      ))}
    </div>
  )
}
