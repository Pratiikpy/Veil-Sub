// =============================================================================
// @veilsub/cli — query command
//
// Generic mapping query against on-chain VeilSub program state.
// =============================================================================

import {
  color,
  printHeader,
  printTable,
  printJson,
  printError,
  formatCredits,
  formatNumber,
  parseLeoU64,
  parseLeoField,
  parseLeoBool,
  type TableRow,
} from '../utils';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const API_BASE = 'https://api.explorer.provable.com/v1/testnet';
const DEFAULT_PROGRAM = 'veilsub_v29.aleo';

/** All known mapping names in the VeilSub protocol */
const KNOWN_MAPPINGS = [
  'tier_prices',
  'subscriber_count',
  'total_revenue',
  'platform_revenue',
  'content_count',
  'content_meta',
  'content_hashes',
  'content_creator',
  'creator_tiers',
  'tier_count',
  'tier_deprecated',
  'content_deleted',
  'gift_redeemed',
  'nonce_used',
  'encryption_commits',
  'access_revoked',
  'pass_creator',
  'content_disputes',
  'tip_commitments',
  'tip_revealed',
  'dispute_count_by_caller',
  'subscription_by_tier',
  'trial_used',
  'total_creators',
  'total_content',
  'stablecoin_revenue',
] as const;

// ---------------------------------------------------------------------------
// API Fetch
// ---------------------------------------------------------------------------

async function fetchMapping(
  programId: string,
  mapping: string,
  key: string,
): Promise<string | null> {
  const url = `${API_BASE}/program/${programId}/mapping/${mapping}/${key}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15_000);

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error(`API returned ${response.status}: ${response.statusText}`);
    }
    const text = await response.text();
    const trimmed = text.trim().replace(/^"|"$/g, '');
    if (trimmed === 'null' || trimmed === '') return null;
    return trimmed;
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Request timed out after 15s');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

// ---------------------------------------------------------------------------
// Value interpretation
// ---------------------------------------------------------------------------

function interpretValue(raw: string, mapping: string): string {
  // Try u64 interpretation
  const numVal = parseLeoU64(raw);
  if (numVal != null) {
    // If it's a revenue/price mapping, show ALEO equivalent
    const revenueKeys = ['tier_prices', 'total_revenue', 'platform_revenue', 'stablecoin_revenue', 'creator_tiers'];
    if (revenueKeys.includes(mapping)) {
      return `${formatNumber(numVal)} microcredits (${formatCredits(numVal)})`;
    }
    return formatNumber(numVal);
  }

  // Try boolean
  const boolVal = parseLeoBool(raw);
  if (boolVal != null) {
    return boolVal ? color.green('true') : color.red('false');
  }

  // Try field
  const fieldVal = parseLeoField(raw);
  if (fieldVal != null) {
    return color.cyan(fieldVal);
  }

  // Raw string
  return raw;
}

// ---------------------------------------------------------------------------
// query command
// ---------------------------------------------------------------------------

export async function runQuery(
  args: ReadonlyArray<string>,
  programId: string,
  jsonMode: boolean,
): Promise<void> {
  const mapping = args[0];
  const key = args[1];

  if (!mapping || !key) {
    printError('Usage: veilsub query <mapping> <key>');
    console.log();
    console.log('  Available mappings:');
    for (const m of KNOWN_MAPPINGS) {
      console.log(`    ${color.cyan(m)}`);
    }
    console.log();
    console.log('  Example:');
    console.log(`    veilsub query tier_prices 5895434...field`);
    process.exitCode = 1;
    return;
  }

  try {
    const raw = await fetchMapping(programId, mapping, key);

    if (jsonMode) {
      printJson({
        program: programId,
        mapping,
        key,
        raw,
        found: raw != null,
      });
      return;
    }

    if (raw == null) {
      printHeader(`Query: ${mapping}`);
      printTable([
        { label: 'Program:', value: color.dim(programId) },
        { label: 'Mapping:', value: color.cyan(mapping) },
        { label: 'Key:', value: color.cyan(key) },
        { label: 'Result:', value: color.yellow('not found') },
      ]);
      console.log();
      return;
    }

    const interpreted = interpretValue(raw, mapping);

    printHeader(`Query: ${mapping}`);
    printTable([
      { label: 'Program:', value: color.dim(programId) },
      { label: 'Mapping:', value: color.cyan(mapping) },
      { label: 'Key:', value: color.cyan(key) },
      { label: 'Raw:', value: color.dim(raw) },
      { label: 'Value:', value: interpreted },
    ]);
    console.log();
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    printError(`Failed to query mapping: ${msg}`);
    process.exitCode = 1;
  }
}

// Export for use by other commands
export { fetchMapping, KNOWN_MAPPINGS, DEFAULT_PROGRAM, API_BASE };
