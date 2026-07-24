import '../styles/globals.css'
import React from 'react'

export const metadata = {
  title: '16 Skincare — パーソナライズドメイク提案',
  description: '肌質×パーソナルカラーで最適なスキンケア・メイクを提案'
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>
        <main className="min-h-screen bg-cream text-ink">{children}</main>
      </body>
    </html>
  )
}
