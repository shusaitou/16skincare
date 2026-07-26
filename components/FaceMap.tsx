'use client'

import React from 'react'
import { motion } from 'framer-motion'
import type { ApplyMotion, FaceArea } from '../lib/types'

// 「顔のどこに・どの方向に」を示す SVG 顔マップ。
//
// AI 生成画像ではなく SVG にしているのは、位置と方向こそがこの図の情報であり、
// 座標で正確に指定できる必要があるため。全手順で同じ画風に揃い、
// オフラインでも表示でき、追加コストもかからない。
//
// 座標系は viewBox="0 0 200 250"。顔の中心は x=100。
// 左右対称の部位は「中心から見て外側」が自動で決まるよう、
// アンカーの x が 100 より小さいか大きいかで矢印の向きを反転させる。

const CENTER_X = 100

type Mark =
  | { kind: 'ellipse'; cx: number; cy: number; rx: number; ry: number; rotate?: number }
  | { kind: 'stroke'; d: string; width: number }

interface AreaDef {
  marks: Mark[]
  // 矢印の起点（左右対称の部位は2点）
  anchors: { x: number; y: number }[]
}

const AREAS: Record<FaceArea, AreaDef> = {
  face: {
    marks: [{ kind: 'ellipse', cx: 100, cy: 120, rx: 56, ry: 74 }],
    anchors: [{ x: 74, y: 130 }, { x: 126, y: 130 }],
  },
  forehead: {
    marks: [{ kind: 'ellipse', cx: 100, cy: 73, rx: 42, ry: 16 }],
    anchors: [{ x: 100, y: 73 }],
  },
  tzone: {
    // 額と鼻筋の2か所。額は眉にかからないよう上寄せにしている
    marks: [
      { kind: 'ellipse', cx: 100, cy: 72, rx: 40, ry: 15 },
      { kind: 'ellipse', cx: 100, cy: 126, rx: 12, ry: 26 },
    ],
    anchors: [{ x: 100, y: 100 }],
  },
  cheeks: {
    marks: [
      { kind: 'ellipse', cx: 68, cy: 136, rx: 21, ry: 17 },
      { kind: 'ellipse', cx: 132, cy: 136, rx: 21, ry: 17 },
    ],
    anchors: [{ x: 68, y: 136 }, { x: 132, y: 136 }],
  },
  'cheeks-high': {
    marks: [
      { kind: 'ellipse', cx: 72, cy: 128, rx: 18, ry: 11, rotate: -12 },
      { kind: 'ellipse', cx: 128, cy: 128, rx: 18, ry: 11, rotate: 12 },
    ],
    anchors: [{ x: 72, y: 128 }, { x: 128, y: 128 }],
  },
  'under-eye': {
    marks: [
      { kind: 'ellipse', cx: 78, cy: 120, rx: 14, ry: 7 },
      { kind: 'ellipse', cx: 122, cy: 120, rx: 14, ry: 7 },
    ],
    anchors: [{ x: 78, y: 120 }, { x: 122, y: 120 }],
  },
  eyelid: {
    marks: [
      { kind: 'ellipse', cx: 78, cy: 103, rx: 16, ry: 9 },
      { kind: 'ellipse', cx: 122, cy: 103, rx: 16, ry: 9 },
    ],
    anchors: [{ x: 78, y: 103 }, { x: 122, y: 103 }],
  },
  lashes: {
    marks: [
      { kind: 'stroke', d: 'M 64 112 Q 78 118 92 111', width: 6 },
      { kind: 'stroke', d: 'M 108 111 Q 122 118 136 112', width: 6 },
    ],
    anchors: [{ x: 78, y: 114 }, { x: 122, y: 114 }],
  },
  brows: {
    marks: [
      { kind: 'stroke', d: 'M 63 93 Q 78 84 93 90', width: 8 },
      { kind: 'stroke', d: 'M 107 90 Q 122 84 137 93', width: 8 },
    ],
    anchors: [{ x: 78, y: 88 }, { x: 122, y: 88 }],
  },
  lips: {
    marks: [{ kind: 'ellipse', cx: 100, cy: 168, rx: 17, ry: 10 }],
    anchors: [{ x: 100, y: 168 }],
  },
  'nose-bridge': {
    marks: [{ kind: 'ellipse', cx: 100, cy: 126, rx: 9, ry: 27 }],
    anchors: [{ x: 100, y: 126 }],
  },
  jawline: {
    marks: [{ kind: 'stroke', d: 'M 47 145 Q 58 186 100 194 Q 142 186 153 145', width: 11 }],
    anchors: [{ x: 62, y: 168 }, { x: 138, y: 168 }],
  },
  chin: {
    marks: [{ kind: 'ellipse', cx: 100, cy: 184, rx: 17, ry: 11 }],
    anchors: [{ x: 100, y: 184 }],
  },
}

