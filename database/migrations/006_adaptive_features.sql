-- ===========================================
-- Migration 006: Adaptive Features
-- Adds visitor_type to user_profiles (Supabase)
-- and interests column if not already present.
-- ===========================================

-- user_profiles is the Supabase-side profile table used by the mobile app.
-- Run this in the Supabase Dashboard → SQL Editor.

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS visitor_type TEXT
    NOT NULL DEFAULT 'tourist'
    CHECK (visitor_type IN ('tourist', 'local'));

-- interests may already exist; guard with IF NOT EXISTS
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS interests TEXT[] NOT NULL DEFAULT '{}';

-- Index for future visitor-type based queries / analytics
CREATE INDEX IF NOT EXISTS idx_user_profiles_visitor_type
  ON user_profiles(visitor_type);

-- ─── Collections: add mobile-app columns missing from migration 003 ───────────
-- Migration 003 only has the backend schema. The mobile app needs these extras.
ALTER TABLE collections
  ADD COLUMN IF NOT EXISTS landmark_name     TEXT,
  ADD COLUMN IF NOT EXISTS landmark_lat      DECIMAL(10, 8),
  ADD COLUMN IF NOT EXISTS landmark_lon      DECIMAL(11, 8),
  ADD COLUMN IF NOT EXISTS landmark_category TEXT,
  ADD COLUMN IF NOT EXISTS landmark_tier     TEXT DEFAULT 'public',
  ADD COLUMN IF NOT EXISTS xp_earned         INT  DEFAULT 0,
  ADD COLUMN IF NOT EXISTS dwell_time_min    INT  CHECK (dwell_time_min > 0);

-- Now safe to index on landmark_category
CREATE INDEX IF NOT EXISTS idx_collections_category_dwell
  ON collections(user_id, landmark_category)
  WHERE dwell_time_min IS NOT NULL;
