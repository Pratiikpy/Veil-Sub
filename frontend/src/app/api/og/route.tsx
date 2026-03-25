import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const title = searchParams.get('title') || 'VeilSub'
  const creator = searchParams.get('creator') || ''

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: 'linear-gradient(135deg, #000000 0%, #1a1a1a 50%, #0a0a0a 100%)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '60px',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <div
          style={{
            fontSize: 48,
            fontWeight: 800,
            color: '#fafafa',
            marginBottom: 16,
            lineHeight: 1.2,
            maxWidth: '80%',
          }}
        >
          {title}
        </div>
        {creator && (
          <div style={{ fontSize: 24, color: '#8B5CF6', marginBottom: 8 }}>
            by {creator}
          </div>
        )}
        <div
          style={{
            fontSize: 20,
            color: '#666666',
            marginTop: 'auto',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: 'linear-gradient(135deg, #8B5CF6, #6D28D9)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 16,
              color: 'white',
              fontWeight: 700,
            }}
          >
            V
          </div>
          VeilSub — Private Creator Subscriptions
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  )
}
