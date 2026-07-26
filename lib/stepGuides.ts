import type { FaceArea, StepGuide } from './types'

// 手順ごとの「塗り方ガイド」。technique_id をキーに引く。
//
// techniques.ts と分けているのは、これが将来 technique_guides 子テーブルに
// なる想定だから（成分・製品と同じ扱い）。手法マスターを DB 化しても、
// このファイルをクエリに差し替えるだけで済む。
//
// 書き方の方針:
//   - amount    は「パール大」「米粒大」など、道具が無くても分かる単位で
//   - direction は動かす向きを1文で（矢印と意味が一致するように）
//   - caution   は初心者がやりがちな失敗だけを書く（不安を煽らない）

export const FACE_AREA_LABEL: Record<FaceArea, string> = {
  face: '顔全体',
  forehead: '額',
  tzone: 'T ゾーン',
  cheeks: '頬',
  'cheeks-high': '頬の高い位置',
  'under-eye': '目の下',
  eyelid: 'まぶた',
  lashes: 'まつ毛のキワ',
  brows: '眉',
  lips: '唇',
  'nose-bridge': '鼻筋',
  jawline: 'フェイスライン',
  chin: 'あご',
}

export const STEP_GUIDES: Record<string, StepGuide> = {
  // ============ スキンケア ============
  't-cleanse': {
    area: 'face',
    motion: 'press',
    amount: 'さくらんぼ大の泡',
    direction: 'T ゾーン → 頬 → 目もとの順に転がす',
    tip: '手が肌に触れないよう、泡をクッションにして動かします。',
    caution: 'ゴシゴシこすると乾燥や色素沈着の原因になります。',
  },
  't-lotion': {
    area: 'face',
    motion: 'outward',
    amount: '500円玉大',
    direction: '顔の内側から外側へ',
    tip: '最後に手のひらで3秒ハンドプレスすると、ムラなくなじみます。',
    caution: 'コットンで強くこすらないこと。',
  },
  't-emulsion': {
    area: 'face',
    motion: 'outward',
    amount: 'パール大',
    direction: '頬の高い位置から外側へ',
    tip: '乾きやすい頬と口もとから先に、額と鼻は最後に薄く。',
  },
  't-sunscreen': {
    area: 'face',
    motion: 'outward',
    amount: '顔全体に500円玉大',
    direction: '額・両頬・鼻・あごに点置きしてから広げる',
    tip: '小鼻のキワ・生え際・耳の前は塗り忘れやすい場所です。',
    caution: '量が少ないと、表示されている SPF の効果は出ません。',
  },
  't-correction-hydration': {
    area: 'face',
    motion: 'press',
    amount: '美容液パール大 ＋ クリーム小豆大',
    direction: '乾きやすい頬から先に、顔全体へ',
    tip: '手のひらで包んで温めながら押さえると密着します。',
  },

  // ============ メンズ ============
  't-men-aftershave': {
    area: 'jawline',
    motion: 'press',
    amount: '10円玉大',
    direction: 'ヒゲを剃った範囲を包むように押さえる',
    tip: '剃った直後は肌が熱を持っています。少し冷ましてからつけます。',
    caution: 'アルコール分の強いものは、剃った直後にはしみることがあります。',
  },
  't-men-sebum-base': {
    area: 'tzone',
    motion: 'outward',
    amount: 'パール大',
    direction: 'T ゾーンから外側へ、薄く伸ばす',
    tip: 'テカりやすい額と鼻から塗り始め、余った分を頬へ広げます。',
    caution: '厚く塗ると不自然に見えます。薄く均一が正解です。',
  },
  't-men-brow': {
    area: 'brows',
    motion: 'outward',
    amount: 'パウダーをブラシに軽く1回',
    direction: '眉頭から眉尻へ、足りない部分だけ',
    tip: '眉尻は、小鼻と目尻を結んだ延長線上が終点の目安です。',
    caution: '剃るのは眉の下側だけ。上側を剃ると不自然になります。',
  },

  // ============ ベースメイク ============
  't-primer-mode': {
    area: 'tzone',
    motion: 'outward',
    amount: 'パール大',
    direction: '皮脂の出やすい顔の中心から外へ',
    tip: '小鼻のキワは指先で軽く押さえると崩れにくくなります。',
  },
  't-primer-clean': {
    area: 'face',
    motion: 'outward',
    amount: 'パール大',
    direction: '顔の中心から外側へ',
    tip: '毛穴が気になる部分は、指の腹で小さく円を描くようになじませます。',
  },
  't-primer-glow': {
    area: 'cheeks-high',
    motion: 'upward',
    amount: 'パール大',
    direction: '頬の高い位置から、こめかみへ引き上げる',
    tip: 'ツヤを出したい高い面に多めに、小鼻まわりは薄く。',
  },
  't-foundation-mode': {
    area: 'face',
    motion: 'outward',
    amount: 'スポンジに軽く2回',
    direction: '顔の中心から外側へ、外側ほど薄く',
    tip: '重ねるのは気になる部分だけにすると厚塗りになりません。',
    caution: '全体に重ねると粉っぽく見えます。',
  },
  't-foundation-clean': {
    area: 'face',
    motion: 'outward',
    amount: 'パール大',
    direction: '顔の中心から外側へ',
    tip: 'スポンジで軽く叩き込むと、素肌っぽく密着します。',
  },
  't-foundation-glow': {
    area: 'cheeks',
    motion: 'outward',
    amount: 'パール大',
    direction: '頬から外側へ、フェイスラインはぼかす',
    tip: '高い位置は薄めに残すと、自然なツヤに見えます。',
  },
  't-concealer': {
    area: 'under-eye',
    motion: 'press',
    amount: '米粒大',
    direction: '気になる部分にのせ、境目だけを叩いてぼかす',
    tip: 'のせた中心は触らず、フチだけをなじませるのがコツです。',
    caution: '目の下全体に広げると、逆に小じわが目立ちます。',
  },
  't-powder-mode': {
    area: 'tzone',
    motion: 'press',
    amount: 'パフに半量',
    direction: 'T ゾーンを押さえるようにのせる',
    tip: '皮脂が出る部分だけにのせると、乾燥せずに崩れを防げます。',
  },

  // ============ アイブロウ ============
  't-brow-mode': {
    area: 'brows',
    motion: 'outward',
    amount: 'ペンシルで少しずつ',
    direction: '眉頭から眉尻へ、地面と平行に',
    tip: '眉頭は薄く、眉尻に向かって少しずつ濃くします。',
  },
  't-brow-clean': {
    area: 'brows',
    motion: 'outward',
    amount: '細芯ペンシルで1本ずつ',
    direction: '毛流れに沿って眉頭から眉尻へ',
    tip: '線でつなげず、毛を1本ずつ描き足すと自然に見えます。',
  },
  't-brow-glow': {
    area: 'brows',
    motion: 'outward',
    amount: 'パウダーをブラシに軽く1回',
    direction: '眉全体にふんわりと重ねる',
    tip: 'ペンシルで形をとった後にパウダーを重ねると、やわらかい印象に。',
  },

  // ============ アイメイク ============
  't-eyeshadow-spring': eyeshadowGuide(),
  't-eyeshadow-summer': eyeshadowGuide(),
  't-eyeshadow-autumn': eyeshadowGuide(),
  't-eyeshadow-winter': eyeshadowGuide(),

  't-eyeliner-mode': {
    area: 'lashes',
    motion: 'outward',
    amount: 'リキッドで細く',
    direction: '目頭から目尻へ、目尻で少し跳ね上げる',
    tip: '一気に引かず、3〜4回に分けて点を線でつなぎます。',
    caution: '跳ね上げは目尻の延長線上まで。上げすぎると浮きます。',
  },
  't-eyeliner-clean': {
    area: 'lashes',
    motion: 'outward',
    amount: 'ブラウンで少量',
    direction: 'まつ毛の隙間を、目頭から目尻へ埋める',
    tip: '線をつなげず点で埋めると、主張しすぎず自然に仕上がります。',
  },
  't-eyeliner-glow': {
    area: 'lashes',
    motion: 'outward',
    amount: 'ペンシルで控えめに',
    direction: '目のキワに沿って、目尻側だけ',
    tip: 'ツヤ感を邪魔しないよう、締めすぎないのがポイントです。',
  },
  't-mascara': {
    area: 'lashes',
    motion: 'upward',
    amount: 'ブラシの余分をしごいてから',
    direction: '根元に当てて、ジグザグに毛先へ引き上げる',
    tip: '先にビューラーで根元・中間・毛先の3段階で上げておきます。',
    caution: '重ね塗りはダマになる前に。乾く前に軽く1回まで。',
  },

  // ============ チーク・リップ ============
  't-cheek-spring': cheekGuide(),
  't-cheek-summer': cheekGuide(),
  't-cheek-autumn': cheekGuide(),
  't-cheek-winter': cheekGuide(),

  't-lip-spring': lipGuide(),
  't-lip-summer': lipGuide(),
  't-lip-autumn': lipGuide(),
  't-lip-winter': lipGuide(),

  // ============ 仕上げ ============
  't-highlight': {
    area: 'cheeks-high',
    motion: 'upward',
    amount: 'ブラシに軽く1回',
    direction: '頬骨の高い位置から、こめかみへ向けて',
    tip: '鼻筋の中央と唇の山にも少量のせると立体感が出ます。',
    caution: '毛穴の目立つ部分にのせると、凹凸が強調されます。',
  },
  't-shading': {
    area: 'jawline',
    motion: 'downward',
    amount: 'ブラシに軽く1回（薄く）',
    direction: '耳の下からあご先に向かって',
    tip: '色を置くより「ぼかす」時間を長くとると自然になります。',
    caution: '濃く入れると影が浮きます。足りないくらいで止めます。',
  },
}

