import React from 'react'

interface Props {
  address: string
  size?: number
  className?: string
}

/**
 * Deterministic gradient avatar derived from an Aleo address hash.
 * Shared across homepage (creator cards) and creator detail page.
 * Uses violet/purple hue range to match VeilSub brand identity.
 */
function AddressAvatar({ address, size = 40, className = '' }: Props) {
  // Defensive guard: ensure address is a string before calling split
  const safeAddress = address || ''
  const hash = safeAddress.split('').reduce((a, c) => ((a << 5) - a + c.charCodeAt(0)) | 0, 0)
  // Constrain hues to violet/purple/blue range (220-320) for brand consistency
  const hue1 = 220 + Math.abs(hash % 100)
  const hue2 = (hue1 + 30 + Math.abs((hash >> 8) % 50)) % 360
  // Vary saturation and lightness for more visual distinction
  const sat1 = 50 + Math.abs((hash >> 16) % 30)
  const sat2 = 40 + Math.abs((hash >> 24) % 40)
  return (
    <div
      className={`rounded-2xl flex items-center justify-center shrink-0 shadow-lg ${className}`}
      style={{
        width: size,
        height: size,
        background: `linear-gradient(135deg, hsl(${hue1}, ${sat1}%, 45%), hsl(${hue2}, ${sat2}%, 35%))`,
      }}
    >
      <span
        className="text-white font-bold select-none drop-shadow-sm"
        style={{ fontSize: size < 48 ? '0.75rem' : '1.125rem' }}
      >
        {safeAddress.slice(5, 7).toUpperCase()}
      </span>
    </div>
  )
}

export default React.memo(AddressAvatar)
