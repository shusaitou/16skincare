'use client'

import React, { useMemo, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import type { Product, RecommendationResponse, RoutineMode } from '../lib/types'
import type { ScoreKey } from '../lib/diagnosisStore'
import { colorLabel, stepsForMode, styleLabel } from '../lib/recommend'
import { PRODUCT_DISCLAIMER } from '../lib/techniques'
import { favoriteOfProduct, favoriteOfStep } from '../lib/favoritesRepository'
import RoutineModeToggle from './RoutineModeToggle'
import StepSlides from './StepSlides'
import PersonaCard from './PersonaCard'
import ScoreChart from './ScoreChart'
import ColorPalette from './ColorPalette'
import MuseCard from './MuseCard'
import ShareCard from './ShareCard'
import FavoriteButton from './FavoriteButton'

type Props = {
  recommendation: RecommendationResponse
  totals: Partial<Record<ScoreKey, number>>
  onReset: () => void
  // 履歴の保存状況（保存済みならマイページへ誘導する）
  saveState?: 'idle' | 'saving' | 'saved' | 'error'
}

export default function ResultView({ recommendation, totals, onReset, saveState = 'idle' }: Props) {
  const { result, steps: allSteps, correctionReason } = recommendation

  // フル / 時短の切り替えと、リスト / スライドの表示切り替え
  const [mode, setMode] = useState<RoutineMode>('full')
  const [view, setView] = useState<'list' | 'slides'>('list')

  const steps = useMemo(() => stepsForMode(allSteps, mode), [allSteps, mode])
  const minimalCount = useMemo(() => stepsForMode(allSteps, 'minimal').length, [allSteps])
  const hasProducts = steps.some((s) => s.products && s.products.length > 0)
  // 時短モードでは補正を工程として足さないため、注意書きとして見せる
  const correctionIsStep = steps.some((s) => s.isCorrection)

  return (
    <div className="space-y-6">
      {/* 1. タイプのアイデンティティ */}
      <PersonaCard result={result} />

      {/* 2. スコアの可視化 */}
      <ScoreChart totals={totals} result={result} />

      {/* 3. カラーパレット */}
      <ColorPalette color={result.color} />

      {/* 4. 参考にしたいメイク（ミューズ） */}
      <MuseCard result={result} />

      {/* 5. 補正が入った場合の説明 */}
      {correctionReason && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-accent-soft border border-accent/30 text-ink text-sm rounded-sm p-4 leading-relaxed"
        >
          ⚠️ {correctionReason}
          {!correctionIsStep && (
            <span className="block mt-2 text-muted">
              時短モードでは工程を増やさないかわりに、STEP 1 の保湿をいつもより丁寧に行ってください。
            </span>
          )}
        </motion.div>
      )}

      {/* 6. 手順（フル / 時短 の切り替え＋リスト / スライド表示） */}
      <RoutineModeToggle
        mode={mode}
        onChange={setMode}
        fullCount={allSteps.length}
        minimalCount={minimalCount}
      />

      {/* 見出し＋表示切り替え（リスト／スライド） */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs tracking-editorial text-accent mb-1">HOW TO</p>
          <h3 className="font-serif text-xl text-ink">
            {mode === 'minimal' ? '最低限メイク' : 'おすすめの手順'} — 全{steps.length}ステップ
          </h3>
          <p className="text-sm text-muted mt-1">
            {colorLabel(result.color)} × {styleLabel(result.style)} に最適化
          </p>
        </div>
        <div className="flex gap-px bg-line border border-line rounded-sm overflow-hidden shrink-0">
          {([
            { id: 'list', label: 'リスト' },
            { id: 'slides', label: 'スライド' },
          ] as const).map((v) => (
            <button
              key={v.id}
              onClick={() => setView(v.id)}
              aria-pressed={view === v.id}
              className={`px-3 py-1.5 text-xs transition-colors ${
                view === v.id ? 'bg-ink text-cream' : 'bg-ivory text-muted hover:text-ink'
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>

      {view === 'slides' ? (
        <StepSlides steps={steps} />
      ) : (
      <div className="bg-ivory rounded-sm border border-line p-8">
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
                <div className="flex items-start gap-3">
                  <p className="text-ink leading-relaxed flex-1">{step.description}</p>
                  <FavoriteButton item={favoriteOfStep(step)} />
                </div>

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
      )}

      {/* 7. シェア */}
      <ShareCard result={result} />

      {/* 7. 記録への導線 */}
      <div className="bg-ivory rounded-sm border border-line p-6">
        <p className="text-xs tracking-editorial text-accent mb-1">NEXT</p>
        <h3 className="font-serif text-xl text-ink mb-2">この手順を毎日の習慣に</h3>
        <p className="text-sm text-muted leading-relaxed mb-4">
          {saveState === 'saved'
            ? 'この結果を履歴に保存しました。マイページで今日のルーティンとしてチェックできます。'
            : saveState === 'saving'
              ? '結果を保存しています…'
              : saveState === 'error'
                ? '結果の保存に失敗しました。マイページから再度お試しください。'
                : 'マイページで、この手順を毎日のチェックリストとして記録できます。'}
        </p>
        <Link
          href="/mypage?tab=routine"
          className="inline-block px-5 py-2.5 bg-ink text-cream rounded-sm hover:bg-accent transition-colors text-sm"
        >
          今日のルーティンを開く →
        </Link>
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

function ProductRow({ product }: { product: Product }) {
  return (
    <li className="text-sm text-ink flex items-baseline gap-2">
      <span className="flex-1 flex flex-wrap items-baseline gap-x-2">
        <span className="text-muted text-xs">{product.category}</span>
        <span className="font-medium">{product.brand}</span>
        <span>{product.name}</span>
      </span>
      <FavoriteButton item={favoriteOfProduct(product)} size="sm" />
    </li>
  )
}
