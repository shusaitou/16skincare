import { create } from 'zustand'
import type { CosmeticTone, OwnedCosmetic } from './types'

// 手持ちコスメの状態。結果画面と登録画面の両方から参照するため、
// 既存の diagnosisStore と同じく zustand で1か所に持つ。
//
// 保存先は localStorage。手持ちのコスメは端末ごとの持ち物に近く、
// ログイン機能を前提にせずすぐ使えることを優先した。

const STORAGE_KEY = '16sk.owned'

function storage(): Storage | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage
  } catch {
    // プライベートブラウジング等では参照自体が例外になることがある
    return null
  }
}

function read(): OwnedCosmetic[] {
  const s = storage()
  if (!s) return []
  try {
    const raw = s.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as OwnedCosmetic[]) : []
  } catch {
    return []
  }
}

function write(items: OwnedCosmetic[]): void {
  const s = storage()
  if (!s) return
  try {
    s.setItem(STORAGE_KEY, JSON.stringify(items))
  } catch {
    // 容量超過などは無視する（保存できなくても画面は動かす）
  }
}

function newId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `owned-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
}

// 同じものを二重登録しないための鍵（カテゴリ＋ブランド＋製品名）。
// 製品名なし（カテゴリだけのタップ登録）は1カテゴリにつき1件になる。
export function ownedKey(item: Pick<OwnedCosmetic, 'category' | 'name' | 'brand'>): string {
  return `${item.category}::${item.brand ?? ''}::${item.name ?? ''}`.toLowerCase()
}

// 表示用の名前。製品名が無いときはカテゴリ名で代用する。
export function ownedLabel(item: OwnedCosmetic): string {
  return item.name?.trim() || item.category
}

export interface NewOwnedCosmetic {
  category: string
  name?: string
  brand?: string
  tone?: CosmeticTone
  jan?: string
  ingredients?: string[]
}

interface OwnedState {
  items: OwnedCosmetic[]
  // localStorage から読み込み済みか（SSR とクライアントの差分を避けるため）
  hydrated: boolean
  hydrate: () => void
  add: (input: NewOwnedCosmetic) => void
  remove: (id: string) => void
  // 「持ってる」トグル用。既にあれば削除、無ければ追加する
  toggle: (input: NewOwnedCosmetic) => void
  has: (input: Pick<OwnedCosmetic, 'category' | 'name' | 'brand'>) => boolean
  setTone: (id: string, tone?: CosmeticTone) => void
  clear: () => void
}

export const useOwnedStore = create<OwnedState>((set, get) => ({
  items: [],
  hydrated: false,

  hydrate: () => {
    if (get().hydrated) return
    set({ items: read(), hydrated: true })
  },

  add: (input) =>
    set((s) => {
      // 空文字の製品名は「未入力」と同じ扱いに揃える（鍵がぶれないように）
      const normalized = { ...input, name: input.name?.trim() || undefined }
      const key = ownedKey(normalized)
      if (s.items.some((i) => ownedKey(i) === key)) return s
      const items = [
        { ...normalized, id: newId(), created_at: new Date().toISOString() },
        ...s.items,
      ]
      write(items)
      return { items }
    }),

  remove: (id) =>
    set((s) => {
      const items = s.items.filter((i) => i.id !== id)
      write(items)
      return { items }
    }),

  toggle: (input) => {
    const key = ownedKey(input)
    const existing = get().items.find((i) => ownedKey(i) === key)
    if (existing) get().remove(existing.id)
    else get().add(input)
  },

  has: (input) => {
    const key = ownedKey(input)
    return get().items.some((i) => ownedKey(i) === key)
  },

  setTone: (id, tone) =>
    set((s) => {
      const items = s.items.map((i) => (i.id === id ? { ...i, tone } : i))
      write(items)
      return { items }
    }),

  clear: () => {
    write([])
    set({ items: [] })
  },
}))
