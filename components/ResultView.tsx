'use client'

import React from 'react'
import { motion } from 'framer-motion'
import type { Product, RecommendationResponse } from '../lib/types'
import { colorLabel, genderLabel, skinLabel, styleLabel } from '../lib/recommend'
import { PRODUCT_DISCLAIMER } from '../lib/techniques'

type Props = {
  recommendation: RecommendationResponse
  onReset: () => void
}

export default function ResultView({ recommendation, onReset }: Props) {
  const { result, steps, correctionReason } = recommendation
  const hasProducts = steps.some((s) => s.products && s.products.length > 0)

  return (
    <div className="space-y-6">
      {/* 診断サマリー */}
      <div className="bg-ivory rounded-sm border border-line p-8">
        <p className="text-xs tracking-editorial text-accent mb-1">YOUR RESULT</p>
        <h2 className="font-serif text-2xl text-ink mb-6">あなたの診断結果</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-line rounded-sm overflow-hidden">
          <Badge label="性別" value={genderLabel(result.gender)} />
          <Badge label="肌質" value={skinLabel(result.skin)} />
          <Badge label="カラー" value={colorLabel(result.color)} />
          <Badge label="系統" value={styleLabel(result.style)} />
        </div>
      </div>

      {/* 補正が入った場合の説明 */}
      {correctionReason && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-accent-soft border border-accent/30 text-ink text-sm rounded-sm p-4 leading-relaxed"
        >
          ⚠️ {correctionReason}
        </motion.div>
      )}

      {/* おすすめ手順 */}
      <div className="bg-ivory rounded-sm border border-line p-8">
        <p className="text-xs tracking-editorial text-accent mb-1">HOW TO</p>
        <h3 className="font-serif text-xl text-ink mb-6">
          おすすめの手順 — 全{steps.length}ステップ
        </h3>
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

                {/* 注目成分 */}
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

                {/* 代表製品の例 */}
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

      <button
        onClick={onReset}
        className="w-full sm:w-auto px-6 py-3 bg-ink text-cream rounded-sm hover:bg-accent transition-colors"
      >
        もう一度診断する
      </button>
    </div>
  )
}

function Badge({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-ivory p-4 text-center">
      <p className="text-xs text-muted mb-1">{label}</p>
      <p className="text-sm text-ink">{value}</p>
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