// 手の動かし方 → 矢印ベクトル。
// dx は「外側方向」を正とし、左半分のアンカーでは自動で反転させる。
const MOTION_VECTOR: Record<Exclude<ApplyMotion, 'press'>, { dx: number; dy: number }> = {
  outward: { dx: 26, dy: 0 },
  inward: { dx: -26, dy: 0 },
  upward: { dx: 20, dy: -18 },
  downward: { dx: 0, dy: 24 },
}

type Props = {
  area: FaceArea
  motion?: ApplyMotion
  // アニメーションを止める（シェア画像・印刷など静止して見せたいとき）
  animated?: boolean
  className?: string
}

export default function FaceMap({ area, motion: applyMotion = 'outward', animated = true, className }: Props) {
  const def = AREAS[area]

  return (
    <svg
      viewBox="0 0 200 250"
      className={className}
      role="img"
      aria-label={`塗る位置の図: ${area}`}
    >
      {/* --- 顔のベース（線画） --- */}
      <g fill="none" stroke="#E7DED4" strokeWidth={2} strokeLinecap="round">
        <ellipse cx={100} cy={120} rx={56} ry={74} />
        {/* 眉 */}
        <path d="M 64 93 Q 78 85 92 90" />
        <path d="M 108 90 Q 122 85 136 93" />
        {/* 目 */}
        <path d="M 66 108 Q 78 99 90 108 Q 78 116 66 108 Z" />
        <path d="M 110 108 Q 122 99 134 108 Q 122 116 110 108 Z" />
        {/* 鼻 */}
        <path d="M 100 116 L 100 140" />
        <path d="M 93 144 Q 100 148 107 144" />
        {/* 唇 */}
        <path d="M 84 166 Q 92 160 100 165 Q 108 160 116 166" />
        <path d="M 84 166 Q 100 178 116 166" />
      </g>
      {/* 瞳 */}
      <circle cx={78} cy={108} r={3.5} fill="#E7DED4" />
      <circle cx={122} cy={108} r={3.5} fill="#E7DED4" />

      {/* --- 塗る範囲のハイライト --- */}
      <g>
        {def.marks.map((mark, i) => (
          <Highlight key={i} mark={mark} animated={animated} delay={i * 0.12} />
        ))}
      </g>

      {/* --- 動かす方向 --- */}
      <g>
        {applyMotion === 'press'
          ? def.anchors.map((a, i) => <PressMark key={i} x={a.x} y={a.y} animated={animated} delay={i * 0.2} />)
          : buildArrows(def.anchors, applyMotion).map((arrow, i) => (
              <Arrow key={i} {...arrow} animated={animated} delay={i * 0.2} />
            ))}
      </g>
    </svg>
  )
}

