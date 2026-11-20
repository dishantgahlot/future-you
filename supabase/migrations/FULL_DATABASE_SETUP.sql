-- ============================================================================
-- FUTURE YOU - COMPLETE SUPABASE DATABASE SETUP SCRIPT
-- ============================================================================
-- Run this script in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/axakpuacdaptgcsrxams/sql/new
-- ============================================================================

-- 1. Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    date_of_birth DATE,
    timezone TEXT DEFAULT 'UTC',
    preferences JSONB DEFAULT '{
        "theme": "system",
        "notifications": true,
        "weekly_report": true,
        "predictions": true,
        "onboarding_completed": true
    }'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Habits table
CREATE TABLE IF NOT EXISTS public.habits (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL CHECK (category IN (
        'health', 'fitness', 'nutrition', 'sleep', 'mental_health',
        'productivity', 'learning', 'finance', 'social', 'other'
    )),
    frequency TEXT NOT NULL DEFAULT 'daily' CHECK (frequency IN ('daily', 'weekly', 'monthly')),
    target_value NUMERIC NOT NULL DEFAULT 1 CHECK (target_value > 0),
    unit TEXT NOT NULL DEFAULT 'times',
    color TEXT DEFAULT '#738541',
    color_theme TEXT DEFAULT 'cream',
    icon TEXT DEFAULT '🌿',
    is_active BOOLEAN DEFAULT TRUE,
    target_date TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_habits_user_name_date UNIQUE (user_id, name, target_date)
);

-- 4. Recreate Habit Logs with unified columns for frontend & backend compatibility
DROP TABLE IF EXISTS public.habit_logs CASCADE;

CREATE TABLE public.habit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    habit_id UUID REFERENCES public.habits(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    log_date DATE NOT NULL DEFAULT CURRENT_DATE,
    logged_at TIMESTAMPTZ DEFAULT NOW(),
    actual_value NUMERIC NOT NULL DEFAULT 0 CHECK (actual_value >= 0),
    value NUMERIC NOT NULL DEFAULT 0,
    target_value NUMERIC NOT NULL DEFAULT 1,
    completion_status BOOLEAN DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(habit_id, log_date)
);

-- 5. Predictions table
CREATE TABLE IF NOT EXISTS public.predictions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    habit_id UUID REFERENCES public.habits(id) ON DELETE SET NULL,
    prediction_type TEXT NOT NULL,
    timeframe TEXT NOT NULL,
    predicted_value NUMERIC NOT NULL,
    confidence INTEGER NOT NULL CHECK (confidence >= 0 AND confidence <= 100),
    factors JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, habit_id, prediction_type, timeframe)
);

-- 6. Scenarios table
CREATE TABLE IF NOT EXISTS public.scenarios (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    scenario_type TEXT NOT NULL,
    assumptions JSONB NOT NULL DEFAULT '{}'::jsonb,
    projected_results JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Future Letters table
CREATE TABLE IF NOT EXISTS public.future_letters (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    horizon TEXT NOT NULL,
    letter_type TEXT NOT NULL,
    content TEXT NOT NULL,
    key_themes TEXT[],
    action_items TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, horizon, letter_type)
);

-- 8. Prediction Engine Outputs table
CREATE TABLE IF NOT EXISTS public.prediction_engine_outputs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    current_path JSONB NOT NULL,
    improved_path JSONB NOT NULL,
    comparative_analysis JSONB NOT NULL,
    meta JSONB NOT NULL,
    behavioral_profile JSONB NOT NULL,
    data_quality JSONB NOT NULL,
    generated_at TIMESTAMPTZ DEFAULT NOW(),
    engine_version TEXT NOT NULL DEFAULT '1.0.0',
    UNIQUE(user_id)
);

