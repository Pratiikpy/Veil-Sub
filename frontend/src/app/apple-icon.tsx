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
        {/* Top-left radial glass highlight */}
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
        {/* Subtle inner ring */}
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
        {/* Filled V letterform */}
        <svg width="105" height="105" viewBox="0 0 24 24" fill="none">
          {/* Subtle drop shadow */}
          <path
            d="M 3.5 3.8 L 12 21.2 L 20.5 3.8 L 16.2 3.8 L 12 13.8 L 7.8 3.8 Z"
            fill="rgba(0,0,0,0.12)"
            transform="translate(0, 0.6)"
          />
          {/* Main V — crisp filled shape */}
          <path
            d="M 3.5 3.8 L 12 21.2 L 20.5 3.8 L 16.2 3.8 L 12 13.8 L 7.8 3.8 Z"
            fill="white"
          />
        </svg>
      </div>
    ),
    { ...size }
  )
}
