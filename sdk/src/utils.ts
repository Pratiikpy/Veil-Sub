// =============================================================================
// @veilsub/sdk — Utility Functions
//
// Helpers for parsing Leo values, generating IDs, validating addresses,
// and converting between microcredits and credits.
// =============================================================================

import { ALEO_ADDRESS_REGEX, MICROCREDITS_PER_CREDIT } from './constants';
import { VeilSubError } from './types';

// ---------------------------------------------------------------------------
// Leo Value Parsing
// ---------------------------------------------------------------------------

/**
 * Strip Leo type suffixes from a value string.
 * Handles: "123u64", "456field", "truebool", "0u8", "789u128", "123u32"
 */
export function stripLeoSuffix(value: string): string {
  return value
    .replace(/u(?:8|16|32|64|128)$/i, '')
    .replace(/i(?:8|16|32|64|128)$/i, '')
    .replace(/field$/i, '')
    .replace(/group$/i, '')
    .replace(/scalar$/i, '')
    .replace(/bool$/i, '')
    .replace(/address$/i, '');
}

/**
 * Parse a Leo integer value string into a JavaScript number.
 * Returns null if the value is not a valid number.
 *
 * @example
 * parseLeoU64("1000000u64") // 1000000
 * parseLeoU64("0u64")       // 0
 * parseLeoU64(null)          // null
 */
export function parseLeoU64(value: string | null | undefined): number | null {
  if (value == null) return null;
  const cleaned = stripLeoSuffix(value.trim());
  const num = parseInt(cleaned, 10);
  return Number.isFinite(num) ? num : null;
}

/**
 * Parse a Leo field value string.
 * Returns the raw numeric string (without "field" suffix) or null.
 *
 * @example
 * parseLeoField("123456field") // "123456"
 * parseLeoField(null)           // null
 */
export function parseLeoField(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed.replace(/field$/i, '') || null;
}

/**
 * Parse a Leo boolean value.
 *
 * @example
 * parseLeoBool("true")  // true
 * parseLeoBool("false") // false
 * parseLeoBool(null)     // null
 */
export function parseLeoBool(value: string | null | undefined): boolean | null {
  if (value == null) return null;
  const cleaned = stripLeoSuffix(value.trim()).toLowerCase();
  if (cleaned === 'true') return true;
  if (cleaned === 'false') return false;
  return null;
}

// ---------------------------------------------------------------------------
// Leo Value Formatting
// ---------------------------------------------------------------------------

/** Format a number as Leo u8 */
export function toU8(n: number): string { return `${n}u8`; }

/** Format a number as Leo u32 */
export function toU32(n: number): string { return `${n}u32`; }

/** Format a number as Leo u64 */
export function toU64(n: number): string { return `${n}u64`; }

/** Format a string/number as Leo field */
export function toField(v: string | number): string {
  const s = String(v);
  return s.endsWith('field') ? s : `${s}field`;
}

// ---------------------------------------------------------------------------
// ID Generation
// ---------------------------------------------------------------------------

/**
 * Generate a random field value suitable for pass_id, gift_id, etc.
 * Uses crypto.getRandomValues when available, falls back to Math.random.
 */
export function generateFieldId(): string {
  try {
    // Use crypto API if available (browser + Node 18+)
    const bytes = new Uint8Array(16);
    const g = globalThis as Record<string, unknown>;
    const cryptoObj = g['crypto'] as { getRandomValues?: (buf: Uint8Array) => Uint8Array } | undefined;
    if (cryptoObj && typeof cryptoObj.getRandomValues === 'function') {
      cryptoObj.getRandomValues(bytes);
    } else {
      // Fallback for environments without crypto
      for (let i = 0; i < bytes.length; i++) {
        bytes[i] = Math.floor(Math.random() * 256);
      }
    }
    // Convert to a large numeric string (field-safe)
    let result = BigInt(0);
    for (let i = 0; i < bytes.length; i++) {
      result = (result << BigInt(8)) | BigInt(bytes[i]);
    }
    return result.toString();
  } catch {
    // Ultimate fallback
    return String(Math.floor(Math.random() * Number.MAX_SAFE_INTEGER));
  }
}

