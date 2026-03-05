-- Recurring Deposits Feature
-- Allows parents to set up automatic weekly/monthly deposits for children

-- Recurring deposits table
CREATE TABLE recurring_deposits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount_cents BIGINT NOT NULL CHECK (amount_cents > 0 AND amount_cents <= 1000000),
    frequency VARCHAR(20) NOT NULL CHECK (frequency IN ('weekly', 'biweekly', 'monthly')),
    day_of_week INT CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0=Sunday, 6=Saturday (for weekly/biweekly)
    day_of_month INT CHECK (day_of_month >= 1 AND day_of_month <= 28), -- 1-28 for monthly (avoids month-end issues)
    description VARCHAR(100) DEFAULT 'Allowance',
    is_active BOOLEAN DEFAULT TRUE,
    next_deposit_at TIMESTAMP WITH TIME ZONE NOT NULL,
    last_deposit_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_recurring_deposits_child_id ON recurring_deposits(child_id);
CREATE INDEX idx_recurring_deposits_user_id ON recurring_deposits(user_id);
CREATE INDEX idx_recurring_deposits_next_deposit ON recurring_deposits(next_deposit_at) WHERE is_active = TRUE;
CREATE INDEX idx_recurring_deposits_active ON recurring_deposits(is_active);

-- Enable RLS
ALTER TABLE recurring_deposits ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Parents can view their recurring deposits" ON recurring_deposits
    FOR SELECT USING (
        user_id IN (SELECT id FROM users WHERE id::text = auth.uid()::text)
    );

CREATE POLICY "Parents can insert recurring deposits" ON recurring_deposits
    FOR INSERT WITH CHECK (
        user_id IN (SELECT id FROM users WHERE id::text = auth.uid()::text)
    );

CREATE POLICY "Parents can update their recurring deposits" ON recurring_deposits
    FOR UPDATE USING (
        user_id IN (SELECT id FROM users WHERE id::text = auth.uid()::text)
    );

CREATE POLICY "Parents can delete their recurring deposits" ON recurring_deposits
    FOR DELETE USING (
        user_id IN (SELECT id FROM users WHERE id::text = auth.uid()::text)
    );

-- Updated_at trigger
CREATE TRIGGER update_recurring_deposits_updated_at
    BEFORE UPDATE ON recurring_deposits
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE recurring_deposits IS 'Automated recurring deposit schedules (allowances)';
COMMENT ON COLUMN recurring_deposits.day_of_week IS 'For weekly/biweekly: 0=Sunday through 6=Saturday';
COMMENT ON COLUMN recurring_deposits.day_of_month IS 'For monthly: 1-28 to avoid month-end edge cases';
COMMENT ON COLUMN recurring_deposits.next_deposit_at IS 'Next scheduled deposit time (UTC)';
