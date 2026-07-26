'use client'

import React from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { shoppingCategories, summarize, type StepSubstitution } from '../lib/substitution'

// 「今の手持ちでどこまでまかなえるか」を最初に伝えるカード。
// 提案を見て「全部買わないといけないのか」と身構えるのを防ぐのが目的。
export default function SubstitutionSummary({
  subs,
  ownedCount,
}: {
  subs: StepSubstitution[]
  ownedCount: number
}) {
  const s = summarize(subs)
  const shopping = shoppingCategories(subs)

  if (s.totalWithProduct === 0) return null

  return (
    <div className="bg-ivory rounded-sm border border-line p-6">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <p className="text-xs tracking-editorial text-accent mb-1">YOUR COSMETICS</p>
          <h3 className="font-serif text-xl text-ink">手持ちでまかなえるか</h3>
        </div>
        <Link href="/cosmetics" className="text-sm text-accent hover:text-ink shrink-0">
          手持ちを登録 →
        </Link>
      </div>

      {ownedCount === 0 ? (
        <p className="text-sm text-muted leading-relaxed">
          手持ちのコスメを登録すると、提案された{s.totalWithProduct}工程のうち
          どれを買わずに済むかが分かります。下の各工程の「持ってる?」を押すだけでも登録できます。
        </p>
      ) : (
        <>
          {/* 充足率のバー */}
          <div className="flex items-baseline justify-between mb-2">
            <p className="text-sm text-ink">
              製品が必要な{s.totalWithProduct}工程のうち
              <span className="font-serif text-2xl text-accent mx-1.5">{s.have}</span>
              工程は手持ちでまかなえます
            </p>
            <p className="text-sm text-muted tabular-nums">{s.coverage}%</p>
          </div>
          <div className="h-2 w-full bg-accent-soft/50 rounded-full overflow-hidden mb-4">
            <motion.div
              className="h-full bg-accent rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${s.coverage}%` }}
              transition={{ type: 'spring', stiffness: 100, damping: 20 }}
            />
          </div>

          <div className="grid grid-cols-3 gap-px bg-line border border-line rounded-sm overflow-hidden">
            <Cell label="手持ちでOK" value={s.have} />
            <Cell label="色味を確認" value={s.checkColor} />
            <Cell label="買い足し" value={s.need} />
          </div>

          {shopping.length > 0 && (
            <div className="mt-4">
              <p className="text-xs tracking-editorial text-muted mb-2">買い足すなら</p>
              <div className="flex flex-wrap gap-2">
                {shopping.map((c) => (
                  <span
                    key={c}
                    className="text-xs bg-cream border border-line text-ink px-2.5 py-1 rounded-full"
                  >
                    {c}
                  </span>
                ))}
              </div>
            </div>
          )}

          {s.checkColor > 0 && (
            <p className="text-xs text-muted mt-4 leading-relaxed">
              「色味を確認」は、同じ種類のコスメは持っているものの、
              あなたのパーソナルカラーに合うかまでは判断できないものです。
              手持ちの色を登録すると判定が正確になります。
            </p>
          )}
        </>
      )}
    </div>
  )
}

function Cell({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-ivory p-3 text-center">
      <p className="text-xs text-muted mb-0.5">{label}</p>
      <p className="font-serif text-xl text-ink">{value}</p>
    </div>
  )
}
