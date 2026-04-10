-- Explorify Unified Schema
-- Compatible with Supabase (PostgreSQL)
-- Unified Communities, Expeditions, and Quests

-- ─── Cleanup (Drop and Create) ────────────────────────────────────────────────
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'community_expeditions' AND relkind = 'r') THEN
        DROP TABLE community_expeditions CASCADE;
    ELSIF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'community_expeditions' AND relkind = 'v') THEN
        DROP VIEW community_expeditions CASCADE;
    END IF;
END $$;

DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS user_badges CASCADE;
DROP TABLE IF EXISTS community_challenges CASCADE;
DROP TABLE IF EXISTS user_quests CASCADE;
DROP TABLE IF EXISTS quests CASCADE;
DROP TABLE IF EXISTS expedition_members CASCADE;
DROP TABLE IF EXISTS expeditions CASCADE;
DROP TABLE IF EXISTS community_channels CASCADE;
DROP TABLE IF EXISTS community_members CASCADE;
DROP TABLE IF EXISTS communities CASCADE;
DROP TABLE IF EXISTS collections CASCADE;
DROP TABLE IF EXISTS landmarks CASCADE;
DROP TABLE IF EXISTS user_profiles CASCADE;
DROP TABLE IF EXISTS users CASCADE;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── Users & Profiles ────────────────────────────────────────────────────────
-- Backend user table (extends auth.users)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY, -- Maps to auth.users.id
  email VARCHAR(255) UNIQUE,
  display_name VARCHAR(100),
  preferences JSONB DEFAULT '{
    "walking_speed_kmh": 4.5,
    "max_distance_km": 5,
    "preferred_categories": [],
    "category_dwell_multipliers": {},
    "visitor_type": "tourist",
    "group_context": "solo"
  }'::jsonb,
  accessibility_needs INT DEFAULT 0,
  total_points INT DEFAULT 0,
  detail_level TEXT DEFAULT 'overview',
  language_pref TEXT DEFAULT 'en',
  onboarding_group_context TEXT DEFAULT 'solo',
  drift_detected_at TIMESTAMP WITH TIME ZONE,
  drift_from_category TEXT,
  drift_to_category TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Mobile-specific profile table
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY, -- Maps to auth.users(id)
  display_name TEXT,
  interests TEXT[],
  visitor_type TEXT DEFAULT 'tourist',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ─── Landmarks & Collections ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS landmarks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  category VARCHAR(50) NOT NULL,
  accessibility_level INT DEFAULT 1,
  is_indoor BOOLEAN DEFAULT false,
  description TEXT,
  image_url VARCHAR(500),
  points INT DEFAULT 10,
  avg_visit_duration_min INT DEFAULT 30,
  tier TEXT DEFAULT 'public',
  tags TEXT[] DEFAULT '{}', -- Fuels Feature 13 Adaptive Scoring
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Check-in history and behavioral feedback
CREATE TABLE IF NOT EXISTS collections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  landmark_id UUID REFERENCES landmarks(id) ON DELETE SET NULL,
  landmark_name TEXT,
  landmark_lat DECIMAL(10, 8),
  landmark_lon DECIMAL(11, 8),
  landmark_category TEXT,
  landmark_tier TEXT,
  xp_earned INT DEFAULT 0,
  dwell_time_min INT DEFAULT 0,
  rating INT,
  notes TEXT,
  context JSONB DEFAULT '{}'::jsonb,
  visited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  checked_in_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, landmark_id)
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
  user_id UUID NOT NULL, 
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

-- ─── Expeditions & Quests ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS expeditions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(50),
  difficulty INTEGER DEFAULT 1,
  reward_xp INTEGER DEFAULT 500,
  required_count INTEGER DEFAULT 3,
  
  -- Adaptive columns for mobile
  created_by UUID,
  creator_name TEXT,
  landmark_id UUID,
  landmark_name TEXT,
  landmark_lat DECIMAL(10, 8),
  landmark_lon DECIMAL(11, 8),
  categories TEXT[],
  group_size INTEGER DEFAULT 4,
  duration TEXT DEFAULT '2hr',
  dna_only BOOLEAN DEFAULT true,
  is_narrative BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'active',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS expedition_members (
  expedition_id UUID REFERENCES expeditions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  user_name TEXT,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (expedition_id, user_id)
);

