-- Migration 007: Gamification & Community Schema

-- Communities Table
CREATE TABLE IF NOT EXISTS communities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    quest_type VARCHAR(20) DEFAULT 'personal', -- personal, community
    required_count INTEGER DEFAULT 3,
    required_themes JSONB, -- ['Art', 'Nature', 'History']
    reward_xp INTEGER DEFAULT 500,
    reward_landmark_id UUID REFERENCES landmarks(id), -- Hidden spot unlock
    community_id UUID REFERENCES communities(id), -- If community quest
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- User Quest Progress
CREATE TABLE IF NOT EXISTS user_quests (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    quest_id UUID REFERENCES quests(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'active', -- active, completed, rewarded
    collected_themes JSONB DEFAULT '[]',
    progress_count INTEGER DEFAULT 0,
    unlocked_at TIMESTAMP WITH TIME ZONE,
    PRIMARY KEY (user_id, quest_id)
);

-- Community Challenges (Aggregation of member activity)
CREATE TABLE IF NOT EXISTS community_challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    badge_type VARCHAR(50) NOT NULL, -- 'First Steps', 'Theme Master', 'Community Hero'
    awarded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB -- { quest_id, community_id, etc. }
);
