import { LOCAL_KEYS, readLocal, writeLocal } from './localStore'

// ルーティンのリマインド設定。
//
// 制約: Web Push（アプリを閉じていても届く通知）にはサーバーと VAPID 鍵が必要なため、
// ここでは「アプリを開いている間に、設定時刻でローカル通知を出す」方式にしている。
// ホーム画面に追加（PWA）しておけば、開いた瞬間にその日の未実施を知らせられる。

export interface ReminderSetting {
  enabled: boolean
  time: string // 'HH:MM'（24時間表記・ローカル時刻）
}

export const DEFAULT_REMINDER: ReminderSetting = { enabled: false, time: '21:00' }

export function loadReminder(): ReminderSetting {
  const saved = readLocal<Partial<ReminderSetting>>(LOCAL_KEYS.reminder, {})
  return {
    enabled: Boolean(saved.enabled),
    time: isValidTime(saved.time) ? saved.time : DEFAULT_REMINDER.time,
  }
}

export function saveReminder(setting: ReminderSetting): void {
  writeLocal(LOCAL_KEYS.reminder, setting)
}

export function isValidTime(value: unknown): value is string {
  return typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value)
}

/**
 * now から見て、次に time('HH:MM') が来るまでのミリ秒。
 * 今日の時刻を既に過ぎていれば翌日の同時刻までを返す（常に正の値）。
 */
export function msUntilNext(time: string, now: Date = new Date()): number {
  const [h, m] = time.split(':').map(Number)
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0, 0)
  if (next.getTime() <= now.getTime()) next.setDate(next.getDate() + 1)
  return next.getTime() - now.getTime()
}

// 通知本文（未実施の工程数に応じて出し分ける）
export function reminderMessage(remaining: number): { title: string; body: string } {
  if (remaining <= 0) {
    return {
      title: '今日のルーティンは完了しています',
      body: '記録を続けて、連続日数を伸ばしましょう。',
    }
  }
  return {
    title: '今日のスキンケアの時間です',
    body: `未実施の工程が ${remaining} つあります。チェックして記録しましょう。`,
  }
}
