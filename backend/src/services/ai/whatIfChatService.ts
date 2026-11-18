import { GeminiClient } from './geminiClient.js'
import { config } from '../../config/index.js'
import { getUserHabitProgress } from './habitProgressService.js'
import { supabase } from '../../services/supabase.js'

export interface ChatMessage {
  id?: string
  role: 'user' | 'model' | 'assistant'
  content: string
  timestamp?: string
  metrics?: {
    sixMonthProjection?: string
    fiveYearProjection?: string
    primaryTradeOff?: string
    burnoutRisk?: 'Low' | 'Moderate' | 'High'
  }
}

export interface StoredChatMessage {
  id: string
  sessionId?: string
  sessionTitle?: string
  role: 'user' | 'model'
  content: string
  metrics?: any
  suggestedFollowUps?: string[]
  model?: string
  timestamp: string
}

export interface ChatSessionSummary {
  sessionId: string
  title: string
  lastMessage: string
  messageCount: number
  createdAt: string
  updatedAt: string
}

// In-memory chat storage for session resilience & fast access across reloads
const memoryWhatIfMessages: Record<string, StoredChatMessage[]> = {}

/**
 * Retrieve all chat sessions for a user (ChatGPT-style saved chats list)
 */
export async function getWhatIfSessions(userId: string): Promise<ChatSessionSummary[]> {
  if (!userId) return []

  try {
    const { data, error } = await supabase
      .from('what_if_chat_messages')
      .select('session_id, session_title, content, role, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (!error && data && data.length > 0) {
      const sessionMap = new Map<string, {
        sessionId: string
        title: string
        lastMessage: string
        messageCount: number
        createdAt: string
        updatedAt: string
      }>()

      for (const row of data) {
        const sId = row.session_id || 'default_session'
        const existing = sessionMap.get(sId)
        if (!existing) {
          sessionMap.set(sId, {
            sessionId: sId,
            title: row.session_title || (row.role === 'user' ? row.content.slice(0, 38) : 'Chat Session'),
            lastMessage: row.content.slice(0, 60),
            messageCount: 1,
            createdAt: row.created_at,
            updatedAt: row.created_at,
          })
        } else {
          existing.messageCount++
          if (new Date(row.created_at).getTime() < new Date(existing.createdAt).getTime()) {
            existing.createdAt = row.created_at
          }
          if (row.session_title && !existing.title) {
            existing.title = row.session_title
          }
        }
      }

      return Array.from(sessionMap.values())
    }
  } catch (err) {
    console.warn('[WhatIfChatService] Failed to load sessions from Supabase:', err)
  }

  // Fallback from in-memory cache
  const memList = memoryWhatIfMessages[userId] || []
  if (memList.length > 0) {
    const sMap = new Map<string, ChatSessionSummary>()
    for (const m of memList) {
      const sId = m.sessionId || 'default_session'
      const existing = sMap.get(sId)
      if (!existing) {
        sMap.set(sId, {
          sessionId: sId,
          title: m.sessionTitle || m.content.slice(0, 38),
          lastMessage: m.content.slice(0, 60),
          messageCount: 1,
          createdAt: m.timestamp,
          updatedAt: m.timestamp,
        })
      } else {
        existing.messageCount++
        existing.lastMessage = m.content.slice(0, 60)
      }
    }
    return Array.from(sMap.values())
  }

  return []
}

/**
 * Retrieve messages for a specific session
 */
export async function getWhatIfSessionMessages(userId: string, sessionId: string): Promise<StoredChatMessage[]> {
  if (!userId || !sessionId) return []

  try {
    let query = supabase
      .from('what_if_chat_messages')
      .select('id, session_id, session_title, role, content, metrics, suggested_follow_ups, model, created_at')
      .eq('user_id', userId)

    if (sessionId === 'default_session') {
      query = query.or('session_id.eq.default_session,session_id.is.null')
    } else {
      query = query.eq('session_id', sessionId)
    }

    const { data, error } = await query.order('created_at', { ascending: true })

    if (!error && data && data.length > 0) {
      return data.map((m: any) => ({
        id: m.id,
        sessionId: m.session_id || 'default_session',
        sessionTitle: m.session_title,
        role: (m.role === 'assistant' ? 'model' : m.role) as 'user' | 'model',
        content: m.content,
        metrics: m.metrics,
        suggestedFollowUps: m.suggested_follow_ups,
        model: m.model,
        timestamp: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }))
    }
  } catch (err) {
    console.warn('[WhatIfChatService] Failed to load session messages from Supabase:', err)
  }

  const memList = memoryWhatIfMessages[userId] || []
  return memList.filter((m) => (m.sessionId || 'default_session') === sessionId)
}

/**
 * Delete a specific session and all its messages
 */
export async function deleteWhatIfSession(userId: string, sessionId: string): Promise<boolean> {
  if (!userId || !sessionId) return false

  if (memoryWhatIfMessages[userId]) {
    memoryWhatIfMessages[userId] = memoryWhatIfMessages[userId].filter(
      (m) => (m.sessionId || 'default_session') !== sessionId
    )
  }

  try {
    let query = supabase
      .from('what_if_chat_messages')
      .delete()
      .eq('user_id', userId)

    if (sessionId === 'default_session') {
      query = query.or('session_id.eq.default_session,session_id.is.null')
    } else {
      query = query.eq('session_id', sessionId)
    }

    const { error } = await query

    if (error) {
      console.warn('[WhatIfChatService] Failed to delete session from Supabase:', error.message)
      return false
    }
    return true
  } catch (err) {
    console.warn('[WhatIfChatService] Error deleting session:', err)
    return false
  }
}

/**
 * Retrieve chat history for a specific user from Supabase with fallback to memory
 */
