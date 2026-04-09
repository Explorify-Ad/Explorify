-- Explorify Master Schema
-- Unified Communities, Expeditions, and Quests

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── Users ───────────────────────────────────────────────────────────────────
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

-- ─── Landmarks ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS landmarks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  category VARCHAR(50) NOT NULL,
  accessibility_level INT NOT NULL CHECK (accessibility_level BETWEEN 1 AND 5),
  is_indoor BOOLEAN DEFAULT false,
  description TEXT,
  image_url VARCHAR(500),
  points INT DEFAULT 10,
  avg_visit_duration_min INT DEFAULT 30,
  tier TEXT DEFAULT 'public',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ─── Communities ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS communities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  theme VARCHAR(50),
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS community_members (
  community_id UUID REFERENCES communities(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (community_id, user_id)
);

CREATE TABLE IF NOT EXISTS community_channels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  community_id UUID REFERENCES communities(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) NOT NULL,
  type VARCHAR(20) DEFAULT 'public',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(community_id, slug)
);

-- ─── Expeditions (Templates for discovery tasks) ──────────────────────────────
CREATE TABLE IF NOT EXISTS expeditions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(50),
  difficulty INTEGER DEFAULT 1,
  reward_xp INTEGER DEFAULT 500,
  required_count INTEGER DEFAULT 3,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ─── Quests (Active personal instances of expeditions) ────────────────────────
CREATE TABLE IF NOT EXISTS quests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  expedition_id UUID REFERENCES expeditions(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'claimed')),
  progress_count INTEGER DEFAULT 0,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(user_id, expedition_id)
);

-- ─── Community Expeditions (Collaborative milestones) ─────────────────────────
CREATE TABLE IF NOT EXISTS community_expeditions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  community_id UUID REFERENCES communities(id) ON DELETE CASCADE,
  expedition_id UUID REFERENCES expeditions(id) ON DELETE CASCADE,
  goal_count INTEGER NOT NULL,
  current_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(community_id, expedition_id)
);

-- ─── Messages ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  channel_id UUID REFERENCES community_channels(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES users(id),
  sender_name TEXT,
  content TEXT NOT NULL,
  type TEXT DEFAULT 'text',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ─── Seed Data ───────────────────────────────────────────────────────────────
INSERT INTO communities (name, description, theme) VALUES 
('Dublin Heritage', 'Exploring the historical essence of Dublin', 'History'),
('Culinary Trailblazers', 'Discovering the best bites around town', 'Food')
ON CONFLICT DO NOTHING;

INSERT INTO expeditions (title, description, category, difficulty, reward_xp, required_count) VALUES 
('Architecture Walk', 'Find 3 key architectural spots', 'Architecture', 3, 600, 3),
('Street Food Safari', 'Find 4 culinary spots', 'Food', 1, 400, 4),
('Through the Ages', 'Find 5 historical landmarks', 'History', 2, 550, 5)
ON CONFLICT DO NOTHING;
