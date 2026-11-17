import { supabase } from '../../services/supabase.js'
import { generateContent, isGeminiAvailable } from './geminiClient.js'
import { buildCoachPrompt, type CoachContext, type CoachCategory } from './promptBuilder.js'
import { validateCoachResponse, sanitizeResponse } from './responseValidator.js'
import { generateFallbackCoachResponse, shouldUseFallback } from './fallbackService.js'
import { config } from '../../config/index.js'

// ============================================================================
// TYPES
// ============================================================================

export interface CoachSession {
  id: string
  user_id: string
  question: string
  answer: string
  context_type: string
  context_data?: any
  generated_at: string
}

export interface AskCoachOptions {
  userId: string
  question: string
  contextType?: CoachCategory
  contextData?: any
}

/**
 * Categorize the user's question
 */
function categorizeQuestion(question: string): CoachCategory {
  const lower = question.toLowerCase()

  if (lower.includes('sleep') || lower.includes('tired') || lower.includes('energy') || lower.includes('wake') || lower.includes('bedtime')) {
    return 'sleep'
  }
  if (lower.includes('screen') || lower.includes('phone') || lower.includes('social media') || lower.includes('scroll') || lower.includes('digital')) {
    return 'screen_time'
  }
  if (lower.includes('study') || lower.includes('learn') || lower.includes('focus') || lower.includes('productiv') || lower.includes('work') || lower.includes('concentrat')) {
    return 'study'
  }
  if (lower.includes('exercise') || lower.includes('workout') || lower.includes('fit') || lower.includes('move') || lower.includes('gym') || lower.includes('run')) {
    return 'exercise'
  }
  if (lower.includes('money') || lower.includes('financ') || lower.includes('spend') || lower.includes('budget') || lower.includes('save') || lower.includes('expense')) {
    return 'finance'
  }
  if (lower.includes('habit') || lower.includes('routine') || lower.includes('consisten') || lower.includes('streak') || lower.includes('build')) {
    return 'habit'
  }
  if (lower.includes('predict') || lower.includes('future') || lower.includes('projection') || lower.includes('improv') || lower.includes('path') || lower.includes('scenario')) {
    return 'prediction'
  }

  return 'general'
}

/**
 * Fetch user profile
 */
async function fetchUserProfile(userId: string): Promise<any> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, email, date_of_birth, preferences')
      .eq('id', userId)
      .single()

    if (!error && data) {
      return {
        id: data.id,
        fullName: data.full_name || 'Dishant',
        email: data.email || 'dishant@futureyou.app',
        dateOfBirth: data.date_of_birth || '2004-05-15',
        preferences: data.preferences,
      }
    }
  } catch (e) {}

  return {
    id: userId,
    fullName: 'Dishant',
    email: 'dishant@futureyou.app',
    dateOfBirth: '2004-05-15',
    preferences: {
      tone: 'encouraging',
      theme: 'botanical',
    },
  }
}

/**
 * Fetch habit summaries
 */
