// =============================================================================
// @veilsub/cli — content command
//
// Content metadata and dispute queries.
// =============================================================================

import { fetchMapping } from './query';
import {
  color,
  printHeader,
  printTable,
  printJson,
  printError,
  formatNumber,
  parseLeoU64,
  parseLeoField,
  parseLeoBool,
  type TableRow,
} from '../utils';

// ---------------------------------------------------------------------------
// Content Metadata
// ---------------------------------------------------------------------------

interface ContentMeta {
  readonly minTier: number;
  readonly contentHash: string;
  readonly disputeCount: number;
  readonly deleted: boolean;
  readonly creatorHash: string;
}

async function fetchContentMeta(
  contentHash: string,
  programId: string,
): Promise<ContentMeta | null> {
  const [minTierRaw, hashRaw, disputeRaw, deletedRaw, creatorRaw] =
    await Promise.all([
      fetchMapping(programId, 'content_meta', contentHash),
      fetchMapping(programId, 'content_hashes', contentHash),
      fetchMapping(programId, 'content_disputes', contentHash),
      fetchMapping(programId, 'content_deleted', contentHash),
      fetchMapping(programId, 'content_creator', contentHash),
    ]);

  if (minTierRaw == null) return null;

  return {
    minTier: parseLeoU64(minTierRaw) ?? 0,
    contentHash: parseLeoField(hashRaw) ?? '',
    disputeCount: parseLeoU64(disputeRaw) ?? 0,
    deleted: parseLeoBool(deletedRaw) ?? false,
    creatorHash: parseLeoField(creatorRaw) ?? '',
  };
}

// ---------------------------------------------------------------------------
// content command
// ---------------------------------------------------------------------------

export async function runContent(
  args: ReadonlyArray<string>,
  programId: string,
  jsonMode: boolean,
): Promise<void> {
  const contentHash = args[0];

  if (!contentHash) {
    printError('Usage: veilsub content <content_hash>');
    console.log();
    console.log('  Example:');
    console.log(`    veilsub content 8333928...field`);
    process.exitCode = 1;
    return;
  }

  try {
    const meta = await fetchContentMeta(contentHash, programId);

    if (jsonMode) {
      printJson({
        contentHash,
        program: programId,
        found: meta != null,
        ...(meta ?? {}),
      });
      return;
    }

    printHeader('Content Metadata');

    if (meta == null) {
      printTable([
        { label: 'Content Hash:', value: color.cyan(contentHash) },
        { label: 'Status:', value: color.yellow('Not found') },
      ]);
      console.log();
      return;
    }

    const statusStr = meta.deleted
      ? color.red('Deleted')
      : color.green('Active');

    const disputeStr = meta.disputeCount > 0
      ? color.yellow(formatNumber(meta.disputeCount))
      : color.green('0');

    printTable([
      { label: 'Content Hash:', value: color.cyan(contentHash) },
      { label: 'Creator:', value: meta.creatorHash ? color.cyan(meta.creatorHash) : color.dim('unknown') },
      { label: 'Min Tier:', value: color.cyan(String(meta.minTier)) },
      { label: 'Content Hash:', value: meta.contentHash ? color.dim(meta.contentHash) : color.dim('none') },
      { label: 'Disputes:', value: disputeStr },
      { label: 'Status:', value: statusStr },
    ]);
    console.log();
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    printError(`Failed to fetch content metadata: ${msg}`);
    process.exitCode = 1;
  }
}

// ---------------------------------------------------------------------------
// disputes command
// ---------------------------------------------------------------------------

export async function runDisputes(
  args: ReadonlyArray<string>,
  programId: string,
  jsonMode: boolean,
): Promise<void> {
  const contentHash = args[0];

  if (!contentHash) {
    printError('Usage: veilsub disputes <content_hash>');
    process.exitCode = 1;
    return;
  }

  try {
    const raw = await fetchMapping(programId, 'content_disputes', contentHash);
    const count = parseLeoU64(raw) ?? 0;

    if (jsonMode) {
      printJson({ contentHash, disputeCount: count });
      return;
    }

    printHeader('Dispute Count');
    printTable([
      { label: 'Content Hash:', value: color.cyan(contentHash) },
      { label: 'Disputes:', value: count > 0 ? color.yellow(formatNumber(count)) : color.green('0') },
    ]);
    console.log();
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    printError(`Failed to fetch dispute count: ${msg}`);
    process.exitCode = 1;
  }
}

// ---------------------------------------------------------------------------
// platform command (bonus — platform-wide stats)
// ---------------------------------------------------------------------------

export async function runPlatform(
  programId: string,
  jsonMode: boolean,
): Promise<void> {
  try {
    const [creatorsRaw, contentRaw, revenueRaw] = await Promise.all([
      fetchMapping(programId, 'total_creators', '0u8'),
      fetchMapping(programId, 'total_content', '0u8'),
      fetchMapping(programId, 'platform_revenue', '0u8'),
    ]);

    const totalCreators = parseLeoU64(creatorsRaw) ?? 0;
    const totalContent = parseLeoU64(contentRaw) ?? 0;
    const platformRevenue = parseLeoU64(revenueRaw) ?? 0;

    if (jsonMode) {
      printJson({
        program: programId,
        totalCreators,
        totalContent,
        platformRevenue,
        platformRevenueAleo: platformRevenue / 1_000_000,
      });
      return;
    }

    printHeader('Platform Stats');
    printTable([
      { label: 'Program:', value: color.dim(programId) },
      { label: 'Total Creators:', value: color.cyan(formatNumber(totalCreators)) },
      { label: 'Total Content:', value: color.cyan(formatNumber(totalContent)) },
      { label: 'Platform Revenue:', value: `${formatNumber(platformRevenue)} microcredits (${color.cyan(String(platformRevenue / 1_000_000) + ' ALEO')})` },
    ]);
    console.log();
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    printError(`Failed to fetch platform stats: ${msg}`);
    process.exitCode = 1;
  }
}