// 同じ内容を4シーズンぶん繰り返すため、関数にまとめる
function eyeshadowGuide(): StepGuide {
  return {
    area: 'eyelid',
    motion: 'outward',
    amount: 'チップ／ブラシに軽く1回',
    direction: 'まぶた全体に広げ、目のキワへ重ねる',
    tip: '明るい色をまぶた全体に、濃い色は目のキワだけに。',
    caution: '一度に多く取らず、薄く重ねるとムラになりません。',
  }
}

function cheekGuide(): StepGuide {
  return {
    area: 'cheeks-high',
    motion: 'upward',
    amount: 'ブラシに軽く1回（手の甲で調整）',
    direction: '頬の高い位置から、斜め上のこめかみへ',
    tip: '笑ったときに高くなる位置が目安です。',
    caution: '目の下すぎると腫れぼったく見えます。黒目の外側から外へ。',
  }
}

function lipGuide(): StepGuide {
  return {
    area: 'lips',
    motion: 'outward',
    amount: '直塗りなら1往復',
    direction: '唇の中心から口角へ広げる',
    tip: '輪郭がぼやける時は、指で軽くトントンとなじませます。',
  }
}

// 指定した手法の塗り方ガイドを引く（未定義なら undefined）
export function getStepGuide(techniqueId: string): StepGuide | undefined {
  return STEP_GUIDES[techniqueId]
}
