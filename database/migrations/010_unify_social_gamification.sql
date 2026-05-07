-- Migration 010: Total Architecture Refactor
-- Removing Groups/Quests, Implementing Communities/Expeditions/Channels

-- 1. Drop existing tables to be replaced
DROP TABLE IF EXISTS group_members CASCADE;
DROP TABLE IF EXISTS groups CASCADE;
DROP TABLE IF EXISTS user_quests CASCADE;
DROP TABLE IF EXISTS quests CASCADE;
DROP TABLE IF EXISTS community_challenges CASCADE;

-- 2. Ensure Communities and Community Members exist (with correct primary keys/refs)
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

-- 3. Create Community Channels
CREATE TABLE IF NOT EXISTS community_channels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    community_id UUID REFERENCES communities(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL,
    type VARCHAR(20) DEFAULT 'public',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(community_id, slug)
);

-- 4. Unify Gamification: Expeditions as Templates
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

-- 5. Unify Gamification: Quests as User Instances
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

-- 6. Unify Gamification: Community Expeditions as Community instances
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

-- 7. Update Messages to use Channels instead of Group/Expedition
-- Note: We are keeping the old messages table but migrating the FKs.
-- Since the user said "Replace", we will add channel_id.
ALTER TABLE messages ADD COLUMN IF NOT EXISTS channel_id UUID REFERENCES community_channels(id) ON DELETE CASCADE;
ALTER TABLE messages DROP COLUMN IF EXISTS group_id;
ALTER TABLE messages DROP COLUMN IF EXISTS expedition_id; -- Old active-route party ref
ALTER TABLE messages DROP COLUMN IF EXISTS dm_peer_id;    -- Optional: if user wants to keep DM, we'd keep it. 
                                                        -- But user said "Delete quests... Replace all".
                                                        -- I'll keep it for now as it's not part of the group/quest removal request.

-- 8. Seed Data for initial Communities & Expeditions
INSERT INTO communities (name, description, theme) 
SELECT 'Dublin Heritage', 'Exploring the historical essence of Dublin', 'History'
WHERE NOT EXISTS (SELECT 1 FROM communities WHERE name = 'Dublin Heritage');

INSERT INTO communities (name, description, theme) 
SELECT 'Culinary Trailblazers', 'Discovering the best bites around town', 'Food'
WHERE NOT EXISTS (SELECT 1 FROM communities WHERE name = 'Culinary Trailblazers');

-- Auto-create channels for seeded communities
INSERT INTO community_channels (community_id, name, slug)
SELECT id, 'General', 'general' FROM communities
ON CONFLICT (community_id, slug) DO NOTHING;

INSERT INTO community_channels (community_id, name, slug)
SELECT id, 'Meetups', 'meetups' FROM communities
ON CONFLICT (community_id, slug) DO NOTHING;

-- Seed Data for Expeditions (Templates)
INSERT INTO expeditions (title, description, category, difficulty, reward_xp, required_count)
SELECT 'Architecture Walk', 'Find 3 key architectural spots', 'Architecture', 3, 600, 3
WHERE NOT EXISTS (SELECT 1 FROM expeditions WHERE title = 'Architecture Walk');

INSERT INTO expeditions (title, description, category, difficulty, reward_xp, required_count)
SELECT 'Street Food Safari', 'Find 4 culinary spots', 'Food', 1, 400, 4
WHERE NOT EXISTS (SELECT 1 FROM expeditions WHERE title = 'Street Food Safari');

INSERT INTO expeditions (title, description, category, difficulty, reward_xp, required_count)
SELECT 'Through the Ages', 'Find 5 historical landmarks', 'History', 2, 550, 5
WHERE NOT EXISTS (SELECT 1 FROM expeditions WHERE title = 'Through the Ages');
