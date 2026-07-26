'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { isValidJan } from '../lib/productLookup'

// バーコード（JAN）を読み取って手持ちコスメを登録するための入力。
//
// 読み取りには標準の BarcodeDetector API を使う。Chrome/Android では使えるが
// iOS Safari には無い。ライブラリを足すと依存が増えるので、
// **非対応環境では手入力にフォールバック**する方針にした
// （バーコードの数字は商品パッケージに印字されているので手でも打てる）。

// BarcodeDetector はまだ標準化途中で TS の型に無いため、使う分だけ宣言する
interface DetectedBarcode {
  rawValue: string
}
interface BarcodeDetectorLike {
  detect: (source: CanvasImageSource) => Promise<DetectedBarcode[]>
}
type BarcodeDetectorCtor = new (options?: { formats?: string[] }) => BarcodeDetectorLike

function getDetectorCtor(): BarcodeDetectorCtor | null {
  if (typeof window === 'undefined') return null
  const ctor = (window as unknown as { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector
  return ctor ?? null
}

type Props = {
  onDetect: (jan: string) => void
  onClose: () => void
}

export default function BarcodeScanner({ onDetect, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const rafRef = useRef<number | null>(null)
  const doneRef = useRef(false)

  const [supported, setSupported] = useState<boolean | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [manual, setManual] = useState('')

  const stop = useCallback(() => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    rafRef.current = null
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
  }, [])

  useEffect(() => {
    const ctor = getDetectorCtor()
    if (!ctor || !navigator.mediaDevices?.getUserMedia) {
      setSupported(false)
      return
    }
    setSupported(true)

    let cancelled = false
    const detector = new ctor({ formats: ['ean_13', 'ean_8'] })

    ;(async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          // 背面カメラを優先（商品を写すため）
          video: { facingMode: { ideal: 'environment' } },
        })
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = stream
        const video = videoRef.current
        if (!video) return
        video.srcObject = stream
        await video.play()

        const tick = async () => {
          if (cancelled || doneRef.current || !videoRef.current) return
          try {
            const codes = await detector.detect(videoRef.current)
            const found = codes.map((c) => c.rawValue).find(isValidJan)
            if (found) {
              doneRef.current = true
              stop()
              onDetect(found)
              return
            }
          } catch {
            // 1フレームの読み取り失敗は無視して次のフレームへ
          }
          rafRef.current = requestAnimationFrame(() => void tick())
        }
        rafRef.current = requestAnimationFrame(() => void tick())
      } catch (e) {
        if (cancelled) return
        const name = (e as Error).name
        setError(
          name === 'NotAllowedError'
            ? 'カメラの使用が許可されませんでした。下の欄に数字を入力してください。'
            : 'カメラを起動できませんでした。下の欄に数字を入力してください。'
        )
      }
    })()

    return () => {
      cancelled = true
      stop()
    }
  }, [onDetect, stop])

  useEffect(() => stop, [stop])

  function submitManual(e: React.FormEvent) {
    e.preventDefault()
    const digits = manual.replace(/\D/g, '')
    if (!isValidJan(digits)) {
      setError('バーコードの数字が正しくありません。13桁（または8桁）を確認してください。')
      return
    }
    setError(null)
    stop()
    onDetect(digits)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-ivory rounded-sm border border-line p-6"
    >
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <p className="text-xs tracking-editorial text-accent mb-1">BARCODE</p>
          <h3 className="font-serif text-xl text-ink">バーコードで登録</h3>
        </div>
        <button onClick={onClose} className="text-xs text-muted hover:text-accent shrink-0">
          閉じる
        </button>
      </div>

      {supported && !error && (
        <>
          <div className="relative bg-cream border border-line rounded-sm overflow-hidden">
            <video ref={videoRef} playsInline muted className="w-full h-56 object-cover" />
            {/* 読み取り位置の目安 */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-4/5 h-16 border-2 border-accent/70 rounded-sm" />
            </div>
          </div>
          <p className="text-xs text-muted mt-2 leading-relaxed">
            商品の裏側にあるバーコードを枠に合わせてください。
          </p>
        </>
      )}

      {supported === false && (
        <p className="text-sm text-muted leading-relaxed mb-3">
          このブラウザはカメラでのバーコード読み取りに対応していません
          （iPhone の Safari など）。パッケージに印字された数字を入力してください。
        </p>
      )}

      {error && (
        <p className="text-sm text-ink bg-accent-soft border border-accent/30 rounded-sm p-3 mb-3 leading-relaxed">
          {error}
        </p>
      )}

      {/* 手入力のフォールバックは常に出しておく（読めない商品もあるため） */}
      <form onSubmit={submitManual} className="mt-4 flex flex-wrap items-end gap-3">
        <label className="flex-1 min-w-[12rem]">
          <span className="text-xs tracking-editorial text-muted">バーコードの数字</span>
          <input
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            inputMode="numeric"
            placeholder="4987241167012"
            className="mt-1.5 w-full bg-cream border border-line rounded-sm px-4 py-3 text-ink outline-none focus:border-accent"
          />
        </label>
        <button
          type="submit"
          className="px-5 py-3 bg-ink text-cream rounded-sm hover:bg-accent transition-colors text-sm"
        >
          調べる
        </button>
      </form>
    </motion.div>
  )
}
