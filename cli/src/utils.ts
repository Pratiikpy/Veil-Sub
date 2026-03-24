// =============================================================================
// @veilsub/cli — Output Utilities
//
// ANSI color formatting, table rendering, and number formatting.
// Zero dependencies — uses only Node.js built-ins.
// =============================================================================

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
} as const;

function wrap(code: keyof typeof codes, text: string): string {
  if (!isColorSupported) return text;
  return `${codes[code]}${text}${codes.reset}`;
}

export const color = {
  red: (s: string) => wrap('red', s),
  green: (s: string) => wrap('green', s),
  yellow: (s: string) => wrap('yellow', s),
  blue: (s: string) => wrap('blue', s),
  magenta: (s: string) => wrap('magenta', s),
  cyan: (s: string) => wrap('cyan', s),
  white: (s: string) => wrap('white', s),
  gray: (s: string) => wrap('gray', s),
  bold: (s: string) => wrap('bold', s),
  dim: (s: string) => wrap('dim', s),
} as const;

// ---------------------------------------------------------------------------
// Number Formatting
// ---------------------------------------------------------------------------

/** 1 ALEO = 1,000,000 microcredits */
const MICROCREDITS_PER_CREDIT = 1_000_000;

/**
 * Convert microcredits to a human-readable ALEO string.
 * e.g., 5000000 -> "5.0 ALEO"
 */
export function formatCredits(microcredits: number): string {
  const credits = microcredits / MICROCREDITS_PER_CREDIT;
  // Use up to 6 decimal places, but trim trailing zeros
  const formatted = credits.toFixed(6).replace(/\.?0+$/, '');
  return `${formatted} ALEO`;
}

/**
 * Format a large number with comma separators.
 * e.g., 9000000 -> "9,000,000"
 */
export function formatNumber(n: number): string {
  return n.toLocaleString('en-US');
}

/**
 * Truncate a field value for display.
 * e.g., "5895434346742188517605628668414418785502575139839733911875586046449923524635field" -> "5895434...4635field"
 */
export function truncateField(value: string, maxLen: number = 24): string {
  if (value.length <= maxLen) return value;
  const suffix = value.endsWith('field') ? 'field' : '';
  const core = suffix ? value.slice(0, -5) : value;
  if (core.length <= maxLen - 3) return value;
  const keep = Math.floor((maxLen - 3 - suffix.length) / 2);
  return `${core.slice(0, keep)}...${core.slice(-keep)}${suffix}`;
}

// ---------------------------------------------------------------------------
// Leo Value Parsing
// ---------------------------------------------------------------------------

/** Parse a Leo u64 value like "5000000u64" -> 5000000 */
export function parseLeoU64(raw: string | null): number | null {
  if (raw == null) return null;
  const match = raw.match(/^(\d+)u(?:64|128|32|16|8)$/);
  return match ? parseInt(match[1], 10) : null;
}

/** Parse a Leo field value like "123field" -> "123field" */
export function parseLeoField(raw: string | null): string | null {
  if (raw == null) return null;
  const match = raw.match(/^(\d+field)$/);
  return match ? match[1] : raw;
}

/** Parse a Leo bool value like "true" -> true */
export function parseLeoBool(raw: string | null): boolean | null {
  if (raw == null) return null;
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  return null;
}

// ---------------------------------------------------------------------------
// Table Formatting
// ---------------------------------------------------------------------------

export interface TableRow {
  label: string;
  value: string;
}

/**
 * Print a labeled key-value table.
 *
 * Example output:
 *   Subscribers:  3
 *   Revenue:      9,000,000 microcredits (9.0 ALEO)
 */
export function printTable(rows: ReadonlyArray<TableRow>): void {
  const maxLabel = Math.max(...rows.map(r => r.label.length));
  for (const row of rows) {
    const paddedLabel = row.label.padEnd(maxLabel);
    console.log(`  ${color.gray(paddedLabel)}  ${row.value}`);
  }
}

/**
 * Print a section header with a colored title.
 */
export function printHeader(title: string): void {
  console.log();
  console.log(color.bold(color.cyan(title)));
  console.log(color.dim('─'.repeat(Math.max(title.length, 40))));
}

/**
 * Print a success message.
 */
export function printSuccess(message: string): void {
  console.log(color.green(`  ${message}`));
}

/**
 * Print an error message to stderr.
 */
export function printError(message: string): void {
  console.error(color.red(`Error: ${message}`));
}

/**
 * Print a warning message.
 */
export function printWarning(message: string): void {
  console.log(color.yellow(`Warning: ${message}`));
}

// ---------------------------------------------------------------------------
// JSON Output
// ---------------------------------------------------------------------------

/**
 * Print data as JSON (for --json flag).
 */
export function printJson(data: unknown): void {
  console.log(JSON.stringify(data, null, 2));
}

// ---------------------------------------------------------------------------
// Arg Parsing Helpers
// ---------------------------------------------------------------------------

/**
 * Check if a flag exists in args.
 */
export function hasFlag(args: ReadonlyArray<string>, flag: string): boolean {
  return args.includes(flag);
}

/**
 * Get a flag value from args (e.g., --program veilsub_v29.aleo).
 * Returns null if not found.
 */
export function getFlagValue(args: ReadonlyArray<string>, flag: string): string | null {
  const idx = args.indexOf(flag);
  if (idx === -1 || idx + 1 >= args.length) return null;
  return args[idx + 1];
}
