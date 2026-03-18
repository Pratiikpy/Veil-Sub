import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase'
import { rateLimit, getRateLimitResponse, getClientIp } from '@/lib/rateLimit'

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
}

/**
 * Image upload endpoint.
 *
 * Accepts two formats:
 *   1. multipart/form-data with a `file` field (preferred — real file upload)
 *   2. JSON body with `data` (base64) + `mimeType` (legacy fallback)
 *
 * When Supabase Storage is configured, files are uploaded to the
 * 'content-images' bucket and a persistent public URL is returned.
 * Otherwise, falls back to base64 data URLs.
 */
export async function POST(req: NextRequest) {
  // Rate limit: 10 uploads per minute per IP
  const ip = getClientIp(req)
  const { allowed } = rateLimit(`${ip}:upload`, 10)
  if (!allowed) return getRateLimitResponse()

  const contentType = req.headers.get('content-type') || ''

  // Branch: multipart form data (file upload)
  if (contentType.includes('multipart/form-data')) {
    return handleFileUpload(req)
  }

  // Branch: JSON body (legacy base64 upload)
  return handleBase64Upload(req)
}

async function handleFileUpload(req: NextRequest): Promise<NextResponse> {
  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
  }

  const file = formData.get('file')
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: 'Missing file field' }, { status: 400 })
  }

  // Validate MIME type
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: `Unsupported image type. Allowed: ${ALLOWED_TYPES.join(', ')}` },
      { status: 400 }
    )
  }

  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: `Image too large (max ${MAX_FILE_SIZE / 1024 / 1024}MB)` },
      { status: 400 }
    )
  }

  // Try Supabase Storage first
  const supabase = getServerSupabase()
  if (supabase) {
    try {
      const ext = MIME_TO_EXT[file.type] || 'bin'
      // Use crypto.randomUUID() for secure filename generation
      const randomId = crypto.randomUUID().replace(/-/g, '').slice(0, 12)
      const path = `uploads/${Date.now()}-${randomId}.${ext}`
      const buffer = Buffer.from(await file.arrayBuffer())

      const { error } = await supabase.storage
        .from('content-images')
        .upload(path, buffer, {
          contentType: file.type,
          upsert: false,
        })

      if (!error) {
        const { data: urlData } = supabase.storage
          .from('content-images')
          .getPublicUrl(path)

        return NextResponse.json({ url: urlData.publicUrl })
      }

      // If storage bucket doesn't exist or upload fails, fall through to base64
      console.error('[api/upload] Supabase Storage upload failed:', error.message)
    } catch (err) {
      console.error('[api/upload] Supabase Storage error:', err)
    }
  }

  // Fallback: convert file to base64 data URL
  try {
    const buffer = Buffer.from(await file.arrayBuffer())
    const base64 = buffer.toString('base64')
    const dataUrl = `data:${file.type};base64,${base64}`
    return NextResponse.json({ url: dataUrl })
  } catch {
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}

async function handleBase64Upload(req: NextRequest): Promise<NextResponse> {
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

    // Try uploading to Supabase Storage if configured
    const supabase = getServerSupabase()
    if (supabase) {
      try {
        const ext = MIME_TO_EXT[mimeType] || 'bin'
        // Use crypto.randomUUID() for secure filename generation
        const randomId = crypto.randomUUID().replace(/-/g, '').slice(0, 12)
        const path = `uploads/${Date.now()}-${randomId}.${ext}`
        const buffer = Buffer.from(base64Data, 'base64')

        const { error } = await supabase.storage
          .from('content-images')
          .upload(path, buffer, {
            contentType: mimeType,
            upsert: false,
          })

        if (!error) {
          const { data: urlData } = supabase.storage
            .from('content-images')
            .getPublicUrl(path)

          return NextResponse.json({ url: urlData.publicUrl })
        }

        console.error('[api/upload] Supabase Storage base64 upload failed:', error.message)
      } catch (err) {
        console.error('[api/upload] Supabase Storage error:', err)
      }
    }

    // Fallback: return data URL
    const dataUrl = `data:${mimeType};base64,${base64Data}`
    return NextResponse.json({ url: dataUrl })
  } catch {
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
