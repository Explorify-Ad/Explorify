-- Migration: Create Routes Table
-- ===========================================

CREATE TABLE IF NOT EXISTS routes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255),
  landmarks JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_distance_km DECIMAL(6, 2),
  estimated_duration_min INT,
  is_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_routes_user_id ON routes(user_id);
