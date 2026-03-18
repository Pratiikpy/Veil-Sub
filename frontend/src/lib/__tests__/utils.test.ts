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
  blocksToTimeString,
  blockToDate,
  formatExpiry,
} from '../utils'

describe('generatePassId', () => {
  it('returns a non-empty numeric string', () => {
    const id = generatePassId()
    expect(id).toBeTruthy()
    expect(/^\d+$/.test(id)).toBe(true)
  })

  it('never returns zero', () => {
    for (let i = 0; i < 50; i++) {
      expect(generatePassId()).not.toBe('0')
    }
  })

  it('fits within Aleo field size', () => {
    const maxField = BigInt(
      '8444461749428370424248824938781546531375899335154063827935233455917409239041'
    )
    for (let i = 0; i < 20; i++) {
      const id = BigInt(generatePassId())
      expect(id).toBeLessThan(maxField)
    }
  })

  it('generates unique values', () => {
    const ids = new Set<string>()
    for (let i = 0; i < 100; i++) {
      ids.add(generatePassId())
    }
    expect(ids.size).toBe(100)
  })
})

describe('formatCredits', () => {
  it('formats zero', () => {
    expect(formatCredits(0)).toBe('0')
  })

  it('formats whole credits', () => {
    expect(formatCredits(1_000_000)).toBe('1')
    expect(formatCredits(5_000_000)).toBe('5')
  })

  it('formats fractional credits', () => {
    expect(formatCredits(1_500_000)).toBe('1.50')
    expect(formatCredits(500_000)).toBe('0.50')
  })

  it('formats small amounts', () => {
    expect(formatCredits(5_000)).toBe('<0.01')
  })

  it('formats thousands with K suffix', () => {
    expect(formatCredits(1_000_000_000)).toBe('1.0K')
    expect(formatCredits(2_500_000_000)).toBe('2.5K')
  })

  it('handles non-finite input', () => {
    expect(formatCredits(NaN)).toBe('0')
    expect(formatCredits(Infinity)).toBe('0')
  })
})

describe('creditsToMicrocredits', () => {
  it('converts whole credits', () => {
    expect(creditsToMicrocredits(1)).toBe(1_000_000)
    expect(creditsToMicrocredits(5)).toBe(5_000_000)
  })

  it('converts fractional credits', () => {
    expect(creditsToMicrocredits(0.5)).toBe(500_000)
    expect(creditsToMicrocredits(1.5)).toBe(1_500_000)
  })

  it('floors the result', () => {
    expect(creditsToMicrocredits(0.0000001)).toBe(0)
  })
})

describe('parseRecordPlaintext', () => {
  it('parses a string record', () => {
    const input = '{ owner: aleo1abc123.private, tier: 2u8.private, amount: 500u64.public }'
    const result = parseRecordPlaintext(input)
    expect(result.owner).toBe('aleo1abc123')
    expect(result.tier).toBe('2')
    expect(result.amount).toBe('500')
  })

  it('parses an object record', () => {
    const input = { owner: 'aleo1abc123.private', tier: '2u8.private' }
    const result = parseRecordPlaintext(input)
    expect(result.owner).toBe('aleo1abc123')
    expect(result.tier).toBe('2')
  })

  it('strips field suffix from numeric values', () => {
    const input = '{ pass_id: 12345field }'
    const result = parseRecordPlaintext(input)
    expect(result.pass_id).toBe('12345')
  })

  it('preserves aleo addresses (no number stripping)', () => {
    const addr = 'aleo1hp9m08faf27hr7yu686t6r52nj36g3k5n7ymjhyzsvxjp58epyxsprk5wk'
    const input = `{ owner: ${addr}.private }`
    const result = parseRecordPlaintext(input)
    expect(result.owner).toBe(addr)
  })

  it('returns empty object on invalid input', () => {
    const result = parseRecordPlaintext('not a record')
    expect(Object.keys(result).length).toBe(0)
  })
})

describe('parseAccessPass', () => {
  const validPlaintext =
    '{ owner: aleo1hp9m08faf27hr7yu686t6r52nj36g3k5n7ymjhyzsvxjp58epyxsprk5wk.private, creator: aleo1hp9m08faf27hr7yu686t6r52nj36g3k5n7ymjhyzsvxjp58epyxsprk5wk.private, tier: 2u8.private, pass_id: 12345field.private, expires_at: 999999u32.private, privacy_level: 0u8.private }'

  it('parses a valid AccessPass', () => {
    const pass = parseAccessPass(validPlaintext)
    expect(pass).not.toBeNull()
    expect(pass!.tier).toBe(2)
    expect(pass!.expiresAt).toBe(999999)
    expect(pass!.passId).toBe('12345')
  })

  it('returns null for missing fields', () => {
    expect(parseAccessPass('{ owner: aleo1abc }')).toBeNull()
  })

  it('returns null for invalid tier', () => {
    const bad = validPlaintext.replace('tier: 2u8', 'tier: 0u8')
    expect(parseAccessPass(bad)).toBeNull()
  })

  it('returns null for tier > 20', () => {
    const bad = validPlaintext.replace('tier: 2u8', 'tier: 21u8')
    expect(parseAccessPass(bad)).toBeNull()
  })
})

