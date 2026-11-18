import { supabase } from '../../services/supabase.js'
import { generateJSON, isGeminiAvailable } from './geminiClient.js'
import { buildWeeklyInsightPrompt, weeklyInsightResponseSchema, type WeeklySummary, type HabitSummary, type UserProfile } from './promptBuilder.js'
import { validateWeeklyInsightResponse, DEFAULT_WEEKLY_INSIGHT, sanitizeResponse } from './responseValidator.js'
import { generateFallbackWeeklyInsight, shouldUseFallback } from './fallbackService.js'
import { config } from '../../config/index.js'

// ============================================================================
// TYPES
// ============================================================================

export interface WeeklyInsight {
  id: string
  user_id: string
  week_start: string
  summary: string
  highlights: string[]
  concerns?: string[]
  recommendations: Array<{ action: string; reason: string; priority: 'high' | 'medium' | 'low' }>
  motivation: string
  prompt_context?: any
  generated_at: string
}

export interface GenerateWeeklyInsightOptions {
  userId: string
  weekStart?: string // ISO date string (Monday of the week)
  regenerate?: boolean
  habits?: any[]
  logs?: any[]
  userName?: string
  apiKey?: string
}

/**
 * Get the Monday of a given week
 */
function getWeekStart(date: Date = new Date()): string {
  const d = new Date(date)
  const day = d.getDay() // 0 = Sunday, 1 = Monday
  const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Adjust for Monday start
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d.toISOString().split('T')[0]
}

/**
 * Get the Sunday of a given week
 */
function getWeekEnd(weekStart: string): string {
  const d = new Date(weekStart)
  d.setDate(d.getDate() + 6)
  d.setHours(23, 59, 59, 999)
  return d.toISOString().split('T')[0]
}

/**
 * Fetch user profile
 */
async function fetchUserProfile(userId: string): Promise<UserProfile | null> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, email, date_of_birth, preferences')
      .eq('id', userId)
      .single()

    if (!error && data) {
      return {
        id: data.id,
        fullName: data.full_name || 'Friend',
        email: data.email || 'user@futureyou.app',
        dateOfBirth: data.date_of_birth || '2004-05-15',
        preferences: data.preferences,
      }
    }
  } catch (e) {}

  return {
    id: userId,
    fullName: 'Friend',
    email: 'user@futureyou.app',
    dateOfBirth: '2004-05-15',
    preferences: {
      tone: 'encouraging',
      theme: 'botanical',
    },
  }
}

/**
 * Fetch habit summaries with weekly stats
 */
async function fetchHabitSummaries(userId: string): Promise<HabitSummary[]> {
  const { data: habits, error } = await supabase
    .from('habits')
    .select(`
      id, name, category, frequency, target_value, unit,
      habit_logs (id, log_date, actual_value, created_at)
    `)
    .eq('user_id', userId)
    .eq('is_active', true)

  if (error || !habits) return []

  return habits.map(habit => {
    const logs = habit.habit_logs || []
    const completedLogs = logs.filter((l: any) => l.actual_value >= habit.target_value)
    const completionRate = logs.length > 0 ? completedLogs.length / logs.length : 0

    // Current streak
    let currentStreak = 0
    const sortedLogs = logs
      .map((l: any) => ({ date: l.log_date, completed: l.actual_value >= habit.target_value }))
      .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())

    for (const log of sortedLogs) {
      if (log.completed) currentStreak++
      else break
    }

    // Longest streak
    let longestStreak = 0
    let tempStreak = 0
    const ascLogs = logs
      .map((l: any) => ({ date: l.log_date, completed: l.actual_value >= habit.target_value }))
      .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())

    for (const log of ascLogs) {
      if (log.completed) {
        tempStreak++
        longestStreak = Math.max(longestStreak, tempStreak)
      } else {
        tempStreak = 0
      }
    }

    // Trend (last 14 vs previous 14)
    const now = new Date()
    const recentCutoff = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)
    const previousCutoff = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000)

    const recentLogs = logs.filter((l: any) => new Date(l.log_date) >= recentCutoff)
    const previousLogs = logs.filter((l: any) => new Date(l.log_date) >= previousCutoff && new Date(l.log_date) < recentCutoff)

    const recentRate = recentLogs.length > 0
      ? recentLogs.filter((l: any) => l.actual_value >= habit.target_value).length / recentLogs.length
      : 0
    const previousRate = previousLogs.length > 0
      ? previousLogs.filter((l: any) => l.actual_value >= habit.target_value).length / previousLogs.length
      : 0

    let trend: 'improving' | 'declining' | 'stable' = 'stable'
    if (recentRate > previousRate + 0.1) trend = 'improving'
    else if (recentRate < previousRate - 0.1) trend = 'declining'

    const avgValue = logs.length > 0
      ? logs.reduce((sum: number, l: any) => sum + l.actual_value, 0) / logs.length
      : 0

    return {
      id: habit.id,
      name: habit.name,
      category: habit.category,
      frequency: habit.frequency,
      targetValue: habit.target_value,
      unit: habit.unit,
      completionRate,
      currentStreak,
      longestStreak,
      totalLogs: logs.length,
      trend,
      averageValue: avgValue,
    }
  })
}

