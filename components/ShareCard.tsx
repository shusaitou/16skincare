'use client'

import React, { useRef, useState } from 'react'
import { toPng } from 'html-to-image'
import type { DiagnosisResult } from '../lib/types'
import {
  colorLabel,
  genderLabel,
  skinLabel,
  styleLabel,
} from '../lib/recommend'
import { resolvePersona } from '../lib/persona'
import { getPalette } from '../lib/palette'

export default function ShareCard({ result }: { result: DiagnosisResult }) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [status, setStatus] = useState<string | null>(null)

  const persona = resolvePersona(result)
  const palette = getPalette(result.color)

  const shareText = `私の16 SKINCAREタイプは「${persona.name}」(${persona.code})！ ${genderLabel(
    result.gender
  )}・${skinLabel(result.skin)}・${colorLabel(result.color)}・${styleLabel(
    result.style
  )} #16skincare`

  async function handleSave() {
    if (!cardRef.current) return
    try {
      const dataUrl = await toPng(cardRef.current, { pixelRatio: 2, cacheBust: true })
      const a = document.createElement('a')
      a.href = dataUrl
      a.download = `16skincare-${persona.code}.png`
      a.click()
      setStatus('画像を保存しました')
    } catch {
      setStatus('画像の保存に失敗しました')
    }
  }

  async function handleShare() {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ text: shareText })
      } catch {
        /* ユーザーがキャンセル */
      }
    } else {
      handleCopy()
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(shareText)
      setStatus('結果をコピーしました')
    } catch {
      setStatus('コピーに失敗しました')
    }
  }

  return (
    <div className="bg-ivory rounded-sm border border-line p-8">
      <p className="text-xs tracking-editorial text-accent mb-1">SHARE</p>
      <h3 className="font-serif text-xl text-ink mb-6">結果をシェア</h3>

      {/* エクスポート対象カード */}
      <div
        ref={cardRef}
        className="rounded-sm p-8"
        style={{ background: '#2B2622', color: '#FAF6F1' }}
      >
        <div className="flex items-center justify-between mb-6">
          <span style={{ fontSize: 11, letterSpacing: '0.08em', color: '#EFE3DC' }}>
            16 SKINCARE
          </span>
          <span style={{ fontSize: 11, letterSpacing: '0.08em', color: '#B5806A' }}>
            TYPE / {persona.code}
          </span>
        </div>
        <h4
          style={{
            fontFamily: 'Georgia, serif',
            fontSize: 28,
            lineHeight: 1.2,
            marginBottom: 8,
          }}
        >
          {persona.name}
        </h4>
        <p style={{ fontSize: 13, color: 'rgba(250,246,241,0.7)', marginBottom: 20 }}>
          「{persona.keyword}」
        </p>

        {/* カラーパレット */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
          {palette.best.map((s) => (
            <div
              key={s.name}
              style={{
                width: 32,
                height: 32,
                borderRadius: 3,
                backgroundColor: s.hex,
              }}
            />
          ))}
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 16px' }}>
          {[
            genderLabel(result.gender),
            skinLabel(result.skin),
            colorLabel(result.color),
            styleLabel(result.style),
          ].map((label) => (
            <span key={label} style={{ fontSize: 12, color: 'rgba(250,246,241,0.85)' }}>
              {label}
            </span>
          ))}
        </div>
      </div>

      {/* アクション */}
      <div className="flex flex-wrap gap-3 mt-5">
        <button
          onClick={handleSave}
          className="px-5 py-2.5 bg-ink text-cream rounded-sm text-sm hover:bg-accent transition-colors"
        >
          画像を保存
        </button>
        <button
          onClick={handleShare}
          className="px-5 py-2.5 border border-line text-ink rounded-sm text-sm hover:border-accent transition-colors"
        >
          シェア
        </button>
        <button
          onClick={handleCopy}
          className="px-5 py-2.5 border border-line text-ink rounded-sm text-sm hover:border-accent transition-colors"
        >
          テキストをコピー
        </button>
      </div>
      {status && <p className="text-xs text-muted mt-3">{status}</p>}
    </div>
  )
}
