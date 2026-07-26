import { addDays, dateKey, parseDateKey } from './streak'
import { colorLabel, skinLabel } from './recommend'
import type {
  ColorType,
  DiagnosisHistoryEntry,
  RecommendedStep,
  RoutineLog,
  SkinType,
} from './types'

// 「続けた結果」を見せるための集計。
//
// 表現の方針（重要）:
//   化粧品の効能表現に踏み込まないよう、ここでは事実だけを扱う。
//   「診断スコアがこう変わった」「何日実施した」までが範囲で、
//   「肌が改善した」「効果があった」といった因果の主張は行わない。
//   関数名・戻り値も trend / record など中立な語彙で統一している。

const SKIN_KEYS: SkinType[] = ['dry', 'oily', 'combination', 'normal']
const COLOR_KEYS: ColorType[] = ['spring', 'summer', 'autumn', 'winter']

// 再診断をすすめる間隔（肌質は季節や生活で変わるため、月1回を目安にする）
export const REDIAGNOSIS_INTERVAL_DAYS = 30

// --- 日数計算 ---------------------------------------------------------------

// 2つのローカル日付キーの差（日数）。to が後なら正。
export function daysBetween(from: string, to: string): number {
  const ms = parseDateKey(to).getTime() - parseDateKey(from).getTime()
  return Math.round(ms / 86_400_000)
}

// ISO日時 → ローカル日付キー
export function isoToDateKey(iso: string): string {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : dateKey(d)
}

// --- 再診断のおすすめ -------------------------------------------------------

export interface RediagnosisSuggestion {
  suggest: boolean
  daysSince: number
  // 前回の診断以降、ルーティンを実施した日数（記録の重みを伝えるために添える）
  activeDays: number
}

/**
 * 前回の診断から一定期間が経っていれば、再診断をすすめる。
 * 「変化を比較する」ことが目的なので、記録が貯まっている人ほど意味がある。
 */
export function rediagnosisSuggestion(
  latest: DiagnosisHistoryEntry | null,
  logs: RoutineLog[],
  today: string = dateKey(),
  intervalDays: number = REDIAGNOSIS_INTERVAL_DAYS
): RediagnosisSuggestion {
  if (!latest) return { suggest: false, daysSince: 0, activeDays: 0 }

  const from = isoToDateKey(latest.created_at)
  if (!from) return { suggest: false, daysSince: 0, activeDays: 0 }

  const daysSince = Math.max(0, daysBetween(from, today))
  const activeDays = logs.filter((l) => l.stepIds.length > 0 && l.date >= from).length

  return { suggest: daysSince >= intervalDays, daysSince, activeDays }
}

// --- 診断スコアの推移 -------------------------------------------------------

export interface TrendPoint {
  date: string // ローカル日付キー
  // 軸内での割合（0-100）。スコアの絶対値は設問数に依存するため割合で比較する
  percent: number
}

export interface ScoreTrend {
  key: SkinType | ColorType
  label: string
  points: TrendPoint[]
  // 最初と最後の差分（ポイント）。増減の向きだけを事実として示す
  delta: number
}

// 軸内での割合を出す（ScoreChart と同じ計算に揃える）
function percentOf(totals: Record<string, number>, key: string, groupKeys: string[]): number {
  const sum = groupKeys.reduce((acc, k) => acc + (totals[k] ?? 0), 0)
  if (sum <= 0) return 0
  return Math.round(((totals[key] ?? 0) / sum) * 100)
}

/**
 * 履歴（新しい順）から、軸ごとのスコア推移を作る。
 * 2件以上ないと「推移」にならないので、その場合は空配列を返す。
 */
export function buildScoreTrends(
  historyDesc: DiagnosisHistoryEntry[],
  axis: 'skin' | 'color'
): ScoreTrend[] {
  if (historyDesc.length < 2) return []

  const keys = (axis === 'skin' ? SKIN_KEYS : COLOR_KEYS) as string[]
  const labelOf = (key: string) =>
    axis === 'skin' ? skinLabel(key as SkinType) : colorLabel(key as ColorType)
  // 古い順に並べ替えてから点を並べる
  const asc = [...historyDesc].reverse()

  return keys.map((key) => {
    const points = asc.map((entry) => ({
      date: isoToDateKey(entry.created_at),
      percent: percentOf(entry.totals ?? {}, key, keys),
    }))
    return {
      key: key as SkinType | ColorType,
      label: labelOf(key),
      points,
      delta: points[points.length - 1].percent - points[0].percent,
    }
  })
}

// --- 週次の振り返り ---------------------------------------------------------

export interface StepAdherence {
  stepId: string
  description: string
  doneDays: number
  rate: number // 0-1
}

export interface WeeklyReview {
  from: string
  to: string
  activeDays: number // 1つ以上チェックした日数
  totalChecks: number
  // 期間中に最も続いた工程 / 最も落ちた工程（手順が1つ以上ある場合のみ）
  kept: StepAdherence[]
  dropped: StepAdherence[]
}

/**
 * 直近 days 日の振り返りを作る。
 * 「続いた工程」と「落ちた工程」を出すのは、責めるためではなく
 * 翌週に何を減らす/残すかを決めやすくするため。
 */
export function buildWeeklyReview(
  logs: RoutineLog[],
  steps: RecommendedStep[],
  today: string = dateKey(),
  days = 7
): WeeklyReview {
  const from = addDays(today, -(days - 1))
  const inRange = logs.filter((l) => l.date >= from && l.date <= today)

  const activeDays = inRange.filter((l) => l.stepIds.length > 0).length
  const totalChecks = inRange.reduce((acc, l) => acc + l.stepIds.length, 0)

  const adherence: StepAdherence[] = steps.map((step) => {
    const doneDays = inRange.filter((l) => l.stepIds.includes(step.id)).length
    return {
      stepId: step.id,
      description: step.description,
      doneDays,
      rate: days > 0 ? doneDays / days : 0,
    }
  })

  // 実施日が1日でもある工程を「続いた」、1日も無い工程を「落ちた」とする。
  // 記録が全く無い週で全工程が「落ちた」と出ると気が滅入るので、
  // activeDays が 0 のときは仕分けしない。
  const sorted = [...adherence].sort((a, b) => b.doneDays - a.doneDays)
  const kept = activeDays > 0 ? sorted.filter((a) => a.doneDays > 0).slice(0, 3) : []
  const dropped = activeDays > 0 ? sorted.filter((a) => a.doneDays === 0).slice(0, 3) : []

  return { from, to: today, activeDays, totalChecks, kept, dropped }
}
