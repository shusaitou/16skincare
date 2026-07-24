// 診断・レコメンドで共有する型定義
// Supabase の実テーブル（makeup_techniques / technique_tags / options / users）に対応。
//   - 肌質:  options の score_dry / score_oily に対応（dry / oily）
//   - カラー: options の score_spring/summer/autumn/winter に対応（4シーズン）
//   - 系統:  診断質問ではなくユーザーが直接選ぶ嗜好（technique_tags の style タグ）
//   - 性別:  ユーザーが冒頭で選択。手法側は対象性別(gender)を持ち出し分ける
//
// ※ gender / ingredients / products は現行DBスキーマに未定義。
//   DB化する際は makeup_techniques への gender 列追加＋技法-成分/製品の子テーブルが必要。

export type SkinType = 'dry' | 'oily'
export type ColorType = 'spring' | 'summer' | 'autumn' | 'winter'
export type StyleType = 'mode' | 'clean' | 'glow'

// ユーザーが選ぶ性別（診断の出し分けに使用）
export type Gender = 'men' | 'women'
// 手法側の対象性別（unisex = 全員に適用）
export type TechniqueGender = 'unisex' | 'men' | 'women'

// technique_tags.tag_type
export type TagType = 'skin' | 'color' | 'style'

// technique_tags.tag_value（tag_type ごとに取りうる値）
export type TagValue = SkinType | ColorType | StyleType

// 手法に対する適性・系統タグ（= technique_tags テーブル1行）
export interface TechniqueTag {
  technique_id: string
  tag_type: TagType
  tag_value: TagValue
}

// 代表製品の例（実在製品を「一例」として提示。成分・使用は各製品表示を優先）
export interface Product {
  name: string
  brand: string
  category: string // 例: 化粧水 / 日焼け止め / ファンデーション
}

// メイク手法・スキンケア手順のマスター（= makeup_techniques テーブル1行 + 拡張）
export interface MakeupTechnique {
  id: string
  step_order: number
  description: string
  image_url?: string
  gender: TechniqueGender // 対象性別（unisex は全員）
  ingredients?: string[] // 注目すべき成分
  products?: Product[] // 代表製品の例
  tags: TechniqueTag[]
}

// 診断結果（性別＋適性(肌質・カラー)＋嗜好(なりたい系統)）
export interface DiagnosisResult {
  gender: Gender
  skin: SkinType
  color: ColorType
  style: StyleType
}

// レコメンド結果の1ステップ
export interface RecommendedStep {
  id: string
  step_order: number
  description: string
  image_url?: string
  ingredients?: string[]
  products?: Product[]
  // 補正処理で先頭に自動挿入されたステップかどうか
  isCorrection?: boolean
}

// フロントに返す最終レスポンス
export interface RecommendationResponse {
  result: DiagnosisResult
  steps: RecommendedStep[]
  // どの矛盾を検出し補正したかの説明（UI表示 / デバッグ用）
  correctionReason?: string
}
