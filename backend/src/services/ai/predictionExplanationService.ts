import { supabase } from '../../services/supabase.js'
import { generateJSON, isGeminiAvailable } from './geminiClient.js'
import { buildPredictionExplanationPrompt, type PredictionData, type ComparativeAnalysis, type BehavioralProfile, type UserProfile } from './promptBuilder.js'
import { validatePredictionExplanationResponse, DEFAULT_PREDICTION_EXPLANATION, sanitizeResponse } from './responseValidator.js'
import { generateFallbackPredictionExplanation, shouldUseFallback } from './fallbackService.js'
import { config } from '../../config/index.js'

// ============================================================================
// TYPES
// ============================================================================

export interface PredictionExplanation {
  currentPathSummary: string
  improvedPathSummary: string
  leveragePoints: Array<{ habit: string; impact: string; why: string }>
  feasibilityExplanation: string
  breakEvenExplanation: string
  uncertaintyExplanation: string
  closing: string
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
      fullName: 'Friend',
      email: 'user@futureyou.app',
      dateOfBirth: '2004-05-15',
      preferences: { tone: 'encouraging', theme: 'botanical' },
    }
  }

  return {
    id: data.id,
    fullName: data.full_name,
    email: data.email,
    dateOfBirth: data.date_of_birth,
    preferences: data.preferences,
  }
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

  // Fallback
  const { data: habits } = await supabase
    .from('habits')
    .select('id, name, category, frequency, target_value, unit, habit_logs(id, log_date, actual_value)')
    .eq('user_id', userId)
    .eq('is_active', true)

  if (!habits) {
    return {
      strengths: ['Building consistency'],
      weaknesses: ['Identifying growth areas'],
      patterns: ['Still learning your patterns'],
      consistencyScore: 0.5,
      categoryBalance: {},
      habitRipples: [],
    }
  }

  const habitSummaries = habits.map((habit: any) => {
    const logs = habit.habit_logs || []
    const completedLogs = logs.filter((l: any) => l.actual_value >= habit.target_value)
    const completionRate = logs.length > 0 ? completedLogs.length / logs.length : 0
    return { ...habit, completionRate }
  })

  const strengths: string[] = []
  const weaknesses: string[] = []
  const patterns: string[] = []

  if (habitSummaries.length > 0) {
    const avgCompletion = habitSummaries.reduce((sum: number, h: any) => sum + h.completionRate, 0) / habitSummaries.length
    const consistentHabits = habitSummaries.filter((h: any) => h.completionRate > 0.7).length

    if (avgCompletion > 0.7) strengths.push('High overall habit completion')
    if (consistentHabits > 2) strengths.push('Multiple consistent habits')
    if (habitSummaries.some((h: any) => h.category === 'sleep' && h.completionRate > 0.7)) strengths.push('Strong sleep consistency')

    if (avgCompletion < 0.4) weaknesses.push('Low overall completion rate')
    if (!habitSummaries.some((h: any) => h.category === 'sleep')) weaknesses.push('No sleep tracking')
    if (!habitSummaries.some((h: any) => h.category === 'fitness' || h.category === 'health')) weaknesses.push('Missing physical activity')

    if (habitSummaries.some((h: any) => h.trend === 'improving')) patterns.push('Building positive momentum')
    if (habitSummaries.some((h: any) => h.trend === 'declining')) patterns.push('Some habits declining - review needed')
    if (habitSummaries.length < 3) patterns.push('Few active habits - opportunity to expand')
  }

  return {
    strengths: strengths.length > 0 ? strengths : ['Building consistency'],
    weaknesses: weaknesses.length > 0 ? weaknesses : ['Identifying growth areas'],
    patterns: patterns.length > 0 ? patterns : ['Still learning your patterns'],
    consistencyScore: habitSummaries.length > 0
      ? habitSummaries.reduce((sum: number, h: any) => sum + h.completionRate, 0) / habitSummaries.length
      : 0.5,
    categoryBalance: habitSummaries.reduce((acc: any, h: any) => {
      acc[h.category] = (acc[h.category] || 0) + 1
      return acc
    }, {}),
    habitRipples: [],
  }
}

