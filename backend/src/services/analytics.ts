import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { config } from '../config/index.js'

let _supabase: SupabaseClient | null = null

function getSupabase(): SupabaseClient {
  if (!_supabase) {
    _supabase = createClient(config.supabase.url, config.supabase.serviceRoleKey)
  }
  return _supabase
}

export interface WeeklyAnalytics {
  period: { start: string; end: string }
  dailyCompletion: DailyCompletion[]
  totalHabits: number
  averageCompletion: number
  previousPeriodComparison: PeriodComparison
}

export interface DailyCompletion {
  date: string
  day: string
  completed: number
  total: number
  completionRate: number
}

export interface PeriodComparison {
  current: number
  previous: number
  change: number
  changePercent: number
}

export interface MonthlyAnalytics {
  period: { year: number; month: number; start: string; end: string }
  weeklyAverages: WeeklyAverage[]
  totalHabits: number
  averageCompletion: number
  previousPeriodComparison: PeriodComparison
}

export interface WeeklyAverage {
  week: number
  startDate: string
  endDate: string
  averageCompletion: number
  totalLogs: number
}

export interface HabitCompletion {
  habitId: string
  habitName: string
  category: string
  color: string
  icon: string
  targetValue: number
  unit: string
  totalLogs: number
  completedLogs: number
  completionRate: number
  averageValue: number
}

export interface HabitConsistency {
  habitId: string
  habitName: string
  category: string
  color: string
  icon: string
  totalDays: number
  loggedDays: number
  consistencyRate: number
  longestStreak: number
  currentStreak: number
}

export interface StreaksAnalytics {
  currentStreak: number
  longestStreak: number
  habitStreaks: HabitStreak[]
  overall: {
    currentStreak: number
    longestStreak: number
  }
}

export interface HabitStreak {
  habitId: string
  habitName: string
  category: string
  color: string
  icon: string
  currentStreak: number
  longestStreak: number
}

export interface LifeImpactScore {
  overall: number
  dimensions: LifeImpactDimension[]
  disclaimer: string
}

export interface LifeImpactDimension {
  name: string
  key: string
  score: number
  weight: number
  description: string
  relevantCategories: string[]
  habitsCount: number
  completionRate: number
  consistencyRate: number
}

export interface HabitRipple {
  id: string
  sourceHabit: string
  sourceCategory: string
  targetHabit: string
  targetCategory: string
  correlation: number
  type: 'observed' | 'hypothetical'
  description: string
  direction: 'positive' | 'negative'
}

export interface AverageDailyProgress {
  date: string
  averageProgress: number
  totalHabits: number
  completedHabits: number
}

async function getUserActiveHabits(supabase: SupabaseClient, userId: string) {
  const { data: habits, error } = await supabase
    .from('habits')
    .select('id, name, category, target_value, unit, color, icon, frequency')
    .eq('user_id', userId)
    .eq('is_active', true)

  if (error) throw error
  return habits || []
}

async function getHabitLogs(
  supabase: SupabaseClient,
  userId: string,
  habitIds: string[],
  startDate: string,
  endDate: string
) {
  if (habitIds.length === 0) return []

  const { data: logs, error } = await supabase
    .from('habit_logs')
    .select('habit_id, value, logged_at')
    .in('habit_id', habitIds)
    .eq('user_id', userId)
    .gte('logged_at', startDate)
    .lte('logged_at', endDate)
    .order('logged_at', { ascending: true })

  if (error) throw error
  return logs || []
}

function getDaysInRange(startDate: string, endDate: string): string[] {
  const dates: string[] = []
  const start = new Date(startDate)
  const end = new Date(endDate)
  const current = new Date(start)

  while (current <= end) {
    dates.push(current.toISOString().split('T')[0])
    current.setDate(current.getDate() + 1)
  }
  return dates
}

function getWeekNumber(date: string): number {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7)
  const week1 = new Date(d.getFullYear(), 0, 4)
  return 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7)
}

