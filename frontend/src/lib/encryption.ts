/**
 * VeilSub Encryption Utilities
 *
 * AES-256-GCM encryption for address storage in Supabase.
 * SHA-256 hashing for deterministic address lookups.
 *
 * Privacy model: Aleo addresses are encrypted before storage in Supabase.
 * Only hashed addresses are used as lookup keys — no plaintext addresses
 * ever appear in the database.
 */

let _cachedKey: string | null = null

function getEncryptionKey(): string {
  if (_cachedKey) return _cachedKey
  const key = process.env.SUPABASE_ENCRYPTION_KEY
  if (key) {
    _cachedKey = key
    return key
  }
  // In production runtime (not build), warn loudly about missing key
  if (process.env.NODE_ENV === 'production' && typeof window === 'undefined') {
    console.error('[encryption] CRITICAL: SUPABASE_ENCRYPTION_KEY not set in production — using dev fallback')
  } else if (typeof window === 'undefined') {
    console.warn('[encryption] SUPABASE_ENCRYPTION_KEY not set — using dev fallback')
  }
  _cachedKey = 'veilsub-dev-key-not-for-production'
  return _cachedKey
}

async function getKeyMaterial(password: string): Promise<CryptoKey> {
  const enc = new TextEncoder()
  return crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, [
    'deriveKey',
  ])
}

async function deriveKey(keyMaterial: CryptoKey, salt: Uint8Array): Promise<CryptoKey> {
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

/**
 * Encrypt a plaintext string using AES-256-GCM.
 * Returns a base64-encoded string containing: salt (16 bytes) + iv (12 bytes) + ciphertext.
 */
export async function encrypt(plaintext: string): Promise<string> {
  const enc = new TextEncoder()
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const keyMaterial = await getKeyMaterial(getEncryptionKey())
  const key = await deriveKey(keyMaterial, salt)
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    enc.encode(plaintext)
  )

  const combined = new Uint8Array(salt.length + iv.length + ciphertext.byteLength)
  combined.set(salt, 0)
  combined.set(iv, salt.length)
  combined.set(new Uint8Array(ciphertext), salt.length + iv.length)

  let binary = ''
  for (let i = 0; i < combined.length; i++) {
    binary += String.fromCharCode(combined[i])
  }
  return btoa(binary)
}

/**
 * Decrypt a base64-encoded AES-256-GCM ciphertext.
 */
export async function decrypt(encoded: string): Promise<string> {
  const dec = new TextDecoder()
  const data = Uint8Array.from(atob(encoded), (c) => c.charCodeAt(0))
  const salt = data.slice(0, 16)
  const iv = data.slice(16, 28)
  const ciphertext = data.slice(28)
  const keyMaterial = await getKeyMaterial(getEncryptionKey())
  const key = await deriveKey(keyMaterial, salt)
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext
  )
  return dec.decode(plaintext)
}

/**
 * SHA-256 hash of an address for deterministic lookups.
 * Used as the primary key for finding creator profiles without exposing the address.
 */
export async function hashAddress(address: string): Promise<string> {
  const enc = new TextEncoder()
  if (typeof crypto === 'undefined' || !crypto.subtle) {
    // Fallback for non-secure contexts (HTTP dev environments)
    let hash = 0
    for (let i = 0; i < address.length; i++) {
      hash = ((hash << 5) - hash) + address.charCodeAt(i)
      hash |= 0
    }
    return Math.abs(hash).toString(16).padStart(16, '0')
  }
  const hash = await crypto.subtle.digest('SHA-256', enc.encode(address))
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}
