'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { useAuth } from './AuthProvider'
import { latestHistory } from '../lib/historyRepository'
import { listRoutineLogs, toggleRoutineStep } from '../lib/routineRepository'
import {
  activeDatesOf,
  addDays,
  completionRate,
  computeStreak,
  dateKey,
  recentDays,
} from '../lib/streak'
import type { DiagnosisHistoryEntry, RoutineLog } from '../lib/types'

const CALENDAR_DAYS = 28 // 直近4週間を可視化

// 毎日のスキンケア/メイク工程をチェックし、継続を可視化する。
// チェック対象は「最新の診断で提案された手順」。診断がまだなら診断へ誘導する。
export default function RoutineChecklist() {
  const { user, loading: authLoading, dataVersion } = useAuth()
  const userId = user?.id ?? null

  const [entry, setEntry] = useState<DiagnosisHistoryEntry | null>(null)
  const [logs, setLogs] = useState<RoutineLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // 日付は「表示中に日付が変わる」ケースを避けるためマウント時に固定する
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
        const since = addDays(today, -(CALENDAR_DAYS - 1))
        const [latest, list] = await Promise.all([
          latestHistory(userId),
          listRoutineLogs(userId, since),
        ])
        if (cancelled) return
        setEntry(latest)
        setLogs(list)
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

  const steps = entry?.steps ?? []
  const todayLog = useMemo(
    () => (today ? logs.find((l) => l.date === today) : undefined),
    [logs, today]
  )
  const doneIds = useMemo(() => new Set(todayLog?.stepIds ?? []), [todayLog])
  const streak = useMemo(
    () => (today ? computeStreak(activeDatesOf(logs), today) : { current: 0, longest: 0, totalDays: 0 }),
    [logs, today]
  )

  const onToggle = useCallback(
    async (stepId: string) => {
      if (!today) return
      const done = !doneIds.has(stepId)
      const before = logs
      // 楽観更新
      setLogs((prev) => {
        const day = prev.find((l) => l.date === today)
        const nextIds = done
          ? [...(day?.stepIds ?? []), stepId]
          : (day?.stepIds ?? []).filter((id) => id !== stepId)
        const others = prev.filter((l) => l.date !== today)
        return nextIds.length > 0 ? [{ date: today, stepIds: nextIds }, ...others] : others
      })
      try {
        await toggleRoutineStep(userId, stepId, done, today)
        setError(null)
      } catch (e) {
        setLogs(before)
        setError((e as Error).message)
      }
    },
    [doneIds, logs, today, userId]
  )

  if (loading || !today) {
    return <Panel><p className="text-sm text-muted">読み込み中…</p></Panel>
  }

  if (!entry || steps.length === 0) {
    return (
      <Panel>
        <p className="text-sm text-muted leading-relaxed mb-4">
          診断を受けると、あなた専用の手順がここにチェックリストとして並びます。
        </p>
        <Link
          href="/diagnosis"
          className="inline-block px-5 py-2.5 bg-ink text-cream rounded-sm hover:bg-accent transition-colors text-sm"
        >
          診断を始める →
        </Link>
      </Panel>
    )
  }

  const doneCount = doneIds.size
  const percent = Math.round((doneCount / steps.length) * 100)

  return (
    <div className="space-y-6">
      {error && (
        <p className="text-sm text-ink bg-accent-soft border border-accent/30 rounded-sm p-3">
          記録の保存に失敗しました: {error}
        </p>
      )}

      {/* 継続サマリー */}
      <div className="grid grid-cols-3 gap-px bg-line border border-line rounded-sm overflow-hidden">
        <Stat label="連続日数" value={`${streak.current}`} unit="日" emphasize />
        <Stat label="最長記録" value={`${streak.longest}`} unit="日" />
        <Stat label="実施日数" value={`${streak.totalDays}`} unit="日" />
      </div>

      {/* 直近4週間のカレンダー */}
      <Panel>
        <p className="text-xs tracking-editorial text-muted mb-3">直近4週間</p>
        <div className="grid grid-cols-7 gap-1.5">
          {recentDays(CALENDAR_DAYS, today).map((day) => {
            const rate = completionRate(
              logs.find((l) => l.date === day),
              steps.length
            )
            const isToday = day === today
            return (
              <div
                key={day}
                title={`${day}（${Math.round(rate * 100)}%）`}
                className={`aspect-square rounded-sm border ${
                  isToday ? 'border-accent' : 'border-line'
                }`}
                style={{
                  // 達成率を accent の濃さで表現（0% はほぼ透明）
                  backgroundColor: rate > 0 ? `rgba(181, 128, 106, ${0.2 + rate * 0.8})` : undefined,
                }}
              />
            )
          })}
        </div>
        <p className="text-xs text-muted mt-3">濃いマスほどその日の達成率が高いことを表します。</p>
      </Panel>

      {/* 今日のチェックリスト */}
      <Panel>
        <div className="flex items-baseline justify-between mb-1">
          <h3 className="font-serif text-xl text-ink">今日のルーティン</h3>
          <p className="text-sm text-muted">
            {doneCount} / {steps.length}
          </p>
        </div>
        <div className="h-px w-full bg-line my-4 relative">
          <motion.div
            className="absolute inset-y-0 left-0 h-px bg-accent"
            animate={{ width: `${percent}%` }}
            transition={{ type: 'spring', stiffness: 120, damping: 20 }}
          />
        </div>

        <ul className="space-y-1">
          {steps.map((step) => {
            const done = doneIds.has(step.id)
            return (
              <li key={step.id}>
                <button
                  type="button"
                  onClick={() => void onToggle(step.id)}
                  aria-pressed={done}
                  className="w-full flex items-start gap-3 text-left py-2.5 group"
                >
                  <span
                    className={`shrink-0 mt-0.5 w-5 h-5 rounded-sm border flex items-center justify-center text-xs transition-colors ${
                      done
                        ? 'bg-accent border-accent text-ivory'
                        : 'border-line text-transparent group-hover:border-accent'
                    }`}
                  >
                    ✓
                  </span>
                  <span
                    className={`text-sm leading-relaxed transition-colors ${
                      done ? 'text-muted line-through' : 'text-ink'
                    }`}
                  >
                    {step.description}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>

        {doneCount === steps.length && (
          <motion.p
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 text-sm text-ink bg-accent-soft border border-accent/30 rounded-sm p-3"
          >
            今日のルーティン、コンプリートです。お疲れさまでした。
          </motion.p>
        )}
      </Panel>
    </div>
  )
}

function Panel({ children }: { children: React.ReactNode }) {
  return <div className="bg-ivory rounded-sm border border-line p-6">{children}</div>
}

function Stat({
  label,
  value,
  unit,
  emphasize,
}: {
  label: string
  value: string
  unit: string
  emphasize?: boolean
}) {
  return (
    <div className="bg-ivory p-4 text-center">
      <p className="text-xs tracking-editorial text-muted mb-1">{label}</p>
      <p className={`font-serif ${emphasize ? 'text-3xl text-accent' : 'text-2xl text-ink'}`}>
        {value}
        <span className="text-xs text-muted ml-1">{unit}</span>
      </p>
    </div>
  )
}
