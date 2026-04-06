-- ===========================================
-- Migration 006: Adaptive Features
-- Adds visitor_type to user_profiles (Supabase)
-- and interests column if not already present.
-- ===========================================

-- Run this in the Supabase Dashboard → SQL Editor.

-- ─── landmarks: add tier column (referenced in code but missing from 002) ────
ALTER TABLE landmarks
  ADD COLUMN IF NOT EXISTS tier TEXT NOT NULL DEFAULT 'public'
    CHECK (tier IN ('public', 'discovered', 'hidden'));

CREATE INDEX IF NOT EXISTS idx_landmarks_tier ON landmarks(tier);

-- user_profiles is the Supabase-side profile table used by the mobile app.

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

-- ─── Collections: fix FK + add mobile-app columns missing from migration 003 ──
-- Migration 003 references public.users(id) but Supabase auth users live in
-- auth.users. Drop the wrong FK and replace with the correct one.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'collections_user_id_fkey'
      AND table_name = 'collections'
  ) THEN
    ALTER TABLE collections DROP CONSTRAINT collections_user_id_fkey;
  END IF;
END $$;

ALTER TABLE collections
  ADD CONSTRAINT collections_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Also fix landmark_id FK — landmarks may not exist yet when referenced
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'collections_landmark_id_fkey'
      AND table_name = 'collections'
  ) THEN
    ALTER TABLE collections DROP CONSTRAINT collections_landmark_id_fkey;
  END IF;
END $$;

-- Landmark FK is now nullable (mobile check-ins can use names without a DB landmark_id)
ALTER TABLE collections
  ALTER COLUMN landmark_id DROP NOT NULL;

ALTER TABLE collections
  ADD CONSTRAINT collections_landmark_id_fkey
  FOREIGN KEY (landmark_id) REFERENCES landmarks(id) ON DELETE SET NULL;

-- Mobile app columns
ALTER TABLE collections
  ADD COLUMN IF NOT EXISTS landmark_name     TEXT,
  ADD COLUMN IF NOT EXISTS landmark_lat      DECIMAL(10, 8),
  ADD COLUMN IF NOT EXISTS landmark_lon      DECIMAL(11, 8),
  ADD COLUMN IF NOT EXISTS landmark_category TEXT,
  ADD COLUMN IF NOT EXISTS landmark_tier     TEXT DEFAULT 'public',
  ADD COLUMN IF NOT EXISTS xp_earned         INT  DEFAULT 0,
  ADD COLUMN IF NOT EXISTS dwell_time_min    INT  CHECK (dwell_time_min > 0);

CREATE INDEX IF NOT EXISTS idx_collections_category_dwell
  ON collections(user_id, landmark_category)
  WHERE dwell_time_min IS NOT NULL;
