import { describe, it, expect } from 'vitest'
import {
  FEES,
  MICROCREDITS_PER_CREDIT,
  PLATFORM_FEE_PCT,
  CREATOR_HASH_MAP,
  CREATOR_CUSTOM_TIERS,
  getCreatorHash,
  getCreatorCustomTiers,
  SUBSCRIPTION_DURATION_BLOCKS,
  TRIAL_DURATION_BLOCKS,
  TRIAL_PRICE_DIVISOR,

  SEED_CONTENT,
  FEATURED_CREATORS,
  APP_NAME,
  APP_DESCRIPTION,
} from '../config'

describe('FEES structure', () => {
  const expectedKeys = [
    'REGISTER', 'SUBSCRIBE', 'TIP', 'VERIFY', 'RENEW', 'PUBLISH',
    'SPLIT', 'CONVERT', 'AUDIT_TOKEN', 'CREATE_TIER', 'UPDATE_TIER',
    'DEPRECATE_TIER', 'UPDATE_CONTENT', 'DELETE_CONTENT',
    'GIFT_SUBSCRIPTION', 'REDEEM_GIFT', 'WITHDRAW_PLATFORM',
    'WITHDRAW_CREATOR', 'SUBSCRIBE_BLIND', 'RENEW_BLIND', 'VERIFY_TIER',
    'PUBLISH_ENCRYPTED', 'REVOKE_ACCESS', 'DISPUTE_CONTENT',
    'TRANSFER_PASS', 'COMMIT_TIP', 'REVEAL_TIP', 'PROVE_THRESHOLD',
    'SUBSCRIBE_TRIAL',
  ]

  it('contains all expected fee keys', () => {
    for (const key of expectedKeys) {
      expect(FEES).toHaveProperty(key)
    }
  })

  it('all fee values are numbers', () => {
    for (const [, fee] of Object.entries(FEES)) {
      expect(typeof fee).toBe('number')
    }
  })

  it('no fee exceeds 1 ALEO (1_000_000 microcredits)', () => {
    for (const [, fee] of Object.entries(FEES)) {
      expect(fee).toBeLessThanOrEqual(1_000_000)
    }
  })

  it('gift subscription is the most expensive standard operation', () => {
    expect(FEES.GIFT_SUBSCRIPTION).toBeGreaterThanOrEqual(FEES.SUBSCRIBE)
    expect(FEES.GIFT_SUBSCRIPTION).toBeGreaterThanOrEqual(FEES.RENEW)
  })

  it('trial subscription fee matches standard subscribe fee', () => {
    expect(FEES.SUBSCRIBE_TRIAL).toBe(FEES.SUBSCRIBE)
  })

  it('commit_tip is cheaper than reveal_tip (reveal includes transfer)', () => {
    expect(FEES.COMMIT_TIP).toBeLessThan(FEES.REVEAL_TIP)
  })
})

describe('app metadata', () => {
  it('APP_NAME is non-empty', () => {
    expect(APP_NAME.length).toBeGreaterThan(0)
  })

  it('APP_DESCRIPTION is non-empty', () => {
    expect(APP_DESCRIPTION.length).toBeGreaterThan(0)
  })
})

describe('duration and window constants', () => {
  it('SUBSCRIPTION_DURATION_BLOCKS is positive', () => {
    expect(SUBSCRIPTION_DURATION_BLOCKS).toBeGreaterThan(0)
  })

  it('TRIAL_DURATION_BLOCKS is positive and much shorter than subscription', () => {
    expect(TRIAL_DURATION_BLOCKS).toBeGreaterThan(0)
    expect(TRIAL_DURATION_BLOCKS).toBeLessThan(SUBSCRIPTION_DURATION_BLOCKS)
  })

  it('TRIAL_PRICE_DIVISOR is positive (trial is a fraction of full price)', () => {
    expect(TRIAL_PRICE_DIVISOR).toBeGreaterThan(0)
    expect(TRIAL_PRICE_DIVISOR).toBe(5) // 1/5 = 20%
  })

  it('MICROCREDITS_PER_CREDIT is 1_000_000', () => {
    expect(MICROCREDITS_PER_CREDIT).toBe(1_000_000)
  })

  it('PLATFORM_FEE_PCT is 5', () => {
    expect(PLATFORM_FEE_PCT).toBe(5)
  })
})

describe('CREATOR_HASH_MAP and FEATURED_CREATORS consistency', () => {
  // CREATOR_HASH_MAP may contain extra entries (test wallets, new registrants) beyond
  // the featured set — only assert the reverse: featured creators must have a hash.
  it('FEATURED_CREATORS addresses all have a hash in CREATOR_HASH_MAP', () => {
    const hashMapAddresses = new Set(Object.keys(CREATOR_HASH_MAP))
    for (const creator of FEATURED_CREATORS) {
      expect(hashMapAddresses.has(creator.address)).toBe(true)
    }
  })

  it('CREATOR_CUSTOM_TIERS addresses are a subset of FEATURED_CREATORS', () => {
    const featuredAddresses = new Set(FEATURED_CREATORS.map((c) => c.address))
    for (const address of Object.keys(CREATOR_CUSTOM_TIERS)) {
      expect(featuredAddresses.has(address)).toBe(true)
    }
  })

  it('CREATOR_CUSTOM_TIERS addresses are a subset of CREATOR_HASH_MAP', () => {
    const hashMapAddresses = new Set(Object.keys(CREATOR_HASH_MAP))
    for (const address of Object.keys(CREATOR_CUSTOM_TIERS)) {
      expect(hashMapAddresses.has(address)).toBe(true)
    }
  })

  it('at least 3 creators have hashes and tiers configured', () => {
    expect(Object.keys(CREATOR_HASH_MAP).length).toBeGreaterThanOrEqual(3)
    expect(Object.keys(CREATOR_CUSTOM_TIERS).length).toBeGreaterThanOrEqual(3)
  })
})

