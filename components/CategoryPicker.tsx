'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { categoryGroups } from '../lib/categories'
import { isColorSensitive } from '../lib/substitution'
import { colorLabel } from '../lib/recommend'
import { useOwnedStore } from '../lib/ownedStore'
import type { ColorType, CosmeticTone, OwnedCosmetic } from '../lib/types'

// カテゴリをタップするだけで手持ちを登録する。
//
// 代替判定はカテゴリしか見ていないので、これだけで判定は成立する。
// 製品名を打たせないことが、登録のハードルを下げる一番の近道。

const TONES: { value: CosmeticTone; label: string }[] = [
  { value: 'neutral', label: 'どれにも合う' },
  ...(['spring', 'summer', 'autumn', 'winter'] as ColorType[]).map((c) => ({
    value: c as CosmeticTone,
    label: colorLabel(c).replace(/（.*）/, ''),
  })),
]

export default function CategoryPicker() {
  const { items, add, remove, hydrated } = useOwnedStore()

  // そのカテゴリで「製品名なし」の登録があるか（タップ登録したもの）
  const quickOf = (category: string): OwnedCosmetic | undefined =>
    items.find((i) => i.category === category && !i.name)

  // そのカテゴリに何らかの登録があるか（製品名つきも含む）
  const countOf = (category: string) => items.filter((i) => i.category === category).length

  return (
    <div className="space-y-6">
      {categoryGroups().map((group) => (
        <div key={group.label}>
          <p className="text-xs tracking-editorial text-muted mb-2.5">{group.label}</p>
          <div className="flex flex-wrap gap-2">
            {group.categories.map((category) => {
              const quick = quickOf(category)
              const total = hydrated ? countOf(category) : 0
              const active = total > 0

              return (
                <div key={category} className="flex flex-col gap-1.5">
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.94 }}
                    aria-pressed={active}
                    onClick={() => {
                      // タップ登録（製品名なし）だけを切り替える。
                      // 製品名つきで登録したものは、ここでは消さない。
                      if (quick) remove(quick.id)
                      else add({ category })
                    }}
                    className={`px-3.5 py-2 rounded-full border text-sm transition-colors ${
                      active
                        ? 'bg-accent border-accent text-ivory'
                        : 'bg-ivory border-line text-ink hover:border-accent hover:text-accent'
                    }`}
                  >
                    {active && <span className="mr-1">✓</span>}
                    {category}
                    {total > 1 && <span className="ml-1.5 text-xs opacity-70">{total}</span>}
                  </motion.button>

                  {/* 色物は、登録済みのときだけ色味を選べるようにする */}
                  {active && quick && isColorSensitive(category) && (
                    <ToneChips owned={quick} />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

function ToneChips({ owned }: { owned: OwnedCosmetic }) {
  const { setTone } = useOwnedStore()
  return (
    <div className="flex flex-wrap gap-1">
      {TONES.map((t) => {
        const on = owned.tone === t.value
        return (
          <button
            key={t.value}
            type="button"
            aria-pressed={on}
            onClick={() => setTone(owned.id, on ? undefined : t.value)}
            className={`px-2 py-0.5 rounded-full border text-[11px] transition-colors ${
              on
                ? 'bg-accent-soft border-accent text-accent'
                : 'bg-ivory border-line text-muted hover:text-accent'
            }`}
          >
            {t.label}
          </button>
        )
      })}
    </div>
  )
}
