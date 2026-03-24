// ─── Rate Limiter ───────────────────────────────────────────────────────────
class RateLimiter {
    maxPerSecond;
    timestamps = [];
    constructor(maxPerSecond) {
        this.maxPerSecond = maxPerSecond;
    }
    async waitForSlot() {
        const now = Date.now();
        // Remove timestamps older than 1 second
        while (this.timestamps.length > 0 && this.timestamps[0] < now - 1000) {
            this.timestamps.shift();
        }
        if (this.timestamps.length >= this.maxPerSecond) {
            const waitMs = 1000 - (now - this.timestamps[0]) + 10;
            await sleep(waitMs);
        }
        this.timestamps.push(Date.now());
    }
}
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
// ─── Aleo Client ────────────────────────────────────────────────────────────
export class AleoClient {
    apiUrl;
    programId;
    rateLimiter;
    maxRetries = 3;
    constructor(apiUrl, programId) {
        this.apiUrl = apiUrl;
        this.programId = programId;
        this.rateLimiter = new RateLimiter(8); // Stay under 10 req/s with margin
    }
    // ── Public API ──────────────────────────────────────────────────────────
    async getLatestBlockHeight() {
        const raw = await this.fetchWithRetry(`${this.apiUrl}/latest/height`);
        const height = parseInt(raw, 10);
        if (!Number.isFinite(height)) {
            throw new Error(`Invalid block height: ${raw}`);
        }
        return height;
    }
    async getMappingValue(mappingName, key) {
        try {
            const url = `${this.apiUrl}/program/${this.programId}/mapping/${mappingName}/${key}`;
            const raw = await this.fetchWithRetry(url);
            return raw;
        }
        catch (err) {
            // 404 means the key doesn't exist in the mapping — not an error
            if (err instanceof AleoApiError && err.status === 404) {
                return null;
            }
            throw err;
        }
    }
    async getMultipleMappingValues(requests) {
        const results = new Map();
        // Process sequentially to respect rate limits
        for (const req of requests) {
            const cacheKey = `${req.mapping}:${req.key}`;
            const value = await this.getMappingValue(req.mapping, req.key);
            results.set(cacheKey, value);
        }
        return results;
    }
    // ── Leo Value Parsing ─────────────────────────────────────────────────
    static parseLeoU64(raw) {
        if (raw === null)
            return 0;
        const cleaned = raw.replace(/"/g, '').replace('u64', '').trim();
        const value = parseInt(cleaned, 10);
        return Number.isFinite(value) ? value : 0;
    }
    static parseLeoU128(raw) {
        if (raw === null)
            return 0n;
        const cleaned = raw.replace(/"/g, '').replace('u128', '').trim();
        try {
            return BigInt(cleaned);
        }
        catch {
            return 0n;
        }
    }
    static parseLeoField(raw) {
        if (raw === null)
            return '';
        return raw.replace(/"/g, '').trim();
    }
    static parseLeoBool(raw) {
        if (raw === null)
            return false;
        return raw.replace(/"/g, '').trim() === 'true';
    }
    // ── Internal ──────────────────────────────────────────────────────────
    async fetchWithRetry(url) {
        let lastError = null;
        for (let attempt = 0; attempt < this.maxRetries; attempt++) {
            await this.rateLimiter.waitForSlot();
            try {
                const response = await fetch(url, {
                    headers: { 'Accept': 'application/json' },
                    signal: AbortSignal.timeout(10_000),
                });
                if (!response.ok) {
                    throw new AleoApiError(`HTTP ${response.status}: ${response.statusText}`, response.status);
                }
                return await response.text();
            }
            catch (err) {
                lastError = err instanceof Error ? err : new Error(String(err));
                // Don't retry on 404 (mapping key not found)
                if (err instanceof AleoApiError && err.status === 404) {
                    throw err;
                }
                // Exponential backoff: 1s, 2s, 4s
                if (attempt < this.maxRetries - 1) {
                    const backoffMs = Math.pow(2, attempt) * 1000;
                    await sleep(backoffMs);
                }
            }
        }
        throw lastError ?? new Error('Fetch failed after retries');
    }
}
// ─── Custom Error ───────────────────────────────────────────────────────────
export class AleoApiError extends Error {
    status;
    constructor(message, status) {
        super(message);
        this.name = 'AleoApiError';
        this.status = status;
    }
}
//# sourceMappingURL=aleo-client.js.map