-- 9. What-If Scenarios table
CREATE TABLE IF NOT EXISTS public.what_if_scenarios (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    scenario_data JSONB NOT NULL,
    result_data JSONB,
    is_predefined BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Saved Simulations table
CREATE TABLE IF NOT EXISTS public.saved_simulations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    changes JSONB NOT NULL,
    assumptions JSONB,
    horizon TEXT NOT NULL DEFAULT 'both',
    result JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. AI Generated Letters table
CREATE TABLE IF NOT EXISTS public.ai_generated_letters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    letter_type TEXT NOT NULL,
    content TEXT NOT NULL,
    key_themes TEXT[],
    action_items TEXT[],
    prompt_context JSONB,
    generated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. AI Weekly Insights table
CREATE TABLE IF NOT EXISTS public.ai_weekly_insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- 13. AI Coach Sessions table
CREATE TABLE IF NOT EXISTS public.ai_coach_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    context_type TEXT,
    context_data JSONB,
    generated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_habits_user_id ON public.habits(user_id);
CREATE INDEX IF NOT EXISTS idx_habits_user_active ON public.habits(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_habit_logs_habit_id ON public.habit_logs(habit_id);
CREATE INDEX IF NOT EXISTS idx_habit_logs_user_id ON public.habit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_habit_logs_log_date ON public.habit_logs(log_date);
CREATE INDEX IF NOT EXISTS idx_habit_logs_logged_at ON public.habit_logs(logged_at);
CREATE INDEX IF NOT EXISTS idx_predictions_user_id ON public.predictions(user_id);
CREATE INDEX IF NOT EXISTS idx_scenarios_user_id ON public.scenarios(user_id);
CREATE INDEX IF NOT EXISTS idx_prediction_engine_outputs_user_id ON public.prediction_engine_outputs(user_id);
CREATE INDEX IF NOT EXISTS idx_what_if_scenarios_user_id ON public.what_if_scenarios(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_simulations_user_id ON public.saved_simulations(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_generated_letters_user_id ON public.ai_generated_letters(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_weekly_insights_user_id ON public.ai_weekly_insights(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_coach_sessions_user_id ON public.ai_coach_sessions(user_id);

-- ============================================================================
-- TRIGGERS & FUNCTIONS
-- ============================================================================

-- Updated at trigger function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Sync habit log values (supports both value & actual_value, log_date & logged_at)
CREATE OR REPLACE FUNCTION public.sync_habit_log_fields()
RETURNS TRIGGER AS $$
DECLARE
    target NUMERIC;
BEGIN
    -- Synchronize value and actual_value
    IF NEW.actual_value IS NOT NULL AND (NEW.value IS NULL OR NEW.value = 0) THEN
        NEW.value := NEW.actual_value;
    ELSIF NEW.value IS NOT NULL AND (NEW.actual_value IS NULL OR NEW.actual_value = 0) THEN
        NEW.actual_value := NEW.value;
    END IF;

    -- Synchronize log_date and logged_at
    IF NEW.log_date IS NOT NULL AND NEW.logged_at IS NULL THEN
        NEW.logged_at := NEW.log_date::timestamptz;
    ELSIF NEW.logged_at IS NOT NULL AND NEW.log_date IS NULL THEN
        NEW.log_date := NEW.logged_at::date;
    END IF;

    -- Calculate completion_status from habit target_value
    SELECT target_value INTO target FROM public.habits WHERE id = NEW.habit_id;
    IF target IS NOT NULL AND (COALESCE(NEW.actual_value, NEW.value, 0) >= target) THEN
        NEW.completion_status := TRUE;
    ELSE
        NEW.completion_status := COALESCE(NEW.completion_status, FALSE);
    END IF;

    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_habit_logs ON public.habit_logs;
CREATE TRIGGER trg_sync_habit_logs
    BEFORE INSERT OR UPDATE ON public.habit_logs
    FOR EACH ROW EXECUTE FUNCTION public.sync_habit_log_fields();

-- Profile on user signup trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)))
    ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.future_letters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prediction_engine_outputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.what_if_scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_simulations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_generated_letters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_weekly_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_coach_sessions ENABLE ROW LEVEL SECURITY;

-- Helper to safely recreate policies
DO $$
BEGIN
    -- profiles
    DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
    CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
    DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
    CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
    DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
    CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

    -- habits
    DROP POLICY IF EXISTS "Users can view own habits" ON public.habits;
    CREATE POLICY "Users can view own habits" ON public.habits FOR SELECT USING (auth.uid() = user_id);
    DROP POLICY IF EXISTS "Users can insert own habits" ON public.habits;
    CREATE POLICY "Users can insert own habits" ON public.habits FOR INSERT WITH CHECK (auth.uid() = user_id);
    DROP POLICY IF EXISTS "Users can update own habits" ON public.habits;
    CREATE POLICY "Users can update own habits" ON public.habits FOR UPDATE USING (auth.uid() = user_id);
    DROP POLICY IF EXISTS "Users can delete own habits" ON public.habits;
    CREATE POLICY "Users can delete own habits" ON public.habits FOR DELETE USING (auth.uid() = user_id);

    -- habit_logs
    DROP POLICY IF EXISTS "Users can view own habit logs" ON public.habit_logs;
    CREATE POLICY "Users can view own habit logs" ON public.habit_logs FOR SELECT USING (auth.uid() = user_id);
    DROP POLICY IF EXISTS "Users can insert own habit logs" ON public.habit_logs;
    CREATE POLICY "Users can insert own habit logs" ON public.habit_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
    DROP POLICY IF EXISTS "Users can update own habit logs" ON public.habit_logs;
    CREATE POLICY "Users can update own habit logs" ON public.habit_logs FOR UPDATE USING (auth.uid() = user_id);
    DROP POLICY IF EXISTS "Users can delete own habit logs" ON public.habit_logs;
    CREATE POLICY "Users can delete own habit logs" ON public.habit_logs FOR DELETE USING (auth.uid() = user_id);

    -- predictions
    DROP POLICY IF EXISTS "Users can manage own predictions" ON public.predictions;
    CREATE POLICY "Users can manage own predictions" ON public.predictions FOR ALL USING (auth.uid() = user_id);

    -- scenarios
    DROP POLICY IF EXISTS "Users can manage own scenarios" ON public.scenarios;
    CREATE POLICY "Users can manage own scenarios" ON public.scenarios FOR ALL USING (auth.uid() = user_id);

    -- future_letters
    DROP POLICY IF EXISTS "Users can manage own future letters" ON public.future_letters;
    CREATE POLICY "Users can manage own future letters" ON public.future_letters FOR ALL USING (auth.uid() = user_id);

    -- prediction_engine_outputs
    DROP POLICY IF EXISTS "Users can manage own prediction engine outputs" ON public.prediction_engine_outputs;
    CREATE POLICY "Users can manage own prediction engine outputs" ON public.prediction_engine_outputs FOR ALL USING (auth.uid() = user_id);

    -- what_if_scenarios
    DROP POLICY IF EXISTS "Users can manage own what if scenarios" ON public.what_if_scenarios;
    CREATE POLICY "Users can manage own what if scenarios" ON public.what_if_scenarios FOR ALL USING (auth.uid() = user_id);

    -- saved_simulations
    DROP POLICY IF EXISTS "Users can manage own saved simulations" ON public.saved_simulations;
    CREATE POLICY "Users can manage own saved simulations" ON public.saved_simulations FOR ALL USING (auth.uid() = user_id);

    -- ai_generated_letters
    DROP POLICY IF EXISTS "Users can manage own ai generated letters" ON public.ai_generated_letters;
    CREATE POLICY "Users can manage own ai generated letters" ON public.ai_generated_letters FOR ALL USING (auth.uid() = user_id);

    -- ai_weekly_insights
    DROP POLICY IF EXISTS "Users can manage own weekly insights" ON public.ai_weekly_insights;
    CREATE POLICY "Users can manage own weekly insights" ON public.ai_weekly_insights FOR ALL USING (auth.uid() = user_id);

    -- ai_coach_sessions
    DROP POLICY IF EXISTS "Users can manage own coach sessions" ON public.ai_coach_sessions;
    CREATE POLICY "Users can manage own coach sessions" ON public.ai_coach_sessions FOR ALL USING (auth.uid() = user_id);
END $$;

-- Grant permissions to authenticated and service_role
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- ============================================================================
-- SEED INITIAL HABITS FOR ALL REGISTERED USERS
-- ============================================================================
DO $$
DECLARE
    u RECORD;
BEGIN
    FOR u IN SELECT id FROM auth.users LOOP
        -- Seed Sleep
        INSERT INTO public.habits (user_id, name, description, category, frequency, target_value, unit, color, icon)
        VALUES (u.id, 'Sleep', '7 - 8 hours of restorative sleep', 'sleep', 'daily', 8, 'h', '#7E6BA5', '🌙')
        ON CONFLICT (user_id, name) DO NOTHING;

        -- Seed Study
        INSERT INTO public.habits (user_id, name, description, category, frequency, target_value, unit, color, icon)
        VALUES (u.id, 'Study', 'Focus reading and learning', 'learning', 'daily', 2, 'h', '#C87850', '📖')
        ON CONFLICT (user_id, name) DO NOTHING;

        -- Seed Exercise
        INSERT INTO public.habits (user_id, name, description, category, frequency, target_value, unit, color, icon)
        VALUES (u.id, 'Exercise', 'Daily workout or physical exercise', 'fitness', 'daily', 30, 'm', '#6B8E4E', '🏃')
        ON CONFLICT (user_id, name) DO NOTHING;

        -- Seed Screen Time
        INSERT INTO public.habits (user_id, name, description, category, frequency, target_value, unit, color, icon)
        VALUES (u.id, 'Screen Time', 'Under 3 hours total recreational screen time', 'productivity', 'daily', 3, 'h', '#C88E3E', '📱')
        ON CONFLICT (user_id, name) DO NOTHING;

        -- Seed Morning Hydration
        INSERT INTO public.habits (user_id, name, description, category, frequency, target_value, unit, color, icon)
        VALUES (u.id, 'Morning Hydration', 'Drink 2L+ water throughout the day', 'health', 'daily', 2000, 'ml', '#4A90E2', '💧')
        ON CONFLICT (user_id, name) DO NOTHING;
    END LOOP;
END $$;