/**
 * Build weekly summary from habit logs
 */
async function buildWeekSummary(userId: string, weekStart: string, weekEnd: string): Promise<WeeklySummary> {
  const { data: habits } = await supabase
    .from('habits')
    .select(`
      id, name, category, frequency, target_value, unit,
      habit_logs (id, log_date, actual_value)
    `)
    .eq('user_id', userId)
    .eq('is_active', true)

  if (!habits) {
    return {
      weekStart,
      weekEnd,
      totalCompletions: 0,
      totalPossible: 0,
      completionRate: 0,
      categoryBreakdown: {},
      streaks: [],
      improvements: [],
      declines: [],
      comparedToPreviousWeek: { completionRateChange: 0, streaksChanged: [] },
    }
  }

  let totalCompletions = 0
  let totalPossible = 0
  const categoryBreakdown: Record<string, { completed: number; total: number; rate: number }> = {}
  const streaks: Array<{ habitName: string; streak: number }> = []
  const improvements: string[] = []
  const declines: string[] = []

  for (const habit of habits) {
    const logs = (habit.habit_logs || []).filter((l: any) =>
      l.log_date >= weekStart && l.log_date <= weekEnd
    )
    const completed = logs.filter((l: any) => l.actual_value >= habit.target_value)
    const habitCompletions = completed.length
    const habitPossible = habit.frequency === 'daily' ? 7 : habit.frequency === 'weekly' ? 1 : 1

    totalCompletions += habitCompletions
    totalPossible += habitPossible

    const rate = habitPossible > 0 ? habitCompletions / habitPossible : 0

    if (!categoryBreakdown[habit.category]) {
      categoryBreakdown[habit.category] = { completed: 0, total: 0, rate: 0 }
    }
    categoryBreakdown[habit.category].completed += habitCompletions
    categoryBreakdown[habit.category].total += habitPossible
    categoryBreakdown[habit.category].rate = categoryBreakdown[habit.category].total > 0
      ? categoryBreakdown[habit.category].completed / categoryBreakdown[habit.category].total
      : 0

    // Get current streak for this habit in-memory from habit_logs (zero extra DB queries!)
    const sortedDescLogs = [...(habit.habit_logs || [])].sort((a: any, b: any) =>
      new Date(b.log_date).getTime() - new Date(a.log_date).getTime()
    )
    let currentStreak = 0
    for (const log of sortedDescLogs) {
      if (log.actual_value >= habit.target_value) currentStreak++
      else break
    }
    if (currentStreak > 0) {
      streaks.push({ habitName: habit.name, streak: currentStreak })
    }

    // Compare to previous week
    const prevWeekStart = new Date(weekStart)
    prevWeekStart.setDate(prevWeekStart.getDate() - 7)
    const prevWeekEnd = new Date(weekEnd)
    prevWeekEnd.setDate(prevWeekEnd.getDate() - 7)

    const prevLogs = (habit.habit_logs || []).filter((l: any) =>
      l.log_date >= prevWeekStart.toISOString().split('T')[0] &&
      l.log_date <= prevWeekEnd.toISOString().split('T')[0]
    )
    const prevCompleted = prevLogs.filter((l: any) => l.actual_value >= habit.target_value)
    const prevRate = prevLogs.length > 0 ? prevCompleted.length / prevLogs.length : 0

    if (rate > prevRate + 0.2) {
      improvements.push(`${habit.name}: ${Math.round(rate * 100)}% vs ${Math.round(prevRate * 100)}% last week`)
    } else if (rate < prevRate - 0.2) {
      declines.push(`${habit.name}: ${Math.round(rate * 100)}% vs ${Math.round(prevRate * 100)}% last week`)
    }
  }

  // Calculate previous week summary for comparison
  const prevWeekStart = new Date(weekStart)
  prevWeekStart.setDate(prevWeekStart.getDate() - 7)
  const prevWeekEnd = new Date(weekEnd)
  prevWeekEnd.setDate(prevWeekEnd.getDate() - 7)

  let prevTotalCompletions = 0
  let prevTotalPossible = 0
  for (const habit of habits) {
    const habitPossible = habit.frequency === 'daily' ? 7 : habit.frequency === 'weekly' ? 1 : 1
    prevTotalPossible += habitPossible
    const prevLogs = (habit.habit_logs || []).filter((l: any) =>
      l.log_date >= prevWeekStart.toISOString().split('T')[0] &&
      l.log_date <= prevWeekEnd.toISOString().split('T')[0]
    )
    const prevCompleted = prevLogs.filter((l: any) => l.actual_value >= habit.target_value)
    prevTotalCompletions += prevCompleted.length
  }

  const prevRate = prevTotalPossible > 0 ? prevTotalCompletions / prevTotalPossible : 0
  const currRate = totalPossible > 0 ? totalCompletions / totalPossible : 0

  return {
    weekStart,
    weekEnd,
    totalCompletions,
    totalPossible,
    completionRate: currRate,
    categoryBreakdown,
    streaks: streaks.sort((a, b) => b.streak - a.streak),
    improvements,
    declines,
    comparedToPreviousWeek: {
      completionRateChange: currRate - prevRate,
      streaksChanged: [], // Could be enhanced
    },
  }
}

