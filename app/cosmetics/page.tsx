'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { AnimatePresence, motion } from 'framer-motion'
import { useOwnedStore, type NewOwnedCosmetic } from '../../lib/ownedStore'
import { allProductCategories, isColorSensitive } from '../../lib/substitution'
import { colorLabel } from '../../lib/recommend'
import type { ColorType, CosmeticTone } from '../../lib/types'

const TONES: { value: CosmeticTone | ''; label: string }[] = [
  { value: '', label: '分からない' },
  { value: 'neutral', label: 'ベージュ・クリアなど（どれにも合う）' },
  ...(['spring', 'summer', 'autumn', 'winter'] as ColorType[]).map((c) => ({
    value: c as CosmeticTone,
    label: colorLabel(c),
  })),
]

// 手持ちコスメの登録・管理画面。
// 製品名での完全一致は現実的でないため、判定は「カテゴリ」で行う。
// そのためカテゴリだけは必須にし、名前・ブランド・色味は任意にしている。
export default function CosmeticsPage() {
  const { items, hydrated, hydrate, add, remove, setTone } = useOwnedStore()
  const categories = allProductCategories()

  const [form, setForm] = useState<NewOwnedCosmetic>({ category: '', name: '' })
  const [message, setMessage] = useState<string | null>(null)

  // localStorage はクライアントでしか読めないのでマウント後に読み込む
  useEffect(() => {
    hydrate()
  }, [hydrate])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.category || !form.name.trim()) return
    const before = items.length
    add({ ...form, name: form.name.trim(), brand: form.brand?.trim() || undefined })
    // add は重複を無視するので、件数が増えたかで判断する
    setMessage(
      useOwnedStore.getState().items.length > before
        ? `「${form.name.trim()}」を追加しました。`
        : '同じコスメが既に登録されています。'
    )
    setForm({ category: form.category, name: '' })
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      <header className="mb-8">
        <p className="text-xs tracking-editorial text-accent mb-2">YOUR COSMETICS</p>
        <h1 className="font-serif text-3xl text-ink leading-tight mb-3">手持ちのコスメ</h1>
        <p className="text-sm text-muted leading-relaxed">
          いま持っているコスメを登録すると、診断結果の各工程について
          「手持ちで代替できるか／買い足しが必要か」が分かります。
          判定は<strong className="text-ink font-medium">カテゴリ</strong>で行うので、
          製品名が違っても大丈夫です。
        </p>
      </header>

      {/* 追加フォーム */}
      <form onSubmit={handleSubmit} className="bg-ivory rounded-sm border border-line p-6 mb-8">
        <div className="space-y-4">
          <label className="block">
            <span className="text-xs tracking-editorial text-muted">
              カテゴリ<span className="text-accent ml-1">必須</span>
            </span>
            <select
              required
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              className="mt-1.5 w-full bg-cream border border-line rounded-sm px-4 py-3 text-ink outline-none focus:border-accent"
            >
              <option value="">選択してください</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="block">
              <span className="text-xs tracking-editorial text-muted">
                製品名<span className="text-accent ml-1">必須</span>
              </span>
              <input
                required
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="例: ハトムギ化粧水"
                className="mt-1.5 w-full bg-cream border border-line rounded-sm px-4 py-3 text-ink outline-none focus:border-accent"
              />
            </label>
            <label className="block">
              <span className="text-xs tracking-editorial text-muted">ブランド（任意）</span>
              <input
                value={form.brand ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, brand: e.target.value }))}
                placeholder="例: ナチュリエ"
                className="mt-1.5 w-full bg-cream border border-line rounded-sm px-4 py-3 text-ink outline-none focus:border-accent"
              />
            </label>
          </div>

          {/* 色物のときだけ色味を聞く（不要な入力を増やさない） */}
          {isColorSensitive(form.category) && (
            <label className="block">
              <span className="text-xs tracking-editorial text-muted">色味（任意）</span>
              <select
                value={form.tone ?? ''}
                onChange={(e) =>
                  setForm((f) => ({ ...f, tone: (e.target.value || undefined) as CosmeticTone }))
                }
                className="mt-1.5 w-full bg-cream border border-line rounded-sm px-4 py-3 text-ink outline-none focus:border-accent"
              >
                {TONES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
              <span className="block text-xs text-muted mt-1.5 leading-relaxed">
                分からない場合はそのままで構いません。その工程は「色味を確認」として表示されます。
              </span>
            </label>
          )}

          <button
            type="submit"
            className="w-full sm:w-auto px-6 py-3 bg-ink text-cream rounded-sm hover:bg-accent transition-colors text-sm"
          >
            追加する
          </button>
          {message && <p className="text-sm text-muted">{message}</p>}
        </div>
      </form>

      {/* 登録済み一覧 */}
      <div className="bg-ivory rounded-sm border border-line p-6">
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="font-serif text-xl text-ink">登録済み</h2>
          <p className="text-sm text-muted">{hydrated ? items.length : 0}件</p>
        </div>

        {!hydrated ? (
          <p className="text-sm text-muted">読み込み中…</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted leading-relaxed">
            まだ登録がありません。診断結果の各製品にある「持ってる?」を押しても登録できます。
          </p>
        ) : (
          <ul className="space-y-3">
            <AnimatePresence initial={false}>
              {items.map((item) => (
                <motion.li
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-start gap-3 pb-3 border-b border-line last:border-0 last:pb-0"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-ink">
                      <span className="text-xs text-muted mr-2">{item.category}</span>
                      {item.brand && <span className="font-medium mr-1">{item.brand}</span>}
                      {item.name}
                    </p>

                    {/* 色物は一覧からも色味を直せるようにする */}
                    {isColorSensitive(item.category) && (
                      <select
                        value={item.tone ?? ''}
                        onChange={(e) =>
                          setTone(item.id, (e.target.value || undefined) as CosmeticTone)
                        }
                        className="mt-1.5 text-xs bg-cream border border-line rounded-sm px-2 py-1 text-muted outline-none focus:border-accent"
                      >
                        {TONES.map((t) => (
                          <option key={t.value} value={t.value}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  <button
                    onClick={() => remove(item.id)}
                    aria-label={`${item.name} を削除`}
                    className="shrink-0 text-xs text-muted hover:text-accent"
                  >
                    削除
                  </button>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </div>

      <div className="mt-8 flex flex-wrap gap-4">
        <Link href="/diagnosis" className="text-sm text-accent hover:text-ink">
          診断結果を見る →
        </Link>
        <Link href="/" className="text-sm text-muted hover:text-ink">
          トップへ
        </Link>
      </div>

      <p className="text-xs text-muted mt-8 leading-relaxed">
        ※ 登録した内容はこの端末のブラウザにのみ保存されます。
      </p>
    </div>
  )
}
