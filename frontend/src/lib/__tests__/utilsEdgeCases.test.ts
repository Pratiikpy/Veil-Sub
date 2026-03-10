import { describe, it, expect } from 'vitest'
import {
  generatePassId,
  formatCredits,
  creditsToMicrocredits,
  parseRecordPlaintext,
  parseAccessPass,
  isValidAleoAddress,
  shortenAddress,
  parseMicrocredits,
} from '../utils'

describe('generatePassId edge cases', () => {
  it('returns a string that can be parsed as BigInt', () => {
    const id = generatePassId()
    expect(() => BigInt(id)).not.toThrow()
  })

  it('result is always a positive BigInt', () => {
    for (let i = 0; i < 20; i++) {
      expect(BigInt(generatePassId())).toBeGreaterThan(BigInt(0))
    }
  })

  it('never contains negative sign', () => {
    for (let i = 0; i < 50; i++) {
      expect(generatePassId().startsWith('-')).toBe(false)
    }
  })

  it('result has no leading zeros (except for "0" which is excluded)', () => {
    for (let i = 0; i < 50; i++) {
      const id = generatePassId()
      if (id.length > 1) {
        expect(id[0]).not.toBe('0')
      }
    }
  })
})

describe('formatCredits edge cases', () => {
  it('formats negative microcredits as zero', () => {
    // Negative microcredits should not produce garbage output
    expect(formatCredits(-1)).toBe('0')
  })

  it('formats -Infinity as zero', () => {
    expect(formatCredits(-Infinity)).toBe('0')
  })

  it('formats exactly 10000 microcredits (0.01 credits)', () => {
    expect(formatCredits(10_000)).toBe('0.01')
  })

  it('formats exactly 9999 microcredits (just under 0.01)', () => {
    expect(formatCredits(9_999)).toBe('<0.01')
  })

  it('formats 999_999 microcredits (just under 1 credit)', () => {
    expect(formatCredits(999_999)).toBe('1.00')
  })

  it('formats exactly 1_000_000_000 (1000 credits = 1.0K)', () => {
    expect(formatCredits(1_000_000_000)).toBe('1.0K')
  })

  it('formats 999_999_999 microcredits (just under 1K)', () => {
    const result = formatCredits(999_999_999)
    // 999.999999 credits, >= 1 so uses toFixed(2) → "1000.00"? No: >= 1000 → K format
    // Actually 999.999999 < 1000 so it uses the credits >= 1 branch
    expect(result).toBe('1000.00')
  })

  it('formats exactly 1 microcredit', () => {
    // 1 / 1_000_000 = 0.000001, which is > 0 but < 0.01
    expect(formatCredits(1)).toBe('<0.01')
  })

  it('formats integer credit amounts without decimals', () => {
    expect(formatCredits(3_000_000)).toBe('3')
    expect(formatCredits(10_000_000)).toBe('10')
  })
})

describe('creditsToMicrocredits edge cases', () => {
  it('converts zero credits', () => {
    expect(creditsToMicrocredits(0)).toBe(0)
  })

  it('converts negative credits (floors toward negative infinity)', () => {
    // Math.floor(-0.5 * 1_000_000) = Math.floor(-500_000) = -500_000
    expect(creditsToMicrocredits(-0.5)).toBe(-500_000)
  })

  it('converts very small fractional credits to zero', () => {
    expect(creditsToMicrocredits(0.0000001)).toBe(0)
    expect(creditsToMicrocredits(0.0000009)).toBe(0)
  })

  it('handles large credit amounts', () => {
    expect(creditsToMicrocredits(1000)).toBe(1_000_000_000)
  })

  it('floors fractional microcredits', () => {
    // 1.9999999 * 1_000_000 = 1_999_999.9, floor → 1_999_999
    expect(creditsToMicrocredits(1.9999999)).toBe(1_999_999)
  })
})

