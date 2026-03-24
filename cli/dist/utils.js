"use strict";
// =============================================================================
// @veilsub/cli — Output Utilities
//
// ANSI color formatting, table rendering, and number formatting.
// Zero dependencies — uses only Node.js built-ins.
// =============================================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.color = void 0;
exports.formatCredits = formatCredits;
exports.formatNumber = formatNumber;
exports.truncateField = truncateField;
exports.parseLeoU64 = parseLeoU64;
exports.parseLeoField = parseLeoField;
exports.parseLeoBool = parseLeoBool;
exports.printTable = printTable;
exports.printHeader = printHeader;
exports.printSuccess = printSuccess;
exports.printError = printError;
exports.printWarning = printWarning;
exports.printJson = printJson;
exports.hasFlag = hasFlag;
exports.getFlagValue = getFlagValue;
// ---------------------------------------------------------------------------
// ANSI Color Codes
// ---------------------------------------------------------------------------
const isColorSupported = process.stdout.isTTY && !process.env['NO_COLOR'];
const codes = {
    reset: '\x1b[0m',
    bold: '\x1b[1m',
    dim: '\x1b[2m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    gray: '\x1b[90m',
};
function wrap(code, text) {
    if (!isColorSupported)
        return text;
    return `${codes[code]}${text}${codes.reset}`;
}
exports.color = {
    red: (s) => wrap('red', s),
    green: (s) => wrap('green', s),
    yellow: (s) => wrap('yellow', s),
    blue: (s) => wrap('blue', s),
    magenta: (s) => wrap('magenta', s),
    cyan: (s) => wrap('cyan', s),
    white: (s) => wrap('white', s),
    gray: (s) => wrap('gray', s),
    bold: (s) => wrap('bold', s),
    dim: (s) => wrap('dim', s),
};
// ---------------------------------------------------------------------------
// Number Formatting
// ---------------------------------------------------------------------------
/** 1 ALEO = 1,000,000 microcredits */
const MICROCREDITS_PER_CREDIT = 1_000_000;
/**
 * Convert microcredits to a human-readable ALEO string.
 * e.g., 5000000 -> "5.0 ALEO"
 */
function formatCredits(microcredits) {
    const credits = microcredits / MICROCREDITS_PER_CREDIT;
    // Use up to 6 decimal places, but trim trailing zeros
    const formatted = credits.toFixed(6).replace(/\.?0+$/, '');
    return `${formatted} ALEO`;
}
/**
 * Format a large number with comma separators.
 * e.g., 9000000 -> "9,000,000"
 */
function formatNumber(n) {
    return n.toLocaleString('en-US');
}
/**
 * Truncate a field value for display.
 * e.g., "5895434346742188517605628668414418785502575139839733911875586046449923524635field" -> "5895434...4635field"
 */
function truncateField(value, maxLen = 24) {
    if (value.length <= maxLen)
        return value;
    const suffix = value.endsWith('field') ? 'field' : '';
    const core = suffix ? value.slice(0, -5) : value;
    if (core.length <= maxLen - 3)
        return value;
    const keep = Math.floor((maxLen - 3 - suffix.length) / 2);
    return `${core.slice(0, keep)}...${core.slice(-keep)}${suffix}`;
}
// ---------------------------------------------------------------------------
// Leo Value Parsing
// ---------------------------------------------------------------------------
/** Parse a Leo u64 value like "5000000u64" -> 5000000 */
function parseLeoU64(raw) {
    if (raw == null)
        return null;
    const match = raw.match(/^(\d+)u(?:64|128|32|16|8)$/);
    return match ? parseInt(match[1], 10) : null;
}
/** Parse a Leo field value like "123field" -> "123field" */
function parseLeoField(raw) {
    if (raw == null)
        return null;
    const match = raw.match(/^(\d+field)$/);
    return match ? match[1] : raw;
}
/** Parse a Leo bool value like "true" -> true */
function parseLeoBool(raw) {
    if (raw == null)
        return null;
    if (raw === 'true')
        return true;
    if (raw === 'false')
        return false;
    return null;
}
/**
 * Print a labeled key-value table.
 *
 * Example output:
 *   Subscribers:  3
 *   Revenue:      9,000,000 microcredits (9.0 ALEO)
 */
function printTable(rows) {
    const maxLabel = Math.max(...rows.map(r => r.label.length));
    for (const row of rows) {
        const paddedLabel = row.label.padEnd(maxLabel);
        console.log(`  ${exports.color.gray(paddedLabel)}  ${row.value}`);
    }
}
/**
 * Print a section header with a colored title.
 */
function printHeader(title) {
    console.log();
    console.log(exports.color.bold(exports.color.cyan(title)));
    console.log(exports.color.dim('─'.repeat(Math.max(title.length, 40))));
}
/**
 * Print a success message.
 */
function printSuccess(message) {
    console.log(exports.color.green(`  ${message}`));
}
/**
 * Print an error message to stderr.
 */
function printError(message) {
    console.error(exports.color.red(`Error: ${message}`));
}
/**
 * Print a warning message.
 */
function printWarning(message) {
    console.log(exports.color.yellow(`Warning: ${message}`));
}
// ---------------------------------------------------------------------------
// JSON Output
// ---------------------------------------------------------------------------
/**
 * Print data as JSON (for --json flag).
 */
function printJson(data) {
    console.log(JSON.stringify(data, null, 2));
}
// ---------------------------------------------------------------------------
// Arg Parsing Helpers
// ---------------------------------------------------------------------------
/**
 * Check if a flag exists in args.
 */
function hasFlag(args, flag) {
    return args.includes(flag);
}
/**
 * Get a flag value from args (e.g., --program veilsub_v28.aleo).
 * Returns null if not found.
 */
function getFlagValue(args, flag) {
    const idx = args.indexOf(flag);
    if (idx === -1 || idx + 1 >= args.length)
        return null;
    return args[idx + 1];
}
//# sourceMappingURL=utils.js.map