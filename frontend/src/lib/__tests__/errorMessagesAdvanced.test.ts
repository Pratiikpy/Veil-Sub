import { describe, it, expect } from 'vitest'
import { ERROR_MESSAGES, getErrorMessage } from '../errorMessages'

describe('ERROR_MESSAGES completeness', () => {
  it('covers trial subscription error codes ERR_111 through ERR_117', () => {
    for (let i = 111; i <= 117; i++) {
      const code = `ERR_${i.toString().padStart(3, '0')}`
      expect(ERROR_MESSAGES[code]).toBeDefined()
      expect(ERROR_MESSAGES[code].length).toBeGreaterThan(0)
    }
  })

  it('covers commit-reveal tipping codes ERR_099 through ERR_103', () => {
    for (let i = 99; i <= 103; i++) {
      const code = `ERR_${i.toString().padStart(3, '0')}`
      expect(ERROR_MESSAGES[code]).toBeDefined()
    }
  })

  it('covers subscription transfer codes ERR_087 and ERR_088', () => {
    expect(ERROR_MESSAGES['ERR_087']).toContain('yourself')
    expect(ERROR_MESSAGES['ERR_088']).toContain('revoked')
  })

  it('covers expiry check codes ERR_104 through ERR_107', () => {
    expect(ERROR_MESSAGES['ERR_104']).toContain('expired')
    expect(ERROR_MESSAGES['ERR_105']).toContain('expired')
    expect(ERROR_MESSAGES['ERR_106']).toContain('maximum')
    expect(ERROR_MESSAGES['ERR_107']).toContain('expired')
  })

  it('covers gift subscription codes ERR_039 through ERR_045', () => {
    for (let i = 39; i <= 45; i++) {
      const code = `ERR_${i.toString().padStart(3, '0')}`
      expect(ERROR_MESSAGES[code]).toBeDefined()
    }
  })

  it('covers withdrawal codes ERR_055 through ERR_060', () => {
    for (let i = 55; i <= 60; i++) {
      const code = `ERR_${i.toString().padStart(3, '0')}`
      expect(ERROR_MESSAGES[code]).toBeDefined()
    }
  })

  it('has no excessive duplicate error messages across different codes', () => {
    const messages = Object.values(ERROR_MESSAGES)
    const unique = new Set(messages)
    // Some messages legitimately repeat across similar operations
    // (e.g., "expired" in ERR_104/105, "tier does not exist" in ERR_007/009).
    // Allow up to 30% duplication since many transitions share validation logic.
    expect(unique.size).toBeGreaterThan(messages.length * 0.7)
  })

  it('all error codes follow ERR_NNN format', () => {
    for (const code of Object.keys(ERROR_MESSAGES)) {
      expect(code).toMatch(/^ERR_\d{3}$/)
    }
  })

  it('all messages end with a period', () => {
    for (const [code, msg] of Object.entries(ERROR_MESSAGES)) {
      expect(msg.endsWith('.'), `${code} message does not end with a period: "${msg}"`).toBe(true)
    }
  })

  it('no message exceeds 200 characters (fits in UI toast)', () => {
    for (const [code, msg] of Object.entries(ERROR_MESSAGES)) {
      expect(msg.length, `${code} message is too long: ${msg.length} chars`).toBeLessThanOrEqual(200)
    }
  })
})

describe('getErrorMessage edge cases', () => {
  it('returns original for empty string', () => {
    expect(getErrorMessage('')).toBe('')
  })

  it('matches ERR_001 at start of string', () => {
    expect(getErrorMessage('ERR_001')).toBe(ERROR_MESSAGES['ERR_001'])
  })

  it('matches ERR_117 at end of string', () => {
    expect(getErrorMessage('Failed: ERR_117')).toBe(ERROR_MESSAGES['ERR_117'])
  })

  it('does not match partial error codes like ERR_11 (without third digit)', () => {
    // ERR_11 is not a key in ERROR_MESSAGES, so no match
    const result = getErrorMessage('Error: ERR_11 happened')
    // "ERR_11" is a substring of "ERR_110", but .includes('ERR_110') on 'ERR_11 happened' is false
    // It might match ERR_011 if 'ERR_011' is a substring of 'ERR_11 happened' — it's not.
    expect(result).toBe('Error: ERR_11 happened')
  })

  it('handles very long error string efficiently', () => {
    const longError = 'x'.repeat(10000) + ' ERR_028 ' + 'y'.repeat(10000)
    const result = getErrorMessage(longError)
    expect(result).toBe(ERROR_MESSAGES['ERR_028'])
  })

  it('matches first error code when string contains multiple codes', () => {
    // ERROR_MESSAGES is iterated in insertion order; ERR_001 comes first
    const result = getErrorMessage('ERR_117 and ERR_001')
    // Object.entries iteration order — ERR_001 appears first in the record
    expect(result).toBe(ERROR_MESSAGES['ERR_001'])
  })

  it('does not match ERR_ without a number', () => {
    expect(getErrorMessage('ERR_ something')).toBe('ERR_ something')
  })

  it('handles error codes from reserved ranges (ERR_046-054 missing)', () => {
    // These were removed in v23; getErrorMessage should return original
    expect(getErrorMessage('ERR_046')).toBe('ERR_046')
    expect(getErrorMessage('ERR_050')).toBe('ERR_050')
    expect(getErrorMessage('ERR_054')).toBe('ERR_054')
  })

  it('handles error codes from reserved range ERR_089-098 (missing)', () => {
    expect(getErrorMessage('ERR_089')).toBe('ERR_089')
    expect(getErrorMessage('ERR_095')).toBe('ERR_095')
    expect(getErrorMessage('ERR_098')).toBe('ERR_098')
  })
})

describe('error message content quality', () => {
  it('subscription error messages mention tier or payment', () => {
    const subCodes = ['ERR_020', 'ERR_021', 'ERR_022', 'ERR_023']
    for (const code of subCodes) {
      const msg = ERROR_MESSAGES[code].toLowerCase()
      expect(
        msg.includes('tier') || msg.includes('payment') || msg.includes('deprecated') || msg.includes('insufficient'),
        `${code}: "${ERROR_MESSAGES[code]}" should mention tier or payment`
      ).toBe(true)
    }
  })

  it('blind subscription errors mention nonce where relevant', () => {
    expect(ERROR_MESSAGES['ERR_062'].toLowerCase()).toContain('nonce')
    expect(ERROR_MESSAGES['ERR_067'].toLowerCase()).toContain('nonce')
    expect(ERROR_MESSAGES['ERR_069'].toLowerCase()).toContain('nonce')
    expect(ERROR_MESSAGES['ERR_074'].toLowerCase()).toContain('nonce')
  })

  it('trial subscription errors are descriptive', () => {
    expect(ERROR_MESSAGES['ERR_111'].toLowerCase()).toContain('tier')
    expect(ERROR_MESSAGES['ERR_113'].toLowerCase()).toContain('20%')
    expect(ERROR_MESSAGES['ERR_116'].toLowerCase()).toContain('12 hours')
  })

  it('withdrawal errors mention amount or balance', () => {
    const withdrawCodes = ['ERR_055', 'ERR_057', 'ERR_058', 'ERR_060']
    for (const code of withdrawCodes) {
      const msg = ERROR_MESSAGES[code].toLowerCase()
      expect(
        msg.includes('amount') || msg.includes('balance') || msg.includes('insufficient'),
        `${code}: "${ERROR_MESSAGES[code]}" should mention amount or balance`
      ).toBe(true)
    }
  })
})
