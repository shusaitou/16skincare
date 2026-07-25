import { describe, expect, it } from 'vitest'
import { parseDiagnosisInput } from '../lib/validation'

const valid = { gender: 'women', skin: 'dry', color: 'autumn', style: 'mode' }

describe('parseDiagnosisInput', () => {
  it('正しい入力を受理する', () => {
    const r = parseDiagnosisInput(valid)
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.result).toEqual(valid)
  })

  it('auth_id を任意で受け取る', () => {
    const r = parseDiagnosisInput({ ...valid, gender: 'men', auth_id: 'uuid-123' })
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.authId).toBe('uuid-123')
  })

  it('gender が無い / 不正なら弾く', () => {
    expect(parseDiagnosisInput({ skin: 'dry', color: 'autumn', style: 'mode' }).ok).toBe(false)
    expect(parseDiagnosisInput({ ...valid, gender: 'other' }).ok).toBe(false)
  })

  it('混合肌・普通肌も受理する', () => {
    expect(parseDiagnosisInput({ ...valid, skin: 'combination' }).ok).toBe(true)
    expect(parseDiagnosisInput({ ...valid, skin: 'normal' }).ok).toBe(true)
  })

  it('不正な skin を弾く', () => {
    expect(parseDiagnosisInput({ ...valid, skin: 'sensitive' }).ok).toBe(false)
  })

  it('旧タクソノミー(warm/cool)の color を弾く', () => {
    expect(parseDiagnosisInput({ ...valid, color: 'warm' }).ok).toBe(false)
  })

  it('不正な style を弾く', () => {
    expect(parseDiagnosisInput({ ...valid, style: 'natural' }).ok).toBe(false)
  })

  it('オブジェクト以外を弾く', () => {
    expect(parseDiagnosisInput(null).ok).toBe(false)
    expect(parseDiagnosisInput('x').ok).toBe(false)
    expect(parseDiagnosisInput(undefined).ok).toBe(false)
  })
})
