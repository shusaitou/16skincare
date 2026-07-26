import { NextResponse } from 'next/server'
import {
  fromOpenBeautyFacts,
  fromRakuten,
  isValidJan,
  type LookedUpProduct,
} from '../../../lib/productLookup'

// GET /api/product?jan=4987241167012  … バーコードから商品を引く
// GET /api/product?q=ハトムギ          … キーワードで商品名を引く
//
// 外部APIをサーバー側で叩くのは、楽天のアプリIDをブラウザに露出させないため。
// RAKUTEN_APP_ID が未設定でも動く（JAN照会はキー不要の Open Beauty Facts が担当し、
// キーワード検索は空配列を返してクライアント側がアプリ内カタログにフォールバックする）。
// Supabase 未設定でもアプリが壊れない、という既存の方針に合わせている。

const RAKUTEN_ENDPOINT = 'https://app.rakuten.co.jp/services/api/IchibaItem/Search/20220601'
const OBF_ENDPOINT = 'https://world.openbeautyfacts.org/api/v2/product'
const UA = '16skincare/1.0 (personalized makeup app)'
const TIMEOUT_MS = 6000

// 外部APIが遅いときにこちらのリクエストを道連れにしない
async function fetchJson(url: string): Promise<unknown | null> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, Accept: 'application/json' },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      // 商品マスターは頻繁には変わらないので1日キャッシュする
      next: { revalidate: 86400 },
    })
    if (!res.ok) return null
    return await res.json()
  } catch {
    // タイムアウト・ネットワークエラーは「見つからなかった」と同じ扱いにする
    return null
  }
}

async function lookupByJan(jan: string): Promise<LookedUpProduct[]> {
  // 1. JAN を持っている Open Beauty Facts を優先（キー不要）
  const obf = await fetchJson(`${OBF_ENDPOINT}/${jan}.json?fields=code,product_name,product_name_ja,brands`)
  const hit = obf ? fromOpenBeautyFacts(obf) : null
  if (hit) return [hit]

  // 2. 見つからなければ楽天でJANをキーワード検索する（日本の商品はこちらが強い）
  const appId = process.env.RAKUTEN_APP_ID
  if (!appId) return []

  const url = `${RAKUTEN_ENDPOINT}?applicationId=${encodeURIComponent(appId)}&keyword=${encodeURIComponent(jan)}&hits=5&format=json`
  const rakuten = await fetchJson(url)
  return rakuten ? fromRakuten(rakuten, 5) : []
}

async function searchByKeyword(q: string): Promise<LookedUpProduct[]> {
  const appId = process.env.RAKUTEN_APP_ID
  // 未設定なら空を返す。クライアントはアプリ内カタログの候補だけを使う。
  if (!appId) return []

  const url =
    `${RAKUTEN_ENDPOINT}?applicationId=${encodeURIComponent(appId)}` +
    `&keyword=${encodeURIComponent(q)}&hits=10&format=json` +
    // 化粧品ジャンルに絞ってノイズを減らす（100939 = 美容・コスメ・香水）
    `&genreId=100939`
  const json = await fetchJson(url)
  return json ? fromRakuten(json, 10) : []
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const jan = searchParams.get('jan')?.trim()
  const q = searchParams.get('q')?.trim()

  if (jan) {
    if (!isValidJan(jan)) {
      return NextResponse.json({ error: 'JAN コードの形式が正しくありません' }, { status: 400 })
    }
    const products = await lookupByJan(jan)
    return NextResponse.json({ products, configured: Boolean(process.env.RAKUTEN_APP_ID) })
  }

  if (q) {
    if (q.length < 2) {
      // 1文字だと候補が多すぎて役に立たないので、外部APIを叩かない
      return NextResponse.json({ products: [], configured: Boolean(process.env.RAKUTEN_APP_ID) })
    }
    const products = await searchByKeyword(q)
    return NextResponse.json({ products, configured: Boolean(process.env.RAKUTEN_APP_ID) })
  }

  return NextResponse.json({ error: 'jan または q を指定してください' }, { status: 400 })
}
