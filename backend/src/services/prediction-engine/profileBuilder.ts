/**
 * Profile Builder - Aggregates user habit data into UserBehavioralProfile
 *
 * This module handles the transformation of raw habit logs and daily metrics
 * into a comprehensive behavioral profile used for predictions.
 */

import type {
  DailyMetrics,
  UserBehavioralProfile,
  CategoryMetrics,
  TrendDirection,
  HabitWithLogs,
  HabitLog,
  UserProfile,
} from './types.js'
import { calculateBehavioralProfile, assessDataQuality } from './calculations.js'

// ============================================================================
// Types for Input Data (re-exported from types.js)
// ============================================================================

// Types are now imported from types.js above

// ============================================================================
// Category Mapping
// ============================================================================

/**
 * Maps habit categories to behavioral metric categories
 */
const CATEGORY_METRIC_MAP: Record<string, keyof DailyMetrics> = {
  sleep: 'sleepHours',
  study: 'studyHours',
  learning: 'studyHours',
  screen_time: 'screenTimeHours',
  digital: 'screenTimeHours',
  exercise: 'exerciseMinutes',
  fitness: 'exerciseMinutes',
  spending: 'spending',
  finance: 'spending',
  habit: 'habitCompletionRate',
  routine: 'habitCompletionRate',
  // Default fallback
  other: 'habitCompletionRate',
}

/**
 * Get metric key for a habit category
 */
function getMetricKeyForCategory(category: string): keyof DailyMetrics {
  const normalized = category.toLowerCase().replace(/\s+/g, '_')
  return CATEGORY_METRIC_MAP[normalized] || 'habitCompletionRate'
}

/**
 * Check if category is social/connection oriented
 */
function isSocialCategory(category: string): boolean {
  const socialCategories = ['social', 'relationship', 'family', 'friends', 'community', 'networking']
  const normalized = category.toLowerCase()
  return socialCategories.some(c => normalized.includes(c))
}

// ============================================================================
// Daily Metrics Aggregation
// ============================================================================

/**
 * Aggregate habit logs into daily metrics
 */
export function aggregateDailyMetrics(
  habits: HabitWithLogs[],
  dateRange: { start: string; end: string }
): DailyMetrics[] {
  const dailyData: Record<string, Partial<DailyMetrics>> = {}

  // Initialize all dates in range with zeros
  const startDate = new Date(dateRange.start)
  const endDate = new Date(dateRange.end)
  const currentDate = new Date(startDate)

  while (currentDate <= endDate) {
    const dateStr = currentDate.toISOString().split('T')[0]
    dailyData[dateStr] = {
      date: dateStr,
      sleepHours: 0,
      studyHours: 0,
      screenTimeHours: 0,
      exerciseMinutes: 0,
      spending: 0,
      habitCompletionRate: 0,
      consistencyScore: 0,
    }
    currentDate.setDate(currentDate.getDate() + 1)
  }

  // Track completion per date per category (for ALL habits, regardless of category)
  const dateCategoryCompletion: Record<string, Record<string, { completed: number; total: number }>> = {}

  for (const habit of habits) {
    const metricKey = getMetricKeyForCategory(habit.category)

    for (const log of habit.logs) {
      const dateStr = log.logDate
      if (!dailyData[dateStr]) continue

      const dayData = dailyData[dateStr]!

      // Track completion per date per category (binary: >=80% of target = completed)
      // This runs for ALL habits, not just 'habit' category
      const cat = habit.category
      if (!dateCategoryCompletion[dateStr]) dateCategoryCompletion[dateStr] = {}
      if (!dateCategoryCompletion[dateStr][cat]) {
        dateCategoryCompletion[dateStr][cat] = { completed: 0, total: 0 }
      }
      dateCategoryCompletion[dateStr][cat].total++
      if (log.actualValue >= habit.targetValue * 0.8) { // 80% of target = completed
        dateCategoryCompletion[dateStr][cat].completed++
      }

      // Add value to appropriate metric
      switch (metricKey) {
        case 'sleepHours':
          dayData.sleepHours! += log.actualValue
          break
        case 'studyHours':
          dayData.studyHours! += log.actualValue
          break
        case 'screenTimeHours':
          dayData.screenTimeHours! += log.actualValue
          break
        case 'exerciseMinutes':
          dayData.exerciseMinutes! += log.actualValue
          break
        case 'spending':
          dayData.spending! += log.actualValue
          break
        // habitCompletionRate is calculated separately from completion tracking
      }
    }
  }

  // Calculate completion rates and consistency scores
  const result: DailyMetrics[] = []

  for (const [date, data] of Object.entries(dailyData)) {
    // Calculate habit completion rate across all categories for this date
    let totalCompleted = 0
    let totalExpected = 0
    const dayCompletion = dateCategoryCompletion[date] || {}
    for (const [, stats] of Object.entries(dayCompletion)) {
      totalCompleted += stats.completed
      totalExpected += stats.total
    }
    data.habitCompletionRate = totalExpected > 0 ? (totalCompleted / totalExpected) * 100 : 0

    // Calculate consistency score (how many of the 5 raw input metric categories have data today)
    // habitCompletionRate is derived from habits, not a raw input category
    const rawMetricKeys: (keyof DailyMetrics)[] = ['sleepHours', 'studyHours', 'screenTimeHours', 'exerciseMinutes', 'spending']
    const categoriesWithData = rawMetricKeys.filter(key => (data[key] as number) > 0).length
    data.consistencyScore = Math.min(100, (categoriesWithData / 5) * 100) // 5 raw metric categories

    result.push(data as DailyMetrics)
  }

  return result.sort((a, b) => a.date.localeCompare(b.date))
}

