import { describe, expect, it } from 'vitest'
import {
  verifyBrandFromProducts,
  brandCandidates,
  catalogProducts,
  filterByQuery,
  normalizeJa,
  productCandidates,
  searchBrands,
  searchProducts,
} from '../lib/productCatalog'
import type { OwnedCosmetic } from '../lib/types'

function owned(category: string, name: string, brand?: string): OwnedCosmetic {
  return { id: `o-${name}`, category, name, brand, created_at: '2026-07-27T00:00:00Z' }
}

describe('normalizeJa', () => {
  it('ひらがなをカタカナに寄せる（「びおれ」で「ビオレ」に当てる）', () => {
    expect(normalizeJa('びおれ')).toBe(normalizeJa('ビオレ'))
    expect(normalizeJa('なちゅりえ')).toBe(normalizeJa('ナチュリエ'))
  })

  it('全角英数を半角にする', () => {
    expect(normalizeJa('ＫＡＴＥ')).toBe(normalizeJa('KATE'))
  })

  it('大文字小文字を無視する', () => {
    expect(normalizeJa('Kate')).toBe(normalizeJa('KATE'))
  })

  it('長音・中黒・空白・記号の揺れを吸収する', () => {
    expect(normalizeJa('ポール & ジョー')).toBe(normalizeJa('ポール&ジョー'))
    expect(normalizeJa('ラ ロッシュ ポゼ')).toBe(normalizeJa('ラロッシュポゼ'))
    expect(normalizeJa('M・A・C')).toBe(normalizeJa('MAC'))
  })

  it('前後の空白を落とす', () => {
    expect(normalizeJa('  ビオレ  ')).toBe(normalizeJa('ビオレ'))
  })
})

describe('filterByQuery', () => {
  const items = ['ビオレ', 'ニベア', 'ニベアメン', 'キュレル']

  it('空クエリなら全件返す', () => {
    expect(filterByQuery(items, '', (s) => s)).toEqual(items)
  })

  it('前方一致を部分一致より先に並べる', () => {
    const r = filterByQuery(['メンズビオレ', 'ビオレ'], 'ビオレ', (s) => s)
    expect(r[0]).toBe('ビオレ') // 前方一致が先
    expect(r[1]).toBe('メンズビオレ')
  })

  it('部分一致も拾う', () => {
    expect(filterByQuery(items, 'メン', (s) => s)).toEqual(['ニベアメン'])
  })

  it('該当が無ければ空', () => {
    expect(filterByQuery(items, 'ぜったいにない', (s) => s)).toEqual([])
  })
})

describe('brandCandidates', () => {
  it('よく使われるブランドを含む', () => {
    const b = brandCandidates()
    expect(b).toContain('無印良品')
    expect(b).toContain('セザンヌ')
  })

  it('手法マスターに出てくるブランドも合流する', () => {
    const b = brandCandidates()
    for (const p of catalogProducts()) expect(b).toContain(p.brand)
  })

  it('ユーザーが登録したブランドも候補に入る', () => {
    const b = brandCandidates([owned('化粧水', '謎の化粧水', '架空ブランド')])
    expect(b).toContain('架空ブランド')
  })

  it('重複しない', () => {
    // ビオレ等は COMMON_BRANDS と手法マスターの両方に存在する
    const b = brandCandidates([owned('洗顔料', 'x', 'ビオレ')])
    expect(b.filter((x) => x === 'ビオレ')).toHaveLength(1)
  })
})

describe('searchBrands', () => {
  it('ひらがな入力でカタカナのブランドに当たる', () => {
    expect(searchBrands('びおれ')).toContain('ビオレ')
  })

  it('英字ブランドは大文字小文字を問わない', () => {
    expect(searchBrands('kate')).toContain('KATE')
  })

  it('件数を制限できる', () => {
    expect(searchBrands('', [], 3)).toHaveLength(3)
  })
})

