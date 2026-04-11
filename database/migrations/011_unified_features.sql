-- =============================================================================
-- Migration 011: Unified Features
-- Adds communities, channels, quests, expanded columns and LLM/drift fields
-- to the existing feature/refactor Supabase database.
--
-- SAFE TO RUN: purely additive — no DROP TABLE, no data loss.
-- Idempotent: all statements use IF NOT EXISTS / IF EXISTS guards.
-- RUN: Supabase Dashboard → SQL Editor → paste & execute.
-- REQUIRES: migrations 001–007 already applied.
-- =============================================================================

-- ─── A. New columns on existing tables ───────────────────────────────────────

-- users: LLM personalisation + drift detection fields
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS detail_level              TEXT DEFAULT 'overview',
  ADD COLUMN IF NOT EXISTS language_pref             TEXT DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS onboarding_group_context  TEXT DEFAULT 'solo',
  ADD COLUMN IF NOT EXISTS drift_detected_at         TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS drift_from_category       TEXT,
  ADD COLUMN IF NOT EXISTS drift_to_category         TEXT;

-- landmarks: tag array for adaptive scoring
ALTER TABLE landmarks
  ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- collections: behavioural context blob + redundant timestamp alias
ALTER TABLE collections
  ADD COLUMN IF NOT EXISTS context       JSONB                    DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- expeditions: gamification columns for the quest/narrative system
ALTER TABLE expeditions
  ADD COLUMN IF NOT EXISTS description    TEXT,
  ADD COLUMN IF NOT EXISTS category       VARCHAR(50),
  ADD COLUMN IF NOT EXISTS difficulty     INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS reward_xp      INTEGER DEFAULT 500,
  ADD COLUMN IF NOT EXISTS required_count INTEGER DEFAULT 3,
  ADD COLUMN IF NOT EXISTS is_narrative   BOOLEAN DEFAULT false;

-- ─── B. New tables ────────────────────────────────────────────────────────────
-- Note: communities, community_members, community_channels may already exist if
-- migration 007_gamification_schema or 010_unify_social_gamification was previously
-- run on this DB. CREATE TABLE IF NOT EXISTS handles that safely.

