# FUTURE YOU — Visual Architecture & System Flow Guide

This guide breaks down every data model, calculation pipeline, and architectural flow in **Future You** using whiteboard diagrams. Use this as your master reference to ace any technical question, viva, or code walkthrough.

---

## 1. High-Level System Architecture

```
                 +-------------------------------------------------------+
                 |                    USER BROWSER                       |
                 |  React 18 + Vite SPA  (future-you-kohl.vercel.app)     |
                 |  - Botanical UI (Tailwind CSS + Framer Motion)        |
                 |  - AuthContext, UserProfileContext, SidebarContext    |
                 +---------------------------+---------------------------+
                                             |
                      +----------------------+----------------------+
                      | (Bearer <JWT>)                              | Direct SDK (Anon Key)
                      v                                             v
       +-------------------------------+             +-----------------------------+
       |   VERCEL SERVERLESS BACKEND   |             |     SUPABASE POSTGRESQL     |
       |         (Node.js / Express)   |             | - auth.users (Credentials)  |
       | - authMiddleware (JWT verify) |             | - public.profiles           |
       | - Prediction Engine (Math)    |             | - public.habits & logs      |
       | - AI Service (Gemini 2.5)     +<----------->+ - public.what_if_chat       |
       | - Analytics & Aggregations    |             | - Row Level Security (RLS)  |
       +---------------+---------------+             +-----------------------------+
                       |
                       | Prompt + Structured Context (Habits + Logs)
                       v
       +-------------------------------+
       |     GEMINI 2.5 FLASH API      |
       | - Context-Injected AI Coach   |
       | - What-If Scenario Chat       |
       | - Future Letters Generator    |
       +-------------------------------+
```

---

## 2. Complete Entity-Relationship (ER) Data Model

```
   +-------------------------------------------------------------+
   |                       auth.users                            |
   |-------------------------------------------------------------|
   | PK  id          UUID (Supabase Auth Generated)              |
   |     email       TEXT (Unique user email)                    |
   |     encrypted_password TEXT (Bcrypt hashed)                 |
   +------------------------------+------------------------------+
                                  |
                                  | 1 : 1 (ON DELETE CASCADE)
                                  v
   +-------------------------------------------------------------+
   |                      public.profiles                        |
   |-------------------------------------------------------------|
   | PK  id          UUID  ---> FK to auth.users.id              |
   |     full_name   TEXT  (e.g., "Dishant Gahlot")              |
   |     avatar_url  TEXT  (Dicebear URL or Custom Image URL)    |
   |     timezone    TEXT  (Default: 'UTC')                      |
   |     preferences JSONB ({ theme, onboarding_completed, etc })|
   +------------------------------+------------------------------+
                                  |
                                  | 1 : N (ON DELETE CASCADE)
                                  v
   +-------------------------------------------------------------+
   |                       public.habits                         |
   |-------------------------------------------------------------|
   | PK  id           UUID (gen_random_uuid())                   |
   | FK  user_id      UUID ---> FK to auth.users.id              |
   |     name         TEXT (e.g., "Deep Work", "Sleep")          |
   |     category     TEXT ('health','fitness','productivity'..)|
   |     frequency    TEXT ('daily' | 'weekly' | 'monthly')      |
   |     target_value NUMERIC (e.g., 8, 2, 30)                   |
   |     unit         TEXT (e.g., "hours", "glasses", "mins")    |
   |     is_active    BOOLEAN (Default: TRUE)                    |
   |                                                             |
   | CONSTRAINT: UNIQUE(user_id, name)                           |
   +------------------------------+------------------------------+
                                  |
                                  | 1 : N (ON DELETE CASCADE)
                                  v
   +-------------------------------------------------------------+
   |                     public.habit_logs                       |
   |-------------------------------------------------------------|
   | PK  id                UUID                                  |
   | FK  habit_id          UUID ---> FK to public.habits.id      |
   | FK  user_id           UUID ---> FK to auth.users.id         |
   |     log_date          DATE (e.g., '2026-11-18')             |
   |     actual_value      NUMERIC (Logged value, e.g., 7.5)     |
   |     completion_status BOOLEAN (true if actual >= target)    |
   |     notes             TEXT (Optional user reflection)       |
   |                                                             |
   | CONSTRAINT: UNIQUE(habit_id, log_date) [Idempotent logs]   |
   +-------------------------------------------------------------+

   ADDITIONAL RELATIONAL TABLES (All link to auth.users ON DELETE CASCADE):
   -----------------------------------------------------------------------
   - what_if_chat_messages: (id, user_id, session_id, role, content, category)
   - ai_coach_sessions:     (id, user_id, question, answer, context_type)
   - ai_weekly_insights:    (id, user_id, week_start, summary, highlights[])
   - predictions:           (id, user_id, habit_id, timeframe, predicted_val)
   - saved_simulations:     (id, user_id, name, changes JSONB, result JSONB)
```

---

## 3. Flow 1: Authentication & JWT Life Cycle

