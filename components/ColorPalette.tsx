'use client'

import React from 'react'
import type { ColorType } from '../lib/types'
import { getPalette, type Swatch } from '../lib/palette'

export default function ColorPalette({ color }: { color: ColorType }) {
  const palette = getPalette(color)

  return (
    <div className="bg-ivory rounded-sm border border-line p-8">
      <p className="text-xs tracking-editorial text-accent mb-1">COLOR PALETTE</p>
      <h3 className="font-serif text-xl text-ink mb-6">あなたに似合う色</h3>

      <p className="text-xs tracking-editorial text-muted mb-3">得意な色</p>
      <div className="grid grid-cols-5 gap-3 mb-8">
        {palette.best.map((s) => (
          <SwatchChip key={s.name} swatch={s} />
        ))}
      </div>

      <p className="text-xs tracking-editorial text-muted mb-3">苦手な色（くすみやすい）</p>
      <div className="flex gap-3 mb-6">
        {palette.avoid.map((s) => (
          <SwatchChip key={s.name} swatch={s} muted />
        ))}
      </div>

      <div className="flex items-center gap-2 text-sm text-ink">
        <span className="text-xs tracking-editorial text-muted">似合うアクセ</span>
        <span
          className="inline-block w-4 h-4 rounded-full border border-line"
          style={{
            background:
              palette.metal === 'gold'
                ? 'linear-gradient(135deg,#E9C46A,#B8860B)'
                : 'linear-gradient(135deg,#E8E8EC,#A9A9B0)',
          }}
        />
        {palette.metal === 'gold' ? 'ゴールド' : 'シルバー'}
      </div>
    </div>
  )
}

function SwatchChip({ swatch, muted = false }: { swatch: Swatch; muted?: boolean }) {
  return (
    <div className="text-center">
      <div
        className={`w-full aspect-square rounded-sm border border-line ${
          muted ? 'opacity-60' : ''
        }`}
        style={{ backgroundColor: swatch.hex }}
      />
      <p className="text-[10px] text-muted mt-1 leading-tight">{swatch.name}</p>
    </div>
  )
}
