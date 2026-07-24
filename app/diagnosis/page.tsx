'use client'

import React, { useMemo } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import QuestionCard from '../../components/QuestionCard'
import ResultView from '../../components/ResultView'
import {
  QUESTIONS,
  computeResult,
  useDiagnosisStore,
} from '../../lib/diagnosisStore'
import { buildRecommendation } from '../../lib/recommend'

export default function DiagnosisPage() {
  const { index, answers, finished, select, back, reset } = useDiagnosisStore()

  const current = QUESTIONS[index]
  const progress = finished ? 100 : Math.round((index / QUESTIONS.length) * 100)

  // 回答が変わるたびに結果とレコメンドを再計算
  const recommendation = useMemo(() => {
    if (!finished) return null
    const result = computeResult(answers)
    return buildRecommendation({
      skin: result.skin,
      color: result.color,
      style: result.style,
    })
  }, [finished, answers])

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
        {!finished ? (
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
        ) : (
          <motion.div
            key="result"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {recommendation && (
              <ResultView recommendation={recommendation} onReset={reset} />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