export async function calculateWeeklyAnalytics(
  userId: string,
  startDate: string,
  endDate: string
): Promise<WeeklyAnalytics> {
  const supabase = getSupabase()
  const habits = await getUserActiveHabits(supabase, userId)
  const habitIds = habits.map(h => h.id)
  const logs = await getHabitLogs(supabase, userId, habitIds, startDate, endDate)

  const dates = getDaysInRange(startDate, endDate)
  const habitLogsByDate = new Map<string, Map<string, number>>()

  for (const log of logs) {
    const date = log.logged_at.split('T')[0]
    if (!habitLogsByDate.has(date)) {
      habitLogsByDate.set(date, new Map())
    }
    habitLogsByDate.get(date)!.set(log.habit_id, (habitLogsByDate.get(date)!.get(log.habit_id) || 0) + log.value)
  }

  const dailyCompletion: DailyCompletion[] = dates.map(date => {
    const dayLogs = habitLogsByDate.get(date) || new Map()
    let completed = 0
    let total = habits.length

    for (const habit of habits) {
      const value = dayLogs.get(habit.id) || 0
      if (value >= habit.target_value) completed++
    }

    return {
      date,
      day: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
      completed,
      total,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
    }
  })

  const averageCompletion = dailyCompletion.length > 0
    ? Math.round(dailyCompletion.reduce((sum, d) => sum + d.completionRate, 0) / dailyCompletion.length)
    : 0

  // Previous period comparison
  const periodDays = dates.length
  const prevStart = new Date(startDate)
  prevStart.setDate(prevStart.getDate() - periodDays)
  const prevEnd = new Date(startDate)
  prevEnd.setDate(prevEnd.getDate() - 1)

  const prevLogs = await getHabitLogs(supabase, userId, habitIds, prevStart.toISOString().split('T')[0], prevEnd.toISOString().split('T')[0])
  let prevCompleted = 0
  let prevTotal = 0

  for (const habit of habits) {
    const habitLogs = prevLogs.filter(l => l.habit_id === habit.id)
    prevTotal += dates.length
    for (const log of habitLogs) {
      if (log.value >= habit.target_value) prevCompleted++
    }
  }

  const previousCompletion = prevTotal > 0 ? Math.round((prevCompleted / prevTotal) * 100) : 0
  const change = averageCompletion - previousCompletion

  return {
    period: { start: startDate, end: endDate },
    dailyCompletion,
    totalHabits: habits.length,
    averageCompletion,
    previousPeriodComparison: {
      current: averageCompletion,
      previous: previousCompletion,
      change,
      changePercent: previousCompletion > 0 ? Math.round((change / previousCompletion) * 100) : 0,
    },
  }
}

