import React from 'react'
import Link from 'next/link'

export default function Home() {
  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-4">16 Skincare — 診断デモ</h1>
      <p className="mb-6">MBTI風診断とタグベースのレコメンドのプロトタイプです。</p>
      <div className="space-x-3">
        <Link href="/diagnosis" className="px-4 py-2 bg-blue-600 text-white rounded">診断を始める（雛形）</Link>
      </div>
    </div>
  )
}
