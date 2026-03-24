import type { BotConfig } from './types.js';
export declare class SubscriptionMonitor {
    private readonly config;
    private readonly client;
    private readonly dispatcher;
    private creatorSnapshots;
    private platformSnapshot;
    private isFirstPoll;
    private running;
    private pollTimer;
    private pollCount;
    constructor(config: BotConfig);
    start(): Promise<void>;
    stop(): void;
    private scheduleNextPoll;
    private poll;
    private pollPlatformStats;
    private pollCreator;
    private emit;
}
//# sourceMappingURL=monitor.d.ts.map