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
        {/* Glass highlight */}
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
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          {/* Shield body */}
          <path
            d="M 12 1.5 L 3 5.5 L 3 11 C 3 16.5 6.8 21.5 12 23 C 17.2 21.5 21 16.5 21 11 L 21 5.5 Z"
            fill="rgba(255,255,255,0.15)"
            stroke="rgba(255,255,255,0.6)"
            strokeWidth="0.8"
          />
          {/* V cutout inside shield */}
          <path
            d="M 7.5 7.5 L 12 17.5 L 16.5 7.5 L 14 7.5 L 12 12.8 L 10 7.5 Z"
            fill="white"
          />
        </svg>
      </div>
    ),
    { ...size }
  )
}
