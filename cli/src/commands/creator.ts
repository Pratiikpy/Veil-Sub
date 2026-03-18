// =============================================================================
// @veilsub/cli — creator command
//
// Creator stats, subscriber count, revenue, and tier information.
// =============================================================================

import { fetchMapping } from './query';
import {
  color,
  printHeader,
  printTable,
  printJson,
  printError,
  formatCredits,
  formatNumber,
  parseLeoU64,
  parseLeoBool,
  type TableRow,
} from '../utils';

// ---------------------------------------------------------------------------
// Creator Stats
// ---------------------------------------------------------------------------

interface CreatorStats {
  readonly registered: boolean;
  readonly basePrice: number;
  readonly subscriberCount: number;
  readonly totalRevenue: number;
  readonly contentCount: number;
  readonly tierCount: number;
}

async function fetchCreatorStats(
  creatorHash: string,
  programId: string,
): Promise<CreatorStats> {
  const [basePriceRaw, subCountRaw, revenueRaw, contentCountRaw, tierCountRaw] =
    await Promise.all([
      fetchMapping(programId, 'tier_prices', creatorHash),
      fetchMapping(programId, 'subscriber_count', creatorHash),
      fetchMapping(programId, 'total_revenue', creatorHash),
      fetchMapping(programId, 'content_count', creatorHash),
      fetchMapping(programId, 'tier_count', creatorHash),
    ]);

  const basePrice = parseLeoU64(basePriceRaw) ?? 0;

  return {
    registered: basePrice > 0,
    basePrice,
    subscriberCount: parseLeoU64(subCountRaw) ?? 0,
    totalRevenue: parseLeoU64(revenueRaw) ?? 0,
    contentCount: parseLeoU64(contentCountRaw) ?? 0,
    tierCount: parseLeoU64(tierCountRaw) ?? 0,
  };
}

// ---------------------------------------------------------------------------
// creator command
// ---------------------------------------------------------------------------

export async function runCreator(
  args: ReadonlyArray<string>,
  programId: string,
  jsonMode: boolean,
): Promise<void> {
  const creatorHash = args[0];

  if (!creatorHash) {
    printError('Usage: veilsub creator <creator_hash>');
    console.log();
    console.log('  Example:');
    console.log(`    veilsub creator 5895434346742188517605628668414418785502575139839733911875586046449923524635field`);
    process.exitCode = 1;
    return;
  }

  try {
    const stats = await fetchCreatorStats(creatorHash, programId);

    if (jsonMode) {
      printJson({
        creatorHash,
        program: programId,
        ...stats,
      });
      return;
    }

    printHeader('Creator Stats');

    if (!stats.registered) {
      printTable([
        { label: 'Creator Hash:', value: color.cyan(creatorHash) },
        { label: 'Status:', value: color.yellow('Not registered') },
      ]);
      console.log();
      return;
    }

    printTable([
      { label: 'Creator Hash:', value: color.cyan(creatorHash) },
      { label: 'Status:', value: color.green('Registered') },
      { label: 'Base Price:', value: `${formatNumber(stats.basePrice)} microcredits (${formatCredits(stats.basePrice)})` },
      { label: 'Subscribers:', value: color.cyan(formatNumber(stats.subscriberCount)) },
      { label: 'Total Revenue:', value: `${formatNumber(stats.totalRevenue)} microcredits (${formatCredits(stats.totalRevenue)})` },
      { label: 'Content:', value: color.cyan(formatNumber(stats.contentCount)) },
      { label: 'Tiers:', value: color.cyan(formatNumber(stats.tierCount)) },
    ]);
    console.log();
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    printError(`Failed to fetch creator stats: ${msg}`);
    process.exitCode = 1;
  }
}

// ---------------------------------------------------------------------------
// subscribers command
// ---------------------------------------------------------------------------

export async function runSubscribers(
  args: ReadonlyArray<string>,
  programId: string,
  jsonMode: boolean,
): Promise<void> {
  const creatorHash = args[0];

  if (!creatorHash) {
    printError('Usage: veilsub subscribers <creator_hash>');
    process.exitCode = 1;
    return;
  }

  try {
    const raw = await fetchMapping(programId, 'subscriber_count', creatorHash);
    const count = parseLeoU64(raw) ?? 0;

    if (jsonMode) {
      printJson({ creatorHash, subscriberCount: count });
      return;
    }

    printHeader('Subscriber Count');
    printTable([
      { label: 'Creator Hash:', value: color.cyan(creatorHash) },
      { label: 'Subscribers:', value: color.cyan(formatNumber(count)) },
    ]);
    console.log();
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    printError(`Failed to fetch subscriber count: ${msg}`);
    process.exitCode = 1;
  }
}

