'use client'

import React from 'react'
import { motion } from 'framer-motion'
import type { Option, Question } from '../lib/diagnosisStore'

type Props = {
  question: Question
  selectedId?: string
  onSelect: (opt: Option) => void
}

const categoryLabel: Record<Question['category'], string> = {
  skin: '肌質',
  color: 'パーソナルカラー',
  style: 'なりたい系統',
}

export default function QuestionCard({ question, selectedId, onSelect }: Props) {
  return (
    <div className="p-6 bg-white rounded-2xl shadow-sm border border-gray-100">
      <span className="inline-block text-xs font-medium text-blue-600 bg-blue-50 rounded-full px-3 py-1 mb-3">
        {categoryLabel[question.category]}
      </span>
      <h2 className="text-lg font-semibold mb-4 text-gray-800">{question.content}</h2>
      <div className="grid grid-cols-1 gap-3">
        {question.options.map((opt, i) => {
          const active = selectedId === opt.id
          return (
            <motion.button
              key={opt.id}
              onClick={() => onSelect(opt)}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`text-left p-4 rounded-xl border transition-colors ${
                active
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
              }`}
            >
              {opt.label}
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}
