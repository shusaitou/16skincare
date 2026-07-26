import { allProductCategories } from './substitution'

// カテゴリの並びとグルーピング。
// 「カテゴリをタップするだけで登録」を成立させるために、
// 手順の流れ（スキンケア → ベース → ポイント）と同じ順で並べる。

export interface CategoryGroup {
  label: string
  categories: string[]
}

// 手順の step_order と対応した並び。ここに載っていないカテゴリは「その他」に入る。
const GROUP_ORDER: { label: string; members: string[] }[] = [
  {
    label: 'スキンケア',
    members: ['洗顔料', '化粧水', '乳液', '保湿クリーム', '日焼け止め', 'アフターシェーブ'],
  },
  {
    label: 'ベースメイク',
    members: ['化粧下地', 'BB・下地', 'ファンデーション', 'コンシーラー', 'フェイスパウダー'],
  },
  {
    label: 'ポイントメイク',
    members: ['アイブロウ', 'アイシャドウ', 'アイライナー', 'マスカラ', 'チーク', 'リップ'],
  },
  {
    label: '仕上げ',
    members: ['ハイライト', 'シェーディング'],
  },
]

/**
 * 手法マスターに実在するカテゴリだけを、グループ分けして返す。
 * マスター側にカテゴリが増えても取りこぼさないよう、
 * どのグループにも属さないものは「その他」にまとめる。
 */
export function categoryGroups(): CategoryGroup[] {
  const all = new Set(allProductCategories())
  const groups: CategoryGroup[] = []
  const used = new Set<string>()

  for (const g of GROUP_ORDER) {
    const categories = g.members.filter((c) => all.has(c))
    for (const c of categories) used.add(c)
    if (categories.length > 0) groups.push({ label: g.label, categories })
  }

  const rest = [...all].filter((c) => !used.has(c)).sort()
  if (rest.length > 0) groups.push({ label: 'その他', categories: rest })

  return groups
}
