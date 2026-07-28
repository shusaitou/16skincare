import { describe, expect, it } from 'vitest'
import {
  checkIngredient,
  checkIngredients,
  parseIngredientList,
  summarizeIngredients,
} from '../lib/ingredients'
import { TECHNIQUES, CORRECTION_STEP } from '../lib/techniques'

// 実データ: Open Beauty Facts から取得した「肌ラボ 極潤プレミアム」(JAN 4987241167012) の全成分表示
const GOKUJUN =
  '水、BG、ペンチレングリコール、PPG-10メチルグルコース、DPG、ジグリセリン、ヒアルロン酸Na*、' +
  ' 加水分解ヒアルロン酸*(ナノ化ヒアルロン酸)、アセチルヒアルロン酸Na*(スーパーヒアルロン酸)、' +
  'ヒアルロン酸ヒドロキシプロピルトリモニウム*(肌吸着型ヒアルロン酸)、' +
  'ヒアルロン酸クロスポリマーNa*(3Dヒアルロン酸)、乳酸球菌／ヒアルロン酸発酵液*(乳酸発酵ヒアルロン酸)、' +
  'グリセリン、カルボマー、水酸化K、メチルパラベン、フェノキシエタノール'

describe('parseIngredientList', () => {
  it('日本語の全成分表示を成分ごとに分割する', () => {
    const list = parseIngredientList(GOKUJUN)
    expect(list).toContain('水')
    expect(list).toContain('BG')
    expect(list).toContain('グリセリン')
  })

  it('括弧の補足と * を落とす', () => {
    const list = parseIngredientList('ヒアルロン酸Na*(スーパーヒアルロン酸)、水')
    expect(list).toContain('ヒアルロン酸Na')
    expect(list).not.toContain('ヒアルロン酸Na*(スーパーヒアルロン酸)')
  })

  it('区切り文字が混在しても分割できる', () => {
    expect(parseIngredientList('水,BG、グリセリン・DPG')).toEqual(['水', 'BG', 'グリセリン', 'DPG'])
  })

  it('空文字や空要素で壊れない', () => {
    expect(parseIngredientList('')).toEqual([])
    expect(parseIngredientList('水、、、BG')).toEqual(['水', 'BG'])
  })
})

describe('checkIngredient — 成分ファミリーでの照合', () => {
  const list = parseIngredientList(GOKUJUN)

  it('総称「ヒアルロン酸」が個別名にヒットする', () => {
    const r = checkIngredient('ヒアルロン酸', list)
    expect(r.verdict).toBe('present')
    // ヒアルロン酸Na / 加水分解ヒアルロン酸 などを拾えている
    expect(r.found!.length).toBeGreaterThan(1)
    expect(r.found).toContain('ヒアルロン酸Na')
  })

  it('「保湿ヒアルロン酸」のような表記ゆれでもヒットする', () => {
    expect(checkIngredient('保湿ヒアルロン酸', list).verdict).toBe('present')
  })

  it('入っていない成分は absent', () => {
    expect(checkIngredient('セラミド', list).verdict).toBe('absent')
    expect(checkIngredient('サリチル酸（BHA）', list).verdict).toBe('absent')
  })

  it('グリセリンを検出する', () => {
    expect(checkIngredient('グリセリン', list).verdict).toBe('present')
  })

  it('成分データが無ければ unknown（absent と区別する）', () => {
    expect(checkIngredient('ヒアルロン酸', []).verdict).toBe('unknown')
  })

  it('機能の呼び名は判定対象外にする（誤った×を出さない）', () => {
    for (const f of ['トーンアップ成分', 'パール／光拡散パウダー', '皮脂吸着パウダー']) {
      expect(checkIngredient(f, list).verdict, f).toBe('not-checkable')
    }
  })

  it('スクワラン／ワセリンは油性保湿剤のどれかで満たす', () => {
    const oil = parseIngredientList('水、ワセリン、BG')
    expect(checkIngredient('ワセリン／スクワラン', oil).verdict).toBe('present')
    expect(checkIngredient('スクワラン', parseIngredientList('水、スクワラン')).verdict).toBe('present')
  })

  it('UVカット成分を代表的な紫外線防御剤で判定する', () => {
    const uv = parseIngredientList('水、酸化チタン、酸化亜鉛、BG')
    expect(checkIngredient('UVカット成分（SPF/PA）', uv).verdict).toBe('present')
    expect(checkIngredient('UVカット成分（SPF/PA）', parseIngredientList('水、BG')).verdict).toBe('absent')
  })

  it('アミノ酸系洗浄成分を代表的な界面活性剤で判定する', () => {
    const wash = parseIngredientList('水、ココイルグルタミン酸TEA、グリセリン')
    expect(checkIngredient('アミノ酸系洗浄成分', wash).verdict).toBe('present')
    // 高級アルコール系だけなら見当たらない
    expect(checkIngredient('アミノ酸系洗浄成分', parseIngredientList('水、ラウレス硫酸Na')).verdict).toBe('absent')
  })

  it('グリチルリチン酸は誘導体でも拾う', () => {
    expect(checkIngredient('グリチルリチン酸2K（抗炎症）', parseIngredientList('水、グリチルリチン酸2K')).verdict).toBe('present')
    expect(checkIngredient('グリチルリチン酸2K（抗炎症）', parseIngredientList('水、グリチルレチン酸ステアリル')).verdict).toBe('present')
  })

  it('ハトムギは別名でも拾う', () => {
    expect(checkIngredient('ハトムギエキス', parseIngredientList('水、ヨクイニンエキス')).verdict).toBe('present')
  })
})

