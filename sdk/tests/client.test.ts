import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  VeilSubClient,
  VeilSubError,
  // Constants
  DEFAULT_PROGRAM_ID,
  TESTNET_API_URL,
  FEES,
  TRANSITIONS,
  MAPPING_NAMES,
  MAX_TIER,
  MIN_PRICE,
  PLATFORM_ADDRESS,
  MICROCREDITS_PER_CREDIT,
  SUBSCRIPTION_DURATION_BLOCKS,
  TRIAL_DURATION_BLOCKS,
  TRIAL_PRICE_DIVISOR,
  SCOPE_ALL,
  SCOPE_CREATOR,
  SCOPE_TIER,
  TOKEN_CREDITS,
  TOKEN_USDCX,
  TOKEN_USAD,
  TOKEN_META,
  // Utilities
  stripLeoSuffix,
  parseLeoU64,
  parseLeoField,
  parseLeoBool,
  toU8,
  toU32,
  toU64,
  toField,
  generateFieldId,
  isValidAleoAddress,
  assertValidAddress,
  microToCredits,
  creditsToMicro,
  formatCredits,
  secondsToBlocks,
  blocksToSeconds,
  calculateExpiry,
  parseErrorCode,
  getErrorDescription,
  // Transaction builders
  buildSubscribe,
  buildSubscribeBlind,
  buildSubscribeTrial,
  buildRenew,
  buildRenewBlind,
  buildGiftSubscription,
  buildRedeemGift,
  buildTransferPass,
  buildTip,
  buildCommitTip,
  buildRevealTip,
  buildPublishContent,
  buildPublishEncryptedContent,
  buildUpdateContent,
  buildDeleteContent,
  buildDisputeContent,
  buildRevokeAccess,
  buildVerifyAccess,
  buildVerifyTierAccess,
  buildCreateAuditToken,
  buildProveThreshold,
  buildRegisterCreator,
  buildCreateCustomTier,
  buildUpdateTierPrice,
  buildDeprecateTier,
  buildWithdrawCreatorRev,
  buildWithdrawPlatformFees,
} from '../src/index';

// ===========================================================================
// Test Fixtures
// ===========================================================================

const MOCK_CREATOR = 'aleo1hp9m08faf27hr7yu686t6r52nj36g3k5n7ymjhyzsvxjp58epyxsprk5wk';
const MOCK_CREATOR_HASH = '7077346389288357645876044527218031735459465201928260558184537791016616885101field';
const MOCK_RECIPIENT = 'aleo1kurx4vfrjy6u69lglu2amvk2k3apyh7g7axpfvvqcvasfln33gqqy5rv2e';
const MOCK_PASS_ID = '123456789field';
const MOCK_PAYMENT_RECORD = '{ owner: aleo1hp9m08faf27hr7yu686t6r52nj36g3k5n7ymjhyzsvxjp58epyxsprk5wk.private, microcredits: 50000000u64.private, _nonce: 0group.public }';
const MOCK_ACCESS_PASS = '{ owner: aleo1hp9m08faf27hr7yu686t6r52nj36g3k5n7ymjhyzsvxjp58epyxsprk5wk.private, creator: aleo1hp9m08faf27hr7yu686t6r52nj36g3k5n7ymjhyzsvxjp58epyxsprk5wk.private, tier: 1u8.private, pass_id: 123field.private, expires_at: 1000000u32.private, privacy_level: 0u8.private }';
const MOCK_TIER_RECORD = '{ owner: aleo1hp9m08faf27hr7yu686t6r52nj36g3k5n7ymjhyzsvxjp58epyxsprk5wk.private, tier_id: 2u8.private, name_hash: 999field.private, price: 10000000u64.private, created_at: 0u32.private }';

// ===========================================================================
// Utility Function Tests
// ===========================================================================