```
[ USER ]                     [ FRONTEND ]             [ BACKEND (Express) ]          [ SUPABASE AUTH / DB ]
   |                              |                            |                               |
   |-- 1. Enter email/password -->|                            |                               |
   |   Click "Sign In"            |-- 2. Direct Auth Request ->|                               |
   |                              |   supabase.auth.signInWithPassword()                       |
   |                              |                            |                               |
   |                              |----------------------------+-- 3. Verify bcrypt hash ----->|
   |                              |                            |     Validate credentials      |
   |                              |<---------------------------+-- 4. Returns Session --------|
   |                              |   - access_token (JWT, 1hr)|      { user, access_token,    |
   |                              |   - refresh_token (stored) |        refresh_token }        |
   |                              |                            |                               |
   |                              |-- 5. Store session in      |                               |
   |                              |   localStorage & React     |                               |
   |                              |   state (AuthContext)      |                               |
   |                              |                            |                               |
   |-- 6. Navigate to /dashboard >|                            |                               |
   |                              |-- 7. GET /api/habits ----->|                               |
   |                              |   Header:                  |                               |
   |                              |   Authorization:           |                               |
   |                              |   Bearer <access_token>    |-- 8. authMiddleware() --------|
   |                              |                            |   Extract Bearer token        |
   |                              |                            |   Calls auth.getUser(token) ->|
   |                              |                            |<-- Returns verified user -----|
   |                              |                            |   req.user = { id, email }    |
   |                              |                            |                               |
   |                              |                            |-- 9. Query DB with user_id -->|
   |                              |                            |   SELECT * FROM habits        |
   |                              |                            |   WHERE user_id = req.user.id |
   |                              |                            |<-- 10. Returns isolated data -|
   |                              |<-- 11. JSON Response ------|                               |
   |<-- 12. Render Dashboard -----|                            |                               |
```

---

## 4. Flow 2: Habit Logging & Real-Time Adherence Calculation

```
[ USER ]                      [ Habit Card UI ]                 [ Supabase DB ]
   |                                 |                                 |
   |-- 1. Click "+" Stepper -------->|                                 |
   |   (e.g., Sleep: 7h -> 8h)       |-- 2. OPTIMISTIC UPDATE:         |
   |                                 |   - Immediately updates UI      |
   |                                 |   - Recalculates Progress       |
   |                                 |   - Color flips to green        |
   |                                 |                                 |
   |                                 |-- 3. UPSERT habit_logs -------->|
   |                                 |   INSERT INTO habit_logs        |
   |                                 |     (habit_id, user_id,         |
   |                                 |      log_date, actual_value)    |
   |                                 |   ON CONFLICT (habit_id, date)  |
   |                                 |   DO UPDATE SET actual_value=8  |
   |                                 |<-- 4. DB Confirm (200 OK) ------|
```

### Mathematical Adherence Formula:
$$\text{Daily Progress \%} = \frac{\sum_{i=1}^{N} \min\left(\frac{\text{actual}_i}{\text{target}_i}, 1.0\right)}{N} \times 100$$

- **Why `min(actual / target, 1.0)`?**: If a user targets 2 liters of water and drinks 4 liters, that habit is $100\%$ complete. It is capped at $1.0$ so over-performance in one habit does not artificially inflate or mask unfinished habits.

---

## 5. Flow 3: The Prediction Engine (Deterministic Math)

The prediction engine is **not** an unpredictable LLM hallucination. It is a **deterministic mathematical system** implemented in `backend/src/services/prediction-engine/calculations.ts`.

```
                  +----------------------------------------------+
                  |         USER HABIT LOGS (Last 30-90 Days)    |
                  +----------------------+-----------------------+
                                         |
                                         v
                  +----------------------------------------------+
                  |               PROFILE BUILDER                |
                  | Groups habits into 5 scientific pillars:     |
                  +----------------------+-----------------------+
                                         |
         +---------------+---------------+---------------+---------------+
         |               |               |               |               |
         v               v               v               v               v
   +-----------+   +-----------+   +-----------+   +-----------+   +-----------+
   |  HEALTH   |   | ACADEMIC  |   |  DIGITAL  |   | FINANCIAL |   | PERSONAL  |
   |  PILLAR   |   |  CAREER   |   | WELLBEING |   |DISCIPLINE |   |  GROWTH   |
   |-----------|   |-----------|   |-----------|   |-----------|   |-----------|
   |Sleep (0.6)|   |Consist 0.4|   |Screen 0.5 |   |Spend  0.4 |   |Divers 0.35|
   |Exerc (0.4)|   |Study   0.3|   |Focus  0.5 |   |Savings0.3 |   |Social 0.35|
   |           |   |Retent  0.3|   |           |   |Emerg  0.3 |   |Resil  0.30|
   +-----+-----+   +-----+-----+   +-----+-----+   +-----+-----+   +-----+-----+
         |               |               |               |               |
         +---------------+---------------+---------------+---------------+
                                         |
                                         v
                  +----------------------------------------------+
                  |            PROJECTION CALCULATOR             |
                  | Computes:                                    |
                  | 1. Baseline Path (Current Adherence)         |
                  | 2. Optimized Path (Target Adherence >= 85%)  |
                  | 3. Compounding Curves (6-Month & 5-Year)     |
                  | 4. Uncertainty Bands (+/- Confidence Margin) |
                  +----------------------+-----------------------+
                                         |
                                         v
                  +----------------------------------------------+
                  | OUTPUT JSON:                                 |
                  | - Overall Health Index (0-100)               |
                  | - Knowledge Retention / Projected Study Hrs  |
                  | - Projected Savings / Focus Capacity         |
                  | - Trajectory: 'improving' | 'declining'      |
                  +----------------------------------------------+
```