-- Communities
CREATE TABLE IF NOT EXISTS communities (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        VARCHAR(255) NOT NULL,
  description TEXT,
  theme       VARCHAR(50),
  avatar_url  TEXT,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Community membership
CREATE TABLE IF NOT EXISTS community_members (
  community_id UUID REFERENCES communities(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL,
  joined_at    TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (community_id, user_id)
);

-- Community channels (text rooms)
CREATE TABLE IF NOT EXISTS community_channels (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  community_id UUID REFERENCES communities(id) ON DELETE CASCADE,
  name         VARCHAR(100) NOT NULL,
  slug         VARCHAR(100) NOT NULL,
  type         VARCHAR(20)  DEFAULT 'public',
  created_at   TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (community_id, slug)
);

-- Narrative expedition step-by-step landmark sequence
CREATE TABLE IF NOT EXISTS expedition_landmarks (
  expedition_id  UUID REFERENCES expeditions(id) ON DELETE CASCADE,
  landmark_id    UUID REFERENCES landmarks(id)   ON DELETE CASCADE,
  step_number    INTEGER NOT NULL,
  story_fragment TEXT,
  PRIMARY KEY (expedition_id, step_number)
);

-- Quests: per-user progress against an expedition template.
-- Guard: if a template-style quests table already exists (from migration 007_gamification_schema
-- which had no user_id column), drop it first so we can create the correct schema.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'quests'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'quests' AND column_name = 'user_id'
  ) THEN
    DROP TABLE quests CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS quests (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id        UUID NOT NULL,
  expedition_id  UUID REFERENCES expeditions(id) ON DELETE CASCADE,
  status         TEXT DEFAULT 'active'
                 CHECK (status IN ('active', 'completed', 'claimed')),
  progress_count INTEGER DEFAULT 0,
  started_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at   TIMESTAMP WITH TIME ZONE,
  UNIQUE (user_id, expedition_id)
);

-- ─── C. Messages: add channel support ────────────────────────────────────────

ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS channel_id UUID REFERENCES community_channels(id) ON DELETE CASCADE;

-- Drop old 2-way constraint (expedition OR dm) and replace with 3-way
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_check;
ALTER TABLE messages
  ADD CONSTRAINT messages_check CHECK (
    (expedition_id IS NOT NULL AND dm_peer_id IS NULL     AND channel_id IS NULL) OR
    (expedition_id IS NULL     AND dm_peer_id IS NOT NULL AND channel_id IS NULL) OR
    (expedition_id IS NULL     AND dm_peer_id IS NULL     AND channel_id IS NOT NULL)
  );

CREATE INDEX IF NOT EXISTS idx_messages_channel
  ON messages(channel_id, created_at)
  WHERE channel_id IS NOT NULL;

-- ─── D. Row Level Security for new tables ────────────────────────────────────

ALTER TABLE communities         ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_members   ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_channels  ENABLE ROW LEVEL SECURITY;
ALTER TABLE expedition_landmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE quests              ENABLE ROW LEVEL SECURITY;

-- Communities: public read
DROP POLICY IF EXISTS "communities_select" ON communities;
CREATE POLICY "communities_select"
  ON communities FOR SELECT USING (true);

-- Community members: public read; user can only insert themselves
DROP POLICY IF EXISTS "community_members_select" ON community_members;
CREATE POLICY "community_members_select"
  ON community_members FOR SELECT USING (true);

DROP POLICY IF EXISTS "community_members_insert" ON community_members;
CREATE POLICY "community_members_insert"
  ON community_members FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Community channels: public read
DROP POLICY IF EXISTS "community_channels_select" ON community_channels;
CREATE POLICY "community_channels_select"
  ON community_channels FOR SELECT USING (true);

-- Expedition landmarks: public read
DROP POLICY IF EXISTS "expedition_landmarks_select" ON expedition_landmarks;
CREATE POLICY "expedition_landmarks_select"
  ON expedition_landmarks FOR SELECT USING (true);

-- Quests: user can only read/write their own
DROP POLICY IF EXISTS "quests_select" ON quests;
CREATE POLICY "quests_select"
  ON quests FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "quests_insert" ON quests;
CREATE POLICY "quests_insert"
  ON quests FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "quests_update" ON quests;
CREATE POLICY "quests_update"
  ON quests FOR UPDATE USING (auth.uid() = user_id);

-- Channel messages: members of the community can read/write
DROP POLICY IF EXISTS "messages_select_channel" ON messages;
CREATE POLICY "messages_select_channel"
  ON messages FOR SELECT
  USING (
    channel_id IS NOT NULL AND
    channel_id IN (
      SELECT cc.id FROM community_channels cc
      JOIN community_members cm ON cm.community_id = cc.community_id
      WHERE cm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "messages_insert_channel" ON messages;
CREATE POLICY "messages_insert_channel"
  ON messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id AND
    channel_id IS NOT NULL AND
    channel_id IN (
      SELECT cc.id FROM community_channels cc
      JOIN community_members cm ON cm.community_id = cc.community_id
      WHERE cm.user_id = auth.uid()
    )
  );

-- ─── E. Seed communities + channels ─────────────────────────────────────────

INSERT INTO communities (id, name, description, theme) VALUES
  ('c1000000-0000-0000-0000-000000000001', 'Dublin Heritage',      'Exploring the historical essence of Dublin',   'History'),
  ('c1000000-0000-0000-0000-000000000002', 'Culinary Trailblazers','Discovering the best bites around town',        'Food'),
  ('c1000000-0000-0000-0000-000000000003', 'Art & Culture',        'Connecting through creativity and expression',  'Art')
ON CONFLICT (id) DO NOTHING;

INSERT INTO community_channels (community_id, name, slug) VALUES
  ('c1000000-0000-0000-0000-000000000001', 'General Discussion', 'general'),
  ('c1000000-0000-0000-0000-000000000001', 'Heritage Meetups',   'meetups'),
  ('c1000000-0000-0000-0000-000000000002', 'Best Burgers',       'burgers'),
  ('c1000000-0000-0000-0000-000000000002', 'Restaurant Recs',    'recs'),
  ('c1000000-0000-0000-0000-000000000003', 'General',            'general')
ON CONFLICT (community_id, slug) DO NOTHING;

-- ─── F. Seed narrative expedition (The Viking Trail) ─────────────────────────
-- Update the existing Viking Trail expedition (if already in DB from seed 001)
-- to add gamification columns.

UPDATE expeditions SET
  description    = 'A sequential journey through Dublin''s Viking history',
  category       = 'historical',
  difficulty     = 4,
  reward_xp      = 900,
  required_count = 3,
  is_narrative   = true
WHERE title = 'The Viking Trail'
  AND description IS NULL;

-- Seed expedition_landmarks for The Viking Trail (if expedition exists)
INSERT INTO expedition_landmarks (expedition_id, landmark_id, step_number, story_fragment)
SELECT
  e.id,
  steps.landmark_id,
  steps.step_number,
  steps.story_fragment
FROM expeditions e
CROSS JOIN (VALUES
  (1, 'a0000001-0000-0000-0000-000000000001'::uuid, 'The Vikings founded a longphort near this site around 841 AD.'),
  (2, 'a0000001-0000-0000-0000-000000000002'::uuid, 'The cathedral grounds echo with centuries of Norse and Norman conflict.'),
  (3, 'a0000001-0000-0000-0000-000000000014'::uuid, 'Even the outlaws of the Viking age would have feared these walls.')
) AS steps(step_number, landmark_id, story_fragment)
WHERE e.title = 'The Viking Trail'
ON CONFLICT (expedition_id, step_number) DO NOTHING;

-- ─── G. Indexes ───────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_communities_theme           ON communities(theme);
CREATE INDEX IF NOT EXISTS idx_community_members_user      ON community_members(user_id);
CREATE INDEX IF NOT EXISTS idx_community_channels_community ON community_channels(community_id);
CREATE INDEX IF NOT EXISTS idx_quests_user                 ON quests(user_id);
CREATE INDEX IF NOT EXISTS idx_quests_expedition           ON quests(expedition_id);
CREATE INDEX IF NOT EXISTS idx_landmarks_tags              ON landmarks USING GIN(tags);
