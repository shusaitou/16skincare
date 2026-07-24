'use client'

import React, { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import GenderSelect from '../../components/GenderSelect'
import QuestionCard from '../../components/QuestionCard'
import StyleSelect from '../../components/StyleSelect'
import ResultView from '../../components/ResultView'
import {
  QUESTIONS,
  computeResult,
  useDiagnosisStore,
} from '../../lib/diagnosisStore'
import { buildRecommendation } from '../../lib/recommend'
import type { RecommendationResponse } from '../../lib/types'

// 診断のフェーズ: 性別 → 設問 → 系統選択 → 結果
type Phase = 'gender' | 'questions' | 'style' | 'result'

export default function DiagnosisPage() {
  const {
    gender,
    index,
    answers,
    questionsDone,
    style,
    setGender,
    select,
    setStyle,
    back,
    reset,
  } = useDiagnosisStore()

  const phase: Phase =
    gender === null
      ? 'gender'
      : !questionsDone
        ? 'questions'
        : style === null
          ? 'style'
          : 'result'
  const current = QUESTIONS[index]

  // 進捗: 性別 + 設問 + 系統選択 の合計に対する割合
  const totalSteps = 1 + QUESTIONS.length + 1
  const doneSteps =
    gender === null ? 0 : questionsDone ? (style ? totalSteps : 1 + QUESTIONS.length) : 1 + index
  const progress = Math.round((doneSteps / totalSteps) * 100)

  const [recommendation, setRecommendation] =
    useState<RecommendationResponse | null>(null)
  const [loading, setLoading] = useState(false)

  // 全て揃ったら API 経由で保存＋手順取得。失敗時はローカル計算にフォールバック。
  useEffect(() => {
    if (phase !== 'result') {
      setRecommendation(null)
      return
    }
    const base = computeResult(answers)
    const payload = { gender: gender!, skin: base.skin, color: base.color, style: style! }

    let cancelled = false
    setLoading(true)
    ;(async () => {
      try {
        const res = await fetch('/api/diagnosis', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) throw new Error(`API ${res.status}`)
        const data: RecommendationResponse = await res.json()
        if (!cancelled) setRecommendation(data)
      } catch {
        if (!cancelled) setRecommendation(buildRecommendation(payload))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [phase, answers, style, gender])

  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      <header className="mb-10">
        <p className="text-xs tracking-editorial text-accent mb-2">16 SKINCARE</p>
        <h1 className="font-serif text-3xl text-ink leading-tight">
          パーソナライズド
          <br />
          メイク診断
        </h1>
        <p className="text-sm text-muted mt-3">
          性別 × 肌質 × パーソナルカラー × なりたい系統から、最適な手順と製品を提案します。
        </p>
      </header>

      {/* 進捗バー */}
      <div className="h-px w-full bg-line mb-10 relative">
        <motion.div
          className="absolute inset-y-0 left-0 h-px bg-accent"
          animate={{ width: `${progress}%` }}
          transition={{ type: 'spring', stiffness: 120, damping: 20 }}
        />
      </div>

      <AnimatePresence mode="wait">
        {phase === 'gender' && (
          <motion.div
            key="gender"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.25 }}
          >
            <GenderSelect selected={gender} onSelect={setGender} />
          </motion.div>
        )}

        {phase === 'questions' && (
          <motion.div
            key={current.id}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.25 }}
          >
            <QuestionCard
              question={current}
              selectedId={answers[current.id]?.id}
              onSelect={(opt) => select(current, opt)}
            />
            <div className="flex items-center justify-between mt-5">
              <button onClick={back} className="text-sm text-muted hover:text-ink">
                ← 戻る
              </button>
              <p className="text-sm text-muted">
                {index + 1} / {QUESTIONS.length}
              </p>
            </div>
          </motion.div>
        )}

        {phase === 'style' && (
          <motion.div
            key="style"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.25 }}
          >
            <StyleSelect selected={style} onSelect={setStyle} />
            <div className="mt-5">
              <button onClick={back} className="text-sm text-muted hover:text-ink">
                ← 戻る
              </button>
            </div>
          </motion.div>
        )}

        {phase === 'result' && (
          <motion.div
            key="result"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {loading || !recommendation ? (
              <div className="bg-ivory p-12 rounded-sm border border-line text-center text-muted">
                <motion.div
                  className="inline-block w-6 h-6 border-2 border-accent border-t-transparent rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
                />
                <p className="mt-4 text-sm">あなたに最適な手順を組み立てています…</p>
              </div>
            ) : (
              <ResultView recommendation={recommendation} onReset={reset} />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
