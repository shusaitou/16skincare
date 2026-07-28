import { NextResponse } from 'next/server'
import { createThrottle } from '../../../lib/rateLimit'
import {
  buildRakutenUrl,
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

const OBF_ENDPOINT = 'https://world.openbeautyfacts.org/api/v2/product'
const UA = '16skincare/1.0 (personalized makeup app)'
const TIMEOUT_MS = 6000

// 楽天は上限値を公開していないが、429 と「短時間の連続アクセスで一時的に
// 応答しなくなる」ことは明記されている。制限はアプリID単位＝全ユーザー共有なので、
// 安全側に倒して毎秒1回に抑える。
//
// ※ サーバーレスでは実行インスタンスごとに別のスロットルになるため、
//    これは全体の上限を厳密に保証するものではない（緩和策）。
//    厳密にやるなら Redis 等の共有ストアが要る。
const rakutenThrottle = createThrottle({ minIntervalMs: 1100, maxWaitMs: 2500 })

// 楽天がキーを拒否したかどうか。設定ミスを画面で分かるようにするために持ち回る。
// （キーが無効でも「候補ゼロ」としか見えないと、原因の切り分けができないため）
export type KeyStatus = 'missing' | 'invalid' | 'ok'
let lastRakutenKeyStatus: KeyStatus = 'ok'

// 外部APIが遅いときにこちらのリクエストを道連れにしない
async function fetchJson(url: string): Promise<unknown | null> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, Accept: 'application/json' },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      // 商品マスターは頻繁には変わらないので1日キャッシュする。
      // 同じ語で何度も叩かれても外部APIには行かないので、これ自体が制限対策になる。
      next: { revalidate: 86400 },
    })
    if (!res.ok) {
      if (res.status === 429) {
        console.warn('外部APIのレート制限に達しました。しばらく候補が出ません。')
      }
      return null
    }
    return await res.json()
  } catch {
    // タイムアウト・ネットワークエラーは「見つからなかった」と同じ扱いにする
    return null
  }
}

// 楽天だけスロットルを通す（Open Beauty Facts はオープンデータで制限が緩い）
async function fetchRakuten(url: string): Promise<unknown | null> {
  const allowed = await rakutenThrottle.acquire()
  // 混んでいるときは待たせずに諦める。呼び出し側はアプリ内カタログで代替できる。
  if (!allowed) return null

  const json = await fetchJson(url)
  // 楽天はキーが不正なとき HTTP 400 + {error:'wrong_parameter'} を返す。
  // fetchJson は !ok を null にするので、ここでは「応答があったのにエラー本文」の場合と
  // 「そもそも応答が無い」場合を区別できない。確実に判るよう、キー不正だけ別に取りに行く。
  if (json === null) {
    lastRakutenKeyStatus = await probeKeyRejected(url) ? 'invalid' : 'ok'
    return null
  }
  lastRakutenKeyStatus = 'ok'
  return json
}

// エラー本文を読んで、キーが拒否されたかを判定する
async function probeKeyRejected(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, Accept: 'application/json' },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: 'no-store',
    })
    if (res.ok) return false
    const body = (await res.json()) as { error?: string; error_description?: string }
    const rejected = /applicationId/i.test(body.error_description ?? '') || body.error === 'wrong_parameter'
    if (rejected) {
      console.warn('楽天APIがキーを拒否しました:', body.error, body.error_description)
    }
    return rejected
  } catch {
    return false
  }
}

function keyStatus(): KeyStatus {
  if (!process.env.RAKUTEN_APP_ID) return 'missing'
  return lastRakutenKeyStatus
}

async function lookupByJan(jan: string): Promise<LookedUpProduct[]> {
  // 1. JAN を持っている Open Beauty Facts を優先（キー不要）
  const obf = await fetchJson(`${OBF_ENDPOINT}/${jan}.json?fields=code,product_name,product_name_ja,brands`)
  const hit = obf ? fromOpenBeautyFacts(obf) : null
  if (hit) return [hit]

  // 2. 見つからなければ楽天でJANをキーワード検索する（日本の商品はこちらが強い）。
  //    ここにもジャンル制限を掛ける。掛けないと、コスメ以外のバーコード
  //    （お菓子など）を読んだときにその商品が候補として出てしまう。
  const appId = process.env.RAKUTEN_APP_ID
  if (!appId) return []

  const rakuten = await fetchRakuten(
    buildRakutenUrl(appId, {
      keyword: jan,
      hits: 5,
      genreId: process.env.RAKUTEN_GENRE_ID,
      accessKey: process.env.RAKUTEN_ACCESS_KEY,
    })
  )
  return rakuten ? fromRakuten(rakuten, 5) : []
}

async function searchByKeyword(q: string): Promise<LookedUpProduct[]> {
  const appId = process.env.RAKUTEN_APP_ID
  // 未設定なら空を返す。クライアントはアプリ内カタログの候補だけを使う。
  if (!appId) return []

  const json = await fetchRakuten(
    buildRakutenUrl(appId, {
      keyword: q,
      hits: 10,
      genreId: process.env.RAKUTEN_GENRE_ID,
      accessKey: process.env.RAKUTEN_ACCESS_KEY,
    })
  )
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
    return NextResponse.json({ products, configured: Boolean(process.env.RAKUTEN_APP_ID), keyStatus: keyStatus() })
  }

  if (q) {
    if (q.length < 2) {
      // 1文字だと候補が多すぎて役に立たないので、外部APIを叩かない
      return NextResponse.json({ products: [], configured: Boolean(process.env.RAKUTEN_APP_ID), keyStatus: keyStatus() })
    }
    const products = await searchByKeyword(q)
    return NextResponse.json({ products, configured: Boolean(process.env.RAKUTEN_APP_ID), keyStatus: keyStatus() })
  }

  return NextResponse.json({ error: 'jan または q を指定してください' }, { status: 400 })
}