describe('isValidAleoAddress', () => {
  it('validates correct addresses', () => {
    expect(
      isValidAleoAddress('aleo1hp9m08faf27hr7yu686t6r52nj36g3k5n7ymjhyzsvxjp58epyxsprk5wk')
    ).toBe(true)
  })

  it('rejects short addresses', () => {
    expect(isValidAleoAddress('aleo1abc')).toBe(false)
  })

  it('rejects addresses without aleo1 prefix', () => {
    expect(
      isValidAleoAddress('0xhp9m08faf27hr7yu686t6r52nj36g3k5n7ymjhyzsvxjp58epyxsprk5wk')
    ).toBe(false)
  })

  it('rejects empty string', () => {
    expect(isValidAleoAddress('')).toBe(false)
  })

  it('rejects addresses with uppercase', () => {
    expect(
      isValidAleoAddress('aleo1HP9M08FAF27HR7YU686T6R52NJ36G3K5N7YMJHYZSVXJP58EPYXSPRK5WK')
    ).toBe(false)
  })
})

describe('shortenAddress', () => {
  const addr = 'aleo1hp9m08faf27hr7yu686t6r52nj36g3k5n7ymjhyzsvxjp58epyxsprk5wk'

  it('shortens a long address', () => {
    const short = shortenAddress(addr)
    expect(short).toContain('...')
    expect(short.length).toBeLessThan(addr.length)
  })

  it('returns short strings unchanged', () => {
    expect(shortenAddress('short')).toBe('short')
  })

  it('respects custom char count', () => {
    const short = shortenAddress(addr, 4)
    expect(short).toBe('aleo1hp9...k5wk')
  })
})

describe('parseMicrocredits', () => {
  it('extracts microcredits from plaintext', () => {
    expect(parseMicrocredits('microcredits: 500000u64')).toBe(500000)
  })

  it('handles underscored numbers', () => {
    expect(parseMicrocredits('microcredits: 1_000_000u64')).toBe(1000000)
  })

  it('returns 0 for missing field', () => {
    expect(parseMicrocredits('no credits here')).toBe(0)
  })

  it('handles whitespace variants', () => {
    expect(parseMicrocredits('microcredits:500000u64')).toBe(500000)
    expect(parseMicrocredits('microcredits:  500000u64')).toBe(500000)
  })
})

describe('blocksToTimeString', () => {
  it('converts 864000 blocks to ~30 days', () => {
    expect(blocksToTimeString(864000)).toBe('~30 days')
  })

  it('converts 1000 blocks to ~50 minutes', () => {
    expect(blocksToTimeString(1000)).toBe('~50 minutes')
  })

  it('converts 1200 blocks to ~1 hour', () => {
    expect(blocksToTimeString(1200)).toBe('~1 hour')
  })

  it('handles zero blocks', () => {
    expect(blocksToTimeString(0)).toBe('< 1 minute')
  })

  it('handles negative blocks', () => {
    expect(blocksToTimeString(-100)).toBe('< 1 minute')
  })

  it('handles NaN', () => {
    expect(blocksToTimeString(NaN)).toBe('< 1 minute')
  })

  it('pluralizes correctly', () => {
    expect(blocksToTimeString(28800)).toBe('~1 day')
    expect(blocksToTimeString(57600)).toBe('~2 days')
  })
})

describe('blockToDate', () => {
  it('returns fallback when no current height provided', () => {
    // toLocaleString() output varies by locale, so just check prefix and digits
    expect(blockToDate(864000)).toMatch(/^block [\d,.\s]+$/)
    expect(blockToDate(864000, null)).toMatch(/^block [\d,.\s]+$/)
  })

  it('returns "now" for same block', () => {
    expect(blockToDate(100000, 100000)).toBe('now')
  })

  it('returns relative future time', () => {
    // 28800 blocks ahead = ~1 day
    const result = blockToDate(128800, 100000)
    expect(result).toMatch(/in ~/)
  })

  it('returns relative past time', () => {
    // 28800 blocks behind = ~1 day
    const result = blockToDate(71200, 100000)
    expect(result).toMatch(/ago/)
  })

  it('returns minutes for small differences', () => {
    // 100 blocks = 300 seconds = 5 minutes
    const result = blockToDate(100100, 100000)
    expect(result).toMatch(/in ~5 min/)
  })

  it('handles non-finite input', () => {
    expect(blockToDate(NaN)).toBe('Unknown')
    expect(blockToDate(Infinity)).toBe('Unknown')
  })
})

describe('formatExpiry', () => {
  it('shows pending when no block height', () => {
    expect(formatExpiry(900000, null)).toBe('Expiry pending')
  })

  it('shows expired for past blocks', () => {
    const result = formatExpiry(90000, 100000)
    expect(result).toMatch(/Expired/)
  })

  it('shows future expiry for upcoming blocks', () => {
    const result = formatExpiry(200000, 100000)
    expect(result).toMatch(/Expires/)
  })
})
