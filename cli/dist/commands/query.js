"use strict";
// =============================================================================
// @veilsub/cli — query command
//
// Generic mapping query against on-chain VeilSub program state.
// =============================================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.API_BASE = exports.DEFAULT_PROGRAM = exports.KNOWN_MAPPINGS = void 0;
exports.runQuery = runQuery;
exports.fetchMapping = fetchMapping;
const utils_1 = require("../utils");
// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const API_BASE = 'https://api.explorer.provable.com/v1/testnet';
exports.API_BASE = API_BASE;
const DEFAULT_PROGRAM = 'veilsub_v29.aleo';
exports.DEFAULT_PROGRAM = DEFAULT_PROGRAM;
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
];
exports.KNOWN_MAPPINGS = KNOWN_MAPPINGS;
// ---------------------------------------------------------------------------
// API Fetch
// ---------------------------------------------------------------------------
async function fetchMapping(programId, mapping, key) {
    const url = `${API_BASE}/program/${programId}/mapping/${mapping}/${key}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15_000);
    try {
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) {
            if (response.status === 404)
                return null;
            throw new Error(`API returned ${response.status}: ${response.statusText}`);
        }
        const text = await response.text();
        const trimmed = text.trim().replace(/^"|"$/g, '');
        if (trimmed === 'null' || trimmed === '')
            return null;
        return trimmed;
    }
    catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
            throw new Error('Request timed out after 15s');
        }
        throw error;
    }
    finally {
        clearTimeout(timeoutId);
    }
}
// ---------------------------------------------------------------------------
// Value interpretation
// ---------------------------------------------------------------------------
function interpretValue(raw, mapping) {
    // Try u64 interpretation
    const numVal = (0, utils_1.parseLeoU64)(raw);
    if (numVal != null) {
        // If it's a revenue/price mapping, show ALEO equivalent
        const revenueKeys = ['tier_prices', 'total_revenue', 'platform_revenue', 'stablecoin_revenue', 'creator_tiers'];
        if (revenueKeys.includes(mapping)) {
            return `${(0, utils_1.formatNumber)(numVal)} microcredits (${(0, utils_1.formatCredits)(numVal)})`;
        }
        return (0, utils_1.formatNumber)(numVal);
    }
    // Try boolean
    const boolVal = (0, utils_1.parseLeoBool)(raw);
    if (boolVal != null) {
        return boolVal ? utils_1.color.green('true') : utils_1.color.red('false');
    }
    // Try field
    const fieldVal = (0, utils_1.parseLeoField)(raw);
    if (fieldVal != null) {
        return utils_1.color.cyan(fieldVal);
    }
    // Raw string
    return raw;
}
// ---------------------------------------------------------------------------
// query command
// ---------------------------------------------------------------------------
async function runQuery(args, programId, jsonMode) {
    const mapping = args[0];
    const key = args[1];
    if (!mapping || !key) {
        (0, utils_1.printError)('Usage: veilsub query <mapping> <key>');
        console.log();
        console.log('  Available mappings:');
        for (const m of KNOWN_MAPPINGS) {
            console.log(`    ${utils_1.color.cyan(m)}`);
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
            (0, utils_1.printJson)({
                program: programId,
                mapping,
                key,
                raw,
                found: raw != null,
            });
            return;
        }
        if (raw == null) {
            (0, utils_1.printHeader)(`Query: ${mapping}`);
            (0, utils_1.printTable)([
                { label: 'Program:', value: utils_1.color.dim(programId) },
                { label: 'Mapping:', value: utils_1.color.cyan(mapping) },
                { label: 'Key:', value: utils_1.color.cyan(key) },
                { label: 'Result:', value: utils_1.color.yellow('not found') },
            ]);
            console.log();
            return;
        }
        const interpreted = interpretValue(raw, mapping);
        (0, utils_1.printHeader)(`Query: ${mapping}`);
        (0, utils_1.printTable)([
            { label: 'Program:', value: utils_1.color.dim(programId) },
            { label: 'Mapping:', value: utils_1.color.cyan(mapping) },
            { label: 'Key:', value: utils_1.color.cyan(key) },
            { label: 'Raw:', value: utils_1.color.dim(raw) },
            { label: 'Value:', value: interpreted },
        ]);
        console.log();
    }
    catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        (0, utils_1.printError)(`Failed to query mapping: ${msg}`);
        process.exitCode = 1;
    }
}
//# sourceMappingURL=query.js.map