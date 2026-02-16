-- GrowBucks Database Schema
-- Run this in your Supabase SQL editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (Parents)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    name VARCHAR(100) NOT NULL,
    auth_provider VARCHAR(20) NOT NULL CHECK (auth_provider IN ('email', 'google')),
    google_id VARCHAR(255) UNIQUE,
    email_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login_at TIMESTAMP WITH TIME ZONE,
    timezone VARCHAR(50) DEFAULT 'UTC'
);

-- Children table
CREATE TABLE children (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,
    pin_hash VARCHAR(255) NOT NULL,
    avatar_url VARCHAR(500),
    balance_cents BIGINT NOT NULL DEFAULT 0 CHECK (balance_cents >= 0),
    interest_rate_daily DECIMAL(5,4) NOT NULL DEFAULT 0.0100 CHECK (interest_rate_daily >= 0.001 AND interest_rate_daily <= 0.05),
    interest_paused BOOLEAN DEFAULT FALSE,
    last_interest_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Transactions table
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('deposit', 'withdrawal', 'interest', 'adjustment')),
    amount_cents BIGINT NOT NULL,
    balance_after_cents BIGINT NOT NULL,
    description VARCHAR(255),
    status VARCHAR(20) NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
    requested_at TIMESTAMP WITH TIME ZONE,
    processed_at TIMESTAMP WITH TIME ZONE,
    processed_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Child settings table
CREATE TABLE child_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    child_id UUID UNIQUE NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    withdrawal_limit_per_tx_cents BIGINT,
    withdrawal_limit_daily_cents BIGINT,
    withdrawal_limit_weekly_cents BIGINT,
    withdrawal_cooldown_hours INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Savings goals table
CREATE TABLE savings_goals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    target_cents BIGINT NOT NULL CHECK (target_cents > 0),
    target_date DATE,
    achieved_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_children_user_id ON children(user_id);
CREATE INDEX idx_children_last_interest_at ON children(last_interest_at);
CREATE INDEX idx_transactions_child_id ON transactions(child_id);
CREATE INDEX idx_transactions_child_created ON transactions(child_id, created_at DESC);
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_savings_goals_child_id ON savings_goals(child_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_google_id ON users(google_id);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_children_updated_at
    BEFORE UPDATE ON children
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_child_settings_updated_at
    BEFORE UPDATE ON child_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE children ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE child_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE savings_goals ENABLE ROW LEVEL SECURITY;

-- RLS Policies (basic - expand as needed)
-- Users can read their own data
CREATE POLICY "Users can view own data" ON users
    FOR SELECT USING (auth.uid()::text = id::text);

-- Parents can manage their children
CREATE POLICY "Parents can view their children" ON children
    FOR SELECT USING (
        user_id IN (SELECT id FROM users WHERE id::text = auth.uid()::text)
        OR id::text = auth.uid()::text
    );

CREATE POLICY "Parents can insert children" ON children
    FOR INSERT WITH CHECK (
        user_id IN (SELECT id FROM users WHERE id::text = auth.uid()::text)
    );

CREATE POLICY "Parents can update their children" ON children
    FOR UPDATE USING (
        user_id IN (SELECT id FROM users WHERE id::text = auth.uid()::text)
    );

-- Transactions policies
CREATE POLICY "View transactions" ON transactions
    FOR SELECT USING (
        child_id IN (
            SELECT id FROM children 
            WHERE user_id::text = auth.uid()::text 
            OR id::text = auth.uid()::text
        )
    );

CREATE POLICY "Insert transactions" ON transactions
    FOR INSERT WITH CHECK (
        child_id IN (
            SELECT id FROM children 
            WHERE user_id::text = auth.uid()::text 
            OR id::text = auth.uid()::text
        )
    );

-- Service role bypass (for cron jobs)
-- Note: Service role key bypasses RLS by default

COMMENT ON TABLE users IS 'Parent accounts';
COMMENT ON TABLE children IS 'Child accounts with savings balances';
COMMENT ON TABLE transactions IS 'All financial transactions';
COMMENT ON TABLE child_settings IS 'Per-child settings like withdrawal limits';
COMMENT ON TABLE savings_goals IS 'Savings goals for motivation';