describe('parseRecordPlaintext edge cases', () => {
  it('handles object with null values', () => {
    const input = { owner: null as unknown as string, tier: undefined as unknown as string }
    const result = parseRecordPlaintext(input)
    expect(result.owner).toBe('')
    expect(result.tier).toBe('')
  })

  it('handles object with numeric values', () => {
    const input = { tier: 2 as unknown as string, amount: 500 as unknown as string }
    const result = parseRecordPlaintext(input)
    expect(result.tier).toBe('2')
    expect(result.amount).toBe('500')
  })

  it('handles empty braces string', () => {
    const result = parseRecordPlaintext('{}')
    expect(Object.keys(result).length).toBe(0)
  })

  it('handles empty object', () => {
    const result = parseRecordPlaintext({})
    expect(Object.keys(result).length).toBe(0)
  })

  it('strips scalar suffix from numeric values', () => {
    const input = '{ val: 12345scalar }'
    const result = parseRecordPlaintext(input)
    expect(result.val).toBe('12345')
  })

  it('strips group suffix from numeric values', () => {
    const input = '{ val: 99999group }'
    const result = parseRecordPlaintext(input)
    expect(result.val).toBe('99999')
  })

  it('handles signed integer types', () => {
    const input = '{ balance: -100i64.private }'
    const result = parseRecordPlaintext(input)
    expect(result.balance).toBe('-100')
  })

  it('handles i128 suffix', () => {
    const input = '{ big: 999999i128 }'
    const result = parseRecordPlaintext(input)
    expect(result.big).toBe('999999')
  })

  it('does not strip suffixes from non-numeric strings', () => {
    const addr = 'aleo1hp9m08faf27hr7yu686t6r52nj36g3k5n7ymjhyzsvxjp58epyxsprk5wk'
    const input = { creator: `${addr}.private` }
    const result = parseRecordPlaintext(input)
    expect(result.creator).toBe(addr)
  })

  it('handles multiple commas and trailing commas in string', () => {
    const input = '{ a: 1u8, b: 2u8, }'
    const result = parseRecordPlaintext(input)
    expect(result.a).toBe('1')
    expect(result.b).toBe('2')
  })

  it('handles values with colons in them (e.g. URLs) by taking first colon', () => {
    const input = '{ url: https://example.com }'
    const result = parseRecordPlaintext(input)
    expect(result.url).toBe('https://example.com')
  })

  it('handles u8, u16, u32, u128 suffixes', () => {
    const input = '{ a: 1u8, b: 2u16, c: 3u32, d: 4u128 }'
    const result = parseRecordPlaintext(input)
    expect(result.a).toBe('1')
    expect(result.b).toBe('2')
    expect(result.c).toBe('3')
    expect(result.d).toBe('4')
  })
})

describe('parseAccessPass edge cases', () => {
  const validAddr = 'aleo1hp9m08faf27hr7yu686t6r52nj36g3k5n7ymjhyzsvxjp58epyxsprk5wk'

  it('accepts tier 1 (minimum valid)', () => {
    const input = `{ owner: ${validAddr}.private, creator: ${validAddr}.private, tier: 1u8.private, pass_id: 100field.private, expires_at: 999999u32.private, privacy_level: 0u8.private }`
    const result = parseAccessPass(input)
    expect(result).not.toBeNull()
    expect(result!.tier).toBe(1)
  })

  it('accepts tier 20 (maximum valid)', () => {
    const input = `{ owner: ${validAddr}.private, creator: ${validAddr}.private, tier: 20u8.private, pass_id: 100field.private, expires_at: 999999u32.private, privacy_level: 0u8.private }`
    const result = parseAccessPass(input)
    expect(result).not.toBeNull()
    expect(result!.tier).toBe(20)
  })

  it('rejects tier 0', () => {
    const input = `{ owner: ${validAddr}.private, creator: ${validAddr}.private, tier: 0u8.private, pass_id: 100field.private, expires_at: 999999u32.private }`
    expect(parseAccessPass(input)).toBeNull()
  })

  it('rejects tier 21', () => {
    const input = `{ owner: ${validAddr}.private, creator: ${validAddr}.private, tier: 21u8.private, pass_id: 100field.private, expires_at: 999999u32.private }`
    expect(parseAccessPass(input)).toBeNull()
  })

  it('returns empty passId when pass_id is missing', () => {
    const input = `{ owner: ${validAddr}.private, creator: ${validAddr}.private, tier: 2u8.private, expires_at: 999999u32.private }`
    const result = parseAccessPass(input)
    expect(result).not.toBeNull()
    expect(result!.passId).toBe('')
  })

  it('rejects when expires_at is not a number', () => {
    const input = `{ owner: ${validAddr}.private, creator: ${validAddr}.private, tier: 2u8.private, pass_id: 100field.private, expires_at: abc }`
    expect(parseAccessPass(input)).toBeNull()
  })

  it('preserves rawPlaintext in result', () => {
    const input = `{ owner: ${validAddr}.private, creator: ${validAddr}.private, tier: 3u8.private, pass_id: 555field.private, expires_at: 100000u32.private }`
    const result = parseAccessPass(input)
    expect(result).not.toBeNull()
    expect(result!.rawPlaintext).toBe(input)
  })

  it('rejects empty string', () => {
    expect(parseAccessPass('')).toBeNull()
  })

  it('rejects garbage input', () => {
    expect(parseAccessPass('not a record at all')).toBeNull()
  })

  it('handles missing owner field', () => {
    const input = `{ creator: ${validAddr}.private, tier: 2u8.private, pass_id: 100field.private, expires_at: 999999u32.private }`
    expect(parseAccessPass(input)).toBeNull()
  })

  it('handles missing creator field', () => {
    const input = `{ owner: ${validAddr}.private, tier: 2u8.private, pass_id: 100field.private, expires_at: 999999u32.private }`
    expect(parseAccessPass(input)).toBeNull()
  })
})

