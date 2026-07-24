import type { ColorType, DiagnosisResult, SkinType } from './types'

// 診断タイプ（アイデンティティ）。
// コア8アーキタイプ = 肌質(2) × パーソナルカラー(4)。
// これに性別(メンズ/レディース)のトーン差を掛け、全16パターンとして提示する。
export interface Persona {
  code: string // 例: "GRM" — MBTI風の短いコード
  name: string // 型名
  keyword: string // 一言キャッチ
  description: string // 2〜3文の説明
  strengths: string[] // 強み
  caution: string // 気をつけたい点
}

type Key = `${SkinType}-${ColorType}`

const PERSONAS: Record<Key, Persona> = {
  'dry-spring': {
    code: 'BLM',
    name: 'ブルーミング・モイスト',
    keyword: '咲きたてのような、みずみずしい親しみやすさ',
    description:
      '潤いを抱えた肌に、明るく暖かなスプリングカラーが映えるタイプ。血色感とツヤで、誰からも好かれるフレッシュな印象をつくれます。',
    strengths: ['ツヤ肌が似合う', '明るい発色が肌になじむ', '親しみやすい血色感'],
    caution: '乾燥が透けやすいので、保湿を土台にしてから発色を足すと◎',
  },
  'dry-summer': {
    code: 'ELM',
    name: 'エレガント・モイスト',
    keyword: '柔らかな透明感をまとう、穏やかな品',
    description:
      '潤い肌に、涼しげでソフトなサマーカラーが調和するタイプ。強すぎない上品さと透明感が最大の武器です。',
    strengths: ['ソフトな透明感', 'くすみ色が上品にきまる', '肌のなめらかさが際立つ'],
    caution: '濃すぎる色は浮きやすい。ヌケ感のあるトーンで軽やかに',
  },
  'dry-autumn': {
    code: 'GRM',
    name: 'グレイス・モイスト',
    keyword: '深みと温もりの、落ち着いた大人の余裕',
    description:
      '潤い肌に、深く温かなオータムカラーが溶け込むタイプ。こっくりした色を品よく着こなせる、余裕のある印象を持ちます。',
    strengths: ['深みのある色が似合う', '温かみのあるツヤ肌', 'こなれた大人っぽさ'],
    caution: '乾燥するとくすんで見えがち。ツヤの保湿ベースで血色をキープ',
  },
  'dry-winter': {
    code: 'CLM',
    name: 'クリア・モイスト',
    keyword: '凛とした、澄みわたる透明感',
    description:
      '潤い肌に、くっきり澄んだウィンターカラーが冴えるタイプ。シャープな色をまとっても、しっとり感で柔らかさが残ります。',
    strengths: ['くっきりした色が映える', '凛とした透明感', 'コントラストが似合う'],
    caution: 'マット過ぎると乾燥が目立つ。適度なツヤで硬さを和らげて',
  },
  'oily-spring': {
    code: 'FRP',
    name: 'フレッシュ・ポップ',
    keyword: 'ヘルシーで元気な、弾けるような明るさ',
    description:
      '皮脂の力でハリのある肌に、明るいスプリングカラーが弾けるタイプ。元気でヘルシーな印象を軽やかにつくれます。',
    strengths: ['ヘルシーなツヤ感', '鮮やかな発色が得意', '崩れにくい肌'],
    caution: 'テカリと発色が重なると重い印象に。ベースは軽くマットに寄せて',
  },
  'oily-summer': {
    code: 'CLA',
    name: 'クール・エアリー',
    keyword: 'さらりと爽やか、風通しのよい涼感',
    description:
      '皮脂で潤う肌に、涼しげなサマーカラーが軽やかに合うタイプ。さっぱりと清潔感のある爽やかさが持ち味です。',
    strengths: ['爽やかな清潔感', 'さらっとした質感', 'くすみ色が上品'],
    caution: '皮脂でにじみやすい。セミマットのベースで軽さをキープ',
  },
  'oily-autumn': {
    code: 'URA',
    name: 'アーバン・アース',
    keyword: 'こなれた、都会的なアースモード',
    description:
      '皮脂の力とハリに、深いオータムカラーが効くタイプ。マットな質感と深い色で、都会的でこなれた雰囲気をまとえます。',
    strengths: ['マットな質感が似合う', '深い色でこなれ感', '崩れにくいベース'],
    caution: 'テカリが出ると色がくすむ。皮脂対策ベースを土台に',
  },
  'oily-winter': {
    code: 'SHM',
    name: 'シャープ・モード',
    keyword: 'クールでエッジの効いた、モードな存在感',
    description:
      '皮脂でハリのある肌に、くっきりしたウィンターカラーが冴えるタイプ。シャープでモードな存在感を最も表現しやすいタイプです。',
    strengths: ['モードな存在感', 'コントラストが映える', 'マット肌が得意'],
    caution: '皮脂×マットで硬くなりがち。要所にツヤを残して抜け感を',
  },
}

// 性別ごとのトーン（同じアーキタイプでも見せ方を変える一言）
const GENDER_TAGLINE: Record<DiagnosisResult['gender'], string> = {
  men: '清潔感と抜け感を軸に、足しすぎない引き算で。',
  women: '血色とツヤを効かせて、印象を自在にコントロール。',
}

export function resolvePersona(result: DiagnosisResult): Persona {
  return PERSONAS[`${result.skin}-${result.color}` as Key]
}

export function genderTagline(result: DiagnosisResult): string {
  return GENDER_TAGLINE[result.gender]
}
