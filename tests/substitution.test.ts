import { describe, expect, it } from 'vitest'
import {
  acceptableCategories,
  allProductCategories,
  isColorSensitive,
  judgeAll,
  judgeStep,
  shoppingCategories,
  summarize,
} from '../lib/substitution'
import { buildRecommendation } from '../lib/recommend'
import type { DiagnosisResult, OwnedCosmetic, RecommendedStep } from '../lib/types'

// 手持ちコスメによる代替判定のテスト。
// 「持っていないのに使えると言い切らない」ことが一番大事なので、
// 色味が違う・不明なケースを重点的に固定している。

function owned(category: string, name: string, extra: Partial<OwnedCosmetic> = {}): OwnedCosmetic {
  return { id: `o-${name}`, category, name, created_at: '2026-07-27T00:00:00Z', ...extra }
}

function step(id: string, categories: string[]): RecommendedStep {
  return {
    id,
    step_order: 10,
    description: id,
    products: categories.map((category, i) => ({
      category,
      name: `${category}-${i}`,
      brand: 'テスト',
    })),
  }
}

describe('カテゴリの代替関係', () => {
  it('自分自身は必ず受け入れる', () => {
    expect(acceptableCategories('化粧水')).toContain('化粧水')
  })

  it('BB は化粧下地の代わりになる', () => {
    expect(acceptableCategories('化粧下地')).toContain('BB・下地')
  })

  it('BB はファンデーションも兼ねる', () => {
    expect(acceptableCategories('ファンデーション')).toContain('BB・下地')
  })

  it('乳液と保湿クリームは相互に代替できる', () => {
    expect(acceptableCategories('乳液')).toContain('保湿クリーム')
    expect(acceptableCategories('保湿クリーム')).toContain('乳液')
  })

  it('関係の無いカテゴリは代替にしない', () => {
    expect(acceptableCategories('日焼け止め')).toEqual(['日焼け止め'])
    expect(acceptableCategories('リップ')).toEqual(['リップ'])
  })

  it('色物のカテゴリを判別できる', () => {
    expect(isColorSensitive('リップ')).toBe(true)
    expect(isColorSensitive('チーク')).toBe(true)
    expect(isColorSensitive('化粧水')).toBe(false)
    expect(isColorSensitive('日焼け止め')).toBe(false)
  })
})

describe('allProductCategories', () => {
  it('手法マスターに出てくるカテゴリを重複なく返す', () => {
    const cats = allProductCategories()
    expect(cats).toContain('化粧水')
    expect(cats).toContain('リップ')
    expect(cats).toContain('BB・下地')
    // 補正ステップの製品カテゴリも含む
    expect(cats).toContain('保湿クリーム')
    expect(new Set(cats).size).toBe(cats.length)
  })
})

describe('judgeStep — 色に影響されないカテゴリ', () => {
  const lotionStep = step('t-lotion', ['化粧水'])

  it('同じカテゴリを持っていれば「まかなえる」', () => {
    const r = judgeStep(lotionStep, [owned('化粧水', 'ハトムギ化粧水')], 'autumn')
    expect(r.status).toBe('have')
    expect(r.matched?.name).toBe('ハトムギ化粧水')
  })

  it('持っていなければ「買い足し」', () => {
    const r = judgeStep(lotionStep, [owned('リップ', 'どこかのリップ')], 'autumn')
    expect(r.status).toBe('need')
    expect(r.matched).toBeUndefined()
  })

  it('代替カテゴリで満たせる場合は理由を添える', () => {
    const r = judgeStep(step('t-primer', ['化粧下地']), [owned('BB・下地', 'BBクリーム')], 'autumn')
    expect(r.status).toBe('have')
    expect(r.note).toContain('BB・下地')
    expect(r.note).toContain('代替')
  })

  it('色物でないカテゴリは、色味が未登録でも「まかなえる」', () => {
    const r = judgeStep(lotionStep, [owned('化粧水', '化粧水', { tone: undefined })], 'autumn')
    expect(r.status).toBe('have')
  })
})

describe('judgeStep — 色物カテゴリ', () => {
  const lipStep = step('t-lip-autumn', ['リップ'])

  it('パーソナルカラーと一致すれば「まかなえる」', () => {
    const r = judgeStep(lipStep, [owned('リップ', 'テラコッタ', { tone: 'autumn' })], 'autumn')
    expect(r.status).toBe('have')
  })

  it('ニュートラルな色味なら「まかなえる」', () => {
    const r = judgeStep(lipStep, [owned('リップ', 'ベージュ', { tone: 'neutral' })], 'autumn')
    expect(r.status).toBe('have')
  })

  it('色味が違えば断定せず「要確認」にする', () => {
    const r = judgeStep(lipStep, [owned('リップ', 'ブルベ向け', { tone: 'winter' })], 'autumn')
    expect(r.status).toBe('check-color')
    expect(r.matched?.name).toBe('ブルベ向け')
    expect(r.note).toContain('ウィンター')
  })

  it('色味が未登録なら「要確認」にする（勝手に使えると言わない）', () => {
    const r = judgeStep(lipStep, [owned('リップ', '名前だけ登録')], 'autumn')
    expect(r.status).toBe('check-color')
    expect(r.note).toContain('未登録')
  })

  it('合う色を1つでも持っていれば、合わない色より優先する', () => {
    const r = judgeStep(
      lipStep,
      [owned('リップ', '合わない', { tone: 'winter' }), owned('リップ', '合う', { tone: 'autumn' })],
      'autumn'
    )
    expect(r.status).toBe('have')
    expect(r.matched?.name).toBe('合う')
  })
})

