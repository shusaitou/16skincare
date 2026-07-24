// 診断・レコメンドで共有する型定義
// Supabase の実テーブル（makeup_techniques / technique_tags / options / users）に対応。
//   - 肌質:  options の score_dry / score_oily に対応（dry / oily）
//   - カラー: options の score_spring/summer/autumn/winter に対応（4シーズン）
//   - 系統:  診断質問ではなくユーザーが直接選ぶ嗜好（technique_tags の style タグ）

export type SkinType = 'dry' | 'oily'
export type ColorType = 'spring' | 'summer' | 'autumn' | 'winter'
export type StyleType = 'mode' | 'clean' | 'glow'

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

// メイク手法・スキンケア手順のマスター（= makeup_techniques テーブル1行）
// DB は title 列を持たず description のみ。tags はフロント都合で同梱。
export interface MakeupTechnique {
  id: string
  step_order: number
  description: string
  image_url?: string
  tags: TechniqueTag[]
}

// 診断結果（適性＝肌質・カラー / 嗜好＝なりたい系統）
export interface DiagnosisResult {
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
