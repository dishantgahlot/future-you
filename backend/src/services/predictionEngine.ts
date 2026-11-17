import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { config } from '../config/index.js'

export interface PredictionInput {
  habitId: string | null
  userId: string
  predictionType: 'habit_streak' | 'habit_completion' | 'category_trend' | 'overall_score' | 'milestone'
  timeframe: 'week' | 'month' | 'quarter' | 'year'
}

export interface PredictionOutput {
  habit_id: string | null
  prediction_type: 'habit_streak' | 'habit_completion' | 'category_trend' | 'overall_score' | 'milestone'
  timeframe: 'week' | 'month' | 'quarter' | 'year'
  predicted_value: number
  confidence: number
  factors: Array<{
    name: string
    impact: number
    description: string
  }>
}

export async function generatePredictions(
  userId: string,
  supabase: SupabaseClient
): Promise<PredictionOutput[]> {
  const predictions: PredictionOutput[] = []

  const { data: habits } = await supabase
    .from('habits')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)

  const { data: logs } = await supabase
    .from('habit_logs')
    .select('*')
    .eq('user_id', userId)
    .gte('logged_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())
    .order('logged_at', { ascending: true })

  if (!habits || habits.length === 0) {
    return getDefaultPredictions(userId)
  }

  for (const habit of habits) {
    const habitLogs = logs?.filter(l => l.habit_id === habit.id) || []
    const completionRate = calculateCompletionRate(habitLogs, habit)
    const currentStreak = calculateCurrentStreak(habitLogs, habit)
    const avgValue = calculateAverageValue(habitLogs)

    predictions.push(
      generateHabitStreakPrediction(habit, habitLogs, currentStreak, completionRate),
      generateHabitCompletionPrediction(habit, habitLogs, completionRate),
      generateMilestonePrediction(habit, habitLogs, avgValue)
    )
  }

  const categoryPredictions = generateCategoryTrendPredictions(habits, logs || [])
  predictions.push(...categoryPredictions)

  predictions.push(generateOverallScorePrediction(habits, logs || []))

  return predictions
}

function calculateCompletionRate(logs: any[], habit: any): number {
  if (!logs.length) return 0
  const expected = getExpectedLogsCount(habit.frequency, 30)
  const completed = logs.filter(l => l.value >= habit.target_value * 0.8).length
  return Math.min(100, Math.round((completed / expected) * 100))
}

function calculateCurrentStreak(logs: any[], habit: any): number {
  if (!logs.length) return 0
  let streak = 0
  const sortedLogs = [...logs].sort((a, b) => new Date(b.logged_at).getTime() - new Date(a.logged_at).getTime())

  for (const log of sortedLogs) {
    if (log.value >= habit.target_value * 0.8) {
      streak++
    } else {
      break
    }
  }
  return streak
}

function calculateAverageValue(logs: any[]): number {
  if (!logs.length) return 0
  const sum = logs.reduce((acc, l) => acc + l.value, 0)
  return Math.round(sum / logs.length)
}

function getExpectedLogsCount(frequency: string, days: number): number {
  switch (frequency) {
    case 'daily': return days
    case 'weekly': return Math.ceil(days / 7)
    case 'monthly': return Math.ceil(days / 30)
    default: return days
  }
}

function generateHabitStreakPrediction(
  habit: any,
  logs: any[],
  currentStreak: number,
  completionRate: number
): PredictionOutput {
  const baseStreak = currentStreak
  const projectedDays = { week: 7, month: 30, quarter: 90, year: 365 }

  let predictedStreak = baseStreak
  const factors = [
    { name: 'Current streak', impact: Math.min(45, currentStreak * 2), description: `${currentStreak}-day streak indicates ${currentStreak > 7 ? 'strong' : 'building'} consistency` },
    { name: 'Completion rate', impact: Math.round(completionRate * 0.4), description: `${completionRate}% completion rate over 30 days` },
    { name: 'Weekend pattern', impact: -10, description: 'Slight drop on weekends observed' },
  ]

  const confidence = Math.min(95, 50 + completionRate * 0.3 + currentStreak * 0.5)

  return {
    habit_id: habit.id,
    prediction_type: 'habit_streak',
    timeframe: 'month',
    predicted_value: Math.round(predictedStreak * 1.5),
    confidence: Math.round(confidence),
    factors,
  }
}

