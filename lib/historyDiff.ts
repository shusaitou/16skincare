import { colorLabel, skinLabel, styleLabel } from './recommend'
import type { DiagnosisHistoryEntry, DiagnosisResult } from './types'

// 再診断で「何が変わったか」を出すための差分計算。
// マイページの履歴一覧で、1つ前の診断と比べて表示する。

export interface DiagnosisChange {
  axis: string // 変化した軸の表示名
  from: string
  to: string
}

// prev → next で変化した軸だけを返す（性別は診断ではなく設定なので対象外）
export function diffResults(prev: DiagnosisResult, next: DiagnosisResult): DiagnosisChange[] {
  const changes: DiagnosisChange[] = []
  if (prev.skin !== next.skin) {
    changes.push({ axis: '肌質', from: skinLabel(prev.skin), to: skinLabel(next.skin) })
  }
  if (prev.color !== next.color) {
    changes.push({
      axis: 'パーソナルカラー',
      from: colorLabel(prev.color),
      to: colorLabel(next.color),
    })
  }
  if (prev.style !== next.style) {
    changes.push({ axis: 'なりたい系統', from: styleLabel(prev.style), to: styleLabel(next.style) })
  }
  return changes
}

// 履歴（新しい順）を受け取り、各エントリに「1つ前との差分」を添えて返す
export interface HistoryEntryWithDiff {
  entry: DiagnosisHistoryEntry
  changes: DiagnosisChange[]
  isFirst: boolean
}

export function withDiffs(historyDesc: DiagnosisHistoryEntry[]): HistoryEntryWithDiff[] {
  return historyDesc.map((entry, i) => {
    const prev = historyDesc[i + 1]
    return {
      entry,
      changes: prev ? diffResults(prev.result, entry.result) : [],
      isFirst: !prev,
    }
  })
}

// 日時の表示（例: 2026/07/25 14:30）
export function formatDateTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(
    d.getMinutes()
  )}`
}
