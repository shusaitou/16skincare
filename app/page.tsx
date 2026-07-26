import React from 'react'
import Link from 'next/link'

export default function Home() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-20">
      <p className="text-xs tracking-editorial text-accent mb-4">
        PERSONALIZED SKINCARE &amp; MAKEUP
      </p>
      <h1 className="font-serif text-4xl sm:text-5xl text-ink leading-tight mb-6">
        あなたの肌と
        <br />
        なりたい印象から、
        <br />
        最適な一手を。
      </h1>
      <p className="text-muted leading-relaxed mb-10 max-w-lg">
        肌質 × パーソナルカラー × なりたい系統をMBTI風に診断。
        メンズ・レディースそれぞれに、具体的な成分と代表製品まで含めた
        スキンケア・メイクの手順を提案します。
      </p>
      <div className="flex flex-wrap items-center gap-4">
        <Link
          href="/diagnosis"
          className="inline-block px-8 py-4 bg-ink text-cream rounded-sm hover:bg-accent transition-colors tracking-editorial text-sm"
        >
          診断を始める →
        </Link>
        <Link
          href="/cosmetics"
          className="inline-block px-8 py-4 border border-line text-ink rounded-sm hover:border-accent hover:text-accent transition-colors tracking-editorial text-sm"
        >
          手持ちのコスメを登録
        </Link>
        <Link
          href="/mypage"
          className="inline-block px-8 py-4 border border-line text-ink rounded-sm hover:border-accent hover:text-accent transition-colors tracking-editorial text-sm"
        >
          マイページ
        </Link>
      </div>

      <div className="mt-16 grid grid-cols-1 sm:grid-cols-2 gap-px bg-line border border-line rounded-sm overflow-hidden">
        {[
          { t: '肌質診断', d: '乾燥／脂性を見極める' },
          { t: 'パーソナルカラー', d: '4シーズンで判定' },
          { t: '成分・製品提案', d: '注目成分と代表製品の例' },
          { t: '手持ちで代替', d: '買わずに済む工程が分かる' },
          { t: '時短モード', d: '時間がない日は3ステップ' },
          { t: '診断履歴', d: '再診断で肌の変化を比較' },
          { t: 'お気に入り', d: '手順・製品をブックマーク' },
          { t: 'ルーティン記録', d: '毎日チェックして継続を可視化' },
        ].map((f) => (
          <div key={f.t} className="bg-ivory p-6">
            <p className="font-serif text-lg text-ink mb-1">{f.t}</p>
            <p className="text-sm text-muted">{f.d}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
