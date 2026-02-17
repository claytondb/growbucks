-- GrowBucks Achievements & Notifications Schema
-- Adds persistence for achievements and in-app notifications

-- Achievements table to track unlocked achievements per child
CREATE TABLE achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    achievement_id VARCHAR(50) NOT NULL, -- matches ACHIEVEMENTS array id
    unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notified BOOLEAN DEFAULT FALSE, -- whether user was notified
    UNIQUE(child_id, achievement_id)
);

-- Notifications table for in-app notifications
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    child_id UUID REFERENCES children(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('interest', 'deposit', 'withdrawal', 'goal', 'achievement', 'milestone')),
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    emoji VARCHAR(10),
    amount_cents BIGINT, -- for interest/deposit/withdrawal notifications
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Child activity tracking for streaks
CREATE TABLE child_activity (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    activity_date DATE NOT NULL,
    login_count INT DEFAULT 1,
    UNIQUE(child_id, activity_date)
);

-- Add columns to children table for achievement tracking
ALTER TABLE children ADD COLUMN IF NOT EXISTS total_interest_earned_cents BIGINT DEFAULT 0;
ALTER TABLE children ADD COLUMN IF NOT EXISTS goals_achieved_count INT DEFAULT 0;
ALTER TABLE children ADD COLUMN IF NOT EXISTS last_withdrawal_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE children ADD COLUMN IF NOT EXISTS locked_percentage INT DEFAULT 0 CHECK (locked_percentage >= 0 AND locked_percentage <= 100);

-- Indexes
CREATE INDEX idx_achievements_child_id ON achievements(child_id);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, read_at) WHERE read_at IS NULL;
CREATE INDEX idx_child_activity_child_date ON child_activity(child_id, activity_date DESC);

-- RLS Policies
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE child_activity ENABLE ROW LEVEL SECURITY;

-- Achievements RLS
CREATE POLICY "View own children's achievements" ON achievements
    FOR SELECT USING (
        child_id IN (
            SELECT id FROM children 
            WHERE user_id::text = auth.uid()::text 
            OR id::text = auth.uid()::text
        )
    );

CREATE POLICY "Insert achievements" ON achievements
    FOR INSERT WITH CHECK (
        child_id IN (
            SELECT id FROM children 
            WHERE user_id::text = auth.uid()::text 
            OR id::text = auth.uid()::text
        )
    );

-- Notifications RLS
CREATE POLICY "View own notifications" ON notifications
    FOR SELECT USING (user_id::text = auth.uid()::text);

CREATE POLICY "Update own notifications" ON notifications
    FOR UPDATE USING (user_id::text = auth.uid()::text);

-- Activity RLS
CREATE POLICY "View own children's activity" ON child_activity
    FOR SELECT USING (
        child_id IN (
            SELECT id FROM children 
            WHERE user_id::text = auth.uid()::text 
            OR id::text = auth.uid()::text
        )
    );

CREATE POLICY "Insert activity" ON child_activity
    FOR INSERT WITH CHECK (
        child_id IN (
            SELECT id FROM children 
            WHERE user_id::text = auth.uid()::text 
            OR id::text = auth.uid()::text
        )
    );

-- Function to create interest notification
CREATE OR REPLACE FUNCTION create_interest_notification()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.type = 'interest' AND NEW.amount_cents > 0 THEN
        INSERT INTO notifications (user_id, child_id, type, title, message, emoji, amount_cents)
        SELECT 
            c.user_id,
            NEW.child_id,
            'interest',
            c.name || ' earned interest! 💰',
            c.name || '''s savings grew by $' || (NEW.amount_cents::float / 100)::text || ' today!',
            '✨',
            NEW.amount_cents
        FROM children c WHERE c.id = NEW.child_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for interest notifications
CREATE TRIGGER on_interest_transaction
    AFTER INSERT ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION create_interest_notification();

COMMENT ON TABLE achievements IS 'Tracks which achievements each child has unlocked';
COMMENT ON TABLE notifications IS 'In-app notifications for parents and children';
COMMENT ON TABLE child_activity IS 'Daily activity tracking for streak achievements';