/**
 * Fetch prediction data (current and improved paths)
 */
async function fetchPredictionData(userId: string): Promise<{ current: PredictionData; improved: PredictionData } | null> {
  const { data: engineOutput } = await supabase
    .from('prediction_engine_outputs')
    .select('current_path, improved_path, comparative_analysis')
    .eq('user_id', userId)
    .order('generated_at', { ascending: false })
    .limit(1)
    .single()

  if (!engineOutput?.current_path || !engineOutput?.improved_path) {
    return null
  }

  const transformProjection = (proj: any, isImproved: boolean) => {
    const dimensions = ['health', 'academic', 'digitalWellbeing', 'financial', 'personalDevelopment'] as const
    const result: any = {}

    for (const dim of dimensions) {
      const data = proj[dim]
      if (!data) continue

      let currentValue = 50
      let projectedValue = 50

      if (dim === 'health') {
        currentValue = data.sleepScore || data.overallHealthIndex || 50
        projectedValue = isImproved ? Math.min(95, currentValue * 1.3) : currentValue
      } else if (dim === 'academic') {
        currentValue = data.consistencyScore || 50
        projectedValue = isImproved ? Math.min(95, currentValue * 1.3) : currentValue
      } else if (dim === 'digitalWellbeing') {
        currentValue = data.screenTimeScore || 50
        projectedValue = isImproved ? Math.min(95, currentValue * 1.3) : currentValue
      } else if (dim === 'financial') {
        currentValue = data.financialStressLevel === 'low' ? 80 : data.financialStressLevel === 'moderate' ? 50 : 30
        projectedValue = isImproved ? Math.min(95, currentValue + 20) : currentValue
      } else if (dim === 'personalDevelopment') {
        currentValue = data.lifeSatisfactionIndex || 50
        projectedValue = isImproved ? Math.min(95, currentValue * 1.2) : currentValue
      }

      result[dim] = { current: currentValue, projected: projectedValue }
    }

    const values = Object.values(result) as Array<{ current: number; projected: number }>
    return {
      health: result.health || { current: 50, projected: 65, uncertaintyRange: { min: 40, max: 60 }, confidence: 70, keyFactors: ['sleep', 'exercise'] },
      academic: result.academic || { current: 50, projected: 65, uncertaintyRange: { min: 40, max: 60 }, confidence: 70, keyFactors: ['study', 'focus'] },
      digital: result.digitalWellbeing || { current: 50, projected: 65, uncertaintyRange: { min: 40, max: 60 }, confidence: 70, keyFactors: ['screen_time', 'focus'] },
      financial: result.financial || { current: 50, projected: 65, uncertaintyRange: { min: 40, max: 60 }, confidence: 70, keyFactors: ['spending', 'saving'] },
      personal: result.personalDevelopment || { current: 50, projected: 65, uncertaintyRange: { min: 40, max: 60 }, confidence: 70, keyFactors: ['habits', 'growth'] },
      overallScore: values.length > 0
        ? values.reduce((a: number, b: { current: number }) => a + b.current, 0) / values.length
        : 50,
      confidence: proj.uncertainty?.confidenceLevel || 70,
    }
  }

  return {
    current: transformProjection(engineOutput.current_path.projections['6_months'], false),
    improved: transformProjection(engineOutput.improved_path.projections['6_months'], true),
  }
}

/**
 * Fetch comparative analysis
 */
