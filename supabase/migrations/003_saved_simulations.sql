-- Migration 003: Saved Simulations Table
-- Adds table for the What-If Interactive Future Simulator saved simulations

CREATE TABLE IF NOT EXISTS public.saved_simulations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

    -- Simulation metadata
    name TEXT NOT NULL,
    description TEXT,

    -- Simulation input parameters
    changes JSONB NOT NULL, -- Array of { metric, currentValue, simulatedValue, timelineMonths, difficulty }
    assumptions JSONB,
    horizon TEXT NOT NULL DEFAULT 'both', -- '6_months', '5_years', 'both'

    -- Full simulation result (cached for fast loading)
    result JSONB NOT NULL,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_saved_simulations_user_id
    ON public.saved_simulations(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_simulations_created_at
    ON public.saved_simulations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_saved_simulations_updated_at
    ON public.saved_simulations(updated_at DESC);

-- RLS
ALTER TABLE public.saved_simulations ENABLE ROW LEVEL SECURITY;

-- Saved Simulations policies
CREATE POLICY "Users can view own saved simulations" ON public.saved_simulations
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own saved simulations" ON public.saved_simulations
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own saved simulations" ON public.saved_simulations
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own saved simulations" ON public.saved_simulations
    FOR DELETE USING (auth.uid() = user_id);

-- Updated at trigger
CREATE TRIGGER handle_saved_simulations_updated_at
    BEFORE UPDATE ON public.saved_simulations
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_simulations TO authenticated;