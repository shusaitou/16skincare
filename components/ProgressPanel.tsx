'use client'

import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { useAuth } from './AuthProvider'
import { listHistory } from '../lib/historyRepository'
import { listRoutineLogs } from '../lib/routineRepository'
import { addDays, dateKey } from '../lib/streak'
import {
  buildScoreTrends,
  buildWeeklyReview,
  rediagnosisSuggestion,
  type ScoreTrend,
} from '../lib/progress'
import { formatDateTime } from '../lib/historyDiff'
import type { DiagnosisHistoryEntry, RoutineLog } from '../lib/types'

const LOOKBACK_DAYS = 120

// 「続けた結果」を見せる画面。
//
// 表示は事実に限定する（診断スコアの推移・実施日数）。
// 化粧品の効能表現にあたる「改善した」「効果があった」は書かない。
export default function ProgressPanel() {
  const { user, loading: authLoading, dataVersion } = useAuth()
  const userId = user?.id ?? null

  const [history, setHistory] = useState<DiagnosisHistoryEntry[]>([])
  const [logs, setLogs] = useState<RoutineLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [today, setToday] = useState<string | null>(null)

  useEffect(() => {
    setToday(dateKey())
  }, [])

  useEffect(() => {
    if (authLoading || !today) return
    let cancelled = false
    setLoading(true)
    ;(async () => {
      try {
        const [h, l] = await Promise.all([
          listHistory(userId),
          listRoutineLogs(userId, addDays(today, -LOOKBACK_DAYS)),
        ])
        if (cancelled) return
        setHistory(h)
        setLogs(l)
        setError(null)
      } catch (e) {
        if (!cancelled) setError((e as Error).message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [userId, authLoading, today, dataVersion])

  const latest = history[0] ?? null
  const suggestion = useMemo(
    () => (today ? rediagnosisSuggestion(latest, logs, today) : null),
    [latest, logs, today]
  )
  const skinTrends = useMemo(() => buildScoreTrends(history, 'skin'), [history])
  const weekly = useMemo(
    () => (today ? buildWeeklyReview(logs, latest?.steps ?? [], today) : null),
    [logs, latest, today]
  )

  if (loading || !today) return <p className="text-sm text-muted">読み込み中…</p>

  if (!latest) {
    return (
      <div className="bg-ivory rounded-sm border border-line p-6">
        <p className="text-sm text-muted leading-relaxed mb-4">
          診断を受けると、ここに記録の推移が表示されます。
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

  return (
    <div className="space-y-6">
      {error && (
        <p className="text-sm text-ink bg-accent-soft border border-accent/30 rounded-sm p-3">
          {error}
        </p>
      )}

      {/* 再診断のおすすめ */}
      {suggestion?.suggest && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-accent-soft border border-accent/30 rounded-sm p-6"
        >
          <p className="text-xs tracking-editorial text-accent mb-1">RE-DIAGNOSIS</p>
          <h3 className="font-serif text-xl text-ink mb-2">そろそろ再診断してみませんか</h3>
          <p className="text-sm text-ink leading-relaxed mb-4">
            前回の診断から{suggestion.daysSince}日が経ちました。
            {suggestion.activeDays > 0 && `この間、ルーティンを${suggestion.activeDays}日記録しています。`}
            肌の状態は季節や生活によって変わります。もう一度診断すると、前回との違いを比べられます。
          </p>
          <Link
            href="/diagnosis"
            className="inline-block px-5 py-2.5 bg-ink text-cream rounded-sm hover:bg-accent transition-colors text-sm"
          >
            もう一度診断する →
          </Link>
        </motion.div>
      )}

      {/* 今週の振り返り */}
      {weekly && (
        <div className="bg-ivory rounded-sm border border-line p-6">
          <p className="text-xs tracking-editorial text-accent mb-1">THIS WEEK</p>
          <h3 className="font-serif text-xl text-ink mb-4">今週の記録</h3>

          <div className="grid grid-cols-2 gap-px bg-line border border-line rounded-sm overflow-hidden mb-5">
            <Stat label="実施した日" value={`${weekly.activeDays}`} unit="/ 7日" />
            <Stat label="チェックした工程" value={`${weekly.totalChecks}`} unit="回" />
          </div>

          {weekly.activeDays === 0 ? (
            <p className="text-sm text-muted leading-relaxed">
              今週はまだ記録がありません。1工程だけでもチェックすると、ここに残ります。
            </p>
          ) : (
            <div className="space-y-4">
              {weekly.kept.length > 0 && (
                <div>
                  <p className="text-xs tracking-editorial text-muted mb-2">続いている工程</p>
                  <ul className="space-y-1.5">
                    {weekly.kept.map((a) => (
                      <li key={a.stepId} className="text-sm text-ink flex items-baseline gap-2">
                        <span className="text-accent tabular-nums shrink-0">{a.doneDays}日</span>
                        <span className="flex-1 leading-relaxed">{a.description}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {weekly.dropped.length > 0 && (
                <div>
                  <p className="text-xs tracking-editorial text-muted mb-2">
                    今週チェックしなかった工程
                  </p>
                  <ul className="space-y-1.5">
                    {weekly.dropped.map((a) => (
                      <li key={a.stepId} className="text-sm text-muted leading-relaxed">
                        {a.description}
                      </li>
                    ))}
                  </ul>
                  <p className="text-xs text-muted mt-2 leading-relaxed">
                    続かない工程が多い日は、時短モードの3ステップだけに絞るのも手です。
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 診断スコアの推移 */}
      <div className="bg-ivory rounded-sm border border-line p-6">
        <p className="text-xs tracking-editorial text-accent mb-1">SCORE TREND</p>
        <h3 className="font-serif text-xl text-ink mb-1">診断スコアの推移</h3>
        <p className="text-sm text-muted mb-5">
          肌質の傾向が、診断のたびにどう変わったかの記録です。
        </p>

        {skinTrends.length === 0 ? (
          <p className="text-sm text-muted leading-relaxed">
            推移を出すには診断が2回以上必要です。現在 {history.length} 回。
            再診断すると、前回との違いがここに並びます。
          </p>
        ) : (
          <div className="space-y-5">
            {skinTrends.map((t) => (
              <TrendRow key={t.key} trend={t} />
            ))}
            <p className="text-xs text-muted leading-relaxed pt-1">
              ※ 診断の回答にもとづくスコアの推移であり、肌の状態の測定値ではありません。
            </p>
          </div>
        )}
      </div>

      {/* 診断の履歴（日時だけの簡易表示） */}
      <div className="bg-ivory rounded-sm border border-line p-6">
        <p className="text-xs tracking-editorial text-muted mb-3">診断した日</p>
        <ul className="space-y-1.5">
          {history.slice(0, 6).map((h, i) => (
            <li key={h.id} className="text-sm text-ink flex items-baseline gap-3">
              <span className="text-muted tabular-nums">{formatDateTime(h.created_at)}</span>
              {i === 0 && <span className="text-xs text-accent">最新</span>}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

// 1つの軸のスコア推移。点と点を線で結んだ小さなスパークライン。
function TrendRow({ trend }: { trend: ScoreTrend }) {
  const w = 240
  const h = 40
  const n = trend.points.length
  const points = trend.points.map((p, i) => ({
    x: n > 1 ? (i / (n - 1)) * w : w / 2,
    y: h - (p.percent / 100) * h,
    percent: p.percent,
  }))
  const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
  const last = trend.points[n - 1].percent
  const first = trend.points[0].percent

  return (
    <div className="flex items-center gap-4">
      <span className="w-20 shrink-0 text-sm text-ink">{trend.label}</span>

      <svg viewBox={`0 0 ${w} ${h}`} className="flex-1 h-10" preserveAspectRatio="none">
        <line x1={0} y1={h} x2={w} y2={h} stroke="#E7DED4" strokeWidth={1} />
        <motion.path
          d={d}
          fill="none"
          stroke="#B5806A"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={2.5} fill="#B5806A" />
        ))}
      </svg>

      <span className="w-24 shrink-0 text-right text-sm tabular-nums">
        <span className="text-muted">{first}%</span>
        <span className="text-muted mx-1">→</span>
        <span className="text-ink">{last}%</span>
      </span>
    </div>
  )
}

function Stat({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="bg-ivory p-4 text-center">
      <p className="text-xs tracking-editorial text-muted mb-1">{label}</p>
      <p className="font-serif text-2xl text-ink">
        {value}
        <span className="text-xs text-muted ml-1">{unit}</span>
      </p>
    </div>
  )
}
