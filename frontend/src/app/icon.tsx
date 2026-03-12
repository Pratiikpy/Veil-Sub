import { ImageResponse } from 'next/og'

export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          background: 'linear-gradient(135deg, #4c1d95 0%, #6d28d9 35%, #8b5cf6 70%, #a78bfa 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Top-left glass highlight */}
        <div
          style={{
            position: 'absolute',
            top: -8,
            left: -4,
            width: 28,
            height: 20,
            borderRadius: '50%',
            background: 'radial-gradient(ellipse at center, rgba(255,255,255,0.18) 0%, transparent 70%)',
            display: 'flex',
          }}
        />
        {/* Filled V letterform */}
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          {/* Drop shadow */}
          <path
            d="M 3.5 4 L 12 21.5 L 20.5 4 L 16.5 4 L 12 14.5 L 7.5 4 Z"
            fill="rgba(0,0,0,0.2)"
            transform="translate(0, 0.5)"
          />
          {/* Main V — filled for crispness */}
          <path
            d="M 3.5 4 L 12 21.5 L 20.5 4 L 16.5 4 L 12 14.5 L 7.5 4 Z"
            fill="white"
          />
        </svg>
      </div>
    ),
    { ...size }
  )
}