async function fetchHabitSummaries(userId: string): Promise<any[]> {
  const { data: habits, error } = await supabase
    .from('habits')
    .select(`
      id, name, category, frequency, target_value, unit,
      habit_logs (id, log_date, actual_value, value, progress_percentage, completion_status, created_at)
    `)
    .eq('user_id', userId)
    .eq('is_active', true)

  if (error || !habits) return []

  return habits.map(habit => {
    const logs = habit.habit_logs || []
    const target = Number(habit.target_value) || 1
    const completedLogs = logs.filter((l: any) => (l.actual_value !== undefined ? l.actual_value : l.value) >= target)
    const completionRate = logs.length > 0 ? completedLogs.length / logs.length : 0

    let totalProgressSum = 0
    let highPartialCount = 0
    logs.forEach((l: any) => {
      const val = l.actual_value !== undefined ? Number(l.actual_value) : Number(l.value) || 0
      const pct = l.progress_percentage !== undefined && l.progress_percentage !== null
        ? Number(l.progress_percentage)
        : target > 0 ? Math.min(Math.round((val / target) * 100 * 10) / 10, 100) : 0
      totalProgressSum += pct
      if (pct >= 70 && pct < 100) highPartialCount++
    })

    const avgProgressPct = logs.length > 0 ? Math.round((totalProgressSum / logs.length) * 10) / 10 : 70
    const latestLog = logs[0]
    const latestVal = latestLog
      ? (latestLog.actual_value !== undefined ? Number(latestLog.actual_value) : Number(latestLog.value) || 0)
      : 0
    const latestPct = latestLog
      ? (latestLog.progress_percentage !== undefined && latestLog.progress_percentage !== null
        ? Number(latestLog.progress_percentage)
        : target > 0 ? Math.min(Math.round((latestVal / target) * 100 * 10) / 10, 100) : 0)
      : avgProgressPct

    let progressTier: 'full' | 'high_partial' | 'moderate_partial' | 'started' | 'unstarted'
    if (latestPct >= 100) progressTier = 'full'
    else if (latestPct >= 70) progressTier = 'high_partial'
    else if (latestPct >= 40) progressTier = 'moderate_partial'
    else if (latestPct > 0) progressTier = 'started'
    else progressTier = 'unstarted'

    let currentStreak = 0
    const sortedLogs = logs
      .map((l: any) => ({ date: l.log_date, completed: (l.actual_value !== undefined ? l.actual_value : l.value) >= target }))
      .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())

    for (const log of sortedLogs) {
      if (log.completed) currentStreak++
      else break
    }

    const now = new Date()
    const recentCutoff = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)
    const previousCutoff = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000)

    const recentLogs = logs.filter((l: any) => new Date(l.log_date) >= recentCutoff)
    const previousLogs = logs.filter((l: any) => new Date(l.log_date) >= previousCutoff && new Date(l.log_date) < recentCutoff)

    const recentRate = recentLogs.length > 0
      ? recentLogs.filter((l: any) => (l.actual_value !== undefined ? l.actual_value : l.value) >= target).length / recentLogs.length
      : 0
    const previousRate = previousLogs.length > 0
      ? previousLogs.filter((l: any) => (l.actual_value !== undefined ? l.actual_value : l.value) >= target).length / previousLogs.length
      : 0

    let trend: 'improving' | 'declining' | 'stable' = 'stable'
    if (recentRate > previousRate + 0.1) trend = 'improving'
    else if (recentRate < previousRate - 0.1) trend = 'declining'

    return {
      id: habit.id,
      name: habit.name,
      category: habit.category,
      frequency: habit.frequency,
      targetValue: target,
      unit: habit.unit,
      completionRate,
      averageProgressPercentage: avgProgressPct,
      latestProgressPercentage: latestPct,
      progressTier,
      highPartialCount,
      currentStreak,
      totalLogs: logs.length,
      trend,
    }
  })
}

/**
 * Fetch behavioral profile
 */
async function fetchBehavioralProfile(userId: string): Promise<any> {
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
    habitRipples: [],
  }
}

/**
 * Fetch prediction data
 */
async function fetchPredictionData(userId: string): Promise<any> {
  const { data: engineOutput } = await supabase
    .from('prediction_engine_outputs')
    .select('current_path, improved_path, comparative_analysis')
    .eq('user_id', userId)
    .order('generated_at', { ascending: false })
    .limit(1)
    .single()

  if (!engineOutput?.current_path) {
    const base = { health: 68, academic: 72, digital: 62, financial: 65, personal: 66, overall: 67 }
    const improved = { health: 86, academic: 88, digital: 84, financial: 82, personal: 85, overall: 85 }
    return {
      current: base,
      improved: improved,
    }
  }

  const extractScore = (proj: any, dim: string) => {
    const data = proj[dim]
    if (!data) return 50
    if (dim === 'health') return data.sleepScore || data.overallHealthIndex || 50
    if (dim === 'academic') return data.consistencyScore || 50
    if (dim === 'digitalWellbeing') return data.screenTimeScore || 50
    if (dim === 'financial') return data.financialStressLevel === 'low' ? 80 : data.financialStressLevel === 'moderate' ? 50 : 30
    if (dim === 'personalDevelopment') return data.lifeSatisfactionIndex || 50
    return 50
  }

  const currentProj = engineOutput.current_path.projections['6_months']
  const improvedProj = engineOutput.improved_path?.projections['6_months'] || currentProj

  return {
    current: {
      health: extractScore(currentProj, 'health'),
      academic: extractScore(currentProj, 'academic'),
      digital: extractScore(currentProj, 'digitalWellbeing'),
      financial: extractScore(currentProj, 'financial'),
      personal: extractScore(currentProj, 'personalDevelopment'),
      overall: (extractScore(currentProj, 'health') + extractScore(currentProj, 'academic') +
                extractScore(currentProj, 'digitalWellbeing') + extractScore(currentProj, 'financial') +
                extractScore(currentProj, 'personalDevelopment')) / 5,
    },
    improved: {
      health: extractScore(improvedProj, 'health'),
      academic: extractScore(improvedProj, 'academic'),
      digital: extractScore(improvedProj, 'digitalWellbeing'),
      financial: extractScore(improvedProj, 'financial'),
      personal: extractScore(improvedProj, 'personalDevelopment'),
      overall: (extractScore(improvedProj, 'health') + extractScore(improvedProj, 'academic') +
                extractScore(improvedProj, 'digitalWellbeing') + extractScore(improvedProj, 'financial') +
                extractScore(improvedProj, 'personalDevelopment')) / 5,
    },
  }
}

