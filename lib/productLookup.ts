// 外部の商品データ（楽天市場 / Open Beauty Facts）を、このアプリの形に落とす処理。
//
// 外部APIは「商品名の自由文字列」しかくれないので、
//   1. ショップ独自の飾り（【送料無料】など）を削る
//   2. 商品名からこのアプリのカテゴリを推定する
// の2つが要になる。どちらも純粋関数にしてテストで固定している。
//
// キーワード推定は誤ることがある前提で、UI 側では必ずユーザーが確認・修正できるようにする。

import { parseIngredientList } from './ingredients'

export interface LookedUpProduct {
  jan?: string
  name: string
  brand?: string
  // 全成分表示（Open Beauty Facts から取れた場合のみ）。楽天は成分を返さない。
  ingredients?: string[]
  // 推定できた場合のみ。できなければ UI でユーザーに選んでもらう
  category?: string
  source: 'rakuten' | 'openbeautyfacts'
}

// ショップが商品名に付ける販促文字列。検索性を落とすだけなので取り除く。
const NOISE_PATTERNS: RegExp[] = [
  /[【\[(（][^】\])）]*(送料無料|あす楽|正規品|公式|最安|ポイント|クーポン|セール|即納|限定|新品|国内発送|メール便)[^】\])）]*[】\])）]/g,
  /【[^】]*】/g, // 残りの【】括り（多くは販促）
  /★|☆|◆|■|※|！！+/g,
  /\s*\/\s*$/,
]

/** 商品名からショップ独自の飾りを取り除く */
export function cleanProductName(raw: string): string {
  let s = raw
  for (const p of NOISE_PATTERNS) s = s.replace(p, ' ')
  return s.replace(/\s+/g, ' ').trim()
}

// 商品名 → カテゴリ の推定ルール。
// 上から順に見て最初に当たったものを採用するので、**具体的なものを先に**置く。
// 例: 「化粧下地」は「化粧水」より先に判定しないと取り違える。
const CATEGORY_RULES: { category: string; pattern: RegExp }[] = [
  { category: 'アフターシェーブ', pattern: /アフターシェーブ|シェービング(ローション|ジェル)/ },
  { category: '日焼け止め', pattern: /日焼け止め|サンスクリーン|サンカット|UVカット|UVケア|\bUV\b|SPF\d/i },
  { category: 'BB・下地', pattern: /BBクリーム|\bBB\b|CCクリーム|\bCC\b/i },
  { category: '化粧下地', pattern: /化粧下地|下地|プライマー|メイクアップベース|プライマ/ },
  { category: 'フェイスパウダー', pattern: /フェイスパウダー|ルースパウダー|プレストパウダー|おしろい/ },
  { category: 'ファンデーション', pattern: /ファンデーション|ファンデ|クッションファンデ/ },
  { category: 'コンシーラー', pattern: /コンシーラー/ },
  { category: 'ハイライト', pattern: /ハイライト|ハイライター/ },
  { category: 'シェーディング', pattern: /シェーディング|シェーディングパウダー|ノーズシャドウ/ },
  { category: 'アイブロウ', pattern: /アイブロウ|眉|マユ|眉墨/ },
  { category: 'アイライナー', pattern: /アイライナー|アイライン/ },
  { category: 'マスカラ', pattern: /マスカラ/ },
  { category: 'アイシャドウ', pattern: /アイシャドウ|アイシャドー|アイカラー|アイパレット/ },
  { category: 'チーク', pattern: /チーク|ブラッシュ|頬紅/ },
  { category: 'リップ', pattern: /リップ|口紅|ルージュ|ティント|グロス/ },
  { category: '洗顔料', pattern: /洗顔|クレンジング|フォーム|washing/i },
  { category: '乳液', pattern: /乳液|エマルジョン|ミルク/ },
  { category: '保湿クリーム', pattern: /クリーム|バーム|保湿ジェル/ },
  { category: '化粧水', pattern: /化粧水|ローション|トナー|toner/i },
]

/**
 * 商品名からカテゴリを推定する。当てられなければ undefined。
 * 推定を外すことがある前提なので、呼び出し側は必ずユーザーに確認させること。
 */
export function inferCategory(name: string): string | undefined {
  const s = cleanProductName(name)
  for (const rule of CATEGORY_RULES) {
    if (rule.pattern.test(s)) return rule.category
  }
  return undefined
}

// --- 楽天市場 商品検索API ---------------------------------------------------

// 楽天ウェブサービスの現行エンドポイント。
// 旧 app.rakuten.co.jp/services/api/... は、現在発行されるアプリの資格情報
// （UUID の applicationId ＋ pk_ のアクセスキー）を受け付けず
// wrong_parameter で弾かれる。公式のAPIテストフォームが使っているのはこちら。
//   host     : https://openapi.rakuten.co.jp/
//   basePath : ichibams/api/
//   path     : IchibaItem/Search/
//   version  : 20260701
export const RAKUTEN_ENDPOINT =
  'https://openapi.rakuten.co.jp/ichibams/api/IchibaItem/Search/20260701'

