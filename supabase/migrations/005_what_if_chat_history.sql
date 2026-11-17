-- Migration 005: What-If Chat History Table
-- Enables per-user persistence and multi-session ChatGPT-style Saved Chats for What-If AI Simulation conversations

CREATE TABLE IF NOT EXISTS public.what_if_chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    session_id TEXT,
    session_title TEXT,
    role TEXT NOT NULL CHECK (role IN ('user', 'model', 'assistant')),
    content TEXT NOT NULL,
    metrics JSONB,
    suggested_follow_ups JSONB,
    model TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for lightning-fast per-user retrieval and per-session lookups
CREATE INDEX IF NOT EXISTS idx_what_if_chat_messages_user_id
    ON public.what_if_chat_messages(user_id);

CREATE INDEX IF NOT EXISTS idx_what_if_chat_messages_user_created
    ON public.what_if_chat_messages(user_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_what_if_chat_messages_session
    ON public.what_if_chat_messages(user_id, session_id, created_at ASC);

-- Row Level Security
ALTER TABLE public.what_if_chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own chat messages" ON public.what_if_chat_messages
    FOR SELECT USING (auth.uid()::text = user_id OR user_id = 'd6dabc1d-aec5-4cfa-a742-181357ccd86c');

CREATE POLICY "Users can insert their own chat messages" ON public.what_if_chat_messages
    FOR INSERT WITH CHECK (auth.uid()::text = user_id OR user_id = 'd6dabc1d-aec5-4cfa-a742-181357ccd86c');

CREATE POLICY "Users can delete their own chat messages" ON public.what_if_chat_messages
    FOR DELETE USING (auth.uid()::text = user_id OR user_id = 'd6dabc1d-aec5-4cfa-a742-181357ccd86c');

GRANT SELECT, INSERT, UPDATE, DELETE ON public.what_if_chat_messages TO anon, authenticated, service_role;
