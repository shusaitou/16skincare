'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from './AuthProvider'

// 全ページ共通のヘッダー。ログイン状態に応じて右側の導線を切り替える。
export default function SiteHeader() {
  const pathname = usePathname()
  const { user, loading, configured } = useAuth()

  const navLink = (href: string, label: string) => (
    <Link
      href={href}
      className={`text-sm transition-colors ${
        pathname === href ? 'text-ink' : 'text-muted hover:text-ink'
      }`}
    >
      {label}
    </Link>
  )

  return (
    <header className="border-b border-line bg-cream/90 backdrop-blur sticky top-0 z-20">
      <div className="max-w-3xl mx-auto px-6 h-14 flex items-center justify-between gap-4">
        <Link href="/" className="text-xs tracking-editorial text-accent shrink-0">
          16 SKINCARE
        </Link>

        <nav className="flex items-center gap-5">
          {navLink('/diagnosis', '診断')}
          {navLink('/mypage', 'マイページ')}
          {configured &&
            (loading ? (
              <span className="text-sm text-muted">…</span>
            ) : user ? (
              <span
                className="text-sm text-muted max-w-[9rem] truncate"
                title={user.email ?? undefined}
              >
                {user.email ?? 'ログイン中'}
              </span>
            ) : (
              <Link
                href="/login"
                className="text-sm px-3 py-1.5 bg-ink text-cream rounded-sm hover:bg-accent transition-colors"
              >
                ログイン
              </Link>
            ))}
        </nav>
      </div>
    </header>
  )
}
