import { supabase } from './supabase'
import type {
  Habit,
  HabitLog,
  HabitFormData,
  DashboardStats,
  WeeklyDataPoint,
  HeatmapDataPoint,
  UserProfile,
  WeeklyAnalytics,
  MonthlyAnalytics,
  HabitCompletion,
  HabitConsistency,
  StreaksAnalytics,
  LifeImpactScore,
  HabitRipple,
  AverageDailyProgress,
  FutureLetter,
  WeeklyInsight,
  CoachSession,
  HabitRecommendation,
  CoachResponse,
  FutureLetterResponse,
  WeeklyInsightResponse,
  HabitRecommendationsResponse,
  PredictionExplanationResponse,
  UserHabitProgressSummary,
} from '../types'

export const RAW_API = import.meta.env.VITE_API_URL !== undefined
  ? import.meta.env.VITE_API_URL
  : (import.meta.env.PROD ? '' : 'http://localhost:9000')
export const API_BASE = !RAW_API ? '/api' : (RAW_API.endsWith('/api') ? RAW_API : `${RAW_API}/api`)

async function getAuthHeaders(): Promise<HeadersInit> {
  const { data: { session } } = await supabase.auth.getSession()
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  }
  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`
  } else {
    headers['Authorization'] = 'Bearer demo-token'
  }
  return headers
}

async function handleResponse<T>(response: Response): Promise<{ data: T | null; error: string | null }> {
  let data: any = null
  const contentType = response.headers.get('content-type') || ''
  
  if (contentType.includes('application/json')) {
    try {
      data = await response.json()
    } catch {
      data = null
    }
  } else {
    const rawText = await response.text().catch(() => '')
    if (!response.ok) {
      return {
        data: null,
        error: rawText && rawText.length < 200
          ? rawText.trim()
          : `Server error (${response.status} ${response.statusText || 'Internal Error'}). Please check server logs or configuration.`,
      }
    }
  }

  if (!response.ok) {
    return { data: null, error: data?.message || data?.error || `Request failed with status ${response.status}` }
  }
  return { data: data?.data ?? data, error: null }
}

// ============================================================================
// Dashboard API (uses Supabase directly since no backend endpoint yet)
// ============================================================================

export async function fetchDashboardStats(): Promise<{ data: DashboardStats | null; error: string | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { data: null, error: 'Not authenticated' }

    const { data: habits, error: habitsError } = await supabase
      .from('habits')
      .select('id, category, target_value, unit')
      .eq('user_id', user.id)

    if (habitsError) return { data: null, error: habitsError.message }

    const habitIds = habits?.map(h => h.id) || []
    let completionRate = 0
    let activeHabits = habits?.length || 0
    let currentStreak = 0
    let longestStreak = 0

    if (habitIds.length > 0) {
      const { data: logs, error: logsError } = await supabase
        .from('habit_logs')
        .select('habit_id, log_date, actual_value')
        .in('habit_id', habitIds)
        .order('log_date', { ascending: false })
        .limit(1000)

      if (!logsError && logs) {
        // Calculate completion rate (last 7 days)
        const sevenDaysAgo = new Date()
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
        const recentLogs = logs.filter(l => new Date(l.log_date) >= sevenDaysAgo)

        const completionsByDate: Record<string, { completed: number; total: number }> = {}
        for (const log of recentLogs) {
          const habit = habits.find(h => h.id === log.habit_id)
          if (habit && log.actual_value >= habit.target_value * 0.8) {
            if (!completionsByDate[log.log_date]) {
              completionsByDate[log.log_date] = { completed: 0, total: 0 }
            }
            completionsByDate[log.log_date].completed++
          }
          if (!completionsByDate[log.log_date]) {
            completionsByDate[log.log_date] = { completed: 0, total: 0 }
          }
          completionsByDate[log.log_date].total++
        }

        const dates = Object.keys(completionsByDate)
        if (dates.length > 0) {
          const totalCompleted = dates.reduce((sum, d) => sum + completionsByDate[d].completed, 0)
          const totalExpected = dates.reduce((sum, d) => sum + completionsByDate[d].total, 0)
          completionRate = totalExpected > 0 ? Math.round((totalCompleted / totalExpected) * 100) : 0
        }

        // Calculate streaks
        const sortedDates = dates.sort()
        let current = 0
        let longest = 0
        let lastDate: Date | null = null

        for (const dateStr of sortedDates) {
          const date = new Date(dateStr)
          if (lastDate) {
            const diff = Math.floor((date.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24))
            if (diff === 1) {
              current++
            } else if (diff > 1) {
              longest = Math.max(longest, current)
              current = 1
            }
          } else {
            current = 1
          }
          lastDate = date
        }
        longestStreak = Math.max(longest, current)
        currentStreak = current
      }
    }

    // Build category breakdown
    const categoryMap: Record<string, { count: number; completed: number; total: number }> = {}
    if (habitIds.length > 0) {
      const { data: logs } = await supabase
        .from('habit_logs')
        .select('habit_id, log_date, actual_value')
        .in('habit_id', habitIds)
        .gte('log_date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])

      for (const habit of habits || []) {
        if (!categoryMap[habit.category]) {
          categoryMap[habit.category] = { count: 0, completed: 0, total: 0 }
        }
        categoryMap[habit.category].count++
      }

      if (logs) {
        for (const log of logs) {
          const habit = habits.find(h => h.id === log.habit_id)
          if (habit) {
            if (!categoryMap[habit.category]) {
              categoryMap[habit.category] = { count: 0, completed: 0, total: 0 }
            }
            categoryMap[habit.category].total++
            if (log.actual_value >= habit.target_value * 0.8) {
              categoryMap[habit.category].completed++
            }
          }
        }
      }
    }

    const category_breakdown = Object.entries(categoryMap).map(([category, stats]) => ({
      category: category as any,
      count: stats.count,
      completion_rate: stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0,
    }))

    return {
      data: {
        total_habits: activeHabits,
        active_habits: activeHabits,
        completion_rate: completionRate,
        current_streak: currentStreak,
        longest_streak: longestStreak,
        total_logs: 0, // Would need separate query
        category_breakdown,
      },
      error: null,
    }
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

export async function fetchWeeklyData(startDate: string, endDate: string): Promise<{ data: WeeklyDataPoint[] | null; error: string | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { data: null, error: 'Not authenticated' }

    const { data: habits, error: habitsError } = await supabase
      .from('habits')
      .select('id, category, target_value')
      .eq('user_id', user.id)

    if (habitsError) return { data: null, error: habitsError.message }

    const habitIds = habits?.map(h => h.id) || []
    if (habitIds.length === 0) return { data: [], error: null }

    const { data: logs, error: logsError } = await supabase
      .from('habit_logs')
      .select('habit_id, log_date, actual_value')
      .in('habit_id', habitIds)
      .gte('log_date', startDate)
      .lte('log_date', endDate)
      .order('log_date', { ascending: true })

    if (logsError) return { data: null, error: logsError.message }

    // Aggregate by date
    const dailyData: Record<string, { completed: number; total: number }> = {}
    const start = new Date(startDate)
    const end = new Date(endDate)
    const current = new Date(start)

    while (current <= end) {
      const dateStr = current.toISOString().split('T')[0]
      dailyData[dateStr] = { completed: 0, total: 0 }
      current.setDate(current.getDate() + 1)
    }

    for (const log of logs || []) {
      const habit = habits?.find(h => h.id === log.habit_id)
      if (!habit) continue
      if (!dailyData[log.log_date]) dailyData[log.log_date] = { completed: 0, total: 0 }
      dailyData[log.log_date].total++
      if (log.actual_value >= habit.target_value * 0.8) {
        dailyData[log.log_date].completed++
      }
    }

    const result: WeeklyDataPoint[] = Object.entries(dailyData).map(([date, data]) => ({
      date,
      day: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
      completion: data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0,
      target: data.total,
      is_today: date === new Date().toISOString().split('T')[0],
    }))

    return { data: result, error: null }
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

export async function fetchHeatmapData(habitIds: string[], startDate: string, endDate: string): Promise<{ data: HeatmapDataPoint[] | null; error: string | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { data: null, error: 'Not authenticated' }

    const { data: logs, error } = await supabase
      .from('habit_logs')
      .select('habit_id, log_date, actual_value')
      .in('habit_id', habitIds)
      .gte('log_date', startDate)
      .lte('log_date', endDate)

    if (error) return { data: null, error: error.message }

    const { data: habits } = await supabase
      .from('habits')
      .select('id, name, color, target_value')
      .in('id', habitIds)

    const habitMap = new Map((habits || []).map(h => [h.id, { name: h.name, color: h.color, target: h.target_value }]))

    const result: HeatmapDataPoint[] = (logs || []).map(log => {
      const habit = habitMap.get(log.habit_id)
      const target = habit?.target || 1
      return {
        habit_id: log.habit_id,
        habit_name: habit?.name || '',
        habit_color: habit?.color || '#10b981',
        date: log.log_date,
        value: log.actual_value,
        completed: log.actual_value >= target * 0.8,
      }
    })

    return { data: result, error: null }
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

export async function fetchMonthlyData(year: number, month: number): Promise<{ data: WeeklyDataPoint[] | null; error: string | null }> {
  const startDate = new Date(year, month, 1).toISOString().split('T')[0]
  const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0]
  return fetchWeeklyData(startDate, endDate)
}

export async function fetchStreaks(): Promise<{ data: { current: number; longest: number } | null; error: string | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { data: null, error: 'Not authenticated' }

    const { data: habits, error: habitsError } = await supabase
      .from('habits')
      .select('id')
      .eq('user_id', user.id)

    if (habitsError) return { data: null, error: habitsError.message }

    const habitIds = habits?.map(h => h.id) || []
    if (habitIds.length === 0) return { data: { current: 0, longest: 0 }, error: null }

    const { data: logs, error: logsError } = await supabase
      .from('habit_logs')
      .select('habit_id, log_date')
      .in('habit_id', habitIds)
      .order('log_date', { ascending: true })

    if (logsError) return { data: null, error: logsError.message }

    const dates = new Set((logs || []).map(l => l.log_date))
    const sortedDates = Array.from(dates).sort()

    let current = 0
    let longest = 0
    let lastDate: Date | null = null

    for (const dateStr of sortedDates) {
      const date = new Date(dateStr)
      if (lastDate) {
        const diff = Math.floor((date.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24))
        if (diff === 1) {
          current++
        } else if (diff > 1) {
          longest = Math.max(longest, current)
          current = 1
        }
      } else {
        current = 1
      }
      lastDate = date
    }

    return { data: { current, longest: Math.max(longest, current) }, error: null }
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

export async function fetchProfile(): Promise<{ data: UserProfile | null; error: string | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { data: null, error: 'Not authenticated' }

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (error) return { data: null, error: error.message }

    return {
      data: {
        id: data.id,
        email: data.email,
        full_name: data.full_name,
        avatar_url: data.avatar_url,
        date_of_birth: data.date_of_birth,
        timezone: data.timezone || 'UTC',
        preferences: data.preferences,
        created_at: data.created_at,
        updated_at: data.updated_at,
      },
      error: null,
    }
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

// ============================================================================
// Habits API (uses backend API)
// ============================================================================

export async function fetchHabits(): Promise<{ data: Habit[] | null; error: string | null }> {
  try {
    const headers = await getAuthHeaders()
    const response = await fetch(`${API_BASE}/habits`, { method: 'GET', headers })
    return handleResponse<Habit[]>(response)
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

export async function createHabit(habit: HabitFormData): Promise<{ data: Habit | null; error: string | null }> {
  try {
    const headers = await getAuthHeaders()
    const response = await fetch(`${API_BASE}/habits`, {
      method: 'POST',
      headers,
      body: JSON.stringify(habit),
    })
    return handleResponse<Habit>(response)
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

export async function updateHabit(id: string, habit: Partial<HabitFormData>): Promise<{ data: Habit | null; error: string | null }> {
  try {
    const headers = await getAuthHeaders()
    const response = await fetch(`${API_BASE}/habits/${id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(habit),
    })
    return handleResponse<Habit>(response)
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

