'use client'

import { useEffect } from 'react'

// Service Worker を登録するだけのコンポーネント（描画なし）。
// 開発中は Next.js の HMR とキャッシュが衝突するため、本番ビルドでのみ登録する。
export default function PwaRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return

    const register = () => {
      navigator.serviceWorker.register('/sw.js').catch((e) => {
        console.warn('Service Worker の登録に失敗しました', e)
      })
    }

    // 初回表示を邪魔しないよう load 後に登録する
    if (document.readyState === 'complete') register()
    else {
      window.addEventListener('load', register)
      return () => window.removeEventListener('load', register)
    }
  }, [])

  return null
}
