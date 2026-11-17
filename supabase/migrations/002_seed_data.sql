-- Seed data for development (run after creating a test user)
-- Replace 'your-user-id-here' with actual user ID from auth.users

-- Example: Insert test habits (run manually after user creation)
/*
INSERT INTO public.habits (user_id, name, description, category, frequency, target_value, unit, color, icon, is_active) VALUES
('your-user-id-here', 'Morning Run', 'Run 5km every morning', 'fitness', 'daily', 5, 'km', '#22c55e', '🏃', true),
('your-user-id-here', 'Read 30 minutes', 'Read before bed', 'learning', 'daily', 30, 'min', '#3b82f6', '📚', true),
('your-user-id-here', 'Drink 3L Water', 'Stay hydrated throughout the day', 'health', 'daily', 3, 'L', '#06b6d4', '💧', true),
('your-user-id-here', 'Meditation', '10 minutes of mindfulness', 'mental_health', 'daily', 10, 'min', '#a855f7', '🧘', true),
('your-user-id-here', 'Weekly Review', 'Review goals and plan next week', 'productivity', 'weekly', 1, 'session', '#f59e0b', '📋', true);
*/

-- Example habit logs for the last 30 days
/*
INSERT INTO public.habit_logs (habit_id, user_id, value, notes, logged_at)
SELECT
    h.id,
    h.user_id,
    CASE
        WHEN h.name = 'Morning Run' THEN (random() * 2 + 3)::numeric(4,1)
        WHEN h.name = 'Read 30 minutes' THEN (random() * 20 + 15)::numeric(4,1)
        WHEN h.name = 'Drink 3L Water' THEN (random() * 2 + 1)::numeric(4,1)
        WHEN h.name = 'Meditation' THEN (random() * 10 + 5)::numeric(4,1)
        WHEN h.name = 'Weekly Review' THEN 1
    END,
    CASE
        WHEN random() > 0.7 THEN 'Great session!'
        WHEN random() > 0.4 THEN 'Good effort'
        ELSE NULL
    END,
    (NOW() - (interval '1 day' * generate_series(0, 29)))::timestamptz
FROM public.habits h
WHERE h.user_id = 'your-user-id-here'
  AND generate_series(0, 29) % CASE h.frequency
    WHEN 'daily' THEN 1
    WHEN 'weekly' THEN 7
    WHEN 'monthly' THEN 30
  END = 0
  AND random() > 0.15; -- 85% completion rate
*/

-- Note: Run the above manually in Supabase SQL Editor after:
-- 1. Creating a user via Supabase Auth
-- 2. Getting the user ID from auth.users
-- 3. Replacing 'your-user-id-here' with the actual UUID