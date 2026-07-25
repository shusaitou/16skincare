import '../styles/globals.css'
import React from 'react'
import AuthProvider from '../components/AuthProvider'
import FavoritesProvider from '../components/FavoritesProvider'
import SiteHeader from '../components/SiteHeader'
import PwaRegister from '../components/PwaRegister'

// Next 13 では themeColor / viewport も metadata に含める
// （独立した viewport export は Next 14 以降）。
export const metadata = {
  title: '16 Skincare — パーソナライズドメイク提案',
  description: '肌質×パーソナルカラーで最適なスキンケア・メイクを提案',
  manifest: '/manifest.webmanifest',
  applicationName: '16 Skincare',
  themeColor: '#B5806A',
  viewport: {
    width: 'device-width',
    initialScale: 1,
    viewportFit: 'cover' as const,
  },
  appleWebApp: {
    capable: true,
    title: '16 Skincare',
    statusBarStyle: 'default' as const,
  },
  icons: {
    icon: '/icons/icon-192.png',
    apple: '/icons/apple-touch-icon.png',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>
        <AuthProvider>
          <FavoritesProvider>
            <SiteHeader />
            <main className="min-h-screen bg-cream text-ink">{children}</main>
          </FavoritesProvider>
        </AuthProvider>
        <PwaRegister />
      </body>
    </html>
  )
}
