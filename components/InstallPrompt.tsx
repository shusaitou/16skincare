'use client'

import React, { useEffect, useState } from 'react'

// beforeinstallprompt は仕様上まだ標準外なので、必要な形だけを自前で定義する
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

// ホーム画面への追加を促すカード。
//   - Android/Chrome: beforeinstallprompt を捕まえてワンタップでインストール
//   - iOS/Safari:     API が無いので手順を案内する
// 既にインストール済み（standalone 表示）なら何も出さない。
export default function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState(false)
  const [isIos, setIsIos] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      // iOS Safari 独自プロパティ
      (window.navigator as unknown as { standalone?: boolean }).standalone === true
    setInstalled(standalone)
    setIsIos(/iphone|ipad|ipod/i.test(window.navigator.userAgent))

    const onPrompt = (e: Event) => {
      e.preventDefault() // 既定のミニバーを止めて、こちらのタイミングで出す
      setDeferred(e as BeforeInstallPromptEvent)
    }
    const onInstalled = () => {
      setInstalled(true)
      setDeferred(null)
    }

    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  if (installed) return null
  if (!deferred && !isIos) return null

  return (
    <div className="bg-ivory rounded-sm border border-line p-6">
      <p className="text-xs tracking-editorial text-accent mb-1">HOME SCREEN</p>
      <h3 className="font-serif text-xl text-ink mb-2">ホーム画面に追加</h3>
      <p className="text-sm text-muted leading-relaxed mb-4">
        アプリとして追加しておくと、1タップで今日のルーティンを開けます（オフラインでも起動可）。
      </p>

      {deferred ? (
        <button
          type="button"
          onClick={async () => {
            await deferred.prompt()
            const { outcome } = await deferred.userChoice
            if (outcome === 'accepted') setInstalled(true)
            setDeferred(null) // プロンプトは1回しか使えない
          }}
          className="px-5 py-2.5 bg-ink text-cream rounded-sm hover:bg-accent transition-colors text-sm"
        >
          追加する
        </button>
      ) : (
        <p className="text-sm text-ink leading-relaxed">
          Safari の共有ボタン <span className="text-muted">（□に↑のアイコン）</span> をタップ →
          「ホーム画面に追加」を選んでください。
        </p>
      )}
    </div>
  )
}
