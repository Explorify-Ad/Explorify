-- ===========================================
-- Explorify Database Schema
-- ===========================================
-- PostgreSQL schema for the Explorify platform

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ===========================================
-- Users Table
-- ===========================================
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

-- ===========================================
-- Landmarks Table
-- ===========================================
CREATE TABLE IF NOT EXISTS landmarks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  category VARCHAR(50) NOT NULL CHECK (category IN ('historical', 'cultural', 'nature', 'shopping', 'sports', 'architecture', 'landmark')),
  accessibility_level INT NOT NULL CHECK (accessibility_level BETWEEN 1 AND 5),
  is_indoor BOOLEAN DEFAULT false,
  description TEXT,
  image_url VARCHAR(500),
  points INT DEFAULT 10,
  avg_visit_duration_min INT DEFAULT 30,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===========================================
-- Collections Table (User visited landmarks)
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

-- ===========================================
-- Routes Table
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

-- ===========================================
-- Indexes
-- ===========================================
CREATE INDEX idx_landmarks_category ON landmarks(category);
CREATE INDEX idx_landmarks_accessibility ON landmarks(accessibility_level);
CREATE INDEX idx_landmarks_location ON landmarks(latitude, longitude);
CREATE INDEX idx_collections_user_id ON collections(user_id);
CREATE INDEX idx_collections_landmark_id ON collections(landmark_id);
CREATE INDEX idx_routes_user_id ON routes(user_id);
CREATE INDEX idx_users_email ON users(email);

-- ===========================================
-- Updated_at trigger function
-- ===========================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
