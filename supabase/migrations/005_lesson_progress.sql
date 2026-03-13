-- GrowBucks Migration 005: Lesson Progress
-- Persists lesson completion and quiz scores server-side so progress
-- survives device switches and parents can see their children's learning.

CREATE TABLE IF NOT EXISTS lesson_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    lesson_id VARCHAR(100) NOT NULL,
    completed BOOLEAN NOT NULL DEFAULT FALSE,
    quiz_score INT CHECK (quiz_score IS NULL OR (quiz_score >= 0 AND quiz_score <= 100)),
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (child_id, lesson_id)
);

-- Index for fast per-child lookups
CREATE INDEX IF NOT EXISTS idx_lesson_progress_child_id ON lesson_progress(child_id);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_lesson_id ON lesson_progress(lesson_id);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_completed ON lesson_progress(child_id, completed);

-- Updated_at trigger
CREATE TRIGGER update_lesson_progress_updated_at
    BEFORE UPDATE ON lesson_progress
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE lesson_progress ENABLE ROW LEVEL SECURITY;

-- Children can read/write their own progress
CREATE POLICY "Children can view own lesson progress" ON lesson_progress
    FOR SELECT USING (child_id::text = auth.uid()::text);

CREATE POLICY "Children can insert own lesson progress" ON lesson_progress
    FOR INSERT WITH CHECK (child_id::text = auth.uid()::text);

CREATE POLICY "Children can update own lesson progress" ON lesson_progress
    FOR UPDATE USING (child_id::text = auth.uid()::text);

-- Parents can view their children's progress
CREATE POLICY "Parents can view children lesson progress" ON lesson_progress
    FOR SELECT USING (
        child_id IN (
            SELECT id FROM children
            WHERE user_id IN (
                SELECT id FROM users WHERE id::text = auth.uid()::text
            )
        )
    );
