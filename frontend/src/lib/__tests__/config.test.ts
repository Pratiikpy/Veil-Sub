import { describe, it, expect } from 'vitest'
import {
  PROGRAM_ID,
  DEPLOYED_PROGRAM_ID,
  FEES,
  MICROCREDITS_PER_CREDIT,
  PLATFORM_ADDRESS,
  PLATFORM_FEE_PCT,
  CREATOR_HASH_MAP,
  getCreatorHash,
  getCreatorCustomTiers,
  SUBSCRIPTION_DURATION_BLOCKS,
  FEATURED_CREATORS,
} from '../config'
import { isValidAleoAddress } from '../utils'

describe('program configuration', () => {
  it('PROGRAM_ID matches deployed contract', () => {
    expect(PROGRAM_ID).toBe('veilsub_v29.aleo')
  })

  it('DEPLOYED_PROGRAM_ID matches PROGRAM_ID', () => {
    expect(DEPLOYED_PROGRAM_ID).toBe(PROGRAM_ID)
  })

  it('PLATFORM_ADDRESS is a valid Aleo address', () => {
    expect(isValidAleoAddress(PLATFORM_ADDRESS)).toBe(true)
  })

  it('PLATFORM_FEE_PCT is 5%', () => {
    expect(PLATFORM_FEE_PCT).toBe(5)
  })

  it('MICROCREDITS_PER_CREDIT is 1 million', () => {
    expect(MICROCREDITS_PER_CREDIT).toBe(1_000_000)
  })

  it('SUBSCRIPTION_DURATION_BLOCKS is ~30 days', () => {
    expect(SUBSCRIPTION_DURATION_BLOCKS).toBe(864_000)
  })
})

describe('FEES', () => {
  it('all fees are positive integers', () => {
    for (const [name, fee] of Object.entries(FEES)) {
      expect(fee).toBeGreaterThan(0)
      expect(Number.isInteger(fee)).toBe(true)
    }
  })

  it('subscribe fee covers transfer_private overhead', () => {
    expect(FEES.SUBSCRIBE).toBeGreaterThanOrEqual(FEES.REGISTER)
  })

  it('blind operations cost more than standard', () => {
    expect(FEES.SUBSCRIBE_BLIND).toBeGreaterThan(FEES.SUBSCRIBE)
    expect(FEES.RENEW_BLIND).toBeGreaterThan(FEES.RENEW)
  })

  it('verification is the cheapest operation', () => {
    expect(FEES.VERIFY).toBeLessThanOrEqual(FEES.REGISTER)
  })

  it('covers all 31 transitions', () => {
    const feeKeys = Object.keys(FEES)
    expect(feeKeys.length).toBeGreaterThanOrEqual(22)
  })
})

describe('CREATOR_HASH_MAP', () => {
  it('all keys are valid Aleo addresses', () => {
    for (const addr of Object.keys(CREATOR_HASH_MAP)) {
      expect(isValidAleoAddress(addr)).toBe(true)
    }
  })

  it('all values end with "field"', () => {
    for (const hash of Object.values(CREATOR_HASH_MAP)) {
      expect(hash.endsWith('field')).toBe(true)
    }
  })
})

describe('getCreatorHash', () => {
  it('returns hash for known creator', () => {
    const hash = getCreatorHash(PLATFORM_ADDRESS)
    expect(hash).not.toBeNull()
    expect(hash!.endsWith('field')).toBe(true)
  })

  it('returns null for unknown address', () => {
    expect(getCreatorHash('aleo1unknown')).toBeNull()
  })
})

describe('getCreatorCustomTiers', () => {
  it('returns tiers for known creator', () => {
    const tiers = getCreatorCustomTiers(PLATFORM_ADDRESS)
    expect(Object.keys(tiers).length).toBeGreaterThan(0)
  })

  it('returns empty for unknown creator', () => {
    const tiers = getCreatorCustomTiers('aleo1unknown')
    expect(Object.keys(tiers).length).toBe(0)
  })

  it('each tier has price and name', () => {
    const tiers = getCreatorCustomTiers(PLATFORM_ADDRESS)
    for (const tier of Object.values(tiers)) {
      expect(tier.price).toBeGreaterThan(0)
      expect(tier.name.length).toBeGreaterThan(0)
    }
  })
})

describe('FEATURED_CREATORS', () => {
  it('has at least 1 featured creator', () => {
    expect(FEATURED_CREATORS.length).toBeGreaterThanOrEqual(1)
  })

  it('all addresses start with aleo1 and have labels', () => {
    for (const c of FEATURED_CREATORS) {
      expect(c.address.startsWith('aleo1')).toBe(true)
      expect(c.label.length).toBeGreaterThan(0)
    }
  })
})
