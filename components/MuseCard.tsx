'use client'

import React from 'react'
import type { DiagnosisResult } from '../lib/types'
import { resolveMuse } from '../lib/muses'

export default function MuseCard({ result }: { result: DiagnosisResult }) {
  const muse = resolveMuse(result)

  return (
    <div className="bg-ivory rounded-sm border border-line p-8">
      <p className="text-xs tracking-editorial text-accent mb-1">MUSE</p>
      <h3 className="font-serif text-xl text-ink mb-4">参考にしたいメイク</h3>

      <p className="text-xs tracking-editorial text-muted mb-1">こんな雰囲気を目指して</p>
      <p className="text-ink leading-relaxed mb-6">{muse.archetype}</p>

      {/* 実在人物名（検証済みが登録されている場合のみ） */}
      {muse.people.length > 0 && (
        <div className="mb-6">
          <p className="text-xs tracking-editorial text-muted mb-2">近いとされる人</p>
          <div className="flex flex-wrap gap-2">
            {muse.people.map((p) => (
              <span
                key={p}
                className="text-sm bg-accent-soft text-accent px-3 py-1 rounded-full"
              >
                {p}
              </span>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs tracking-editorial text-muted mb-2">お手本を探す（検索）</p>
      <div className="flex flex-wrap gap-2">
        {muse.keywords.map((kw) => (
          <a
            key={kw}
            href={`https://www.google.com/search?q=${encodeURIComponent(kw)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm border border-line text-ink px-3 py-1.5 rounded-full hover:border-accent transition-colors"
          >
            {kw} ↗
          </a>
        ))}
      </div>
    </div>
  )
}
