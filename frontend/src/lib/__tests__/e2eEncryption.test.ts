/**
 * Tests for client-side E2E content encryption.
 *
 * Uses Web Crypto API polyfill from Node.js (available since Node 15+).
 * Vitest runs in a Node environment, and crypto.subtle is available globally.
 */
import { describe, it, expect } from 'vitest'
import { encryptContent, decryptContent, isE2EEncrypted } from '../e2eEncryption'

const CREATOR_A = 'aleo1hp9m08faf27hr7yu686t6r52nj36g3k5n7ymjhyzsvxjp58epyxsprk5wk'
const CREATOR_B = 'aleo1yr9ls3d48sh0gkk8y4re9assy7rkfhp4g8x2jmd5vqxl0phdvyqq4qmhef'

describe('encryptContent / decryptContent', () => {
  it('round-trips a simple string', async () => {
    const plaintext = 'Hello, E2E encrypted world!'
    const encrypted = await encryptContent(plaintext, CREATOR_A, 1)
    const decrypted = await decryptContent(encrypted, CREATOR_A, 1)
    expect(decrypted).toBe(plaintext)
  })

  it('round-trips unicode content', async () => {
    const plaintext = 'Privacy matters. Aleo ZK proofs.'
    const encrypted = await encryptContent(plaintext, CREATOR_A, 2)
    const decrypted = await decryptContent(encrypted, CREATOR_A, 2)
    expect(decrypted).toBe(plaintext)
  })

  it('round-trips multi-line content', async () => {
    const plaintext = 'Line 1\nLine 2\nLine 3\n\nParagraph.'
    const encrypted = await encryptContent(plaintext, CREATOR_A, 1)
    const decrypted = await decryptContent(encrypted, CREATOR_A, 1)
    expect(decrypted).toBe(plaintext)
  })

  it('round-trips HTML content (rich text)', async () => {
    const plaintext = '<p>Hello <strong>world</strong></p><ul><li>Item 1</li></ul>'
    const encrypted = await encryptContent(plaintext, CREATOR_A, 1)
    const decrypted = await decryptContent(encrypted, CREATOR_A, 1)
    expect(decrypted).toBe(plaintext)
  })

  it('returns empty string for empty input', async () => {
    const encrypted = await encryptContent('', CREATOR_A, 1)
    expect(encrypted).toBe('')
    const decrypted = await decryptContent(encrypted, CREATOR_A, 1)
    expect(decrypted).toBe('')
  })

  it('produces different ciphertexts for same plaintext (random IV)', async () => {
    const plaintext = 'Same content twice'
    const enc1 = await encryptContent(plaintext, CREATOR_A, 1)
    const enc2 = await encryptContent(plaintext, CREATOR_A, 1)
    expect(enc1).not.toBe(enc2)
    // But both decrypt to the same plaintext
    expect(await decryptContent(enc1, CREATOR_A, 1)).toBe(plaintext)
    expect(await decryptContent(enc2, CREATOR_A, 1)).toBe(plaintext)
  })

  it('encrypted output starts with e2e: prefix', async () => {
    const encrypted = await encryptContent('test', CREATOR_A, 1)
    expect(encrypted.startsWith('e2e:')).toBe(true)
    const parts = encrypted.split(':')
    // Format: e2e:iv_b64:ciphertext_b64
    expect(parts.length).toBe(3)
    expect(parts[0]).toBe('e2e')
    // IV (12 bytes) = 16 base64 chars
    expect(parts[1].length).toBe(16)
    // Ciphertext + auth tag should be non-empty
    expect(parts[2].length).toBeGreaterThan(0)
  })

  it('cannot decrypt with wrong creator address', async () => {
    const plaintext = 'Secret content'
    const encrypted = await encryptContent(plaintext, CREATOR_A, 1)
    await expect(decryptContent(encrypted, CREATOR_B, 1)).rejects.toThrow()
  })

  it('cannot decrypt with wrong tier', async () => {
    const plaintext = 'Tier-gated secret'
    const encrypted = await encryptContent(plaintext, CREATOR_A, 1)
    await expect(decryptContent(encrypted, CREATOR_A, 2)).rejects.toThrow()
  })

  it('different tiers produce different ciphertexts', async () => {
    const plaintext = 'Same content, different tiers'
    const enc1 = await encryptContent(plaintext, CREATOR_A, 1)
    const enc2 = await encryptContent(plaintext, CREATOR_A, 2)
    const enc3 = await encryptContent(plaintext, CREATOR_A, 3)
    // All different (different keys + random IVs)
    expect(enc1).not.toBe(enc2)
    expect(enc2).not.toBe(enc3)
    // Each decrypts with the correct tier
    expect(await decryptContent(enc1, CREATOR_A, 1)).toBe(plaintext)
    expect(await decryptContent(enc2, CREATOR_A, 2)).toBe(plaintext)
    expect(await decryptContent(enc3, CREATOR_A, 3)).toBe(plaintext)
  })

  it('different creators produce different ciphertexts', async () => {
    const plaintext = 'Same content, different creators'
    const encA = await encryptContent(plaintext, CREATOR_A, 1)
    const encB = await encryptContent(plaintext, CREATOR_B, 1)
    expect(encA).not.toBe(encB)
    expect(await decryptContent(encA, CREATOR_A, 1)).toBe(plaintext)
    expect(await decryptContent(encB, CREATOR_B, 1)).toBe(plaintext)
  })
})