---

## 6. Flow 4: Context-Injected AI Coach (RAG Pipeline)

```
[ USER ]                           [ BACKEND AI SERVICE ]                  [ GEMINI 2.5 FLASH ]
   |                                          |                                     |
   |-- 1. "How do I maintain                  |                                     |
   |       my streak while traveling?" ------>|                                     |
   |                                          |-- 2. FETCH REAL CONTEXT:            |
   |                                          |   - User's Habits: Sleep, Exercise  |
   |                                          |   - Current Streak: 14 days         |
   |                                          |   - Lowest Adherence: Morning Run   |
   |                                          |                                     |
   |                                          |-- 3. PROMPT BUILDER:                |
   |                                          |   System: "You are Future You AI."  |
   |                                          |   Context: { habits, streak, logs } |
   |                                          |   Rule: "Never invent numbers."     |
   |                                          |                                     |
   |                                          |-- 4. POST gemini-2.5-flash -------->|
   |                                          |      with structured prompt         |
   |                                          |<-- 5. Natural Language Advice ------|
   |                                          |                                     |
   |                                          |-- 6. RESPONSE VALIDATOR:            |
   |                                          |   - Sanitizes formatting            |
   |                                          |   - Verifies against hallucinations |
   |                                          |   (If API fails: Fallback Engine)   |
   |                                          |                                     |
   |<-- 7. Returns Actionable Advice ---------|                                     |
   |       Renders in chat with green badge   |                                     |
```

---

## 7. Flow 5: The Hybrid Charting Architecture

```
                    WHERE DOES EACH CHART LIVE?
                    ---------------------------

       +-------------------------------------------------------+
       |                  BOTANICAL DASHBOARD                  |
       |  (WeeklyInsightsCard, DailyProgressCard, Consistency) |
       +---------------------------+---------------------------+
                                   |
                                   v
             [ PURE SVG VECTOR MATH + FRAMER MOTION ]
             - Zero external dependencies on dashboard
             - 100% Mobile Responsive (ZERO horizontal scroll)
             - 16-Week adaptive mobile squircle grid
             - Stroke-dashoffset SVG circular progress gauges
             - Smooth cubic-bezier SVG paths with linear gradients

                                   vs

       +-------------------------------------------------------+
       |                 PREDICTIONS / DIGITAL TWIN            |
       |                    (Predictions.tsx)                  |
       +---------------------------+---------------------------+
                                   |
                                   v
                      [ RECHARTS LIBRARY (^2.15.4) ]
             - Multi-line dense comparative trajectories
             - LineChart, ResponsiveContainer, XAxis, YAxis
             - Compares Current Path vs 5-Year Improved Path
             - Custom dark-mode tooltips in index.css
```

---

## 8. Quick Viva / Interview Cheat Sheet

| Question | Winning Technical Answer |
| :--- | :--- |
| **"Where is user data stored and isolated?"** | "In Supabase PostgreSQL. Every record contains `user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE`. Multi-tenancy is enforced on both the backend via `req.user.id` query filtering and at the database level via PostgreSQL Row Level Security (RLS) policies." |
| **"How does JWT work in this app?"** | "When a user signs in, Supabase GoTrue issues an RS256/HS256 signed JWT with a 1-hour expiration and a refresh token. The frontend includes this in the `Authorization: Bearer <token>` header. Our backend `authMiddleware` verifies the cryptographic signature against Supabase and attaches `req.user`." |
| **"Is the prediction engine AI-generated?"** | "No, the prediction engine is a deterministic mathematical model built in pure TypeScript (`calculations.ts`). It weights habits across 5 behavioral pillars and computes compounding growth curves. The LLM (Gemini 2.5) is only used downstream to interpret the math into natural coaching advice." |
| **"How do you prevent the AI from hallucinating?"** | "We use structured context injection (RAG). Before calling Gemini, we query the user's actual database logs (streak, 7-day adherence, habit completion counts) and inject this as verified JSON into the system prompt with strict instructions not to invent data." |
| **"How did you make the app responsive on mobile?"** | "We eliminated horizontal overflow by applying `overflow-x: hidden; max-width: 100vw` globally, converting category lists to `flex-wrap`, and replacing the rigid 52-week desktop heatmap with an adaptive 16-week squircle view using `flex-1 min-w-0` on mobile." |
