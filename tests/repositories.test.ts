import { beforeEach, describe, expect, it } from 'vitest'
import {
  favoriteOfProduct,
  favoriteOfStep,
  addFavorite,
  listFavorites,
  productKey,
  removeFavorite,
} from '../lib/favoritesRepository'
import { listRoutineLogs, toggleRoutineStep } from '../lib/routineRepository'
import { listHistory, saveHistory } from '../lib/historyRepository'
import { LOCAL_KEYS } from '../lib/localStore'
import type { DiagnosisResult, Product, RecommendedStep } from '../lib/types'

// 未ログイン（= localStorage バックエンド）の動作を検証する。
// Supabase の env はテスト環境で未設定のため、各リポジトリはローカル側に落ちる。

class MemoryStorage {
  private map = new Map<string, string>()
  getItem(key: string) {
    return this.map.get(key) ?? null
  }
  setItem(key: string, value: string) {
    this.map.set(key, value)
  }
  removeItem(key: string) {
    this.map.delete(key)
  }
  clear() {
    this.map.clear()
  }
}

beforeEach(() => {
  // localStore は window.localStorage を見るので、最小限のスタブを立てる
  ;(globalThis as unknown as { window: unknown }).window = { localStorage: new MemoryStorage() }
})

const GUEST = null

const step: RecommendedStep = {
  id: 't-lotion',
  step_order: 20,
  description: '化粧水をハンドプレスでなじませる。',
  ingredients: ['ヒアルロン酸', 'グリセリン'],
}

const product: Product = { name: '化粧水・高保湿タイプ', brand: '無印良品', category: '化粧水' }

describe('お気に入り（未ログイン）', () => {
  it('追加したものが一覧に出る', async () => {
    await addFavorite(GUEST, favoriteOfStep(step))
    const list = await listFavorites(GUEST)
    expect(list).toHaveLength(1)
    expect(list[0].type).toBe('step')
    expect(list[0].key).toBe('t-lotion')
    expect(list[0].label).toBe(step.description)
    // 成分は表示用の補足として保持される
    expect(list[0].sublabel).toBe('ヒアルロン酸 / グリセリン')
  })

  it('同じものを2回追加しても重複しない', async () => {
    await addFavorite(GUEST, favoriteOfStep(step))
    await addFavorite(GUEST, favoriteOfStep(step))
    expect(await listFavorites(GUEST)).toHaveLength(1)
  })

  it('手順と製品は別種別として共存する', async () => {
    await addFavorite(GUEST, favoriteOfStep(step))
    await addFavorite(GUEST, favoriteOfProduct(product))
    const list = await listFavorites(GUEST)
    expect(list).toHaveLength(2)
    expect(list.map((f) => f.type).sort()).toEqual(['product', 'step'])
  })

  it('製品キーはブランドと製品名から作られる', () => {
    expect(productKey(product)).toBe('無印良品::化粧水・高保湿タイプ')
  })

  it('削除は種別とキーの両方が一致したものだけを消す', async () => {
    await addFavorite(GUEST, favoriteOfStep(step))
    await addFavorite(GUEST, favoriteOfProduct(product))
    await removeFavorite(GUEST, 'step', 't-lotion')
    const list = await listFavorites(GUEST)
    expect(list).toHaveLength(1)
    expect(list[0].type).toBe('product')
  })
})

describe('ルーティン記録（未ログイン）', () => {
  const day = '2026-07-25'

  it('チェックした手順が日付ごとに記録される', async () => {
    await toggleRoutineStep(GUEST, 't-cleanse', true, day)
    await toggleRoutineStep(GUEST, 't-lotion', true, day)
    const logs = await listRoutineLogs(GUEST, day)
    expect(logs).toHaveLength(1)
    expect(logs[0].date).toBe(day)
    expect(logs[0].stepIds.sort()).toEqual(['t-cleanse', 't-lotion'])
  })

  it('同じ手順を2回チェックしても重複しない', async () => {
    await toggleRoutineStep(GUEST, 't-cleanse', true, day)
    await toggleRoutineStep(GUEST, 't-cleanse', true, day)
    expect((await listRoutineLogs(GUEST, day))[0].stepIds).toEqual(['t-cleanse'])
  })

  it('チェックを外すと記録から消える', async () => {
    await toggleRoutineStep(GUEST, 't-cleanse', true, day)
    await toggleRoutineStep(GUEST, 't-lotion', true, day)
    await toggleRoutineStep(GUEST, 't-cleanse', false, day)
    expect((await listRoutineLogs(GUEST, day))[0].stepIds).toEqual(['t-lotion'])
  })

  it('その日の最後のチェックを外すと、その日は実施日でなくなる', async () => {
    await toggleRoutineStep(GUEST, 't-cleanse', true, day)
    await toggleRoutineStep(GUEST, 't-cleanse', false, day)
    expect(await listRoutineLogs(GUEST, day)).toEqual([])
  })

  it('since より古い記録は返さない', async () => {
    await toggleRoutineStep(GUEST, 't-cleanse', true, '2026-07-20')
    await toggleRoutineStep(GUEST, 't-cleanse', true, '2026-07-25')
    const logs = await listRoutineLogs(GUEST, '2026-07-24')
    expect(logs.map((l) => l.date)).toEqual(['2026-07-25'])
  })

  it('日付をまたぐと別の記録になる', async () => {
    await toggleRoutineStep(GUEST, 't-cleanse', true, '2026-07-24')
    await toggleRoutineStep(GUEST, 't-cleanse', true, '2026-07-25')
    const logs = await listRoutineLogs(GUEST, '2026-07-01')
    // 新しい日付が先頭
    expect(logs.map((l) => l.date)).toEqual(['2026-07-25', '2026-07-24'])
  })
})

describe('診断履歴（未ログイン）', () => {
  const result: DiagnosisResult = {
    gender: 'women',
    skin: 'dry',
    color: 'autumn',
    style: 'mode',
  }

  it('保存した診断が新しい順で取り出せる', async () => {
    await saveHistory(GUEST, { result, totals: { dry: 8 }, steps: [step] })
    await saveHistory(GUEST, {
      result: { ...result, skin: 'normal' },
      totals: { normal: 8 },
      steps: [step],
    })

    const list = await listHistory(GUEST)
    expect(list).toHaveLength(2)
    expect(list[0].result.skin).toBe('normal') // 直近が先頭
    expect(list[1].result.skin).toBe('dry')
  })

  it('手順のスナップショットを保持する', async () => {
    await saveHistory(GUEST, { result, totals: {}, steps: [step], correctionReason: '補正しました' })
    const [saved] = await listHistory(GUEST)
    expect(saved.steps).toEqual([step])
    expect(saved.correctionReason).toBe('補正しました')
    expect(saved.created_at).toBeTruthy()
  })

  it('localStorage が使えない環境でも例外を投げない', async () => {
    ;(globalThis as unknown as { window?: unknown }).window = undefined
    await expect(saveHistory(GUEST, { result, totals: {}, steps: [] })).resolves.toBeTruthy()
    await expect(listHistory(GUEST)).resolves.toEqual([])
  })
})

describe('localStorage のキー', () => {
  it('他アプリと衝突しないよう名前空間を持つ', () => {
    for (const key of Object.values(LOCAL_KEYS)) {
      expect(key.startsWith('16sk.')).toBe(true)
    }
  })
})
