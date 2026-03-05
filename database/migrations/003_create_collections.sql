-- Migration: Create Collections Table
-- ===========================================

CREATE TABLE IF NOT EXISTS collections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  landmark_id UUID NOT NULL REFERENCES landmarks(id) ON DELETE CASCADE,
  visited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  dwell_time_min INT,
  rating INT CHECK (rating BETWEEN 1 AND 5),
  notes TEXT,
  UNIQUE(user_id, landmark_id)
);

CREATE INDEX IF NOT EXISTS idx_collections_user_id ON collections(user_id);
CREATE INDEX IF NOT EXISTS idx_collections_landmark_id ON collections(landmark_id);