export async function calculateMonthlyAnalytics(
  userId: string,
  year: number,
  month: number
): Promise<MonthlyAnalytics> {
  const supabase = getSupabase()
  const startDate = new Date(year, month - 1, 1).toISOString().split('T')[0]
  const endDate = new Date(year, month, 0).toISOString().split('T')[0]

  const habits = await getUserActiveHabits(supabase, userId)
  const habitIds = habits.map(h => h.id)
  const logs = await getHabitLogs(supabase, userId, habitIds, startDate, endDate)

  const dates = getDaysInRange(startDate, endDate)
  const habitLogsByDate = new Map<string, Map<string, number>>()

  for (const log of logs) {
    const date = log.logged_at.split('T')[0]
    if (!habitLogsByDate.has(date)) {
      habitLogsByDate.set(date, new Map())
    }
    habitLogsByDate.get(date)!.set(log.habit_id, (habitLogsByDate.get(date)!.get(log.habit_id) || 0) + log.value)
  }

  // Group by week
  const weeks = new Map<number, { dates: string[]; logs: Map<string, Map<string, number>> }>()
  for (const date of dates) {
    const weekNum = getWeekNumber(date)
    if (!weeks.has(weekNum)) {
      weeks.set(weekNum, { dates: [], logs: new Map() })
    }
    weeks.get(weekNum)!.dates.push(date)
  }

  for (const log of logs) {
    const date = log.logged_at.split('T')[0]
    const weekNum = getWeekNumber(date)
    const week = weeks.get(weekNum)
    if (week) {
      if (!week.logs.has(date)) {
        week.logs.set(date, new Map())
      }
      week.logs.get(date)!.set(log.habit_id, (week.logs.get(date)!.get(log.habit_id) || 0) + log.value)
    }
  }

  const weeklyAverages: WeeklyAverage[] = []
  for (const [weekNum, week] of weeks) {
    let totalCompletion = 0
    let totalLogs = 0

    for (const date of week.dates) {
      const dayLogs = week.logs.get(date) || new Map()
      let completed = 0
      let total = habits.length

      for (const habit of habits) {
        const value = dayLogs.get(habit.id) || 0
        if (value >= habit.target_value) completed++
        if (value > 0) totalLogs++
      }
      totalCompletion += total > 0 ? (completed / total) * 100 : 0
    }

    const avgCompletion = week.dates.length > 0
      ? Math.round(totalCompletion / week.dates.length)
      : 0

    weeklyAverages.push({
      week: weekNum,
      startDate: week.dates[0],
      endDate: week.dates[week.dates.length - 1],
      averageCompletion: avgCompletion,
      totalLogs,
    })
  }

  const averageCompletion = weeklyAverages.length > 0
    ? Math.round(weeklyAverages.reduce((sum, w) => sum + w.averageCompletion, 0) / weeklyAverages.length)
    : 0

  // Previous month comparison
  const prevMonth = month === 1 ? 12 : month - 1
  const prevYear = month === 1 ? year - 1 : year
  const prevStartDate = new Date(prevYear, prevMonth - 1, 1).toISOString().split('T')[0]
  const prevEndDate = new Date(prevYear, prevMonth, 0).toISOString().split('T')[0]

  const prevLogs = await getHabitLogs(supabase, userId, habitIds, prevStartDate, prevEndDate)
  let prevCompleted = 0
  let prevTotal = 0

  const prevDates = getDaysInRange(prevStartDate, prevEndDate)
  for (const habit of habits) {
    prevTotal += prevDates.length
    for (const log of prevLogs.filter(l => l.habit_id === habit.id)) {
      if (log.value >= habit.target_value) prevCompleted++
    }
  }

  const previousCompletion = prevTotal > 0 ? Math.round((prevCompleted / prevTotal) * 100) : 0
  const change = averageCompletion - previousCompletion

  return {
    period: { year, month, start: startDate, end: endDate },
    weeklyAverages,
    totalHabits: habits.length,
    averageCompletion,
    previousPeriodComparison: {
      current: averageCompletion,
      previous: previousCompletion,
      change,
      changePercent: previousCompletion > 0 ? Math.round((change / previousCompletion) * 100) : 0,
    },
  }
}

export async function calculateHabitCompletion(
  userId: string,
  startDate: string,
  endDate: string
): Promise<HabitCompletion[]> {
  const supabase = getSupabase()
  const habits = await getUserActiveHabits(supabase, userId)
  const habitIds = habits.map(h => h.id)
  const logs = await getHabitLogs(supabase, userId, habitIds, startDate, endDate)

  const dates = getDaysInRange(startDate, endDate)
  const totalDays = dates.length

  return habits.map(habit => {
    const habitLogs = logs.filter(l => l.habit_id === habit.id)
    const totalLogs = habitLogs.length
    const completedLogs = habitLogs.filter(l => l.value >= habit.target_value).length
    const sumValue = habitLogs.reduce((sum, l) => sum + l.value, 0)
    const averageValue = totalLogs > 0 ? sumValue / totalLogs : 0

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
      completionRate: totalLogs > 0 ? Math.round((completedLogs / totalLogs) * 100) : 0,
      averageValue: Math.round(averageValue * 100) / 100,
    }
  })
}

