// 診断・レコメンドで共有する型定義
// Supabase のテーブル形状（makeup_techniques / technique_tags）に対応させ、
// 後でモックデータを DB クエリに差し替えるだけで動くようにしている。

export type SkinType = 'dry' | 'oily' | 'combination'
export type ColorType = 'warm' | 'cool'
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
export interface MakeupTechnique {
  id: string
  step_order: number
  title: string
  description: string
  image_url?: string
  // 正規化前提だが、フロントで扱いやすいよう tags を同梱しておく
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
  title: string
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
