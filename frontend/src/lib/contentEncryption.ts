/**
 * Content Encryption at Rest — AES-256-GCM
 *
 * SERVER-SIDE ONLY: This module uses Node.js `crypto` and must never be
 * imported from client components or browser code.
 *
 * Privacy model:
 *   - Every post body and preview is encrypted before storage in Redis.
 *   - Per-creator keys are derived via HMAC-SHA256(SERVER_SECRET, creator_address).
 *   - A raw Redis/Supabase dump yields only encrypted garbage.
 *   - Old (pre-encryption) posts are detected by format and returned as-is.
 *
 * Wire format: `<iv_b64>:<authTag_b64>:<ciphertext_b64>`
 */

import { createCipheriv, createDecipheriv, randomBytes, createHmac } from 'crypto'

const ALGORITHM = 'aes-256-gcm' as const
const IV_BYTES = 12
const AUTH_TAG_BYTES = 16

function getServerSecret(): string {
  const secret = process.env.CONTENT_ENCRYPTION_SECRET
  if (secret) return secret
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      '[VeilSub] CONTENT_ENCRYPTION_SECRET is required in production. ' +
      'Generate one: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))" ' +
      'Then add it to your Vercel environment variables.'
    )
  }
  // Dev-only fallback — never runs in production
  return 'veilsub-default-content-key-change-in-production'
}

/**
 * Derive a per-creator 256-bit encryption key from the server secret
 * and the creator's Aleo address.
 */
export function deriveCreatorKey(creatorIdentifier: string): Buffer {
  return createHmac('sha256', getServerSecret())
    .update(creatorIdentifier)
    .digest()
}

/**
 * Encrypt plaintext content for a specific creator.
 * Returns the wire format string: `iv:authTag:ciphertext` (all base64).
 * Empty strings are returned as-is (nothing to protect).
 */
export function encryptContent(plaintext: string, creatorIdentifier: string): string {
  if (plaintext === '') return ''
  const key = deriveCreatorKey(creatorIdentifier)
  const iv = randomBytes(IV_BYTES)
  const cipher = createCipheriv(ALGORITHM, key, iv)

  let encrypted = cipher.update(plaintext, 'utf8', 'base64')
  encrypted += cipher.final('base64')
  const authTag = cipher.getAuthTag()

  return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`
}

/**
 * Decrypt content that was encrypted with `encryptContent`.
 * If the data does not match the encrypted wire format (legacy unencrypted post),
 * returns the input unchanged for backward compatibility.
 */
export function decryptContent(encryptedData: string, creatorIdentifier: string): string {
  if (!isEncrypted(encryptedData)) {
    return encryptedData
  }

  const [ivB64, tagB64, ciphertext] = encryptedData.split(':')
  const key = deriveCreatorKey(creatorIdentifier)
  const iv = Buffer.from(ivB64, 'base64')
  const authTag = Buffer.from(tagB64, 'base64')

  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)

  let decrypted = decipher.update(ciphertext, 'base64', 'utf8')
  decrypted += decipher.final('utf8')
  return decrypted
}

/**
 * Detect whether a string is in the encrypted wire format.
 * Encrypted data has exactly 3 colon-separated base64 segments where:
 *   - segment 0 (IV) is 16 chars of base64 (12 bytes)
 *   - segment 1 (authTag) is 24 chars of base64 (16 bytes)
 *   - segment 2 (ciphertext) is non-empty base64
 */
export function isEncrypted(data: string): boolean {
  const parts = data.split(':')
  if (parts.length !== 3) return false
  const [ivB64, tagB64, ciphertext] = parts
  // IV: 12 bytes -> 16 base64 chars, AuthTag: 16 bytes -> 24 base64 chars
  if (ivB64.length !== 16 || tagB64.length !== 24 || ciphertext.length === 0) return false
  // Quick base64 validity check
  const b64Re = /^[A-Za-z0-9+/=]+$/
  return b64Re.test(ivB64) && b64Re.test(tagB64) && b64Re.test(ciphertext)
}
