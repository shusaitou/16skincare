'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from './AuthProvider'
import { latestHistory } from '../lib/historyRepository'
import { listRoutineLogs } from '../lib/routineRepository'
import { dateKey } from '../lib/streak'
import {
  DEFAULT_REMINDER,
  loadReminder,
  msUntilNext,
  reminderMessage,
  saveReminder,
  type ReminderSetting,
} from '../lib/reminder'

type Permission = 'default' | 'granted' | 'denied' | 'unsupported'

// 毎日のリマインド設定。
// アプリを開いている間、設定時刻にローカル通知を出す（Service Worker 経由）。
export default function ReminderSettings() {
  const { user } = useAuth()
  const userId = user?.id ?? null

  const [setting, setSetting] = useState<ReminderSetting>(DEFAULT_REMINDER)
  const [permission, setPermission] = useState<Permission>('default')
  const [message, setMessage] = useState<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setSetting(loadReminder())
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setPermission('unsupported')
      return
    }
    setPermission(Notification.permission as Permission)
  }, [])

  // 未実施の工程数を数えて通知を出す
  const notifyNow = useCallback(async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) return
    if (Notification.permission !== 'granted') return

    let remaining = 0
    try {
      const today = dateKey()
      const [latest, logs] = await Promise.all([
        latestHistory(userId),
        listRoutineLogs(userId, today),
      ])
      const total = latest?.steps.length ?? 0
      const done = logs.find((l) => l.date === today)?.stepIds.length ?? 0
      remaining = Math.max(0, total - done)
    } catch {
      // 集計に失敗しても通知自体は出す
    }

    const { title, body } = reminderMessage(remaining)
    const options: NotificationOptions = {
      body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: '16skincare-routine',
    }

    // Service Worker 経由だと通知タップでアプリに戻れる
    const reg = await navigator.serviceWorker?.getRegistration()
    if (reg) await reg.showNotification(title, options)
    else new Notification(title, options)
  }, [userId])

  // 設定時刻にタイマーを張り直す（時刻変更・ON/OFF のたびに再設定）
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (!setting.enabled || permission !== 'granted') return

    const schedule = () => {
      timerRef.current = setTimeout(() => {
        void notifyNow()
        schedule() // 次の日ぶんを予約
      }, msUntilNext(setting.time))
    }
    schedule()

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [setting.enabled, setting.time, permission, notifyNow])

  async function onToggle(enabled: boolean) {
    if (enabled && permission !== 'granted') {
      const result = await Notification.requestPermission()
      setPermission(result as Permission)
      if (result !== 'granted') {
        setMessage('ブラウザの通知が許可されなかったため、リマインドを有効にできませんでした。')
        return
      }
    }
    const next = { ...setting, enabled }
    setSetting(next)
    saveReminder(next)
    setMessage(enabled ? `毎日 ${next.time} にお知らせします。` : 'リマインドをオフにしました。')
  }

  function onTimeChange(time: string) {
    const next = { ...setting, time }
    setSetting(next)
    saveReminder(next)
  }

  return (
    <div className="bg-ivory rounded-sm border border-line p-6">
      <p className="text-xs tracking-editorial text-accent mb-1">REMINDER</p>
      <h3 className="font-serif text-xl text-ink mb-4">毎日のリマインド</h3>

      {permission === 'unsupported' ? (
        <p className="text-sm text-muted leading-relaxed">
          このブラウザは通知に対応していません。ホーム画面に追加しておくと、
          アプリを開いたときにその日の進捗を確認できます。
        </p>
      ) : (
        <>
          <div className="flex items-center justify-between gap-4 py-3 border-b border-line">
            <div>
              <p className="text-sm text-ink">リマインドを受け取る</p>
              <p className="text-xs text-muted mt-0.5">ブラウザの通知を使います</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={setting.enabled}
              onClick={() => void onToggle(!setting.enabled)}
              className={`relative w-12 h-6 rounded-full transition-colors shrink-0 ${
                setting.enabled ? 'bg-accent' : 'bg-line'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-ivory transition-transform ${
                  setting.enabled ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between gap-4 py-3">
            <label htmlFor="reminder-time" className="text-sm text-ink">
              通知する時刻
            </label>
            <input
              id="reminder-time"
              type="time"
              value={setting.time}
              onChange={(e) => onTimeChange(e.target.value)}
              className="bg-cream border border-line rounded-sm px-3 py-2 text-ink outline-none focus:border-accent"
            />
          </div>

          {permission === 'denied' && (
            <p className="text-sm text-ink bg-accent-soft border border-accent/30 rounded-sm p-3 mt-2 leading-relaxed">
              通知がブロックされています。ブラウザのサイト設定から通知を許可してください。
            </p>
          )}
          {message && <p className="text-sm text-muted mt-2">{message}</p>}

          {permission === 'granted' && (
            <button
              type="button"
              onClick={() => void notifyNow()}
              className="text-xs text-accent hover:text-ink mt-3"
            >
              テスト通知を送る
            </button>
          )}

          <p className="text-xs text-muted mt-4 leading-relaxed">
            ※ 通知はアプリ（タブ）を開いている間に届きます。アプリを閉じていても届く通知には
            サーバー側の Web Push 設定が別途必要です。
          </p>
        </>
      )}
    </div>
  )
}
