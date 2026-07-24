import React from 'react'

type Option = {
  id: string
  label: string
  scores: { [key: string]: number }
}

type Props = {
  question: { id: string; content: string; options: Option[] }
  onSelect: (opt: Option) => void
}

export default function QuestionCard({ question, onSelect }: Props) {
  return (
    <div className="p-4 bg-white rounded shadow mb-4">
      <h2 className="text-lg font-medium mb-3">{question.content}</h2>
      <div className="grid grid-cols-1 gap-2">
        {question.options.map((opt) => (
          <button
            key={opt.id}
            onClick={() => onSelect(opt)}
            className="text-left p-3 border rounded hover:bg-gray-50"
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}
