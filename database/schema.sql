-- Island Empire Game Database Schema
-- PostgreSQL

-- Users Table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    level INTEGER DEFAULT 1,
    experience INTEGER DEFAULT 0,
    league VARCHAR(20) DEFAULT 'Ticaret' CHECK (league IN ('Ticaret', 'Üretim', 'Korsan')),
    total_points INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    is_bot BOOLEAN DEFAULT FALSE,
    auto_production_until TIMESTAMP,
    last_seen_attacks_at TIMESTAMP,
    shield_until TIMESTAMP
);

-- Islands Table
CREATE TABLE islands (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'main', 'farm', 'mine', 'wind', 'port'
    specialty VARCHAR(100), -- 'Tarım +30%', 'Kaynak +40%', etc.
    level INTEGER DEFAULT 1,
    position_x FLOAT,
    position_y FLOAT,
    is_discovered BOOLEAN DEFAULT FALSE,
    discovered_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Buildings Table
CREATE TABLE buildings (
    id SERIAL PRIMARY KEY,
    island_id INTEGER REFERENCES islands(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- 'farm', 'mill', 'bakery', 'port', 'warehouse', etc.
    name VARCHAR(100) NOT NULL,
    level INTEGER DEFAULT 1,
    production_rate FLOAT DEFAULT 0, -- per hour
    production_type VARCHAR(50), -- 'wheat', 'flour', 'bread', 'wood', etc.
    status VARCHAR(20) DEFAULT 'idle', -- 'idle', 'producing', 'upgrading'
    last_collection TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    upgrade_started_at TIMESTAMP,
    upgrade_completes_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Resources Table
CREATE TABLE resources (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    resource_type VARCHAR(50) NOT NULL, -- 'gold', 'wood', 'food', 'energy'
    amount FLOAT DEFAULT 0,
    capacity FLOAT DEFAULT 1000,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, resource_type)
);

-- Productions Table (tracks active production cycles)
CREATE TABLE productions (
    id SERIAL PRIMARY KEY,
    building_id INTEGER REFERENCES buildings(id) ON DELETE CASCADE,
    product_type VARCHAR(50) NOT NULL,
    quantity FLOAT NOT NULL,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completes_at TIMESTAMP NOT NULL,
    collected BOOLEAN DEFAULT FALSE
);

-- Convoys Table
CREATE TABLE convoys (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    from_island_id INTEGER REFERENCES islands(id) ON DELETE CASCADE,
    to_island_id INTEGER REFERENCES islands(id) ON DELETE CASCADE,
    cargo JSONB NOT NULL, -- {resource_type: amount}
    progress FLOAT DEFAULT 0, -- 0-100
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    arrives_at TIMESTAMP NOT NULL,
    status VARCHAR(20) DEFAULT 'traveling' -- 'traveling', 'arrived', 'attacked'
);

-- Tasks Table (daily quests, missions)
CREATE TABLE tasks (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    target INTEGER DEFAULT 1,
    progress FLOAT DEFAULT 0,
    reward_gold INTEGER DEFAULT 0,
    reward_experience INTEGER DEFAULT 0,
    completed BOOLEAN DEFAULT FALSE,
    claimed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP,
    claimed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- League Rankings Table
CREATE TABLE league_rankings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    season INTEGER NOT NULL,
    league VARCHAR(20) NOT NULL,
    rank INTEGER,
    points INTEGER DEFAULT 0,
    development_points INTEGER DEFAULT 0,
    economy_points INTEGER DEFAULT 0,
    influence_points INTEGER DEFAULT 0,
    conflict_points INTEGER DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, season)
);

-- PvP Actions Table (legacy)
CREATE TABLE pvp_actions (
    id SERIAL PRIMARY KEY,
    attacker_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    defender_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    action_type VARCHAR(20) NOT NULL, -- 'raid', 'sabotage', 'exploration'
    target_island_id INTEGER REFERENCES islands(id),
    result VARCHAR(20), -- 'success', 'failed', 'defended'
    loot JSONB, -- {resource: amount}
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- PvP Attacks Table (daily limit tracking)
CREATE TABLE pvp_attacks (
    id SERIAL PRIMARY KEY,
    attacker_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    defender_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    attack_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User Shields Table (protection periods)
CREATE TABLE user_shields (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    shield_type VARCHAR(50) NOT NULL, -- 'newbie', 'post_defense', 'purchased'
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Marketplace Transactions Table
CREATE TABLE marketplace_transactions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    transaction_type VARCHAR(20) NOT NULL, -- 'buy', 'sell'
    resource_type VARCHAR(50) NOT NULL,
    amount FLOAT NOT NULL,
    price FLOAT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Password Resets Table
CREATE TABLE password_resets (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Daily Rewards Table
CREATE TABLE daily_rewards (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    day_number INTEGER NOT NULL,
    reward_gold INTEGER DEFAULT 0,
    reward_wood INTEGER DEFAULT 0,
    claimed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Armies Table
CREATE TABLE armies (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    archer_count INTEGER DEFAULT 0,
    infantry_count INTEGER DEFAULT 0,
    cavalry_count INTEGER DEFAULT 0,
    total_power INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Pirates Table
CREATE TABLE pirates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    power INTEGER NOT NULL,
    reward_gold INTEGER DEFAULT 0,
    reward_wood INTEGER DEFAULT 0,
    reward_food INTEGER DEFAULT 0,
    reward_xp INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Battles Table
CREATE TABLE battles (
    id SERIAL PRIMARY KEY,
    attacker_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    defender_id INTEGER REFERENCES users(id),
    pirate_id INTEGER,
    battle_type VARCHAR(20) NOT NULL DEFAULT 'pvp', -- 'pvp', 'pirate'
    attacker_power INTEGER DEFAULT 0,
    defender_power INTEGER DEFAULT 0,
    winner VARCHAR(20),
    reward_gold INTEGER DEFAULT 0,
    reward_wood INTEGER DEFAULT 0,
    reward_food INTEGER DEFAULT 0,
    reward_xp INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Friendships Table
CREATE TABLE friendships (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    friend_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, friend_id)
);

-- Friend Requests Table
CREATE TABLE friend_requests (
    id SERIAL PRIMARY KEY,
    sender_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    receiver_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'accepted', 'rejected'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(sender_id, receiver_id)
);

-- Resource Gifts Table
CREATE TABLE resource_gifts (
    id SERIAL PRIMARY KEY,
    sender_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    receiver_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    resource_type VARCHAR(50) NOT NULL,
    amount FLOAT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Guilds Table
CREATE TABLE guilds (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    leader_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    level INTEGER DEFAULT 1,
    max_members INTEGER DEFAULT 20,
    member_limit INTEGER DEFAULT 20,
    total_points INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Guild Members Table
CREATE TABLE guild_members (
    id SERIAL PRIMARY KEY,
    guild_id INTEGER REFERENCES guilds(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    role VARCHAR(20) DEFAULT 'member', -- 'leader', 'officer', 'member'
    contribution_points INTEGER DEFAULT 0,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Guild Storage Table
CREATE TABLE guild_storage (
    id SERIAL PRIMARY KEY,
    guild_id INTEGER REFERENCES guilds(id) ON DELETE CASCADE,
    resource_type VARCHAR(50) NOT NULL,
    amount FLOAT DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Guild Applications Table
CREATE TABLE guild_applications (
    id SERIAL PRIMARY KEY,
    guild_id INTEGER REFERENCES guilds(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    message TEXT,
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'accepted', 'rejected'
    responded_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Guild Chat Table
CREATE TABLE guild_chat (
    id SERIAL PRIMARY KEY,
    guild_id INTEGER REFERENCES guilds(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Guild Donations Table
CREATE TABLE guild_donations (
    id SERIAL PRIMARY KEY,
    guild_id INTEGER REFERENCES guilds(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    resource_type VARCHAR(50) NOT NULL,
    amount FLOAT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Default Pirates Data
INSERT INTO pirates (name, power, reward_gold, reward_wood, reward_food, reward_xp) VALUES
    ('Küçük Korsan', 10, 100, 50, 30, 20),
    ('Deniz Haydutları', 25, 200, 100, 60, 40),
    ('Korsan Gemisi', 50, 400, 200, 120, 80),
    ('Büyük Korsan Filosu', 100, 800, 400, 250, 150),
    ('Efsanevi Kaptan', 200, 1500, 700, 450, 300);

-- Create indexes for performance
CREATE INDEX idx_islands_user_id ON islands(user_id);
CREATE INDEX idx_buildings_island_id ON buildings(island_id);
CREATE INDEX idx_resources_user_id ON resources(user_id);
CREATE INDEX idx_convoys_user_id ON convoys(user_id);
CREATE INDEX idx_tasks_user_id ON tasks(user_id);
CREATE INDEX idx_league_rankings_season ON league_rankings(season);
CREATE INDEX idx_pvp_actions_attacker ON pvp_actions(attacker_id);
CREATE INDEX idx_pvp_actions_defender ON pvp_actions(defender_id);
CREATE INDEX idx_pvp_attacks_attacker ON pvp_attacks(attacker_id);
CREATE INDEX idx_marketplace_transactions_user ON marketplace_transactions(user_id);
CREATE INDEX idx_productions_building ON productions(building_id);
CREATE INDEX idx_daily_rewards_user_id ON daily_rewards(user_id);
CREATE INDEX idx_battles_attacker ON battles(attacker_id);
CREATE INDEX idx_battles_defender ON battles(defender_id);
CREATE INDEX idx_guild_members_guild ON guild_members(guild_id);
CREATE INDEX idx_guild_chat_guild ON guild_chat(guild_id);
