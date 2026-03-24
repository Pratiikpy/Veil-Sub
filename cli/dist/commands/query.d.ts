declare const API_BASE = "https://api.explorer.provable.com/v1/testnet";
declare const DEFAULT_PROGRAM = "veilsub_v29.aleo";
/** All known mapping names in the VeilSub protocol */
declare const KNOWN_MAPPINGS: readonly ["tier_prices", "subscriber_count", "total_revenue", "platform_revenue", "content_count", "content_meta", "content_hashes", "content_creator", "creator_tiers", "tier_count", "tier_deprecated", "content_deleted", "gift_redeemed", "nonce_used", "encryption_commits", "access_revoked", "pass_creator", "content_disputes", "tip_commitments", "tip_revealed", "dispute_count_by_caller", "subscription_by_tier", "trial_used", "total_creators", "total_content", "stablecoin_revenue"];
declare function fetchMapping(programId: string, mapping: string, key: string): Promise<string | null>;
export declare function runQuery(args: ReadonlyArray<string>, programId: string, jsonMode: boolean): Promise<void>;
export { fetchMapping, KNOWN_MAPPINGS, DEFAULT_PROGRAM, API_BASE };
//# sourceMappingURL=query.d.ts.map