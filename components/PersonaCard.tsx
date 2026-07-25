'use client'

import React from 'react'
import { motion } from 'framer-motion'
import type { DiagnosisResult } from '../lib/types'
import { genderTagline, resolvePersona } from '../lib/persona'

export default function PersonaCard({ result }: { result: DiagnosisResult }) {
  const persona = resolvePersona(result)

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-ink text-cream rounded-sm p-8 sm:p-10"
    >
      <p className="text-xs tracking-editorial text-accent-soft/80 mb-4">
        YOUR TYPE — {persona.code}
      </p>
      <h2 className="font-serif text-3xl sm:text-4xl leading-tight mb-3">
        {persona.name}
      </h2>
      <p className="text-cream/70 text-sm mb-6">「{persona.keyword}」</p>
      <p className="leading-relaxed text-cream/90 mb-6">{persona.description}</p>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <p className="text-xs tracking-editorial text-accent-soft/80 mb-2">強み</p>
          <ul className="space-y-1">
            {persona.strengths.map((s) => (
              <li key={s} className="text-sm text-cream/90 flex gap-2">
                <span className="text-accent-soft">—</span>
                {s}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-xs tracking-editorial text-accent-soft/80 mb-2">
            気をつけたい
          </p>
          <p className="text-sm text-cream/90">{persona.caution}</p>
        </div>
      </div>

      <p className="mt-6 pt-6 border-t border-cream/15 text-sm text-cream/70">
        {genderTagline(result)}
      </p>
    </motion.div>
  )
}
