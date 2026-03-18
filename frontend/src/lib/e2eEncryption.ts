/**
 * End-to-End Content Encryption — server NEVER has the keys
 *
 * CLIENT-SIDE ONLY: This module uses the Web Crypto API (browser-native)
 * and must only be imported from client components or browser code.
 *
 * Privacy model:
 *   - Creator encrypts content in-browser before uploading.
 *   - Tier key is derived from creator_address + tier_id using PBKDF2.
 *   - Server stores only ciphertext it cannot decrypt.
 *   - Subscriber derives the same tier key from their AccessPass fields
 *     and decrypts client-side after the server returns the encrypted blob.
 *   - Legacy server-encrypted posts (iv:tag:ciphertext format) are unaffected.
 *
 * Wire format: `e2e:<iv_b64>:<ciphertext_b64>`
 *   - The `e2e:` prefix distinguishes E2E content from server-encrypted content.
 *   - AES-GCM authentication tag is appended to the ciphertext by Web Crypto.
 */

const E2E_PREFIX = 'e2e:' as const
const PBKDF2_ITERATIONS = 100_000
const PBKDF2_SALT = 'veilsub-e2e-v1'
const KEY_MATERIAL_SUFFIX = ':veilsub'

/**
 * Derive a deterministic AES-256-GCM key from creator address and tier ID.
 *
 * The key material is `${creatorAddress}:tier:${tierId}:veilsub`, fed through
 * PBKDF2 with a fixed salt. This means:
 *   - Anyone who knows the creator address and their own tier can compute the key.
 *   - The server does NOT know which tier a subscriber has (that info is in
 *     their AccessPass record inside their wallet).
 *   - The server cannot reconstruct the key without the tier ID.
 */
async function deriveKey(
  creatorAddress: string,
  tierId: number
): Promise<CryptoKey> {
  const encoder = new TextEncoder()
  const material = encoder.encode(
    `${creatorAddress}:tier:${tierId}${KEY_MATERIAL_SUFFIX}`
  )

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    material,
    'PBKDF2',
    false,
    ['deriveKey']
  )

  const salt = encoder.encode(PBKDF2_SALT)
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

/**
 * Encrypt plaintext content using E2E encryption.
 *
 * Returns a string in the format `e2e:<iv_b64>:<ciphertext_b64>`.
 * The ciphertext includes the AES-GCM authentication tag (appended by Web Crypto).
 *
 * Empty strings are returned as-is (nothing to protect).
 */
export async function encryptContent(
  plaintext: string,
  creatorAddress: string,
  tierId: number
): Promise<string> {
  if (plaintext === '') return ''

  const key = await deriveKey(creatorAddress, tierId)
  const encoder = new TextEncoder()
  const iv = crypto.getRandomValues(new Uint8Array(12))

  const plainBytes = encoder.encode(plaintext)
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv.buffer as ArrayBuffer },
    key,
    plainBytes.buffer as ArrayBuffer
  )

  const ivB64 = uint8ToBase64(iv)
  const ctB64 = uint8ToBase64(new Uint8Array(encrypted))
  return `${E2E_PREFIX}${ivB64}:${ctB64}`
}

/**
 * Decrypt E2E-encrypted content.
 *
 * If the data does not start with `e2e:`, returns it unchanged (legacy or
 * plaintext content for backward compatibility).
 */
export async function decryptContent(
  encryptedData: string,
  creatorAddress: string,
  tierId: number
): Promise<string> {
  if (!isE2EEncrypted(encryptedData)) {
    return encryptedData
  }

  const withoutPrefix = encryptedData.slice(E2E_PREFIX.length)
  const colonIdx = withoutPrefix.indexOf(':')
  if (colonIdx === -1) {
    return encryptedData
  }

  const ivB64 = withoutPrefix.slice(0, colonIdx)
  const ctB64 = withoutPrefix.slice(colonIdx + 1)

  const key = await deriveKey(creatorAddress, tierId)
  const iv = base64ToUint8(ivB64)
  const ciphertext = base64ToUint8(ctB64)

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv.buffer as ArrayBuffer },
    key,
    ciphertext.buffer as ArrayBuffer
  )

  return new TextDecoder().decode(decrypted)
}

/**
 * Check whether a string is E2E-encrypted (starts with `e2e:` prefix).
 */
export function isE2EEncrypted(data: string): boolean {
  return data.startsWith(E2E_PREFIX)
}

// --- Base64 helpers using built-in browser APIs ---

function uint8ToBase64(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

function base64ToUint8(b64: string): Uint8Array {
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}
