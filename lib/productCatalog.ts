import { CORRECTION_STEP, TECHNIQUES } from './techniques'
import type { OwnedCosmetic, Product } from './types'

// 手持ちコスメ登録の入力補完に使う候補データ。
//
// 方針:
//   - ブランド名は実在が明確なので、よく使われるものを一覧で持つ。
//   - **製品名は勝手に作らない**。候補はリポジトリ内の手法マスター(techniques.ts)と、
//     ユーザー自身が過去に登録したものだけから作る。
//     うろ覚えの製品名を候補に出すと、存在しない商品を勧めることになるため
//     （lib/muses.ts で実在人物名を既定で空にしているのと同じ方針）。
//   - 候補はあくまで入力補助で、自由入力を妨げない。

// ドラッグストア〜デパコスでよく使われるブランド。
// 手法マスターに出てくるブランドは下の brandCandidates() で自動的に合流する。
const COMMON_BRANDS = [
  // スキンケア・日用
  '無印良品', 'ちふれ', 'ナチュリエ', '肌ラボ', 'メラノCC', 'キュレル', 'ミノン', 'イハダ',
  'ニベア', 'ヴァセリン', 'ユースキン', 'ビオレ', 'ロート製薬', 'ファンケル', 'オルビス',
  'アベンヌ', 'ラ ロッシュ ポゼ', 'キールズ',
  // ベースメイク・スキンケア（国内大手）
  '資生堂', 'エリクシール', 'アネッサ', 'マキアージュ', 'dプログラム', 'アクアレーベル',
  'ソフィーナ', 'プリマヴィスタ', 'コーセー', 'カネボウ', 'エスプリーク', 'インテグレート',
  // プチプラメイク
  'セザンヌ', 'キャンメイク', 'KATE', 'excel', 'Visée', 'オペラ', 'リンメル', 'マジョリカ マジョルカ',
  'ちふれ化粧品', 'メイベリン', 'ロレアルパリ', 'レブロン',
  // アイメイク特化
  'ヒロインメイク', 'デジャヴュ', 'ラブ・ライナー', 'UZU', 'フローフシ',
  // 韓国コスメ（メイク）
  'rom&nd', 'CLIO', 'ペリペラ', 'ETUDE', 'イニスフリー', 'MISSHA', 'the SAEM', 'ラネージュ',
  'TIRTIR', 'AMUSE', 'HERA', '3CE', 'hince', 'dasique', 'lilybyred', 'MERZY', 'espoir',
  'JUNG SAEM MOOL', 'holika holika', 'A’pieu',
  // 韓国コスメ（スキンケア）
  'COSRX', 'Anua', 'VT', 'Torriden', 'SKIN1004', 'numbuzin', 'Dr.G', 'ma:nyo', 'AESTURA',
  'medicube', 'Abib', 'ISNTREE', 'BEAUTY OF JOSEON', 'SOME BY MI',
  // メンズ
  'ウーノ', 'GATSBY', 'ルシード', 'ニベアメン', 'BULK HOMME', 'NULL', 'ORBIS Mr.',
  // 国内メイク
  'RMK', 'THREE', 'LUNASOL', 'ETVOS', 'ONLY MINERALS', 'MiMC', 'SNIDEL BEAUTY', 'CipiCipi',
  'FASIO', 'AUBE', 'to/one', '&be', 'デイジーク',
  // 国内スキンケア
  'HAKU', 'SK-II', 'IPSA', 'ALBION', 'SOFINA iP', 'TSUBAKI', 'SANA', 'なめらか本舗',
  'ロゼット', 'メンソレータム', 'MINON', '雪肌精',
  // デパコス
  'ポール & ジョー', 'SUQQU', 'ADDICTION', 'セルヴォーク', 'NARS', 'M・A・C', 'DIOR', 'CHANEL',
  'イヴ・サンローラン', 'ジルスチュアート', 'クリニーク', 'DECORTÉ', 'クレ・ド・ポー ボーテ',
  'エレガンス', 'LANCOME', 'SHISEIDO', 'BOBBI BROWN', 'shu uemura', 'LAURA MERCIER',
  'CHARLOTTE TILBURY', 'rare beauty', 'FENTY BEAUTY',
]

/**
 * 検索用の正規化。
 * 日本語の入力ゆれ（ひらがな/カタカナ、全角/半角、長音・中黒・空白）を吸収する。
 * 「びおれ」と打っても「ビオレ」に当たるようにするのが狙い。
 */
