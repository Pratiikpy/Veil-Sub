import { describe, it, expect } from 'vitest'
import { encrypt, decrypt, hashAddress } from '../encryption'

describe('encrypt / decrypt roundtrip', () => {
  it('encrypts and decrypts a simple string', async () => {
    const plaintext = 'aleo1hp9m08faf27hr7yu686t6r52nj36g3k5n7ymjhyzsvxjp58epyxsprk5wk'
    const ciphertext = await encrypt(plaintext)
    const decrypted = await decrypt(ciphertext)
    expect(decrypted).toBe(plaintext)
  })

  it('encrypts and decrypts an empty string', async () => {
    const ciphertext = await encrypt('')
    const decrypted = await decrypt(ciphertext)
    expect(decrypted).toBe('')
  })

  it('encrypts and decrypts a long string', async () => {
    const plaintext = 'A'.repeat(10_000)
    const ciphertext = await encrypt(plaintext)
    const decrypted = await decrypt(ciphertext)
    expect(decrypted).toBe(plaintext)
  })

  it('encrypts and decrypts unicode content', async () => {
    const plaintext = 'Privacy matters \u2014 zero-knowledge proofs'
    const ciphertext = await encrypt(plaintext)
    const decrypted = await decrypt(ciphertext)
    expect(decrypted).toBe(plaintext)
  })
})

describe('encrypt output format', () => {
  it('returns a valid base64 string', async () => {
    const ciphertext = await encrypt('test')
    // Base64 characters: A-Z, a-z, 0-9, +, /, =
    expect(/^[A-Za-z0-9+/=]+$/.test(ciphertext)).toBe(true)
  })

  it('produces different ciphertexts for same plaintext (random IV/salt)', async () => {
    const plaintext = 'identical input'
    const c1 = await encrypt(plaintext)
    const c2 = await encrypt(plaintext)
    expect(c1).not.toBe(c2)
  })

  it('ciphertext is longer than plaintext due to salt + IV + auth tag', async () => {
    const plaintext = 'short'
    const ciphertext = await encrypt(plaintext)
    // base64-decoded: 16 (salt) + 12 (IV) + plaintext + 16 (auth tag)
    expect(ciphertext.length).toBeGreaterThan(plaintext.length)
  })

  it('different plaintexts produce different ciphertexts', async () => {
    const c1 = await encrypt('message one')
    const c2 = await encrypt('message two')
    expect(c1).not.toBe(c2)
  })
})

describe('decrypt error handling', () => {
  it('throws on invalid base64 input', async () => {
    await expect(decrypt('not-valid-base64!!!')).rejects.toThrow()
  })

  it('throws on truncated ciphertext', async () => {
    const ciphertext = await encrypt('hello')
    // Truncate to just a few characters — not enough for salt + IV + data
    const truncated = ciphertext.slice(0, 10)
    await expect(decrypt(truncated)).rejects.toThrow()
  })

  it('throws on corrupted ciphertext', async () => {
    const ciphertext = await encrypt('hello world')
    // Flip bits in the middle of the ciphertext
    const chars = ciphertext.split('')
    const mid = Math.floor(chars.length / 2)
    chars[mid] = chars[mid] === 'A' ? 'B' : 'A'
    const corrupted = chars.join('')
    await expect(decrypt(corrupted)).rejects.toThrow()
  })
})

describe('hashAddress', () => {
  it('produces a 64-character hex string', async () => {
    const hash = await hashAddress('aleo1hp9m08faf27hr7yu686t6r52nj36g3k5n7ymjhyzsvxjp58epyxsprk5wk')
    expect(hash).toHaveLength(64)
    expect(/^[a-f0-9]{64}$/.test(hash)).toBe(true)
  })

  it('is deterministic (same input = same hash)', async () => {
    const addr = 'aleo1hp9m08faf27hr7yu686t6r52nj36g3k5n7ymjhyzsvxjp58epyxsprk5wk'
    const h1 = await hashAddress(addr)
    const h2 = await hashAddress(addr)
    expect(h1).toBe(h2)
  })

  it('different addresses produce different hashes', async () => {
    const h1 = await hashAddress('aleo1hp9m08faf27hr7yu686t6r52nj36g3k5n7ymjhyzsvxjp58epyxsprk5wk')
    const h2 = await hashAddress('aleo1yr9ls3d48sh0gkk8y4re9assy7rkfhp4g8x2jmd5vqxl0phdvyqq4qmhef')
    expect(h1).not.toBe(h2)
  })

  it('handles empty string input', async () => {
    const hash = await hashAddress('')
    expect(hash).toHaveLength(64)
    expect(/^[a-f0-9]{64}$/.test(hash)).toBe(true)
  })

  it('handles very long input', async () => {
    const hash = await hashAddress('x'.repeat(10_000))
    expect(hash).toHaveLength(64)
    expect(/^[a-f0-9]{64}$/.test(hash)).toBe(true)
  })
})