describe('Leo Value Parsing', () => {
  describe('stripLeoSuffix', () => {
    it('should strip u64 suffix', () => {
      expect(stripLeoSuffix('1000000u64')).toBe('1000000');
    });
    it('should strip u8 suffix', () => {
      expect(stripLeoSuffix('5u8')).toBe('5');
    });
    it('should strip u32 suffix', () => {
      expect(stripLeoSuffix('864000u32')).toBe('864000');
    });
    it('should strip u128 suffix', () => {
      expect(stripLeoSuffix('999999u128')).toBe('999999');
    });
    it('should strip field suffix', () => {
      expect(stripLeoSuffix('123456field')).toBe('123456');
    });
    it('should strip bool suffix', () => {
      expect(stripLeoSuffix('truebool')).toBe('true');
    });
    it('should not modify plain strings', () => {
      expect(stripLeoSuffix('hello')).toBe('hello');
    });
  });

  describe('parseLeoU64', () => {
    it('should parse valid u64', () => {
      expect(parseLeoU64('1000000u64')).toBe(1000000);
    });
    it('should parse zero', () => {
      expect(parseLeoU64('0u64')).toBe(0);
    });
    it('should return null for null input', () => {
      expect(parseLeoU64(null)).toBeNull();
    });
    it('should return null for undefined', () => {
      expect(parseLeoU64(undefined)).toBeNull();
    });
    it('should handle whitespace', () => {
      expect(parseLeoU64('  500u64  ')).toBe(500);
    });
    it('should parse u8 values', () => {
      expect(parseLeoU64('5u8')).toBe(5);
    });
  });

  describe('parseLeoField', () => {
    it('should strip field suffix', () => {
      expect(parseLeoField('123456field')).toBe('123456');
    });
    it('should return null for null', () => {
      expect(parseLeoField(null)).toBeNull();
    });
    it('should handle large field values', () => {
      expect(parseLeoField('7077346389288357645876044527218031735459465201928260558184537791016616885101field'))
        .toBe('7077346389288357645876044527218031735459465201928260558184537791016616885101');
    });
  });

  describe('parseLeoBool', () => {
    it('should parse true', () => {
      expect(parseLeoBool('true')).toBe(true);
    });
    it('should parse false', () => {
      expect(parseLeoBool('false')).toBe(false);
    });
    it('should return null for null', () => {
      expect(parseLeoBool(null)).toBeNull();
    });
    it('should handle case insensitivity', () => {
      expect(parseLeoBool('True')).toBe(true);
    });
  });
});

describe('Leo Value Formatting', () => {
  it('should format u8', () => {
    expect(toU8(5)).toBe('5u8');
  });
  it('should format u32', () => {
    expect(toU32(864000)).toBe('864000u32');
  });
  it('should format u64', () => {
    expect(toU64(1000000)).toBe('1000000u64');
  });
  it('should format field from number', () => {
    expect(toField(123456)).toBe('123456field');
  });
  it('should format field from string', () => {
    expect(toField('789012')).toBe('789012field');
  });
  it('should not double-suffix field', () => {
    expect(toField('123field')).toBe('123field');
  });
});

describe('ID Generation', () => {
  it('should generate a non-empty string', () => {
    const id = generateFieldId();
    expect(id).toBeTruthy();
    expect(typeof id).toBe('string');
  });
  it('should generate unique values', () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateFieldId()));
    expect(ids.size).toBe(100);
  });
  it('should generate numeric strings', () => {
    const id = generateFieldId();
    expect(/^\d+$/.test(id)).toBe(true);
  });
});

describe('Address Validation', () => {
  it('should validate correct address', () => {
    expect(isValidAleoAddress(MOCK_CREATOR)).toBe(true);
  });
  it('should reject short address', () => {
    expect(isValidAleoAddress('aleo1short')).toBe(false);
  });
  it('should reject non-aleo prefix', () => {
    expect(isValidAleoAddress('0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef')).toBe(false);
  });
  it('should reject empty string', () => {
    expect(isValidAleoAddress('')).toBe(false);
  });
  it('assertValidAddress should throw for invalid', () => {
    expect(() => assertValidAddress('bad')).toThrow(VeilSubError);
  });
  it('assertValidAddress should not throw for valid', () => {
    expect(() => assertValidAddress(MOCK_CREATOR)).not.toThrow();
  });
});

describe('Unit Conversions', () => {
  it('microToCredits: 1M micro = 1 credit', () => {
    expect(microToCredits(1_000_000)).toBe(1);
  });
  it('creditsToMicro: 1.5 credits = 1.5M micro', () => {
    expect(creditsToMicro(1.5)).toBe(1_500_000);
  });
  it('formatCredits: 5M micro = "5 ALEO"', () => {
    expect(formatCredits(5_000_000)).toBe('5 ALEO');
  });
  it('formatCredits: 500K micro = "0.5 ALEO"', () => {
    expect(formatCredits(500_000)).toBe('0.5 ALEO');
  });
  it('formatCredits: 100K micro = "0.1 ALEO"', () => {
    expect(formatCredits(100_000)).toBe('0.1 ALEO');
  });
});

