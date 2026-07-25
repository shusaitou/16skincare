import { supabase } from './supabaseClient'
import { LOCAL_KEYS, readLocal, writeLocal } from './localStore'
import type { FavoriteItem, FavoriteType, Product, RecommendedStep } from './types'

// お気に入り（手順 / 製品のブックマーク）。
//   userId あり → Supabase(favorites) / userId なし → localStorage

// お気に入りの一意キー。手順は technique_id、製品は brand::name。
export function stepKey(step: Pick<RecommendedStep, 'id'>): string {
  return step.id
}
export function productKey(product: Pick<Product, 'brand' | 'name'>): string {
  return `${product.brand}::${product.name}`
}

// UI から渡しやすいよう、対象からお気に入り項目を組み立てるヘルパー
export function favoriteOfStep(step: RecommendedStep): Omit<FavoriteItem, 'created_at'> {
  return {
    type: 'step',
    key: stepKey(step),
    label: step.description,
    sublabel: step.ingredients?.length ? step.ingredients.join(' / ') : undefined,
  }
}
export function favoriteOfProduct(product: Product): Omit<FavoriteItem, 'created_at'> {
  return {
    type: 'product',
    key: productKey(product),
    label: `${product.brand} ${product.name}`,
    sublabel: product.category,
  }
}

interface FavoriteRow {
  item_type: FavoriteType
  item_key: string
  label: string
  sublabel: string | null
  created_at: string
}

function fromRow(row: FavoriteRow): FavoriteItem {
  return {
    type: row.item_type,
    key: row.item_key,
    label: row.label,
    sublabel: row.sublabel ?? undefined,
    created_at: row.created_at,
  }
}

function readLocalFavorites(): FavoriteItem[] {
  return readLocal<FavoriteItem[]>(LOCAL_KEYS.favorites, [])
}

// 新しい順
export async function listFavorites(userId: string | null): Promise<FavoriteItem[]> {
  if (userId && supabase) {
    const { data, error } = await supabase
      .from('favorites')
      .select('*')
      .eq('auth_id', userId)
      .order('created_at', { ascending: false })
    if (error) throw new Error(error.message)
    return (data as FavoriteRow[]).map(fromRow)
  }
  return readLocalFavorites()
}

export async function addFavorite(
  userId: string | null,
  item: Omit<FavoriteItem, 'created_at'>
): Promise<void> {
  if (userId && supabase) {
    // 同じものを2回押しても増えないよう upsert（テーブルに一意制約あり）
    const { error } = await supabase.from('favorites').upsert(
      {
        auth_id: userId,
        item_type: item.type,
        item_key: item.key,
        label: item.label,
        sublabel: item.sublabel ?? null,
      },
      { onConflict: 'auth_id,item_type,item_key' }
    )
    if (error) throw new Error(error.message)
    return
  }

  const current = readLocalFavorites()
  if (current.some((f) => f.type === item.type && f.key === item.key)) return
  writeLocal(LOCAL_KEYS.favorites, [
    { ...item, created_at: new Date().toISOString() },
    ...current,
  ])
}

export async function removeFavorite(
  userId: string | null,
  type: FavoriteType,
  key: string
): Promise<void> {
  if (userId && supabase) {
    const { error } = await supabase
      .from('favorites')
      .delete()
      .eq('auth_id', userId)
      .eq('item_type', type)
      .eq('item_key', key)
    if (error) throw new Error(error.message)
    return
  }
  writeLocal(
    LOCAL_KEYS.favorites,
    readLocalFavorites().filter((f) => !(f.type === type && f.key === key))
  )
}

// ログイン直後、ローカルのお気に入りを Supabase へ引き継ぐ。戻り値は移行件数。
export async function mergeLocalFavorites(userId: string): Promise<number> {
  if (!supabase) return 0
  const local = readLocalFavorites()
  if (local.length === 0) return 0

  const { error } = await supabase.from('favorites').upsert(
    local.map((f) => ({
      auth_id: userId,
      item_type: f.type,
      item_key: f.key,
      label: f.label,
      sublabel: f.sublabel ?? null,
      created_at: f.created_at,
    })),
    { onConflict: 'auth_id,item_type,item_key' }
  )
  if (error) throw new Error(error.message)

  writeLocal(LOCAL_KEYS.favorites, [])
  return local.length
}
