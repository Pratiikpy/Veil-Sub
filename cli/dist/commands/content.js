"use strict";
// =============================================================================
// @veilsub/cli — content command
//
// Content metadata and dispute queries.
// =============================================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.runContent = runContent;
exports.runDisputes = runDisputes;
exports.runPlatform = runPlatform;
const query_1 = require("./query");
const utils_1 = require("../utils");
async function fetchContentMeta(contentHash, programId) {
    const [minTierRaw, hashRaw, disputeRaw, deletedRaw, creatorRaw] = await Promise.all([
        (0, query_1.fetchMapping)(programId, 'content_meta', contentHash),
        (0, query_1.fetchMapping)(programId, 'content_hashes', contentHash),
        (0, query_1.fetchMapping)(programId, 'content_disputes', contentHash),
        (0, query_1.fetchMapping)(programId, 'content_deleted', contentHash),
        (0, query_1.fetchMapping)(programId, 'content_creator', contentHash),
    ]);
    if (minTierRaw == null)
        return null;
    return {
        minTier: (0, utils_1.parseLeoU64)(minTierRaw) ?? 0,
        contentHash: (0, utils_1.parseLeoField)(hashRaw) ?? '',
        disputeCount: (0, utils_1.parseLeoU64)(disputeRaw) ?? 0,
        deleted: (0, utils_1.parseLeoBool)(deletedRaw) ?? false,
        creatorHash: (0, utils_1.parseLeoField)(creatorRaw) ?? '',
    };
}
// ---------------------------------------------------------------------------
// content command
// ---------------------------------------------------------------------------
async function runContent(args, programId, jsonMode) {
    const contentHash = args[0];
    if (!contentHash) {
        (0, utils_1.printError)('Usage: veilsub content <content_hash>');
        console.log();
        console.log('  Example:');
        console.log(`    veilsub content 8333928...field`);
        process.exitCode = 1;
        return;
    }
    try {
        const meta = await fetchContentMeta(contentHash, programId);
        if (jsonMode) {
            (0, utils_1.printJson)({
                contentHash,
                program: programId,
                found: meta != null,
                ...(meta ?? {}),
            });
            return;
        }
        (0, utils_1.printHeader)('Content Metadata');
        if (meta == null) {
            (0, utils_1.printTable)([
                { label: 'Content Hash:', value: utils_1.color.cyan(contentHash) },
                { label: 'Status:', value: utils_1.color.yellow('Not found') },
            ]);
            console.log();
            return;
        }
        const statusStr = meta.deleted
            ? utils_1.color.red('Deleted')
            : utils_1.color.green('Active');
        const disputeStr = meta.disputeCount > 0
            ? utils_1.color.yellow((0, utils_1.formatNumber)(meta.disputeCount))
            : utils_1.color.green('0');
        (0, utils_1.printTable)([
            { label: 'Content Hash:', value: utils_1.color.cyan(contentHash) },
            { label: 'Creator:', value: meta.creatorHash ? utils_1.color.cyan(meta.creatorHash) : utils_1.color.dim('unknown') },
            { label: 'Min Tier:', value: utils_1.color.cyan(String(meta.minTier)) },
            { label: 'Content Hash:', value: meta.contentHash ? utils_1.color.dim(meta.contentHash) : utils_1.color.dim('none') },
            { label: 'Disputes:', value: disputeStr },
            { label: 'Status:', value: statusStr },
        ]);
        console.log();
    }
    catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        (0, utils_1.printError)(`Failed to fetch content metadata: ${msg}`);
        process.exitCode = 1;
    }
}
// ---------------------------------------------------------------------------
// disputes command
// ---------------------------------------------------------------------------
async function runDisputes(args, programId, jsonMode) {
    const contentHash = args[0];
    if (!contentHash) {
        (0, utils_1.printError)('Usage: veilsub disputes <content_hash>');
        process.exitCode = 1;
        return;
    }
    try {
        const raw = await (0, query_1.fetchMapping)(programId, 'content_disputes', contentHash);
        const count = (0, utils_1.parseLeoU64)(raw) ?? 0;
        if (jsonMode) {
            (0, utils_1.printJson)({ contentHash, disputeCount: count });
            return;
        }
        (0, utils_1.printHeader)('Dispute Count');
        (0, utils_1.printTable)([
            { label: 'Content Hash:', value: utils_1.color.cyan(contentHash) },
            { label: 'Disputes:', value: count > 0 ? utils_1.color.yellow((0, utils_1.formatNumber)(count)) : utils_1.color.green('0') },
        ]);
        console.log();
    }
    catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        (0, utils_1.printError)(`Failed to fetch dispute count: ${msg}`);
        process.exitCode = 1;
    }
}
// ---------------------------------------------------------------------------
// platform command (bonus — platform-wide stats)
// ---------------------------------------------------------------------------
async function runPlatform(programId, jsonMode) {
    try {
        const [creatorsRaw, contentRaw, revenueRaw] = await Promise.all([
            (0, query_1.fetchMapping)(programId, 'total_creators', '0u8'),
            (0, query_1.fetchMapping)(programId, 'total_content', '0u8'),
            (0, query_1.fetchMapping)(programId, 'platform_revenue', '0u8'),
        ]);
        const totalCreators = (0, utils_1.parseLeoU64)(creatorsRaw) ?? 0;
        const totalContent = (0, utils_1.parseLeoU64)(contentRaw) ?? 0;
        const platformRevenue = (0, utils_1.parseLeoU64)(revenueRaw) ?? 0;
        if (jsonMode) {
            (0, utils_1.printJson)({
                program: programId,
                totalCreators,
                totalContent,
                platformRevenue,
                platformRevenueAleo: platformRevenue / 1_000_000,
            });
            return;
        }
        (0, utils_1.printHeader)('Platform Stats');
        (0, utils_1.printTable)([
            { label: 'Program:', value: utils_1.color.dim(programId) },
            { label: 'Total Creators:', value: utils_1.color.cyan((0, utils_1.formatNumber)(totalCreators)) },
            { label: 'Total Content:', value: utils_1.color.cyan((0, utils_1.formatNumber)(totalContent)) },
            { label: 'Platform Revenue:', value: `${(0, utils_1.formatNumber)(platformRevenue)} microcredits (${utils_1.color.cyan(String(platformRevenue / 1_000_000) + ' ALEO')})` },
        ]);
        console.log();
    }
    catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        (0, utils_1.printError)(`Failed to fetch platform stats: ${msg}`);
        process.exitCode = 1;
    }
}
//# sourceMappingURL=content.js.map