import { describe, expect, it } from 'vitest'
import { resolveMuse } from '../lib/muses'
import type { ColorType, StyleType } from '../lib/types'

const COLORS: ColorType[] = ['spring', 'summer', 'autumn', 'winter']
const STYLES: StyleType[] = ['mode', 'clean', 'glow']

describe('resolveMuse', () => {
  it('全ての色×系統でミューズ像と検索キーワードが生成される', () => {
    for (const color of COLORS) {
      for (const style of STYLES) {
        const m = resolveMuse({ gender: 'women', skin: 'dry', color, style })
        expect(m.archetype).toBeTruthy()
        expect(m.keywords.length).toBeGreaterThan(0)
        expect(Array.isArray(m.people)).toBe(true) // 既定は空配列
      }
    }
  })

  it('検索キーワードにパーソナルカラー名が含まれる', () => {
    const m = resolveMuse({ gender: 'women', skin: 'dry', color: 'spring', style: 'clean' })
    expect(m.keywords.some((k) => k.includes('イエベ春'))).toBe(true)
  })
})
