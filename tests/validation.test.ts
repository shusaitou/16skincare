import { describe, expect, it } from 'vitest'
import { parseDiagnosisInput } from '../lib/validation'

describe('parseDiagnosisInput', () => {
  it('正しい入力を受理する', () => {
    const r = parseDiagnosisInput({ skin: 'dry', color: 'autumn', style: 'mode' })
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.result).toEqual({ skin: 'dry', color: 'autumn', style: 'mode' })
  })

  it('auth_id を任意で受け取る', () => {
    const r = parseDiagnosisInput({
      skin: 'oily',
      color: 'winter',
      style: 'glow',
      auth_id: 'uuid-123',
    })
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.authId).toBe('uuid-123')
  })

  it('不正な skin を弾く', () => {
    const r = parseDiagnosisInput({ skin: 'combination', color: 'spring', style: 'mode' })
    expect(r.ok).toBe(false)
  })

  it('旧タクソノミー(warm/cool)の color を弾く', () => {
    const r = parseDiagnosisInput({ skin: 'dry', color: 'warm', style: 'mode' })
    expect(r.ok).toBe(false)
  })

  it('不正な style を弾く', () => {
    const r = parseDiagnosisInput({ skin: 'dry', color: 'spring', style: 'natural' })
    expect(r.ok).toBe(false)
  })

  it('オブジェクト以外を弾く', () => {
    expect(parseDiagnosisInput(null).ok).toBe(false)
    expect(parseDiagnosisInput('x').ok).toBe(false)
    expect(parseDiagnosisInput(undefined).ok).toBe(false)
  })
})
