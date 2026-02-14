-- VeilSub Supabase Schema
-- Run this in your Supabase SQL Editor to create the required tables.

CREATE TABLE creator_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  encrypted_address TEXT NOT NULL,
  address_hash TEXT NOT NULL UNIQUE,
  display_name TEXT,
  bio TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE subscription_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_address_hash TEXT NOT NULL,
  tier INTEGER NOT NULL,
  amount_microcredits BIGINT NOT NULL,
  tx_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE content_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_address_hash TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  min_tier INTEGER NOT NULL DEFAULT 1,
  content_id TEXT,
  tx_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX idx_creator_profiles_hash ON creator_profiles(address_hash);
CREATE INDEX idx_subscription_events_creator ON subscription_events(creator_address_hash);
CREATE INDEX idx_content_posts_creator ON content_posts(creator_address_hash);
