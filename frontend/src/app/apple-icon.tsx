import { ImageResponse } from 'next/og'

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 180,
          height: 180,
          borderRadius: 40,
          background: 'linear-gradient(135deg, #4c1d95 0%, #6d28d9 30%, #8b5cf6 65%, #a78bfa 100%)',
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
            top: -30,
            left: -10,
            width: 140,
            height: 100,
            borderRadius: '50%',
            background: 'radial-gradient(ellipse at center, rgba(255,255,255,0.2) 0%, transparent 70%)',
            display: 'flex',
          }}
        />
        {/* Inner ring */}
        <div
          style={{
            position: 'absolute',
            top: 7,
            left: 7,
            right: 7,
            bottom: 7,
            borderRadius: 34,
            border: '1.5px solid rgba(255,255,255,0.08)',
            display: 'flex',
          }}
        />
        <svg width="115" height="115" viewBox="0 0 24 24" fill="none">
          {/* Shield shadow */}
          <path
            d="M 12 1.5 L 3 5.5 L 3 11 C 3 16.5 6.8 21.5 12 23 C 17.2 21.5 21 16.5 21 11 L 21 5.5 Z"
            fill="rgba(0,0,0,0.1)"
            transform="translate(0, 0.5)"
          />
          {/* Shield body — translucent white */}
          <path
            d="M 12 1.5 L 3 5.5 L 3 11 C 3 16.5 6.8 21.5 12 23 C 17.2 21.5 21 16.5 21 11 L 21 5.5 Z"
            fill="rgba(255,255,255,0.13)"
            stroke="rgba(255,255,255,0.5)"
            strokeWidth="0.6"
          />
          {/* V inside shield — solid white */}
          <path
            d="M 7.5 7 L 12 17.5 L 16.5 7 L 13.8 7 L 12 12.2 L 10.2 7 Z"
            fill="white"
          />
        </svg>
      </div>
    ),
    { ...size }
  )
}
