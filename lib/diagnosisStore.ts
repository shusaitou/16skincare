import { create } from 'zustand'
import type { ColorType, SkinType, StyleType } from './types'

// 診断の設問と選択肢（フロントでリアルタイムにスコア集計）
export type ScoreKey = SkinType | ColorType | StyleType

export interface Option {
  id: string
  label: string
  scores: Partial<Record<ScoreKey, number>>
}

export interface Question {
  id: string
  content: string
  category: 'skin' | 'color' | 'style'
  options: Option[]
}

export const QUESTIONS: Question[] = [
  {
    id: 'q1',
    category: 'skin',
    content: '洗顔後、何もつけないと肌はどうなりますか？',
    options: [
      { id: 'q1a', label: 'すぐにつっぱる・粉をふく', scores: { dry: 2 } },
      { id: 'q1b', label: 'しばらくするとTゾーンがテカる', scores: { oily: 2 } },
      { id: 'q1c', label: '頬は乾くがTゾーンはテカる', scores: { combination: 2 } },
    ],
  },
  {
    id: 'q2',
    category: 'skin',
    content: '毛穴やテカリは気になりますか？',
    options: [
      { id: 'q2a', label: 'ほとんど気にならない（むしろカサつく）', scores: { dry: 2 } },
      { id: 'q2b', label: '全体的にテカりやすい', scores: { oily: 2 } },
      { id: 'q2c', label: '部分的に気になる', scores: { combination: 2 } },
    ],
  },
  {
    id: 'q3',
    category: 'color',
    content: '似合う・褒められるアクセサリーは？',
    options: [
      { id: 'q3a', label: 'ゴールド系', scores: { warm: 2 } },
      { id: 'q3b', label: 'シルバー系', scores: { cool: 2 } },
    ],
  },
  {
    id: 'q4',
    category: 'color',
    content: '肌なじみが良いと感じる服の色は？',
    options: [
      { id: 'q4a', label: 'コーラル・キャメル・オレンジ系', scores: { warm: 2 } },
      { id: 'q4b', label: 'ローズ・グレー・ネイビー系', scores: { cool: 2 } },
    ],
  },
  {
    id: 'q5',
    category: 'style',
    content: 'なりたいメイクの雰囲気は？',
    options: [
      { id: 'q5a', label: 'マットでシャープなモード系', scores: { mode: 2 } },
      { id: 'q5b', label: '清潔感のあるナチュラル', scores: { clean: 2 } },
      { id: 'q5c', label: '内側から発光するツヤ肌', scores: { glow: 2 } },
    ],
  },
  {
    id: 'q6',
    category: 'style',
    content: '仕上がりの質感の好みは？',
    options: [
      { id: 'q6a', label: 'さらっとマットで崩れにくい', scores: { mode: 2 } },
      { id: 'q6b', label: '素肌っぽいセミマット', scores: { clean: 2 } },
      { id: 'q6c', label: 'うるおいのあるツヤ', scores: { glow: 2 } },
    ],
  },
]

interface DiagnosisState {
  index: number
  // question.id -> 選んだ option
  answers: Record<string, Option>
  finished: boolean
  select: (question: Question, option: Option) => void
  back: () => void
  reset: () => void
}

export const useDiagnosisStore = create<DiagnosisState>((set) => ({
  index: 0,
  answers: {},
  finished: false,
  select: (question, option) =>
    set((s) => {
      const answers = { ...s.answers, [question.id]: option }
      const isLast = s.index + 1 >= QUESTIONS.length
      return {
        answers,
        index: isLast ? s.index : s.index + 1,
        finished: isLast,
      }
    }),
  back: () =>
    set((s) => ({
      index: Math.max(0, s.index - 1),
      finished: false,
    })),
  reset: () => set({ index: 0, answers: {}, finished: false }),
}))

// 回答からスコアを集計し、各軸のトップを診断結果として返す
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
    skin: pick<SkinType>(['dry', 'oily', 'combination']),
    color: pick<ColorType>(['warm', 'cool']),
    style: pick<StyleType>(['mode', 'clean', 'glow']),
    totals,
  }
}
