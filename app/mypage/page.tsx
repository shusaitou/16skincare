'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { AnimatePresence, motion } from 'framer-motion'
import { useAuth } from '../../components/AuthProvider'
import HistoryList from '../../components/HistoryList'
import FavoritesList from '../../components/FavoritesList'
import RoutineChecklist from '../../components/RoutineChecklist'
import ReminderSettings from '../../components/ReminderSettings'
import InstallPrompt from '../../components/InstallPrompt'

type Tab = 'routine' | 'history' | 'favorites' | 'settings'

const TABS: { id: Tab; label: string }[] = [
  { id: 'routine', label: 'ルーティン' },
  { id: 'history', label: '診断履歴' },
  { id: 'favorites', label: 'お気に入り' },
  { id: 'settings', label: '設定' },
]

function isTab(value: string | null): value is Tab {
  return TABS.some((t) => t.id === value)
}

export default function MyPage() {
  const { user, loading, configured, signOut } = useAuth()
  const [tab, setTab] = useState<Tab>('routine')

  // 通知やホーム画面ショートカットの ?tab=... を反映する。
  // useSearchParams を使うとページ全体が SSR 対象外になり、初期表示が
  // ローディングだけになってしまうため、マウント後に URL から読む。
  useEffect(() => {
    const param = new URLSearchParams(window.location.search).get('tab')
    if (isTab(param)) setTab(param)
  }, [])

  // タブ切り替えを URL にも反映（リロードしても同じタブに戻る）
  function selectTab(next: Tab) {
    setTab(next)
    const url = new URL(window.location.href)
    url.searchParams.set('tab', next)
    window.history.replaceState(null, '', url)
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <header className="mb-8">
        <p className="text-xs tracking-editorial text-accent mb-2">MY PAGE</p>
        <h1 className="font-serif text-3xl text-ink leading-tight">マイページ</h1>

        {loading ? (
          <p className="text-sm text-muted mt-3">読み込み中…</p>
        ) : user ? (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-3">
            <p className="text-sm text-muted">
              {user.email} でログイン中 — 記録はアカウントに保存されます
            </p>
            <button
              onClick={() => void signOut()}
              className="text-sm text-accent hover:text-ink"
            >
              ログアウト
            </button>
          </div>
        ) : (
          <div className="mt-4 bg-accent-soft border border-accent/30 rounded-sm p-4">
            <p className="text-sm text-ink leading-relaxed">
              現在は<strong className="font-medium">この端末にのみ</strong>記録されています。
              {configured ? (
                <>
                  {' '}
                  <Link href="/login" className="text-accent underline underline-offset-2">
                    ログイン
                  </Link>
                  すると、これまでの記録がアカウントに引き継がれ、別の端末からも見られます。
                </>
              ) : (
                <> Supabase の環境変数を設定すると、アカウント保存が有効になります。</>
              )}
            </p>
          </div>
        )}
      </header>

      {/* タブ */}
      <div className="flex gap-px bg-line border border-line rounded-sm overflow-hidden mb-8">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => selectTab(t.id)}
            aria-current={tab === t.id}
            className={`flex-1 px-2 py-2.5 text-sm transition-colors ${
              tab === t.id ? 'bg-ink text-cream' : 'bg-ivory text-muted hover:text-ink'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.18 }}
        >
          {tab === 'routine' && <RoutineChecklist />}
          {tab === 'history' && <HistoryList />}
          {tab === 'favorites' && <FavoritesList />}
          {tab === 'settings' && (
            <div className="space-y-6">
              <ReminderSettings />
              <InstallPrompt />
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