CREATE TABLE IF NOT EXISTS quests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  expedition_id UUID REFERENCES expeditions(id) ON DELETE CASCADE,
  progress_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active', -- active, completed, claimed
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, expedition_id)
);

CREATE TABLE IF NOT EXISTS expedition_landmarks (
  expedition_id UUID REFERENCES expeditions(id) ON DELETE CASCADE,
  landmark_id UUID REFERENCES landmarks(id) ON DELETE CASCADE,
  step_number INTEGER NOT NULL,
  story_fragment TEXT,
  PRIMARY KEY (expedition_id, step_number)
);

-- ─── Messages ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  channel_id UUID REFERENCES community_channels(id) ON DELETE CASCADE,
  expedition_id UUID REFERENCES expeditions(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  sender_name TEXT,
  dm_peer_id UUID, 
  content TEXT NOT NULL,
  type TEXT DEFAULT 'text',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ─── Row Level Security (RLS) ───────────────────────────────────────────────
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE landmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE communities ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE expeditions ENABLE ROW LEVEL SECURITY;
ALTER TABLE expedition_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Unified policies for ease of development (Allow all reads, allow authenticated writes)
CREATE POLICY "Enable read for all" ON landmarks FOR SELECT USING (true);
CREATE POLICY "Enable read for all communities" ON communities FOR SELECT USING (true);
CREATE POLICY "Enable read for all channels" ON community_channels FOR SELECT USING (true);
CREATE POLICY "Enable read for all profile" ON user_profiles FOR SELECT USING (true);
CREATE POLICY "Enable read for all members" ON expedition_members FOR SELECT USING (true);
CREATE POLICY "Enable read for all messages" ON messages FOR SELECT USING (true);

-- Allow profile updates
CREATE POLICY "Enable update for users" ON user_profiles FOR ALL USING (true);
CREATE POLICY "Enable insert for messages" ON messages FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable insert for collections" ON collections FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable read for collections" ON collections FOR SELECT USING (true);
CREATE POLICY "Enable join expedition" ON expedition_members FOR INSERT WITH CHECK (true);

-- ─── Seed Data (Dublin Enrichment) ──────────────────────────────────────────

-- Communities
INSERT INTO communities (id, name, description, theme) VALUES 
('c1000000-0000-0000-0000-000000000001', 'Dublin Heritage', 'Exploring the historical essence of Dublin', 'History'),
('c1000000-0000-0000-0000-000000000002', 'Culinary Trailblazers', 'Discovering the best bites around town', 'Food')
ON CONFLICT DO NOTHING;

INSERT INTO community_channels (community_id, name, slug) VALUES
('c1000000-0000-0000-0000-000000000001', 'General Discussion', 'general'),
('c1000000-0000-0000-0000-000000000001', 'Heritage Meetups', 'meetups'),
('c1000000-0000-0000-0000-000000000002', 'Best Burgers', 'burgers')
ON CONFLICT DO NOTHING;

-- Landmarks (Rich Tags for Adaptivity)
INSERT INTO landmarks (name, latitude, longitude, category, points, tier, is_indoor, accessibility_level, tags, description) VALUES 
('Kilmainham Gaol', 53.3421, -6.3101, 'historical', 25, 'discovered', true, 3, ARRAY['iconic', 'popular', 'shelter', 'morning-vibe'], 'Former prison now a major museum and historic site.'),
('Royal Hospital Kilmainham', 53.3431, -6.3000, 'architecture', 20, 'discovered', true, 4, ARRAY['landmark', 'scenic', 'art', 'accessible'], '17th-century building, now home to IMMA.'),
('Phoenix Park Gate', 53.3485, -6.3050, 'nature', 10, 'public', false, 5, ARRAY['outdoor', 'accessible', 'nature', 'popular'], 'Entry point to one of the largest walled city parks in Europe.'),
('War Memorial Gardens', 53.3475, -6.3200, 'historical', 15, 'public', false, 4, ARRAY['scenic', 'quiet', 'off-the-beaten-path', 'morning-vibe'], 'Lutyens-designed sunken gardens dedicated to soldiers.'),
('Union 8', 53.3385, -6.3032, 'shopping', 10, 'public', true, 5, ARRAY['food', 'popular', 'interactive', 'fun'], 'Modern neighborhood bistro serving global fare.'),
('IMMA', 53.3435, -6.3005, 'cultural', 20, 'discovered', true, 4, ARRAY['art', 'landmark', 'shelter', 'midday-shelter'], 'Irelands leading national institution for modern art.'),
('The Patriot Inn', 53.3420, -6.3115, 'shopping', 15, 'public', true, 2, ARRAY['nightlife', 'off-the-beaten-path', 'historic'], 'Historic pub near the gaol with great atmosphere.'),
('St. Judes Church', 53.3395, -6.3150, 'architecture', 15, 'public', true, 3, ARRAY['architecture', 'quiet', 'shelter', 'enclosed'], 'Victorian church with notable stone carvings.'),
('Islandbridge Weir', 53.3465, -6.3120, 'nature', 10, 'public', false, 2, ARRAY['scenic', 'river', 'nature', 'golden-hour'], 'Scenic spot along the River Liffey.'),
('Magpie Inn', 53.3400, -6.3120, 'shopping', 15, 'public', true, 3, ARRAY['food', 'nightlife', 'local-favourite'], 'Cozy craft beer and gastro pub.'),
('Guinness Storehouse', 53.3418, -6.2867, 'historical', 35, 'discovered', true, 4, ARRAY['iconic', 'popular', 'landmark', 'must-see'], 'Irelands most visited tourist attraction.'),
('Christ Church Cathedral', 53.3435, -6.2710, 'architecture', 25, 'discovered', true, 3, ARRAY['iconic', 'landmark', 'historic', 'morning-vibe'], 'Dublins oldest building, a spiritual heart of the city.'),
('Teeling Distillery', 53.3375, -6.2766, 'shopping', 20, 'public', true, 4, ARRAY['food', 'interactive', 'popular'], 'The first new distillery in Dublin in over 125 years.');

-- Expeditions
INSERT INTO expeditions (title, description, category, difficulty, reward_xp, required_count) VALUES 
('Architecture Walk', 'Find 3 key architectural spots', 'architecture', 3, 600, 3),
('Through the Ages', 'Find 5 historical landmarks', 'historical', 2, 550, 5)
ON CONFLICT DO NOTHING;

-- Seed Narrative Quest (The Viking Trail)
INSERT INTO expeditions (id, title, description, category, difficulty, reward_xp, required_count, is_narrative) VALUES 
('e2000000-0000-0000-0000-000000000001', 'The Viking Trail', 'A sequential journey through Dublins Viking history', 'historical', 4, 900, 3, true)
ON CONFLICT DO NOTHING;

-- Map landmarks to The Viking Trail
-- 1. Christ Church Cathedral
-- 2. Guinness Storehouse (part of the narrative loop for this test)
-- 3. Dublin Castle (assuming it exists or I'll use another)
INSERT INTO expedition_landmarks (expedition_id, landmark_id, step_number, story_fragment) VALUES
('e2000000-0000-0000-0000-000000000001', (SELECT id FROM landmarks WHERE name = 'Christ Church Cathedral' LIMIT 1), 1, 'The vikings founded this site in 1030. They built a wooden church here, long before the stone cathedral you see today.'),
('e2000000-0000-0000-0000-000000000001', (SELECT id FROM landmarks WHERE name = 'Guinness Storehouse' LIMIT 1), 2, 'The water for the black stuff comes from the mountains where the Vikings once roamed.'),
('e2000000-0000-0000-0000-000000000001', (SELECT id FROM landmarks WHERE name = 'Kilmainham Gaol' LIMIT 1), 3, 'Even the outlaws of the Viking age would have feared the cages of Dublin.')
ON CONFLICT DO NOTHING;
