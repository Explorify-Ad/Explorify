-- Migration 008: Group Messaging Schema
-- Add group_id to the messages table and update the constraints to allow group messaging

ALTER TABLE messages 
  ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES groups(id) ON DELETE CASCADE;

-- Drop the old constraint that only allowed expedition or DM
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_check;

-- Add the new constraint that requires exactly one of: expedition_id, dm_peer_id, or group_id
ALTER TABLE messages
  ADD CONSTRAINT messages_check CHECK (
    (expedition_id IS NOT NULL AND dm_peer_id IS NULL AND group_id IS NULL) OR
    (expedition_id IS NULL AND dm_peer_id IS NOT NULL AND group_id IS NULL) OR
    (expedition_id IS NULL AND dm_peer_id IS NULL AND group_id IS NOT NULL)
  );

-- Index for group messages
CREATE INDEX IF NOT EXISTS idx_messages_group ON messages(group_id, created_at);

-- RLS Policy for Group Messages
DROP POLICY IF EXISTS "messages_select_group" ON messages;
CREATE POLICY "messages_select_group"
  ON messages FOR SELECT
  USING (
    group_id IS NOT NULL AND
    group_id IN (
      SELECT group_id FROM group_members WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "messages_insert_group" ON messages;
CREATE POLICY "messages_insert_group"
  ON messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id AND
    group_id IS NOT NULL AND
    group_id IN (
      SELECT group_id FROM group_members WHERE user_id = auth.uid()
    )
  );
