-- Migration 007: Gamification & Community Schema

-- Communities Table
CREATE TABLE IF NOT EXISTS communities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    theme VARCHAR(50), -- Architecture, Food, Nature, etc.
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Community Membership
CREATE TABLE IF NOT EXISTS community_members (
    community_id UUID REFERENCES communities(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (community_id, user_id)
);

-- Quests Table
CREATE TABLE IF NOT EXISTS quests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50), -- Art, Nature, History, etc.
    difficulty INTEGER DEFAULT 1,
    quest_type VARCHAR(20) DEFAULT 'personal', -- personal, community
    required_count INTEGER DEFAULT 3,
    reward_xp INTEGER DEFAULT 500,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- User Quest Progress
CREATE TABLE IF NOT EXISTS user_quests (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    quest_id UUID REFERENCES quests(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'active', -- active, completed, rewarded
    progress_count INTEGER DEFAULT 0,
    unlocked_at TIMESTAMP WITH TIME ZONE,
    PRIMARY KEY (user_id, quest_id)
);

-- Community Challenges (Aggregation of member activity)
CREATE TABLE IF NOT EXISTS community_challenges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    community_id UUID REFERENCES communities(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    goal_count INTEGER NOT NULL,
    current_count INTEGER DEFAULT 0,
    start_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    end_date TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true
);

-- User Badges / Stamps
CREATE TABLE IF NOT EXISTS user_badges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    badge_type VARCHAR(50) NOT NULL, -- 'First Steps', 'Theme Master', 'Community Hero'
    awarded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB -- { quest_id, community_id, etc. }
);

-- Seed Data for Communities
INSERT INTO communities (name, description, theme) 
SELECT 'Dublin Heritage', 'Exploring the historical essence of Dublin', 'History'
WHERE NOT EXISTS (SELECT 1 FROM communities WHERE name = 'Dublin Heritage');

INSERT INTO communities (name, description, theme) 
SELECT 'Culinary Trailblazers', 'Discovering the best bites around town', 'Food'
WHERE NOT EXISTS (SELECT 1 FROM communities WHERE name = 'Culinary Trailblazers');

-- Seed Data for Quests
INSERT INTO quests (title, description, category, difficulty, reward_xp, required_count)
SELECT 'Architecture Walk', 'Find 3 key architectural spots', 'Architecture', 3, 600, 3
WHERE NOT EXISTS (SELECT 1 FROM quests WHERE title = 'Architecture Walk');

INSERT INTO quests (title, description, category, difficulty, reward_xp, required_count)
SELECT 'Street Food Safari', 'Find 4 culinary spots', 'Food', 1, 400, 4
WHERE NOT EXISTS (SELECT 1 FROM quests WHERE title = 'Street Food Safari');

INSERT INTO quests (title, description, category, difficulty, reward_xp, required_count)
SELECT 'Through the Ages', 'Find 5 historical landmarks', 'History', 2, 550, 5
WHERE NOT EXISTS (SELECT 1 FROM quests WHERE title = 'Through the Ages');
