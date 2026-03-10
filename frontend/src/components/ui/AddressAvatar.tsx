import React from 'react'

interface Props {
  address: string
  size?: number
  className?: string
}

/**
 * Deterministic gradient avatar derived from an Aleo address hash.
 * Shared across homepage (creator cards) and creator detail page.
 */
function AddressAvatar({ address, size = 40, className = '' }: Props) {
  const hash = address.split('').reduce((a, c) => ((a << 5) - a + c.charCodeAt(0)) | 0, 0)
  const hue1 = Math.abs(hash % 360)
  const hue2 = (hue1 + 40 + Math.abs((hash >> 8) % 60)) % 360
  return (
    <div
      className={`rounded-2xl flex items-center justify-center shrink-0 ${className}`}
      style={{
        width: size,
        height: size,
        background: `linear-gradient(135deg, hsl(${hue1}, 60%, 50%), hsl(${hue2}, 70%, 40%))`,
      }}
    >
      <span
        className="text-white/90 font-bold select-none"
        style={{ fontSize: size < 48 ? '0.75rem' : '1.125rem' }}
      >
        {address.slice(5, 7).toUpperCase()}
      </span>
    </div>
  )
}

export default React.memo(AddressAvatar)
