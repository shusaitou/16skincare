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
  skin: 'SKIN TYPE — 肌質',
  color: 'PERSONAL COLOR — カラー',
}

export default function QuestionCard({ question, selectedId, onSelect }: Props) {
  return (
    <div className="bg-ivory rounded-sm border border-line p-8">
      <p className="text-xs tracking-editorial text-accent mb-3">
        {categoryLabel[question.category]}
      </p>
      <h2 className="font-serif text-2xl mb-6 text-ink leading-snug">
        {question.content}
      </h2>
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
              whileHover={{ x: 4 }}
              whileTap={{ scale: 0.99 }}
              className={`text-left px-5 py-4 rounded-sm border transition-colors ${
                active
                  ? 'border-accent bg-accent-soft text-ink'
                  : 'border-line hover:border-accent text-ink'
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