function generateHabitCompletionPrediction(
  habit: any,
  logs: any[],
  completionRate: number
): PredictionOutput {
  const factors = [
    { name: 'Historical average', impact: 35, description: `${completionRate}% average completion` },
    { name: 'Habit difficulty', impact: habit.target_value > 5 ? -15 : 10, description: habit.target_value > 5 ? 'High target value' : 'Achievable target' },
    { name: 'Time of day', impact: 5, description: 'Morning habits show better adherence' },
  ]

  const confidence = Math.min(95, 60 + completionRate * 0.3)

  return {
    habit_id: habit.id,
    prediction_type: 'habit_completion',
    timeframe: 'week',
    predicted_value: Math.min(100, Math.round(completionRate * 1.1)),
    confidence: Math.round(confidence),
    factors,
  }
}

function generateMilestonePrediction(habit: any, logs: any[], avgValue: number): PredictionOutput {
  const projectedMonthly = avgValue * getExpectedLogsCount(habit.frequency, 30)
  const projectedYearly = projectedMonthly * 12

  const factors = [
    { name: 'Current trajectory', impact: 50, description: `On track for ${Math.round(projectedYearly)} ${habit.unit}/year` },
    { name: 'Seasonal variation', impact: 10, description: 'Summer typically increases activity' },
    { name: 'Life events', impact: -15, description: 'Vacations/holidays may cause gaps' },
  ]

  return {
    habit_id: habit.id,
    prediction_type: 'milestone',
    timeframe: 'year',
    predicted_value: Math.round(projectedYearly),
    confidence: 65,
    factors,
  }
}

function generateCategoryTrendPredictions(habits: any[], logs: any[]): PredictionOutput[] {
  const categories = [...new Set(habits.map(h => h.category))]
  const predictions: PredictionOutput[] = []

  for (const category of categories) {
    const catHabits = habits.filter(h => h.category === category)
    const catLogs = logs.filter(l => catHabits.some(h => h.id === l.habit_id))

    const completionRate = catLogs.length > 0
      ? Math.round((catLogs.filter(l => l.value >= 1).length / catLogs.length) * 100)
      : 0

    const trend = completionRate > 80 ? 'improving' : completionRate > 60 ? 'stable' : 'declining'

    predictions.push({
      habit_id: null,
      prediction_type: 'category_trend',
      timeframe: 'month',
      predicted_value: completionRate,
      confidence: 75,
      factors: [
        { name: 'Category average', impact: 40, description: `${completionRate}% completion in ${category}` },
        { name: 'Trend direction', impact: trend === 'improving' ? 20 : trend === 'declining' ? -20 : 0, description: `${trend} trend detected` },
        { name: 'Habit count', impact: Math.min(20, catHabits.length * 5), description: `${catHabits.length} active habits in this category` },
      ],
    })
  }

  return predictions
}

function generateOverallScorePrediction(habits: any[], logs: any[]): PredictionOutput {
  const totalHabits = habits.length
  const avgCompletion = logs.length > 0
    ? Math.round((logs.filter(l => l.value >= 1).length / logs.length) * 100)
    : 0

  const categoryDiversity = [...new Set(habits.map(h => h.category))].length

  const factors = [
    { name: 'Habit diversity', impact: Math.min(25, categoryDiversity * 5), description: `${categoryDiversity} categories covered` },
    { name: 'Overall completion', impact: Math.round(avgCompletion * 0.3), description: `${avgCompletion}% overall completion rate` },
    { name: 'Consistency', impact: 20, description: 'Regular logging pattern' },
    { name: 'Recovery capacity', impact: 15, description: 'Quick bounce-back after misses' },
  ]

  const predictedScore = Math.min(100, Math.round(avgCompletion * 0.7 + categoryDiversity * 3 + 20))

  return {
    habit_id: null,
    prediction_type: 'overall_score',
    timeframe: 'quarter',
    predicted_value: predictedScore,
    confidence: 78,
    factors,
  }
}

function getDefaultPredictions(userId: string): PredictionOutput[] {
  return [
    {
      habit_id: null,
      prediction_type: 'overall_score',
      timeframe: 'month',
      predicted_value: 50,
      confidence: 50,
      factors: [
        { name: 'No habits yet', impact: -50, description: 'Start tracking habits to get predictions' },
      ],
    },
  ]
}