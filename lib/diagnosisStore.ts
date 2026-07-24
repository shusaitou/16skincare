import { create } from 'zustand'
import type { ColorType, SkinType, StyleType } from './types'

// 診断で集計するスコアキー（= options のスコア列に対応）。
// 系統(style)は診断せず、ユーザーが直接選ぶためここには含めない。
export type ScoreKey = SkinType | ColorType

export interface Option {
  id: string
  label: string
  scores: Partial<Record<ScoreKey, number>>
}

export interface Question {
  id: string
  content: string
  category: 'skin' | 'color' // questions.category の CHECK 制約に一致
  options: Option[]
}

// 診断設問（肌質×2 / カラー×2）。カラーは「黄み/青み」×「明るい/深い」の
// 2軸で 4シーズンを判定する。
export const QUESTIONS: Question[] = [
  {
    id: 'q1',
    category: 'skin',
    content: '洗顔後、何もつけないと肌はどうなりますか？',
    options: [
      { id: 'q1a', label: 'すぐにつっぱる・粉をふく', scores: { dry: 2 } },
      { id: 'q1b', label: 'しばらくするとTゾーンがテカる', scores: { oily: 2 } },
    ],
  },
  {
    id: 'q2',
    category: 'skin',
    content: '毛穴やテカリは気になりますか？',
    options: [
      { id: 'q2a', label: 'あまり気にならない（むしろカサつく）', scores: { dry: 2 } },
      { id: 'q2b', label: '全体的にテカりやすい', scores: { oily: 2 } },
    ],
  },
  {
    id: 'q3',
    category: 'color',
    content: '肌なじみが良い・褒められるのは？',
    options: [
      {
        id: 'q3a',
        label: 'ゴールド系アクセ・暖色の服',
        scores: { spring: 1, autumn: 1 },
      },
      {
        id: 'q3b',
        label: 'シルバー系アクセ・寒色の服',
        scores: { summer: 1, winter: 1 },
      },
    ],
  },
  {
    id: 'q4',
    category: 'color',
    content: '似合う色の印象はどちらに近いですか？',
    options: [
      {
        id: 'q4a',
        label: '明るくクリアな色（パステル・鮮やか）',
        scores: { spring: 1, summer: 1 },
      },
      {
        id: 'q4b',
        label: '深く落ち着いた色（スモーキー・こっくり）',
        scores: { autumn: 1, winter: 1 },
      },
    ],
  },
]

interface DiagnosisState {
  index: number
  // question.id -> 選んだ option
  answers: Record<string, Option>
  // 設問（肌質・カラー）を最後まで回答したか
  questionsDone: boolean
  // ユーザーが直接選ぶ「なりたい系統」
  style: StyleType | null
  select: (question: Question, option: Option) => void
  setStyle: (style: StyleType) => void
  back: () => void
  reset: () => void
}

// 診断の完了 = 全設問回答済み かつ 系統を選択済み
export const useDiagnosisStore = create<DiagnosisState>((set) => ({
  index: 0,
  answers: {},
  questionsDone: false,
  style: null,
  select: (question, option) =>
    set((s) => {
      const answers = { ...s.answers, [question.id]: option }
      const isLast = s.index + 1 >= QUESTIONS.length
      return {
        answers,
        index: isLast ? s.index : s.index + 1,
        questionsDone: isLast,
      }
    }),
  setStyle: (style) => set({ style }),
  back: () =>
    set((s) => {
      // 系統選択画面から戻る場合は最後の設問へ
      if (s.questionsDone) return { questionsDone: false, style: null }
      return { index: Math.max(0, s.index - 1) }
    }),
  reset: () => set({ index: 0, answers: {}, questionsDone: false, style: null }),
}))

// 回答からスコアを集計し、各軸のトップを診断結果として返す（肌質・カラー）
export function computeResult(answers: Record<string, Option>) {
  const totals: Partial<Record<ScoreKey, number>> = {}
  for (const opt of Object.values(answers)) {
    for (const [k, v] of Object.entries(opt.scores)) {
      const key = k as ScoreKey
      totals[key] = (totals[key] ?? 0) + (v ?? 0)
    }
  }
  const pick = <T extends ScoreKey>(keys: T[]): T => {
    let best = keys[0]
    for (const k of keys) if ((totals[k] ?? 0) > (totals[best] ?? 0)) best = k
    return best
  }
  return {
    skin: pick<SkinType>(['dry', 'oily']),
    color: pick<ColorType>(['spring', 'summer', 'autumn', 'winter']),
    totals,
  }
}
