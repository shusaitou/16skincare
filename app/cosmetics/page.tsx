'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { AnimatePresence, motion } from 'framer-motion'
import { useOwnedStore, ownedLabel, type NewOwnedCosmetic } from '../../lib/ownedStore'
import { allProductCategories, isColorSensitive } from '../../lib/substitution'
import { searchBrands, searchProducts, verifyBrandFromProducts } from '../../lib/productCatalog'
import { colorLabel } from '../../lib/recommend'
import type { LookedUpProduct } from '../../lib/productLookup'
import AutocompleteInput from '../../components/AutocompleteInput'
import CategoryPicker from '../../components/CategoryPicker'
import BarcodeScanner from '../../components/BarcodeScanner'
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
//
// 登録方法を3段階で用意している。手前ほど手間が少ない。
//   1. カテゴリをタップ  … 代替判定はカテゴリしか見ないので、これだけで成立する
//   2. バーコード       … 実物を撮るだけ。製品名まで自動で入る
//   3. 手入力（予測変換つき）… 上記で拾えないものだけ
export default function CosmeticsPage() {
  const { items, hydrated, hydrate, add, remove, setTone } = useOwnedStore()
  const categories = allProductCategories()

  const [form, setForm] = useState<NewOwnedCosmetic>({ category: '', name: '' })
  const [message, setMessage] = useState<string | null>(null)
  const [showScanner, setShowScanner] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [lookup, setLookup] = useState<{ loading: boolean; error?: string }>({ loading: false })
  // 外部APIの候補（楽天）。アプリ内カタログの候補と混ぜて出す。
  const [remoteSuggestions, setRemoteSuggestions] = useState<LookedUpProduct[]>([])
  // 商品検索の設定状態。キーが拒否されているのに「候補ゼロ」としか見えないと
  // 原因が分からないので、画面に出す。
  const [keyStatus, setKeyStatus] = useState<
    'missing' | 'invalid' | 'unavailable' | 'ok' | null
  >(null)

  useEffect(() => {
    hydrate()
  }, [hydrate])

  // --- 入力補完 ---
  // 一覧に無いブランドを打ったとき、商品検索でその名前の商品が実在するか確認する。
  // 候補を「生成」するのではなく「検証」するので、存在しないブランドは出ない。
  const [brandCheck, setBrandCheck] = useState<{ brand: string; matchCount: number } | null>(null)

  const brandSuggestions = useMemo(() => {
    const local = searchBrands(form.brand ?? '', items).map((b) => ({ value: b }))
    if (local.length > 0 || !brandCheck) return local
    // 一覧に無いが実在が確認できた場合だけ、件数を添えて候補に出す
    return [{ value: brandCheck.brand, hint: `商品${brandCheck.matchCount}件を確認` }]
  }, [form.brand, items, brandCheck])
  const localMatches = useMemo(
    () =>
      searchProducts(form.name ?? '', {
        brand: form.brand,
        category: form.category || undefined,
        owned: items,
      }),
    [form.name, form.brand, form.category, items]
  )
  const productSuggestions = useMemo(() => {
    const local = localMatches.map((p) => ({ value: p.name, hint: p.brand || p.category }))
    const seen = new Set(local.map((l) => l.value))
    const remote = remoteSuggestions
      .filter((p) => !seen.has(p.name))
      .map((p) => ({ value: p.name, hint: p.category ?? '楽天' }))
    return [...local, ...remote].slice(0, 12)
  }, [localMatches, remoteSuggestions])

  // 製品名の入力に応じて楽天の候補を取りに行く。
  // 楽天は上限値を公開していないが 429 があり、制限はアプリID単位＝全ユーザー共有。
  // 打鍵ごとに叩くと1人の連打で全員が止まるので、入力が落ち着いてから1回だけ投げる。
  useEffect(() => {
    const q = (form.name ?? '').trim()
    if (q.length < 2) {
      setRemoteSuggestions([])
      return
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/product?q=${encodeURIComponent(q)}`)
        if (!res.ok) return
        const data = (await res.json()) as {
          products: LookedUpProduct[]
          keyStatus?: 'missing' | 'invalid' | 'unavailable' | 'ok'
        }
        setRemoteSuggestions(data.products ?? [])
        setKeyStatus(data.keyStatus ?? null)
      } catch {
        // 外部APIが落ちていてもアプリ内候補だけで動く
        setRemoteSuggestions([])
      }
    }, 800)
    return () => clearTimeout(timer)
  }, [form.name])

  // ブランドが一覧に無いときだけ、商品検索で実在を確認する。
  // 一覧で足りているなら外部APIを叩かない（レート制限を無駄に使わない）。
  useEffect(() => {
    const q = (form.brand ?? '').trim()
    if (q.length < 2 || searchBrands(q, items).length > 0) {
      setBrandCheck(null)
      return
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/product?q=${encodeURIComponent(q)}`)
        if (!res.ok) return
        const data = (await res.json()) as { products: LookedUpProduct[] }
        setBrandCheck(verifyBrandFromProducts(q, (data.products ?? []).map((p) => p.name)))
      } catch {
        setBrandCheck(null)
      }
    }, 800)
    return () => clearTimeout(timer)
  }, [form.brand, items])

  // --- バーコード ---
  const handleDetect = useCallback(
    async (jan: string) => {
      setShowScanner(false)
      setLookup({ loading: true })
      setMessage(null)
      try {
        const res = await fetch(`/api/product?jan=${encodeURIComponent(jan)}`)
        const data = (await res.json()) as { products: LookedUpProduct[]; configured: boolean }
        const hit = data.products?.[0]

        if (!hit) {
          // 商品が見つからなくても、JAN は控えてカテゴリだけ選んでもらう
          setForm({ category: '', name: '', jan })
          setShowForm(true)
          setLookup({ loading: false })
          setMessage(
            data.configured
              ? 'この商品はデータベースに登録がありませんでした。カテゴリだけ選んで登録できます。'
              : 'この商品は見つかりませんでした。楽天APIを設定すると検索できる商品が増えます。カテゴリだけ選んで登録できます。'
          )
          return
        }

        setForm({
          category: hit.category ?? '',
          name: hit.name,
          brand: hit.brand,
          jan: hit.jan ?? jan,
          // 全成分が取れた場合は保存しておき、注目成分の照合に使う
          ingredients: hit.ingredients,
        })
        setShowForm(true)
        setLookup({ loading: false })
        const ing = hit.ingredients?.length ? `全成分${hit.ingredients.length}件も取得しました。` : ''
        setMessage(
          (hit.category
            ? `「${hit.name}」が見つかりました。内容を確認して追加してください。`
            : `「${hit.name}」が見つかりました。カテゴリだけ選んでください。`) + ing
        )
      } catch {
        setLookup({ loading: false, error: '商品の照会に失敗しました。手入力で追加してください。' })
        setForm({ category: '', name: '', jan })
        setShowForm(true)
      }
    },
    []
  )

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.category) return
    const before = items.length
    add({ ...form, name: form.name?.trim() || undefined, brand: form.brand?.trim() || undefined })
    setMessage(
      useOwnedStore.getState().items.length > before
        ? `「${form.name?.trim() || form.category}」を追加しました。`
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
          持っているものを登録すると、診断結果の各工程が「手持ちで代替できるか／買い足しが必要か」に
          分かれて表示されます。判定に使うのは
          <strong className="text-ink font-medium">カテゴリだけ</strong>なので、
          製品名は分かる範囲で構いません。
        </p>
      </header>

      {/* 1. カテゴリをタップするだけの登録 */}
      <section className="bg-ivory rounded-sm border border-line p-6 mb-6">
        <h2 className="font-serif text-xl text-ink mb-1">持っているものをタップ</h2>
        <p className="text-sm text-muted mb-5 leading-relaxed">
          これだけで判定できます。製品名やブランドは後から足せます。
        </p>
        <CategoryPicker />
      </section>

      {/* 2. バーコード */}
      <section className="mb-6">
        {showScanner ? (
          <BarcodeScanner onDetect={handleDetect} onClose={() => setShowScanner(false)} />
        ) : (
          <button
            type="button"
            onClick={() => setShowScanner(true)}
            className="w-full bg-ivory border border-line rounded-sm p-5 text-left hover:border-accent transition-colors"
          >
            <span className="block font-serif text-lg text-ink">バーコードで登録</span>
            <span className="block text-sm text-muted mt-1">
              商品の裏のバーコードを読み取って、製品名まで自動で入れます
            </span>
          </button>
        )}
        {lookup.loading && <p className="text-sm text-muted mt-3">商品を照会しています…</p>}
        {lookup.error && (
          <p className="text-sm text-ink bg-accent-soft border border-accent/30 rounded-sm p-3 mt-3">
            {lookup.error}
          </p>
        )}
      </section>

      {/* 3. 手入力（普段は畳んでおく） */}
      <section className="mb-8">
        {!showForm ? (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="text-sm text-accent hover:text-ink"
          >
            製品名やブランドまで細かく登録する →
          </button>
        ) : (
          <form onSubmit={handleSubmit} className="bg-ivory rounded-sm border border-line p-6">
            <div className="flex items-start justify-between gap-3 mb-4">
              <h2 className="font-serif text-xl text-ink">詳しく登録</h2>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="text-xs text-muted hover:text-accent"
              >
                閉じる
              </button>
            </div>

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

              {/* ブランドを先に置く。決めておくと製品名の候補が絞られるため */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <AutocompleteInput
                  label="ブランド（任意）"
                  value={form.brand ?? ''}
                  onChange={(brand) => setForm((f) => ({ ...f, brand }))}
                  suggestions={brandSuggestions}
                  placeholder="例: ナチュリエ（「なちゅりえ」でも可）"
                  help="一覧に無いブランドは、商品検索で実在を確認できたときだけ候補に出ます。確認できなくてもそのまま入力できます。"
                />
                <AutocompleteInput
                  label="製品名（任意）"
                  value={form.name ?? ''}
                  onChange={(name) => setForm((f) => ({ ...f, name }))}
                  suggestions={productSuggestions}
                  placeholder="例: ハトムギ化粧水"
                  onPick={(s) =>
                    setForm((f) => {
                      if (f.brand) return f
                      const picked = localMatches.find((p) => p.name === s.value)
                      return picked?.brand ? { ...f, brand: picked.brand } : f
                    })
                  }
                  help="2文字以上で商品検索の候補も出ます。空のままでも登録できます。"
                />
              </div>

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

              {form.jan && (
                <p className="text-xs text-muted">バーコード: {form.jan}</p>
              )}

              {keyStatus === 'invalid' && (
                <p className="text-sm text-ink bg-accent-soft border border-accent/30 rounded-sm p-3 leading-relaxed">
                  商品検索の APIキーが楽天に拒否されています。候補はアプリ内の一覧だけになります。
                  <br />
                  <span className="text-muted">
                    webservice.rakuten.co.jp/app/list の applicationId を
                    .env.local の RAKUTEN_APP_ID に設定して、開発サーバーを再起動してください。
                  </span>
                </p>
              )}
              {keyStatus === 'unavailable' && (
                <p className="text-xs text-muted leading-relaxed">
                  商品検索が一時的に利用できません（楽天側のエラー）。
                  候補はアプリ内の一覧だけになります。しばらくすると復旧します。
                </p>
              )}
              {keyStatus === 'missing' && (
                <p className="text-xs text-muted leading-relaxed">
                  商品検索は未設定です（候補はアプリ内の一覧のみ）。RAKUTEN_APP_ID を設定すると候補が増えます。
                </p>
              )}

              <button
                type="submit"
                className="w-full sm:w-auto px-6 py-3 bg-ink text-cream rounded-sm hover:bg-accent transition-colors text-sm"
              >
                追加する
              </button>
            </div>
          </form>
        )}
        {message && <p className="text-sm text-muted mt-3 leading-relaxed">{message}</p>}
      </section>

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
            まだ登録がありません。上のカテゴリをタップするのが一番早い方法です。
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
                      {item.name ? (
                        item.name
                      ) : (
                        <span className="text-muted">（製品名なし）</span>
                      )}
                    </p>

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
                    aria-label={`${ownedLabel(item)} を削除`}
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