export function normalizeJa(value: string): string {
  return value
    .trim()
    .toLowerCase()
    // 全角英数 → 半角
    .replace(/[Ａ-Ｚａ-ｚ０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    // ひらがな → カタカナ
    .replace(/[ぁ-ゖ]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 0x60))
    // 記号・空白・長音は揺れやすいので落とす
    .replace(/[ー・\s＆&\-_.。、]/g, '')
}

// 手法マスターに登場する全製品（補正ステップぶんを含む）
export function catalogProducts(): Product[] {
  const list: Product[] = []
  for (const t of TECHNIQUES) list.push(...(t.products ?? []))
  list.push(...(CORRECTION_STEP.products ?? []))
  return list
}

/**
 * ブランド候補。
 * よく使われるブランド + 手法マスターに出てくるブランド + ユーザーが登録済みのブランド。
 */
export function brandCandidates(owned: OwnedCosmetic[] = []): string[] {
  const set = new Set<string>(COMMON_BRANDS)
  for (const p of catalogProducts()) set.add(p.brand)
  for (const o of owned) if (o.brand) set.add(o.brand)
  return [...set]
}

export interface ProductSuggestion {
  name: string
  brand: string
  category: string
}

/**
 * 製品名の候補。
 * ブランド・カテゴリで絞り込める。ユーザー自身の登録済みも候補に含める。
 * ここで返るのは実在が確認できているもの（リポジトリ内データ or 本人の入力）だけ。
 */
export function productCandidates(
  opts: { brand?: string; category?: string; owned?: OwnedCosmetic[] } = {}
): ProductSuggestion[] {
  const { brand, category, owned = [] } = opts

  const all: ProductSuggestion[] = [
    ...catalogProducts().map((p) => ({ name: p.name, brand: p.brand, category: p.category })),
    // 製品名なしで登録されたもの（カテゴリだけのタップ登録）は候補にならない
    ...owned
      .filter((o): o is typeof o & { name: string } => Boolean(o.name))
      .map((o) => ({ name: o.name, brand: o.brand ?? '', category: o.category })),
  ]

  const nb = brand ? normalizeJa(brand) : ''
  const seen = new Set<string>()
  const out: ProductSuggestion[] = []

  for (const p of all) {
    if (category && p.category !== category) continue
    // ブランドが入力済みなら、そのブランドのものを優先的に出す
    if (nb && !normalizeJa(p.brand).includes(nb)) continue
    const key = `${p.brand}::${p.name}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push(p)
  }
  return out
}

/**
 * 入力文字列で候補を絞り込む。
 * 前方一致を先に、部分一致を後に並べる（打ち始めた文字が頭に来る方が探しやすいため）。
 * 空入力のときは全件（呼び出し側で件数を絞る）。
 */
export function filterByQuery<T>(items: T[], query: string, textOf: (item: T) => string): T[] {
  const q = normalizeJa(query)
  if (!q) return items

  const prefix: T[] = []
  const partial: T[] = []
  for (const item of items) {
    const t = normalizeJa(textOf(item))
    if (t.startsWith(q)) prefix.push(item)
    else if (t.includes(q)) partial.push(item)
  }
  return [...prefix, ...partial]
}

// ブランド名を絞り込む
export function searchBrands(query: string, owned: OwnedCosmetic[] = [], limit = 8): string[] {
  return filterByQuery(brandCandidates(owned), query, (b) => b).slice(0, limit)
}

/**
 * 商品検索の結果から「入力されたブランドが実在するか」を確認する。
 *
 * 楽天のレスポンスには「ブランド」項目が無いので、ブランド候補を**生成**することはできない。
 * しかし商品名の中にはブランド名が入っているので、
 *   「ユーザーが打った文字列を含む商品が実在するか」
 * は確認できる。生成ではなく検証なので、存在しないブランドを出す心配がない。
 *
 * 戻り値は、確認できた場合のみ「打った文字列」と件数。確認できなければ null。
 */
export function verifyBrandFromProducts(
  query: string,
  productNames: string[]
): { brand: string; matchCount: number } | null {
  const q = normalizeJa(query)
  if (q.length === 0) return null

  const matchCount = productNames.filter((n) => normalizeJa(n).includes(q)).length
  if (matchCount === 0) return null

  return { brand: query.trim(), matchCount }
}

// 製品名を絞り込む
export function searchProducts(
  query: string,
  opts: { brand?: string; category?: string; owned?: OwnedCosmetic[] } = {},
  limit = 8
): ProductSuggestion[] {
  return filterByQuery(productCandidates(opts), query, (p) => `${p.name} ${p.brand}`).slice(0, limit)
}
