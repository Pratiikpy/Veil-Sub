"use strict";
// =============================================================================
// @veilsub/cli — creator command
//
// Creator stats, subscriber count, revenue, and tier information.
// =============================================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.runCreator = runCreator;
exports.runSubscribers = runSubscribers;
exports.runRevenue = runRevenue;
exports.runTiers = runTiers;
const query_1 = require("./query");
const utils_1 = require("../utils");
async function fetchCreatorStats(creatorHash, programId) {
    const [basePriceRaw, subCountRaw, revenueRaw, contentCountRaw, tierCountRaw] = await Promise.all([
        (0, query_1.fetchMapping)(programId, 'tier_prices', creatorHash),
        (0, query_1.fetchMapping)(programId, 'subscriber_count', creatorHash),
        (0, query_1.fetchMapping)(programId, 'total_revenue', creatorHash),
        (0, query_1.fetchMapping)(programId, 'content_count', creatorHash),
        (0, query_1.fetchMapping)(programId, 'tier_count', creatorHash),
    ]);
    const basePrice = (0, utils_1.parseLeoU64)(basePriceRaw) ?? 0;
    return {
        registered: basePrice > 0,
        basePrice,
        subscriberCount: (0, utils_1.parseLeoU64)(subCountRaw) ?? 0,
        totalRevenue: (0, utils_1.parseLeoU64)(revenueRaw) ?? 0,
        contentCount: (0, utils_1.parseLeoU64)(contentCountRaw) ?? 0,
        tierCount: (0, utils_1.parseLeoU64)(tierCountRaw) ?? 0,
    };
}
// ---------------------------------------------------------------------------
// creator command
// ---------------------------------------------------------------------------
async function runCreator(args, programId, jsonMode) {
    const creatorHash = args[0];
    if (!creatorHash) {
        (0, utils_1.printError)('Usage: veilsub creator <creator_hash>');
        console.log();
        console.log('  Example:');
        console.log(`    veilsub creator 5895434346742188517605628668414418785502575139839733911875586046449923524635field`);
        process.exitCode = 1;
        return;
    }
    try {
        const stats = await fetchCreatorStats(creatorHash, programId);
        if (jsonMode) {
            (0, utils_1.printJson)({
                creatorHash,
                program: programId,
                ...stats,
            });
            return;
        }
        (0, utils_1.printHeader)('Creator Stats');
        if (!stats.registered) {
            (0, utils_1.printTable)([
                { label: 'Creator Hash:', value: utils_1.color.cyan(creatorHash) },
                { label: 'Status:', value: utils_1.color.yellow('Not registered') },
            ]);
            console.log();
            return;
        }
        (0, utils_1.printTable)([
            { label: 'Creator Hash:', value: utils_1.color.cyan(creatorHash) },
            { label: 'Status:', value: utils_1.color.green('Registered') },
            { label: 'Base Price:', value: `${(0, utils_1.formatNumber)(stats.basePrice)} microcredits (${(0, utils_1.formatCredits)(stats.basePrice)})` },
            { label: 'Subscribers:', value: utils_1.color.cyan((0, utils_1.formatNumber)(stats.subscriberCount)) },
            { label: 'Total Revenue:', value: `${(0, utils_1.formatNumber)(stats.totalRevenue)} microcredits (${(0, utils_1.formatCredits)(stats.totalRevenue)})` },
            { label: 'Content:', value: utils_1.color.cyan((0, utils_1.formatNumber)(stats.contentCount)) },
            { label: 'Tiers:', value: utils_1.color.cyan((0, utils_1.formatNumber)(stats.tierCount)) },
        ]);
        console.log();
    }
    catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        (0, utils_1.printError)(`Failed to fetch creator stats: ${msg}`);
        process.exitCode = 1;
    }
}
// ---------------------------------------------------------------------------
// subscribers command
// ---------------------------------------------------------------------------
async function runSubscribers(args, programId, jsonMode) {
    const creatorHash = args[0];
    if (!creatorHash) {
        (0, utils_1.printError)('Usage: veilsub subscribers <creator_hash>');
        process.exitCode = 1;
        return;
    }
    try {
        const raw = await (0, query_1.fetchMapping)(programId, 'subscriber_count', creatorHash);
        const count = (0, utils_1.parseLeoU64)(raw) ?? 0;
        if (jsonMode) {
            (0, utils_1.printJson)({ creatorHash, subscriberCount: count });
            return;
        }
        (0, utils_1.printHeader)('Subscriber Count');
        (0, utils_1.printTable)([
            { label: 'Creator Hash:', value: utils_1.color.cyan(creatorHash) },
            { label: 'Subscribers:', value: utils_1.color.cyan((0, utils_1.formatNumber)(count)) },
        ]);
        console.log();
    }
    catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        (0, utils_1.printError)(`Failed to fetch subscriber count: ${msg}`);
        process.exitCode = 1;
    }
}
// ---------------------------------------------------------------------------
// revenue command
// ---------------------------------------------------------------------------
async function runRevenue(args, programId, jsonMode) {
    const creatorHash = args[0];
    if (!creatorHash) {
        (0, utils_1.printError)('Usage: veilsub revenue <creator_hash>');
        process.exitCode = 1;
        return;
    }
    try {
        const raw = await (0, query_1.fetchMapping)(programId, 'total_revenue', creatorHash);
        const revenue = (0, utils_1.parseLeoU64)(raw) ?? 0;
        if (jsonMode) {
            (0, utils_1.printJson)({
                creatorHash,
                totalRevenue: revenue,
                totalRevenueAleo: revenue / 1_000_000,
            });
            return;
        }
        (0, utils_1.printHeader)('Creator Revenue');
        (0, utils_1.printTable)([
            { label: 'Creator Hash:', value: utils_1.color.cyan(creatorHash) },
            { label: 'Total Revenue:', value: `${(0, utils_1.formatNumber)(revenue)} microcredits (${(0, utils_1.formatCredits)(revenue)})` },
        ]);
        console.log();
    }
    catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        (0, utils_1.printError)(`Failed to fetch revenue: ${msg}`);
        process.exitCode = 1;
    }
}
// ---------------------------------------------------------------------------
// tiers command
// ---------------------------------------------------------------------------
async function runTiers(args, programId, jsonMode) {
    const creatorHash = args[0];
    if (!creatorHash) {
        (0, utils_1.printError)('Usage: veilsub tiers <creator_hash>');
        process.exitCode = 1;
        return;
    }
    try {
        // First get the base price and tier count
        const [basePriceRaw, tierCountRaw] = await Promise.all([
            (0, query_1.fetchMapping)(programId, 'tier_prices', creatorHash),
            (0, query_1.fetchMapping)(programId, 'tier_count', creatorHash),
        ]);
        const basePrice = (0, utils_1.parseLeoU64)(basePriceRaw) ?? 0;
        const tierCount = (0, utils_1.parseLeoU64)(tierCountRaw) ?? 0;
        if (basePrice === 0) {
            if (jsonMode) {
                (0, utils_1.printJson)({ creatorHash, registered: false, tiers: [] });
                return;
            }
            (0, utils_1.printHeader)('Creator Tiers');
            (0, utils_1.printTable)([
                { label: 'Creator Hash:', value: utils_1.color.cyan(creatorHash) },
                { label: 'Status:', value: utils_1.color.yellow('Not registered') },
            ]);
            console.log();
            return;
        }
        // Fetch individual tier prices in parallel (tiers 1-20 max)
        const tierIds = Array.from({ length: Math.min(tierCount, 20) }, (_, i) => i + 1);
        const tierResults = await Promise.all(tierIds.map(async (tierId) => {
            // creator_tiers uses a composite key; try the tier_prices base for tier 1
            // Custom tiers use tier_prices mapping with tierId as suffix
            const priceRaw = await (0, query_1.fetchMapping)(programId, 'creator_tiers', `${creatorHash.replace(/field$/, '')}${tierId}field`);
            const deprecatedRaw = await (0, query_1.fetchMapping)(programId, 'tier_deprecated', `${creatorHash.replace(/field$/, '')}${tierId}field`);
            return {
                tierId,
                price: (0, utils_1.parseLeoU64)(priceRaw) ?? 0,
                deprecated: (0, utils_1.parseLeoBool)(deprecatedRaw) ?? false,
            };
        }));
        const tiers = [
            { tierId: 0, price: basePrice, deprecated: false },
            ...tierResults.filter(t => t.price > 0),
        ];
        if (jsonMode) {
            (0, utils_1.printJson)({
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
        (0, utils_1.printHeader)('Creator Tiers');
        (0, utils_1.printTable)([
            { label: 'Creator Hash:', value: utils_1.color.cyan(creatorHash) },
            { label: 'Tier Count:', value: utils_1.color.cyan(String(tierCount)) },
        ]);
        console.log();
        console.log(`  ${utils_1.color.bold('Tier'.padEnd(8))} ` +
            `${utils_1.color.bold('Price'.padEnd(30))} ` +
            `${utils_1.color.bold('Status')}`);
        console.log(`  ${utils_1.color.dim('─'.repeat(55))}`);
        for (const tier of tiers) {
            const tierLabel = tier.tierId === 0 ? 'Base' : `Tier ${tier.tierId}`;
            const priceStr = `${(0, utils_1.formatNumber)(tier.price)} (${(0, utils_1.formatCredits)(tier.price)})`;
            const statusStr = tier.deprecated ? utils_1.color.red('deprecated') : utils_1.color.green('active');
            console.log(`  ${tierLabel.padEnd(8)} ${priceStr.padEnd(30)} ${statusStr}`);
        }
        console.log();
    }
    catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        (0, utils_1.printError)(`Failed to fetch tiers: ${msg}`);
        process.exitCode = 1;
    }
}
//# sourceMappingURL=creator.js.map