import { NextResponse } from 'next/server'
import { buildRecommendation } from '../../../lib/recommend'
import { saveUserDiagnosis } from '../../../lib/userRepository'
import { parseDiagnosisInput } from '../../../lib/validation'

// POST /api/diagnosis
// body: { skin, color, style, auth_id? }
// 診断結果を検証 → users に保存（任意）→ タグベースのレコメンドを JSON で返す
export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'JSON の解析に失敗しました' }, { status: 400 })
  }

  const parsed = parseDiagnosisInput(body)
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 })
  }

  // 保存（Supabase 未設定 / auth_id 無しなら自動でスキップ）
  const save = await saveUserDiagnosis(parsed.result, parsed.authId)

  // コアアルゴリズムで手順を生成
  const recommendation = buildRecommendation(parsed.result)

  return NextResponse.json({
    ...recommendation,
    saveStatus: save.status,
  })
}
