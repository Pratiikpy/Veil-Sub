export declare const color: {
    readonly red: (s: string) => string;
    readonly green: (s: string) => string;
    readonly yellow: (s: string) => string;
    readonly blue: (s: string) => string;
    readonly magenta: (s: string) => string;
    readonly cyan: (s: string) => string;
    readonly white: (s: string) => string;
    readonly gray: (s: string) => string;
    readonly bold: (s: string) => string;
    readonly dim: (s: string) => string;
};
/**
 * Convert microcredits to a human-readable ALEO string.
 * e.g., 5000000 -> "5.0 ALEO"
 */
export declare function formatCredits(microcredits: number): string;
/**
 * Format a large number with comma separators.
 * e.g., 9000000 -> "9,000,000"
 */
export declare function formatNumber(n: number): string;
/**
 * Truncate a field value for display.
 * e.g., "5895434346742188517605628668414418785502575139839733911875586046449923524635field" -> "5895434...4635field"
 */
export declare function truncateField(value: string, maxLen?: number): string;
/** Parse a Leo u64 value like "5000000u64" -> 5000000 */
export declare function parseLeoU64(raw: string | null): number | null;
/** Parse a Leo field value like "123field" -> "123field" */
export declare function parseLeoField(raw: string | null): string | null;
/** Parse a Leo bool value like "true" -> true */
export declare function parseLeoBool(raw: string | null): boolean | null;
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
export declare function printTable(rows: ReadonlyArray<TableRow>): void;
/**
 * Print a section header with a colored title.
 */
export declare function printHeader(title: string): void;
/**
 * Print a success message.
 */
export declare function printSuccess(message: string): void;
/**
 * Print an error message to stderr.
 */
export declare function printError(message: string): void;
/**
 * Print a warning message.
 */
export declare function printWarning(message: string): void;
/**
 * Print data as JSON (for --json flag).
 */
export declare function printJson(data: unknown): void;
/**
 * Check if a flag exists in args.
 */
export declare function hasFlag(args: ReadonlyArray<string>, flag: string): boolean;
/**
 * Get a flag value from args (e.g., --program veilsub_v28.aleo).
 * Returns null if not found.
 */
export declare function getFlagValue(args: ReadonlyArray<string>, flag: string): string | null;
//# sourceMappingURL=utils.d.ts.map