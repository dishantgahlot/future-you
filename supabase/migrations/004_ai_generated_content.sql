-- AI Generated Content Tables
-- Migration 004: Tables for AI-generated letters, insights, and coach sessions

-- ============================================================================
-- AI Generated Letters
-- ============================================================================
CREATE TABLE public.ai_generated_letters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    letter_type TEXT CHECK (letter_type IN ('six_month', 'five_year', 'current_path')) NOT NULL,
    content TEXT NOT NULL,
    key_themes TEXT[],
    action_items TEXT[],
    prompt_context JSONB,
    generated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ai_generated_letters_user_id ON public.ai_generated_letters(user_id);
CREATE INDEX idx_ai_generated_letters_generated_at ON public.ai_generated_letters(generated_at DESC);
CREATE UNIQUE INDEX idx_ai_generated_letters_user_type ON public.ai_generated_letters(user_id, letter_type);

-- RLS Policies
ALTER TABLE public.ai_generated_letters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own AI letters" ON public.ai_generated_letters
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own AI letters" ON public.ai_generated_letters
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own AI letters" ON public.ai_generated_letters
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own AI letters" ON public.ai_generated_letters
    FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- AI Weekly Insights
-- ============================================================================
CREATE TABLE public.ai_weekly_insights (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    week_start DATE NOT NULL,
    summary TEXT NOT NULL,
    highlights TEXT[] NOT NULL,
    concerns TEXT[],
    recommendations JSONB NOT NULL,
    motivation TEXT NOT NULL,
    prompt_context JSONB,
    generated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ai_weekly_insights_user_id ON public.ai_weekly_insights(user_id);
CREATE INDEX idx_ai_weekly_insights_week_start ON public.ai_weekly_insights(week_start DESC);
CREATE UNIQUE INDEX idx_ai_weekly_insights_user_week ON public.ai_weekly_insights(user_id, week_start);

-- RLS Policies
ALTER TABLE public.ai_weekly_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own weekly insights" ON public.ai_weekly_insights
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own weekly insights" ON public.ai_weekly_insights
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own weekly insights" ON public.ai_weekly_insights
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own weekly insights" ON public.ai_weekly_insights
    FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- AI Coach Sessions
-- ============================================================================
CREATE TABLE public.ai_coach_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    context_type TEXT,
    context_data JSONB,
    generated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ai_coach_sessions_user_id ON public.ai_coach_sessions(user_id);
CREATE INDEX idx_ai_coach_sessions_generated_at ON public.ai_coach_sessions(generated_at DESC);

-- RLS Policies
ALTER TABLE public.ai_coach_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own coach sessions" ON public.ai_coach_sessions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own coach sessions" ON public.ai_coach_sessions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own coach sessions" ON public.ai_coach_sessions
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own coach sessions" ON public.ai_coach_sessions
    FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- Triggers for updated_at
-- ============================================================================
-- Note: These tables don't have updated_at columns since they're immutable once created
-- If updates are needed in the future, add updated_at column and trigger

-- ============================================================================
-- Comments
-- ============================================================================
COMMENT ON TABLE public.ai_generated_letters IS 'AI-generated future letters from different time horizons';
COMMENT ON TABLE public.ai_weekly_insights IS 'AI-generated weekly habit insights and recommendations';
COMMENT ON TABLE public.ai_coach_sessions IS 'AI Coach conversation history for context and continuity';