export async function calculateHabitConsistency(
  userId: string,
  startDate: string,
  endDate: string
): Promise<HabitConsistency[]> {
  const supabase = getSupabase()
  const habits = await getUserActiveHabits(supabase, userId)
  const habitIds = habits.map(h => h.id)
  const logs = await getHabitLogs(supabase, userId, habitIds, startDate, endDate)

  const dates = getDaysInRange(startDate, endDate)
  const totalDays = dates.length

  return habits.map(habit => {
    const habitLogs = logs.filter(l => l.habit_id === habit.id)
    const loggedDates = new Set(habitLogs.map(l => l.logged_at.split('T')[0]))
    const loggedDays = loggedDates.size

    // Calculate streaks
    let currentStreak = 0
    let longestStreak = 0
    let tempStreak = 0

    // Check from today backwards for current streak
    const today = new Date().toISOString().split('T')[0]
    let checkDate = today

    while (checkDate >= startDate) {
      if (loggedDates.has(checkDate)) {
        currentStreak++
      } else {
        break
      }
      const d = new Date(checkDate)
      d.setDate(d.getDate() - 1)
      checkDate = d.toISOString().split('T')[0]
    }

    // Calculate longest streak in period
    for (const date of dates) {
      if (loggedDates.has(date)) {
        tempStreak++
        longestStreak = Math.max(longestStreak, tempStreak)
      } else {
        tempStreak = 0
      }
    }

    return {
      habitId: habit.id,
      habitName: habit.name,
      category: habit.category,
      color: habit.color,
      icon: habit.icon,
      totalDays,
      loggedDays,
      consistencyRate: totalDays > 0 ? Math.round((loggedDays / totalDays) * 100) : 0,
      longestStreak,
      currentStreak,
    }
  })
}

export async function calculateStreaksAnalytics(
  userId: string,
  startDate: string,
  endDate: string
): Promise<StreaksAnalytics> {
  const consistency = await calculateHabitConsistency(userId, startDate, endDate)

  const habitStreaks: HabitStreak[] = consistency.map(c => ({
    habitId: c.habitId,
    habitName: c.habitName,
    category: c.category,
    color: c.color,
    icon: c.icon,
    currentStreak: c.currentStreak,
    longestStreak: c.longestStreak,
  }))

  // Overall streak: minimum of all habit current streaks (all habits must be done)
  // Or we can calculate based on days where ALL habits were completed
  const supabase = getSupabase()
  const habits = await getUserActiveHabits(supabase, userId)
  const habitIds = habits.map(h => h.id)
  const logs = await getHabitLogs(supabase, userId, habitIds, startDate, endDate)

  const dates = getDaysInRange(startDate, endDate)
  const habitLogsByDate = new Map<string, Map<string, number>>()

  for (const log of logs) {
    const date = log.logged_at.split('T')[0]
    if (!habitLogsByDate.has(date)) {
      habitLogsByDate.set(date, new Map())
    }
    habitLogsByDate.get(date)!.set(log.habit_id, (habitLogsByDate.get(date)!.get(log.habit_id) || 0) + log.value)
  }

  let overallCurrentStreak = 0
  let overallLongestStreak = 0
  let tempStreak = 0

  const today = new Date().toISOString().split('T')[0]
  let checkDate = today

  // Current streak: consecutive days where ALL habits were completed
  while (checkDate >= startDate) {
    const dayLogs = habitLogsByDate.get(checkDate) || new Map()
    let allCompleted = true
    for (const habit of habits) {
      const value = dayLogs.get(habit.id) || 0
      if (value < habit.target_value) {
        allCompleted = false
        break
      }
    }
    if (allCompleted && habits.length > 0) {
      overallCurrentStreak++
    } else {
      break
    }
    const d = new Date(checkDate)
    d.setDate(d.getDate() - 1)
    checkDate = d.toISOString().split('T')[0]
  }

  // Longest streak in period
  for (const date of dates) {
    const dayLogs = habitLogsByDate.get(date) || new Map()
    let allCompleted = true
    for (const habit of habits) {
      const value = dayLogs.get(habit.id) || 0
      if (value < habit.target_value) {
        allCompleted = false
        break
      }
    }
    if (allCompleted && habits.length > 0) {
      tempStreak++
      overallLongestStreak = Math.max(overallLongestStreak, tempStreak)
    } else {
      tempStreak = 0
    }
  }

  return {
    currentStreak: overallCurrentStreak,
    longestStreak: overallLongestStreak,
    habitStreaks,
    overall: {
      currentStreak: overallCurrentStreak,
      longestStreak: overallLongestStreak,
    },
  }
}

