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
    auto_production_until TIMESTAMP,
    last_seen_attacks_at TIMESTAMP
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

-- PvP Actions Table (attacks, raids, sabotage)
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

-- Create indexes for performance
CREATE INDEX idx_islands_user_id ON islands(user_id);
CREATE INDEX idx_buildings_island_id ON buildings(island_id);
CREATE INDEX idx_resources_user_id ON resources(user_id);
CREATE INDEX idx_convoys_user_id ON convoys(user_id);
CREATE INDEX idx_tasks_user_id ON tasks(user_id);
CREATE INDEX idx_league_rankings_season ON league_rankings(season);
CREATE INDEX idx_pvp_actions_attacker ON pvp_actions(attacker_id);
CREATE INDEX idx_pvp_actions_defender ON pvp_actions(defender_id);
CREATE INDEX idx_market_transactions_seller ON market_transactions(seller_id);
CREATE INDEX idx_productions_building ON productions(building_id);
CREATE INDEX idx_daily_rewards_user_id ON daily_rewards(user_id);