describe('Block Time Estimation', () => {
  it('secondsToBlocks: 1 day = 28800 blocks', () => {
    expect(secondsToBlocks(86400)).toBe(28800);
  });
  it('blocksToSeconds: 864000 blocks = 30 days', () => {
    expect(blocksToSeconds(864000)).toBe(2592000);
  });
  it('calculateExpiry: current + duration', () => {
    expect(calculateExpiry(100_000, 864_000)).toBe(964_000);
  });
  it('calculateExpiry: default duration ~30 days', () => {
    expect(calculateExpiry(100_000)).toBe(100_000 + 864_000);
  });
});

describe('Error Code Parsing', () => {
  it('should parse known error code', () => {
    expect(parseErrorCode('Transaction rejected: ERR_004')).toContain('Creator is not registered');
  });
  it('should return original for unknown error', () => {
    expect(parseErrorCode('Unknown error')).toBe('Unknown error');
  });
  it('getErrorDescription: known code', () => {
    expect(getErrorDescription('ERR_022')).toBe('Payment amount is insufficient for this tier');
  });
  it('getErrorDescription: unknown code', () => {
    expect(getErrorDescription('ERR_999')).toBeNull();
  });
});

// ===========================================================================
// Constants Tests
// ===========================================================================

describe('Constants', () => {
  it('should have correct program ID', () => {
    expect(DEFAULT_PROGRAM_ID).toBe('veilsub_v29.aleo');
  });
  it('should have correct API URL', () => {
    expect(TESTNET_API_URL).toBe('https://api.explorer.provable.com/v1/testnet');
  });
  it('should have 1M microcredits per credit', () => {
    expect(MICROCREDITS_PER_CREDIT).toBe(1_000_000);
  });
  it('should have correct subscription duration', () => {
    expect(SUBSCRIPTION_DURATION_BLOCKS).toBe(864_000);
  });
  it('should have correct trial duration', () => {
    expect(TRIAL_DURATION_BLOCKS).toBe(1_000);
  });
  it('should have correct trial divisor', () => {
    expect(TRIAL_PRICE_DIVISOR).toBe(5);
  });
  it('should have max tier of 20', () => {
    expect(MAX_TIER).toBe(20);
  });
  it('should have min price of 100', () => {
    expect(MIN_PRICE).toBe(100);
  });
  it('should have correct platform address', () => {
    expect(PLATFORM_ADDRESS).toBe(MOCK_CREATOR);
  });
  it('should have 26 mapping names', () => {
    expect(Object.keys(MAPPING_NAMES)).toHaveLength(26);
  });
  it('should have 31 transition names', () => {
    expect(Object.keys(TRANSITIONS)).toHaveLength(31);
  });
  it('SCOPE_ALL should be 15', () => {
    expect(SCOPE_ALL).toBe(15);
    expect(SCOPE_CREATOR | SCOPE_TIER | 4 | 8).toBe(SCOPE_ALL);
  });
  it('TOKEN_META should have 3 entries', () => {
    expect(Object.keys(TOKEN_META)).toHaveLength(3);
    expect(TOKEN_META[TOKEN_CREDITS].symbol).toBe('ALEO');
    expect(TOKEN_META[TOKEN_USDCX].symbol).toBe('USDCx');
    expect(TOKEN_META[TOKEN_USAD].symbol).toBe('USAD');
  });
});

// ===========================================================================
// Transaction Builder Tests
// ===========================================================================