describe('judgeStep — 製品を使わない工程', () => {
  it('products が無ければ no-product', () => {
    const r = judgeStep({ id: 't-x', step_order: 1, description: 'x' }, [], 'autumn')
    expect(r.status).toBe('no-product')
    expect(r.requiredCategories).toEqual([])
  })

  it('products が空配列でも no-product', () => {
    const r = judgeStep({ id: 't-x', step_order: 1, description: 'x', products: [] }, [], 'autumn')
    expect(r.status).toBe('no-product')
  })
})

describe('judgeStep — 製品が複数（＝選択肢）の工程', () => {
  it('どれか1つのカテゴリを満たせば代替できる', () => {
    // products は「一例」の列挙なので、組み合わせて使うものではない
    const s = step('t-multi', ['ファンデーション', 'BB・下地'])
    const r = judgeStep(s, [owned('BB・下地', 'BB')], 'autumn')
    expect(r.status).toBe('have')
    expect(r.requiredCategories).toEqual(['ファンデーション', 'BB・下地'])
  })

  it('同じカテゴリが重複していても要求カテゴリは1つにまとめる', () => {
    const s = step('t-dup', ['リップ', 'リップ'])
    expect(judgeStep(s, [], 'autumn').requiredCategories).toEqual(['リップ'])
  })
})

describe('summarize / shoppingCategories', () => {
  const steps = [
    step('a', ['化粧水']),
    step('b', ['リップ']),
    step('c', ['日焼け止め']),
    { id: 'd', step_order: 4, description: '製品不要' } as RecommendedStep,
  ]
  const items = [owned('化粧水', '化粧水'), owned('リップ', 'リップ', { tone: 'winter' })]

  it('件数と充足率を集計する', () => {
    const s = summarize(judgeAll(steps, items, 'autumn'))
    expect(s).toEqual({
      have: 1, // 化粧水
      checkColor: 1, // リップ（色違い）
      need: 1, // 日焼け止め
      totalWithProduct: 3, // 製品不要の工程は分母に入れない
      coverage: 33, // 1/3
    })
  })

  it('要確認は「まかなえている」に数えない', () => {
    const s = summarize(judgeAll([step('b', ['リップ'])], items, 'autumn'))
    expect(s.have).toBe(0)
    expect(s.coverage).toBe(0)
  })

  it('手持ちゼロなら充足率0%', () => {
    const s = summarize(judgeAll(steps, [], 'autumn'))
    expect(s.have).toBe(0)
    expect(s.need).toBe(3)
    expect(s.coverage).toBe(0)
  })

  it('製品が必要な工程が無ければ 0%（0除算しない）', () => {
    const s = summarize(judgeAll([steps[3]], [], 'autumn'))
    expect(s.totalWithProduct).toBe(0)
    expect(s.coverage).toBe(0)
  })

  it('買い足し候補は重複を除いて返す', () => {
    const subs = judgeAll([step('a', ['日焼け止め']), step('b', ['日焼け止め'])], [], 'autumn')
    expect(shoppingCategories(subs)).toEqual(['日焼け止め'])
  })
})

describe('実際のレコメンド結果に対して', () => {
  const result: DiagnosisResult = {
    gender: 'women',
    skin: 'dry',
    color: 'autumn',
    style: 'clean',
  }

  it('手持ちゼロなら、製品が必要な全工程が買い足しになる', () => {
    const { steps } = buildRecommendation(result)
    const s = summarize(judgeAll(steps, [], result.color))
    expect(s.have).toBe(0)
    expect(s.need).toBe(s.totalWithProduct)
    expect(s.totalWithProduct).toBeGreaterThan(0)
  })

  it('基礎化粧品を持っているだけでも充足率が上がる', () => {
    const { steps } = buildRecommendation(result)
    const base = [
      owned('洗顔料', '洗顔'),
      owned('化粧水', '化粧水'),
      owned('乳液', '乳液'),
      owned('日焼け止め', '日焼け止め'),
    ]
    const s = summarize(judgeAll(steps, base, result.color))
    expect(s.have).toBe(4)
    expect(s.coverage).toBeGreaterThan(0)
  })

  it('保湿クリームだけでも、乳液の工程をまかなえる', () => {
    const { steps } = buildRecommendation(result)
    const subs = judgeAll(steps, [owned('保湿クリーム', 'クリーム')], result.color)
    const emulsion = subs.find((s) => s.stepId === 't-emulsion')
    expect(emulsion?.status).toBe('have')
    expect(emulsion?.note).toContain('代替')
  })

  it('全工程が have / check-color / need / no-product のいずれかに分類される', () => {
    const { steps } = buildRecommendation(result)
    const subs = judgeAll(steps, [owned('リップ', 'リップ')], result.color)
    expect(subs).toHaveLength(steps.length)
    for (const s of subs) {
      expect(['have', 'check-color', 'need', 'no-product']).toContain(s.status)
    }
  })
})
