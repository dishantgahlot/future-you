import { supabase } from '../../services/supabase.js'
import { generateJSON, isGeminiAvailable } from './geminiClient.js'
import { buildHabitRecommendationPrompt, type HabitSummary, type UserProfile, type BehavioralProfile, type PredictionData, type DimensionPrediction } from './promptBuilder.js'
import { validateHabitRecommendationResponse, DEFAULT_HABIT_RECOMMENDATIONS, sanitizeResponse } from './responseValidator.js'
import { generateFallbackHabitRecommendations, shouldUseFallback } from './fallbackService.js'
import { config } from '../../config/index.js'

// ============================================================================
// TYPES
// ============================================================================

export interface HabitRecommendation {
  name: string
  category: string
  frequency: 'daily' | 'weekly' | 'monthly'
  targetValue: number
  unit: string
  why: string
  difficulty: 'easy' | 'moderate' | 'hard'
  expectedImpact: 'high' | 'medium' | 'low'
  firstMicroStep: string
}

export interface GenerateHabitRecommendationsOptions {
  userId: string
  regenerate?: boolean
}

/**
 * Fetch user profile
 */
async function fetchUserProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, date_of_birth, preferences')
    .eq('id', userId)
    .single()

  if (error || !data) {
    return {
      id: userId,
      fullName: 'Dishant',
      email: 'dishant@futureyou.app',
      dateOfBirth: '2004-05-15',
      preferences: { tone: 'encouraging', theme: 'botanical' },
    }
  }

  return {
    id: data.id,
    fullName: data.full_name || 'Dishant',
    email: data.email || 'dishant@futureyou.app',
    dateOfBirth: data.date_of_birth || '2004-05-15',
    preferences: data.preferences,
  }
}

/**
 * Fetch habit summaries
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

    let currentStreak = 0
    const sortedLogs = logs
      .map((l: any) => ({ date: l.log_date, completed: l.actual_value >= habit.target_value }))
      .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())

    for (const log of sortedLogs) {
      if (log.completed) currentStreak++
      else break
    }

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
 * Fetch behavioral profile
 */
async function fetchBehavioralProfile(userId: string): Promise<BehavioralProfile> {
  const { data: engineOutput } = await supabase
    .from('prediction_engine_outputs')
    .select('behavioral_profile')
    .eq('user_id', userId)
    .order('generated_at', { ascending: false })
    .limit(1)
    .single()

  if (engineOutput?.behavioral_profile) {
    return engineOutput.behavioral_profile
  }

  const habits = await fetchHabitSummaries(userId)
  const strengths: string[] = []
  const weaknesses: string[] = []
  const patterns: string[] = []

  if (habits.length > 0) {
    const avgCompletion = habits.reduce((sum, h) => sum + h.completionRate, 0) / habits.length
    const consistentHabits = habits.filter(h => h.completionRate > 0.7).length

    if (avgCompletion > 0.7) strengths.push('High overall habit completion')
    if (consistentHabits > 2) strengths.push('Multiple consistent habits')
    if (habits.some(h => h.category === 'sleep' && h.completionRate > 0.7)) strengths.push('Strong sleep consistency')

    if (avgCompletion < 0.4) weaknesses.push('Low overall completion rate')
    if (!habits.some(h => h.category === 'sleep')) weaknesses.push('No sleep tracking')
    if (!habits.some(h => h.category === 'fitness' || h.category === 'health')) weaknesses.push('Missing physical activity')

    if (habits.some(h => h.trend === 'improving')) patterns.push('Building positive momentum')
    if (habits.some(h => h.trend === 'declining')) patterns.push('Some habits declining - review needed')
    if (habits.length < 3) patterns.push('Few active habits - opportunity to expand')
  }

  const habitRipples = habits
    .filter(h => h.completionRate > 0.5)
    .slice(0, 3)
    .flatMap(h1 =>
      habits
        .filter(h2 => h2.id !== h1.id && h2.completionRate > 0.5)
        .slice(0, 2)
        .map(h2 => ({
          habitA: h1.name,
          habitB: h2.name,
          correlation: 0.4 + Math.random() * 0.3,
        }))
    )

  return {
    strengths: strengths.length > 0 ? strengths : ['Building consistency'],
    weaknesses: weaknesses.length > 0 ? weaknesses : ['Identifying growth areas'],
    patterns: patterns.length > 0 ? patterns : ['Still learning your patterns'],
    consistencyScore: habits.length > 0
      ? habits.reduce((sum, h) => sum + h.completionRate, 0) / habits.length
      : 0.5,
    categoryBalance: habits.reduce((acc, h) => {
      acc[h.category] = (acc[h.category] || 0) + 1
      return acc
    }, {} as Record<string, number>),
    habitRipples: habitRipples.slice(0, 5),
  }
}

/**
 * Fetch prediction data
 */
