'use client'

import { useEffect } from 'react'

interface SuccessCheckProps {
  size?: number
  color?: string
  onComplete?: () => void
}

export default function SuccessCheck({
  size = 48,
  color = 'var(--success, #34D399)',
  onComplete,
}: SuccessCheckProps) {
  useEffect(() => {
    if (!onComplete) return
    const t = setTimeout(onComplete, 700)
    return () => clearTimeout(t)
  }, [onComplete])

  const cx = size / 2, cy = size / 2
  const r = size * 0.42
  const circ = 2 * Math.PI * r
  const sw = size * 0.05
  const check = `M${cx - size * 0.16} ${cy + size * 0.02} L${cx - size * 0.04} ${cy + size * 0.14} L${cx + size * 0.2} ${cy - size * 0.12}`
  const cLen = size * 0.56

  const css = `
    .sc-c{stroke-dasharray:${circ};stroke-dashoffset:${circ};animation:sc-dc .3s ease-out forwards}
    .sc-k{stroke-dasharray:${cLen};stroke-dashoffset:${cLen};animation:sc-dk .3s ease-out .3s forwards}
    .sc-e{animation:sc-b .1s ease-out .6s both}
    @keyframes sc-dc{to{stroke-dashoffset:0}}
    @keyframes sc-dk{to{stroke-dashoffset:0}}
    @keyframes sc-b{0%{transform:scale(1)}50%{transform:scale(1.08)}to{transform:scale(1)}}
    @media(prefers-reduced-motion:reduce){.sc-c,.sc-k{animation:none;stroke-dashoffset:0}.sc-e{animation:none}}`

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      fill="none"
      role="img"
      aria-label="Success"
      className="sc-e"
    >
      <style>{css}</style>
      <circle className="sc-c" cx={cx} cy={cy} r={r} stroke={color} strokeWidth={sw} strokeLinecap="round" />
      <path className="sc-k" d={check} stroke={color} strokeWidth={sw * 1.2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