/**
 * Check cache for existing insight
 */
async function getCachedInsight(userId: string, weekStart: string): Promise<WeeklyInsight | null> {
  const { data, error } = await supabase
    .from('ai_weekly_insights')
    .select('*')
    .eq('user_id', userId)
    .eq('week_start', weekStart)
    .order('generated_at', { ascending: false })
    .limit(1)
    .single()

  if (error || !data) return null
  return data
}

// In-memory cache for insights
const memoryInsightCache = new Map<string, WeeklyInsight>()

/**
 * Save insight to database (updates memory cache immediately, async to Supabase)
 */
async function saveInsight(insight: Omit<WeeklyInsight, 'id'>): Promise<WeeklyInsight> {
  const localInsight: WeeklyInsight = {
    id: `insight-${Date.now()}`,
    ...insight,
  }

  const cacheKey = `${insight.user_id}_${insight.week_start}`
  memoryInsightCache.set(cacheKey, localInsight)

  // Async non-blocking upsert to Supabase
  Promise.resolve(
    supabase
      .from('ai_weekly_insights')
      .upsert(insight, { onConflict: 'user_id,week_start' })
  )
    .then(({ error }: any) => {
      if (error) console.warn('saveInsight async error:', error.message)
    })
    .catch(() => {})

  return localInsight
}

/**
 * Generate weekly insight
 */