// ---------------------------------------------------------------------------
// Address Validation
// ---------------------------------------------------------------------------

/**
 * Validate an Aleo address format.
 *
 * @example
 * isValidAleoAddress("aleo1hp9m08faf27hr7yu686t6r52nj36g3k5n7ymjhyzsvxjp58epyxsprk5wk") // true
 * isValidAleoAddress("0x1234") // false
 */
export function isValidAleoAddress(address: string): boolean {
  return ALEO_ADDRESS_REGEX.test(address);
}

/**
 * Assert that an address is a valid Aleo address.
 * Throws VeilSubError if invalid.
 */
export function assertValidAddress(address: string, label = 'address'): void {
  if (!isValidAleoAddress(address)) {
    throw new VeilSubError(
      `Invalid Aleo ${label}: "${address}". Must match pattern aleo1[a-z0-9]{58}`,
    );
  }
}

// ---------------------------------------------------------------------------
// Unit Conversions
// ---------------------------------------------------------------------------

/**
 * Convert microcredits to ALEO credits.
 *
 * @example
 * microToCredits(1_000_000) // 1.0
 * microToCredits(500_000)   // 0.5
 */
export function microToCredits(microcredits: number): number {
  return microcredits / MICROCREDITS_PER_CREDIT;
}

/**
 * Convert ALEO credits to microcredits.
 *
 * @example
 * creditsToMicro(1.5)  // 1_500_000
 * creditsToMicro(0.1)  // 100_000
 */
export function creditsToMicro(credits: number): number {
  return Math.round(credits * MICROCREDITS_PER_CREDIT);
}

/**
 * Format microcredits as a human-readable ALEO string.
 *
 * @example
 * formatCredits(1_500_000)  // "1.5 ALEO"
 * formatCredits(100_000)    // "0.1 ALEO"
 */
export function formatCredits(microcredits: number): string {
  const credits = microToCredits(microcredits);
  // Trim unnecessary trailing zeros
  const formatted = credits % 1 === 0
    ? credits.toFixed(0)
    : credits.toFixed(6).replace(/0+$/, '').replace(/\.$/, '');
  return `${formatted} ALEO`;
}

// ---------------------------------------------------------------------------
// Block Time Estimation
// ---------------------------------------------------------------------------

/**
 * Estimate the number of blocks for a given duration in seconds.
 *
 * @example
 * secondsToBlocks(86400)  // 28800 (1 day)
 * secondsToBlocks(2592000) // 864000 (30 days)
 */
export function secondsToBlocks(seconds: number): number {
  return Math.ceil(seconds / 3);
}

/**
 * Estimate the duration in seconds for a given number of blocks.
 *
 * @example
 * blocksToSeconds(864000) // 2592000 (30 days)
 */
export function blocksToSeconds(blocks: number): number {
  return blocks * 3;
}

/**
 * Calculate the expiry block height for a subscription.
 *
 * @param currentBlockHeight - Current blockchain height
 * @param durationBlocks - Subscription duration in blocks (default: ~30 days)
 */
export function calculateExpiry(
  currentBlockHeight: number,
  durationBlocks: number = 864_000,
): number {
  return currentBlockHeight + durationBlocks;
}

// ---------------------------------------------------------------------------
// Error Code Extraction
// ---------------------------------------------------------------------------