describe('checkIngredients / summarizeIngredients', () => {
  const list = parseIngredientList(GOKUJUN)

  it('手順の注目成分すべてを判定する', () => {
    const checks = checkIngredients(['ヒアルロン酸', 'グリセリン', 'セラミド'], list)
    expect(checks.map((c) => c.verdict)).toEqual(['present', 'present', 'absent'])
  })

  it('判定できたものだけを分母にする', () => {
    const checks = checkIngredients(['ヒアルロン酸', 'セラミド', 'トーンアップ成分'], list)
    const s = summarizeIngredients(checks)
    expect(s).toEqual({ present: 1, absent: 1, checked: 2, hasData: true })
  })

  it('成分データが無ければ hasData=false（成分の話を出さない）', () => {
    const s = summarizeIngredients(checkIngredients(['ヒアルロン酸', 'セラミド'], []))
    expect(s.hasData).toBe(false)
    expect(s.checked).toBe(0)
  })
})

describe('手順マスターの注目成分が判定可能か', () => {
  it('全ての注目成分が unknown 以外の結論を出せる（データがある前提で）', () => {
    const all = new Set<string>()
    for (const t of TECHNIQUES) for (const i of t.ingredients ?? []) all.add(i)
    for (const i of CORRECTION_STEP.ingredients ?? []) all.add(i)

    // 何かしらの成分リストがあれば、present / absent / not-checkable のいずれかになる
    const dummy = parseIngredientList('水、BG')
    for (const req of all) {
      const v = checkIngredient(req, dummy).verdict
      expect(v, `${req} が unknown のまま`).not.toBe('unknown')
    }
  })
})

describe('代替判定への組み込み（実データ）', () => {
  it('手持ちの全成分から、手順の注目成分の有無を判定する', async () => {
    const { judgeStep } = await import('../lib/substitution')
    const { parseIngredientList } = await import('../lib/ingredients')

    // 化粧水の工程は「ヒアルロン酸 / グリセリン / ハトムギエキス」を挙げている
    const lotionStep = TECHNIQUES.find((t) => t.id === 't-lotion')!
    const owned = {
      id: 'o1',
      category: '化粧水',
      name: '肌ラボ 極潤プレミアム',
      jan: '4987241167012',
      ingredients: parseIngredientList(GOKUJUN),
      created_at: '2026-07-27T00:00:00Z',
    }

    const r = judgeStep(
      { ...lotionStep, step_order: lotionStep.step_order },
      [owned],
      'autumn'
    )
    expect(r.status).toBe('have')
    expect(r.ingredientChecks).toBeDefined()

    const byName = Object.fromEntries(r.ingredientChecks!.map((c) => [c.required, c.verdict]))
    expect(byName['ヒアルロン酸']).toBe('present')
    expect(byName['グリセリン']).toBe('present')
    // ハトムギエキスは極潤には入っていない
    expect(byName['ハトムギエキス']).toBe('absent')
  })

  it('成分が分からない手持ちには、成分の判定を付けない', async () => {
    const { judgeStep } = await import('../lib/substitution')
    const lotionStep = TECHNIQUES.find((t) => t.id === 't-lotion')!
    const r = judgeStep(lotionStep, [
      { id: 'o2', category: '化粧水', name: '名前だけ', created_at: '2026-07-27T00:00:00Z' },
    ], 'autumn')
    expect(r.status).toBe('have')
    // 嘘の○×を出さないよう、そもそも成分の話をしない
    expect(r.ingredientChecks).toBeUndefined()
  })
})
