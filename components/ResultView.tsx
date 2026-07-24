'use client'

import React from 'react'
import { motion } from 'framer-motion'
import type { RecommendationResponse } from '../lib/types'
import { colorLabel, skinLabel, styleLabel } from '../lib/recommend'

type Props = {
  recommendation: RecommendationResponse
  onReset: () => void
}

export default function ResultView({ recommendation, onReset }: Props) {
  const { result, steps, correctionReason } = recommendation

  return (
    <div className="space-y-5">
      {/* 診断サマリー */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <h2 className="text-lg font-semibold mb-4 text-gray-800">あなたの診断結果</h2>
        <div className="grid grid-cols-3 gap-3 text-center">
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
          className="bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-xl p-4"
        >
          ⚠️ {correctionReason}
        </motion.div>
      )}

      {/* おすすめ手順 */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <h3 className="text-base font-semibold mb-4 text-gray-800">
          おすすめの手順（{steps.length}ステップ）
        </h3>
        <ol className="space-y-3">
          {steps.map((step, i) => (
            <motion.li
              key={step.id}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06 }}
              className={`flex gap-3 p-3 rounded-xl border ${
                step.isCorrection
                  ? 'border-amber-300 bg-amber-50'
                  : 'border-gray-100 bg-gray-50'
              }`}
            >
              <span
                className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-sm font-semibold ${
                  step.isCorrection
                    ? 'bg-amber-400 text-white'
                    : 'bg-blue-600 text-white'
                }`}
              >
                {i + 1}
              </span>
              <div>
                <p className="font-medium text-gray-800">{step.title}</p>
                <p className="text-sm text-gray-600">{step.description}</p>
              </div>
            </motion.li>
          ))}
        </ol>
      </div>

      <div className="flex gap-3">
        <button
          onClick={onReset}
          className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700"
        >
          もう一度診断する
        </button>
      </div>
    </div>
  )
}

function Badge({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-50 rounded-xl p-3">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className="text-sm font-semibold text-gray-800">{value}</p>
    </div>
  )
}
