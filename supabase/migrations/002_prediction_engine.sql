-- Migration 002: Prediction Engine Tables
-- Adds tables for the Future You Prediction Engine

-- Predictions table (replaces/modifies the existing one to store full engine output)
-- We'll add a new table to avoid conflicts with existing predictions table
CREATE TABLE IF NOT EXISTS public.prediction_engine_outputs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

    -- Full prediction output as JSON
    current_path JSONB NOT NULL,
    improved_path JSONB NOT NULL,
    comparative_analysis JSONB NOT NULL,
    meta JSONB NOT NULL,

    -- Behavioral profile snapshot
    behavioral_profile JSONB NOT NULL,

    -- Data quality info
    data_quality JSONB NOT NULL,

    -- Metadata
    generated_at TIMESTAMPTZ DEFAULT NOW(),
    engine_version TEXT NOT NULL DEFAULT '1.0.0',

    -- Unique constraint: one active prediction per user
    UNIQUE(user_id)
);

-- What-If Scenarios table (for saved custom scenarios)
CREATE TABLE IF NOT EXISTS public.what_if_scenarios (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    scenario_data JSONB NOT NULL, -- Full WhatIfScenario object
    result_data JSONB, -- WhatIfResult object (cached)
    is_predefined BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_prediction_engine_outputs_user_id
    ON public.prediction_engine_outputs(user_id);
CREATE INDEX IF NOT EXISTS idx_prediction_engine_outputs_generated_at
    ON public.prediction_engine_outputs(generated_at DESC);
CREATE INDEX IF NOT EXISTS idx_what_if_scenarios_user_id
    ON public.what_if_scenarios(user_id);
CREATE INDEX IF NOT EXISTS idx_what_if_scenarios_created_at
    ON public.what_if_scenarios(created_at DESC);

-- RLS
ALTER TABLE public.prediction_engine_outputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.what_if_scenarios ENABLE ROW LEVEL SECURITY;

-- Prediction Engine Outputs policies
CREATE POLICY "Users can view own prediction outputs" ON public.prediction_engine_outputs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own prediction outputs" ON public.prediction_engine_outputs
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own prediction outputs" ON public.prediction_engine_outputs
    FOR UPDATE USING (auth.uid() = user_id);

-- What-If Scenarios policies
CREATE POLICY "Users can view own what-if scenarios" ON public.what_if_scenarios
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own what-if scenarios" ON public.what_if_scenarios
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own what-if scenarios" ON public.what_if_scenarios
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own what-if scenarios" ON public.what_if_scenarios
    FOR DELETE USING (auth.uid() = user_id);

-- Updated at triggers
CREATE TRIGGER handle_what_if_scenarios_updated_at
    BEFORE UPDATE ON public.what_if_scenarios
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.prediction_engine_outputs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.what_if_scenarios TO authenticated;