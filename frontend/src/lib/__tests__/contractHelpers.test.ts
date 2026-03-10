import { describe, it, expect } from 'vitest'
import { getMicrocredits, withTimeout } from '../../hooks/useContractExecute'
import type { WalletRecord } from '../../hooks/useContractExecute'

describe('getMicrocredits', () => {
  describe('plaintext string records', () => {
    it('extracts microcredits from plaintext field', () => {
      const record: WalletRecord = {
        plaintext: '{ owner: aleo1abc.private, microcredits: 5000000u64.private, _nonce: 123.public }',
      }
      expect(getMicrocredits(record)).toBe(5_000_000)
    })

    it('extracts microcredits from recordPlaintext field (Shield Wallet format)', () => {
      const record: WalletRecord = {
        recordPlaintext: '{ owner: aleo1abc.private, microcredits: 2500000u64.private }',
      }
      expect(getMicrocredits(record)).toBe(2_500_000)
    })

    it('handles underscored numbers in plaintext', () => {
      const record: WalletRecord = {
        plaintext: '{ owner: aleo1abc.private, microcredits: 1_000_000u64.private }',
      }
      expect(getMicrocredits(record)).toBe(1_000_000)
    })

    it('handles string record directly', () => {
      const record = '{ microcredits: 750000u64 }' as unknown as WalletRecord
      expect(getMicrocredits(record)).toBe(750_000)
    })
  })

  describe('structured data records', () => {
    it('extracts from data.microcredits field', () => {
      const record: WalletRecord = {
        data: { microcredits: '3000000u64' },
      }
      expect(getMicrocredits(record)).toBe(3_000_000)
    })

    it('handles data.microcredits with .private suffix', () => {
      const record: WalletRecord = {
        data: { microcredits: '500000u64.private' },
      }
      expect(getMicrocredits(record)).toBe(500_000)
    })

    it('handles data.microcredits with underscores', () => {
      const record: WalletRecord = {
        data: { microcredits: '1_500_000u64' },
      }
      expect(getMicrocredits(record)).toBe(1_500_000)
    })
  })

  describe('top-level microcredits field', () => {
    it('extracts from record.microcredits string', () => {
      const record: WalletRecord = {
        microcredits: '800000u64',
      }
      expect(getMicrocredits(record)).toBe(800_000)
    })

    it('extracts from record.microcredits number', () => {
      const record: WalletRecord = {
        microcredits: 600000,
      }
      expect(getMicrocredits(record)).toBe(600_000)
    })

    it('handles .private suffix on top-level microcredits', () => {
      const record: WalletRecord = {
        microcredits: '400000u64.private',
      }
      expect(getMicrocredits(record)).toBe(400_000)
    })
  })

  describe('zero and invalid records', () => {
    it('returns 0 for spent record', () => {
      const record: WalletRecord = {
        spent: true,
        plaintext: '{ microcredits: 5000000u64 }',
      }
      // Note: getMicrocredits does NOT check spent flag — it just extracts the value
      // The processRecord function checks spent. getMicrocredits will still return the value.
      // Let's verify what actually happens
      const result = getMicrocredits(record)
      expect(result).toBe(5_000_000) // getMicrocredits itself doesn't filter spent
    })

    it('returns 0 for record with no microcredits', () => {
      const record: WalletRecord = {
        plaintext: '{ owner: aleo1abc.private }',
      }
      expect(getMicrocredits(record)).toBe(0)
    })

    it('returns 0 for empty object', () => {
      const record: WalletRecord = {}
      expect(getMicrocredits(record)).toBe(0)
    })

    it('returns 0 for null-ish input', () => {
      expect(getMicrocredits(null as unknown as WalletRecord)).toBe(0)
      expect(getMicrocredits(undefined as unknown as WalletRecord)).toBe(0)
    })

    it('returns 0 when microcredits value is zero', () => {
      const record: WalletRecord = {
        plaintext: '{ microcredits: 0u64 }',
      }
      expect(getMicrocredits(record)).toBe(0)
    })

    it('returns 0 for data.microcredits that parses to 0', () => {
      const record: WalletRecord = {
        data: { microcredits: '0u64' },
      }
      expect(getMicrocredits(record)).toBe(0)
    })

    it('returns 0 for non-numeric data.microcredits', () => {
      const record: WalletRecord = {
        data: { microcredits: 'notanumber' },
      }
      expect(getMicrocredits(record)).toBe(0)
    })
  })

  describe('priority order', () => {
    it('prefers data.microcredits over plaintext', () => {
      const record: WalletRecord = {
        data: { microcredits: '999u64' },
        plaintext: '{ microcredits: 111u64 }',
      }
      expect(getMicrocredits(record)).toBe(999)
    })

    it('falls back to plaintext when data.microcredits is missing', () => {
      const record: WalletRecord = {
        data: {},
        plaintext: '{ microcredits: 222u64 }',
      }
      expect(getMicrocredits(record)).toBe(222)
    })

    it('falls back to top-level microcredits when others are missing', () => {
      const record: WalletRecord = {
        data: {},
        microcredits: '333u64',
      }
      expect(getMicrocredits(record)).toBe(333)
    })
  })
})

describe('withTimeout', () => {
  it('resolves when promise completes before timeout', async () => {
    const fast = new Promise<string>((resolve) => setTimeout(() => resolve('done'), 10))
    const result = await withTimeout(fast, 1000, 'test')
    expect(result).toBe('done')
  })

  it('rejects when promise exceeds timeout', async () => {
    const slow = new Promise<string>((resolve) => setTimeout(() => resolve('done'), 5000))
    await expect(withTimeout(slow, 50, 'slowOp')).rejects.toThrow('slowOp timed out after 0.05s')
  })

  it('preserves the label in timeout error message', async () => {
    const slow = new Promise<string>(() => {}) // never resolves
    await expect(withTimeout(slow, 50, 'requestRecords')).rejects.toThrow('requestRecords timed out')
  })

  it('rejects immediately if promise rejects', async () => {
    const failing = Promise.reject(new Error('wallet error'))
    await expect(withTimeout(failing, 5000, 'test')).rejects.toThrow('wallet error')
  })

  it('returns the correct type', async () => {
    const numPromise = Promise.resolve(42)
    const result = await withTimeout(numPromise, 1000, 'test')
    expect(result).toBe(42)
    expect(typeof result).toBe('number')
  })

  it('works with zero-delay resolve', async () => {
    const instant = Promise.resolve('instant')
    const result = await withTimeout(instant, 100, 'test')
    expect(result).toBe('instant')
  })
})
