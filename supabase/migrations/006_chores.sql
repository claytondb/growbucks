-- GrowBucks Chores & Jobs Schema
-- Virtual job system: parents create chores, children complete them, parents approve → earnings deposited

-- Chores table: parent-defined tasks with a reward amount
CREATE TABLE chores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    title VARCHAR(100) NOT NULL,
    description TEXT,
    reward_cents BIGINT NOT NULL CHECK (reward_cents > 0),
    -- Frequency: one_time means it disappears after one approval; recurring means it keeps coming back
    frequency VARCHAR(20) NOT NULL DEFAULT 'recurring' CHECK (frequency IN ('one_time', 'recurring')),
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'archived')),
    emoji VARCHAR(10), -- optional icon chosen by parent
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Chore completions: child submits completion, parent approves/rejects
CREATE TABLE chore_completions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chore_id UUID NOT NULL REFERENCES chores(id) ON DELETE CASCADE,
    child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    -- Child can add notes when marking complete (e.g. "I swept the whole floor!")
    notes TEXT,
    -- Timestamps
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    -- Who approved/rejected (parent user id)
    reviewed_by UUID REFERENCES users(id),
    rejection_reason VARCHAR(255),
    -- Link to the resulting transaction (set when approved)
    transaction_id UUID REFERENCES transactions(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_chores_child_id ON chores(child_id);
CREATE INDEX idx_chores_status ON chores(status);
CREATE INDEX idx_chore_completions_chore_id ON chore_completions(chore_id);
CREATE INDEX idx_chore_completions_child_id ON chore_completions(child_id);
CREATE INDEX idx_chore_completions_status ON chore_completions(status);

-- Updated_at trigger for chores
CREATE TRIGGER update_chores_updated_at
    BEFORE UPDATE ON chores
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE chores ENABLE ROW LEVEL SECURITY;
ALTER TABLE chore_completions ENABLE ROW LEVEL SECURITY;

-- Parents can manage chores for their children
CREATE POLICY "Parents can view chores for their children" ON chores
    FOR SELECT USING (
        child_id IN (
            SELECT id FROM children WHERE user_id::text = auth.uid()::text
        )
        OR child_id::text = auth.uid()::text
    );

CREATE POLICY "Parents can insert chores" ON chores
    FOR INSERT WITH CHECK (
        child_id IN (
            SELECT id FROM children WHERE user_id::text = auth.uid()::text
        )
    );

CREATE POLICY "Parents can update their chores" ON chores
    FOR UPDATE USING (
        child_id IN (
            SELECT id FROM children WHERE user_id::text = auth.uid()::text
        )
    );

CREATE POLICY "Parents can delete their chores" ON chores
    FOR DELETE USING (
        child_id IN (
            SELECT id FROM children WHERE user_id::text = auth.uid()::text
        )
    );

-- Chore completions: parents and children can view; children can insert; parents can update (approve/reject)
CREATE POLICY "View chore completions" ON chore_completions
    FOR SELECT USING (
        child_id IN (
            SELECT id FROM children
            WHERE user_id::text = auth.uid()::text
               OR id::text = auth.uid()::text
        )
    );

CREATE POLICY "Children can submit completions" ON chore_completions
    FOR INSERT WITH CHECK (
        child_id::text = auth.uid()::text
        OR child_id IN (
            SELECT id FROM children WHERE user_id::text = auth.uid()::text
        )
    );

CREATE POLICY "Parents can review completions" ON chore_completions
    FOR UPDATE USING (
        child_id IN (
            SELECT id FROM children WHERE user_id::text = auth.uid()::text
        )
    );
