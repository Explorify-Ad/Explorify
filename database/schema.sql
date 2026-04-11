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
DROP TABLE IF EXISTS expedition_landmarks CASCADE;
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
    "walk_pace_samples": [],
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

-- ─── Seed Data (Unified & Enriched) ──────────────────────────────────────────

-- Communities
INSERT INTO communities (id, name, description, theme) VALUES 
('c1000000-0000-0000-0000-000000000001', 'Dublin Heritage', 'Exploring the historical essence of Dublin', 'History'),
('c1000000-0000-0000-0000-000000000002', 'Culinary Trailblazers', 'Discovering the best bites around town', 'Food')
ON CONFLICT (id) DO NOTHING;

INSERT INTO community_channels (community_id, name, slug) VALUES
('c1000000-0000-0000-0000-000000000001', 'General Discussion', 'general'),
('c1000000-0000-0000-0000-000000000001', 'Heritage Meetups', 'meetups'),
('c1000000-0000-0000-0000-000000000002', 'Best Burgers', 'burgers')
ON CONFLICT (community_id, slug) DO NOTHING;

-- Landmarks (Full Unified Set)
INSERT INTO landmarks (id, name, description, latitude, longitude, category, accessibility_level, is_indoor, points, avg_visit_duration_min, tier, tags) VALUES 
('a0000001-0000-0000-0000-000000000001', 'Trinity College Dublin', 'Founded 1592. Home to the Book of Kells and the Long Room library.', 53.3454, -6.2593, 'historical', 4, false, 10, 45, 'public', ARRAY['iconic', 'popular', 'morning-vibe']),
('a0000001-0000-0000-0000-000000000002', 'St. Patricks Cathedral', 'Irelands largest cathedral, founded in 1191.', 53.3391, -6.2706, 'historical', 5, true, 10, 30, 'public', ARRAY['landmark', 'shelter', 'historic']),
('a0000001-0000-0000-0000-000000000003', 'Phoenix Park', 'One of the largest enclosed urban parks in Europe.', 53.3572, -6.3264, 'nature', 5, false, 10, 60, 'public', ARRAY['outdoor', 'nature', 'popular']),
('a0000001-0000-0000-0000-000000000004', 'Hapenny Bridge', 'Iconic cast-iron pedestrian bridge over the Liffey.', 53.3466, -6.2625, 'landmark', 5, false, 10, 15, 'public', ARRAY['scenic', 'landmark', 'popular']),
('a0000001-0000-0000-0000-000000000005', 'Temple Bar', 'Dublins cultural quarter — cobblestone streets and pubs.', 53.3452, -6.2644, 'shopping', 5, false, 10, 45, 'public', ARRAY['food', 'popular', 'nightlife']),
('a0000001-0000-0000-0000-000000000006', 'Grafton Street', 'Pedestrianised premier shopping street.', 53.3403, -6.2590, 'shopping', 5, false, 10, 30, 'public', ARRAY['food', 'popular']),
('a0000001-0000-0000-0000-000000000007', 'Guinness Storehouse', 'Visitor experience inside the St. Jamess Gate Brewery.', 53.3418, -6.2868, 'cultural', 4, true, 15, 90, 'public', ARRAY['iconic', 'popular']),
('a0000001-0000-0000-0000-000000000008', 'Dublin Castle', 'Historic governement complex dating back to 1204.', 53.3430, -6.2673, 'historical', 4, false, 12, 40, 'public', ARRAY['landmark', 'historic']),
('a0000001-0000-0000-0000-000000000009', 'National Gallery of Ireland', 'Irelands national art collection.', 53.3411, -6.2524, 'cultural', 5, true, 20, 75, 'discovered', ARRAY['art', 'shelter']),
('a0000001-0000-0000-0000-000000000010', 'National Museum of Ireland', 'Celtic treasures and Bog Bodies.', 53.3402, -6.2537, 'historical', 5, true, 20, 60, 'discovered', ARRAY['historical', 'shelter']),
('a0000001-0000-0000-0000-000000000011', 'Merrion Square', 'Georgian architecture surrounding a public park.', 53.3391, -6.2484, 'architecture', 4, false, 18, 30, 'discovered', ARRAY['scenic', 'art', 'quiet']),
('a0000001-0000-0000-0000-000000000012', 'Howth Cliff Walk', 'Dramatic 6km coastal loop with views.', 53.3884, -6.0676, 'nature', 3, false, 22, 90, 'discovered', ARRAY['scenic', 'nature', 'outdoor']),
('a0000001-0000-0000-0000-000000000013', 'Custom House', 'Neoclassical masterpiece by James Gandon.', 53.3477, -6.2508, 'architecture', 4, false, 18, 20, 'discovered', ARRAY['architecture', 'scenic']),
('a0000001-0000-0000-0000-000000000014', 'Kilmainham Gaol', 'Victorian prison and site of the 1916 Rising executions.', 53.3417, -6.3101, 'historical', 3, true, 20, 60, 'discovered', ARRAY['iconic', 'shelter', 'morning-vibe']),
('a0000001-0000-0000-0000-000000000015', 'Chester Beatty Library', 'World-class collection of manuscripts.', 53.3432, -6.2678, 'cultural', 5, true, 35, 60, 'hidden', ARRAY['art', 'landmark', 'quiet', 'morning-vibe']),
('a0000001-0000-0000-0000-000000000016', 'Little Museum of Dublin', 'Story of Dublins 20th century.', 53.3396, -6.2560, 'cultural', 5, true, 30, 45, 'hidden', ARRAY['interactive', 'shelter']),
('a0000001-0000-0000-0000-000000000017', 'St. Michans Church Vaults', 'Underground vaults with mummified remains.', 53.3479, -6.2742, 'historical', 2, true, 40, 45, 'hidden', ARRAY['historic', 'mystery']),
('a0000001-0000-0000-0000-000000000018', 'Malahide Castle', '12th-century castle and gardens.', 53.4500, -6.1545, 'historical', 3, false, 45, 90, 'hidden', ARRAY['nature', 'historic']),
('a0000001-0000-0000-0000-000000000019', 'Dun Laoghaire Pier', 'Victorian granite pier.', 53.2937, -6.1326, 'landmark', 4, false, 28, 45, 'hidden', ARRAY['scenic', 'nature']),
('a0000001-0000-0000-0000-000000000020', 'Glasnevin Cemetery', 'Final resting place of Michael Collins.', 53.3659, -6.2705, 'historical', 3, false, 32, 60, 'hidden', ARRAY['historic', 'scenic'])
ON CONFLICT (id) DO NOTHING;

-- Seed Expedition
INSERT INTO expeditions (id, title, description, category, difficulty, reward_xp, required_count, landmark_id, landmark_name, landmark_lat, landmark_lon, categories, is_narrative) VALUES 
('e2000000-0000-0000-0000-000000000001', 'The Viking Trail', 'A sequential journey through Dublins Viking history', 'historical', 4, 900, 3, 'a0000001-0000-0000-0000-000000000001', 'Trinity College Dublin', 53.3454, -6.2593, ARRAY['history', 'architecture'], true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO expedition_landmarks (expedition_id, landmark_id, step_number, story_fragment) VALUES
('e2000000-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000001', 1, 'The vikings founded this site in 1030.'),
('e2000000-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000002', 2, 'The water here comes from the mountains where Vikings once roamed.'),
('e2000000-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000014', 3, 'Even the outlaws of the Viking age would have feared these cages.')
ON CONFLICT (expedition_id, step_number) DO NOTHING;