const DIMENSION_CONFIG: Omit<LifeImpactDimension, 'score' | 'habitsCount' | 'completionRate' | 'consistencyRate'>[] = [
  {
    name: 'Physical Well-being',
    key: 'physical',
    weight: 0.25,
    description: 'Exercise, nutrition, sleep, and health habits',
    relevantCategories: ['health', 'fitness', 'nutrition', 'sleep'],
  },
  {
    name: 'Academic Growth',
    key: 'academic',
    weight: 0.20,
    description: 'Learning, reading, skill development habits',
    relevantCategories: ['learning', 'productivity'],
  },
  {
    name: 'Digital Well-being',
    key: 'digital',
    weight: 0.20,
    description: 'Screen time, focus, mental health habits',
    relevantCategories: ['mental_health', 'productivity', 'sleep'],
  },
  {
    name: 'Financial Discipline',
    key: 'financial',
    weight: 0.15,
    description: 'Budgeting, saving, financial tracking habits',
    relevantCategories: ['finance'],
  },
  {
    name: 'Personal Development',
    key: 'personal',
    weight: 0.20,
    description: 'Social, creative, and self-improvement habits',
    relevantCategories: ['social', 'other'],
  },
]

export async function calculateLifeImpactScore(
  userId: string,
  startDate: string,
  endDate: string
): Promise<LifeImpactScore> {
  const supabase = getSupabase()
  const habits = await getUserActiveHabits(supabase, userId)
  const habitIds = habits.map(h => h.id)
  const logs = await getHabitLogs(supabase, userId, habitIds, startDate, endDate)

  const dates = getDaysInRange(startDate, endDate)
  const totalDays = dates.length

  const habitLogsByDate = new Map<string, Map<string, number>>()
  for (const log of logs) {
    const date = log.logged_at.split('T')[0]
    if (!habitLogsByDate.has(date)) {
      habitLogsByDate.set(date, new Map())
    }
    habitLogsByDate.get(date)!.set(log.habit_id, (habitLogsByDate.get(date)!.get(log.habit_id) || 0) + log.value)
  }

  const dimensions: LifeImpactDimension[] = []

  for (const dimConfig of DIMENSION_CONFIG) {
    const relevantHabits = habits.filter(h => dimConfig.relevantCategories.includes(h.category))
    const habitsCount = relevantHabits.length

    if (habitsCount === 0) {
      dimensions.push({
        ...dimConfig,
        score: 0,
        habitsCount: 0,
        completionRate: 0,
        consistencyRate: 0,
      })
      continue
    }

    let totalCompletionRate = 0
    let totalConsistencyRate = 0

    for (const habit of relevantHabits) {
      const habitLogs = logs.filter(l => l.habit_id === habit.id)
      const loggedDates = new Set(habitLogs.map(l => l.logged_at.split('T')[0]))
      const loggedDays = loggedDates.size

      const completedLogs = habitLogs.filter(l => l.value >= habit.target_value).length
      const completionRate = habitLogs.length > 0 ? (completedLogs / habitLogs.length) * 100 : 0
      const consistencyRate = totalDays > 0 ? (loggedDays / totalDays) * 100 : 0

      totalCompletionRate += completionRate
      totalConsistencyRate += consistencyRate
    }

    const avgCompletionRate = totalCompletionRate / habitsCount
    const avgConsistencyRate = totalConsistencyRate / habitsCount

    // Score combines completion and consistency (50/50 weight)
    const score = Math.round((avgCompletionRate * 0.5) + (avgConsistencyRate * 0.5))

    dimensions.push({
      ...dimConfig,
      score: Math.min(100, Math.max(0, score)),
      habitsCount,
      completionRate: Math.round(avgCompletionRate),
      consistencyRate: Math.round(avgConsistencyRate),
    })
  }

  // Overall score is weighted average
  const overall = Math.round(dimensions.reduce((sum, d) => sum + d.score * d.weight, 0))

  return {
    overall: Math.min(100, Math.max(0, overall)),
    dimensions,
    disclaimer: 'The Life Impact Score is a personal behavioral progress indicator based on your habit completion and consistency. It is not a scientific measure of future success, health outcomes, or life satisfaction. Use it as a motivational tool to track your personal growth patterns.',
  }
}

