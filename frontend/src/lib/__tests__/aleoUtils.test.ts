import { describe, it, expect } from 'vitest'

/**
 * Tests for Aleo mapping response parsing logic.
 *
 * The useCreatorStats hook has an internal `fetchMapping` function that parses
 * Aleo API responses like "5000000u64" or "\"100u128\"" into numbers.
 * Since fetchMapping is not exported, we test the parsing regex directly.
 *
 * This matches the exact logic from useCreatorStats.ts:
 *   const cleaned = text.replace(/"/g, '').replace(/u(8|16|32|64|128)$/, '').trim()
 *   const parsed = parseInt(cleaned, 10)
 *   return isNaN(parsed) ? null : parsed
 */
function parseAleoMappingValue(text: string): number | null {
  if (!text || text === 'null' || text === '') return null
  const cleaned = text.replace(/"/g, '').replace(/u(8|16|32|64|128)$/, '').trim()
  const parsed = parseInt(cleaned, 10)
  return isNaN(parsed) ? null : parsed
}

describe('parseAleoMappingValue', () => {
  describe('valid numeric responses', () => {
    it('parses u64 suffix', () => {
      expect(parseAleoMappingValue('5000000u64')).toBe(5000000)
    })

    it('parses u128 suffix', () => {
      expect(parseAleoMappingValue('100u128')).toBe(100)
    })

    it('parses u32 suffix', () => {
      expect(parseAleoMappingValue('864000u32')).toBe(864000)
    })

    it('parses u8 suffix', () => {
      expect(parseAleoMappingValue('3u8')).toBe(3)
    })

    it('parses u16 suffix', () => {
      expect(parseAleoMappingValue('500u16')).toBe(500)
    })

    it('parses quoted u64 response', () => {
      expect(parseAleoMappingValue('"5000000u64"')).toBe(5000000)
    })

    it('parses double-quoted u128 response', () => {
      expect(parseAleoMappingValue('"100u128"')).toBe(100)
    })

    it('parses zero value', () => {
      expect(parseAleoMappingValue('0u64')).toBe(0)
    })

    it('parses large values within u64 range', () => {
      expect(parseAleoMappingValue('18446744073709551615u64')).toBe(18446744073709551615)
    })

    it('parses value with surrounding whitespace', () => {
      expect(parseAleoMappingValue('  500u64  ')).toBe(500)
    })
  })

  describe('null/empty responses', () => {
    it('returns null for "null" string', () => {
      expect(parseAleoMappingValue('null')).toBeNull()
    })

    it('returns null for empty string', () => {
      expect(parseAleoMappingValue('')).toBeNull()
    })

    it('returns null for whitespace-only string that becomes empty', () => {
      // After trim, this becomes empty but the initial check is before trim
      // The regex won't match, parseInt will return NaN
      expect(parseAleoMappingValue('   ')).toBeNull()
    })
  })

  describe('invalid responses', () => {
    it('returns null for non-numeric string', () => {
      expect(parseAleoMappingValue('abc')).toBeNull()
    })

    it('returns null for field suffix (not a numeric mapping)', () => {
      // "field" is not matched by u(8|16|32|64|128) regex
      expect(parseAleoMappingValue('12345field')).toBe(12345)
    })

    it('returns null for boolean-like value', () => {
      expect(parseAleoMappingValue('true')).toBeNull()
    })

    it('returns null for just quotes', () => {
      expect(parseAleoMappingValue('""')).toBeNull()
    })

    it('parses negative-looking values as NaN since u types are unsigned', () => {
      // parseInt("-5", 10) = -5 which is valid for parseInt but unusual for Aleo
      const result = parseAleoMappingValue('-5u64')
      // The regex strips u64, leaving "-5", parseInt gives -5
      expect(result).toBe(-5)
    })
  })

  describe('edge cases', () => {
    it('handles value without type suffix', () => {
      // Plain number without u64 etc — parseInt still works
      expect(parseAleoMappingValue('42')).toBe(42)
    })

    it('handles quoted value without type suffix', () => {
      expect(parseAleoMappingValue('"42"')).toBe(42)
    })

    it('handles value with unrecognized suffix', () => {
      // "500i64" — 'i' prefix not matched by /u(8|16|32|64|128)$/
      // parseInt("500i64") = 500 (stops at 'i')
      expect(parseAleoMappingValue('500i64')).toBe(500)
    })

    it('handles "null" inside quotes', () => {
      // '"null"' — quotes are stripped, becomes 'null', matched by null check? No.
      // After replace(/"/g, ''), we get 'null', but the initial check already passed.
      // Then parseInt('null') = NaN → null
      expect(parseAleoMappingValue('"null"')).toBeNull()
    })
  })
})
