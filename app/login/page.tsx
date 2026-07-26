'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../components/AuthProvider'

// ログイン / 新規登録。
//   - パスワード方式（既定）: メール確認をオフにしていれば登録後すぐ使える
//   - マジックリンク方式: パスワード不要。メールのリンクから戻ってくる
type Mode = 'signin' | 'signup' | 'magic'

const MODE_LABEL: Record<Mode, string> = {
  signin: 'ログイン',
  signup: '新規登録',
  magic: 'メールでログイン',
}

export default function LoginPage() {
  const router = useRouter()
  const { user, loading, configured } = useAuth()

  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  // 既にログイン済みならマイページへ
  useEffect(() => {
    if (!loading && user) router.replace('/mypage')
  }, [loading, user, router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!supabase) return
    setError(null)
    setNotice(null)
    setSubmitting(true)

    try {
      if (mode === 'magic') {
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: { emailRedirectTo: `${window.location.origin}/mypage` },
        })
        if (error) throw error
        setNotice('ログイン用のリンクをメールで送りました。メールを確認してください。')
      } else if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        // メール確認が有効な場合、session は返ってこない
        if (!data.session) {
          setNotice('確認メールを送りました。リンクを開くと登録が完了します。')
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      }
    } catch (err) {
      setError(toJapaneseError(err))
    } finally {
      setSubmitting(false)
    }
  }

  if (!configured) {
    return (
      <div className="max-w-md mx-auto px-6 py-20">
        <h1 className="font-serif text-2xl text-ink mb-3">アカウント機能は未設定です</h1>
        <p className="text-sm text-muted leading-relaxed mb-6">
          <code className="text-ink">.env.local</code> に{' '}
          <code className="text-ink">NEXT_PUBLIC_SUPABASE_URL</code> と{' '}
          <code className="text-ink">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> を設定すると、
          診断履歴やお気に入りをアカウントに保存できるようになります。
        </p>
        <p className="text-sm text-muted leading-relaxed mb-8">
          未設定でも、履歴・お気に入り・ルーティン記録はこの端末のブラウザに保存されます。
        </p>
        <Link href="/mypage" className="text-sm text-accent hover:text-ink">
          マイページを見る →
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto px-6 py-16">
      <p className="text-xs tracking-editorial text-accent mb-2">ACCOUNT</p>
      <h1 className="font-serif text-3xl text-ink leading-tight mb-3">{MODE_LABEL[mode]}</h1>
      <p className="text-sm text-muted leading-relaxed mb-8">
        ログインすると、診断履歴・お気に入り・ルーティンの記録がアカウントに保存され、
        別の端末からも続きを見られます。
      </p>

      {/* モード切り替え */}
      <div className="flex gap-px bg-line border border-line rounded-sm overflow-hidden mb-6">
        {(['signin', 'signup', 'magic'] as Mode[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => {
              setMode(m)
              setError(null)
              setNotice(null)
            }}
            className={`flex-1 px-3 py-2.5 text-sm transition-colors ${
              mode === m ? 'bg-ink text-cream' : 'bg-ivory text-muted hover:text-ink'
            }`}
          >
            {MODE_LABEL[m]}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block">
          <span className="text-xs tracking-editorial text-muted">メールアドレス</span>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1.5 w-full bg-ivory border border-line rounded-sm px-4 py-3 text-ink outline-none focus:border-accent"
            placeholder="you@example.com"
          />
        </label>

        {mode !== 'magic' && (
          <label className="block">
            <span className="text-xs tracking-editorial text-muted">パスワード（6文字以上）</span>
            <input
              type="password"
              required
              minLength={6}
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1.5 w-full bg-ivory border border-line rounded-sm px-4 py-3 text-ink outline-none focus:border-accent"
              placeholder="••••••••"
            />
          </label>
        )}

        {error && (
          <p className="text-sm text-ink bg-accent-soft border border-accent/30 rounded-sm p-3 leading-relaxed">
            {error}
          </p>
        )}
        {notice && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-sm text-ink bg-ivory border border-line rounded-sm p-3 leading-relaxed"
          >
            {notice}
          </motion.p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full px-6 py-3.5 bg-ink text-cream rounded-sm hover:bg-accent transition-colors disabled:opacity-50 tracking-editorial text-sm"
        >
          {submitting ? '処理中…' : MODE_LABEL[mode]}
        </button>
      </form>

      <p className="text-xs text-muted mt-8 leading-relaxed">
        ログインしなくても診断は利用できます。その場合、履歴やお気に入りはこの端末にのみ保存されます
        （ログイン時にアカウントへ引き継がれます）。
      </p>
    </div>
  )
}

// Supabase の英語エラーを、よくあるものだけ日本語にする
function toJapaneseError(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err)
  if (/Invalid login credentials/i.test(message)) {
    return 'メールアドレスまたはパスワードが正しくありません。'
  }
  if (/User already registered/i.test(message)) {
    return 'このメールアドレスは既に登録されています。「ログイン」からお試しください。'
  }
  if (/Password should be at least/i.test(message)) {
    return 'パスワードは6文字以上で設定してください。'
  }
  if (/Email not confirmed/i.test(message)) {
    return 'メールアドレスの確認が済んでいません。確認メールのリンクを開いてください。'
  }
  if (/rate limit|too many/i.test(message)) {
    return '試行回数が多すぎます。しばらく待ってからもう一度お試しください。'
  }
  return message
}