async function fetchPredictionData(userId: string): Promise<PredictionData | null> {
  const { data: engineOutput } = await supabase
    .from('prediction_engine_outputs')
    .select('current_path, improved_path')
    .eq('user_id', userId)
    .order('generated_at', { ascending: false })
    .limit(1)
    .single()

  if (!engineOutput?.current_path) {
    return null
  }

  const transformProjection = (proj: any): PredictionData => {
    const dimensions = ['health', 'academic', 'digitalWellbeing', 'financial', 'personalDevelopment'] as const
    const result: Record<string, DimensionPrediction> = {}

    for (const dim of dimensions) {
      const data = proj[dim]
      if (!data) continue
      let currentValue = 50
      let projectedValue = 50
      let keyFactors: string[] = []
      let uncertaintyMin = 40
      let uncertaintyMax = 60

      if (dim === 'health') {
        currentValue = data.sleepScore || data.overallHealthIndex || 50
        projectedValue = Math.min(95, currentValue * 1.3)
        keyFactors = ['sleep', 'exercise']
        uncertaintyMin = Math.max(0, currentValue - 15)
        uncertaintyMax = Math.min(100, currentValue + 15)
      } else if (dim === 'academic') {
        currentValue = data.consistencyScore || 50
        projectedValue = Math.min(95, currentValue * 1.3)
        keyFactors = ['study', 'focus']
        uncertaintyMin = Math.max(0, currentValue - 15)
        uncertaintyMax = Math.min(100, currentValue + 15)
      } else if (dim === 'digitalWellbeing') {
        currentValue = data.screenTimeScore || 50
        projectedValue = Math.min(95, currentValue * 1.3)
        keyFactors = ['screen_time', 'focus']
        uncertaintyMin = Math.max(0, currentValue - 15)
        uncertaintyMax = Math.min(100, currentValue + 15)
      } else if (dim === 'financial') {
        currentValue = data.financialStressLevel === 'low' ? 80 : data.financialStressLevel === 'moderate' ? 50 : 30
        projectedValue = Math.min(95, currentValue + 20)
        keyFactors = ['spending', 'saving']
        uncertaintyMin = Math.max(0, currentValue - 20)
        uncertaintyMax = Math.min(100, currentValue + 20)
      } else if (dim === 'personalDevelopment') {
        currentValue = data.lifeSatisfactionIndex || 50
        projectedValue = Math.min(95, currentValue * 1.2)
        keyFactors = ['habits', 'growth']
        uncertaintyMin = Math.max(0, currentValue - 15)
        uncertaintyMax = Math.min(100, currentValue + 15)
      }

      result[dim] = {
        current: currentValue,
        projected: projectedValue,
        uncertaintyRange: { min: uncertaintyMin, max: uncertaintyMax },
        confidence: 70,
        keyFactors,
      }
    }

    const values = Object.values(result)
    return {
      health: result.health || { current: 50, projected: 65, uncertaintyRange: { min: 40, max: 60 }, confidence: 70, keyFactors: ['sleep', 'exercise'] },
      academic: result.academic || { current: 50, projected: 65, uncertaintyRange: { min: 40, max: 60 }, confidence: 70, keyFactors: ['study', 'focus'] },
      digital: result.digitalWellbeing || { current: 50, projected: 65, uncertaintyRange: { min: 40, max: 60 }, confidence: 70, keyFactors: ['screen_time', 'focus'] },
      financial: result.financial || { current: 50, projected: 65, uncertaintyRange: { min: 40, max: 60 }, confidence: 70, keyFactors: ['spending', 'saving'] },
      personal: result.personalDevelopment || { current: 50, projected: 65, uncertaintyRange: { min: 40, max: 60 }, confidence: 70, keyFactors: ['habits', 'growth'] },
      overallScore: values.length > 0
        ? values.reduce((a: number, b: DimensionPrediction) => a + b.current, 0) / values.length
        : 50,
      confidence: proj.uncertainty?.confidenceLevel || 70,
    }
  }

  return transformProjection(engineOutput.current_path.projections['6_months'])
}

// In-memory cache for recommendations (5 min TTL)
const memoryRecCache = new Map<string, { data: HabitRecommendation[]; expiry: number }>()

/**
 * Check cache for existing recommendations
 */
async function getCachedRecommendations(userId: string): Promise<HabitRecommendation[] | null> {
  const cached = memoryRecCache.get(userId)
  if (cached && Date.now() < cached.expiry) {
    return cached.data
  }
  return null
}

/**
 * Generate habit recommendations
 */
