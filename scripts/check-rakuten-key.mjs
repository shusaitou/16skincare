#!/usr/bin/env node
/**
 * 楽天ウェブサービスのキー判定ツール。
 *
 * 管理画面（https://webservice.rakuten.co.jp/app/list）には
 * 「アプリID」「アクセスキー」「アフィリエイトID」など複数の値が並んでいて、
 * どれが API の applicationId パラメータに対応するのか画面からは分かりにくい。
 * 公式ドキュメントにも値の形式の記載が無いため、**実際に叩いて確かめる**のが唯一確実。
 *
 * 使い方:
 *   node scripts/check-rakuten-key.mjs <値1> [値2] [値3] ...
 *   node scripts/check-rakuten-key.mjs            # 引数なしなら .env.local の値を試す
 *
 * 値は画面に出さず、先頭4文字＋末尾4文字だけ表示する。
 * 楽天のレート制限に配慮して、1件ずつ1.5秒あけて試す。
 */
import { readFileSync } from 'node:fs'

const ENDPOINT = 'https://app.rakuten.co.jp/services/api/IchibaItem/Search/20220601'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const mask = (v) => (v.length <= 10 ? '****' : `${v.slice(0, 4)}…${v.slice(-4)} (${v.length}文字)`)

function fromEnvLocal() {
  try {
    const line = readFileSync('.env.local', 'utf8')
      .split('\n')
      .find((l) => l.startsWith('RAKUTEN_APP_ID='))
    const v = line?.split('=', 2)[1]?.trim()
    return v ? [v] : []
  } catch {
    return []
  }
}

async function check(value) {
  const url = `${ENDPOINT}?applicationId=${encodeURIComponent(value)}&keyword=${encodeURIComponent('化粧水')}&hits=1&format=json`
  try {
    const res = await fetch(url, { headers: { 'User-Agent': '16skincare-keycheck/1.0' } })
    const body = await res.json()
    if (body.error) {
      return { ok: false, why: `${body.error}: ${body.error_description ?? ''}`.trim() }
    }
    const sample = body.Items?.[0]?.Item?.itemName ?? ''
    return { ok: true, count: body.count, sample: sample.slice(0, 40) }
  } catch (e) {
    return { ok: false, why: `通信エラー: ${e.message}` }
  }
}

const values = process.argv.slice(2).filter(Boolean)
const targets = values.length > 0 ? values : fromEnvLocal()

if (targets.length === 0) {
  console.error('値を指定してください:  node scripts/check-rakuten-key.mjs <アプリIDやアクセスキー>')
  process.exit(1)
}

console.log(`${targets.length}件を順に試します（楽天のレート制限に配慮して1.5秒間隔）\n`)

let winner = null
for (const [i, v] of targets.entries()) {
  if (i > 0) await sleep(1500)
  const r = await check(v)
  if (r.ok) {
    console.log(`✅ ${mask(v)}  →  有効（該当 ${r.count} 件）`)
    if (r.sample) console.log(`      例: ${r.sample}`)
    winner ??= v
  } else {
    console.log(`❌ ${mask(v)}  →  ${r.why}`)
  }
}

console.log()
if (winner) {
  console.log('この値を .env.local に設定してください:')
  console.log(`  RAKUTEN_APP_ID=${winner}`)
  console.log('設定後、開発サーバーを再起動（Ctrl+C → npm run dev）してください。')
} else {
  console.log('どれも通りませんでした。')
  console.log('https://webservice.rakuten.co.jp/app/list を開き、')
  console.log('登録済みアプリの詳細に並んでいる値を（複数あれば全部）引数に並べて再実行してください:')
  console.log('  node scripts/check-rakuten-key.mjs 値1 値2 値3')
}
