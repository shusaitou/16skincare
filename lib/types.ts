// 診断・レコメンドで共有する型定義
// Supabase の実テーブル（makeup_techniques / technique_tags / options / users）に対応。
//   - 肌質:  options の score_dry / score_oily に対応（dry / oily）
//   - カラー: options の score_spring/summer/autumn/winter に対応（4シーズン）
//   - 系統:  診断質問ではなくユーザーが直接選ぶ嗜好（technique_tags の style タグ）
//   - 性別:  ユーザーが冒頭で選択。手法側は対象性別(gender)を持ち出し分ける
//
// ※ gender / ingredients / products は現行DBスキーマに未定義。
//   DB化する際は makeup_techniques への gender 列追加＋技法-成分/製品の子テーブルが必要。

export type SkinType = 'dry' | 'oily' | 'combination' | 'normal'
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

// --- 塗り方ガイド（インタラクティブ手順カード用） -----------------------------
// 「顔のどこに・どのくらいの量・どの方向に」を図で示すためのデータ。
// 顔の部位。FaceMap.tsx の SVG 上の領域定義と1対1で対応する。
export type FaceArea =
  | 'face' // 顔全体
  | 'forehead' // 額
  | 'tzone' // T ゾーン（額＋鼻筋）
  | 'cheeks' // 頬
  | 'cheeks-high' // 頬の高い位置（頬骨）
  | 'under-eye' // 目の下
  | 'eyelid' // まぶた
  | 'lashes' // まつ毛のキワ
  | 'brows' // 眉
  | 'lips' // 唇
  | 'nose-bridge' // 鼻筋
  | 'jawline' // フェイスライン
  | 'chin' // あご

// 手の動かし方。矢印の向き（内側/外側など）の描画に使う。
export type ApplyMotion =
  | 'outward' // 内側から外側へ
  | 'inward' // 外側から内側へ
  | 'upward' // 斜め上へ引き上げる
  | 'downward' // 下方向へ
  | 'press' // 広げず、押さえる／のせる

// 1手順ぶんの塗り方ガイド（= 将来の technique_guides テーブル1行を想定）
export interface StepGuide {
  area: FaceArea
  motion: ApplyMotion
  amount?: string // 使う量（例: パール大）
  direction?: string // 動かし方の説明（例: 中心から外側へ）
  tip?: string // 初心者向けのコツ
  caution?: string // やりがちな失敗
}

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
  // 「時短・ミニマムメイク」に含める性別。
  // 性別ごとに指定するのは、同じ手法でも最低限に入るかが変わるため
  // （例: 化粧下地は女性の3ステップに入るが、男性は BB が兼ねる）。
  minimalFor?: Gender[]
  tags: TechniqueTag[]
}

// 手順の表示モード。full = フルルーティン / minimal = 3ステップの最低限メイク
export type RoutineMode = 'full' | 'minimal'

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
  // 時短（3ステップ）モードに含まれるステップかどうか。
  // steps は常に全件返し、この印で絞り込む。こうすると履歴に保存した
  // スナップショットからも、あとで時短モードを再現できる。
  isMinimal?: boolean
  // 「どこに・どのくらい・どの方向に」の図解データ
  guide?: StepGuide
}

// フロントに返す最終レスポンス
export interface RecommendationResponse {
  result: DiagnosisResult
  steps: RecommendedStep[]
  // どの矛盾を検出し補正したかの説明（UI表示 / デバッグ用）
  correctionReason?: string
}

// --- 手持ちコスメ -------------------------------------------------------------
// 「提案された製品を買わなくても、いま持っているもので代替できるか」を判定するために登録する。

// 色物コスメの色味。パーソナルカラーとの相性判定に使う。
//   - 4シーズンのいずれか: その季節の色みに寄っている
//   - neutral: どのタイプでも使いやすい（ベージュ・クリアなど）
//   - 未指定(undefined): 分からない → 「色味は要確認」として扱う（嘘をつかないため）
export type CosmeticTone = ColorType | 'neutral'

// 手持ちコスメ1件。category は手法側の Product.category と同じ語彙を使う。
//
// name が任意なのは、代替判定が **カテゴリしか見ていない** ため。
// 「リップを持っている」だけ登録できれば判定は成立するので、
// 製品名の入力を必須にして登録のハードルを上げない。
export interface OwnedCosmetic {
  id: string
  category: string
  name?: string
  brand?: string
  tone?: CosmeticTone
  // バーコードから登録した場合の JAN コード（再取得・重複判定に使う）
  jan?: string
  created_at: string // ISO8601
}

// --- アカウント機能（診断履歴 / お気に入り / ルーティン記録） -----------------
// ログイン中は Supabase、未ログイン時は localStorage に保存する（同じ型で扱う）。

// 診断履歴1件（= diagnosis_history テーブル1行）。
// steps は「その時に提案された手順」のスナップショット。
export interface DiagnosisHistoryEntry {
  id: string
  created_at: string // ISO8601
  result: DiagnosisResult
  totals: Record<string, number>
  steps: RecommendedStep[]
  correctionReason?: string
}

// お気に入りの対象種別（手順 / 製品）
export type FavoriteType = 'step' | 'product'

// お気に入り1件（= favorites テーブル1行）。
// label / sublabel は表示用スナップショットなので、一覧表示に再計算が要らない。
export interface FavoriteItem {
  type: FavoriteType
  key: string // 手順: technique_id / 製品: "brand::name"
  label: string
  sublabel?: string
  created_at: string // ISO8601
}

// ある1日のルーティン実施記録（date はローカル日付 'YYYY-MM-DD'）
export interface RoutineLog {
  date: string
  stepIds: string[]
}
