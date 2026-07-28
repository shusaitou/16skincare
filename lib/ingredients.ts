// 手持ちコスメの全成分表示と、手順が挙げる「注目成分」を照合する。
//
// 【何を言えて、何を言えないか】
// 全成分表示から分かるのは「その成分が入っているか」だけ。
//   - 配合量は公開されない（1%以下は順不同で並ぶ規則のため、順序からも量は特定できない）
//   - 同じ成分でも処方全体で効き方は変わる
// したがって **「注目成分が入っている／見当たらない」までしか言わない**。
// 「同等の効果がある」「代替できる」と断定しない。色味判定と同じ方針。
//
// 【照合の仕組み】
// 手順側の注目成分は「ヒアルロン酸」のような総称、実際の表示は「ヒアルロン酸Na」
// 「加水分解ヒアルロン酸」のような個別名。そのため成分ファミリー単位で正規表現照合する。

export type IngredientVerdict =
  | 'present' // 注目成分が見つかった
  | 'absent' // 全成分は分かるが、見当たらない
  | 'unknown' // 成分データが無い
  | 'not-checkable' // 機能の呼び名で、成分名として照合できない

export interface IngredientCheck {
  required: string // 手順側の注目成分（表示用）
  verdict: IngredientVerdict
  // present のとき、実際に見つかった成分表示（例: ヒアルロン酸Na）
  found?: string[]
}

// 注目成分 → 全成分表示での探し方。
// キーは techniques.ts の ingredients に出てくる文字列と対応させる。
const FAMILY_PATTERNS: { key: RegExp; pattern: RegExp }[] = [
  { key: /ヒアルロン酸/, pattern: /ヒアルロン酸/ },
  { key: /セラミド/, pattern: /セラミド/ },
  { key: /^グリセリン$/, pattern: /グリセリン/ },
  { key: /スクワラン|ワセリン/, pattern: /スクワラン|ワセリン|ミネラルオイル/ },
  { key: /グリチルリチン酸/, pattern: /グリチルリチン酸|グリチルレチン酸/ },
  { key: /サリチル酸/, pattern: /サリチル酸/ },
  { key: /^シリカ$/, pattern: /シリカ|無水ケイ酸/ },
  { key: /ハトムギ/, pattern: /ハトムギ|ヨクイニン|コイクスエキス/ },
  {
    key: /UVカット成分/,
    // 紫外線散乱剤・吸収剤の代表例
    pattern:
      /酸化チタン|酸化亜鉛|メトキシケイヒ酸|オクトクリレン|ジエチルアミノヒドロキシベンゾイル|ビスエチルヘキシルオキシフェノール|t-ブチルメトキシジベンゾイルメタン/,
  },
  {
    key: /アミノ酸系洗浄成分/,
    // アミノ酸系界面活性剤の代表例
    pattern:
      /ココイルグルタミン酸|ラウロイルグルタミン酸|アシルグルタミン酸|ココイルメチルタウリン|ラウロイルメチルアラニン|ココイルグリシン|ココイルアラニン/,
  },
]

// 成分名ではなく「機能の呼び名」。全成分表示から機械的には判定できないので、
// 誤った○×を出さないよう最初から対象外にする。
const NOT_CHECKABLE = [/トーンアップ成分/, /パール／光拡散パウダー/, /皮脂吸着パウダー/]

/**
 * 全成分表示のテキストを成分ごとに分割する。
 * 日本語の全成分表示は「、」区切りが基本だが、カンマ・中点・改行も混ざる。
 * 「*」や括弧書きの補足（例: ヒアルロン酸Na*(スーパーヒアルロン酸)）も落とす。
 */
export function parseIngredientList(text: string): string[] {
  if (!text) return []
  return text
    .split(/[、,，・\n\/]+/)
    .map((s) =>
      s
        .replace(/[（(][^）)]*[）)]/g, '') // 括弧の補足を除去
        .replace(/[*＊※]/g, '')
        .trim()
    )
    .filter((s) => s.length > 0)
}

/** 1つの注目成分について、手持ちの成分リストに含まれるか判定する */
export function checkIngredient(required: string, list: string[]): IngredientCheck {
  if (NOT_CHECKABLE.some((p) => p.test(required))) {
    return { required, verdict: 'not-checkable' }
  }
  if (list.length === 0) {
    return { required, verdict: 'unknown' }
  }

  const rule = FAMILY_PATTERNS.find((r) => r.key.test(required))
  // ファミリー定義が無いものは、注目成分の文字列そのもので部分一致を試す
  const pattern = rule?.pattern ?? new RegExp(escapeRegExp(stripNote(required)))

  const found = list.filter((i) => pattern.test(i))
  return found.length > 0
    ? { required, verdict: 'present', found }
    : { required, verdict: 'absent' }
}

/** 手順の注目成分すべてについて判定する */
export function checkIngredients(required: string[], list: string[]): IngredientCheck[] {
  return required.map((r) => checkIngredient(r, list))
}

export interface IngredientSummary {
  present: number
  absent: number
  // 判定できた注目成分の数（unknown / not-checkable を除く）
  checked: number
  // 1つでも判定できたか（false なら成分の話は表示しない）
  hasData: boolean
}

export function summarizeIngredients(checks: IngredientCheck[]): IngredientSummary {
  const present = checks.filter((c) => c.verdict === 'present').length
  const absent = checks.filter((c) => c.verdict === 'absent').length
  return { present, absent, checked: present + absent, hasData: present + absent > 0 }
}

// 「グリチルリチン酸2K（抗炎症）」→「グリチルリチン酸2K」
function stripNote(s: string): string {
  return s.replace(/[（(][^）)]*[）)]/g, '').trim()
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