export async function generateHabitRecommendations(options: GenerateHabitRecommendationsOptions): Promise<{
  recommendations: HabitRecommendation[]
  usedFallback: boolean
}> {
  const { userId, regenerate = false } = options

  // Check cache (if implemented)
  if (!regenerate) {
    const cached = await getCachedRecommendations(userId)
    if (cached) {
      return { recommendations: cached, usedFallback: false }
    }
  }

  // Fetch data
  const [userProfile, habitSummary, behavioralProfile, predictionData] = await Promise.all([
    fetchUserProfile(userId),
    fetchHabitSummaries(userId),
    fetchBehavioralProfile(userId),
    fetchPredictionData(userId),
  ])

  if (!userProfile) {
    throw new Error('User profile not found')
  }

  // Build prompt
  const prompt = buildHabitRecommendationPrompt({
    userProfile,
    habitSummary,
    behavioralProfile,
    currentPredictions: predictionData || createDefaultPredictionData(),
    goals: userProfile.preferences?.goals || [],
    availableTime: userProfile.preferences?.availableTime,
  })

  // Check if we should use fallback
  const geminiAvailable = isGeminiAvailable() && config.gemini.apiKey !== 'your_gemini_api_key'
  let usedFallback = false
  let response: any

  if (!geminiAvailable) {
    usedFallback = true
  } else {
    const result = await generateJSON(prompt, undefined, {
      temperature: 0.7,
      maxOutputTokens: 600,
      timeout: 20000,
    })

    if (result.success && result.data) {
      const validation = validateHabitRecommendationResponse(result.data)
      if (validation.success) {
        response = validation.data
      } else {
        usedFallback = true
      }
    } else {
      usedFallback = true
    }
  }

  if (usedFallback) {
    // Transform habitSummary to match FallbackContext expected shape
    const transformedHabitSummary = habitSummary.map(h => ({
      name: h.name,
      category: h.category,
      completionRate: h.completionRate,
      trend: h.trend,
    }))

    // Transform predictionData to match FallbackContext expected shape (needs overall, not overallScore)
    const transformedPredictions = (predictionData || createDefaultPredictionData())
    const predictionsForFallback = {
      health: transformedPredictions.health.current,
      academic: transformedPredictions.academic.current,
      digital: transformedPredictions.digital.current,
      financial: transformedPredictions.financial.current,
      personal: transformedPredictions.personal.current,
      overall: transformedPredictions.overallScore,
    }

    const fallbackContext = {
      habitSummary: transformedHabitSummary,
      behavioralProfile,
      predictions: predictionsForFallback,
      userGoals: userProfile.preferences?.goals || [],
      availableTime: userProfile.preferences?.availableTime,
    }
    response = generateFallbackHabitRecommendations(fallbackContext)
  }

  // Sanitize and cache
  const sanitizedResponse = sanitizeResponse(response)
  memoryRecCache.set(userId, { data: sanitizedResponse.recommendations, expiry: Date.now() + 300000 })

  return {
    recommendations: sanitizedResponse.recommendations,
    usedFallback,
  }
}

/**
 * Create a habit from a recommendation
 */
export async function createHabitFromRecommendation(
  userId: string,
  recommendation: HabitRecommendation
): Promise<any> {
  const { data, error } = await supabase
    .from('habits')
    .insert({
      user_id: userId,
      name: recommendation.name,
      category: recommendation.category,
      frequency: recommendation.frequency,
      target_value: recommendation.targetValue,
      unit: recommendation.unit,
      color: getColorForCategory(recommendation.category),
      icon: getIconForCategory(recommendation.category),
      is_active: true,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

function getColorForCategory(category: string): string {
  const colors: Record<string, string> = {
    health: '#10b981',
    fitness: '#ef4444',
    nutrition: '#f59e0b',
    sleep: '#8b5cf6',
    mental_health: '#ec4899',
    productivity: '#3b82f6',
    learning: '#06b6d4',
    finance: '#22c55e',
    social: '#f97316',
    other: '#6b7280',
  }
  return colors[category] || '#6b7280'
}

function getIconForCategory(category: string): string {
  const icons: Record<string, string> = {
    health: '💧',
    fitness: '💪',
    nutrition: '🥗',
    sleep: '😴',
    mental_health: '🧘',
    productivity: '✅',
    learning: '📚',
    finance: '💰',
    social: '👥',
    other: '📦',
  }
  return icons[category] || '📦'
}

function createDefaultPredictionData(): PredictionData {
  return {
    health: { current: 50, projected: 65, uncertaintyRange: { min: 40, max: 60 }, confidence: 70, keyFactors: ['sleep', 'exercise'] },
    academic: { current: 50, projected: 65, uncertaintyRange: { min: 40, max: 60 }, confidence: 70, keyFactors: ['study', 'focus'] },
    digital: { current: 50, projected: 65, uncertaintyRange: { min: 40, max: 60 }, confidence: 70, keyFactors: ['screen_time', 'focus'] },
    financial: { current: 50, projected: 65, uncertaintyRange: { min: 40, max: 60 }, confidence: 70, keyFactors: ['spending', 'saving'] },
    personal: { current: 50, projected: 65, uncertaintyRange: { min: 40, max: 60 }, confidence: 70, keyFactors: ['habits', 'growth'] },
    overallScore: 50,
    confidence: 70,
  }
}