import { create } from 'zustand'
import type { ColorType, Gender, SkinType, StyleType } from './types'

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

// 診断設問（肌質×4 / カラー×4）。各軸を複数問で聞き、平均的な傾向で判定して
// 1問依存による偏りを減らす（信頼性の担保）。
// カラーは「好み」ではなく身体的特徴で判定する:
//   - アンダートーン（暖/涼）: 血管の色・日焼け反応 → warm=spring+autumn / cool=summer+winter
//   - 明度/クリアさ（明/深）: 瞳の色・顔立ちや地毛 → light=spring+summer / deep=autumn+winter
export const QUESTIONS: Question[] = [
  // ---- 肌質（dry / oily / combination / normal）を4問で ----
  {
    id: 'q1',
    category: 'skin',
    content: '洗顔後、何もつけずにいると肌はどうなりますか？',
    options: [
      { id: 'q1a', label: 'つっぱって乾く・粉をふく', scores: { dry: 2 } },
      { id: 'q1b', label: 'T ゾーンも頬もすぐテカる', scores: { oily: 2 } },
      { id: 'q1c', label: '頬は乾くのに T ゾーンはテカる', scores: { combination: 2 } },
      { id: 'q1d', label: '特に気にならず快適', scores: { normal: 2 } },
    ],
  },
  {
    id: 'q2',
    category: 'skin',
    content: '昼過ぎ、肌やメイクの状態は？',
    options: [
      { id: 'q2a', label: '乾燥して粉っぽく、小じわが気になる', scores: { dry: 2 } },
      { id: 'q2b', label: '全体に皮脂でテカり、崩れる', scores: { oily: 2 } },
      { id: 'q2c', label: 'T ゾーンだけテカり、頬は乾く', scores: { combination: 2 } },
      { id: 'q2d', label: 'ほぼ変化なく安定している', scores: { normal: 2 } },
    ],
  },
  {
    id: 'q3',
    category: 'skin',
    content: '毛穴の状態は？',
    options: [
      { id: 'q3a', label: '乾燥でキメが乱れがち', scores: { dry: 2 } },
      { id: 'q3b', label: '開き・黒ずみ・詰まりが全体に', scores: { oily: 2 } },
      { id: 'q3c', label: 'T ゾーンだけ目立つ', scores: { combination: 2 } },
      { id: 'q3d', label: '目立たず良好', scores: { normal: 2 } },
    ],
  },
  {
    id: 'q4',
    category: 'skin',
    content: '起きやすい肌トラブルは？',
    options: [
      { id: 'q4a', label: '乾燥・つっぱり・かゆみ', scores: { dry: 2 } },
      { id: 'q4b', label: 'ニキビ・吹き出物・べたつき', scores: { oily: 2 } },
      { id: 'q4c', label: '部分的な乾燥とテカリの両方', scores: { combination: 2 } },
      { id: 'q4d', label: '大きなトラブルは少ない', scores: { normal: 2 } },
    ],
  },

  // ---- パーソナルカラー（4シーズン）を身体的特徴4問で ----
  {
    id: 'q5',
    category: 'color',
    content: '手首の内側の血管は、何色に見えますか？',
    options: [
      { id: 'q5a', label: '緑っぽい', scores: { spring: 1, autumn: 1 } }, // warm
      { id: 'q5b', label: '青・紫っぽい', scores: { summer: 1, winter: 1 } }, // cool
    ],
  },
  {
    id: 'q6',
    category: 'color',
    content: '日焼けをすると、肌はどうなりますか？',
    options: [
      { id: 'q6a', label: '赤くなりにくく、小麦色に焼ける', scores: { spring: 1, autumn: 1 } }, // warm
      { id: 'q6b', label: 'まず赤くヒリヒリし、焼けにくい', scores: { summer: 1, winter: 1 } }, // cool
    ],
  },
  {
    id: 'q7',
    category: 'color',
    content: '黒目（瞳）の色と印象は？',
    options: [
      { id: 'q7a', label: '明るめのブラウンで、やわらかい印象', scores: { spring: 1, summer: 1 } }, // light
      { id: 'q7b', label: '深いブラウン〜黒で、くっきりした印象', scores: { autumn: 1, winter: 1 } }, // deep
    ],
  },
  {
    id: 'q8',
    category: 'color',
    content: '顔立ちや地毛の印象に近いのは？',
    options: [
      { id: 'q8a', label: 'ソフトで親しみやすい／髪は明るめ・柔らかい', scores: { spring: 1, summer: 1 } }, // light
      { id: 'q8b', label: '華やかでくっきり／髪は黒くしっかり', scores: { autumn: 1, winter: 1 } }, // deep
    ],
  },
]

interface DiagnosisState {
  // 冒頭で選ぶ性別（未選択なら null）
  gender: Gender | null
  index: number
  // question.id -> 選んだ option
  answers: Record<string, Option>
  // 設問（肌質・カラー）を最後まで回答したか
  questionsDone: boolean
  // ユーザーが直接選ぶ「なりたい系統」
  style: StyleType | null
  setGender: (gender: Gender) => void
  select: (question: Question, option: Option) => void
  setStyle: (style: StyleType) => void
  back: () => void
  reset: () => void
}

// 診断の完了 = 性別選択済み かつ 全設問回答済み かつ 系統を選択済み
export const useDiagnosisStore = create<DiagnosisState>((set) => ({
  gender: null,
  index: 0,
  answers: {},
  questionsDone: false,
  style: null,
  setGender: (gender) => set({ gender }),
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
      // 系統選択画面から戻る → 最後の設問へ
      if (s.questionsDone) return { questionsDone: false, style: null }
      // 最初の設問から戻る → 性別選択へ
      if (s.index === 0) return { gender: null }
      return { index: Math.max(0, s.index - 1) }
    }),
  reset: () =>
    set({ gender: null, index: 0, answers: {}, questionsDone: false, style: null }),
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
    skin: pick<SkinType>(['dry', 'oily', 'combination', 'normal']),
    color: pick<ColorType>(['spring', 'summer', 'autumn', 'winter']),
    totals,
  }
}
