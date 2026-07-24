import type { ColorType, DiagnosisResult, SkinType, StyleType } from './types'

const SKIN_VALUES: SkinType[] = ['dry', 'oily']
const COLOR_VALUES: ColorType[] = ['spring', 'summer', 'autumn', 'winter']
const STYLE_VALUES: StyleType[] = ['mode', 'clean', 'glow']

function isOneOf<T extends string>(v: unknown, allowed: T[]): v is T {
  return typeof v === 'string' && (allowed as string[]).includes(v)
}

export type ParseResult =
  | { ok: true; result: DiagnosisResult; authId?: string }
  | { ok: false; error: string }

// API に渡された診断結果の JSON を検証して DiagnosisResult に整形する
export function parseDiagnosisInput(body: unknown): ParseResult {
  if (typeof body !== 'object' || body === null) {
    return { ok: false, error: 'リクエストボディが不正です' }
  }
  const b = body as Record<string, unknown>

  if (!isOneOf<SkinType>(b.skin, SKIN_VALUES)) {
    return { ok: false, error: `skin は ${SKIN_VALUES.join(' / ')} のいずれかである必要があります` }
  }
  if (!isOneOf<ColorType>(b.color, COLOR_VALUES)) {
    return { ok: false, error: `color は ${COLOR_VALUES.join(' / ')} のいずれかである必要があります` }
  }
  if (!isOneOf<StyleType>(b.style, STYLE_VALUES)) {
    return { ok: false, error: `style は ${STYLE_VALUES.join(' / ')} のいずれかである必要があります` }
  }

  // auth_id は任意（Supabase Auth 連携前は未指定でも可）
  const authId = typeof b.auth_id === 'string' ? b.auth_id : undefined

  return {
    ok: true,
    result: { skin: b.skin, color: b.color, style: b.style },
    authId,
  }
}
