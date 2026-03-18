import { NextRequest, NextResponse } from 'next/server'

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']

/**
 * Image upload endpoint — accepts base64 image data and returns a data URL.
 *
 * This is a simple approach for the hackathon. For production, images should
 * be stored in Supabase Storage, Cloudflare R2, or similar blob storage.
 *
 * Validates: file size (5MB max), MIME type (JPG/PNG/GIF/WebP only).
 */
export async function POST(req: NextRequest) {
  let payload
  try {
    payload = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  try {
    const { data, mimeType } = payload

    if (!data || typeof data !== 'string') {
      return NextResponse.json({ error: 'Missing image data' }, { status: 400 })
    }

    if (!mimeType || !ALLOWED_TYPES.includes(mimeType)) {
      return NextResponse.json(
        { error: `Unsupported image type. Allowed: ${ALLOWED_TYPES.join(', ')}` },
        { status: 400 }
      )
    }

    // Validate base64 string and check decoded size
    const base64Data = data.replace(/^data:[^;]+;base64,/, '')
    const estimatedSize = Math.ceil(base64Data.length * 0.75)

    if (estimatedSize > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `Image too large (max ${MAX_FILE_SIZE / 1024 / 1024}MB)` },
        { status: 400 }
      )
    }

    // Validate it's actual base64
    if (!/^[A-Za-z0-9+/=]+$/.test(base64Data)) {
      return NextResponse.json({ error: 'Invalid base64 encoding' }, { status: 400 })
    }

    // Return the data URL for now (simple approach for hackathon)
    // Production: upload to Supabase Storage and return a persistent URL
    const dataUrl = `data:${mimeType};base64,${base64Data}`

    return NextResponse.json({ url: dataUrl })
  } catch {
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
