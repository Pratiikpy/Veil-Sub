import { describe, it, expect } from 'vitest'
import { encryptContent, decryptContent, isEncrypted, deriveCreatorKey } from '../contentEncryption'

const CREATOR_A = 'aleo1hp9m08faf27hr7yu686t6r52nj36g3k5n7ymjhyzsvxjp58epyxsprk5wk'
const CREATOR_B = 'aleo1yr9ls3d48sh0gkk8y4re9assy7rkfhp4g8x2jmd5vqxl0phdvyqq4qmhef'

describe('deriveCreatorKey', () => {
  it('returns a 32-byte Buffer (256-bit key)', () => {
    const key = deriveCreatorKey(CREATOR_A)
    expect(Buffer.isBuffer(key)).toBe(true)
    expect(key.length).toBe(32)
  })

  it('produces different keys for different creators', () => {
    const keyA = deriveCreatorKey(CREATOR_A)
    const keyB = deriveCreatorKey(CREATOR_B)
    expect(keyA.equals(keyB)).toBe(false)
  })

  it('produces deterministic keys for same creator', () => {
    const key1 = deriveCreatorKey(CREATOR_A)
    const key2 = deriveCreatorKey(CREATOR_A)
    expect(key1.equals(key2)).toBe(true)
  })
})

describe('encryptContent / decryptContent', () => {
  it('round-trips a simple string', () => {
    const plaintext = 'Hello, encrypted world!'
    const encrypted = encryptContent(plaintext, CREATOR_A)
    const decrypted = decryptContent(encrypted, CREATOR_A)
    expect(decrypted).toBe(plaintext)
  })

  it('round-trips unicode content', () => {
    const plaintext = 'Privacy matters. Aleo ZK proofs.'
    const encrypted = encryptContent(plaintext, CREATOR_A)
    const decrypted = decryptContent(encrypted, CREATOR_A)
    expect(decrypted).toBe(plaintext)
  })

  it('round-trips multi-line content', () => {
    const plaintext = 'Line 1\nLine 2\nLine 3\n\nParagraph.'
    const encrypted = encryptContent(plaintext, CREATOR_A)
    const decrypted = decryptContent(encrypted, CREATOR_A)
    expect(decrypted).toBe(plaintext)
  })

  it('round-trips empty string', () => {
    const encrypted = encryptContent('', CREATOR_A)
    const decrypted = decryptContent(encrypted, CREATOR_A)
    expect(decrypted).toBe('')
  })

  it('produces different ciphertexts for same plaintext (random IV)', () => {
    const plaintext = 'Same content twice'
    const enc1 = encryptContent(plaintext, CREATOR_A)
    const enc2 = encryptContent(plaintext, CREATOR_A)
    expect(enc1).not.toBe(enc2)
    // But both decrypt to the same plaintext
    expect(decryptContent(enc1, CREATOR_A)).toBe(plaintext)
    expect(decryptContent(enc2, CREATOR_A)).toBe(plaintext)
  })

  it('cannot decrypt with wrong creator key', () => {
    const plaintext = 'Secret content'
    const encrypted = encryptContent(plaintext, CREATOR_A)
    expect(() => decryptContent(encrypted, CREATOR_B)).toThrow()
  })

  it('encrypted output has iv:tag:ciphertext format', () => {
    const encrypted = encryptContent('test', CREATOR_A)
    const parts = encrypted.split(':')
    expect(parts.length).toBe(3)
    // IV: 12 bytes -> 16 base64 chars
    expect(parts[0].length).toBe(16)
    // Auth tag: 16 bytes -> 24 base64 chars
    expect(parts[1].length).toBe(24)
    // Ciphertext is non-empty
    expect(parts[2].length).toBeGreaterThan(0)
  })
})

describe('isEncrypted', () => {
  it('returns true for encrypted content', () => {
    const encrypted = encryptContent('test content', CREATOR_A)
    expect(isEncrypted(encrypted)).toBe(true)
  })

  it('returns false for plain text', () => {
    expect(isEncrypted('This is just a regular post body')).toBe(false)
  })

  it('returns false for empty string', () => {
    expect(isEncrypted('')).toBe(false)
  })

  it('returns false for string with colons but wrong format', () => {
    expect(isEncrypted('a:b:c')).toBe(false)
  })

  it('returns false for URL-like strings', () => {
    expect(isEncrypted('https://example.com/path')).toBe(false)
  })
})

describe('backward compatibility', () => {
  it('decryptContent returns unencrypted content as-is', () => {
    const legacy = 'This is an old post that was stored before encryption was added.'
    const result = decryptContent(legacy, CREATOR_A)
    expect(result).toBe(legacy)
  })

  it('decryptContent handles empty string gracefully', () => {
    expect(decryptContent('', CREATOR_A)).toBe('')
  })

  it('decryptContent handles string with single colon', () => {
    const text = 'Title: some content'
    expect(decryptContent(text, CREATOR_A)).toBe(text)
  })
})