/** Map of on-chain error codes to descriptions (119 codes from VeilSub v28) */
const ERROR_CODE_MAP: Record<string, string> = {
  ERR_001: 'Subscription price is below the minimum allowed (100 microcredits)',
  ERR_002: 'Tier ID must be at least 1',
  ERR_003: 'Tier ID exceeds the maximum allowed value',
  ERR_004: 'Creator is not registered on VeilSub',
  ERR_005: 'This tier already exists for the creator',
  ERR_006: 'Tier price must be greater than zero',
  ERR_007: 'The specified tier does not exist',
  ERR_008: 'This tier has been deprecated',
  ERR_009: 'The specified tier does not exist',
  ERR_010: 'Minimum tier level must be at least 1',
  ERR_011: 'Content hash cannot be empty',
  ERR_012: 'Only the content creator can update this content',
  ERR_013: 'The specified content does not exist',
  ERR_014: 'This content has been deleted and cannot be modified',
  ERR_015: 'Only the content creator can delete this content',
  ERR_016: 'The specified content does not exist',
  ERR_017: 'This content has already been deleted',
  ERR_018: 'Registration price is below the minimum allowed',
  ERR_019: 'This address is already registered as a creator',
  ERR_020: 'Subscription tier must be at least 1',
  ERR_021: 'Subscription tier exceeds the maximum allowed',
  ERR_022: 'Payment amount is insufficient for this tier',
  ERR_023: 'This tier has been deprecated',
  ERR_024: 'Subscription expiry must be set in the future',
  ERR_025: 'Subscription expiry is set too far into the future',
  ERR_026: 'Creator has reached the maximum subscriber limit',
  ERR_027: 'Your access has been revoked by the creator',
  ERR_028: 'Tip amount must be greater than zero',
  ERR_055: 'Withdrawal amount must be greater than zero',
  ERR_056: 'Only the platform administrator can perform this action',
  ERR_057: 'Insufficient platform balance for this withdrawal',
  ERR_058: 'Withdrawal amount must be greater than zero',
  ERR_059: 'Creator is not registered on VeilSub',
  ERR_060: 'Insufficient creator balance for this withdrawal',
  ERR_061: 'Subscription tier must be at least 1',
  ERR_062: 'Privacy nonce cannot be zero',
  ERR_063: 'Payment amount is insufficient for blind subscription',
  ERR_064: 'This tier has been deprecated',
  ERR_065: 'Subscription expiry must be set in the future',
  ERR_066: 'Subscription expiry is set too far into the future',
  ERR_067: 'Privacy nonce has already been used',
  ERR_075: 'Subscription pass does not belong to this creator',
  ERR_076: 'Subscription tier is not high enough',
  ERR_077: 'Access has been revoked by the creator',
  ERR_083: 'Only the issuing creator can revoke access',
  ERR_084: 'The specified content does not exist',
  ERR_085: 'Content has been deleted and cannot be disputed',
  ERR_087: 'Cannot transfer a subscription to yourself',
  ERR_088: 'Access has been revoked and cannot be transferred',
  ERR_099: 'Tip amount must be greater than zero',
  ERR_100: 'A tip commitment with this ID already exists',
  ERR_101: 'Reveal amount must be greater than zero',
  ERR_102: 'No tip commitment found for this ID',
  ERR_103: 'This tip has already been revealed',
  ERR_104: 'Subscription has expired',
  ERR_108: 'Threshold must be greater than zero',
  ERR_109: 'Creator is not registered on VeilSub',
  ERR_110: 'Subscriber count is below the specified threshold',
  ERR_111: 'Trial tier must be at least 1',
  ERR_112: 'Trial tier exceeds the maximum allowed',
  ERR_113: 'Trial payment is insufficient (must be at least 20% of tier price)',
  ERR_114: 'This tier is deprecated and cannot be used for trials',
  ERR_115: 'Trial expiry must be in the future',
  ERR_116: 'Trial duration exceeds the maximum (~50 minutes)',
  ERR_117: 'Creator has reached the maximum subscriber limit',
  ERR_118: 'Audit token scope must include at least one field',
  ERR_119: 'You have already used a trial for this creator',
};

/**
 * Extract a human-readable error message from an on-chain error string.
 * Scans for ERR_XXX patterns and returns the mapped description.
 *
 * @example
 * parseErrorCode("Transaction rejected: ERR_004") // "Creator is not registered on VeilSub"
 * parseErrorCode("Unknown error")                  // "Unknown error"
 */
export function parseErrorCode(errorString: string): string {
  for (const [code, message] of Object.entries(ERROR_CODE_MAP)) {
    if (errorString.includes(code)) {
      return `${code}: ${message}`;
    }
  }
  return errorString;
}

/**
 * Get the error description for a specific error code.
 *
 * @example
 * getErrorDescription("ERR_004") // "Creator is not registered on VeilSub"
 * getErrorDescription("ERR_999") // null
 */
export function getErrorDescription(code: string): string | null {
  return ERROR_CODE_MAP[code] ?? null;
}
