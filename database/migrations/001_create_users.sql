-- Migration: Create Users Table
-- ===========================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  display_name VARCHAR(100),
  preferences JSONB DEFAULT '{
    "pace": "moderate",
    "max_distance_km": 5,
    "preferred_categories": [],
    "indoor_preference": "both"
  }'::jsonb,
  accessibility_needs INT DEFAULT 0 CHECK (accessibility_needs BETWEEN 0 AND 5),
  total_points INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