export async function deleteHabit(id: string): Promise<{ data: null; error: string | null }> {
  try {
    const headers = await getAuthHeaders()
    const response = await fetch(`${API_BASE}/habits/${id}`, { method: 'DELETE', headers })
    return handleResponse<null>(response)
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

export async function fetchHabitLogs(habitId: string, startDate?: string, endDate?: string): Promise<{ data: HabitLog[] | null; error: string | null }> {
  try {
    const headers = await getAuthHeaders()
    const params = new URLSearchParams()
    if (startDate) params.append('startDate', startDate)
    if (endDate) params.append('endDate', endDate)
    const response = await fetch(`${API_BASE}/habits/${habitId}/logs?${params}`, { method: 'GET', headers })
    return handleResponse<HabitLog[]>(response)
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

export async function upsertHabitLog(habitId: string, logDate: string, actualValue: number, notes?: string): Promise<{ data: HabitLog | null; error: string | null }> {
  try {
    const headers = await getAuthHeaders()
    const response = await fetch(`${API_BASE}/habits/${habitId}/logs`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ date: logDate, value: actualValue, actual_value: actualValue, notes }),
    })
    return handleResponse<HabitLog>(response)
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

export async function fetchHabitProgressSummary(): Promise<{ data: UserHabitProgressSummary | null; error: string | null }> {
  try {
    const headers = await getAuthHeaders()
    const response = await fetch(`${API_BASE}/habits/progress-summary`, { method: 'GET', headers })
    return handleResponse<UserHabitProgressSummary>(response)
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

export async function fetchTodaysLogs(date: string): Promise<{ data: HabitLog[] | null; error: string | null }> {
  try {
    const headers = await getAuthHeaders()
    const response = await fetch(`${API_BASE}/habits/logs/today?date=${date}`, { method: 'GET', headers })
    return handleResponse<HabitLog[]>(response)
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

// ============================================================================
// Profile API (uses backend API)
// ============================================================================

export async function updateProfile(profile: Partial<UserProfile>): Promise<{ data: UserProfile | null; error: string | null }> {
  try {
    const headers = await getAuthHeaders()
    const response = await fetch(`${API_BASE}/profile`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(profile),
    })
    return handleResponse<UserProfile>(response)
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

// ============================================================================
// Predictions API (uses backend API)
// ============================================================================

export const predictionsApi = {
  async generate(options?: {
    dateRange?: { start: string; end: string }
    assumptions?: Record<string, unknown>
    minimumDaysForPersonalized?: number
    enableIllustrativeMode?: boolean
  }): Promise<{ data: any; error: string | null }> {
    try {
      const headers = await getAuthHeaders()
      const response = await fetch(`${API_BASE}/predictions/generate`, {
        method: 'POST',
        headers,
        body: JSON.stringify(options),
      })
      return handleResponse(response)
    } catch (err) {
      return { data: null, error: err instanceof Error ? err.message : 'Unknown error' }
    }
  },

  async getCurrent(): Promise<{ data: any; error: string | null }> {
    try {
      const headers = await getAuthHeaders()
      const response = await fetch(`${API_BASE}/predictions/current`, { method: 'GET', headers })
      return handleResponse(response)
    } catch (err) {
      return { data: null, error: err instanceof Error ? err.message : 'Unknown error' }
    }
  },

  async runWhatIf(scenario: {
    id?: string
    name: string
    description: string
    changes: Array<{
      metric: string
      targetValue: number
      timelineMonths?: number
      difficulty?: 'easy' | 'moderate' | 'hard'
    }>
    assumptions?: Record<string, unknown>
  }, baseProfile?: any): Promise<{ data: any; error: string | null }> {
    try {
      const headers = await getAuthHeaders()
      const response = await fetch(`${API_BASE}/predictions/what-if`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ scenario, baseProfile }),
      })
      return handleResponse(response)
    } catch (err) {
      return { data: null, error: err instanceof Error ? err.message : 'Unknown error' }
    }
  },

  async getPredefinedScenarios(): Promise<{ data: any[]; error: string | null }> {
    try {
      const headers = await getAuthHeaders()
      const response = await fetch(`${API_BASE}/predictions/what-if/scenarios`, { method: 'GET', headers })
      const result = await handleResponse<any[]>(response)
      return { data: result.data || [], error: result.error }
    } catch (err) {
      return { data: [], error: err instanceof Error ? err.message : 'Unknown error' }
    }
  },

  async runPredefinedScenario(scenarioId: string): Promise<{ data: any; error: string | null }> {
    try {
      const headers = await getAuthHeaders()
      const response = await fetch(`${API_BASE}/predictions/what-if/predefined`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ scenarioId }),
      })
      return handleResponse(response)
    } catch (err) {
      return { data: null, error: err instanceof Error ? err.message : 'Unknown error' }
    }
  },

  async getMeta(): Promise<{ data: any; error: string | null }> {
    try {
      const headers = await getAuthHeaders()
      const response = await fetch(`${API_BASE}/predictions/meta`, { method: 'GET', headers })
      return handleResponse(response)
    } catch (err) {
      return { data: null, error: err instanceof Error ? err.message : 'Unknown error' }
    }
  },
}

// ============================================================================
// Analytics API (uses Supabase directly with date range parameters)
// ============================================================================

export async function fetchWeeklyAnalytics(startDate: string, endDate: string): Promise<{ data: WeeklyAnalytics | null; error: string | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { data: null, error: 'Not authenticated' }

    const { data: habits, error: habitsError } = await supabase
      .from('habits')
      .select('id, name, category, target_value, unit, color, icon')
      .eq('user_id', user.id)

    if (habitsError) return { data: null, error: habitsError.message }

    const habitIds = habits?.map(h => h.id) || []
    if (habitIds.length === 0) {
      return {
        data: {
          period: { start: startDate, end: endDate },
          dailyCompletion: [],
          totalHabits: 0,
          averageCompletion: 0,
          previousPeriodComparison: { current: 0, previous: 0, change: 0, changePercent: 0 }
        },
        error: null
      }
    }

    const { data: logs, error: logsError } = await supabase
      .from('habit_logs')
      .select('habit_id, log_date, actual_value')
      .in('habit_id', habitIds)
      .gte('log_date', startDate)
      .lte('log_date', endDate)
      .order('log_date', { ascending: true })

    if (logsError) return { data: null, error: logsError.message }

    // Calculate daily completion
    const dailyData: Record<string, { completed: number; total: number }> = {}
    const start = new Date(startDate)
    const end = new Date(endDate)
    const current = new Date(start)

    while (current <= end) {
      const dateStr = current.toISOString().split('T')[0]
      dailyData[dateStr] = { completed: 0, total: 0 }
      current.setDate(current.getDate() + 1)
    }

    for (const log of logs || []) {
      const habit = habits?.find(h => h.id === log.habit_id)
      if (!habit) continue
      if (!dailyData[log.log_date]) dailyData[log.log_date] = { completed: 0, total: 0 }
      dailyData[log.log_date].total++
      if (log.actual_value >= habit.target_value * 0.8) {
        dailyData[log.log_date].completed++
      }
    }

    const dailyCompletion = Object.entries(dailyData).map(([date, data]) => ({
      date,
      day: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
      completed: data.completed,
      total: data.total,
      completionRate: data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0,
    }))

    const totalCompleted = dailyCompletion.reduce((sum, d) => sum + d.completed, 0)
    const totalExpected = dailyCompletion.reduce((sum, d) => sum + d.total, 0)
    const averageCompletion = totalExpected > 0 ? Math.round((totalCompleted / totalExpected) * 100) : 0

    // Previous period comparison
    const prevStart = new Date(startDate)
    prevStart.setDate(prevStart.getDate() - (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24) - 1)
    const prevEnd = new Date(startDate)
    prevEnd.setDate(prevEnd.getDate() - 1)

    const { data: prevLogs } = await supabase
      .from('habit_logs')
      .select('habit_id, log_date, actual_value')
      .in('habit_id', habitIds)
      .gte('log_date', prevStart.toISOString().split('T')[0])
      .lte('log_date', prevEnd.toISOString().split('T')[0])

    let prevCompleted = 0
    let prevTotal = 0
    if (prevLogs) {
      for (const log of prevLogs) {
        const habit = habits?.find(h => h.id === log.habit_id)
        if (!habit) continue
        prevTotal++
        if (log.actual_value >= habit.target_value * 0.8) {
          prevCompleted++
        }
      }
    }

    const prevRate = prevTotal > 0 ? Math.round((prevCompleted / prevTotal) * 100) : 0
    const change = averageCompletion - prevRate
    const changePercent = prevRate > 0 ? Math.round((change / prevRate) * 100) : 0

    return {
      data: {
        period: { start: startDate, end: endDate },
        dailyCompletion,
        totalHabits: habits.length,
        averageCompletion,
        previousPeriodComparison: {
          current: averageCompletion,
          previous: prevRate,
          change,
          changePercent,
        },
      },
      error: null,
    }
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

export async function fetchMonthlyAnalytics(year: number, month: number): Promise<{ data: MonthlyAnalytics | null; error: string | null }> {
  const startDate = new Date(year, month, 1).toISOString().split('T')[0]
  const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0]

  // Get weekly averages for the month
  const { data: weeklyData, error: weeklyError } = await fetchWeeklyAnalytics(startDate, endDate)
  if (weeklyError) return { data: null, error: weeklyError }

  // Group by week
  const weeklyAverages: any[] = []
  if (weeklyData) {
    const weeks: Record<number, { sum: number; count: number }> = {}
    for (const day of weeklyData.dailyCompletion) {
      const weekNum = Math.ceil((new Date(day.date).getDate()) / 7)
      if (!weeks[weekNum]) weeks[weekNum] = { sum: 0, count: 0 }
      weeks[weekNum].sum += day.completionRate
      weeks[weekNum].count++
    }

    for (const [week, data] of Object.entries(weeks)) {
      weeklyAverages.push({
        week: parseInt(week),
        startDate: '', // Would need to calculate
        endDate: '',
        averageCompletion: Math.round(data.sum / data.count),
        totalLogs: 0,
      })
    }
  }

  return {
    data: {
      period: { year, month, start: startDate, end: endDate },
      weeklyAverages,
      totalHabits: weeklyData?.totalHabits || 0,
      averageCompletion: weeklyData?.averageCompletion || 0,
      previousPeriodComparison: weeklyData?.previousPeriodComparison || { current: 0, previous: 0, change: 0, changePercent: 0 },
    },
    error: null,
  }
}

export async function fetchHabitCompletion(startDate: string, endDate: string): Promise<{ data: HabitCompletion[] | null; error: string | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { data: null, error: 'Not authenticated' }

    const { data: habits, error: habitsError } = await supabase
      .from('habits')
      .select('id, name, category, target_value, unit, color, icon')
      .eq('user_id', user.id)

    if (habitsError) return { data: null, error: habitsError.message }

    const habitIds = habits?.map(h => h.id) || []
    if (habitIds.length === 0) return { data: [], error: null }

    const { data: logs, error: logsError } = await supabase
      .from('habit_logs')
      .select('habit_id, log_date, actual_value')
      .in('habit_id', habitIds)
      .gte('log_date', startDate)
      .lte('log_date', endDate)

    if (logsError) return { data: null, error: logsError.message }

    const result: HabitCompletion[] = (habits || []).map(habit => {
      const habitLogs = logs?.filter(l => l.habit_id === habit.id) || []
      const totalLogs = habitLogs.length
      const completedLogs = habitLogs.filter(l => l.actual_value >= habit.target_value * 0.8).length
      const completionRate = totalLogs > 0 ? Math.round((completedLogs / totalLogs) * 100) : 0
      const averageValue = totalLogs > 0
        ? Math.round((habitLogs.reduce((sum, l) => sum + l.actual_value, 0) / totalLogs) * 10) / 10
        : 0

      return {
        habitId: habit.id,
        habitName: habit.name,
        category: habit.category,
        color: habit.color,
        icon: habit.icon,
        targetValue: habit.target_value,
        unit: habit.unit,
        totalLogs,
        completedLogs,
        completionRate,
        averageValue,
      }
    })

    return { data: result, error: null }
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

export async function fetchHabitConsistency(startDate: string, endDate: string): Promise<{ data: HabitConsistency[] | null; error: string | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { data: null, error: 'Not authenticated' }

    const { data: habits, error: habitsError } = await supabase
      .from('habits')
      .select('id, name, category, color, icon')
      .eq('user_id', user.id)

    if (habitsError) return { data: null, error: habitsError.message }

    const habitIds = habits?.map(h => h.id) || []
    if (habitIds.length === 0) return { data: [], error: null }

    const { data: logs, error: logsError } = await supabase
      .from('habit_logs')
      .select('habit_id, log_date')
      .in('habit_id', habitIds)
      .gte('log_date', startDate)
      .lte('log_date', endDate)

    if (logsError) return { data: null, error: logsError.message }

    // Calculate total days in period
    const start = new Date(startDate)
    const end = new Date(endDate)
    const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1

    const result: HabitConsistency[] = (habits || []).map(habit => {
      const habitLogs = logs?.filter(l => l.habit_id === habit.id) || []
      const loggedDays = new Set(habitLogs.map(l => l.log_date)).size
      const consistencyRate = totalDays > 0 ? Math.round((loggedDays / totalDays) * 100) : 0

      // Calculate streaks
      const dates = Array.from(new Set(habitLogs.map(l => l.log_date))).sort()
      let currentStreak = 0
      let longestStreak = 0
      let lastDate: Date | null = null

      for (const dateStr of dates) {
        const date = new Date(dateStr)
        if (lastDate) {
          const diff = Math.floor((date.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24))
          if (diff === 1) {
            currentStreak++
          } else if (diff > 1) {
            longestStreak = Math.max(longestStreak, currentStreak)
            currentStreak = 1
          }
        } else {
          currentStreak = 1
        }
        lastDate = date
      }
      longestStreak = Math.max(longestStreak, currentStreak)

      return {
        habitId: habit.id,
        habitName: habit.name,
        category: habit.category,
        color: habit.color,
        icon: habit.icon,
        totalDays,
        loggedDays,
        consistencyRate,
        longestStreak,
        currentStreak,
      }
    })

    return { data: result, error: null }
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

export async function fetchStreaksAnalytics(startDate: string, endDate: string): Promise<{ data: StreaksAnalytics | null; error: string | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { data: null, error: 'Not authenticated' }

    const { data: habits, error: habitsError } = await supabase
      .from('habits')
      .select('id, name, category, color, icon')
      .eq('user_id', user.id)

    if (habitsError) return { data: null, error: habitsError.message }

    const habitIds = habits?.map(h => h.id) || []
    if (habitIds.length === 0) {
      return {
        data: {
          currentStreak: 0,
          longestStreak: 0,
          habitStreaks: [],
          overall: { currentStreak: 0, longestStreak: 0 }
        },
        error: null
      }
    }

    const { data: logs, error: logsError } = await supabase
      .from('habit_logs')
      .select('habit_id, log_date')
      .in('habit_id', habitIds)
      .gte('log_date', startDate)
      .lte('log_date', endDate)

    if (logsError) return { data: null, error: logsError.message }

    // Overall streaks across all habits
    const allDates = new Set((logs || []).map(l => l.log_date))
    const sortedDates = Array.from(allDates).sort()
    let overallCurrent = 0
    let overallLongest = 0
    let lastDate: Date | null = null

    for (const dateStr of sortedDates) {
      const date = new Date(dateStr)
      if (lastDate) {
        const diff = Math.floor((date.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24))
        if (diff === 1) {
          overallCurrent++
        } else if (diff > 1) {
          overallLongest = Math.max(overallLongest, overallCurrent)
          overallCurrent = 1
        }
      } else {
        overallCurrent = 1
      }
      lastDate = date
    }
    overallLongest = Math.max(overallLongest, overallCurrent)

    // Per-habit streaks
    const habitStreaks = (habits || []).map(habit => {
      const habitLogs = logs?.filter(l => l.habit_id === habit.id) || []
      const dates = Array.from(new Set(habitLogs.map(l => l.log_date))).sort()
      let current = 0
      let longest = 0
      let last: Date | null = null

      for (const dateStr of dates) {
        const date = new Date(dateStr)
        if (last) {
          const diff = Math.floor((date.getTime() - last.getTime()) / (1000 * 60 * 60 * 24))
          if (diff === 1) current++
          else if (diff > 1) { longest = Math.max(longest, current); current = 1; }
        } else { current = 1; }
        last = date
      }
      longest = Math.max(longest, current)

      return {
        habitId: habit.id,
        habitName: habit.name,
        category: habit.category,
        color: habit.color,
        icon: habit.icon,
        currentStreak: current,
        longestStreak: longest,
      }
    })

    return {
      data: {
        currentStreak: overallCurrent,
        longestStreak: overallLongest,
        habitStreaks,
        overall: { currentStreak: overallCurrent, longestStreak: overallLongest },
      },
      error: null,
    }
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

export async function fetchLifeImpactScore(startDate: string, endDate: string): Promise<{ data: LifeImpactScore | null; error: string | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { data: null, error: 'Not authenticated' }

    const { data: habits, error: habitsError } = await supabase
      .from('habits')
      .select('id, name, category, target_value')
      .eq('user_id', user.id)

    if (habitsError) return { data: null, error: habitsError.message }

    const habitIds = habits?.map(h => h.id) || []
    if (habitIds.length === 0) {
      return {
        data: {
          overall: 0,
          dimensions: [],
          disclaimer: 'No habit data available'
        },
        error: null
      }
    }

    const { data: logs, error: logsError } = await supabase
      .from('habit_logs')
      .select('habit_id, log_date, actual_value')
      .in('habit_id', habitIds)
      .gte('log_date', startDate)
      .lte('log_date', endDate)

    if (logsError) return { data: null, error: logsError.message }

    // Define dimensions with weights and relevant categories
    const dimensions = [
      { key: 'health', name: 'Health', weight: 0.25, categories: ['health', 'fitness', 'nutrition', 'sleep', 'mental_health'] },
      { key: 'academic', name: 'Academic', weight: 0.2, categories: ['learning', 'productivity'] },
      { key: 'financial', name: 'Financial', weight: 0.15, categories: ['finance'] },
      { key: 'social', name: 'Social', weight: 0.2, categories: ['social'] },
      { key: 'personal', name: 'Personal Growth', weight: 0.2, categories: ['mental_health', 'productivity', 'learning'] },
    ]

    const dimensionResults = dimensions.map(dim => {
      const relevantHabits = habits?.filter(h => dim.categories.includes(h.category)) || []
      const relevantIds = relevantHabits.map(h => h.id)
      const relevantLogs = logs?.filter(l => relevantIds.includes(l.habit_id)) || []

      let completionRate = 0
      let consistencyRate = 0
      let totalExpected = 0
      let totalCompleted = 0

      if (relevantIds.length > 0) {
        for (const log of relevantLogs) {
          const habit = habits?.find(h => h.id === log.habit_id)
          if (habit) {
            totalExpected++
            if (log.actual_value >= habit.target_value * 0.8) {
              totalCompleted++
            }
          }
        }
        completionRate = totalExpected > 0 ? (totalCompleted / totalExpected) * 100 : 0

        // Consistency
        const start = new Date(startDate)
        const end = new Date(endDate)
        const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
        const loggedDays = new Set(relevantLogs.map(l => l.log_date)).size
        consistencyRate = totalDays > 0 ? (loggedDays / totalDays) * 100 : 0
      }

      const score = Math.round((completionRate * 0.6 + consistencyRate * 0.4))

      return {
        name: dim.name,
        key: dim.key,
        score,
        weight: dim.weight,
        description: `${dim.name} impact based on ${relevantHabits.length} habits`,
        relevantCategories: dim.categories,
        habitsCount: relevantHabits.length,
        completionRate: Math.round(completionRate),
        consistencyRate: Math.round(consistencyRate),
      }
    })

    const overall = Math.round(dimensionResults.reduce((sum, d) => sum + d.score * d.weight, 0))

    return {
      data: {
        overall,
        dimensions: dimensionResults,
        disclaimer: 'Life Impact Score is a heuristic measure based on habit completion and consistency',
      },
      error: null,
    }
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

export async function fetchHabitRipples(startDate: string, endDate: string): Promise<{ data: HabitRipple[] | null; error: string | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { data: null, error: 'Not authenticated' }

    const { data: habits, error: habitsError } = await supabase
      .from('habits')
      .select('id, name, category')
      .eq('user_id', user.id)

    if (habitsError) return { data: null, error: habitsError.message }

    const habitIds = habits?.map(h => h.id) || []
    if (habitIds.length < 2) return { data: [], error: null }

    const { data: logs, error: logsError } = await supabase
      .from('habit_logs')
      .select('habit_id, log_date, actual_value')
      .in('habit_id', habitIds)
      .gte('log_date', startDate)
      .lte('log_date', endDate)

    if (logsError) return { data: null, error: logsError.message }

    // Calculate phi coefficient correlations between habit completion
    const ripples: HabitRipple[] = []
    const habitMap = new Map((habits || []).map(h => [h.id, { name: h.name, category: h.category }]))

    for (let i = 0; i < habitIds.length; i++) {
      for (let j = i + 1; j < habitIds.length; j++) {
        const id1 = habitIds[i]
        const id2 = habitIds[j]
        const h1 = habitMap.get(id1)
        const h2 = habitMap.get(id2)

        if (!h1 || !h2) continue

        // Build 2x2 contingency table for completion on same days
        const dates1 = new Set((logs || []).filter(l => l.habit_id === id1).map(l => l.log_date))
        const dates2 = new Set((logs || []).filter(l => l.habit_id === id2).map(l => l.log_date))

        const allDates = new Set([...dates1, ...dates2])
        let a = 0, b = 0, c = 0, d = 0 // a=both, b=1 only, c=2 only, d=neither

        for (const date of allDates) {
          const has1 = dates1.has(date)
          const has2 = dates2.has(date)
          if (has1 && has2) a++
          else if (has1) b++
          else if (has2) c++
          else d++
        }

        const n = a + b + c + d
        if (n === 0) continue

        // Phi coefficient
        const phi = (a * d - b * c) / Math.sqrt((a + b) * (c + d) * (a + c) * (b + d))

        if (Math.abs(phi) > 0.3) { // Only show meaningful correlations
          ripples.push({
            id: `${id1}-${id2}`,
            sourceHabit: h1.name,
            sourceCategory: h1.category,
            targetHabit: h2.name,
            targetCategory: h2.category,
            correlation: Math.round(phi * 100) / 100,
            type: 'observed',
            description: phi > 0
              ? `${h1.name} and ${h2.name} tend to be completed together`
              : `${h1.name} and ${h2.name} rarely coincide`,
            direction: phi > 0 ? 'positive' : 'negative',
          })
        }
      }
    }

    return { data: ripples.sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation)), error: null }
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

export async function fetchAverageDailyProgress(startDate: string, endDate: string): Promise<{ data: AverageDailyProgress[] | null; error: string | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { data: null, error: 'Not authenticated' }

    const { data: habits, error: habitsError } = await supabase
      .from('habits')
      .select('id, target_value')
      .eq('user_id', user.id)

    if (habitsError) return { data: null, error: habitsError.message }

    const habitIds = habits?.map(h => h.id) || []
    if (habitIds.length === 0) return { data: [], error: null }

    const { data: logs, error: logsError } = await supabase
      .from('habit_logs')
      .select('habit_id, log_date, actual_value')
      .in('habit_id', habitIds)
      .gte('log_date', startDate)
      .lte('log_date', endDate)

    if (logsError) return { data: null, error: logsError.message }

    // Aggregate by date
    const dailyData: Record<string, { completed: number; total: number }> = {}
    const start = new Date(startDate)
    const end = new Date(endDate)
    const current = new Date(start)

    while (current <= end) {
      const dateStr = current.toISOString().split('T')[0]
      dailyData[dateStr] = { completed: 0, total: 0 }
      current.setDate(current.getDate() + 1)
    }

    for (const log of logs || []) {
      const habit = habits?.find(h => h.id === log.habit_id)
      if (!habit) continue
      if (!dailyData[log.log_date]) dailyData[log.log_date] = { completed: 0, total: 0 }
      dailyData[log.log_date].total++
      if (log.actual_value >= habit.target_value * 0.8) {
        dailyData[log.log_date].completed++
      }
    }

    const result: AverageDailyProgress[] = Object.entries(dailyData).map(([date, data]) => ({
      date,
      averageProgress: data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0,
      totalHabits: data.total,
      completedHabits: data.completed,
    }))

    return { data: result, error: null }
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

// ============================================================================
// Simulations API (uses backend API)
// ============================================================================

export const simulationsApi = {
  async run(simulation: {
    changes: Array<{
      metric: string
      currentValue: number
      simulatedValue: number
      timelineMonths?: number
      difficulty?: 'easy' | 'moderate' | 'hard'
    }>
    assumptions?: Record<string, unknown>
    horizon?: '6_months' | '5_years' | 'both'
  }): Promise<{ data: any; error: string | null }> {
    try {
      const headers = await getAuthHeaders()
      const response = await fetch(`${API_BASE}/simulations/run`, {
        method: 'POST',
        headers,
        body: JSON.stringify(simulation),
      })
      return handleResponse(response)
    } catch (err) {
      return { data: null, error: err instanceof Error ? err.message : 'Unknown error' }
    }
  },

  async save(simulation: {
    name: string
    description?: string
    changes: Array<{
      metric: string
      currentValue: number
      simulatedValue: number
      timelineMonths?: number
      difficulty?: 'easy' | 'moderate' | 'hard'
    }>
    assumptions?: Record<string, unknown>
    horizon: '6_months' | '5_years' | 'both'
    result: any
  }): Promise<{ data: any; error: string | null }> {
    try {
      const headers = await getAuthHeaders()
      const response = await fetch(`${API_BASE}/simulations/save`, {
        method: 'POST',
        headers,
        body: JSON.stringify(simulation),
      })
      return handleResponse(response)
    } catch (err) {
      return { data: null, error: err instanceof Error ? err.message : 'Unknown error' }
    }
  },

  async getAll(): Promise<{ data: any[]; error: string | null }> {
    try {
      const headers = await getAuthHeaders()
      const response = await fetch(`${API_BASE}/simulations`, { method: 'GET', headers })
      const result = await handleResponse<any[]>(response)
      return { data: result.data || [], error: result.error }
    } catch (err) {
      return { data: [], error: err instanceof Error ? err.message : 'Unknown error' }
    }
  },

  async getById(id: string): Promise<{ data: any; error: string | null }> {
    try {
      const headers = await getAuthHeaders()
      const response = await fetch(`${API_BASE}/simulations/${id}`, { method: 'GET', headers })
      return handleResponse(response)
    } catch (err) {
      return { data: null, error: err instanceof Error ? err.message : 'Unknown error' }
    }
  },

  async update(id: string, updates: { name?: string; description?: string }): Promise<{ data: any; error: string | null }> {
    try {
      const headers = await getAuthHeaders()
      const response = await fetch(`${API_BASE}/simulations/${id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(updates),
      })
      return handleResponse(response)
    } catch (err) {
      return { data: null, error: err instanceof Error ? err.message : 'Unknown error' }
    }
  },

  async delete(id: string): Promise<{ data: null; error: string | null }> {
    try {
      const headers = await getAuthHeaders()
      const response = await fetch(`${API_BASE}/simulations/${id}`, { method: 'DELETE', headers })
      return handleResponse<null>(response)
    } catch (err) {
      return { data: null, error: err instanceof Error ? err.message : 'Unknown error' }
    }
  },
}

// ============================================================================
// AI API (uses backend API)
// ============================================================================

export const aiApi = {
  // Future Letters
  async generateFutureLetter(
    letterType: 'six_month' | 'five_year' | 'current_path',
    regenerate = false,
    extraOptions?: { habits?: any[]; logs?: any[]; userName?: string; apiKey?: string; tone?: string }
  ): Promise<{ data: FutureLetterResponse | null; error: string | null }> {
    try {
      const headers = await getAuthHeaders()
      const response = await fetch(`${API_BASE}/ai/future-letter`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ letterType, regenerate, ...extraOptions }),
      })
      return handleResponse<FutureLetterResponse>(response)
    } catch (err) {
      return { data: null, error: err instanceof Error ? err.message : 'Unknown error' }
    }
  },

  async getFutureLetters(): Promise<{ data: FutureLetter[] | null; error: string | null }> {
    try {
      const headers = await getAuthHeaders()
      const response = await fetch(`${API_BASE}/ai/future-letters`, { method: 'GET', headers })
      return handleResponse<FutureLetter[]>(response)
    } catch (err) {
      return { data: null, error: err instanceof Error ? err.message : 'Unknown error' }
    }
  },

  async deleteFutureLetter(id: string): Promise<{ data: null; error: string | null }> {
    try {
      const headers = await getAuthHeaders()
      const response = await fetch(`${API_BASE}/ai/future-letters/${id}`, { method: 'DELETE', headers })
      return handleResponse<null>(response)
    } catch (err) {
      return { data: null, error: err instanceof Error ? err.message : 'Unknown error' }
    }
  },

  // Weekly Insights
  async generateWeeklyInsight(
    params?: {
      weekStart?: string
      regenerate?: boolean
      habits?: any[]
      logs?: any[]
      userName?: string
    } | string,
    regenerate = false
  ): Promise<{ data: WeeklyInsightResponse | null; error: string | null }> {
    try {
      const headers = await getAuthHeaders()
      let bodyPayload: any
      if (params && typeof params === 'object') {
        bodyPayload = params
      } else {
        bodyPayload = { weekStart: params, regenerate }
      }
      const response = await fetch(`${API_BASE}/ai/weekly-insight`, {
        method: 'POST',
        headers,
        body: JSON.stringify(bodyPayload),
      })
      return handleResponse<WeeklyInsightResponse>(response)
    } catch (err) {
      return { data: null, error: err instanceof Error ? err.message : 'Unknown error' }
    }
  },

  async getWeeklyInsights(limit = 12): Promise<{ data: WeeklyInsight[] | null; error: string | null }> {
    try {
      const headers = await getAuthHeaders()
      const response = await fetch(`${API_BASE}/ai/weekly-insights?limit=${limit}`, { method: 'GET', headers })
      return handleResponse<WeeklyInsight[]>(response)
    } catch (err) {
      return { data: null, error: err instanceof Error ? err.message : 'Unknown error' }
    }
  },

  async getLatestWeeklyInsight(): Promise<{ data: WeeklyInsight | null; error: string | null }> {
    try {
      const headers = await getAuthHeaders()
      const response = await fetch(`${API_BASE}/ai/weekly-insight/latest`, { method: 'GET', headers })
      return handleResponse<WeeklyInsight>(response)
    } catch (err) {
      return { data: null, error: err instanceof Error ? err.message : 'Unknown error' }
    }
  },

  // Habit Recommendations
  async generateHabitRecommendations(regenerate = false): Promise<{ data: HabitRecommendationsResponse | null; error: string | null }> {
    try {
      const headers = await getAuthHeaders()
      const response = await fetch(`${API_BASE}/ai/habit-recommendations`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ regenerate }),
      })
      return handleResponse<HabitRecommendationsResponse>(response)
    } catch (err) {
      return { data: null, error: err instanceof Error ? err.message : 'Unknown error' }
    }
  },

  async createHabitFromRecommendation(recommendation: HabitRecommendation): Promise<{ data: Habit | null; error: string | null }> {
    try {
      const headers = await getAuthHeaders()
      const response = await fetch(`${API_BASE}/ai/habits/from-recommendation`, {
        method: 'POST',
        headers,
        body: JSON.stringify(recommendation),
      })
      return handleResponse<Habit>(response)
    } catch (err) {
      return { data: null, error: err instanceof Error ? err.message : 'Unknown error' }
    }
  },

  // Prediction Explanation
  async getPredictionExplanation(): Promise<{ data: PredictionExplanationResponse | null; error: string | null }> {
    try {
      const headers = await getAuthHeaders()
      const response = await fetch(`${API_BASE}/ai/prediction-explanation`, { method: 'GET', headers })
      return handleResponse<PredictionExplanationResponse>(response)
    } catch (err) {
      return { data: null, error: err instanceof Error ? err.message : 'Unknown error' }
    }
  },

  // AI Coach
  async askCoach(question: string, contextType?: string, contextData?: Record<string, unknown>): Promise<{ data: CoachResponse | null; error: string | null }> {
    try {
      const headers = await getAuthHeaders()
      const response = await fetch(`${API_BASE}/ai/coach`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ question, contextType, contextData }),
      })
      return handleResponse<CoachResponse>(response)
    } catch (err) {
      return { data: null, error: err instanceof Error ? err.message : 'Unknown error' }
    }
  },

  async getCoachHistory(limit = 20): Promise<{ data: CoachSession[] | null; error: string | null }> {
    try {
      const headers = await getAuthHeaders()
      const response = await fetch(`${API_BASE}/ai/coach/history?limit=${limit}`, { method: 'GET', headers })
      return handleResponse<CoachSession[]>(response)
    } catch (err) {
      return { data: null, error: err instanceof Error ? err.message : 'Unknown error' }
    }
  },

  // Progress Report (Weekly / Monthly with Gemini)
  async generateProgressReport(params: {
    period: 'weekly' | 'monthly'
    habits: any[]
    logs: any[]
    userName?: string
    apiKey?: string
    regenerate?: boolean
  }): Promise<{ data: any | null; error: string | null }> {
    try {
      const headers = await getAuthHeaders()
      const response = await fetch(`${API_BASE}/ai/progress-report`, {
        method: 'POST',
        headers,
        body: JSON.stringify(params),
      })
      return handleResponse(response)
    } catch (err) {
      return { data: null, error: err instanceof Error ? err.message : 'Unknown error' }
    }
  },

  // What-If Interactive AI Simulation Chat
  async askWhatIfSimulation(params: {
    message: string
    userId?: string
    sessionId?: string
    sessionTitle?: string
    conversationHistory?: any[]
    habits?: any[]
    logs?: any[]
    userName?: string
    apiKey?: string
  }): Promise<{ data: any | null; error: string | null }> {
    try {
      const headers = await getAuthHeaders()
      const response = await fetch(`${API_BASE}/ai/what-if-chat`, {
        method: 'POST',
        headers,
        body: JSON.stringify(params),
      })
      return handleResponse(response)
    } catch (err) {
      return { data: null, error: err instanceof Error ? err.message : 'Unknown error' }
    }
  },

  // Get What-If Saved Chat Sessions list (ChatGPT-style saved chats)
  async getWhatIfSessions(): Promise<{ data: any[] | null; error: string | null }> {
    try {
      const headers = await getAuthHeaders()
      const response = await fetch(`${API_BASE}/ai/what-if-chat/sessions`, {
        method: 'GET',
        headers,
      })
      return handleResponse(response)
    } catch (err) {
      return { data: null, error: err instanceof Error ? err.message : 'Unknown error' }
    }
  },

  // Get messages for a specific session
  async getWhatIfSessionMessages(sessionId: string): Promise<{ data: any[] | null; error: string | null }> {
    try {
      const headers = await getAuthHeaders()
      const response = await fetch(`${API_BASE}/ai/what-if-chat/sessions/${encodeURIComponent(sessionId)}`, {
        method: 'GET',
        headers,
      })
      return handleResponse(response)
    } catch (err) {
      return { data: null, error: err instanceof Error ? err.message : 'Unknown error' }
    }
  },

  // Delete a specific chat session
  async deleteWhatIfSession(sessionId: string): Promise<{ data: any | null; error: string | null }> {
    try {
      const headers = await getAuthHeaders()
      const response = await fetch(`${API_BASE}/ai/what-if-chat/sessions/${encodeURIComponent(sessionId)}`, {
        method: 'DELETE',
        headers,
      })
      return handleResponse(response)
    } catch (err) {
      return { data: null, error: err instanceof Error ? err.message : 'Unknown error' }
    }
  },

  // Get What-If Chat History for current user
  async getWhatIfChatHistory(limit?: number): Promise<{ data: any[] | null; error: string | null }> {
    try {
      const headers = await getAuthHeaders()
      const query = limit ? `?limit=${limit}` : ''
      const response = await fetch(`${API_BASE}/ai/what-if-chat/history${query}`, {
        method: 'GET',
        headers,
      })
      return handleResponse(response)
    } catch (err) {
      return { data: null, error: err instanceof Error ? err.message : 'Unknown error' }
    }
  },

  // Clear What-If Chat History for current user
  async clearWhatIfChatHistory(): Promise<{ data: any | null; error: string | null }> {
    try {
      const headers = await getAuthHeaders()
      const response = await fetch(`${API_BASE}/ai/what-if-chat/history`, {
        method: 'DELETE',
        headers,
      })
      return handleResponse(response)
    } catch (err) {
      return { data: null, error: err instanceof Error ? err.message : 'Unknown error' }
    }
  },

  // Config Key
  async configKey(apiKey: string): Promise<{ data: any | null; error: string | null }> {
    try {
      const headers = await getAuthHeaders()
      const response = await fetch(`${API_BASE}/ai/config-key`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ apiKey }),
      })
      return handleResponse(response)
    } catch (err) {
      return { data: null, error: err instanceof Error ? err.message : 'Unknown error' }
    }
  },

  // Key Status
  async getKeyStatus(): Promise<{ data: { hasKey: boolean; model: string } | null; error: string | null }> {
    try {
      const headers = await getAuthHeaders()
      const response = await fetch(`${API_BASE}/ai/key-status`, { method: 'GET', headers })
      return handleResponse(response)
    } catch (err) {
      return { data: null, error: err instanceof Error ? err.message : 'Unknown error' }
    }
  },

  // Health Check
  async checkHealth(): Promise<{ data: { geminiAvailable: boolean; fallbackMode: boolean; services: Record<string, boolean> } | null; error: string | null }> {
    try {
      const headers = await getAuthHeaders()
      const response = await fetch(`${API_BASE}/ai/health`, { method: 'GET', headers })
      return handleResponse(response)
    } catch (err) {
      return { data: null, error: err instanceof Error ? err.message : 'Unknown error' }
    }
  },
}