import type { MonitorEvent, BotConfig } from './types.js';
export declare class NotificationDispatcher {
    private readonly config;
    private readonly botVersion;
    constructor(config: BotConfig);
    dispatch(event: MonitorEvent): Promise<void>;
    private logToConsole;
    private sendWebhook;
    private storeInSupabase;
    private shouldLog;
    private logInternal;
}
export declare function logBanner(programId: string, pollInterval: number, creatorCount: number): void;
export declare function logInfo(message: string): void;
export declare function logError(message: string): void;
//# sourceMappingURL=notifications.d.ts.map