describe('isE2EEncrypted', () => {
  it('returns true for E2E-encrypted content', async () => {
    const encrypted = await encryptContent('test content', CREATOR_A, 1)
    expect(isE2EEncrypted(encrypted)).toBe(true)
  })

  it('returns false for plain text', () => {
    expect(isE2EEncrypted('This is just a regular post body')).toBe(false)
  })

  it('returns false for empty string', () => {
    expect(isE2EEncrypted('')).toBe(false)
  })

  it('returns false for server-encrypted format (iv:tag:ciphertext)', () => {
    // Server-encrypted content has exactly 3 colon-separated base64 segments
    // without an e2e: prefix
    expect(isE2EEncrypted('dGVzdDEyMzQ1Njc4:dGVzdDEyMzQ1Njc4OTAxMjM0NTY=:Y2lwaGVydGV4dA==')).toBe(false)
  })

  it('returns false for URL-like strings', () => {
    expect(isE2EEncrypted('https://example.com/path')).toBe(false)
  })

  it('returns true for strings starting with e2e:', () => {
    expect(isE2EEncrypted('e2e:abc:def')).toBe(true)
  })
})

describe('backward compatibility', () => {
  it('decryptContent returns unencrypted content as-is', async () => {
    const legacy = 'This is an old post that was stored before E2E encryption was added.'
    const result = await decryptContent(legacy, CREATOR_A, 1)
    expect(result).toBe(legacy)
  })

  it('decryptContent handles empty string gracefully', async () => {
    const result = await decryptContent('', CREATOR_A, 1)
    expect(result).toBe('')
  })

  it('decryptContent passes through server-encrypted format unchanged', async () => {
    // Server-encrypted content (iv:tag:ciphertext) should not be touched by
    // the E2E module — it passes through for server-side decryption
    const serverEncrypted = 'dGVzdDEyMzQ1Njc4:dGVzdDEyMzQ1Njc4OTAxMjM0NTY=:Y2lwaGVydGV4dA=='
    const result = await decryptContent(serverEncrypted, CREATOR_A, 1)
    expect(result).toBe(serverEncrypted)
  })
})

describe('key derivation determinism', () => {
  it('same inputs always produce the same decryption result', async () => {
    const plaintext = 'Deterministic key test'
    const encrypted = await encryptContent(plaintext, CREATOR_A, 1)
    // Decrypt multiple times to verify key derivation is deterministic
    const d1 = await decryptContent(encrypted, CREATOR_A, 1)
    const d2 = await decryptContent(encrypted, CREATOR_A, 1)
    const d3 = await decryptContent(encrypted, CREATOR_A, 1)
    expect(d1).toBe(plaintext)
    expect(d2).toBe(plaintext)
    expect(d3).toBe(plaintext)
  })
})