// 現行APIは呼び出し元の URL（登録した「アプリケーションURL」）を要求する。
// 送らないと 403 REQUEST_CONTEXT_BODY_HTTP_REFERRER_MISSING になる。
export const DEFAULT_APP_ORIGIN = 'http://localhost:3000'

// 楽天のジャンルID「美容・コスメ・香水」。
// これを付けないと、バーコードやキーワードによっては食品や日用品まで返ってくる。
//
// ※ このIDは楽天のジャンルツリーに依存する。アプリID取得後に
//   楽天ジャンル検索API等で実際に確認し、違っていれば環境変数
//   RAKUTEN_GENRE_ID で上書きできるようにしてある（コード変更不要）。
export const DEFAULT_COSMETICS_GENRE_ID = '100939'

/**
 * 楽天の検索URLを組み立てる。
 *
 * 役目が2つある。
 *  1. **必ずジャンル制限を掛ける**（付け忘れるとコスメ以外が候補に出る）
 *  2. **applicationId と accessKey を両方載せる**
 *
 * 現在の楽天ウェブサービスは、アプリごとに
 *   アプリケーションID … UUID形式（例: ec65ace1-9e87-4d23-83e4-...）
 *   アクセスキー       … pk_ で始まる文字列
 * の2つを発行し、公式のAPIテストフォームもこの両方をクエリに載せている。
 * applicationId だけだと wrong_parameter で弾かれる。
 */
export function buildRakutenUrl(
  appId: string,
  params: { keyword: string; hits?: number; genreId?: string; accessKey?: string }
): string {
  const query = new URLSearchParams({
    applicationId: appId,
    keyword: params.keyword,
    hits: String(params.hits ?? 10),
    format: 'json',
    genreId: params.genreId || DEFAULT_COSMETICS_GENRE_ID,
  })
  if (params.accessKey) query.set('accessKey', params.accessKey)
  return `${RAKUTEN_ENDPOINT}?${query.toString()}`
}

export interface RakutenItem {
  itemName?: string
  itemCode?: string
  shopName?: string
}

export interface RakutenResponse {
  Items?: { Item: RakutenItem }[]
}

/**
 * 楽天のレスポンスを整形する。
 * ブランドは商品名から機械的に切り出せないので、あえて空のままにする
 * （shopName は「店の名前」であってブランドではないため、入れると誤情報になる）。
 */
export function fromRakuten(json: RakutenResponse, limit = 10): LookedUpProduct[] {
  const items = json.Items ?? []
  const out: LookedUpProduct[] = []
  const seen = new Set<string>()

  for (const wrap of items) {
    const raw = wrap.Item?.itemName
    if (!raw) continue
    const name = cleanProductName(raw)
    if (!name || seen.has(name)) continue
    seen.add(name)
    out.push({ name, category: inferCategory(name), source: 'rakuten' })
    if (out.length >= limit) break
  }
  return out
}

// --- Open Beauty Facts ------------------------------------------------------

export interface OpenBeautyFactsProduct {
  code?: string
  product_name?: string
  product_name_ja?: string
  brands?: string
  ingredients_text?: string
  ingredients_text_ja?: string
}

export interface OpenBeautyFactsResponse {
  status?: number
  product?: OpenBeautyFactsProduct
}

/** JAN 照会のレスポンスを整形する。見つからなければ null。 */
export function fromOpenBeautyFacts(json: OpenBeautyFactsResponse): LookedUpProduct | null {
  if (json.status !== 1 || !json.product) return null
  const p = json.product
  const name = cleanProductName(p.product_name_ja || p.product_name || '')
  if (!name) return null

  // brands はカンマ区切りで複数入ることがある（例: "ロート製薬, 肌ラボ"）。
  // 先頭がメーカー名になりがちなので、最後の要素をブランドとして採る。
  const brands = (p.brands ?? '')
    .split(',')
    .map((b) => b.trim())
    .filter(Boolean)

  const ingredients = parseIngredientList(p.ingredients_text_ja || p.ingredients_text || '')

  return {
    jan: p.code,
    name,
    brand: brands.length > 0 ? brands[brands.length - 1] : undefined,
    category: inferCategory(name),
    ingredients: ingredients.length > 0 ? ingredients : undefined,
    source: 'openbeautyfacts',
  }
}

// --- JAN コード -------------------------------------------------------------

/** JAN(EAN) コードとして妥当か。13桁/8桁で、チェックディジットが合うこと。 */
export function isValidJan(code: string): boolean {
  const s = code.replace(/\D/g, '')
  if (s.length !== 13 && s.length !== 8) return false

  const digits = [...s].map(Number)
  const check = digits.pop()!
  // 右から数えて奇数番目が3倍。13桁/8桁のどちらでもこの規則で計算できる。
  const sum = digits
    .reverse()
    .reduce((acc, d, i) => acc + d * (i % 2 === 0 ? 3 : 1), 0)
  return (10 - (sum % 10)) % 10 === check
}