export async function calculateHabitRipples(
  userId: string,
  startDate: string,
  endDate: string
): Promise<HabitRipple[]> {
  const supabase = getSupabase()
  const habits = await getUserActiveHabits(supabase, userId)
  const habitIds = habits.map(h => h.id)
  const logs = await getHabitLogs(supabase, userId, habitIds, startDate, endDate)

  const dates = getDaysInRange(startDate, endDate)

  // Build habit completion by date
  const habitCompletionByDate = new Map<string, Map<string, boolean>>()
  for (const log of logs) {
    const date = log.logged_at.split('T')[0]
    const habit = habits.find(h => h.id === log.habit_id)
    if (!habit) continue

    if (!habitCompletionByDate.has(date)) {
      habitCompletionByDate.set(date, new Map())
    }
    const completed = log.value >= habit.target_value
    habitCompletionByDate.get(date)!.set(log.habit_id, completed)
  }

  const ripples: HabitRipple[] = []

  // Known habit relationships (hypothetical based on behavioral science)
  const hypotheticalRelationships: { source: string; target: string; description: string; direction: 'positive' | 'negative' }[] = [
    { source: 'sleep', target: 'productivity', description: 'Better sleep improves focus and productivity', direction: 'positive' },
    { source: 'sleep', target: 'mental_health', description: 'Adequate sleep reduces stress and anxiety', direction: 'positive' },
    { source: 'fitness', target: 'mental_health', description: 'Exercise releases endorphins, improving mood', direction: 'positive' },
    { source: 'nutrition', target: 'productivity', description: 'Healthy eating provides sustained energy for focus', direction: 'positive' },
    { source: 'mental_health', target: 'productivity', description: 'Mindfulness and stress reduction improve focus', direction: 'positive' },
    { source: 'digital', target: 'sleep', description: 'Reduced screen time before bed improves sleep quality', direction: 'positive' },
    { source: 'learning', target: 'productivity', description: 'Continuous learning enhances problem-solving skills', direction: 'positive' },
    { source: 'finance', target: 'mental_health', description: 'Financial tracking reduces money-related stress', direction: 'positive' },
    { source: 'social', target: 'mental_health', description: 'Social connections improve emotional well-being', direction: 'positive' },
    { source: 'productivity', target: 'learning', description: 'Better time management creates space for learning', direction: 'positive' },
  ]

  // Category mapping for hypothetical relationships
  const categoryMap: Record<string, string[]> = {
    sleep: ['sleep'],
    fitness: ['fitness', 'health'],
    nutrition: ['nutrition', 'health'],
    mental_health: ['mental_health'],
    digital: ['productivity', 'mental_health'],
    learning: ['learning'],
    finance: ['finance'],
    social: ['social'],
    productivity: ['productivity'],
  }

  // Add hypothetical relationships
  for (const rel of hypotheticalRelationships) {
    const sourceHabits = habits.filter(h => categoryMap[rel.source]?.includes(h.category))
    const targetHabits = habits.filter(h => categoryMap[rel.target]?.includes(h.category))

    for (const sourceHabit of sourceHabits) {
      for (const targetHabit of targetHabits) {
        if (sourceHabit.id === targetHabit.id) continue

        ripples.push({
          id: `ripple-${sourceHabit.id}-${targetHabit.id}`,
          sourceHabit: sourceHabit.name,
          sourceCategory: sourceHabit.category,
          targetHabit: targetHabit.name,
          targetCategory: targetHabit.category,
          correlation: 0,
          type: 'hypothetical',
          description: rel.description,
          direction: rel.direction,
        })
      }
    }
  }

  // Calculate observed correlations (only for habits with sufficient data)
  for (const habitA of habits) {
    for (const habitB of habits) {
      if (habitA.id >= habitB.id) continue // Avoid duplicates and self

      const completionA = new Map<string, boolean>()
      const completionB = new Map<string, boolean>()

      for (const date of dates) {
        const dayLogs = habitCompletionByDate.get(date) || new Map()
        completionA.set(date, dayLogs.get(habitA.id) || false)
        completionB.set(date, dayLogs.get(habitB.id) || false)
      }

      // Calculate phi coefficient (correlation for binary variables)
      let bothTrue = 0, aTrue = 0, bTrue = 0, bothFalse = 0

      for (const date of dates) {
        const a = completionA.get(date) || false
        const b = completionB.get(date) || false

        if (a && b) bothTrue++
        else if (a) aTrue++
        else if (b) bTrue++
        else bothFalse++
      }

      const n = dates.length
      if (n < 7) continue // Need at least a week of data

      const ad = bothTrue * bothFalse - aTrue * bTrue
      const denom = Math.sqrt((bothTrue + aTrue) * (bothTrue + bTrue) * (bothFalse + aTrue) * (bothFalse + bTrue))

      if (denom > 0) {
        const correlation = ad / denom

        // Only include moderate to strong correlations
        if (Math.abs(correlation) > 0.3) {
          // Check if this is already a hypothetical relationship
          const existing = ripples.find(r =>
            r.sourceHabit === habitA.name && r.targetHabit === habitB.name &&
            r.type === 'hypothetical'
          )

          if (existing) {
            // Update to observed
            existing.correlation = Math.round(correlation * 100)
            existing.type = 'observed'
            existing.description = `Observed ${correlation > 0 ? 'positive' : 'negative'} correlation (${Math.abs(Math.round(correlation * 100))}%)`
          } else {
            ripples.push({
              id: `ripple-observed-${habitA.id}-${habitB.id}`,
              sourceHabit: habitA.name,
              sourceCategory: habitA.category,
              targetHabit: habitB.name,
              targetCategory: habitB.category,
              correlation: Math.round(correlation * 100),
              type: 'observed',
              description: `Observed ${correlation > 0 ? 'positive' : 'negative'} correlation (${Math.abs(Math.round(correlation * 100))}%)`,
              direction: correlation > 0 ? 'positive' : 'negative',
            })
          }
        }
      }
    }
  }

  return ripples
}