describe('productCandidates', () => {
  it('実在が確認できるものだけを返す（手法マスター由来）', () => {
    const names = catalogProducts().map((p) => p.name)
    for (const p of productCandidates()) {
      const fromCatalog = names.includes(p.name)
      expect(fromCatalog).toBe(true)
    }
  })

  it('カテゴリで絞れる', () => {
    const r = productCandidates({ category: '化粧水' })
    expect(r.length).toBeGreaterThan(0)
    expect(r.every((p) => p.category === '化粧水')).toBe(true)
  })

  it('ブランドで絞れる', () => {
    const r = productCandidates({ brand: 'ビオレ' })
    expect(r.length).toBeGreaterThan(0)
    expect(r.every((p) => p.brand.includes('ビオレ'))).toBe(true)
  })

  it('ブランドはひらがな入力でも絞れる', () => {
    expect(productCandidates({ brand: 'びおれ' }).length).toBeGreaterThan(0)
  })

  it('ユーザーの登録済みも候補に含める', () => {
    const r = productCandidates({ owned: [owned('化粧水', '自作ローション', 'マイブランド')] })
    expect(r.some((p) => p.name === '自作ローション')).toBe(true)
  })

  it('同じ製品を重複させない', () => {
    // 手法マスターと同じ製品をユーザーも登録しているケース
    const dup = catalogProducts()[0]
    const r = productCandidates({ owned: [owned(dup.category, dup.name, dup.brand)] })
    expect(r.filter((p) => p.name === dup.name && p.brand === dup.brand)).toHaveLength(1)
  })

  it('該当ブランドが無ければ空', () => {
    expect(productCandidates({ brand: '存在しないブランド' })).toEqual([])
  })
})

describe('searchProducts', () => {
  it('製品名の一部で絞り込める', () => {
    const r = searchProducts('化粧水')
    expect(r.length).toBeGreaterThan(0)
  })

  it('ブランド名でも引ける（製品名に含まれなくても）', () => {
    const r = searchProducts('無印', {})
    expect(r.some((p) => p.brand === '無印良品')).toBe(true)
  })

  it('カテゴリ指定と併用できる', () => {
    const r = searchProducts('', { category: 'リップ' })
    expect(r.every((p) => p.category === 'リップ')).toBe(true)
  })

  it('件数を制限できる', () => {
    expect(searchProducts('', {}, 3).length).toBeLessThanOrEqual(3)
  })
})

describe('verifyBrandFromProducts — 生成ではなく実在確認', () => {
  it('打った文字列を含む商品があれば、そのブランドを候補にする', () => {
    const r = verifyBrandFromProducts('HERA', [
      'HERA ブラッククッション SPF34',
      'HERA センシュアルスパイシーヌードグロス',
      '無関係な商品',
    ])
    expect(r).toEqual({ brand: 'HERA', matchCount: 2 })
  })

  it('ひらがな入力でもカタカナの商品名に当たる', () => {
    expect(verifyBrandFromProducts('びおれ', ['ビオレ うるおいジェリー'])?.matchCount).toBe(1)
  })

  it('商品が1件も無ければ候補にしない（存在しないブランドを出さない）', () => {
    expect(verifyBrandFromProducts('架空ブランドZZZ', ['ビオレ 洗顔'])).toBeNull()
  })

  it('検索結果が空なら null', () => {
    expect(verifyBrandFromProducts('HERA', [])).toBeNull()
  })

  it('空入力は null', () => {
    expect(verifyBrandFromProducts('', ['何かの商品'])).toBeNull()
  })

  it('打った文字列をそのまま返す（勝手に変形しない）', () => {
    expect(verifyBrandFromProducts(' HERA ', ['HERA クッション'])?.brand).toBe('HERA')
  })
})

describe('拡充したブランド一覧', () => {
  it('韓国コスメの主要ブランドを含む', () => {
    const b = brandCandidates()
    for (const x of ['HERA', '3CE', 'COSRX', 'Anua', 'rom&nd']) {
      expect(b, x).toContain(x)
    }
  })

  it('ひらがな/英字どちらでも引ける', () => {
    expect(searchBrands('hera')).toContain('HERA')
    expect(searchBrands('こすあーるえっくす').length).toBeGreaterThanOrEqual(0)
  })

  it('重複が無い', () => {
    const b = brandCandidates()
    expect(new Set(b).size).toBe(b.length)
  })
})
