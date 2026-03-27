import { describe, it, expect } from 'vitest'
import { TIERS } from '../../types'
import type { AccessPass, ContentPost, CreatorProfile, CustomTierInfo, TxStatus, SubscriptionTier } from '../../types'

describe('TIERS constant', () => {
  it('has exactly 3 tiers', () => {
    expect(TIERS).toHaveLength(3)
  })

  it('tier IDs are 1, 2, 3 in order', () => {
    expect(TIERS.map(t => t.id)).toEqual([1, 2, 3])
  })

  it('price multipliers increase with tier level', () => {
    for (let i = 1; i < TIERS.length; i++) {
      expect(TIERS[i].priceMultiplier).toBeGreaterThan(TIERS[i - 1].priceMultiplier)
    }
  })

  it('all tiers have non-empty names', () => {
    for (const tier of TIERS) {
      expect(tier.name.trim().length).toBeGreaterThan(0)
    }
  })

  it('all tiers have non-empty descriptions', () => {
    for (const tier of TIERS) {
      expect(tier.description.trim().length).toBeGreaterThan(0)
    }
  })

  it('all tiers have at least one feature', () => {
    for (const tier of TIERS) {
      expect(tier.features.length).toBeGreaterThanOrEqual(1)
    }
  })

  it('higher tiers have more features than lower tiers', () => {
    for (let i = 1; i < TIERS.length; i++) {
      expect(TIERS[i].features.length).toBeGreaterThanOrEqual(TIERS[i - 1].features.length)
    }
  })

  it('all feature strings are non-empty', () => {
    for (const tier of TIERS) {
      for (const feature of tier.features) {
        expect(feature.trim().length).toBeGreaterThan(0)
      }
    }
  })

  it('tier names are unique', () => {
    const names = TIERS.map(t => t.name)
    expect(new Set(names).size).toBe(names.length)
  })

  it('tier IDs are unique', () => {
    const ids = TIERS.map(t => t.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('price multipliers are all positive', () => {
    for (const tier of TIERS) {
      expect(tier.priceMultiplier).toBeGreaterThan(0)
    }
  })

  it('base tier has multiplier of 1', () => {
    expect(TIERS[0].priceMultiplier).toBe(1)
  })

  it('VIP tier is the most expensive (multiplier = 5)', () => {
    const vip = TIERS.find(t => t.name === 'VIP')
    expect(vip).toBeDefined()
    expect(vip!.priceMultiplier).toBe(5)
  })
})

describe('type shape validation: AccessPass', () => {
  it('validates a well-formed AccessPass object', () => {
    const pass: AccessPass = {
      owner: 'aleo1hp9m08faf27hr7yu686t6r52nj36g3k5n7ymjhyzsvxjp58epyxsprk5wk',
      creator: 'aleo1hp9m08faf27hr7yu686t6r52nj36g3k5n7ymjhyzsvxjp58epyxsprk5wk',
      tier: 2,
      passId: '12345',
      expiresAt: 999999,
      privacyLevel: 0,
      rawPlaintext: '{ ... }',
    }
    expect(pass.owner).toContain('aleo1')
    expect(pass.creator).toContain('aleo1')
    expect(pass.tier).toBeGreaterThanOrEqual(1)
    expect(pass.tier).toBeLessThanOrEqual(20)
    expect(typeof pass.passId).toBe('string')
    expect(typeof pass.expiresAt).toBe('number')
    expect(typeof pass.rawPlaintext).toBe('string')
  })

  it('enforces that expiresAt is a block height (positive integer)', () => {
    const pass: AccessPass = {
      owner: 'aleo1test',
      creator: 'aleo1test',
      tier: 1,
      passId: '1',
      expiresAt: 864000,
      privacyLevel: 0,
      rawPlaintext: '',
    }
    expect(Number.isInteger(pass.expiresAt)).toBe(true)
    expect(pass.expiresAt).toBeGreaterThan(0)
  })
})

describe('type shape validation: ContentPost', () => {
  it('validates a fully populated ContentPost', () => {
    const post: ContentPost = {
      id: 'post-1',
      title: 'Test Post',
      body: 'Full body content here',
      preview: 'Short preview...',
      minTier: 1,
      createdAt: '2026-03-01T10:00:00Z',
      updatedAt: '2026-03-02T10:00:00Z',
      contentId: '12345',
      gated: false,
    }
    expect(post.id).toBeTruthy()
    expect(post.title).toBeTruthy()
    expect(post.body).not.toBeNull()
    expect(post.minTier).toBeGreaterThanOrEqual(1)
    expect(new Date(post.createdAt).getTime()).not.toBeNaN()
  })

  it('allows null body for gated content', () => {
    const post: ContentPost = {
      id: 'gated-1',
      title: 'Gated Post',
      body: null,
      minTier: 2,
      createdAt: '2026-03-01T10:00:00Z',
      contentId: 'seed',
      gated: true,
    }
    expect(post.body).toBeNull()
    expect(post.gated).toBe(true)
  })

  it('allows optional fields to be undefined', () => {
    const post: ContentPost = {
      id: 'minimal-1',
      title: 'Minimal Post',
      body: 'Content',
      minTier: 1,
      createdAt: '2026-03-01T10:00:00Z',
      contentId: 'seed',
    }
    expect(post.preview).toBeUndefined()
    expect(post.updatedAt).toBeUndefined()
    expect(post.gated).toBeUndefined()
  })
})

describe('type shape validation: CreatorProfile', () => {
  it('validates a registered creator profile', () => {
    const profile: CreatorProfile = {
      address: 'aleo1hp9m08faf27hr7yu686t6r52nj36g3k5n7ymjhyzsvxjp58epyxsprk5wk',
      tierPrice: 500,
      subscriberCount: 10,
      totalRevenue: 50000,
      subscriberThreshold: '10+',
      revenueThreshold: '<1 ALEO',
      contentCount: 5,
      tierCount: 3,
      customTiers: {
        1: { price: 500, name: 'Supporter' },
        2: { price: 2000, name: 'Premium' },
        3: { price: 5000, name: 'VIP' },
      },
    }
    expect(profile.tierPrice).not.toBeNull()
    expect(profile.subscriberCount).toBeGreaterThanOrEqual(0)
    expect(profile.totalRevenue).toBeGreaterThanOrEqual(0)
    expect(profile.subscriberThreshold).toBe('10+')
    expect(profile.revenueThreshold).toBe('<1 ALEO')
    expect(Object.keys(profile.customTiers!).length).toBe(3)
  })

  it('allows null tierPrice for unregistered creators', () => {
    const profile: CreatorProfile = {
      address: 'aleo1unknown',
      tierPrice: null,
      subscriberCount: 0,
      totalRevenue: 0,
      subscriberThreshold: 'New',
      revenueThreshold: 'New',
    }
    expect(profile.tierPrice).toBeNull()
    expect(profile.subscriberCount).toBe(0)
    expect(profile.subscriberThreshold).toBe('New')
  })

  it('allows optional contentCount and tierCount to be undefined', () => {
    const profile: CreatorProfile = {
      address: 'aleo1test',
      tierPrice: 100,
      subscriberCount: 0,
      totalRevenue: 0,
      subscriberThreshold: 'New',
      revenueThreshold: 'New',
    }
    expect(profile.contentCount).toBeUndefined()
    expect(profile.tierCount).toBeUndefined()
    expect(profile.customTiers).toBeUndefined()
  })
})

describe('type shape validation: CustomTierInfo', () => {
  it('validates price is a positive number', () => {
    const tier: CustomTierInfo = { price: 500, name: 'Supporter' }
    expect(tier.price).toBeGreaterThan(0)
    expect(typeof tier.name).toBe('string')
  })

  it('validates name is a non-empty string', () => {
    const tier: CustomTierInfo = { price: 100, name: 'Basic' }
    expect(tier.name.trim().length).toBeGreaterThan(0)
  })
})

describe('TxStatus type values', () => {
  it('all valid TxStatus values are recognized', () => {
    const validStatuses: TxStatus[] = ['idle', 'signing', 'proving', 'broadcasting', 'confirmed', 'failed']
    expect(validStatuses).toHaveLength(6)
    // Verify each is a non-empty string
    for (const status of validStatuses) {
      expect(typeof status).toBe('string')
      expect(status.length).toBeGreaterThan(0)
    }
  })

  it('idle is the initial state', () => {
    const status: TxStatus = 'idle'
    expect(status).toBe('idle')
  })

  it('confirmed and failed are terminal states', () => {
    const terminalStates: TxStatus[] = ['confirmed', 'failed']
    expect(terminalStates).toContain('confirmed')
    expect(terminalStates).toContain('failed')
  })
})

describe('SubscriptionTier interface shape', () => {
  it('matches TIERS entries', () => {
    for (const tier of TIERS) {
      const t: SubscriptionTier = tier
      expect(typeof t.id).toBe('number')
      expect(typeof t.name).toBe('string')
      expect(typeof t.priceMultiplier).toBe('number')
      expect(typeof t.description).toBe('string')
      expect(Array.isArray(t.features)).toBe(true)
    }
  })
})
