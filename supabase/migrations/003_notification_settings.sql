-- GrowBucks Notification Settings Schema
-- User preferences for notification delivery

-- Notification settings table
CREATE TABLE notification_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    email_enabled BOOLEAN DEFAULT TRUE,
    push_enabled BOOLEAN DEFAULT TRUE,
    interest_email BOOLEAN DEFAULT TRUE,
    interest_push BOOLEAN DEFAULT TRUE,
    deposits_email BOOLEAN DEFAULT TRUE,
    deposits_push BOOLEAN DEFAULT TRUE,
    withdrawals_email BOOLEAN DEFAULT TRUE,
    withdrawals_push BOOLEAN DEFAULT TRUE,
    goals_email BOOLEAN DEFAULT TRUE,
    goals_push BOOLEAN DEFAULT FALSE,
    quiet_hours_enabled BOOLEAN DEFAULT FALSE,
    quiet_hours_start TIME DEFAULT '21:00',
    quiet_hours_end TIME DEFAULT '07:00',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index
CREATE INDEX idx_notification_settings_user ON notification_settings(user_id);

-- RLS
ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View own notification settings" ON notification_settings
    FOR SELECT USING (user_id::text = auth.uid()::text);

CREATE POLICY "Insert own notification settings" ON notification_settings
    FOR INSERT WITH CHECK (user_id::text = auth.uid()::text);

CREATE POLICY "Update own notification settings" ON notification_settings
    FOR UPDATE USING (user_id::text = auth.uid()::text);

-- Updated timestamp trigger
CREATE OR REPLACE FUNCTION update_notification_settings_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER notification_settings_updated
    BEFORE UPDATE ON notification_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_notification_settings_timestamp();

COMMENT ON TABLE notification_settings IS 'User preferences for notification delivery channels';
