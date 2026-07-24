'use client'

import React from 'react'
import { motion } from 'framer-motion'
import type { Product, RecommendationResponse } from '../lib/types'
import type { ScoreKey } from '../lib/diagnosisStore'
import { colorLabel, styleLabel } from '../lib/recommend'
import { PRODUCT_DISCLAIMER } from '../lib/techniques'
import PersonaCard from './PersonaCard'
import ScoreChart from './ScoreChart'
import ColorPalette from './ColorPalette'
import ShareCard from './ShareCard'

type Props = {
  recommendation: RecommendationResponse
  totals: Partial<Record<ScoreKey, number>>
  onReset: () => void
}

export default function ResultView({ recommendation, totals, onReset }: Props) {
  const { result, steps, correctionReason } = recommendation
  const hasProducts = steps.some((s) => s.products && s.products.length > 0)

  return (
    <div className="space-y-6">
      {/* 1. タイプのアイデンティティ */}
      <PersonaCard result={result} />

      {/* 2. スコアの可視化 */}
      <ScoreChart totals={totals} result={result} />

      {/* 3. カラーパレット */}
      <ColorPalette color={result.color} />

      {/* 4. 補正が入った場合の説明 */}
      {correctionReason && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-accent-soft border border-accent/30 text-ink text-sm rounded-sm p-4 leading-relaxed"
        >
          ⚠️ {correctionReason}
        </motion.div>
      )}

      {/* 5. おすすめ手順（成分・製品つき） */}
      <div className="bg-ivory rounded-sm border border-line p-8">
        <p className="text-xs tracking-editorial text-accent mb-1">HOW TO</p>
        <h3 className="font-serif text-xl text-ink mb-1">
          おすすめの手順 — 全{steps.length}ステップ
        </h3>
        <p className="text-sm text-muted mb-6">
          {colorLabel(result.color)} × {styleLabel(result.style)} に最適化
        </p>
        <ol className="space-y-6">
          {steps.map((step, i) => (
            <motion.li
              key={step.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex gap-4"
            >
              <span
                className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-serif text-sm ${
                  step.isCorrection
                    ? 'bg-accent text-ivory'
                    : 'border border-accent text-accent'
                }`}
              >
                {i + 1}
              </span>
              <div className="flex-1 pb-6 border-b border-line last:border-0">
                <p className="text-ink leading-relaxed">{step.description}</p>

                {step.ingredients && step.ingredients.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs tracking-editorial text-muted mb-1">注目成分</p>
                    <div className="flex flex-wrap gap-2">
                      {step.ingredients.map((ing) => (
                        <span
                          key={ing}
                          className="text-xs bg-accent-soft text-accent px-2.5 py-1 rounded-full"
                        >
                          {ing}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {step.products && step.products.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs tracking-editorial text-muted mb-1">製品の一例</p>
                    <ul className="space-y-1">
                      {step.products.map((p) => (
                        <ProductRow key={`${p.brand}-${p.name}`} product={p} />
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </motion.li>
          ))}
        </ol>

        {hasProducts && (
          <p className="text-xs text-muted mt-6 leading-relaxed">{PRODUCT_DISCLAIMER}</p>
        )}
      </div>

      {/* 6. シェア */}
      <ShareCard result={result} />

      <button
        onClick={onReset}
        className="w-full sm:w-auto px-6 py-3 bg-ink text-cream rounded-sm hover:bg-accent transition-colors"
      >
        もう一度診断する
      </button>
    </div>
  )
}

function ProductRow({ product }: { product: Product }) {
  return (
    <li className="text-sm text-ink flex flex-wrap items-baseline gap-x-2">
      <span className="text-muted text-xs">{product.category}</span>
      <span className="font-medium">{product.brand}</span>
      <span>{product.name}</span>
    </li>
  )
}
