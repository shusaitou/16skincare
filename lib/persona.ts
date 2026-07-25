import type { ColorType, DiagnosisResult, SkinType } from './types'

// 診断タイプ（アイデンティティ）。
// 16タイプ = パーソナルカラー(4) × 肌質(4)。
// カラーが「印象・色の個性」、肌質が「質感・スキンケアの方向性」を担い、
// 両者を合成して型名・説明を生成する（16通りを一意に網羅）。
export interface Persona {
  code: string // 例: "AUD" — MBTI風の短いコード（季 + 肌質）
  name: string // 型名
  keyword: string // 一言キャッチ
  description: string // 説明
  strengths: string[] // 強み
  caution: string // 気をつけたい点
}

// カラー（季節）= 色の個性
const SEASON_INFO: Record<
  ColorType,
  { adj: string; code: string; keyword: string; identity: string; colorVibe: string; strength: string }
> = {
  spring: {
    adj: 'ブルーミング',
    code: 'SP',
    keyword: '明るく親しみやすい、咲きたての華やかさ',
    identity: '明るく暖かなスプリングカラーが映える',
    colorVibe: 'クリアで明るい暖色',
    strength: '明るい発色が肌になじむ',
  },
  summer: {
    adj: 'エレガント',
    code: 'SU',
    keyword: '涼やかで上品な、やわらかい透明感',
    identity: '涼しげでソフトなサマーカラーが調和する',
    colorVibe: 'ソフトで涼しげなくすみ色',
    strength: 'ソフトな透明感が際立つ',
  },
  autumn: {
    adj: 'グレイス',
    code: 'AU',
    keyword: '深みと温もりのある、大人の余裕',
    identity: '深く温かなオータムカラーが溶け込む',
    colorVibe: '深く落ち着いた暖色',
    strength: '深みのある色を品よく着こなせる',
  },
  winter: {
    adj: 'クリア',
    code: 'WI',
    keyword: '凛と澄んだ、くっきりした存在感',
    identity: 'くっきり澄んだウィンターカラーが冴える',
    colorVibe: 'コントラストの効いた鮮明な色',
    strength: 'はっきりした色・コントラストが映える',
  },
}

// 肌質 = 質感・スキンケアの方向性
const SKIN_INFO: Record<
  SkinType,
  { noun: string; code: string; emphasis: string; strength: string; caution: string }
> = {
  dry: {
    noun: 'モイスト',
    code: 'D',
    emphasis: 'うるおいを抱えたしっとり肌',
    strength: 'ツヤ肌が似合う',
    caution: '乾燥が透けやすいので、まず保湿を土台にしてから発色を足すと◎',
  },
  oily: {
    noun: 'フレッシュ',
    code: 'O',
    emphasis: '皮脂でハリのあるヘルシー肌',
    strength: '崩れにくくマットな質感が得意',
    caution: 'テカリが出やすいので、皮脂対策ベースと部分パウダーで軽さをキープ',
  },
  combination: {
    noun: 'ミックス',
    code: 'C',
    emphasis: 'T ゾーンと頬で質感が異なる混合肌',
    strength: '部分ごとにメイクを使い分けられる',
    caution: 'T ゾーンはさらっと、頬は保湿重視で、部分ごとに下地を調整して',
  },
  normal: {
    noun: 'ピュア',
    code: 'N',
    emphasis: '水分と皮脂のバランスが良い安定肌',
    strength: 'どんな質感も似合いやすい',
    caution: '不満が出にくいぶん、季節で保湿と皮脂バランスを微調整すると◎',
  },
}

const GENDER_TAGLINE: Record<DiagnosisResult['gender'], string> = {
  men: '清潔感と抜け感を軸に、足しすぎない引き算で。',
  women: '血色とツヤを効かせて、印象を自在にコントロール。',
}

export function resolvePersona(result: DiagnosisResult): Persona {
  const season = SEASON_INFO[result.color]
  const skin = SKIN_INFO[result.skin]
  return {
    code: `${season.code}${skin.code}`,
    name: `${season.adj}・${skin.noun}`,
    keyword: season.keyword,
    description: `${season.identity}タイプ。${skin.emphasis}に、${season.colorVibe}が映えるのが魅力です。`,
    strengths: [season.strength, skin.strength],
    caution: skin.caution,
  }
}

export function genderTagline(result: DiagnosisResult): string {
  return GENDER_TAGLINE[result.gender]
}
