'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { useAuth } from './AuthProvider'
import { deleteHistory, listHistory } from '../lib/historyRepository'
import { formatDateTime, withDiffs, type HistoryEntryWithDiff } from '../lib/historyDiff'
import { resolvePersona } from '../lib/persona'
import { colorLabel, genderLabel, skinLabel, styleLabel } from '../lib/recommend'
import type { DiagnosisHistoryEntry } from '../lib/types'

// 診断履歴の一覧。再診断するたびに1件増え、1つ前との差分（変化）を添えて表示する。
export default function HistoryList() {
  const { user, loading: authLoading, dataVersion } = useAuth()
  const userId = user?.id ?? null

  const [items, setItems] = useState<DiagnosisHistoryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (authLoading) return
    let cancelled = false
    setLoading(true)
    listHistory(userId)
      .then((list) => {
        if (!cancelled) {
          setItems(list)
          setError(null)
        }
      })
      .catch((e: Error) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [userId, authLoading, dataVersion])

  async function onDelete(id: string) {
    const before = items
    setItems(before.filter((i) => i.id !== id))
    try {
      await deleteHistory(userId, id)
    } catch (e) {
      setItems(before)
      setError((e as Error).message)
    }
  }

  if (loading) {
    return <p className="text-sm text-muted">読み込み中…</p>
  }

  if (items.length === 0) {
    return (
      <div className="bg-ivory rounded-sm border border-line p-6">
        <p className="text-sm text-muted leading-relaxed mb-4">
          まだ診断履歴がありません。診断を受けると、結果がここに記録されます。
        </p>
        <Link
          href="/diagnosis"
          className="inline-block px-5 py-2.5 bg-ink text-cream rounded-sm hover:bg-accent transition-colors text-sm"
        >
          診断を始める →
        </Link>
      </div>
    )
  }

  const rows = withDiffs(items)

  return (
    <div className="space-y-4">
      {error && (
        <p className="text-sm text-ink bg-accent-soft border border-accent/30 rounded-sm p-3">
          {error}
        </p>
      )}
      {rows.map((row, i) => (
        <HistoryRow key={row.entry.id} row={row} index={i} onDelete={onDelete} />
      ))}
    </div>
  )
}

function HistoryRow({
  row,
  index,
  onDelete,
}: {
  row: HistoryEntryWithDiff
  index: number
  onDelete: (id: string) => void
}) {
  const { entry, changes, isFirst } = row
  const persona = resolvePersona(entry.result)

  return (
    <motion.article
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="bg-ivory rounded-sm border border-line p-6"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs tracking-editorial text-muted">
            {formatDateTime(entry.created_at)}
            {index === 0 && <span className="text-accent ml-2">最新</span>}
          </p>
          <p className="font-serif text-xl text-ink mt-1">
            {persona.name}
            <span className="text-sm text-accent ml-2">{persona.code}</span>
          </p>
        </div>
        <button
          onClick={() => onDelete(entry.id)}
          className="text-xs text-muted hover:text-accent shrink-0"
          aria-label="この履歴を削除"
        >
          削除
        </button>
      </div>

      <dl className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-2 mt-4 text-sm">
        <Field label="性別" value={genderLabel(entry.result.gender)} />
        <Field label="肌質" value={skinLabel(entry.result.skin)} />
        <Field label="カラー" value={colorLabel(entry.result.color)} />
        <Field label="系統" value={styleLabel(entry.result.style)} />
      </dl>

      {/* 1つ前の診断との差分 */}
      <div className="mt-4 pt-4 border-t border-line">
        {isFirst ? (
          <p className="text-xs text-muted">はじめての診断</p>
        ) : changes.length === 0 ? (
          <p className="text-xs text-muted">前回から変化なし</p>
        ) : (
          <ul className="space-y-1">
            {changes.map((c) => (
              <li key={c.axis} className="text-xs text-ink">
                <span className="text-muted">{c.axis}</span>{' '}
                <span className="text-muted">{c.from}</span>
                <span className="text-accent mx-1.5">→</span>
                <span className="font-medium">{c.to}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="text-xs text-muted mt-3">全{entry.steps.length}ステップの手順を記録済み</p>
    </motion.article>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="text-ink">{value}</dd>
    </div>
  )
}
