import { describe, expect, it } from 'vitest'
import { resolvePersona, genderTagline } from '../lib/persona'
import { getPalette } from '../lib/palette'
import type { ColorType, DiagnosisResult, SkinType } from '../lib/types'

const SKINS: SkinType[] = ['dry', 'oily']
const COLORS: ColorType[] = ['spring', 'summer', 'autumn', 'winter']

describe('resolvePersona — 8アーキタイプ', () => {
  it('肌質×カラーの全8組合せに一意のタイプが割り当たる', () => {
    const codes = new Set<string>()
    for (const skin of SKINS) {
      for (const color of COLORS) {
        const p = resolvePersona({ gender: 'women', skin, color, style: 'clean' })
        expect(p.name).toBeTruthy()
        expect(p.strengths.length).toBeGreaterThan(0)
        codes.add(p.code)
      }
    }
    expect(codes.size).toBe(8) // コードは全て異なる
  })

  it('性別でタグラインが変わる（=メンズ/レディースで16パターン）', () => {
    const base: DiagnosisResult = { gender: 'men', skin: 'dry', color: 'autumn', style: 'mode' }
    expect(genderTagline(base)).not.toBe(genderTagline({ ...base, gender: 'women' }))
  })
})

describe('getPalette — カラーパレット', () => {
  it('各シーズンに得意色・苦手色・金属が定義されている', () => {
    for (const color of COLORS) {
      const p = getPalette(color)
      expect(p.best.length).toBeGreaterThan(0)
      expect(p.avoid.length).toBeGreaterThan(0)
      expect(['gold', 'silver']).toContain(p.metal)
      // hex 形式チェック
      for (const s of p.best) expect(s.hex).toMatch(/^#[0-9A-Fa-f]{6}$/)
    }
  })

  it('暖色シーズンはゴールド、涼色シーズンはシルバー', () => {
    expect(getPalette('spring').metal).toBe('gold')
    expect(getPalette('autumn').metal).toBe('gold')
    expect(getPalette('summer').metal).toBe('silver')
    expect(getPalette('winter').metal).toBe('silver')
  })
})
