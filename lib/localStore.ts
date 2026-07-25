// localStorage の薄いラッパー。
//
// 未ログイン時 / Supabase 未設定時でも「履歴・お気に入り・ルーティン」が動くよう、
// 各リポジトリはこのローカルバックエンドにフォールバックする。
// ログインすると、ここに溜まったデータは Supabase へ引き継がれる（各リポジトリの merge）。
//
// SSR（window 無し）でも呼べるよう、常に安全なデフォルト値を返す。

export const LOCAL_KEYS = {
  history: '16sk.history',
  favorites: '16sk.favorites',
  routine: '16sk.routine',
  reminder: '16sk.reminder',
} as const

function storage(): Storage | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage
  } catch {
    // プライベートブラウジング等で参照自体が例外になる場合がある
    return null
  }
}

export function readLocal<T>(key: string, fallback: T): T {
  const store = storage()
  if (!store) return fallback
  try {
    const raw = store.getItem(key)
    if (raw === null) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export function writeLocal<T>(key: string, value: T): void {
  const store = storage()
  if (!store) return
  try {
    store.setItem(key, JSON.stringify(value))
  } catch {
    // 容量超過などは黙って無視する（保存できなくても UI は動かす）
  }
}

export function clearLocal(key: string): void {
  const store = storage()
  if (!store) return
  try {
    store.removeItem(key)
  } catch {
    // 同上
  }
}

// ローカル保存用の簡易 ID（crypto.randomUUID が無い環境へのフォールバックつき）
export function localId(prefix = 'local'): string {
  const rand =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2) + Date.now().toString(36)
  return `${prefix}-${rand}`
}