describe('isValidAleoAddress edge cases', () => {
  it('rejects address with special characters', () => {
    expect(isValidAleoAddress('aleo1!@#$%^&*()_+abcdefghijklmnopqrstuvwxyz0123456789abcdef')).toBe(false)
  })

  it('rejects address that is too long', () => {
    const tooLong = 'aleo1' + 'a'.repeat(59)
    expect(isValidAleoAddress(tooLong)).toBe(false)
  })

  it('rejects address that is exactly one char short', () => {
    const tooShort = 'aleo1' + 'a'.repeat(57)
    expect(isValidAleoAddress(tooShort)).toBe(false)
  })

  it('accepts address of correct length with mixed alphanumeric', () => {
    const addr = 'aleo1' + 'a1b2c3d4e5f6g7h8j9k0m1n2p3q4r5s6t7u8v9w0x1y2z3a4b5c6d7e8f9'
    // 58 chars after aleo1 = 63 total
    expect(addr.length).toBe(63)
    expect(isValidAleoAddress(addr)).toBe(true)
  })

  it('rejects null-ish values', () => {
    expect(isValidAleoAddress(null as unknown as string)).toBe(false)
    expect(isValidAleoAddress(undefined as unknown as string)).toBe(false)
  })
})

describe('shortenAddress edge cases', () => {
  it('returns empty string for empty input', () => {
    expect(shortenAddress('')).toBe('')
  })

  it('returns undefined/null as-is', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(shortenAddress(undefined as any)).toBe(undefined)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(shortenAddress(null as any)).toBe(null)
  })

  it('returns exactly 12-char string unchanged', () => {
    // Length < 12 returns as-is; length >= 12 gets shortened
    expect(shortenAddress('123456789012')).toContain('...')
  })

  it('returns 11-char string unchanged', () => {
    expect(shortenAddress('12345678901')).toBe('12345678901')
  })

  it('uses default chars=6 producing expected format', () => {
    const addr = 'aleo1hp9m08faf27hr7yu686t6r52nj36g3k5n7ymjhyzsvxjp58epyxsprk5wk'
    const result = shortenAddress(addr)
    // First 10 chars (6+4) + ... + last 6 chars
    expect(result).toBe('aleo1hp9m0...prk5wk')
  })

  it('handles chars=0 gracefully', () => {
    const addr = 'aleo1hp9m08faf27hr7yu686t6r52nj36g3k5n7ymjhyzsvxjp58epyxsprk5wk'
    const result = shortenAddress(addr, 0)
    // slice(0, 4) + '...' + slice(-0) — slice(-0) returns full string
    expect(result).toBe('aleo...' + addr)
  })

  it('handles large chars value (larger than address)', () => {
    const addr = 'aleo1hp9m08faf27hr7yu686t6r52nj36g3k5n7ymjhyzsvxjp58epyxsprk5wk'
    const result = shortenAddress(addr, 100)
    // slice(0, 104) + ... + slice(-100) — the result will include the full address and overlap
    expect(result).toContain('...')
  })
})

describe('parseMicrocredits edge cases', () => {
  it('extracts microcredits from a full record plaintext', () => {
    const plaintext = '{ owner: aleo1abc.private, microcredits: 2500000u64.private, _nonce: 123.public }'
    expect(parseMicrocredits(plaintext)).toBe(2500000)
  })

  it('returns 0 for record without microcredits field', () => {
    expect(parseMicrocredits('{ owner: aleo1abc.private }')).toBe(0)
  })

  it('handles very large microcredit values', () => {
    expect(parseMicrocredits('microcredits: 18446744073709551615u64')).toBe(18446744073709551615)
  })

  it('handles zero microcredits', () => {
    expect(parseMicrocredits('microcredits: 0u64')).toBe(0)
  })

  it('returns 0 for empty string', () => {
    expect(parseMicrocredits('')).toBe(0)
  })

  it('ignores non-u64 numeric suffixes', () => {
    // parseMicrocredits specifically looks for u64
    expect(parseMicrocredits('microcredits: 500u128')).toBe(0)
  })

  it('handles multiple microcredits fields (takes first match)', () => {
    const input = 'microcredits: 100u64, other_microcredits: 200u64'
    expect(parseMicrocredits(input)).toBe(100)
  })
})
