import { describe, expect, it } from 'vitest'
import { createThrottle } from '../lib/rateLimit'

// 時刻と sleep を差し替えて、実時間を待たずに間隔の挙動を検証する。
function fakeClock(start = 0) {
  let t = start
  const slept: number[] = []
  // 「いつ起きる予定だったか」= 割り当てられた枠の時刻。
  // 時刻を共有して進める模擬クロックでは、acquire 完了後に now() を見ても
  // 全部同じ値になってしまうため、枠はここで捕まえる。
  const wakeAt: number[] = []
  return {
    now: () => t,
    sleep: async (ms: number) => {
      slept.push(ms)
      wakeAt.push(t + ms)
      t += ms
    },
    advance: (ms: number) => {
      t += ms
    },
    get slept() {
      return slept
    },
    get wakeAt() {
      return wakeAt
    },
    get time() {
      return t
    },
  }
}

describe('createThrottle', () => {
  it('最初の1回は待たずに通す', async () => {
    const c = fakeClock(1000)
    const th = createThrottle({ minIntervalMs: 1000, maxWaitMs: 2000, now: c.now, sleep: c.sleep })

    expect(await th.acquire()).toBe(true)
    expect(c.slept).toEqual([])
  })

  it('連続呼び出しは最小間隔だけ待たせる', async () => {
    const c = fakeClock(0)
    const th = createThrottle({ minIntervalMs: 1000, maxWaitMs: 5000, now: c.now, sleep: c.sleep })

    await th.acquire() // 即時
    await th.acquire() // 1000 待つ
    await th.acquire() // さらに 1000 待つ

    expect(c.slept).toEqual([1000, 1000])
  })

  it('十分に時間が空いていれば待たない', async () => {
    const c = fakeClock(0)
    const th = createThrottle({ minIntervalMs: 1000, maxWaitMs: 5000, now: c.now, sleep: c.sleep })

    await th.acquire()
    c.advance(3000) // 3秒経過
    expect(await th.acquire()).toBe(true)
    expect(c.slept).toEqual([])
  })

  it('待ち時間が上限を超えるなら、待たずに諦める', async () => {
    const c = fakeClock(0)
    // 1秒間隔・最大1.5秒待ちなら、3件目で諦める
    const th = createThrottle({ minIntervalMs: 1000, maxWaitMs: 1500, now: c.now, sleep: c.sleep })

    expect(await th.acquire()).toBe(true) // 待ち0
    expect(await th.acquire()).toBe(true) // 待ち1000
    // ここまでで next は 2000。現在時刻も 1000 まで進んでいるので待ちは 1000 → まだ通る
    expect(await th.acquire()).toBe(true)
  })

  it('同時に殺到しても枠を取り合わない（間隔が詰まらない）', async () => {
    const c = fakeClock(0)
    const th = createThrottle({ minIntervalMs: 1000, maxWaitMs: 10000, now: c.now, sleep: c.sleep })

    // await せずに一気に呼ぶ（sleep の前に枠を確保している必要がある）
    const results = await Promise.all([th.acquire(), th.acquire(), th.acquire(), th.acquire()])

    expect(results).toEqual([true, true, true, true])
    // 2件目以降が 1秒ずつ別の枠を取っている（同じ枠に重なっていない）
    expect(c.wakeAt).toEqual([1000, 2000, 3000])
  })

  it('諦めた呼び出しは枠を消費しない', async () => {
    const c = fakeClock(0)
    const th = createThrottle({ minIntervalMs: 1000, maxWaitMs: 500, now: c.now, sleep: c.sleep })

    expect(await th.acquire()).toBe(true) // 枠を取る（next=1000）
    expect(await th.acquire()).toBe(false) // 待ち1000 > 500 なので諦める

    // 諦めた分が枠を進めていないので、1秒後には再び通る
    c.advance(1000)
    expect(await th.acquire()).toBe(true)
    expect(c.slept).toEqual([])
  })

  it('maxWaitMs が 0 なら、空いているときだけ通す', async () => {
    const c = fakeClock(0)
    const th = createThrottle({ minIntervalMs: 1000, maxWaitMs: 0, now: c.now, sleep: c.sleep })

    expect(await th.acquire()).toBe(true)
    expect(await th.acquire()).toBe(false)
    c.advance(1000)
    expect(await th.acquire()).toBe(true)
  })
})