describe('FEATURED_CREATORS detailed validation', () => {
  it('all addresses start with aleo1', () => {
    for (const creator of FEATURED_CREATORS) {
      expect(creator.address.startsWith('aleo1')).toBe(true)
    }
  })

  it('all labels are non-empty strings', () => {
    for (const creator of FEATURED_CREATORS) {
      expect(typeof creator.label).toBe('string')
      expect(creator.label.trim().length).toBeGreaterThan(0)
    }
  })

  it('no duplicate addresses', () => {
    const addresses = FEATURED_CREATORS.map((c) => c.address)
    expect(new Set(addresses).size).toBe(addresses.length)
  })

  it('no duplicate labels', () => {
    const labels = FEATURED_CREATORS.map((c) => c.label)
    expect(new Set(labels).size).toBe(labels.length)
  })
})

describe('getCreatorHash advanced cases', () => {
  it('returns a field string for each creator in CREATOR_HASH_MAP', () => {
    for (const address of Object.keys(CREATOR_HASH_MAP)) {
      const hash = getCreatorHash(address)
      expect(hash).not.toBeNull()
      expect(hash!.endsWith('field')).toBe(true)
    }
  })

  it('field values contain only digits before the "field" suffix', () => {
    for (const hash of Object.values(CREATOR_HASH_MAP)) {
      const numericPart = hash.replace(/field$/, '')
      expect(/^\d+$/.test(numericPart)).toBe(true)
    }
  })

  it('returns null for empty string', () => {
    expect(getCreatorHash('')).toBeNull()
  })

  it('returns null for partial address match', () => {
    const fullAddr = FEATURED_CREATORS[0].address
    expect(getCreatorHash(fullAddr.slice(0, 20))).toBeNull()
  })

  it('each creator has a unique hash', () => {
    const hashes = Object.values(CREATOR_HASH_MAP)
    expect(new Set(hashes).size).toBe(hashes.length)
  })
})

describe('getCreatorCustomTiers advanced cases', () => {
  it('returns empty object for empty string', () => {
    expect(Object.keys(getCreatorCustomTiers('')).length).toBe(0)
  })

  it('all tier IDs are between 1 and MAX_TIER (20) for all creators', () => {
    for (const creator of FEATURED_CREATORS) {
      const tiers = getCreatorCustomTiers(creator.address)
      for (const id of Object.keys(tiers)) {
        const numId = parseInt(id, 10)
        expect(numId).toBeGreaterThanOrEqual(1)
        expect(numId).toBeLessThanOrEqual(20)
      }
    }
  })

  it('all tier prices are at or above MIN_PRICE (100 microcredits)', () => {
    for (const creator of FEATURED_CREATORS) {
      const tiers = getCreatorCustomTiers(creator.address)
      for (const tier of Object.values(tiers)) {
        expect(tier.price).toBeGreaterThanOrEqual(100)
      }
    }
  })

  it('tier prices increase with tier level for each creator', () => {
    for (const creator of FEATURED_CREATORS) {
      const tiers = getCreatorCustomTiers(creator.address)
      const ids = Object.keys(tiers).map(Number).sort((a, b) => a - b)
      for (let i = 1; i < ids.length; i++) {
        expect(tiers[ids[i]].price).toBeGreaterThan(tiers[ids[i - 1]].price)
      }
    }
  })

  it('all tier names are unique within each creator', () => {
    for (const creator of FEATURED_CREATORS) {
      const tiers = getCreatorCustomTiers(creator.address)
      const names = Object.values(tiers).map((t) => t.name)
      expect(new Set(names).size).toBe(names.length)
    }
  })
})

describe('SEED_CONTENT detailed validation', () => {
  it('minTier values are only 1, 2, or 3', () => {
    for (const post of SEED_CONTENT) {
      expect([1, 2, 3]).toContain(post.minTier)
    }
  })

  it('all ids are unique', () => {
    const ids = SEED_CONTENT.map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('all titles are unique', () => {
    const titles = SEED_CONTENT.map((s) => s.title)
    expect(new Set(titles).size).toBe(titles.length)
  })

  it('all createdAt values are valid ISO date strings', () => {
    for (const post of SEED_CONTENT) {
      const date = new Date(post.createdAt)
      expect(date.getTime()).not.toBeNaN()
    }
  })

  it('all posts have a contentId field', () => {
    for (const post of SEED_CONTENT) {
      expect(post.contentId).toBeDefined()
      expect(typeof post.contentId).toBe('string')
    }
  })

  it('higher tier posts have preview text (tier 2+ marketing)', () => {
    const highTierPosts = SEED_CONTENT.filter((s) => s.minTier >= 2)
    const withPreview = highTierPosts.filter((s) => s.preview)
    // At least some higher-tier posts should have preview text
    expect(withPreview.length).toBeGreaterThan(0)
  })

  it('body is always longer than title', () => {
    for (const post of SEED_CONTENT) {
      expect(post.body.length).toBeGreaterThan(post.title.length)
    }
  })
})