/**
 * Build category breakdown from habits
 */
export function buildCategoryBreakdown(habits: HabitWithLogs[]): Record<string, CategoryMetrics> {
  const breakdown: Record<string, CategoryMetrics> = {}

  for (const habit of habits) {
    const category = habit.category
    if (!breakdown[category]) {
      breakdown[category] = {
        habitCount: 0,
        completionRate: 0,
        consistencyRate: 0,
        averageValue: 0,
      }
    }

    const cat = breakdown[category]
    cat.habitCount++

    // Calculate completion rate for this habit (average of actual/target ratio per log, capped at 100%)
    const completionRates = habit.logs.map(l => Math.min(100, (l.actualValue / Math.max(1, habit.targetValue)) * 100))
    const avgCompletionRate = completionRates.reduce((sum, r) => sum + r, 0) / Math.max(1, completionRates.length)
    cat.completionRate += avgCompletionRate

    // Calculate average value
    const totalValue = habit.logs.reduce((sum, l) => sum + l.actualValue, 0)
    cat.averageValue += totalValue / Math.max(1, habit.logs.length)
  }

  // Average the rates across habits in same category
  for (const cat of Object.values(breakdown)) {
    if (cat.habitCount > 0) {
      cat.completionRate = Math.round(cat.completionRate / cat.habitCount)
      cat.averageValue = Math.round(cat.averageValue / cat.habitCount * 10) / 10
    }
  }

  return breakdown
}

/**
 * Count unique categories and social habits
 */
export function countCategoriesAndSocial(habits: HabitWithLogs[]): { categoryCount: number; socialHabitsCount: number } {
  const categories = new Set(habits.map(h => h.category))
  const socialCount = habits.filter(h => isSocialCategory(h.category)).length

  return {
    categoryCount: categories.size,
    socialHabitsCount: socialCount,
  }
}

// ============================================================================
// Main Profile Builder
// ============================================================================

export interface BuildProfileInput {
  userId: string
  habits: HabitWithLogs[]
  userProfile?: UserProfile
  dateRange: { start: string; end: string }
  minimumDaysForPersonalized?: number
}

export interface BuildProfileOutput {
  profile: UserBehavioralProfile
  dataQuality: ReturnType<typeof assessDataQuality>
  goals: {
    targetSleepHours?: number
    targetStudyHours?: number
    targetScreenTimeHours?: number
    targetExerciseMinutes?: number
    targetMonthlySpending?: number
    targetCompletionRate?: number
  }
}

/**
 * Build complete user behavioral profile from habits and logs
 */
export function buildUserBehavioralProfile(input: BuildProfileInput): BuildProfileOutput {
  const { userId, habits, userProfile, dateRange, minimumDaysForPersonalized = 14 } = input

  // Aggregate daily metrics from habit logs
  const dailyMetrics = aggregateDailyMetrics(habits, dateRange)

  // Build category breakdown
  const categoryBreakdown = buildCategoryBreakdown(habits)

  // Count categories and social habits
  const { categoryCount, socialHabitsCount } = countCategoriesAndSocial(habits)

  // Extract goals from user profile
  const goals = {
    targetSleepHours: userProfile?.sleepGoal,
    targetStudyHours: userProfile?.studyGoal,
    targetScreenTimeHours: userProfile?.screenTimeGoal,
    targetExerciseMinutes: userProfile?.exerciseGoal,
    targetMonthlySpending: userProfile?.monthlyBudget,
    targetCompletionRate: userProfile?.completionGoal,
  }

  // Calculate behavioral profile using calculations module
  const profile = calculateBehavioralProfile(dailyMetrics, goals)

  // Set user ID and category breakdown
  profile.userId = userId
  profile.categoryBreakdown = categoryBreakdown

  // Assess data quality
  const dataQuality = assessDataQuality(profile, minimumDaysForPersonalized)

  return {
    profile,
    dataQuality,
    goals,
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get default date range (last 90 days)
 */
export function getDefaultDateRange(): { start: string; end: string } {
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - 90)

  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  }
}

/**
 * Filter habits by date range
 */
export function filterHabitsByDateRange(
  habits: HabitWithLogs[],
  startDate: string,
  endDate: string
): HabitWithLogs[] {
  return habits.map(habit => ({
    ...habit,
    logs: habit.logs.filter(log => log.logDate >= startDate && log.logDate <= endDate),
  })).filter(habit => habit.logs.length > 0)
}

/**
 * Get habits with sufficient data for personalized predictions
 */
export function getHabitsWithSufficientData(
  habits: HabitWithLogs[],
  minimumLogs: number = 7
): HabitWithLogs[] {
  return habits.filter(habit => habit.logs.length >= minimumLogs)
}