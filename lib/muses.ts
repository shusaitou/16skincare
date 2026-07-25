import type { ColorType, DiagnosisResult, StyleType } from './types'

// 「誰のメイクを参考にすればいいか」を提示する。
// - archetype: 参考にすべき雰囲気（ミューズ像）。色×系統から合成
// - keywords:  実際のお手本を自分で探すための検索キーワード
// - people:    実在の人物名。事実誤認を避けるため既定は空。
//              検証済みの名前を PEOPLE に入れると結果に表示される（任意）。
export interface Muse {
  archetype: string
  keywords: string[]
  people: string[]
}

const COLOR_MUSE: Record<ColorType, { vibe: string; kw: string }> = {
  spring: { vibe: 'フレッシュで親しみやすい', kw: 'イエベ春' },
  summer: { vibe: '涼やかで透明感のある', kw: 'ブルベ夏' },
  autumn: { vibe: '深みのあるこなれた', kw: 'イエベ秋' },
  winter: { vibe: '華やかでくっきりした', kw: 'ブルベ冬' },
}

const STYLE_MUSE: Record<StyleType, { archetype: string; kw: string }> = {
  mode: { archetype: 'クールで端正なモード系モデル', kw: 'モードメイク' },
  clean: { archetype: 'ナチュラルで清潔感のある女優系', kw: 'ナチュラルメイク' },
  glow: { archetype: 'つやめきのあるヘルシー系', kw: 'ツヤ肌メイク' },
}

// 実在人物名（検証してから入れる）。キーは `${color}-${style}`。
// 例: 'spring-clean': ['〇〇（イエベ春・ナチュラル）']
const PEOPLE: Partial<Record<string, string[]>> = {}

export function resolveMuse(result: DiagnosisResult): Muse {
  const c = COLOR_MUSE[result.color]
  const s = STYLE_MUSE[result.style]
  return {
    archetype: `${c.vibe}雰囲気の、${s.archetype}`,
    keywords: [
      `${c.kw} ${s.kw}`,
      `${c.kw} メイク やり方`,
      `${s.kw} 初心者`,
    ],
    people: PEOPLE[`${result.color}-${result.style}`] ?? [],
  }
}
