'use client'

import React, { useEffect, useId, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

// 予測変換つきの入力欄（コンボボックス）。
//
// <datalist> ではなく自前で組んでいるのは、
//   - ブラウザ間で見た目と挙動が揃わない
//   - 候補に補足（ブランド名など）を並べて表示できない
//   - 本アプリのエディトリアルな見た目に合わせられない
// ため。候補はあくまで補助で、**一覧に無い値も自由に入力できる**。

export interface Suggestion {
  // 選択したときに入力欄へ入る値
  value: string
  // 候補一覧での補足表示（ブランド名やカテゴリ）
  hint?: string
}

type Props = {
  id?: string
  label: React.ReactNode
  value: string
  onChange: (value: string) => void
  // 入力に応じた候補（呼び出し側で絞り込み済みのものを渡す）
  suggestions: Suggestion[]
  placeholder?: string
  required?: boolean
  // 候補を選んだとき（値の反映は onChange 経由で行われる）
  onPick?: (suggestion: Suggestion) => void
  help?: React.ReactNode
}

export default function AutocompleteInput({
  id,
  label,
  value,
  onChange,
  suggestions,
  placeholder,
  required,
  onPick,
  help,
}: Props) {
  const reactId = useId()
  const inputId = id ?? reactId
  const listId = `${inputId}-list`

  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const wrapRef = useRef<HTMLDivElement>(null)

  // 候補が変わったらハイライト位置をリセットする
  useEffect(() => {
    setActive(-1)
  }, [suggestions])

  // 外側をクリックしたら閉じる
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  const visible = useMemo(() => (open ? suggestions : []), [open, suggestions])

  function pick(s: Suggestion) {
    onChange(s.value)
    onPick?.(s)
    setOpen(false)
    setActive(-1)
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      if (!open && suggestions.length > 0) {
        setOpen(true)
        return
      }
      e.preventDefault()
      if (visible.length === 0) return
      const delta = e.key === 'ArrowDown' ? 1 : -1
      setActive((i) => (i + delta + visible.length) % visible.length)
      return
    }
    if (e.key === 'Enter') {
      // 候補を選んでいるときだけ確定する（そうでなければフォーム送信を邪魔しない）
      if (open && active >= 0 && visible[active]) {
        e.preventDefault()
        pick(visible[active])
      }
      return
    }
    if (e.key === 'Escape') {
      setOpen(false)
      setActive(-1)
    }
  }

  return (
    <div className="block" ref={wrapRef}>
      <label htmlFor={inputId} className="block">
        <span className="text-xs tracking-editorial text-muted">{label}</span>
      </label>

      <div className="relative mt-1.5">
        <input
          id={inputId}
          value={value}
          required={required}
          placeholder={placeholder}
          autoComplete="off"
          role="combobox"
          aria-expanded={open && visible.length > 0}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
          onChange={(e) => {
            onChange(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onBlur={(e) => {
            // 別の入力欄へ移ったのに候補が開きっぱなしにならないようにする。
            // 候補のクリックは mousedown で先に処理されるので、ここでは
            // 「フォーカスがこの部品の外へ出た」場合だけ閉じる。
            if (!wrapRef.current?.contains(e.relatedTarget as Node)) {
              setOpen(false)
              setActive(-1)
            }
          }}
          onKeyDown={onKeyDown}
          className="w-full bg-cream border border-line rounded-sm px-4 py-3 text-ink outline-none focus:border-accent"
        />

        <AnimatePresence>
          {visible.length > 0 && (
            <motion.ul
              id={listId}
              role="listbox"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.12 }}
              className="absolute z-30 left-0 right-0 mt-1 max-h-64 overflow-auto bg-ivory border border-line rounded-sm shadow-sm"
            >
              {visible.map((s, i) => (
                <li
                  key={`${s.value}-${s.hint ?? ''}-${i}`}
                  id={`${listId}-${i}`}
                  role="option"
                  aria-selected={i === active}
                  // onClick だと input の blur が先に走って閉じてしまうため mousedown で拾う
                  onMouseDown={(e) => {
                    e.preventDefault()
                    pick(s)
                  }}
                  onMouseEnter={() => setActive(i)}
                  className={`px-4 py-2.5 cursor-pointer flex items-baseline gap-2 ${
                    i === active ? 'bg-accent-soft' : 'hover:bg-cream'
                  }`}
                >
                  <span className="text-sm text-ink flex-1 min-w-0 truncate">{s.value}</span>
                  {s.hint && <span className="text-xs text-muted shrink-0">{s.hint}</span>}
                </li>
              ))}
            </motion.ul>
          )}
        </AnimatePresence>
      </div>

      {help && <span className="block text-xs text-muted mt-1.5 leading-relaxed">{help}</span>}
    </div>
  )
}