// ---------------------------------------------------------------------------
// revenue command
// ---------------------------------------------------------------------------

export async function runRevenue(
  args: ReadonlyArray<string>,
  programId: string,
  jsonMode: boolean,
): Promise<void> {
  const creatorHash = args[0];

  if (!creatorHash) {
    printError('Usage: veilsub revenue <creator_hash>');
    process.exitCode = 1;
    return;
  }

  try {
    const raw = await fetchMapping(programId, 'total_revenue', creatorHash);
    const revenue = parseLeoU64(raw) ?? 0;

    if (jsonMode) {
      printJson({
        creatorHash,
        totalRevenue: revenue,
        totalRevenueAleo: revenue / 1_000_000,
      });
      return;
    }

    printHeader('Creator Revenue');
    printTable([
      { label: 'Creator Hash:', value: color.cyan(creatorHash) },
      { label: 'Total Revenue:', value: `${formatNumber(revenue)} microcredits (${formatCredits(revenue)})` },
    ]);
    console.log();
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    printError(`Failed to fetch revenue: ${msg}`);
    process.exitCode = 1;
  }
}

// ---------------------------------------------------------------------------
// tiers command
// ---------------------------------------------------------------------------

export async function runTiers(
  args: ReadonlyArray<string>,
  programId: string,
  jsonMode: boolean,
): Promise<void> {
  const creatorHash = args[0];

  if (!creatorHash) {
    printError('Usage: veilsub tiers <creator_hash>');
    process.exitCode = 1;
    return;
  }

  try {
    // First get the base price and tier count
    const [basePriceRaw, tierCountRaw] = await Promise.all([
      fetchMapping(programId, 'tier_prices', creatorHash),
      fetchMapping(programId, 'tier_count', creatorHash),
    ]);

    const basePrice = parseLeoU64(basePriceRaw) ?? 0;
    const tierCount = parseLeoU64(tierCountRaw) ?? 0;

    if (basePrice === 0) {
      if (jsonMode) {
        printJson({ creatorHash, registered: false, tiers: [] });
        return;
      }
      printHeader('Creator Tiers');
      printTable([
        { label: 'Creator Hash:', value: color.cyan(creatorHash) },
        { label: 'Status:', value: color.yellow('Not registered') },
      ]);
      console.log();
      return;
    }

    // Fetch individual tier prices in parallel (tiers 1-20 max)
    const tierIds = Array.from({ length: Math.min(tierCount, 20) }, (_, i) => i + 1);
    const tierResults = await Promise.all(
      tierIds.map(async (tierId) => {
        // creator_tiers uses a composite key; try the tier_prices base for tier 1
        // Custom tiers use tier_prices mapping with tierId as suffix
        const priceRaw = await fetchMapping(programId, 'creator_tiers', `${creatorHash.replace(/field$/, '')}${tierId}field`);
        const deprecatedRaw = await fetchMapping(programId, 'tier_deprecated', `${creatorHash.replace(/field$/, '')}${tierId}field`);
        return {
          tierId,
          price: parseLeoU64(priceRaw) ?? 0,
          deprecated: parseLeoBool(deprecatedRaw) ?? false,
        };
      }),
    );

    const tiers = [
      { tierId: 0, price: basePrice, deprecated: false },
      ...tierResults.filter(t => t.price > 0),
    ];

    if (jsonMode) {
      printJson({
        creatorHash,
        registered: true,
        tierCount,
        tiers: tiers.map(t => ({
          tierId: t.tierId,
          price: t.price,
          priceAleo: t.price / 1_000_000,
          deprecated: t.deprecated,
        })),
      });
      return;
    }

    printHeader('Creator Tiers');
    printTable([
      { label: 'Creator Hash:', value: color.cyan(creatorHash) },
      { label: 'Tier Count:', value: color.cyan(String(tierCount)) },
    ]);
    console.log();

    console.log(
      `  ${color.bold('Tier'.padEnd(8))} ` +
      `${color.bold('Price'.padEnd(30))} ` +
      `${color.bold('Status')}`
    );
    console.log(`  ${color.dim('─'.repeat(55))}`);

    for (const tier of tiers) {
      const tierLabel = tier.tierId === 0 ? 'Base' : `Tier ${tier.tierId}`;
      const priceStr = `${formatNumber(tier.price)} (${formatCredits(tier.price)})`;
      const statusStr = tier.deprecated ? color.red('deprecated') : color.green('active');
      console.log(`  ${tierLabel.padEnd(8)} ${priceStr.padEnd(30)} ${statusStr}`);
    }
    console.log();
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    printError(`Failed to fetch tiers: ${msg}`);
    process.exitCode = 1;
  }
}
