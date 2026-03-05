-- Migration: Create Landmarks Table
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

CREATE INDEX IF NOT EXISTS idx_landmarks_category ON landmarks(category);
CREATE INDEX IF NOT EXISTS idx_landmarks_accessibility ON landmarks(accessibility_level);
CREATE INDEX IF NOT EXISTS idx_landmarks_location ON landmarks(latitude, longitude);