describe('Transaction Builders — Creator', () => {
  it('buildRegisterCreator', () => {
    const tx = buildRegisterCreator({ price: 5_000_000 });
    expect(tx.functionName).toBe('register_creator');
    expect(tx.programId).toBe(DEFAULT_PROGRAM_ID);
    expect(tx.inputs).toEqual(['5000000u64']);
    expect(tx.fee).toBe(FEES.REGISTER);
  });

  it('buildCreateCustomTier', () => {
    const tx = buildCreateCustomTier({ tierId: 2, price: 10_000_000, nameHash: '999' });
    expect(tx.functionName).toBe('create_custom_tier');
    expect(tx.inputs).toEqual(['2u8', '10000000u64', '999field']);
  });

  it('buildUpdateTierPrice', () => {
    const tx = buildUpdateTierPrice({ tierRecord: MOCK_TIER_RECORD, newPrice: 15_000_000 });
    expect(tx.functionName).toBe('update_tier_price');
    expect(tx.inputs[0]).toBe(MOCK_TIER_RECORD);
    expect(tx.inputs[1]).toBe('15000000u64');
  });

  it('buildDeprecateTier', () => {
    const tx = buildDeprecateTier({ tierRecord: MOCK_TIER_RECORD });
    expect(tx.functionName).toBe('deprecate_tier');
    expect(tx.inputs[0]).toBe(MOCK_TIER_RECORD);
  });

  it('buildWithdrawCreatorRev', () => {
    const tx = buildWithdrawCreatorRev({ amount: 1_000_000 });
    expect(tx.functionName).toBe('withdraw_creator_rev');
    expect(tx.inputs).toEqual(['1000000u64']);
  });

  it('buildWithdrawPlatformFees', () => {
    const tx = buildWithdrawPlatformFees({ amount: 500_000 });
    expect(tx.functionName).toBe('withdraw_platform_fees');
    expect(tx.inputs).toEqual(['500000u64']);
  });
});

describe('Transaction Builders — Subscriptions', () => {
  it('buildSubscribe with explicit passId', () => {
    const tx = buildSubscribe({
      paymentRecord: MOCK_PAYMENT_RECORD,
      creatorAddress: MOCK_CREATOR,
      tier: 1,
      amount: 5_000_000,
      passId: '42',
      expiresAt: 1_500_000,
    });
    expect(tx.functionName).toBe('subscribe');
    expect(tx.inputs[0]).toBe(MOCK_PAYMENT_RECORD);
    expect(tx.inputs[1]).toBe(MOCK_CREATOR);
    expect(tx.inputs[2]).toBe('1u8');
    expect(tx.inputs[3]).toBe('5000000u64');
    expect(tx.inputs[4]).toBe('42field');
    expect(tx.inputs[5]).toBe('1500000u32');
    expect(tx.fee).toBe(FEES.SUBSCRIBE);
  });

  it('buildSubscribe auto-generates passId', () => {
    const tx = buildSubscribe({
      paymentRecord: MOCK_PAYMENT_RECORD,
      creatorAddress: MOCK_CREATOR,
      tier: 1,
      amount: 5_000_000,
      expiresAt: 1_500_000,
    });
    expect(tx.inputs[4]).toMatch(/^\d+field$/);
  });

  it('buildSubscribeBlind', () => {
    const tx = buildSubscribeBlind({
      paymentRecord: MOCK_PAYMENT_RECORD,
      creatorAddress: MOCK_CREATOR,
      nonce: '999',
      tier: 2,
      amount: 10_000_000,
      expiresAt: 1_500_000,
    });
    expect(tx.functionName).toBe('subscribe_blind');
    expect(tx.inputs[2]).toBe('999field');
    expect(tx.fee).toBe(FEES.SUBSCRIBE_BLIND);
  });

  it('buildSubscribeTrial', () => {
    const tx = buildSubscribeTrial({
      paymentRecord: MOCK_PAYMENT_RECORD,
      creatorAddress: MOCK_CREATOR,
      tier: 1,
      amount: 1_000_000,
      expiresAt: 101_000,
    });
    expect(tx.functionName).toBe('subscribe_trial');
    expect(tx.fee).toBe(FEES.SUBSCRIBE_TRIAL);
  });

  it('buildRenew', () => {
    const tx = buildRenew({
      accessPass: MOCK_ACCESS_PASS,
      paymentRecord: MOCK_PAYMENT_RECORD,
      newTier: 2,
      amount: 10_000_000,
      newExpiresAt: 2_000_000,
    });
    expect(tx.functionName).toBe('renew');
    expect(tx.inputs[0]).toBe(MOCK_ACCESS_PASS);
    expect(tx.fee).toBe(FEES.RENEW);
  });

  it('buildRenewBlind', () => {
    const tx = buildRenewBlind({
      accessPass: MOCK_ACCESS_PASS,
      paymentRecord: MOCK_PAYMENT_RECORD,
      nonce: '777',
      newTier: 3,
      amount: 15_000_000,
      newExpiresAt: 2_000_000,
    });
    expect(tx.functionName).toBe('renew_blind');
    expect(tx.inputs[2]).toBe('777field');
  });

  it('buildGiftSubscription', () => {
    const tx = buildGiftSubscription({
      paymentRecord: MOCK_PAYMENT_RECORD,
      creatorAddress: MOCK_CREATOR,
      recipientAddress: MOCK_RECIPIENT,
      tier: 1,
      amount: 5_000_000,
      expiresAt: 1_500_000,
    });
    expect(tx.functionName).toBe('gift_subscription');
    expect(tx.inputs[2]).toBe(MOCK_RECIPIENT);
    expect(tx.fee).toBe(FEES.GIFT_SUBSCRIPTION);
  });

  it('buildRedeemGift', () => {
    const tx = buildRedeemGift({ giftToken: '{ ... }' });
    expect(tx.functionName).toBe('redeem_gift');
    expect(tx.inputs[0]).toBe('{ ... }');
  });

  it('buildTransferPass', () => {
    const tx = buildTransferPass({
      accessPass: MOCK_ACCESS_PASS,
      recipientAddress: MOCK_RECIPIENT,
    });
    expect(tx.functionName).toBe('transfer_pass');
    expect(tx.inputs[1]).toBe(MOCK_RECIPIENT);
    expect(tx.fee).toBe(FEES.TRANSFER_PASS);
  });
});

