'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import FaceMap from './FaceMap'
import FavoriteButton from './FavoriteButton'
import { favoriteOfProduct, favoriteOfStep } from '../lib/favoritesRepository'
import { FACE_AREA_LABEL } from '../lib/stepGuides'
import type { ApplyMotion, RecommendedStep } from '../lib/types'

// 1ステップずつスライドで見せる手順カード。
// 「顔のどこに・どのくらいの量・どの方向に」を図と短い文で示し、
// 「塗り方がわからない」状態を作らないことを狙っている。

const MOTION_LABEL: Record<ApplyMotion, string> = {
  outward: '内側から外側へ',
  inward: '外側から内側へ',
  upward: '斜め上へ引き上げる',
  downward: '下方向へ',
  press: '広げず、押さえる',
}

type Props = {
  steps: RecommendedStep[]
}

export default function StepSlides({ steps }: Props) {
  const [index, setIndex] = useState(0)
  // 進む/戻るでスライドの向きを変える
  const [direction, setDirection] = useState(1)

  const total = steps.length
  // 手順数が変わったとき（フル⇄時短の切り替え）に範囲外を指さないようにする
  useEffect(() => {
    setIndex((i) => Math.min(i, Math.max(0, total - 1)))
  }, [total])

  const go = useCallback(
    (delta: number) => {
      setDirection(delta)
      setIndex((i) => Math.min(total - 1, Math.max(0, i + delta)))
    },
    [total]
  )

  // 矢印キーでも操作できるようにする
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') go(1)
      if (e.key === 'ArrowLeft') go(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [go])

  if (total === 0) return null

  const step = steps[index]
  const guide = step.guide
  const isFirst = index === 0
  const isLast = index === total - 1

  return (
    <div className="bg-ivory rounded-sm border border-line overflow-hidden">
      {/* 進捗 */}
      <div className="px-6 pt-6">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs tracking-editorial text-accent">
            STEP {index + 1} / {total}
          </p>
          {step.isCorrection && (
            <span className="text-xs bg-accent text-ivory px-2 py-0.5 rounded-full">補正</span>
          )}
        </div>
        <div className="flex gap-1">
          {steps.map((s, i) => (
            <button
              key={s.id}
              onClick={() => {
                setDirection(i > index ? 1 : -1)
                setIndex(i)
              }}
              aria-label={`ステップ ${i + 1} へ`}
              aria-current={i === index}
              className={`h-1 flex-1 rounded-full transition-colors ${
                i <= index ? 'bg-accent' : 'bg-line'
              }`}
            />
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={step.id}
          custom={direction}
          initial={{ opacity: 0, x: direction * 32 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: direction * -32 }}
          transition={{ duration: 0.22 }}
          className="px-6 py-6"
        >
          <div className="sm:flex sm:gap-6">
            {/* 顔マップ */}
            {guide && (
              <div className="sm:w-44 shrink-0">
                <div className="bg-cream rounded-sm border border-line p-2">
                  <FaceMap area={guide.area} motion={guide.motion} className="w-full h-auto" />
                </div>
                <p className="text-center text-xs text-muted mt-2">
                  {FACE_AREA_LABEL[guide.area]} — {MOTION_LABEL[guide.motion]}
                </p>
              </div>
            )}

            {/* 説明 */}
            <div className="flex-1 mt-5 sm:mt-0 min-w-0">
              <div className="flex items-start gap-3">
                <p className="font-serif text-lg text-ink leading-relaxed flex-1">
                  {step.description}
                </p>
                <FavoriteButton item={favoriteOfStep(step)} />
              </div>

              {guide && (
                <dl className="mt-4 space-y-3">
                  {guide.amount && <GuideRow label="量" value={guide.amount} />}
                  {guide.direction && <GuideRow label="動かし方" value={guide.direction} />}
                </dl>
              )}

              {guide?.tip && (
                <p className="mt-4 text-sm text-ink bg-accent-soft border border-accent/30 rounded-sm p-3 leading-relaxed">
                  コツ: {guide.tip}
                </p>
              )}
              {guide?.caution && (
                <p className="mt-2 text-sm text-muted leading-relaxed">
                  やりがち: {guide.caution}
                </p>
              )}

              {step.ingredients && step.ingredients.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs tracking-editorial text-muted mb-1.5">注目成分</p>
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
                <div className="mt-4">
                  <p className="text-xs tracking-editorial text-muted mb-1.5">製品の一例</p>
                  <ul className="space-y-1.5">
                    {step.products.map((p) => (
                      <li
                        key={`${p.brand}-${p.name}`}
                        className="text-sm text-ink flex items-baseline gap-2"
                      >
                        <span className="flex-1 flex flex-wrap items-baseline gap-x-2">
                          <span className="text-muted text-xs">{p.category}</span>
                          <span className="font-medium">{p.brand}</span>
                          <span>{p.name}</span>
                        </span>
                        <FavoriteButton item={favoriteOfProduct(p)} size="sm" />
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* 送り */}
      <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-line">
        <button
          onClick={() => go(-1)}
          disabled={isFirst}
          className="px-4 py-2.5 text-sm text-muted hover:text-ink disabled:opacity-30 disabled:hover:text-muted transition-colors"
        >
          ← 前へ
        </button>
        {isLast ? (
          <p className="text-sm text-accent">これで完成です</p>
        ) : (
          <button
            onClick={() => go(1)}
            className="px-6 py-2.5 bg-ink text-cream rounded-sm hover:bg-accent transition-colors text-sm"
          >
            次へ →
          </button>
        )}
      </div>
    </div>
  )
}

function GuideRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3">
      <dt className="shrink-0 w-16 text-xs text-muted pt-0.5">{label}</dt>
      <dd className="text-sm text-ink leading-relaxed">{value}</dd>
    </div>
  )
}
