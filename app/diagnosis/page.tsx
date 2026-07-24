import React, { useState } from 'react'
import QuestionCard from '../../components/QuestionCard'

type Option = { id: string; label: string; scores: { [k: string]: number } }

const QUESTIONS: { id: string; content: string; options: Option[] }[] = [
  {
    id: 'q1',
    content: '肌の感触はどうですか？',
    options: [
      { id: 'q1a', label: 'つっぱる・乾燥しやすい', scores: { dry: 2 } },
      { id: 'q1b', label: 'Tゾーンがテカる', scores: { oily: 2 } },
      { id: 'q1c', label: '混合肌', scores: { combination: 2 } }
    ]
  },
  {
    id: 'q2',
    content: '好きなメイクの質感は？',
    options: [
      { id: 'q2a', label: 'マットでシャープ', scores: { mode: 2 } },
      { id: 'q2b', label: 'ツヤ感のある自然な仕上がり', scores: { clean: 2 } },
      { id: 'q2c', label: '光沢のあるグロウ', scores: { glow: 2 } }
    ]
  },
  {
    id: 'q3',
    content: 'パーソナルカラーはどれに近いですか？',
    options: [
      { id: 'q3a', label: '暖かい色味（スプリング／オータム系）', scores: { warm: 2 } },
      { id: 'q3b', label: '涼しげな色味（サマー／ウィンター系）', scores: { cool: 2 } }
    ]
  }
]

export default function DiagnosisPage() {
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState<Option[]>([])
  const [finished, setFinished] = useState(false)

  function handleSelect(opt: Option) {
    setAnswers((s) => [...s, opt])
    if (index + 1 < QUESTIONS.length) {
      setIndex(index + 1)
    } else {
      setFinished(true)
    }
  }

  function computeResult() {
    const totals: { [k: string]: number } = {}
    for (const a of answers) {
      for (const k of Object.keys(a.scores)) {
        totals[k] = (totals[k] || 0) + (a.scores[k] || 0)
      }
    }
    // pick top keys for skin and style
    const skinKeys = ['dry', 'oily', 'combination']
    const styleKeys = ['mode', 'clean', 'glow']
    const colorKeys = ['warm', 'cool']

    const pick = (keys: string[]) => {
      let best = keys[0]
      for (const k of keys) {
        if ((totals[k] || 0) > (totals[best] || 0)) best = k
      }
      return best
    }

    return {
      skin: pick(skinKeys),
      style: pick(styleKeys),
      color: pick(colorKeys),
      totals
    }
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">MBTI風 診断 (雛形)</h1>

      {!finished && (
        <div>
          <QuestionCard question={QUESTIONS[index]} onSelect={handleSelect} />
          <p className="text-sm text-gray-500">{index + 1} / {QUESTIONS.length}</p>
        </div>
      )}

      {finished && (
        <div className="bg-white p-4 rounded shadow">
          <h2 className="text-lg font-medium mb-2">診断結果</h2>
          <pre className="text-sm bg-gray-50 p-3 rounded">
            {JSON.stringify(computeResult(), null, 2)}
          </pre>
          <div className="mt-3">
            <button className="px-4 py-2 bg-blue-600 text-white rounded" onClick={() => { setIndex(0); setAnswers([]); setFinished(false) }}>
              再診断
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