async function fetchComparativeAnalysis(userId: string): Promise<ComparativeAnalysis> {
  const { data: engineOutput } = await supabase
    .from('prediction_engine_outputs')
    .select('comparative_analysis, current_path')
    .eq('user_id', userId)
    .order('generated_at', { ascending: false })
    .limit(1)
    .single()

  if (engineOutput?.comparative_analysis) {
    const ca = engineOutput.comparative_analysis
    return {
      scoreDifference: ca.overallImprovement || 20,
      percentageImprovement: ca.overallImprovement || 40,
      keyLeveragePoints: ca.keyLeveragePoints || ['Sleep consistency', 'Evening screen limit', 'Daily movement'],
      timeToBreakEven: parseInt((ca.timeToBreakEven || '3 months').replace(/\D/g, '')) || 3,
      feasibilityScore: 0.75,
      assumptions: engineOutput.current_path?.assumptions ? Object.values(engineOutput.current_path.assumptions).map(String) : [],
    }
  }

  return {
    scoreDifference: 20,
    percentageImprovement: 40,
    keyLeveragePoints: ['Sleep consistency', 'Evening screen limit', 'Daily movement'],
    timeToBreakEven: 3,
    feasibilityScore: 0.75,
    assumptions: [],
  }
}

/**
 * Generate prediction explanation
 */
export async function generatePredictionExplanation(userId: string): Promise<{
  explanation: PredictionExplanation
  usedFallback: boolean
}> {
  // Fetch all data
  const [userProfile, behavioralProfile, predictionData, comparativeAnalysis] = await Promise.all([
    fetchUserProfile(userId),
    fetchBehavioralProfile(userId),
    fetchPredictionData(userId),
    fetchComparativeAnalysis(userId),
  ])

  if (!userProfile) {
    throw new Error('User profile not found')
  }

  // Use prediction data if available, otherwise create defaults
  const currentPath = predictionData?.current || createDefaultPredictionData()
  const improvedPath = predictionData?.improved || createImprovedPredictionData(currentPath)

  // Build prompt
  const prompt = buildPredictionExplanationPrompt({
    currentPath,
    improvedPath,
    comparativeAnalysis,
    behavioralProfile,
    userProfile,
  })

  // Check if we should use fallback
  const geminiAvailable = isGeminiAvailable() && config.gemini.apiKey !== 'your_gemini_api_key'
  let usedFallback = false
  let response: any

  if (!geminiAvailable) {
    usedFallback = true
  } else {
    const result = await generateJSON(prompt, undefined, {
      temperature: 0.6,
      maxOutputTokens: 600,
      timeout: 20000,
    })

    if (result.success && result.data) {
      const validation = validatePredictionExplanationResponse(result.data)
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
    const fallbackContext = {
      predictions: {
        health: currentPath.health.current,
        academic: currentPath.academic.current,
        digital: currentPath.digital.current,
        financial: currentPath.financial.current,
        personal: currentPath.personal.current,
        overall: currentPath.overallScore,
      },
      comparativeAnalysis,
      behavioralProfile: {
        consistencyScore: behavioralProfile.consistencyScore,
        strengths: behavioralProfile.strengths,
        weaknesses: behavioralProfile.weaknesses,
        patterns: behavioralProfile.patterns,
      },
    }
    response = generateFallbackPredictionExplanation(fallbackContext)
  }

  // Sanitize
  const sanitizedResponse = sanitizeResponse(response)

  return {
    explanation: sanitizedResponse,
    usedFallback,
  }
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

function createImprovedPredictionData(current: PredictionData): PredictionData {
  return {
    health: { ...current.health, projected: Math.min(90, current.health.current + 20) },
    academic: { ...current.academic, projected: Math.min(90, current.academic.current + 20) },
    digital: { ...current.digital, projected: Math.min(90, current.digital.current + 20) },
    financial: { ...current.financial, projected: Math.min(90, current.financial.current + 20) },
    personal: { ...current.personal, projected: Math.min(90, current.personal.current + 20) },
    overallScore: Math.min(90, current.overallScore + 20),
    confidence: 75,
  }
}