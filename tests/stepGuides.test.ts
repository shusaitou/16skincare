import { describe, expect, it } from 'vitest'
import { FACE_AREA_LABEL, STEP_GUIDES, getStepGuide } from '../lib/stepGuides'
import { buildRecommendation } from '../lib/recommend'
import { CORRECTION_STEP, TECHNIQUES } from '../lib/techniques'
import type { ColorType, DiagnosisResult, Gender, StyleType } from '../lib/types'

// 手順カードの図解データ（塗り方ガイド）の検証。
// 図が出ない手順があると「塗り方がわからない」を潰せないので、
// 全手法にガイドが揃っていることを網羅的に確かめる。

const GENDERS: Gender[] = ['men', 'women']
const COLORS: ColorType[] = ['spring', 'summer', 'autumn', 'winter']
const STYLES: StyleType[] = ['mode', 'clean', 'glow']

describe('ガイドの網羅性', () => {
  it('全ての手法にガイドが定義されている', () => {
    for (const t of TECHNIQUES) {
      expect(getStepGuide(t.id), `${t.id} のガイドが未定義`).toBeDefined()
    }
  })

  it('補正ステップにもガイドがある', () => {
    expect(getStepGuide(CORRECTION_STEP.id)).toBeDefined()
  })

  it('存在しない手法のガイドは undefined を返す', () => {
    expect(getStepGuide('t-does-not-exist')).toBeUndefined()
  })

  it('ガイドのキーが手法マスターと1対1で対応している（余分な定義がない）', () => {
    const known = new Set([...TECHNIQUES.map((t) => t.id), CORRECTION_STEP.id])
    for (const id of Object.keys(STEP_GUIDES)) {
      expect(known.has(id), `${id} は存在しない手法のガイド`).toBe(true)
    }
  })
})

describe('ガイドの内容', () => {
  it('area は FaceMap が描ける部位に限られる', () => {
    for (const [id, guide] of Object.entries(STEP_GUIDES)) {
      expect(FACE_AREA_LABEL[guide.area], `${id} の area=${guide.area} が未定義`).toBeTruthy()
    }
  })

  it('動かし方（direction）とコツ（tip）が入っている', () => {
    for (const [id, guide] of Object.entries(STEP_GUIDES)) {
      expect(guide.direction, `${id} に direction が無い`).toBeTruthy()
      expect(guide.tip, `${id} に tip が無い`).toBeTruthy()
    }
  })

  it('押さえるだけの工程には、量の記載がある', () => {
    // press は「広げない」動きなので、量が分からないと再現できない
    for (const [id, guide] of Object.entries(STEP_GUIDES)) {
      if (guide.motion !== 'press') continue
      expect(guide.amount, `${id} は press だが amount が無い`).toBeTruthy()
    }
  })
})

describe('レコメンド結果へのガイド付与', () => {
  it('返却される全ステップにガイドが乗っている', () => {
    for (const gender of GENDERS) {
      for (const color of COLORS) {
        for (const style of STYLES) {
          const result: DiagnosisResult = { gender, skin: 'dry', color, style }
          for (const step of buildRecommendation(result).steps) {
            expect(step.guide, `${step.id} にガイドが無い`).toBeDefined()
          }
        }
      }
    }
  })

  it('ガイドは JSON 経由でも失われない（API・履歴保存を通っても残る）', () => {
    const result: DiagnosisResult = {
      gender: 'women',
      skin: 'dry',
      color: 'autumn',
      style: 'mode',
    }
    const { steps } = buildRecommendation(result)
    const restored = JSON.parse(JSON.stringify(steps)) as typeof steps
    expect(restored.every((s) => s.guide !== undefined)).toBe(true)
    expect(restored[0].guide?.area).toBe(steps[0].guide?.area)
  })
})