describe('Transaction Builders — Content', () => {
  it('buildPublishContent', () => {
    const tx = buildPublishContent({
      contentId: '123',
      minTier: 1,
      contentHash: '456',
    });
    expect(tx.functionName).toBe('publish_content');
    expect(tx.inputs).toEqual(['123field', '1u8', '456field']);
  });

  it('buildPublishEncryptedContent', () => {
    const tx = buildPublishEncryptedContent({
      contentId: '123',
      minTier: 2,
      contentHash: '456',
      encryptionCommitment: '789',
    });
    expect(tx.functionName).toBe('publish_encrypted_content');
    expect(tx.inputs[3]).toBe('789field');
  });

  it('buildUpdateContent', () => {
    const tx = buildUpdateContent({
      contentId: '123',
      newMinTier: 3,
      newContentHash: '999',
    });
    expect(tx.functionName).toBe('update_content');
    expect(tx.inputs).toEqual(['123field', '3u8', '999field']);
  });

  it('buildDeleteContent', () => {
    const tx = buildDeleteContent({
      contentId: '123',
      reasonHash: '555',
    });
    expect(tx.functionName).toBe('delete_content');
    expect(tx.inputs).toEqual(['123field', '555field']);
  });

  it('buildDisputeContent', () => {
    const tx = buildDisputeContent({
      accessPass: MOCK_ACCESS_PASS,
      contentId: '123',
    });
    expect(tx.functionName).toBe('dispute_content');
    expect(tx.inputs[1]).toBe('123field');
  });

  it('buildRevokeAccess', () => {
    const tx = buildRevokeAccess({ passId: '999' });
    expect(tx.functionName).toBe('revoke_access');
    expect(tx.inputs).toEqual(['999field']);
  });
});

describe('Transaction Builders — Tipping', () => {
  it('buildTip', () => {
    const tx = buildTip({
      paymentRecord: MOCK_PAYMENT_RECORD,
      creatorAddress: MOCK_CREATOR,
      amount: 1_000_000,
    });
    expect(tx.functionName).toBe('tip');
    expect(tx.inputs[2]).toBe('1000000u64');
    expect(tx.fee).toBe(FEES.TIP);
  });

  it('buildCommitTip', () => {
    const tx = buildCommitTip({
      creatorAddress: MOCK_CREATOR,
      amount: 500_000,
      salt: '12345',
    });
    expect(tx.functionName).toBe('commit_tip');
    expect(tx.inputs[2]).toBe('12345field');
  });

  it('buildRevealTip', () => {
    const tx = buildRevealTip({
      paymentRecord: MOCK_PAYMENT_RECORD,
      creatorAddress: MOCK_CREATOR,
      amount: 500_000,
      salt: '12345',
    });
    expect(tx.functionName).toBe('reveal_tip');
    expect(tx.inputs[3]).toBe('12345field');
  });
});

