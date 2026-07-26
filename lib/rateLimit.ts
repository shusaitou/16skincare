// 外部APIを叩く間隔を空けるためのスロットル。
//
// 楽天ウェブサービスは具体的な上限値を公開していないが、
//   - 短時間に同じURLへ繰り返しアクセスすると一定時間応答しなくなる
//   - 超過すると 429 が返る
// と明記されている。制限はアプリID単位＝全ユーザー共有なので、
// 1人の連打で全員が止まる。安全側に倒して「毎秒1回」を前提に間隔を空ける。
//
// 待たせすぎると入力補完としては使い物にならないので、
// 順番待ちが maxWaitMs を超える場合は**待たずに諦める**（呼び出し側は
// アプリ内カタログの候補だけで動く）。

export interface Throttle {
  /**
   * 実行枠を取る。取れたら true。
   * 混み合っていて maxWaitMs 以内に枠が来ない場合は、待たずに false を返す。
   */
  acquire: () => Promise<boolean>
}

export interface ThrottleOptions {
  // 呼び出しの最小間隔
  minIntervalMs: number
  // これ以上待つくらいなら諦める閾値
  maxWaitMs: number
  // テスト用（既定は実時間）
  now?: () => number
  sleep?: (ms: number) => Promise<void>
}

export function createThrottle(options: ThrottleOptions): Throttle {
  const {
    minIntervalMs,
    maxWaitMs,
    now = () => Date.now(),
    sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms)),
  } = options

  // 次に呼び出してよい時刻。枠を取るたびに minIntervalMs ずつ先に進む。
  let nextAvailableAt = 0

  return {
    async acquire() {
      const current = now()
      const slot = Math.max(current, nextAvailableAt)
      const wait = slot - current

      if (wait > maxWaitMs) return false

      // 先に枠を確保してから待つ。こうしないと同時に来た呼び出しが
      // 同じ枠を取り合って、間隔が詰まってしまう。
      nextAvailableAt = slot + minIntervalMs
      if (wait > 0) await sleep(wait)
      return true
    },
  }
}
