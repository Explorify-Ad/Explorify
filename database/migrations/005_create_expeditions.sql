-- ===========================================
-- Migration 005: Expeditions & Messaging
-- ===========================================

-- ─── expeditions ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS expeditions (
  id             UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  title          TEXT        NOT NULL,
  created_by     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  creator_name   TEXT        NOT NULL,
  -- optional landmark anchor
  landmark_id    UUID,
  landmark_name  TEXT,
  landmark_lat   DECIMAL(10, 8),
  landmark_lon   DECIMAL(11, 8),
  -- config
  categories     TEXT[]      NOT NULL DEFAULT '{}',
  group_size     INT         NOT NULL DEFAULT 4 CHECK (group_size BETWEEN 2 AND 12),
  duration       TEXT        NOT NULL DEFAULT '2hr',
  dna_only       BOOLEAN     NOT NULL DEFAULT true,
  status         TEXT        NOT NULL DEFAULT 'active'
                             CHECK (status IN ('active', 'completed', 'cancelled')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expeditions_created_by ON expeditions(created_by);
CREATE INDEX IF NOT EXISTS idx_expeditions_status     ON expeditions(status);
-- Spatial index for nearby-expedition queries
CREATE INDEX IF NOT EXISTS idx_expeditions_location
  ON expeditions(landmark_lat, landmark_lon)
  WHERE landmark_lat IS NOT NULL;

-- ─── expedition_members ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS expedition_members (
  id             UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  expedition_id  UUID        NOT NULL REFERENCES expeditions(id) ON DELETE CASCADE,
  user_id        UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name      TEXT        NOT NULL,
  joined_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (expedition_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_exp_members_expedition ON expedition_members(expedition_id);
CREATE INDEX IF NOT EXISTS idx_exp_members_user       ON expedition_members(user_id);

-- ─── messages ─────────────────────────────────────────────────────────────────
-- Covers both expedition group chat (expedition_id IS NOT NULL)
-- and direct messages (expedition_id IS NULL, dm_peer_id IS NOT NULL).
CREATE TABLE IF NOT EXISTS messages (
  id             UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  expedition_id  UUID        REFERENCES expeditions(id) ON DELETE CASCADE,
  dm_peer_id     UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  sender_id      UUID        NOT NULL REFERENCES auth.users(id),
  sender_name    TEXT        NOT NULL,
  content        TEXT        NOT NULL,
  -- 'text' | 'check_in' | 'system' | 'vote'
  type           TEXT        NOT NULL DEFAULT 'text'
                             CHECK (type IN ('text', 'check_in', 'system', 'vote')),
  -- extra structured data (landmark card, vote options, etc.)
  metadata       JSONB       NOT NULL DEFAULT '{}',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (
    (expedition_id IS NOT NULL AND dm_peer_id IS NULL) OR
    (expedition_id IS NULL     AND dm_peer_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_messages_expedition ON messages(expedition_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_dm
  ON messages(sender_id, dm_peer_id, created_at)
  WHERE dm_peer_id IS NOT NULL;

-- Enable Realtime for live chat
ALTER TABLE messages REPLICA IDENTITY FULL;

-- ─── updated_at trigger for expeditions ──────────────────────────────────────
DROP TRIGGER IF EXISTS update_expeditions_updated_at ON expeditions;
CREATE TRIGGER update_expeditions_updated_at
  BEFORE UPDATE ON expeditions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===========================================
-- Row Level Security
-- ===========================================

-- expeditions: anyone can read active ones; only creator can modify
ALTER TABLE expeditions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "expeditions_select" ON expeditions;
CREATE POLICY "expeditions_select"
  ON expeditions FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "expeditions_insert" ON expeditions;
CREATE POLICY "expeditions_insert"
  ON expeditions FOR INSERT
  WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "expeditions_update" ON expeditions;
CREATE POLICY "expeditions_update"
  ON expeditions FOR UPDATE
  USING (auth.uid() = created_by);

DROP POLICY IF EXISTS "expeditions_delete" ON expeditions;
CREATE POLICY "expeditions_delete"
  ON expeditions FOR DELETE
  USING (auth.uid() = created_by);

-- expedition_members: anyone can read; users can only join as themselves
ALTER TABLE expedition_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "members_select" ON expedition_members;
CREATE POLICY "members_select"
  ON expedition_members FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "members_insert" ON expedition_members;
CREATE POLICY "members_insert"
  ON expedition_members FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "members_delete" ON expedition_members;
CREATE POLICY "members_delete"
  ON expedition_members FOR DELETE
  USING (auth.uid() = user_id);

-- messages: only members of the expedition (or parties to a DM) can read/write
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "messages_select_expedition" ON messages;
CREATE POLICY "messages_select_expedition"
  ON messages FOR SELECT
  USING (
    expedition_id IS NOT NULL AND
    expedition_id IN (
      SELECT expedition_id FROM expedition_members WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "messages_select_dm" ON messages;
CREATE POLICY "messages_select_dm"
  ON messages FOR SELECT
  USING (
    dm_peer_id IS NOT NULL AND
    (sender_id = auth.uid() OR dm_peer_id = auth.uid())
  );

DROP POLICY IF EXISTS "messages_insert_expedition" ON messages;
CREATE POLICY "messages_insert_expedition"
  ON messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id AND
    expedition_id IS NOT NULL AND
    expedition_id IN (
      SELECT expedition_id FROM expedition_members WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "messages_insert_dm" ON messages;
CREATE POLICY "messages_insert_dm"
  ON messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id AND
    dm_peer_id IS NOT NULL
  );