/**
 * Fetch recent insights
 */
async function fetchRecentInsights(userId: string): Promise<string[]> {
  const { data } = await supabase
    .from('ai_weekly_insights')
    .select('summary, highlights')
    .eq('user_id', userId)
    .order('week_start', { ascending: false })
    .limit(4)

  if (!data) return []

  return data.flatMap(i => [i.summary, ...(i.highlights || [])]).slice(0, 10)
}

/**
 * Fetch saved letters
 */
async function fetchSavedLetters(userId: string): Promise<Array<{ type: string; content: string; date: string }>> {
  const { data } = await supabase
    .from('ai_generated_letters')
    .select('letter_type, content, generated_at')
    .eq('user_id', userId)
    .order('generated_at', { ascending: false })
    .limit(3)

  if (!data) return []

  return data.map(d => ({
    type: d.letter_type,
    content: d.content.substring(0, 200),
    date: d.generated_at,
  }))
}

// In-memory sessions store for demo/fallback
const memoryCoachSessions: Record<string, CoachSession[]> = {}

const isValidUuid = (str: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str)

/**
 * Fetch conversation history
 */
async function fetchConversationHistory(userId: string, limit = 6): Promise<Array<{ role: 'user' | 'assistant'; content: string }>> {
  if (isValidUuid(userId)) {
    try {
      const { data } = await supabase
        .from('ai_coach_sessions')
        .select('question, answer')
        .eq('user_id', userId)
        .order('generated_at', { ascending: false })
        .limit(limit)

      if (data && data.length > 0) {
        return data
          .reverse()
          .flatMap(s => [
            { role: 'user' as const, content: s.question },
            { role: 'assistant' as const, content: s.answer },
          ])
      }
    } catch (e) {}
  }

  const mem = memoryCoachSessions[userId] || []
  return mem
    .slice(0, limit)
    .reverse()
    .flatMap(s => [
      { role: 'user' as const, content: s.question },
      { role: 'assistant' as const, content: s.answer },
    ])
}

// In-memory cache for coach user context (TTL 60s)
const coachContextCache = new Map<string, { data: any; expiry: number }>()

/**
 * Fetch all coach context with 60s TTL caching
 */
async function fetchCachedCoachContext(userId: string): Promise<{
  userProfile: any
  habitSummary: any[]
  behavioralProfile: any
  predictionData: any
  recentInsights: string[]
  savedLetters: Array<{ type: string; content: string; date: string }>
}> {
  const cacheKey = `ctx_${userId}`
  const cached = coachContextCache.get(cacheKey)
  if (cached && Date.now() < cached.expiry) {
    return cached.data
  }

  const [
    userProfile,
    habitSummary,
    behavioralProfile,
    predictionData,
    recentInsights,
    savedLetters,
  ] = await Promise.all([
    fetchUserProfile(userId),
    fetchHabitSummaries(userId),
    fetchBehavioralProfile(userId),
    fetchPredictionData(userId),
    fetchRecentInsights(userId),
    fetchSavedLetters(userId),
  ])

  const contextData = {
    userProfile,
    habitSummary,
    behavioralProfile,
    predictionData,
    recentInsights,
    savedLetters,
  }

  coachContextCache.set(cacheKey, { data: contextData, expiry: Date.now() + 60000 })
  return contextData
}

/**
 * Save coach session (in-memory immediately, async to Supabase)
 */