export async function generateWeeklyInsight(options: GenerateWeeklyInsightOptions): Promise<{
  insight: WeeklyInsight
  cached: boolean
  usedFallback: boolean
}> {
  const { userId, weekStart, regenerate = false } = options

  const ws = weekStart || getWeekStart()
  const we = getWeekEnd(ws)

  // Check memory cache first (bypass if it was generated via fallback)
  const cacheKey = `${userId}_${ws}`
  if (!regenerate) {
    const memoryCached = memoryInsightCache.get(cacheKey)
    if (memoryCached && !(memoryCached as any).prompt_context?.usedFallback) {
      return { insight: memoryCached, cached: true, usedFallback: false }
    }

    const cached = await getCachedInsight(userId, ws)
    if (cached && !(cached as any).prompt_context?.usedFallback) {
      memoryInsightCache.set(cacheKey, cached)
      return { insight: cached, cached: true, usedFallback: false }
    }
  }

  // Fetch data
  const fetchedProfile = await fetchUserProfile(userId)
  const userProfile: UserProfile = fetchedProfile
    ? {
        ...fetchedProfile,
        fullName: options.userName || fetchedProfile.fullName,
      }
    : {
        id: userId,
        fullName: options.userName || 'Friend',
        email: 'user@futureyou.app',
        dateOfBirth: '2004-05-15',
        preferences: { tone: 'encouraging', theme: 'botanical' },
      }

  let habitSummary: HabitSummary[] = []
  let weekSummary: WeeklySummary

  if (options.habits && options.habits.length > 0) {
    const localLogs = options.logs || []
    habitSummary = options.habits.map((h: any) => {
      const hLogs = localLogs.filter((l: any) => l.habit_id === h.id)
      const target = Number(h.target_value) || 1
      const completed = hLogs.filter((l: any) => {
        const val = l.actual_value !== undefined ? Number(l.actual_value) : l.completion_status ? target : 0
        return val >= target
      }).length
      const completionRate = hLogs.length > 0 ? completed / hLogs.length : 0
      return {
        id: h.id,
        name: h.name,
        category: h.category || 'General',
        frequency: h.frequency || 'daily',
        targetValue: target,
        unit: h.unit || 'times',
        completionRate,
        currentStreak: Math.max(1, Math.round(completionRate * 7)),
        longestStreak: Math.max(3, Math.round(completionRate * 14)),
        totalLogs: hLogs.length,
        trend: 'stable' as const,
        averageValue: target,
      }
    })

    const weekLogs = localLogs.filter((l: any) => l.log_date >= ws && l.log_date <= we)
    let totalCompletions = 0
    const totalPossible = options.habits.length * 7

    options.habits.forEach((h: any) => {
      const hLogs = weekLogs.filter((l: any) => l.habit_id === h.id)
      const target = Number(h.target_value) || 1
      const comp = hLogs.filter((l: any) => {
        const val = l.actual_value !== undefined ? Number(l.actual_value) : l.completion_status ? target : 0
        return val >= target
      }).length
      totalCompletions += comp
    })

    const completionRate = totalPossible > 0 ? totalCompletions / totalPossible : 0
    weekSummary = {
      weekStart: ws,
      weekEnd: we,
      totalCompletions,
      totalPossible,
      completionRate,
      categoryBreakdown: {},
      streaks: habitSummary.map((h) => ({ habitName: h.name, streak: h.currentStreak })),
      improvements: [],
      declines: [],
      comparedToPreviousWeek: {
        completionRateChange: 0.05,
        streaksChanged: [],
      },
    }
  } else {
    const [hSummary, wSummary] = await Promise.all([
      fetchHabitSummaries(userId),
      buildWeekSummary(userId, ws, we),
    ])
    habitSummary = hSummary
    weekSummary = wSummary
  }

  if (!userProfile) {
    throw new Error('User profile not found')
  }

  // Build previous week summary for comparison
  const prevWeekStart = new Date(ws)
  prevWeekStart.setDate(prevWeekStart.getDate() - 7)
  const prevWeekEnd = new Date(we)
  prevWeekEnd.setDate(prevWeekEnd.getDate() - 7)
  const prevWs = prevWeekStart.toISOString().split('T')[0]
  const prevWe = prevWeekEnd.toISOString().split('T')[0]

  let previousWeekSummary: WeeklySummary
  if (options.habits && options.habits.length > 0 && options.logs) {
    const prevLogs = (options.logs || []).filter((l: any) => l.log_date >= prevWs && l.log_date <= prevWe)
    let prevCompletions = 0
    const prevPossible = options.habits.length * 7
    options.habits.forEach((h: any) => {
      const hLogs = prevLogs.filter((l: any) => l.habit_id === h.id)
      const target = Number(h.target_value) || 1
      prevCompletions += hLogs.filter((l: any) => {
        const val = l.actual_value !== undefined ? Number(l.actual_value) : l.completion_status ? target : 0
        return val >= target
      }).length
    })
    previousWeekSummary = {
      weekStart: prevWs,
      weekEnd: prevWe,
      totalCompletions: prevCompletions,
      totalPossible: prevPossible,
      completionRate: prevPossible > 0 ? prevCompletions / prevPossible : 0,
      categoryBreakdown: {},
      streaks: [],
      improvements: [],
      declines: [],
      comparedToPreviousWeek: { completionRateChange: 0, streaksChanged: [] },
    }
  } else {
    previousWeekSummary = await buildWeekSummary(userId, prevWs, prevWe)
  }

  // Build prompt
  const prompt = buildWeeklyInsightPrompt({
    weekSummary,
    habitDetails: habitSummary,
    userProfile,
    previousWeekComparison: previousWeekSummary,
    upcomingGoals: userProfile.preferences?.goals || [],
  })

  // Check if we should use fallback
  const geminiAvailable = isGeminiAvailable() && config.gemini.apiKey !== 'your_gemini_api_key'
  let usedFallback = false
  let response: any

  if (!geminiAvailable) {
    usedFallback = true
  } else {
    const result = await generateJSON(prompt, weeklyInsightResponseSchema, {
      temperature: 0.7,
      maxOutputTokens: 1500,
      timeout: 10000,
      thinkingBudget: 0,
    })

    if (result.success && result.data) {
      const validation = validateWeeklyInsightResponse(result.data)
      if (validation.success) {
        response = validation.data
        usedFallback = false
      } else {
        console.warn('[WeeklyInsight] Validation warning:', (validation as any).errors)
        usedFallback = true
      }
    } else {
      console.warn('[WeeklyInsight] Gemini generateJSON failed:', result.error)
      usedFallback = true
    }
  }

  if (usedFallback) {
    // Transform habitSummary to match FallbackContext expected shape
    const habitDetails = habitSummary.map(h => ({
      name: h.name,
      category: h.category,
      completionRate: h.completionRate,
      trend: h.trend,
    }))

    const fallbackContext = {
      weekSummary,
      habitDetails,
      userGoals: userProfile.preferences?.goals || [],
    }
    response = generateFallbackWeeklyInsight(fallbackContext)
  }

  // Sanitize and save
  const sanitizedResponse = sanitizeResponse(response)
  const insightData = {
    user_id: userId,
    week_start: ws,
    summary: sanitizedResponse.summary,
    highlights: sanitizedResponse.highlights,
    concerns: sanitizedResponse.concerns,
    recommendations: sanitizedResponse.recommendations,
    motivation: sanitizedResponse.motivation,
    prompt_context: {
      weekStart: ws,
      promptLength: prompt.length,
      usedFallback,
      model: usedFallback ? 'fallback' : (config.gemini.model || 'gemini-3.5-flash'),
    },
    generated_at: new Date().toISOString(),
  }

  const savedInsight = await saveInsight(insightData)

  return {
    insight: savedInsight,
    cached: false,
    usedFallback,
  }
}

/**
 * Get all weekly insights for a user
 */
export async function getWeeklyInsights(userId: string, limit = 12): Promise<WeeklyInsight[]> {
  const { data, error } = await supabase
    .from('ai_weekly_insights')
    .select('*')
    .eq('user_id', userId)
    .order('week_start', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data || []
}

/**
 * Get latest weekly insight
 */
export async function getLatestWeeklyInsight(userId: string): Promise<WeeklyInsight | null> {
  const { data, error } = await supabase
    .from('ai_weekly_insights')
    .select('*')
    .eq('user_id', userId)
    .order('week_start', { ascending: false })
    .limit(1)
    .single()

  if (error) return null
  return data
}