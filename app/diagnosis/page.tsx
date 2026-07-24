'use client'

import React, { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
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

// 診断のフェーズ: 設問 → 系統選択 → 結果
type Phase = 'questions' | 'style' | 'result'

export default function DiagnosisPage() {
  const { index, answers, questionsDone, style, select, setStyle, back, reset } =
    useDiagnosisStore()

  const phase: Phase = !questionsDone ? 'questions' : style === null ? 'style' : 'result'
  const current = QUESTIONS[index]

  // 進捗: 設問 + 系統選択の合計ステップに対する割合
  const totalSteps = QUESTIONS.length + 1
  const doneSteps = questionsDone ? (style ? totalSteps : QUESTIONS.length) : index
  const progress = Math.round((doneSteps / totalSteps) * 100)

  const [recommendation, setRecommendation] =
    useState<RecommendationResponse | null>(null)
  const [loading, setLoading] = useState(false)

  // 系統まで揃ったら API 経由で保存＋手順取得。失敗時はローカル計算にフォールバック。
  useEffect(() => {
    if (phase !== 'result') {
      setRecommendation(null)
      return
    }
    const base = computeResult(answers)
    const payload = { skin: base.skin, color: base.color, style: style! }

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
  }, [phase, answers, style])

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-1 text-gray-800">MBTI風 メイク診断</h1>
      <p className="text-sm text-gray-500 mb-6">
        肌質 × パーソナルカラー × なりたい系統から最適な手順を提案します
      </p>

      {/* 進捗バー */}
      <div className="h-2 w-full bg-gray-200 rounded-full mb-6 overflow-hidden">
        <motion.div
          className="h-full bg-blue-600"
          animate={{ width: `${progress}%` }}
          transition={{ type: 'spring', stiffness: 120, damping: 20 }}
        />
      </div>

      <AnimatePresence mode="wait">
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
            <div className="flex items-center justify-between mt-4">
              <button
                onClick={back}
                disabled={index === 0}
                className="text-sm text-gray-500 disabled:opacity-30"
              >
                ← 戻る
              </button>
              <p className="text-sm text-gray-500">
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
            <div className="mt-4">
              <button onClick={back} className="text-sm text-gray-500">
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
              <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 text-center text-gray-500">
                <motion.div
                  className="inline-block w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
                />
                <p className="mt-3 text-sm">あなたに最適な手順を組み立てています…</p>
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