describe('Transaction Builders — Verification', () => {
  it('buildVerifyAccess', () => {
    const tx = buildVerifyAccess({
      accessPass: MOCK_ACCESS_PASS,
      creatorAddress: MOCK_CREATOR,
    });
    expect(tx.functionName).toBe('verify_access');
    expect(tx.inputs[1]).toBe(MOCK_CREATOR);
    expect(tx.fee).toBe(FEES.VERIFY);
  });

  it('buildVerifyTierAccess', () => {
    const tx = buildVerifyTierAccess({
      accessPass: MOCK_ACCESS_PASS,
      creatorAddress: MOCK_CREATOR,
      requiredTier: 2,
    });
    expect(tx.functionName).toBe('verify_tier_access');
    expect(tx.inputs[2]).toBe('2u8');
  });

  it('buildCreateAuditToken with default scope', () => {
    const tx = buildCreateAuditToken({
      accessPass: MOCK_ACCESS_PASS,
      verifierAddress: MOCK_RECIPIENT,
    });
    expect(tx.functionName).toBe('create_audit_token');
    expect(tx.inputs[2]).toBe('15u64'); // SCOPE_ALL
  });

  it('buildCreateAuditToken with custom scope', () => {
    const tx = buildCreateAuditToken({
      accessPass: MOCK_ACCESS_PASS,
      verifierAddress: MOCK_RECIPIENT,
      scopeMask: 3, // creator + tier
    });
    expect(tx.inputs[2]).toBe('3u64');
  });

  it('buildProveThreshold', () => {
    const tx = buildProveThreshold({ threshold: 100 });
    expect(tx.functionName).toBe('prove_subscriber_threshold');
    expect(tx.inputs).toEqual(['100u64']);
  });
});

// ===========================================================================
// VeilSubClient Tests
// ===========================================================================

