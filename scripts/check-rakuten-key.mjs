#!/usr/bin/env node
/**
 * 楽天ウェブサービスのキー判定ツール。
 *
 * 管理画面（https://webservice.rakuten.co.jp/app/list）には
 * 「アプリID」「アクセスキー」「アフィリエイトID」など複数の値が並んでいて、
 * どれが API の applicationId パラメータに対応するのか画面からは分かりにくい。
 * 公式ドキュメントにも値の形式の記載が無いため、**実際に叩いて確かめる**のが唯一確実。
 *
 * 現在の楽天はアプリごとに2つの値を発行し、APIには**両方**必要:
 *   アプリケーションID … UUID形式
 *   アクセスキー       … pk_ で始まる文字列
 *
 * 使い方:
 *   node scripts/check-rakuten-key.mjs <アプリケーションID> <アクセスキー>
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
    const lines = readFileSync('.env.local', 'utf8').split('\n')
    const pick = (k) => lines.find((l) => l.startsWith(k + '='))?.split('=', 2)[1]?.trim()
    return [pick('RAKUTEN_APP_ID'), pick('RAKUTEN_ACCESS_KEY')]
  } catch {
    return []
  }
}

// 値の取り違えに形から気づけるようにする。
// 楽天の正しい組み合わせは「アプリケーションID = UUID」「アクセスキー = pk_ 始まり」。
const FOREIGN_KEY_HINTS = [
  { re: /^sk_/, what: '他サービスの secret key（Stripe など）' },
  { re: /^sb_/, what: 'Supabase のキー' },
  { re: /^eyJ/, what: 'JWT（Supabase の anon key など）' },
  { re: /^[0-9a-f]{6,}\.[0-9a-f]{6,}\./i, what: '楽天のアフィリエイトID（この2つとは別物）' },
]

function foreignKeyHint(value) {
  return FOREIGN_KEY_HINTS.find((h) => h.re.test(value))?.what ?? null
}

// 管理画面のアクセスキーは伏字（●）で表示される。目のアイコンで開かずに
// 選択してコピーすると伏字そのものが入るので、それを検出して知らせる。
function looksMasked(value) {
  return /^[•●*・.•\s]+$/.test(value)
}

async function check(value, accessKey) {
  const q = new URLSearchParams({ applicationId: value, keyword: '化粧水', hits: '1', format: 'json' })
  if (accessKey) q.set('accessKey', accessKey)
  const url = `${ENDPOINT}?${q.toString()}`
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

const args = process.argv.slice(2).filter(Boolean)
const [envId, envKey] = fromEnvLocal()
const values = args.length > 0 ? args : [envId, envKey].filter(Boolean)

if (values.length === 0) {
  console.error('使い方: node scripts/check-rakuten-key.mjs <アプリケーションID> <アクセスキー>')
  process.exit(1)
}

for (const v of values) {
  if (looksMasked(v)) {
    console.log(`⚠️  ${mask(v)} は伏字のままコピーされています。`)
    console.log('    管理画面の値の右にあるコピーボタン（□のアイコン）を使ってください。')
    process.exit(1)
  }
}

// どちらがIDでどちらがキーか判別する（順番を間違えても動くように）
const isAppId = (v) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)
const isAccessKey = (v) => /^pk_/.test(v)

let appId = values.find(isAppId) ?? values[0]
let accessKey = values.find(isAccessKey) ?? values.find((v) => v !== appId)

console.log('判別結果:')
console.log(`  アプリケーションID: ${mask(appId)}${isAppId(appId) ? ' … UUID形式' : ' … ⚠️ UUID形式ではありません'}`)
console.log(`  アクセスキー      : ${accessKey ? mask(accessKey) + (isAccessKey(accessKey) ? ' … pk_ 形式' : ' … ⚠️ pk_ で始まっていません') : '（未指定）'}`)
console.log()

// 両方 → IDのみ の順に試して、どちらが必要か切り分ける
const attempts = accessKey
  ? [
      { label: 'applicationId + accessKey', id: appId, key: accessKey },
      { label: 'applicationId のみ', id: appId, key: undefined },
    ]
  : [{ label: 'applicationId のみ', id: appId, key: undefined }]

let winner = null
for (const [i, a] of attempts.entries()) {
  if (i > 0) await sleep(1500)
  const r = await check(a.id, a.key)
  if (r.ok) {
    console.log(`✅ ${a.label}  →  有効（該当 ${r.count} 件）`)
    if (r.sample) console.log(`      例: ${r.sample}`)
    winner ??= a
  } else {
    console.log(`❌ ${a.label}  →  ${r.why}`)
    const hint = foreignKeyHint(a.id)
    if (hint) {
      console.log(`      ↳ この形は ${hint} です。`)
    } else if (isAccessKey(a.id)) {
      console.log('      ↳ これはアクセスキーです。アプリケーションID（UUID形式）も一緒に渡してください。')
    } else if (!isAppId(a.id)) {
      console.log('      ↳ アプリケーションIDは UUID 形式（8-4-4-4-12）です。値を確認してください。')
    }
  }
}

console.log()
if (winner) {
  console.log('.env.local に以下を設定してください:')
  console.log(`  RAKUTEN_APP_ID=${winner.id}`)
  if (winner.key) console.log(`  RAKUTEN_ACCESS_KEY=${winner.key}`)
  console.log('設定後、開発サーバーを再起動（Ctrl+C → npm run dev）してください。')
} else {
  console.log('どちらの組み合わせも通りませんでした。')
  console.log('https://webservice.rakuten.co.jp/app/list の「詳細を見る」を開き、')
  console.log('アプリケーションID と アクセスキー をコピーボタンで取得して再実行してください:')
  console.log('  node scripts/check-rakuten-key.mjs <アプリケーションID> <アクセスキー>')
}