// 中央の部位（x=100）は左右どちらへ動かすか決まらないので、両方向に矢印を出す。
// 左右対称の部位は、中心から見て外側になるよう dx を反転する。
function buildArrows(
  anchors: { x: number; y: number }[],
  applyMotion: Exclude<ApplyMotion, 'press'>
): { x: number; y: number; dx: number; dy: number }[] {
  const v = MOTION_VECTOR[applyMotion]
  const arrows: { x: number; y: number; dx: number; dy: number }[] = []

  for (const a of anchors) {
    if (v.dx === 0) {
      arrows.push({ x: a.x, y: a.y, dx: 0, dy: v.dy })
      continue
    }
    if (a.x === CENTER_X) {
      arrows.push({ x: a.x, y: a.y, dx: v.dx, dy: v.dy })
      arrows.push({ x: a.x, y: a.y, dx: -v.dx, dy: v.dy })
      continue
    }
    const sign = a.x < CENTER_X ? -1 : 1
    arrows.push({ x: a.x, y: a.y, dx: v.dx * sign, dy: v.dy })
  }
  return arrows
}

function Highlight({ mark, animated, delay }: { mark: Mark; animated: boolean; delay: number }) {
  const pulse = animated
    ? { opacity: [0.28, 0.5, 0.28] }
    : { opacity: 0.42 }
  const transition = animated
    ? { duration: 2.4, repeat: Infinity, ease: 'easeInOut' as const, delay }
    : undefined

  if (mark.kind === 'ellipse') {
    return (
      <motion.ellipse
        cx={mark.cx}
        cy={mark.cy}
        rx={mark.rx}
        ry={mark.ry}
        transform={mark.rotate ? `rotate(${mark.rotate} ${mark.cx} ${mark.cy})` : undefined}
        fill="#B5806A"
        animate={pulse}
        transition={transition}
      />
    )
  }
  return (
    <motion.path
      d={mark.d}
      fill="none"
      stroke="#B5806A"
      strokeWidth={mark.width}
      strokeLinecap="round"
      animate={pulse}
      transition={transition}
    />
  )
}

function Arrow({
  x,
  y,
  dx,
  dy,
  animated,
  delay,
}: {
  x: number
  y: number
  dx: number
  dy: number
  animated: boolean
  delay: number
}) {
  const x2 = x + dx
  const y2 = y + dy
  // 矢印の先端（三角形）を進行方向に向ける
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI

  return (
    <motion.g
      initial={animated ? { opacity: 0 } : false}
      animate={
        animated
          ? { opacity: [0, 1, 1, 0], x: [0, dx * 0.18, dx * 0.3, dx * 0.3], y: [0, dy * 0.18, dy * 0.3, dy * 0.3] }
          : { opacity: 1 }
      }
      transition={
        animated
          ? { duration: 2.4, repeat: Infinity, times: [0, 0.3, 0.7, 1], ease: 'easeInOut', delay }
          : undefined
      }
    >
      <line x1={x} y1={y} x2={x2} y2={y2} stroke="#2B2622" strokeWidth={2.5} strokeLinecap="round" />
      <polygon
        points="0,-4.5 9,0 0,4.5"
        fill="#2B2622"
        transform={`translate(${x2} ${y2}) rotate(${angle})`}
      />
    </motion.g>
  )
}

// 「広げず押さえる」動きは、矢印ではなく“置く”印で表す
function PressMark({ x, y, animated, delay }: { x: number; y: number; animated: boolean; delay: number }) {
  return (
    <g>
      <circle cx={x} cy={y} r={4} fill="#2B2622" />
      <motion.circle
        cx={x}
        cy={y}
        r={4}
        fill="none"
        stroke="#2B2622"
        strokeWidth={2}
        initial={animated ? { scale: 1, opacity: 0.9 } : false}
        animate={animated ? { scale: [1, 2.6], opacity: [0.9, 0] } : { scale: 2, opacity: 0.35 }}
        transition={animated ? { duration: 2, repeat: Infinity, ease: 'easeOut', delay } : undefined}
        style={{ transformOrigin: `${x}px ${y}px` }}
      />
    </g>
  )
}