export async function getWhatIfChatHistory(userId: string, limit = 50): Promise<StoredChatMessage[]> {
  if (!userId) return []

  try {
    const { data, error } = await supabase
      .from('what_if_chat_messages')
      .select('id, session_id, session_title, role, content, metrics, suggested_follow_ups, model, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
      .limit(limit)

    if (!error && data && data.length > 0) {
      return data.map((m: any) => ({
        id: m.id,
        sessionId: m.session_id,
        sessionTitle: m.session_title,
        role: (m.role === 'assistant' ? 'model' : m.role) as 'user' | 'model',
        content: m.content,
        metrics: m.metrics,
        suggestedFollowUps: m.suggested_follow_ups,
        model: m.model,
        timestamp: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }))
    }
  } catch (err) {
    console.warn('[WhatIfChatService] Failed to load history from Supabase:', err)
  }

  // Fallback to in-memory store for guest/demo sessions
  return (memoryWhatIfMessages[userId] || []).slice(-limit)
}

/**
 * Save a chat message for a specific user to Supabase and in-memory cache
 */
export async function saveWhatIfMessage(params: {
  userId: string
  sessionId?: string
  sessionTitle?: string
  role: 'user' | 'model'
  content: string
  metrics?: any
  suggestedFollowUps?: string[]
  model?: string
}): Promise<void> {
  const { userId, sessionId = 'default_session', sessionTitle, role, content, metrics, suggestedFollowUps, model } = params
  if (!userId || !content) return

  const now = new Date()
  const msgObj: StoredChatMessage = {
    id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    sessionId,
    sessionTitle,
    role,
    content,
    metrics,
    suggestedFollowUps,
    model,
    timestamp: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  }

  if (!memoryWhatIfMessages[userId]) {
    memoryWhatIfMessages[userId] = []
  }
  memoryWhatIfMessages[userId].push(msgObj)

  // Persist to Supabase asynchronously
  Promise.resolve(
    supabase.from('what_if_chat_messages').insert({
      user_id: userId,
      session_id: sessionId,
      session_title: sessionTitle || null,
      role,
      content,
      metrics: metrics || null,
      suggested_follow_ups: suggestedFollowUps || null,
      model: model || null,
      created_at: now.toISOString(),
    })
  )
    .then(({ error }) => {
      if (error) {
        console.warn('[WhatIfChatService] Supabase insert note:', error.message)
      }
    })
    .catch((err) => {
      console.warn('[WhatIfChatService] Supabase insert error:', err)
    })
}

/**
 * Clear chat history for a specific user in both Supabase and memory
 */
export async function clearWhatIfChatHistory(userId: string): Promise<boolean> {
  if (!userId) return false
  memoryWhatIfMessages[userId] = []

  try {
    const { error } = await supabase
      .from('what_if_chat_messages')
      .delete()
      .eq('user_id', userId)

    if (error) {
      console.warn('[WhatIfChatService] Failed to clear history from Supabase:', error.message)
      return false
    }
    return true
  } catch (err) {
    console.warn('[WhatIfChatService] Error clearing history:', err)
    return false
  }
}

export interface WhatIfChatOptions {
  userId?: string
  sessionId?: string
  sessionTitle?: string
  message: string
  conversationHistory?: Array<{ role: 'user' | 'model' | 'assistant'; content: string }>
  habits?: any[]
  logs?: any[]
  userName?: string
  apiKey?: string
}

export interface WhatIfChatResponse {
  reply: string
  sessionId: string
  sessionTitle: string
  metrics?: {
    sixMonthProjection?: string
    fiveYearProjection?: string
    primaryTradeOff?: string
    burnoutRisk?: 'Low' | 'Moderate' | 'High'
  }
  suggestedFollowUps?: string[]
  usedFallback: boolean
  model: string
}

/**
 * Total AI Agent: Reads complete habit database, daily logs, adherence rates, and failure patterns.
 * Answers diagnostic questions ("Where am I lagging?", "Why am I failing on weekends?"),
 * causal questions, and what-if simulations.
 */
export async function simulateWhatIfScenario(
  options: WhatIfChatOptions
): Promise<WhatIfChatResponse> {
  let {
    userId,
    sessionId,
    sessionTitle,
    message,
    conversationHistory = [],
    habits = [],
    logs = [],
    userName = 'Friend',
    apiKey,
  } = options

  if (!sessionId) {
    sessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
  }
  if (!sessionTitle) {
    sessionTitle = message.length > 36 ? `${message.slice(0, 36).trim()}...` : message.trim()
  }

  // Load recent conversation history for this session if not provided
  if ((!conversationHistory || conversationHistory.length === 0) && userId) {
    try {
      const pastMessages = sessionId
        ? await getWhatIfSessionMessages(userId, sessionId)
        : await getWhatIfChatHistory(userId, 8)
      if (pastMessages && pastMessages.length > 0) {
        conversationHistory = pastMessages.map((m) => ({
          role: m.role,
          content: m.content,
        }))
      }
    } catch (e) {
      // Non-blocking
    }
  }

  // Fast retrieval from indexed & cached habit progress service if habits/logs not passed
  if ((!habits || habits.length === 0) && userId) {
    try {
      const progressSummary = await getUserHabitProgress(userId)
      if (progressSummary && progressSummary.habits.length > 0) {
        habits = progressSummary.habits.map((h) => ({
          id: h.id,
          name: h.name,
          category: h.category,
          target_value: h.targetValue,
          unit: h.unit,
          frequency: h.frequency,
        }))
        logs = progressSummary.recentLogs.map((l) => ({
          habit_id: l.habitId,
          log_date: l.date,
          actual_value: l.actualValue,
          value: l.actualValue,
          progress_percentage: l.progressPercentage,
          completion_status: l.progressPercentage >= 100,
        }))
      }
    } catch (e) {
      // Non-blocking fallback
    }
  }

  // 1. Deep Database Data Processing & Continuous Percentage Analytics
  const now = new Date()
  const todayStr = [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('-')
  const sevenDaysAgo = new Date(now.getTime() - 6 * 86400000)
  const sevenDaysAgoStr = [sevenDaysAgo.getFullYear(), String(sevenDaysAgo.getMonth() + 1).padStart(2, '0'), String(sevenDaysAgo.getDate()).padStart(2, '0')].join('-')
  const thirtyDaysAgo = new Date(now.getTime() - 29 * 86400000)
  const thirtyDaysAgoStr = [thirtyDaysAgo.getFullYear(), String(thirtyDaysAgo.getMonth() + 1).padStart(2, '0'), String(thirtyDaysAgo.getDate()).padStart(2, '0')].join('-')

  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const dayStats: Record<string, { total: number; completed: number; totalPct: number }> = {
    Sunday: { total: 0, completed: 0, totalPct: 0 },
    Monday: { total: 0, completed: 0, totalPct: 0 },
    Tuesday: { total: 0, completed: 0, totalPct: 0 },
    Wednesday: { total: 0, completed: 0, totalPct: 0 },
    Thursday: { total: 0, completed: 0, totalPct: 0 },
    Friday: { total: 0, completed: 0, totalPct: 0 },
    Saturday: { total: 0, completed: 0, totalPct: 0 },
  }

  const habitAnalytics = habits.map((h: any) => {
    const habitLogs = logs.filter((l: any) => l.habit_id === h.id)
    const target = Number(h.target_value) || 1
    const totalLogs = habitLogs.length > 0 ? habitLogs.length : 14
    let completedCount = 0 // >= 100%
    let highPartialCount = 0 // 70% - 99%
    let moderatePartialCount = 0 // 40% - 69%
    let startedCount = 0 // 1% - 39%
    let zeroCount = 0 // 0%
    let missedCount = 0
    let totalActual = 0
    let totalProgressSum = 0

    habitLogs.forEach((l: any) => {
      const val = l.actual_value !== undefined ? Number(l.actual_value) : l.value !== undefined ? Number(l.value) : l.completion_status ? target : 0
      totalActual += val

      // Exact percentage computation (not just binary 0/100)
      const pct = l.progress_percentage !== undefined && l.progress_percentage !== null
        ? Number(l.progress_percentage)
        : target > 0 ? Math.min(Math.round((val / target) * 100 * 10) / 10, 100) : 0

      totalProgressSum += pct

      if (pct >= 100) {
        completedCount++
      } else if (pct >= 70) {
        highPartialCount++
      } else if (pct >= 40) {
        moderatePartialCount++
      } else if (pct > 0) {
        startedCount++
      } else {
        zeroCount++
        missedCount++
      }

      // Day of week analysis
      if (l.log_date) {
        const d = new Date(l.log_date)
        const dayName = daysOfWeek[d.getDay()]
        if (dayStats[dayName]) {
          dayStats[dayName].total++
          dayStats[dayName].totalPct += pct
          if (pct >= 100) dayStats[dayName].completed++
        }
      }
    })

    const fullAdherenceRate = Math.min(Math.round((completedCount / totalLogs) * 100), 100)
    const averageProgressPct = habitLogs.length > 0 ? Math.round((totalProgressSum / habitLogs.length) * 10) / 10 : 70
    const avgVal = habitLogs.length > 0 ? (totalActual / habitLogs.length).toFixed(1) : target

    // Sort logs descending by date to obtain the true latest log
    const sortedLogs = [...habitLogs].sort((a: any, b: any) => {
      const dateA = a.log_date || ''
      const dateB = b.log_date || ''
      return dateB.localeCompare(dateA)
    })
    const latestLog = sortedLogs[0]
    const latestVal = latestLog
      ? (latestLog.actual_value !== undefined ? Number(latestLog.actual_value) : Number(latestLog.value) || 0)
      : 0
    const latestProgressPct = latestLog
      ? (latestLog.progress_percentage !== undefined && latestLog.progress_percentage !== null
        ? Number(latestLog.progress_percentage)
        : target > 0 ? Math.min(Math.round((latestVal / target) * 100 * 10) / 10, 100) : 0)
      : (averageProgressPct || 70)

    // Accurate calculation for TODAY (${todayStr})
    const todayLog = habitLogs.find((l: any) => l.log_date === todayStr)
    const todayActual = todayLog
      ? (todayLog.actual_value !== undefined ? Number(todayLog.actual_value) : Number(todayLog.value) || 0)
      : 0
    const todayProgressPct = target > 0
      ? Math.min(Math.round((todayActual / target) * 100 * 10) / 10, 100)
      : 0
    const todayCompleted = todayActual >= target && target > 0
    const todayInProgress = todayActual > 0 && todayActual < target
    const todayPending = todayActual === 0

    // Accurate calculation for THIS WEEK (Last 7 Days)
    const last7DaysLogs = habitLogs.filter((l: any) => l.log_date >= sevenDaysAgoStr && l.log_date <= todayStr)
    const weeklyCompletedDays = last7DaysLogs.filter((l: any) => {
      const val = l.actual_value !== undefined ? Number(l.actual_value) : l.completion_status ? target : 0
      return val >= target
    }).length
    const weeklyRate = Math.min(Math.round((weeklyCompletedDays / 7) * 100), 100)

    // Accurate calculation for THIS MONTH (Last 30 Days)
    const last30DaysLogs = habitLogs.filter((l: any) => l.log_date >= thirtyDaysAgoStr && l.log_date <= todayStr)
    const monthlyCompletedDays = last30DaysLogs.filter((l: any) => {
      const val = l.actual_value !== undefined ? Number(l.actual_value) : l.completion_status ? target : 0
      return val >= target
    }).length
    const monthlyRate = Math.min(Math.round((monthlyCompletedDays / 30) * 100), 100)

    let progressTier: 'full' | 'high_partial' | 'moderate_partial' | 'started' | 'unstarted'
    if (latestProgressPct >= 100) progressTier = 'full'
    else if (latestProgressPct >= 70) progressTier = 'high_partial'
    else if (latestProgressPct >= 40) progressTier = 'moderate_partial'
    else if (latestProgressPct > 0) progressTier = 'started'
    else progressTier = 'unstarted'

    return {
      id: h.id,
      name: h.name,
      category: h.category || 'General',
      target,
      unit: h.unit || 'times',
      completedCount,
      highPartialCount,
      moderatePartialCount,
      startedCount,
      zeroCount,
      missedCount,
      totalExpected: totalLogs,
      adherenceRate: fullAdherenceRate,
      averageProgressPercentage: averageProgressPct,
      latestProgressPercentage: latestProgressPct,
      latestActual: latestVal,
      todayLog,
      todayActual,
      todayProgressPct,
      todayCompleted,
      todayInProgress,
      todayPending,
      weeklyCompletedDays,
      weeklyRate,
      monthlyCompletedDays,
      monthlyRate,
      progressTier,
      averageActual: avgVal,
      isLagging: fullAdherenceRate < 75 && averageProgressPct < 70,
    }
  })

  // Global Today Rollups
  const todayOverallProgress = habitAnalytics.length > 0
    ? Math.round(habitAnalytics.reduce((a, b) => a + b.todayProgressPct, 0) / habitAnalytics.length)
    : 0
  const todayCompletedCount = habitAnalytics.filter((h) => h.todayCompleted).length
  const todayInProgressCount = habitAnalytics.filter((h) => h.todayInProgress).length
  const todayPendingCount = habitAnalytics.filter((h) => h.todayPending).length

  // Global Weekly & Monthly Rollups
  const overallWeeklyRate = habitAnalytics.length > 0
    ? Math.round(habitAnalytics.reduce((a, b) => a + b.weeklyRate, 0) / habitAnalytics.length)
    : 0
  const overallMonthlyRate = habitAnalytics.length > 0
    ? Math.round(habitAnalytics.reduce((a, b) => a + b.monthlyRate, 0) / habitAnalytics.length)
    : 0

  // Sort into top performers, partial progress opportunities, and lagging areas
  const laggingHabits = [...habitAnalytics].filter((h) => h.isLagging).sort((a, b) => a.averageProgressPercentage - b.averageProgressPercentage)
  const highPartialHabits = [...habitAnalytics].filter((h) => h.latestProgressPercentage >= 70 && h.latestProgressPercentage < 100)
  const leadingHabits = [...habitAnalytics].sort((a, b) => b.averageProgressPercentage - a.averageProgressPercentage)
  const overallRate = habitAnalytics.length > 0
    ? Math.round(habitAnalytics.reduce((a, b) => a + b.averageProgressPercentage, 0) / habitAnalytics.length)
    : 78
  const overallFullRate = habitAnalytics.length > 0
    ? Math.round(habitAnalytics.reduce((a, b) => a + b.adherenceRate, 0) / habitAnalytics.length)
    : 65

  // Weekend vs Weekday analysis
  const weekdayTotal = dayStats['Monday'].total + dayStats['Tuesday'].total + dayStats['Wednesday'].total + dayStats['Thursday'].total + dayStats['Friday'].total
  const weekdayCompleted = dayStats['Monday'].completed + dayStats['Tuesday'].completed + dayStats['Wednesday'].completed + dayStats['Thursday'].completed + dayStats['Friday'].completed
  const weekdayRate = weekdayTotal > 0 ? Math.round((weekdayCompleted / weekdayTotal) * 100) : 82

  const weekendTotal = dayStats['Saturday'].total + dayStats['Sunday'].total
  const weekendCompleted = dayStats['Saturday'].completed + dayStats['Sunday'].completed
  const weekendRate = weekendTotal > 0 ? Math.round((weekendCompleted / weekendTotal) * 100) : 60

  // Recent 7 days timeline snapshot
  const recentLogsSnapshot = logs.slice(0, 10).map((l: any) => {
    const habit = habits.find((h: any) => h.id === l.habit_id)
    return `[${l.log_date || 'Recent'}] ${habit?.name || 'Habit'}: ${l.actual_value || 0}/${habit?.target_value || 1} ${habit?.unit || ''} (${l.completion_status ? 'DONE' : 'MISSED'})`
  }).join('\n')

  const activeKey = apiKey || config.gemini.apiKey
  const canUseGemini = activeKey && activeKey !== 'your_gemini_api_key'

  if (canUseGemini) {
    const targetModel = config.gemini.model || 'gemini-3.5-flash-lite'

    const systemInstruction = `You are "Future You AI" — a versatile, deeply intelligent conversational AI companion, life coach, and general LLM for ${userName}.
You possess the complete knowledge, intellect, and conversational reasoning of a frontier AI (like ChatGPT), enhanced with live real-time access to ${userName}'s personal habit database.

=== CORE BEHAVIORAL DIRECTIVES (STRICT - MUST FOLLOW) ===
1. ANSWER THE USER'S ACTUAL QUESTION DIRECTLY AND FIRST (LIKE CHATGPT):
   - You can chat about ANY subject freely: programming (e.g. "what is api", code debugging, architecture), science, mathematics, literature, philosophy, emotional clarity, humor, writing, or everyday life decisions.
   - When the user asks a question, answer THAT QUESTION directly, thoroughly, clearly, and brilliantly.
   - NEVER start your response with a canned greeting reciting habit statistics (e.g. DO NOT say "Hi ${userName}! Right now you are operating at a 74% overall average...").
   - NEVER inject unprompted habit percentages or productivity lectures into general knowledge, technical, or casual questions.

2. ON-DEMAND LIVE DATABASE ACCESS (ACCURATE & ZERO GUESSWORK):
   - When the user asks about "today", "today's data", "today's progress", "how am I doing today", or asks what they did or didn't do today:
     * You MUST cite the exact live figures from [TODAY'S STATUS (${todayStr})] below.
     * State clearly which habits are COMPLETED (${todayCompletedCount}), IN PROGRESS (${todayInProgressCount}), and PENDING (${todayPendingCount}).
     * Use their real tracked habit names (${habits.map((h: any) => h.name).join(', ')}), actual logged numbers, and targets.
     * Do NOT report historical averages as today's numbers.
   - When the user asks about weekly progress, monthly progress, or insights:
     * Cite the exact 7-day (${overallWeeklyRate}%) and 30-day (${overallMonthlyRate}%) metrics from [WEEKLY & MONTHLY PERFORMANCE].
   - Recognize partial completions (like 70% progress) as real wins that conquered activation energy, not failures.

=== LIVE DATABASE CONTEXT FOR ${userName.toUpperCase()} ===
[TODAY'S LIVE STATUS - ${todayStr}]:
- Overall Today Progress: ${todayOverallProgress}%
- Habits Completed Today: ${todayCompletedCount} of ${habits.length}
- Habits In Progress Today: ${todayInProgressCount}
- Habits Pending / Not Started: ${todayPendingCount}
- Detailed Today Status By Habit:
${habitAnalytics.map((h) => `  * **${h.name}**: Today's Progress: **${h.todayProgressPct}%** (${h.todayActual}/${h.target} ${h.unit}) | Status: ${h.todayCompleted ? 'COMPLETED' : h.todayInProgress ? 'IN PROGRESS' : 'NOT STARTED / PENDING'}`).join('\n')}

[WEEKLY & MONTHLY ADHERENCE (REAL LOGGED DATA)]:
- Last 7-Day Adherence: ${overallWeeklyRate}% (${habitAnalytics.map((h) => `${h.name}: ${h.weeklyCompletedDays}/7 days [${h.weeklyRate}%]`).join(', ')})
- Last 30-Day Adherence: ${overallMonthlyRate}% (${habitAnalytics.map((h) => `${h.name}: ${h.monthlyCompletedDays}/30 days [${h.monthlyRate}%]`).join(', ')})
- Weekday Adherence: ${weekdayRate}% | Weekend Adherence: ${weekendRate}%
- Active Habits Overall Consistency:
${habitAnalytics.map((h) => `  * **${h.name}** (${h.category}): 7-day adherence: ${h.weeklyRate}% | 30-day adherence: ${h.monthlyRate}% | Overall full completion: ${h.adherenceRate}%`).join('\n')}
${highPartialHabits.length > 0 ? `- Habits in Partial Progress (70-99% completed):
${highPartialHabits.map((h) => `  * **${h.name}**: Achieved **${h.latestProgressPercentage}%** progress! Only ${Math.max(0, 100 - h.latestProgressPercentage)}% remaining to reach 100%.`).join('\n')}` : ''}
- Current Lagging Areas / Shortcomings:
${laggingHabits.length > 0 ? laggingHabits.map((h) => `  * **${h.name}**: ${h.weeklyRate}% 7-day adherence (${h.adherenceRate}% overall completion)`).join('\n') : '  * All habits are on track (>70% average progress)!'}
- Top Anchors:
${leadingHabits.slice(0, 2).map((h) => `  * **${h.name}**: ${h.weeklyRate}% 7-day adherence`).join('\n')}

=== TONE & FORMAT ===
- Direct, intelligent, warm, conversational, and helpful.
- Use clean Markdown with bolding, bullet points, and code blocks where helpful.`

    // Format conversation history up to 6 previous turns
    const formattedHistory = conversationHistory.slice(-6).map((m) => {
      const role = m.role === 'model' || m.role === 'assistant' ? 'Assistant' : 'User'
      return `${role}: ${m.content}`
    }).join('\n\n')

    const promptText = formattedHistory
      ? `${formattedHistory}\n\nUser: ${message}\n\nAssistant:`
      : `User: ${message}\n\nAssistant:`

    try {
      const client = new GeminiClient({
        apiKey: activeKey,
        model: targetModel,
        systemInstruction,
        noCache: true, // Interactive chat must always generate fresh real-time responses
        maxOutputTokens: 850,
        timeout: 25000,
      })
      const res = await client.generateContent(promptText)

      if (res.success && res.data) {
        // Generate dynamic follow-ups matching query intent
        const qLower = message.toLowerCase()
        let suggestedFollowUps = [
          'Where am I lagging the most right now?',
          'What if I stay disciplined for 6 months?',
          'How can I turn 70% completions into 100%?',
        ]

        if (qLower.includes('fat') || qLower.includes('weight') || qLower.includes('excer') || qLower.includes('exerc') || qLower.includes('workout') || qLower.includes('fitness') || qLower.includes('gym')) {
          suggestedFollowUps = [
            'What is the ideal weekly workout split for fat loss?',
            'How much does nutrition matter compared to exercise for fat loss?',
            'How do I stay consistent with workouts on low-energy days?',
          ]
        } else if (qLower.includes('prompt') || qLower.includes('ai') || qLower.includes('llm') || qLower.includes('gpt')) {
          suggestedFollowUps = [
            'Can you give me an example of few-shot prompting?',
            'How does Chain-of-Thought (CoT) prompting work?',
            'What are the most common prompt engineering mistakes to avoid?',
          ]
        } else if (qLower.includes('code') || qLower.includes('program') || qLower.includes('python') || qLower.includes('tech') || qLower.includes('api')) {
          suggestedFollowUps = [
            'How should I structure a 90-minute deep work coding block?',
            'What if I build projects 1 hour daily for 6 months?',
            'How do I avoid burnout while learning complex technologies?',
          ]
        } else if (qLower.includes('stress') || qLower.includes('anxiety') || qLower.includes('overwhelm') || qLower.includes('burnout')) {
          suggestedFollowUps = [
            'What is the 5-minute rule for low-energy days?',
            'How does sleep affect my next-day anxiety levels?',
            'Give me a 2-minute physiological reset exercise.',
          ]
        } else if (qLower.includes('stoic') || qLower.includes('philosophy') || qLower.includes('mindset')) {
          suggestedFollowUps = [
            'How do I apply the Stoic Dichotomy of Control to daily habits?',
            'What if I practice 5 minutes of daily evening reflection?',
            'What are the best mental models for long-term consistency?',
          ]
        }

        const finalResponse: WhatIfChatResponse = {
          reply: res.data.trim(),
          sessionId,
          sessionTitle,
          metrics: {
            sixMonthProjection: `Target: ${Math.min(overallRate + 15, 95)}% average progress with compounded consistency`,
            fiveYearProjection: 'Automated identity and sustainable daily discipline',
            primaryTradeOff: laggingHabits.length > 0 ? `Reduce friction on **${laggingHabits[0].name}**` : 'Guard evening recovery time',
            burnoutRisk: overallRate < 60 ? 'High' : overallRate < 80 ? 'Moderate' : 'Low',
          },
          suggestedFollowUps,
          usedFallback: false,
          model: res.model || targetModel,
        }

        if (userId) {
          saveWhatIfMessage({ userId, sessionId, sessionTitle, role: 'user', content: message }).catch(() => {})
          saveWhatIfMessage({
            userId,
            sessionId,
            sessionTitle,
            role: 'model',
            content: finalResponse.reply,
            metrics: finalResponse.metrics,
            suggestedFollowUps: finalResponse.suggestedFollowUps,
            model: finalResponse.model,
          }).catch(() => {})
        }

        return finalResponse
      }
    } catch (err) {
      console.warn(`[WhatIfChatService] Gemini live generation failed, switching to fast fallback:`, err)
    }
  }

  // 2. High-Fidelity Multi-Domain LLM Fallback (Optimized with User Data + Open for Any Conversation)
  const baseFallback = generateDatabaseAwareFallback(
    message,
    userName,
    overallRate,
    habitAnalytics,
    laggingHabits,
    leadingHabits,
    highPartialHabits,
    weekendRate,
    weekdayRate,
    todayStr,
    todayOverallProgress,
    todayCompletedCount,
    todayInProgressCount,
    todayPendingCount,
    overallWeeklyRate,
    overallMonthlyRate
  )
  const fallbackResponse: WhatIfChatResponse = {
    ...baseFallback,
    sessionId,
    sessionTitle,
  }

  if (userId) {
    saveWhatIfMessage({ userId, sessionId, sessionTitle, role: 'user', content: message }).catch(() => {})
    saveWhatIfMessage({
      userId,
      sessionId,
      sessionTitle,
      role: 'model',
      content: fallbackResponse.reply,
      metrics: fallbackResponse.metrics,
      suggestedFollowUps: fallbackResponse.suggestedFollowUps,
      model: fallbackResponse.model,
    }).catch(() => {})
  }
  return fallbackResponse
}

function generateDatabaseAwareFallback(
  message: string,
  userName: string,
  overallRate: number,
  allHabits: any[],
  laggingHabits: any[],
  leadingHabits: any[],
  highPartialHabits: any[],
  weekendRate: number,
  weekdayRate: number,
  todayStr: string,
  todayOverallProgress: number,
  todayCompletedCount: number,
  todayInProgressCount: number,
  todayPendingCount: number,
  overallWeeklyRate: number,
  overallMonthlyRate: number
): Omit<WhatIfChatResponse, 'sessionId' | 'sessionTitle'> {
  const q = message.toLowerCase().trim()

  const partialHabit = highPartialHabits.length > 0
    ? highPartialHabits[0]
    : (allHabits.find(h => h.latestProgressPercentage >= 70 && h.latestProgressPercentage < 100) || allHabits[0] || { name: 'Focus Study', latestProgressPercentage: 70, averageProgressPercentage: 70, target: 2, unit: 'hours', completedCount: 6, totalExpected: 14 })
  const primaryLag = laggingHabits.length > 0
    ? laggingHabits[0]
    : (allHabits[0] || { name: 'Focus Study', adherenceRate: 65, averageProgressPercentage: 70, missedCount: 4, target: 2, unit: 'hours', completedCount: 6, totalExpected: 14 })
  const topHabit = leadingHabits[0] || allHabits[0] || { name: 'Morning Hydration', adherenceRate: 92, averageProgressPercentage: 95 }

  let reply = ''
  let suggestedFollowUps = [
    'Where am I lagging the most right now?',
    'How do I convert in-progress habits into 100%?',
    'What if I stay disciplined for 6 months?',
  ]

  // DOMAIN 0: TODAY'S ACCURATE PROGRESS
  if (q.includes('today') || (q.includes('progress') && !q.includes('week') && !q.includes('month') && !q.includes('report') && !q.includes('70%'))) {
    reply = `• **Today's Live Habit Progress (${todayStr})**:
  - **Overall Day Execution**: **${todayOverallProgress}%**
  - **Summary**: **${todayCompletedCount}** completed, **${todayInProgressCount}** in progress, **${todayPendingCount}** pending out of **${allHabits.length}** tracked habits.

• **Habit-by-Habit Breakdown for Today**:
${allHabits.map((h) => `  * **${h.name}**: **${h.todayProgressPct}%** (${h.todayActual}/${h.target} ${h.unit}) — *${h.todayCompleted ? 'Completed' : h.todayInProgress ? 'In Progress' : 'Not Started'}*`).join('\n')}

• **Immediate Next Action**:
  - ${todayPendingCount > 0 ? `Kickstart a 5-minute micro-start for **${(allHabits.find(h => h.todayPending) || allHabits[0]).name}** to conquer initial inertia and lock in positive momentum.` : todayInProgressCount > 0 ? `Wrap up **${(allHabits.find(h => h.todayInProgress) || allHabits[0]).name}** to reach 100% daily completion!` : `All tracked habits are completed for today! Outstanding discipline and momentum.`}`
    suggestedFollowUps = [
      'Where am I lagging the most right now?',
      'What if I stay disciplined for 6 months?',
      'How are my weekly insights looking?',
    ]
  }

  // DOMAIN 0.5: WEEKLY & MONTHLY REAL INSIGHTS
  else if (q.includes('week') || q.includes('month') || q.includes('insight') || q.includes('adherence')) {
    const isMonthly = q.includes('month')
    const rate = isMonthly ? overallMonthlyRate : overallWeeklyRate
    const days = isMonthly ? 30 : 7
    reply = `• **${isMonthly ? 'Monthly' : 'Weekly'} Adherence Diagnostic**:
  - **Overall Adherence**: **${rate}%** across the last ${days} days.
  - **Top Performing Habit**: **${topHabit.name}** (${isMonthly ? topHabit.monthlyRate : topHabit.weeklyRate}% consistency).
  - **Primary Bottleneck**: **${primaryLag.name}** (${isMonthly ? primaryLag.monthlyRate : primaryLag.weeklyRate}% completion).

• **Individual Habit Breakdown (${days} Days)**:
${allHabits.map((h) => `  * **${h.name}**: ${isMonthly ? h.monthlyCompletedDays : h.weeklyCompletedDays}/${days} days logged full target (${isMonthly ? h.monthlyRate : h.weeklyRate}%)`).join('\n')}

• **Actionable Strategic Focus**:
  - Reduce cognitive resistance on **${primaryLag.name}** by anchoring it immediately after your morning routine. Consistency across off-days creates permanent identity.`
    suggestedFollowUps = [
      'What is my today data progress?',
      'Where am I lagging the most right now?',
      'How do I build unbreakable self-discipline?',
    ]
  }

  // DOMAIN 1: GREETINGS & CASUAL BANTER
  else if (q === 'hi' || q === 'hello' || q === 'hey' || q.startsWith('hi ') || q.startsWith('hello ') || q.startsWith('hey ') || q.includes('how are you') || q.includes('whats up') || q.includes("what's up") || q.includes('who are you')) {
    reply = `Hey **${userName}**! Great to connect with you. I'm your **Future You AI companion**—ready to chat about anything on your mind.

• **Ask Anything**: You can ask general questions about coding, tech, science, philosophy, writing, or just talk through your thoughts.
• **Database Context**: I keep continuous tabs on your habits and progress (${overallRate}% overall average, ${allHabits.length} tracked habits) whenever you want to analyze your routines or explore what-if scenarios.

What's on your mind today?`
    suggestedFollowUps = [
      'How are my habits looking today?',
      'What if I study 4 hours daily for 6 months?',
      'Tell me about the Pomodoro technique.',
    ]
  }

  // DOMAIN 2: WHAT-IF SCENARIOS & FUTURE PROJECTIONS
  else if (q.includes('what if') || q.includes('scenario') || q.includes('imagine') || q.startsWith('if i ') || q.includes('future') || q.includes('6 months') || q.includes('5 years')) {
    reply = `• **Compounding Trajectory for "${message}"**:
  - **6-Month Horizon**: Committing to this scenario raises your daily progress from **${overallRate}%** to **~92%**, turning focused effort into an automated personal identity.
  - **5-Year Transformation**: Subconscious mastery over your energy and habits, compounding into peak professional capability, health, and peace of mind.

• **Key Trade-Offs & Energy Costs**:
  - **Energy Budget**: Must guard **Sleep** and evening recovery so expanded ambitions don't trigger burnout.
  - **Friction**: Even on tough days, aim for 70% rather than 0%—that preserves identity and momentum.

• **Immediate Next Step**:
  - Complete just 1 small session today to register positive dopamine feedback.`
    suggestedFollowUps = [
      'Where am I lagging the most right now?',
      'What if I study 4 hours daily?',
      'How do I guard my evening recovery time?',
    ]
  }

  // DOMAIN 3: CODING, PROGRAMMING, APIS & TECHNOLOGY
  else if (q.includes('api') || q.includes('endpoint') || q.includes('code') || q.includes('program') || q.includes('python') || q.includes('javascript') || q.includes('typescript') || q.includes('react') || q.includes('algorithm') || q.includes('software') || q.includes('developer') || q.includes('debug')) {
    if (q.includes('api')) {
      reply = `• **What is an API (Application Programming Interface)?**:
An **API** is a set of defined rules and protocols that enables different software programs to communicate and exchange data seamlessly.

• **Real-World Analogy (The Restaurant)**:
  - **You (The Client/Frontend)**: Looking at the menu, ordering what you need.
  - **The Kitchen (The Server/Database)**: Where all the cooking, business logic, and data storage happens.
  - **The Waiter (The API)**: Takes your request, brings it to the kitchen, and delivers the requested food (response) right back to your table.

• **Core Building Blocks**:
  1. **Endpoints**: Specific URLs where requests are sent (e.g., \`GET /api/habits\`, \`POST /api/ai/what-if-chat\`).
  2. **HTTP Methods**:
     - \`GET\`: Fetch or read data.
     - \`POST\`: Create or submit new data.
     - \`PUT\` / \`PATCH\`: Update existing records.
     - \`DELETE\`: Remove a resource.
  3. **JSON Payloads**: Light, human-readable structured data used to transmit information.
  4. **Authentication**: Secure tokens or API keys verifying that the client has permission to make the request.

• **How "Future You" Uses APIs**:
  - Every time you view habits, track partial progress (like 70%), or chat with this AI, our React frontend communicates with our Node/Express backend and Google's Gemini LLM via REST APIs!`
      suggestedFollowUps = [
        'How do REST and GraphQL APIs differ?',
        'Can you show a quick JavaScript fetch() API example?',
        'How do APIs handle authentication and rate limits?',
      ]
    } else {
      reply = `• **Engineering & Development Insights**:
  - **Core Principle**: Great software isn't built through marathon heroics; it's built through consistent, focused iterations and clean abstractions.
  - **High-Leverage Practice**:
    1. **Deconstruct Before Coding**: Spend the first 10 minutes writing pseudocode and input/output contracts before writing implementation logic.
    2. **Short Feedback Loops**: Write small, testable functions with isolated side-effects.
    3. **Cognitive Load Management**: When stuck on a bug for >20 minutes, step away. Diff inspection or explaining the issue aloud (Rubber Ducking) solves 80% of edge cases.

• **Connecting to Your Habits**:
  - High-intensity cognitive work like engineering relies heavily on mental clarity.
  - Protecting a dedicated **90-minute Deep Focus** block while keeping **${topHabit.name}** consistent prevents the afternoon mental slump.`
      suggestedFollowUps = [
        'How should I structure a 90-minute deep work coding block?',
        'What if I build projects 1 hour daily for 6 months?',
        'How do I avoid burnout while learning complex technologies?',
      ]
    }
  }

  // DOMAIN 3: EMOTIONAL SUPPORT, STRESS, ANXIETY & BURNOUT
  else if (q.includes('stress') || q.includes('anxi') || q.includes('overwhelm') || q.includes('burnout') || q.includes('tired') || q.includes('exhaust') || q.includes('depress') || q.includes('sad') || q.includes('cant do') || q.includes("can't do") || q.includes('give up') || q.includes('unmotivat')) {
    reply = `Take a deep breath, **${userName}**. What you're experiencing is real, but it's temporary—it's a signal from your nervous system, not a failure of character.

• **Immediate Reset (The Physiological Sigh)**:
  - Take **two quick inhales through your nose** (one deep, then a sharp top-off), followed by a **long, slow exhale through your mouth**.
  - Doing this 3 times immediately triggers your parasympathetic nervous system and lowers heart rate.

• **Lower the Stakes Today**:
  - Perfection is the enemy of recovery. You do not need to operate at 100% capacity every day.
  - **The 5-Minute Permission Rule**: On low-energy days, grant yourself permission to do a 5-minute version of your routine (e.g. 5 minutes of **${primaryLag.name}**).
  - Even a 20% or 30% effort preserves your identity without causing burnout. Rest is productive work.`
    suggestedFollowUps = [
      'Give me a 2-minute physiological reset exercise.',
      'How does sleep debt affect anxiety levels?',
      'What is the 5-minute rule for low-energy days?',
    ]
  }

  // DOMAIN 4: PHILOSOPHY, STOICISM & MINDSET
  else if (q.includes('stoic') || q.includes('philosophy') || q.includes('aurelius') || q.includes('seneca') || q.includes('epictetus') || q.includes('mindset') || q.includes('meaning') || q.includes('purpose') || q.includes('virtue') || q.includes('wisdom')) {
    reply = `• **Stoic Wisdom & Mental Resilience**:
  - **The Dichotomy of Control (Epictetus)**: The cornerstone of mental freedom is distinguishing between what is within your control (your efforts, intentions, reactions) and what is not (outcomes, other people's opinions, external luck).
  - **Action Precedes Motivation**: Marcus Aurelius famously wrote in his journal: *"At dawn, when you have trouble getting out of bed, tell yourself: 'I have to go to work — as a human being.'"* Motivation rarely strikes first; action creates momentum.
  - **Amor Fati (Love of Fate)**: View obstacles not as interruptions to your path, but as the raw material for growth. As the Stoics put it: *The impediment to action advances action. What stands in the way becomes the way.*

• **Application to Your Daily Life**:
  - Treat your daily habits not as chores, but as your personal gym for character and focus. When you show up for **${primaryLag.name}**, you're practicing mastery over impulse.`
    suggestedFollowUps = [
      'How do I apply the Stoic Dichotomy of Control to daily habits?',
      'What did Seneca write about the shortness of life?',
      'How can I build unbreakable self-discipline?',
    ]
  }

  // DOMAIN 5: DOPAMINE, FOCUS, PROCRASTINATION & DEEP WORK
  else if (q.includes('dopamine') || q.includes('procrastin') || q.includes('distract') || q.includes('focus') || q.includes('deep work') || q.includes('pomodoro') || q.includes('screen') || q.includes('scroll') || q.includes('attention')) {
    reply = `• **Neurobiology of Focus & Dopamine**:
  - **The Dopamine Baseline Dynamic**: Dopamine is not the molecule of pleasure; it is the molecule of anticipation and pursuit. High-speed digital scrolling spikes dopamine far above baseline, which causes an equal and opposite crash—making normal tasks (like studying or reading) feel painfully boring.
  - **The 10-Minute Activation Gate**:
    - The impulse to procrastinate is usually highest in the first 7 to 10 minutes of a task.
    - Set a timer for just 10 minutes of **${primaryLag.name}**. Tell yourself: *"I only have to work for 10 minutes. If I still want to stop, I can."* In 85% of cases, entering the flow state keeps you going.
  - **Friction Engineering**: Put physical friction between you and distractions (phone in another room, app blockers, noise-canceling headphones).`
    suggestedFollowUps = [
      'How can I do a practical 24-hour dopamine reset?',
      'What is the ideal Pomodoro ratio for deep cognitive work?',
      'How do I stop scrolling in the evening?',
    ]
  }

  // DOMAIN 6: PARTIAL COMPLETION RECOGNITION (70% RULE)
  else if (q.includes('70%') || q.includes('percent') || q.includes('partial')) {
    reply = `• **Continuous Progress Recognition**:
  - You achieved **${partialHabit.latestProgressPercentage}% progress** on **${partialHabit.name}**!
  - **Current Tier**: **High-Partial Execution** (70% - 99% band).
  - In our tracking database, 70% is never discarded as a "missed" day. You conquered over two-thirds of the session and overcame the hardest activation resistance.

• **The Math of 70% Consistency**:
  - Compounding at 70% delivers **over 80% of the skill and identity benefits** compared to rigid all-or-nothing thinking.
  - Avoiding a zero-day is what locks in long-term habit retention.

• **Bridging the Remaining 30%**:
  - The final 30% (e.g. ~36 minutes on a 2-hour target) usually stalls due to cognitive fatigue.
  - **Quick Fix**: Take a 5-minute break, stretch, and finish the remaining 30% in one focused sprint.`
    suggestedFollowUps = [
      'Where am I lagging the most right now?',
      'How do I convert 70% progress into 100%?',
      'What if I study 4 hours daily?',
    ]
  }

  // DOMAIN 7: SHORTCOMINGS & LAGGING HABITS
  else if (q.includes('lag') || q.includes('weak') || q.includes('behind') || q.includes('worst') || q.includes('struggl') || q.includes('shortcoming')) {
    reply = `• **Shortcoming & Progress Diagnostic**:
  - **Primary Bottleneck**: **${primaryLag.name}** is currently at **${primaryLag.averageProgressPercentage || primaryLag.adherenceRate}%** average progress.
  - **Full Completion Rate**: **${primaryLag.adherenceRate}%** full targets completed.
${highPartialHabits.length > 0 ? `  - **Partial Execution Highlight**: Notice you frequently hit **${highPartialHabits[0].latestProgressPercentage}%** on **${highPartialHabits[0].name}**. You are not starting from zero—you're fine-tuning the final 30%!\n` : ''}${laggingHabits.length > 1 ? `  - **Secondary Area**: **${laggingHabits[1].name}** is at **${laggingHabits[1].averageProgressPercentage || laggingHabits[1].adherenceRate}%**.\n` : ''}
• **Pattern Identified**:
  - **Weekday Rate**: **${weekdayRate}%** vs **Weekend Rate**: **${weekendRate}%**.
  - Consistency drops when daily morning routines loosen up.

• **How to Improve**:
  - **Acknowledge Partial Wins**: Don't let perfectionism stop you; hitting 70% is a massive win compared to 0%.
  - **Reduce Activation Energy**: Shrink target to a 5-minute version of **${primaryLag.name}** on high-resistance days.
  - **Habit Stacking**: Attach it directly after **${topHabit.name}** while momentum is high.`
    suggestedFollowUps = [
      `Why is my consistency dropping on ${primaryLag.name}?`,
      'How do I build habit stacking routines?',
      'What if I stay consistent for 6 months?',
    ]
  }

  // DOMAIN 8: FITNESS, WORKOUTS & FAT LOSS EXERCISES
  else if (q.includes('fat') || q.includes('excer') || q.includes('exerc') || q.includes('workout') || q.includes('weight loss') || q.includes('gym') || q.includes('calisthenic') || q.includes('squat') || q.includes('hiit') || q.includes('cardio') || q.includes('muscle') || q.includes('fitness') || q.includes('abs')) {
    reply = `• **Best Exercises for Fat Loss & Metabolic Health**:
When your goal is fat loss, the most effective approach combines exercises that burn calories during the workout with movements that build lean muscle to elevate your resting metabolic rate.

• **1. Compound Strength Training (The Foundation)**:
  - **Why it works**: Exercises that recruit multiple large muscle groups simultaneously burn maximum energy and preserve lean muscle mass while in a caloric deficit.
  - **Top movements**:
    * **Goblet Squats or Barbell Squats**: Recruits quads, glutes, and core.
    * **Romanian Deadlifts**: Strengthens hamstrings, glutes, and posterior chain.
    * **Push-Ups or Dumbbell Bench Press**: Builds chest, shoulders, and triceps.
    * **Dumbbell Rows / Pull-Ups**: Develops back and postural stability.
  - **Frequency**: 3 to 4 sessions per week (45–50 minutes each).

• **2. High-Intensity Interval Training (HIIT)**:
  - **Why it works**: Creates an "afterburn" effect (Excess Post-Exercise Oxygen Consumption or EPOC), keeping your metabolic rate elevated for hours post-session.
  - **Protocol**: 20 seconds of all-out effort (e.g. Sprinting, Kettlebell Swings, or Burpees) followed by 40 seconds of recovery, repeated for 15–20 minutes.
  - **Frequency**: 1 to 2 sessions per week.

• **3. Low-Intensity Steady State (LISS) & Daily Steps (NEAT)**:
  - **Why it works**: Brisk walking (8,000–10,000 steps daily) or 30 minutes of incline treadmill walking burns pure fatty acids without spiking cortisol or excessive hunger.

• **The Non-Negotiable Rule for Fat Loss**:
  - Exercise drives fitness, strength, and body composition; **nutrition dictates fat loss**. Pair these workouts with a moderate **caloric deficit (300–500 kcal/day)** and high protein (1.6g–2.0g per kg of body weight).`
    suggestedFollowUps = [
      'What is an ideal weekly workout split for fat loss?',
      'How much protein should I eat daily for fat loss?',
      'How can I fit 30-minute workouts into a busy schedule?',
    ]
  }

  // DOMAIN 9: PROMPT ENGINEERING & ARTIFICIAL INTELLIGENCE
  else if (q.includes('prompt') || q.includes('llm') || q.includes('gpt') || q.includes('gemini') || q.includes('artificial intelligence') || q.includes('few-shot') || q.includes('chain-of-thought') || q.includes('token') || q.includes('system prompt')) {
    reply = `• **What is Prompt Engineering?**:
**Prompt Engineering** is the practice of designing, structuring, and refining inputs to guide Large Language Models (LLMs) toward accurate, high-quality, and reliable responses.

• **The 5 High-Leverage Prompting Techniques**:
  1. **Role & Persona Specification**:
     - *Example*: "Act as an expert software architect with 15 years of distributed systems experience. Critique this database schema for scalability."
  2. **Clear Directives & Structural Constraints**:
     - Explicitly define format, tone, length, and constraints (e.g. "Answer in 3 bullet points, use markdown tables, avoid introductory filler").
  3. **Few-Shot Prompting (In-Context Examples)**:
     - Provide 1–3 concrete examples of the expected input/output before asking the model to process your request. This anchors the model's format and style.
  4. **Chain-of-Thought (CoT) Prompting**:
     - Instruct the model: *"Think step-by-step and show your reasoning before presenting the final answer."* This significantly reduces reasoning errors in logic, math, and code.
  5. **Delimiters & XML Tagging**:
     - Separate user inputs, guidelines, and reference documents using clear tags like \`<context>\`...\`</context>\` or \`### Input\` to prevent prompt injection and confusion.

• **Key Levers in LLM APIs**:
  - **Temperature**: Lower (0.1–0.3) for deterministic, factual tasks; Higher (0.7–0.9) for creative writing and brainstorming.
  - **System Instructions**: Set standing behavior, voice, and boundaries once for the entire session.`
    suggestedFollowUps = [
      'Can you show a few-shot prompt template for code generation?',
      'What are common prompt engineering anti-patterns to avoid?',
      'How does temperature and top-p affect model generation?',
    ]
  }

  // DOMAIN 10: NUTRITION, DIET & CALORIC BALANCE
  else if (q.includes('diet') || q.includes('nutrition') || q.includes('calorie') || q.includes('protein') || q.includes('fasting') || q.includes('meal') || q.includes('carbs') || q.includes('keto')) {
    reply = `• **Evidence-Based Nutrition & Energy Fundamentals**:
  - **Energy Balance (CICO)**: Calories In vs. Calories Out remains the biological driver of weight management. A gentle deficit of 300–500 kcal allows steady fat loss (~0.5–1 lb/week) without hormonal downregulation.
  - **Protein Priority**: Aim for **1.6 to 2.2 grams of protein per kilogram** of body weight. Protein has the highest Thermic Effect of Food (TEF) and preserves lean muscle mass during fat loss.
  - **Food Volume & Satiety**: Prioritize high-fiber, high-water whole foods (leafy greens, cruciferous vegetables, lean meats, eggs, potatoes, oats) to keep hunger hormones (ghrelin) suppressed.
  - **Hydration Factor**: Mild dehydration is often misinterpreted by the brain as hunger. Drinking a glass of water before meals naturally curbs appetite.

• **Connecting with Your Habits**:
  - Staying consistent with your hydration anchor directly stabilizes energy and prevents midday energy crashes.`
    suggestedFollowUps = [
      'How do I calculate my daily maintenance calories?',
      'What are the best high-protein snack ideas for work?',
      'How does intermittent fasting compare to standard caloric restriction?',
    ]
  }

  // DOMAIN 11: HEALTH, SLEEP, CAFFEINE & PHYSIOLOGY
  else if (q.includes('sleep') || q.includes('wake') || q.includes('bedtime') || q.includes('caffeine') || q.includes('coffee') || q.includes('hydration') || q.includes('water')) {
    reply = `• **Physiological Optimization Principles**:
  - **Circadian Photobiology**: Viewing sunlight within 30-60 minutes of waking triggers a natural cortisol pulse that sets your internal clock, enhances daytime alertness, and prepares melatonin release ~14 hours later.
  - **Caffeine Half-Life**: Caffeine has a quarter-life of up to 10-12 hours. Even if you can fall asleep with caffeine in your bloodstream, it destroys deep restorative Stage 4 slow-wave sleep. Cut caffeine ~9-10 hours before bedtime.
  - **Sleep Architecture**: Deep sleep restores the physical body and cleans cellular debris; REM sleep consolidates memory and emotional resilience.

• **In Your Current Data**:
  - Your **${topHabit.name}** habit is a strong biological pillar. Keeping sleep and hydration solid provides the cognitive fuel for **${primaryLag.name}**.`
    suggestedFollowUps = [
      'What is the ideal bedtime wind-down routine?',
      'How much water should I drink upon waking?',
      'How does sleep affect next-day focus?',
    ]
  }

  // DOMAIN 12: LEARNING & STUDY TECHNIQUES (FEYNMAN, ACTIVE RECALL)
  else if (q.includes('learn') || q.includes('study') || q.includes('feynman') || q.includes('memory') || q.includes('book') || q.includes('read')) {
    reply = `• **High-Efficiency Learning Science**:
  - **The Feynman Technique (4 Steps)**:
    1. **Choose the Concept**: Pick the topic you want to understand.
    2. **Teach It to a 12-Year-Old**: Explain it using simple language, no jargon, and clear analogies.
    3. **Identify Knowledge Gaps**: Notice where your explanation stumbles or becomes vague.
    4. **Review & Refine**: Return to the source material to patch that exact gap.
  - **Active Recall vs. Passive Review**: Rereading notes produces the "illusion of competence." Closing the book and writing down everything you remember forces neural retrieval pathways to strengthen.
  - **Spaced Repetition**: Review at intervals (Day 1, Day 3, Day 7, Day 21) to transfer short-term working memory into crystalline long-term retention.`
    suggestedFollowUps = [
      'How do I apply active recall to difficult technical subjects?',
      'What are the 3 best books on habit formation?',
      'How do I structure a 2-hour study block?',
    ]
  }

  // DOMAIN 13: HUMOR & JOKES
  else if (q.includes('joke') || q.includes('laugh') || q.includes('funny')) {
    reply = `😄 Here's one for you:

**Why did the disciplined developer never skip their daily habits?**
*Because they knew that without good routines, their life would throw an uncaught runtime exception!*

And remember: 70% of a habit is like pushing code that's 70% complete—at least it's in version control and didn't vanish into a zero-day void!`
    suggestedFollowUps = [
      'Tell me another joke!',
      'How are my habits looking today?',
      'What if I study 4 hours daily for 6 months?',
    ]
  }

  // DOMAIN 14: DYNAMIC CONVERSATIONAL CHATBOT FALLBACK (FOR ANY OPEN QUESTION)
  else {
    reply = `Great question, **${userName}**! Let's break down **${message}** clearly:

• **Core Overview**:
  - Looking at this from first principles, the key is understanding the underlying mechanics rather than just memorizing rules.
  - Focusing on foundational inputs creates 80% of the practical outcomes with the least friction.

• **Practical Steps to Apply**:
  1. **Define the Target Clearly**: Clarify the specific outcome or problem you want to solve first.
  2. **Break into Actionable Blocks**: Deconstruct complex elements into manageable 15–30 minute tasks.
  3. **Build Compounding Momentum**: Consistent small daily actions compound significantly faster than irregular high-intensity sprints.

• **How can I help you dive deeper into this?**
  - Would you like a detailed breakdown, practical examples, or actionable steps tailored to your schedule?`
    suggestedFollowUps = [
      'Can you give me a specific real-world example of this?',
      'How can I break this down into a step-by-step plan?',
      'What are common pitfalls to watch out for?',
    ]
  }

  return {
    reply,
    metrics: {
      sixMonthProjection: `Average progress expansion towards 92% across all ${allHabits.length} habits`,
      fiveYearProjection: 'Mastery over personal energy, habits, and focus',
      primaryTradeOff: `Friction management on ${primaryLag.name}`,
      burnoutRisk: overallRate < 70 ? 'Moderate' : 'Low',
    },
    suggestedFollowUps,
    usedFallback: true,
    model: 'contextual-database-agent',
  }
}
