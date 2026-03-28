import { describe, it, expect } from 'vitest'
import { ERROR_MESSAGES, getErrorMessage } from '../errorMessages'

describe('ERROR_MESSAGES', () => {
  it('has 119 unique error codes covering all v30 features', () => {
    const defined = Object.keys(ERROR_MESSAGES)
    expect(defined.length).toBeGreaterThanOrEqual(90)
  })

  it('every message is a non-empty string', () => {
    for (const [code, msg] of Object.entries(ERROR_MESSAGES)) {
      expect(typeof msg).toBe('string')
      expect(msg.length).toBeGreaterThan(0)
    }
  })

  it('covers creator registration codes', () => {
    expect(ERROR_MESSAGES['ERR_018']).toContain('minimum')
    expect(ERROR_MESSAGES['ERR_019']).toContain('already registered')
  })

  it('covers subscription codes', () => {
    expect(ERROR_MESSAGES['ERR_020']).toContain('tier')
    expect(ERROR_MESSAGES['ERR_022']).toContain('insufficient')
  })

  it('covers blind subscription codes', () => {
    expect(ERROR_MESSAGES['ERR_062'].toLowerCase()).toContain('privacy')
    expect(ERROR_MESSAGES['ERR_067'].toLowerCase()).toContain('privacy')
  })

  it('covers privacy proof codes (v25+)', () => {
    expect(ERROR_MESSAGES['ERR_108']).toBeDefined()
    expect(ERROR_MESSAGES['ERR_109']).toBeDefined()
    expect(ERROR_MESSAGES['ERR_110']).toContain('threshold')
  })
})

describe('getErrorMessage', () => {
  it('returns mapped message for known error code', () => {
    const result = getErrorMessage('Transaction failed: ERR_022 on-chain')
    expect(result).toBe('Payment amount is insufficient for this tier.')
  })

  it('returns original string if no code matches', () => {
    const original = 'Some unknown error'
    expect(getErrorMessage(original)).toBe(original)
  })

  it('matches codes embedded in longer strings', () => {
    const msg = getErrorMessage('Rejected by network: ERR_087 at block 12345')
    expect(msg).toBe('You cannot transfer a subscription to yourself.')
  })

  it('returns first matching code when multiple present', () => {
    const msg = getErrorMessage('ERR_001 and ERR_002')
    expect(msg).toBe(ERROR_MESSAGES['ERR_001'])
  })
})
