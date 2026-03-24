/**
 * Strip Leo type suffixes from a value string.
 * Handles: "123u64", "456field", "truebool", "0u8", "789u128", "123u32"
 */
export declare function stripLeoSuffix(value: string): string;
/**
 * Parse a Leo integer value string into a JavaScript number.
 * Returns null if the value is not a valid number.
 *
 * @example
 * parseLeoU64("1000000u64") // 1000000
 * parseLeoU64("0u64")       // 0
 * parseLeoU64(null)          // null
 */
export declare function parseLeoU64(value: string | null | undefined): number | null;
/**
 * Parse a Leo field value string.
 * Returns the raw numeric string (without "field" suffix) or null.
 *
 * @example
 * parseLeoField("123456field") // "123456"
 * parseLeoField(null)           // null
 */
export declare function parseLeoField(value: string | null | undefined): string | null;
/**
 * Parse a Leo boolean value.
 *
 * @example
 * parseLeoBool("true")  // true
 * parseLeoBool("false") // false
 * parseLeoBool(null)     // null
 */
export declare function parseLeoBool(value: string | null | undefined): boolean | null;
/** Format a number as Leo u8 */
export declare function toU8(n: number): string;
/** Format a number as Leo u32 */
export declare function toU32(n: number): string;
/** Format a number as Leo u64 */
export declare function toU64(n: number): string;
/** Format a string/number as Leo field */
export declare function toField(v: string | number): string;
/**
 * Generate a random field value suitable for pass_id, gift_id, etc.
 * Uses crypto.getRandomValues when available, falls back to Math.random.
 */
export declare function generateFieldId(): string;
/**
 * Validate an Aleo address format.
 *
 * @example
 * isValidAleoAddress("aleo1hp9m08faf27hr7yu686t6r52nj36g3k5n7ymjhyzsvxjp58epyxsprk5wk") // true
 * isValidAleoAddress("0x1234") // false
 */
export declare function isValidAleoAddress(address: string): boolean;
/**
 * Assert that an address is a valid Aleo address.
 * Throws VeilSubError if invalid.
 */
export declare function assertValidAddress(address: string, label?: string): void;
/**
 * Convert microcredits to ALEO credits.
 *
 * @example
 * microToCredits(1_000_000) // 1.0
 * microToCredits(500_000)   // 0.5
 */
export declare function microToCredits(microcredits: number): number;
/**
 * Convert ALEO credits to microcredits.
 *
 * @example
 * creditsToMicro(1.5)  // 1_500_000
 * creditsToMicro(0.1)  // 100_000
 */
export declare function creditsToMicro(credits: number): number;
/**
 * Format microcredits as a human-readable ALEO string.
 *
 * @example
 * formatCredits(1_500_000)  // "1.5 ALEO"
 * formatCredits(100_000)    // "0.1 ALEO"
 */
export declare function formatCredits(microcredits: number): string;
/**
 * Estimate the number of blocks for a given duration in seconds.
 *
 * @example
 * secondsToBlocks(86400)  // 28800 (1 day)
 * secondsToBlocks(2592000) // 864000 (30 days)
 */
export declare function secondsToBlocks(seconds: number): number;
/**
 * Estimate the duration in seconds for a given number of blocks.
 *
 * @example
 * blocksToSeconds(864000) // 2592000 (30 days)
 */
export declare function blocksToSeconds(blocks: number): number;
/**
 * Calculate the expiry block height for a subscription.
 *
 * @param currentBlockHeight - Current blockchain height
 * @param durationBlocks - Subscription duration in blocks (default: ~30 days)
 */
export declare function calculateExpiry(currentBlockHeight: number, durationBlocks?: number): number;
/**
 * Extract a human-readable error message from an on-chain error string.
 * Scans for ERR_XXX patterns and returns the mapped description.
 *
 * @example
 * parseErrorCode("Transaction rejected: ERR_004") // "Creator is not registered on VeilSub"
 * parseErrorCode("Unknown error")                  // "Unknown error"
 */
export declare function parseErrorCode(errorString: string): string;
/**
 * Get the error description for a specific error code.
 *
 * @example
 * getErrorDescription("ERR_004") // "Creator is not registered on VeilSub"
 * getErrorDescription("ERR_999") // null
 */
export declare function getErrorDescription(code: string): string | null;
//# sourceMappingURL=utils.d.ts.map