-- VeilSub Supabase Schema
-- Privacy-first creator subscription platform on Aleo
--
-- Privacy Design:
--   - Creator addresses are NEVER stored in plaintext
--   - address_hash = SHA-256(aleo_address) — used as primary key
--   - encrypted_address = AES-GCM encrypted address — only decryptable by the server
--   - Subscriber identities are never stored off-chain (handled purely on-chain via records)

-- ============================================================
-- Table: creator_profiles
-- Purpose: Off-chain creator metadata (display name, bio)
-- Used by: /api/creators (GET, POST), /api/creators/list (GET)
-- ============================================================
CREATE TABLE IF NOT EXISTS creator_profiles (
  address_hash    TEXT PRIMARY KEY,           -- SHA-256(aleo1...) hex string, 64 chars
  encrypted_address TEXT,                     -- AES-GCM encrypted Aleo address (set once on registration)
  display_name    TEXT CHECK (char_length(display_name) <= 100),
  bio             TEXT CHECK (char_length(bio) <= 1000),
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- Index for listing/search by display name
CREATE INDEX IF NOT EXISTS idx_creator_profiles_display_name
  ON creator_profiles USING gin (display_name gin_trgm_ops);

-- Index for listing by creation date
CREATE INDEX IF NOT EXISTS idx_creator_profiles_created_at
  ON creator_profiles (created_at DESC);

-- ============================================================
-- Table: subscription_events
-- Purpose: Off-chain subscription analytics (aggregate stats)
-- Used by: /api/analytics (GET, POST), /api/analytics/summary (GET)
-- ============================================================
CREATE TABLE IF NOT EXISTS subscription_events (
  id                    BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  creator_address_hash  TEXT NOT NULL,         -- SHA-256(creator_aleo_address), links to creator_profiles
  tier                  INTEGER NOT NULL CHECK (tier >= 0 AND tier <= 10),
  amount_microcredits   BIGINT NOT NULL CHECK (amount_microcredits >= 0),
  tx_id                 TEXT,                  -- Aleo transaction ID (optional, for cross-reference)
  created_at            TIMESTAMPTZ DEFAULT now()
);

-- Index for per-creator queries (analytics dashboard)
CREATE INDEX IF NOT EXISTS idx_subscription_events_creator
  ON subscription_events (creator_address_hash, created_at DESC);

-- Index for global recent events
CREATE INDEX IF NOT EXISTS idx_subscription_events_recent
  ON subscription_events (created_at DESC);

-- ============================================================
-- Row Level Security (RLS)
-- ============================================================

-- Enable RLS on both tables
ALTER TABLE creator_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_events ENABLE ROW LEVEL SECURITY;

-- Allow anonymous reads (public data: display names, aggregate stats)
CREATE POLICY "Public read access" ON creator_profiles
  FOR SELECT USING (true);

CREATE POLICY "Public read access" ON subscription_events
  FOR SELECT USING (true);

-- Allow service role full access (API routes use service key)
CREATE POLICY "Service role full access" ON creator_profiles
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access" ON subscription_events
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================
-- Notes
-- ============================================================
-- Posts/content are stored in Upstash Redis (not Supabase):
--   Key pattern: veilsub:posts:{creator_address}
--   Value: ZSET of JSON posts (id, title, body, minTier, createdAt, contentId)
--   Rate limit keys: veilsub:ratelimit:{address}, veilsub:del-rl:{address}, veilsub:unlock-rl:{walletHash}
--
-- On-chain data (mappings) queried directly from Aleo testnet API:
--   https://api.explorer.provable.com/v1/testnet/program/veilsub_v15.aleo/mapping/{name}/{key}
--   Mappings: tier_prices, subscriber_count, content_count, tier_count, etc.
