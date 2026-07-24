import type { ColorType } from './types'

export interface Swatch {
  name: string
  hex: string
}

export interface SeasonPalette {
  best: Swatch[] // 似合う色
  avoid: Swatch[] // 苦手な色
  metal: 'gold' | 'silver' // 似合う金属
}

// パーソナルカラー4シーズンの色見本。
// best = 肌をきれいに見せる色、avoid = 顔色がくすみやすい色。
export const PALETTES: Record<ColorType, SeasonPalette> = {
  spring: {
    best: [
      { name: 'コーラル', hex: '#FF6F61' },
      { name: 'ピーチ', hex: '#FFB07C' },
      { name: 'ウォームイエロー', hex: '#F4C430' },
      { name: 'フレッシュグリーン', hex: '#A8D08D' },
      { name: 'アイボリー', hex: '#FFF4E0' },
    ],
    avoid: [
      { name: 'グレイッシュ', hex: '#9AA0A6' },
      { name: 'ダークネイビー', hex: '#1F2A44' },
    ],
    metal: 'gold',
  },
  summer: {
    best: [
      { name: 'ローズピンク', hex: '#E7A9C0' },
      { name: 'ラベンダー', hex: '#B5A8D6' },
      { name: 'パウダーブルー', hex: '#A9C7E8' },
      { name: 'ソフトグレー', hex: '#C9C7CC' },
      { name: 'オフホワイト', hex: '#F3EEF3' },
    ],
    avoid: [
      { name: 'オレンジ', hex: '#E8781F' },
      { name: 'ゴールド', hex: '#C8A32B' },
    ],
    metal: 'silver',
  },
  autumn: {
    best: [
      { name: 'テラコッタ', hex: '#C56A3B' },
      { name: 'マスタード', hex: '#C99A2E' },
      { name: 'オリーブ', hex: '#7C7A3A' },
      { name: 'ブラウン', hex: '#7A4A2B' },
      { name: 'クリーム', hex: '#EDE0C8' },
    ],
    avoid: [
      { name: 'ビビッドピンク', hex: '#E84B8A' },
      { name: 'アイシーブルー', hex: '#BFE3F0' },
    ],
    metal: 'gold',
  },
  winter: {
    best: [
      { name: 'フューシャ', hex: '#C2185B' },
      { name: 'ロイヤルブルー', hex: '#1E4FA3' },
      { name: 'ピュアホワイト', hex: '#FFFFFF' },
      { name: 'ブラック', hex: '#1A1A1A' },
      { name: 'エメラルド', hex: '#0E7A5F' },
    ],
    avoid: [
      { name: 'マスタード', hex: '#C99A2E' },
      { name: 'ベージュ', hex: '#D8C3A5' },
    ],
    metal: 'silver',
  },
}

export function getPalette(color: ColorType): SeasonPalette {
  return PALETTES[color]
}
