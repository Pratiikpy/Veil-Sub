import type { MappingValue } from './types.js';
export declare class AleoClient {
    private readonly apiUrl;
    private readonly programId;
    private readonly rateLimiter;
    private readonly maxRetries;
    constructor(apiUrl: string, programId: string);
    getLatestBlockHeight(): Promise<number>;
    getMappingValue(mappingName: string, key: string): Promise<MappingValue>;
    getMultipleMappingValues(requests: ReadonlyArray<{
        mapping: string;
        key: string;
    }>): Promise<Map<string, MappingValue>>;
    static parseLeoU64(raw: string | null): number;
    static parseLeoU128(raw: string | null): bigint;
    static parseLeoField(raw: string | null): string;
    static parseLeoBool(raw: string | null): boolean;
    private fetchWithRetry;
}
export declare class AleoApiError extends Error {
    readonly status: number;
    constructor(message: string, status: number);
}
//# sourceMappingURL=aleo-client.d.ts.map