async function saveCoachSession(userId: string, question: string, answer: string, contextType: string, contextData?: any): Promise<void> {
  const newSession: CoachSession = {
    id: `sess_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    user_id: userId,
    question,
    answer,
    context_type: contextType,
    context_data: contextData,
    generated_at: new Date().toISOString(),
  }

  if (!memoryCoachSessions[userId]) {
    memoryCoachSessions[userId] = []
  }
  memoryCoachSessions[userId].unshift(newSession)

  if (isValidUuid(userId)) {
    // Non-blocking background save to Supabase
    Promise.resolve(
      supabase
        .from('ai_coach_sessions')
        .insert({
          user_id: userId,
          question,
          answer,
          context_type: contextType,
          context_data: contextData,
          generated_at: new Date().toISOString(),
        })
    )
      .then(({ error }) => {
        if (error) console.warn('Note: Could not insert to Supabase coach table:', error.message)
      })
      .catch(() => {})
  }
}

/**
 * Ask the AI Coach
 */
export async function askCoach(options: AskCoachOptions): Promise<{
  answer: string
  followUpQuestions?: string[]
  suggestedActions?: string[]
  sessionId: string
  usedFallback: boolean
}> {
  const { userId, question, contextType, contextData } = options

  // Categorize question if not provided
  const category = contextType || categorizeQuestion(question)

  // Fetch cached context data and recent history in parallel
  const [contextDataResult, conversationHistory] = await Promise.all([
    fetchCachedCoachContext(userId),
    fetchConversationHistory(userId),
  ])

  const {
    userProfile,
    habitSummary,
    behavioralProfile,
    predictionData,
    recentInsights,
    savedLetters,
  } = contextDataResult

  if (!userProfile) {
    throw new Error('User profile not found')
  }

  // Build context
  const context: CoachContext = {
    userProfile,
    habitSummary,
    behavioralProfile,
    currentPredictions: predictionData.current,
    improvedPredictions: predictionData.improved,
    comparativeAnalysis: {
      scoreDifference: predictionData.improved.overall - predictionData.current.overall,
      percentageImprovement: ((predictionData.improved.overall - predictionData.current.overall) / predictionData.current.overall) * 100,
      keyLeveragePoints: ['Sleep consistency', 'Evening screen limit', 'Daily movement'],
      timeToBreakEven: 3,
      feasibilityScore: 0.75,
      assumptions: [],
    },
    recentInsights,
    savedLetters,
  }

  // Build prompt
  const prompt = buildCoachPrompt({
    question,
    context,
    questionCategory: category,
    conversationHistory,
  })

  // Check if we should use fallback
  const geminiAvailable = isGeminiAvailable() && config.gemini.apiKey !== 'your_gemini_api_key'
  let usedFallback = false
  let response: any

  if (!geminiAvailable) {
    usedFallback = true
  } else {
    const result = await generateContent(prompt, {
      model: config.gemini.model || 'gemini-flash-latest',
      temperature: 0.7,
      maxOutputTokens: 2500, // Full conversational depth like ChatGPT
      timeout: 30000,
      noCache: true,
    })

    if (result.success && result.data) {
      const validation = validateCoachResponse({ answer: result.data })
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
    // Transform habitSummary to match FallbackContext expected shape (coach needs name, category, completionRate)
    const transformedHabitSummary = habitSummary.map(h => ({
      name: h.name,
      category: h.category,
      completionRate: h.completionRate,
    }))

    // Transform behavioralProfile to match FallbackContext expected shape
    const transformedBehavioralProfile = {
      consistencyScore: behavioralProfile.consistencyScore,
      strengths: behavioralProfile.strengths,
      weaknesses: behavioralProfile.weaknesses,
      patterns: behavioralProfile.patterns,
    }

    const fallbackContext = {
      question,
      questionCategory: category,
      userName: userProfile.fullName,
      habitSummary: transformedHabitSummary,
      predictions: predictionData.current,
      behavioralProfile: transformedBehavioralProfile,
    }
    response = generateFallbackCoachResponse(fallbackContext)
  }

  // Sanitize
  const sanitizedResponse = sanitizeResponse(response)

  // Save session
  await saveCoachSession(userId, question, sanitizedResponse.answer, category, contextData)

  // Generate a session ID
  const sessionId = `coach_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  return {
    answer: sanitizedResponse.answer,
    followUpQuestions: sanitizedResponse.followUpQuestions,
    suggestedActions: sanitizedResponse.suggestedActions,
    sessionId,
    usedFallback,
  }
}

/**
 * Get coach history
 */
export async function getCoachHistory(userId: string, limit = 20): Promise<CoachSession[]> {
  if (isValidUuid(userId)) {
    try {
      const { data, error } = await supabase
        .from('ai_coach_sessions')
        .select('*')
        .eq('user_id', userId)
        .order('generated_at', { ascending: false })
        .limit(limit)

      if (!error && data && data.length > 0) {
        return data
      }
    } catch (e) {}
  }

  const mem = memoryCoachSessions[userId] || []
  return mem.slice(0, limit)
}