export async function calculateAverageDailyProgress(
  userId: string,
  startDate: string,
  endDate: string
): Promise<AverageDailyProgress[]> {
  const supabase = getSupabase()
  const habits = await getUserActiveHabits(supabase, userId)
  const habitIds = habits.map(h => h.id)
  const logs = await getHabitLogs(supabase, userId, habitIds, startDate, endDate)

  const dates = getDaysInRange(startDate, endDate)
  const habitLogsByDate = new Map<string, Map<string, number>>()

  for (const log of logs) {
    const date = log.logged_at.split('T')[0]
    if (!habitLogsByDate.has(date)) {
      habitLogsByDate.set(date, new Map())
    }
    habitLogsByDate.get(date)!.set(log.habit_id, (habitLogsByDate.get(date)!.get(log.habit_id) || 0) + log.value)
  }

  return dates.map(date => {
    const dayLogs = habitLogsByDate.get(date) || new Map()
    let totalProgress = 0
    let completedHabits = 0
    const totalHabits = habits.length

    for (const habit of habits) {
      const value = dayLogs.get(habit.id) || 0
      const progress = habit.target_value > 0 ? Math.min((value / habit.target_value) * 100, 100) : 0
      totalProgress += progress
      if (value >= habit.target_value) completedHabits++
    }

    return {
      date,
      averageProgress: totalHabits > 0 ? Math.round(totalProgress / totalHabits) : 0,
      totalHabits,
      completedHabits,
    }
  })
}