describe('VeilSubClient', () => {
  let client: VeilSubClient;
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
    client = new VeilSubClient({
      fetchFn: mockFetch as unknown as typeof fetch,
    });
  });

  describe('constructor', () => {
    it('should use default config', () => {
      const defaultClient = new VeilSubClient({ fetchFn: mockFetch as unknown as typeof fetch });
      expect(defaultClient.programId).toBe(DEFAULT_PROGRAM_ID);
      expect(defaultClient.networkUrl).toBe(TESTNET_API_URL);
    });

    it('should accept custom config', () => {
      const custom = new VeilSubClient({
        programId: 'custom.aleo',
        networkUrl: 'https://custom.api.com',
        fetchFn: mockFetch as unknown as typeof fetch,
      });
      expect(custom.programId).toBe('custom.aleo');
      expect(custom.networkUrl).toBe('https://custom.api.com');
    });

    it('should select mainnet URL for mainnet network', () => {
      const mainnetClient = new VeilSubClient({
        network: 'mainnet',
        fetchFn: mockFetch as unknown as typeof fetch,
      });
      expect(mainnetClient.networkUrl).toContain('mainnet');
    });
  });

  describe('queryMapping', () => {
    it('should return parsed value for existing key', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        text: async () => '"5000000u64"',
      });
      const result = await client.queryMapping('tier_prices', MOCK_CREATOR_HASH);
      expect(result).toBe('5000000u64');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/mapping/tier_prices/'),
        expect.any(Object),
      );
    });

    it('should return null for missing key (404)', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
      });
      const result = await client.queryMapping('tier_prices', 'nonexistent');
      expect(result).toBeNull();
    });

    it('should return null for "null" response', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        text: async () => 'null',
      });
      const result = await client.queryMapping('tier_prices', 'missing');
      expect(result).toBeNull();
    });

    it('should throw VeilSubError on server error', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
      });
      await expect(client.queryMapping('tier_prices', 'key')).rejects.toThrow(VeilSubError);
    });
  });

  describe('getCreatorStats', () => {
    it('should return stats for registered creator', async () => {
      mockFetch.mockImplementation(async (url: string) => {
        if (url.includes('tier_prices')) return { ok: true, text: async () => '"5000000u64"' };
        if (url.includes('subscriber_count')) return { ok: true, text: async () => '"42u64"' };
        if (url.includes('total_revenue')) return { ok: true, text: async () => '"100000000u64"' };
        if (url.includes('content_count')) return { ok: true, text: async () => '"10u64"' };
        if (url.includes('tier_count')) return { ok: true, text: async () => '"3u64"' };
        return { ok: true, text: async () => 'null' };
      });

      const stats = await client.getCreatorStats(MOCK_CREATOR_HASH);
      expect(stats.registered).toBe(true);
      expect(stats.basePrice).toBe(5_000_000);
      expect(stats.subscriberCount).toBe(42);
      expect(stats.totalRevenue).toBe(100_000_000);
      expect(stats.contentCount).toBe(10);
      expect(stats.tierCount).toBe(3);
    });

    it('should return zero stats for unregistered creator', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        text: async () => 'null',
      });

      const stats = await client.getCreatorStats('unknown_hash');
      expect(stats.registered).toBe(false);
      expect(stats.subscriberCount).toBe(0);
    });
  });

  describe('isAccessRevoked', () => {
    it('should return true when revoked', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        text: async () => '"true"',
      });
      expect(await client.isAccessRevoked(MOCK_PASS_ID)).toBe(true);
    });

    it('should return false when not revoked', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        text: async () => 'null',
      });
      expect(await client.isAccessRevoked(MOCK_PASS_ID)).toBe(false);
    });
  });

  describe('getPlatformStats', () => {
    it('should aggregate platform stats', async () => {
      mockFetch.mockImplementation(async (url: string) => {
        if (url.includes('total_creators')) return { ok: true, text: async () => '"5u64"' };
        if (url.includes('total_content')) return { ok: true, text: async () => '"100u64"' };
        if (url.includes('platform_revenue')) return { ok: true, text: async () => '"50000000u64"' };
        return { ok: true, text: async () => 'null' };
      });

      const stats = await client.getPlatformStats();
      expect(stats.totalCreators).toBe(5);
      expect(stats.totalContent).toBe(100);
      expect(stats.platformRevenue).toBe(50_000_000);
    });
  });

  describe('transaction builder methods on client', () => {
    it('buildSubscribeTransaction uses client programId', () => {
      const customClient = new VeilSubClient({
        programId: 'custom_v99.aleo',
        fetchFn: mockFetch as unknown as typeof fetch,
      });
      const tx = customClient.buildSubscribeTransaction({
        paymentRecord: MOCK_PAYMENT_RECORD,
        creatorAddress: MOCK_CREATOR,
        tier: 1,
        amount: 5_000_000,
        expiresAt: 1_500_000,
      });
      expect(tx.programId).toBe('custom_v99.aleo');
    });

    it('buildTipTransaction', () => {
      const tx = client.buildTipTransaction({
        paymentRecord: MOCK_PAYMENT_RECORD,
        creatorAddress: MOCK_CREATOR,
        amount: 1_000_000,
      });
      expect(tx.functionName).toBe('tip');
      expect(tx.programId).toBe(DEFAULT_PROGRAM_ID);
    });
  });

  describe('getBlockHeight', () => {
    it('should return block height', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        text: async () => '1234567',
      });
      const height = await client.getBlockHeight();
      expect(height).toBe(1234567);
    });

    it('should throw on error', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
      });
      await expect(client.getBlockHeight()).rejects.toThrow(VeilSubError);
    });
  });

  describe('getFee static method', () => {
    it('should return correct fee for SUBSCRIBE', () => {
      expect(VeilSubClient.getFee('SUBSCRIBE')).toBe(300_000);
    });
    it('should return correct fee for TIP', () => {
      expect(VeilSubClient.getFee('TIP')).toBe(250_000);
    });
  });
});

// ===========================================================================
// VeilSubError Tests
// ===========================================================================

describe('VeilSubError', () => {
  it('should create error with message only', () => {
    const err = new VeilSubError('test error');
    expect(err.message).toBe('test error');
    expect(err.name).toBe('VeilSubError');
    expect(err.code).toBeNull();
    expect(err.status).toBeNull();
  });

  it('should create error with code and status', () => {
    const err = new VeilSubError('test', 'ERR_004', 404);
    expect(err.code).toBe('ERR_004');
    expect(err.status).toBe(404);
  });

  it('should be instanceof Error', () => {
    const err = new VeilSubError('test');
    expect(err instanceof Error).toBe(true);
    expect(err instanceof VeilSubError).toBe(true);
  });
});
