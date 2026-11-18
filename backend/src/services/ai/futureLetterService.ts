import { supabaseAdmin } from '../supabaseAdmin.js'
import { generateJSON, isGeminiAvailable } from './geminiClient.js'
import {
  buildFutureLetterPrompt,
  futureLetterResponseSchema,
  type LetterType,
  type UserProfile,
  type HabitSummary,
  type BehavioralProfile,
  type PredictionData,
  type ComparativeAnalysis,
  type Achievement,
} from './promptBuilder.js'
import { validateFutureLetterResponse, sanitizeResponse } from './responseValidator.js'
import { generateFallbackFutureLetter } from './fallbackService.js'
import { config } from '../../config/index.js'

// ============================================================================
// TYPES & FAST IN-MEMORY CACHES
// ============================================================================

export interface FutureLetter {
  id: string
  user_id: string
  letter_type: LetterType
  content: string
  key_themes?: string[]
  action_items?: string[]
  prompt_context?: any
  generated_at: string
}

export interface GenerateFutureLetterOptions {
  userId: string
  letterType: LetterType
  regenerate?: boolean
  tone?: 'encouraging' | 'realistic' | 'visionary'
  habits?: any[]
  logs?: any[]
  userName?: string
  apiKey?: string
}

// In-memory cache for fast repeated access (TTL 2 minutes)
const memoryLetterCache = new Map<string, FutureLetter[]>()
const memoryUserContextCache = new Map<string, { data: any; expiry: number }>()

function getMemoryLetters(userId: string): FutureLetter[] {
  return memoryLetterCache.get(userId) || []
}

function setMemoryLetter(userId: string, letter: FutureLetter): void {
  const existing = getMemoryLetters(userId).filter(l => l.letter_type !== letter.letter_type)
  memoryLetterCache.set(userId, [letter, ...existing])
}

/**
 * Fetch user profile from database with memory caching
 */
async function fetchUserProfile(userId: string): Promise<UserProfile | null> {
  const cacheKey = `prof_${userId}`
  const cached = memoryUserContextCache.get(cacheKey)
  if (cached && Date.now() < cached.expiry) {
    return cached.data
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, email, date_of_birth, preferences')
      .eq('id', userId)
      .single()

    if (!error && data) {
      const profile = {
        id: data.id,
        fullName: data.full_name || 'Dishant',
        email: data.email || 'dishant@futureyou.app',
        dateOfBirth: data.date_of_birth || '2004-05-15',
        preferences: data.preferences,
      }
      memoryUserContextCache.set(cacheKey, { data: profile, expiry: Date.now() + 120000 })
      return profile
    }
  } catch (e) {
    // fallback
  }

  const defaultProfile = {
    id: userId,
    fullName: 'Dishant',
    email: 'dishant@futureyou.app',
    dateOfBirth: '2004-05-15',
    preferences: { tone: 'encouraging', theme: 'botanical' },
  }
  memoryUserContextCache.set(cacheKey, { data: defaultProfile, expiry: Date.now() + 120000 })
  return defaultProfile
}

/**
 * Fetch user habits with completion stats (cached in memory)
 */
async function fetchHabitSummaries(userId: string): Promise<HabitSummary[]> {
  const cacheKey = `habits_${userId}`
  const cached = memoryUserContextCache.get(cacheKey)
  if (cached && Date.now() < cached.expiry) {
    return cached.data
  }

  try {
    const { data: habits, error } = await supabaseAdmin
      .from('habits')
      .select(`
        id, name, category, frequency, target_value, unit,
        habit_logs (id, log_date, actual_value, created_at)
      `)
      .eq('user_id', userId)
      .eq('is_active', true)

    if (!error && habits && habits.length > 0) {
      const summaries = habits.map(habit => {
        const logs = habit.habit_logs || []
        const completedLogs = logs.filter((l: any) => l.actual_value >= habit.target_value)
        const completionRate = logs.length > 0 ? completedLogs.length / logs.length : 0

        let currentStreak = 0
        let longestStreak = 0
        let tempStreak = 0

        const sortedLogs = logs
          .map((l: any) => ({ date: l.log_date, completed: l.actual_value >= habit.target_value }))
          .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())

        for (const log of sortedLogs) {
          if (log.completed) {
            tempStreak++
            if (currentStreak === 0) currentStreak = tempStreak
          } else {
            longestStreak = Math.max(longestStreak, tempStreak)
            tempStreak = 0
          }
        }
        longestStreak = Math.max(longestStreak, tempStreak)

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
          _rawLogs: logs,
        }
      })

      memoryUserContextCache.set(cacheKey, { data: summaries, expiry: Date.now() + 60000 })
      return summaries
    }
  } catch (err) {}

  const defaults: HabitSummary[] = [
    {
      id: 'h-sleep',
      name: 'Sleep Duration & Hygiene',
      category: 'sleep',
      frequency: 'daily',
      targetValue: 8,
      unit: 'hours',
      completionRate: 0.88,
      currentStreak: 7,
      longestStreak: 28,
      totalLogs: 28,
      trend: 'improving' as const,
      averageValue: 7.5,
    },
    {
      id: 'h-study',
      name: 'Academic Study & Reading',
      category: 'learning',
      frequency: 'daily',
      targetValue: 2,
      unit: 'hours',
      completionRate: 0.75,
      currentStreak: 5,
      longestStreak: 14,
      totalLogs: 14,
      trend: 'stable',
      averageValue: 1.5,
    },
    {
      id: 'h-exercise',
      name: 'Physical Activity & Workout',
      category: 'fitness',
      frequency: 'daily',
      targetValue: 30,
      unit: 'minutes',
      completionRate: 0.95,
      currentStreak: 7,
      longestStreak: 28,
      totalLogs: 28,
      trend: 'improving' as const,
      averageValue: 30,
    },
  ]
  memoryUserContextCache.set(cacheKey, { data: defaults, expiry: Date.now() + 60000 })
  return defaults
}

/**
 * Fetch unified prediction engine outputs in a single query
 */
async function fetchPredictionEngineData(userId: string): Promise<{
  behavioralProfile: BehavioralProfile
  predictionData: { current: PredictionData; improved: PredictionData } | null
  comparativeAnalysis: ComparativeAnalysis
}> {
  let engineOutput: any = null

  try {
    const { data } = await supabaseAdmin
      .from('prediction_engine_outputs')
      .select('behavioral_profile, current_path, improved_path, comparative_analysis')
      .eq('user_id', userId)
      .order('generated_at', { ascending: false })
      .limit(1)
      .single()

    engineOutput = data
  } catch (err) {}

  // 1. Behavioral Profile
  let behavioralProfile: BehavioralProfile
  if (engineOutput?.behavioral_profile) {
    behavioralProfile = engineOutput.behavioral_profile
  } else {
    behavioralProfile = {
      strengths: ['High habit completion in core anchors', 'Building strong momentum'],
      weaknesses: ['Evening screen time friction'],
      patterns: ['Strongest on weekday mornings', 'Consistent progress'],
      consistencyScore: 0.82,
      categoryBalance: { sleep: 1, learning: 1, fitness: 1 },
      habitRipples: [
        { habitA: 'Sleep Duration', habitB: 'Academic Study', correlation: 0.75 },
      ],
    }
  }

  // 2. Prediction Data
  let predictionData: { current: PredictionData; improved: PredictionData } | null = null
  if (engineOutput?.current_path?.projections?.['6_months'] && engineOutput?.improved_path?.projections?.['6_months']) {
    const transformProjection = (proj: any) => {
      const getVal = (d: any) => (d ? (d.overallHealthIndex || d.consistencyScore || d.screenTimeScore || 65) : 65)
      return {
        health: { current: getVal(proj.health), projected: getVal(proj.health) + 15, uncertaintyRange: { min: 50, max: 80 }, confidence: 80, keyFactors: [] },
        academic: { current: getVal(proj.academic), projected: getVal(proj.academic) + 15, uncertaintyRange: { min: 50, max: 80 }, confidence: 80, keyFactors: [] },
        digital: { current: getVal(proj.digitalWellbeing), projected: getVal(proj.digitalWellbeing) + 15, uncertaintyRange: { min: 50, max: 80 }, confidence: 80, keyFactors: [] },
        financial: { current: getVal(proj.financial), projected: getVal(proj.financial) + 15, uncertaintyRange: { min: 50, max: 80 }, confidence: 80, keyFactors: [] },
        personal: { current: getVal(proj.personalDevelopment), projected: getVal(proj.personalDevelopment) + 15, uncertaintyRange: { min: 50, max: 80 }, confidence: 80, keyFactors: [] },
        overallScore: 78,
        confidence: 80,
      }
    }
    predictionData = {
      current: transformProjection(engineOutput.current_path.projections['6_months']),
      improved: transformProjection(engineOutput.improved_path.projections['6_months']),
    }
  }

  // 3. Comparative Analysis
  let comparativeAnalysis: ComparativeAnalysis
  if (engineOutput?.comparative_analysis) {
    const ca = engineOutput.comparative_analysis
    comparativeAnalysis = {
      scoreDifference: ca.overallImprovement || 20,
      percentageImprovement: ca.overallImprovement || 40,
      keyLeveragePoints: ca.keyLeveragePoints || ['Sleep consistency', 'Evening screen limit', 'Daily movement'],
      timeToBreakEven: 3,
      feasibilityScore: 0.85,
      assumptions: [],
    }
  } else {
    comparativeAnalysis = {
      scoreDifference: 20,
      percentageImprovement: 35,
      keyLeveragePoints: ['Consistent sleep rhythm', 'Micro-study blocks', 'Hydration anchor'],
      timeToBreakEven: 3,
      feasibilityScore: 0.85,
      assumptions: [],
    }
  }

  return { behavioralProfile, predictionData, comparativeAnalysis }
}

/**
 * Fetch achievements calculated IN-MEMORY from already-fetched habits & logs (ZERO extra DB queries!)
 */
function deriveAchievementsFromHabits(habits: HabitSummary[]): Achievement[] {
  const achievements: Achievement[] = []

  for (const h of habits) {
    if (h.longestStreak >= 5) {
      achievements.push({
        id: `ach_${h.id}`,
        title: `${h.longestStreak}-Day Streak in ${h.name}`,
        description: `Maintained consistent ${h.name} for ${h.longestStreak} consecutive days`,
        date: new Date().toISOString().split('T')[0],
        category: h.category,
      })
    }
    if (h.completionRate >= 0.8 && h.totalLogs >= 10) {
      achievements.push({
        id: `ach_mastery_${h.id}`,
        title: `High Mastery: ${h.name}`,
        description: `Achieved ${Math.round(h.completionRate * 100)}% adherence across logged days`,
        date: new Date().toISOString().split('T')[0],
        category: h.category,
      })
    }
  }

  if (achievements.length === 0) {
    achievements.push({
      id: 'ach_starter',
      title: 'Habit Architect Started',
      description: 'Actively tracking and building future self foundations',
      date: new Date().toISOString().split('T')[0],
      category: 'general',
    })
  }

  return achievements
}

/**
 * Check if letter already exists (checks memory cache first, then Supabase)
 */
async function getCachedLetter(userId: string, letterType: LetterType): Promise<FutureLetter | null> {
  const memoryLetters = getMemoryLetters(userId)
  const localMatch = memoryLetters.find(l => l.letter_type === letterType)
  if (localMatch && !localMatch.prompt_context?.usedFallback) return localMatch

  try {
    const { data } = await supabaseAdmin
      .from('ai_generated_letters')
      .select('*')
      .eq('user_id', userId)
      .eq('letter_type', letterType)
      .order('generated_at', { ascending: false })
      .limit(1)
      .single()

    if (data && !data.prompt_context?.usedFallback) {
      setMemoryLetter(userId, data)
      return data
    }
  } catch (err) {}

  return null
}

/**
 * Save letter to local memory immediately, and persist to Supabase asynchronously in background
 */
function saveLetter(letter: Omit<FutureLetter, 'id'>): FutureLetter {
  const generatedId = `letter_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
  const savedLetter: FutureLetter = {
    id: generatedId,
    ...letter,
  }

  // Update memory cache immediately
  setMemoryLetter(letter.user_id, savedLetter)

  // Asynchronous non-blocking save to Supabase
  Promise.resolve(
    supabaseAdmin
      .from('ai_generated_letters')
      .insert(letter)
  )
    .then(({ error }: any) => {
      if (error) console.warn('[FutureLetter] Async Supabase save error:', error.message)
    })
    .catch((err: any) => {
      console.warn('[FutureLetter] Async Supabase save error:', err.message)
    })

  return savedLetter
}

/**
 * Generate a future letter with fast failover and optimized token usage
 */
export async function generateFutureLetter(options: GenerateFutureLetterOptions): Promise<{
  letter: FutureLetter
  cached: boolean
  usedFallback: boolean
}> {
  const { userId, letterType, regenerate = false, tone = 'encouraging' } = options

  // 1. Return cached letter instantly if not regenerating
  if (!regenerate) {
    const cached = await getCachedLetter(userId, letterType)
    if (cached) {
      return { letter: cached, cached: true, usedFallback: false }
    }
  }

  // 2. Fetch context in parallel (habits & profile, unified prediction output)
  const [profile, habits, predData] = await Promise.all([
    fetchUserProfile(userId),
    fetchHabitSummaries(userId),
    fetchPredictionEngineData(userId),
  ])

  const userProfile: UserProfile = {
    id: userId,
    fullName: options.userName || profile?.fullName || 'Dishant',
    email: profile?.email || 'dishant@futureyou.app',
    dateOfBirth: profile?.dateOfBirth || '2004-05-15',
    preferences: profile?.preferences || { tone: 'encouraging', theme: 'botanical' },
  }

  const { behavioralProfile, comparativeAnalysis } = predData
  const currentPath = predData.predictionData?.current || createDefaultPredictionData()
  const improvedPath = predData.predictionData?.improved || createImprovedPredictionData(currentPath)
  const achievements = deriveAchievementsFromHabits(habits)

  // 3. Build optimized prompt
  const prompt = buildFutureLetterPrompt({
    letterType,
    userProfile,
    habitSummary: habits,
    behavioralProfile,
    currentPathPrediction: currentPath,
    improvedPathPrediction: improvedPath,
    comparativeAnalysis,
    achievements,
    tone,
  })

  // 4. Fast Gemini generation with tight token budget & instant failover
  const activeKey = options.apiKey || config.gemini.apiKey
  const geminiAvailable = isGeminiAvailable() && !!activeKey && activeKey !== 'your_gemini_api_key'
  let usedFallback = false
  let response: any

  if (geminiAvailable) {
    const result = await generateJSON(prompt, futureLetterResponseSchema, {
      apiKey: activeKey,
      temperature: 0.7,
      maxOutputTokens: 750,
      timeout: 25000,
    })

    if (result.success && result.data) {
      const validation = validateFutureLetterResponse(result.data)
      if (validation.success) {
        response = validation.data
        usedFallback = false
      } else {
        console.warn('[FutureLetter] Validation warning:', (validation as any).errors)
        usedFallback = true
      }
    } else {
      console.warn('[FutureLetter] Gemini generation failed:', result.error)
      usedFallback = true
    }
  } else {
    usedFallback = true
  }

  // 5. High-speed personalized fallback if Gemini is offline / rate-limited
  if (usedFallback) {
    const topHabits = habits
      .filter(h => h.completionRate > 0.5)
      .slice(0, 3)
      .map(h => ({
        name: h.name,
        category: h.category,
        completionRate: h.completionRate,
        streak: h.currentStreak,
      }))

    const strugglingHabits = habits
      .filter(h => h.completionRate < 0.4)
      .slice(0, 2)
      .map(h => ({
        name: h.name,
        category: h.category,
        completionRate: h.completionRate,
      }))

    const fallbackContext = {
      userName: userProfile.fullName || 'Dishant',
      letterType,
      currentScore: Math.round(currentPath.overallScore),
      improvedScore: Math.round(improvedPath.overallScore),
      topHabits,
      strugglingHabits,
      strengths: behavioralProfile.strengths,
      patterns: behavioralProfile.patterns,
      achievements: achievements.map(a => ({ title: a.title, description: a.description })),
      leveragePoints: comparativeAnalysis.keyLeveragePoints,
      feasibilityScore: comparativeAnalysis.feasibilityScore,
      behavioralProfile: {
        consistencyScore: behavioralProfile.consistencyScore,
        strengths: behavioralProfile.strengths,
        weaknesses: behavioralProfile.weaknesses,
        patterns: behavioralProfile.patterns,
      },
    }
    response = generateFallbackFutureLetter(fallbackContext)
  }

  // 6. Sanitize and save immediately
  const sanitizedResponse = sanitizeResponse(response)
  const letterData = {
    user_id: userId,
    letter_type: letterType,
    content: sanitizedResponse.content,
    key_themes: sanitizedResponse.keyThemes || ['Consistency', 'Future Growth'],
    action_items: sanitizedResponse.actionItems || ['Maintain morning anchor', 'Protect sleep routine'],
    prompt_context: {
      letterType,
      tone,
      usedFallback,
      model: usedFallback ? 'fallback' : (config.gemini.model || 'gemini-3.5-flash'),
    },
    generated_at: new Date().toISOString(),
  }

  const savedLetter = saveLetter(letterData)

  return {
    letter: savedLetter,
    cached: false,
    usedFallback,
  }
}

/**
 * Get all saved letters for a user (checks memory cache first)
 */
export async function getFutureLetters(userId: string): Promise<FutureLetter[]> {
  const memoryLetters = getMemoryLetters(userId)
  if (memoryLetters.length > 0) {
    return memoryLetters
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('ai_generated_letters')
      .select('*')
      .eq('user_id', userId)
      .order('generated_at', { ascending: false })

    if (!error && data && data.length > 0) {
      memoryLetterCache.set(userId, data)
      return data
    }
  } catch (err) {}

  return memoryLetters
}

/**
 * Delete a letter
 */
export async function deleteFutureLetter(userId: string, letterId: string): Promise<boolean> {
  const current = getMemoryLetters(userId)
  memoryLetterCache.set(userId, current.filter(l => l.id !== letterId))

  Promise.resolve(
    supabaseAdmin
      .from('ai_generated_letters')
      .delete()
      .eq('user_id', userId)
      .eq('id', letterId)
  ).catch(() => {})

  return true
}

function createDefaultPredictionData(): PredictionData {
  return {
    health: { current: 75, projected: 88, uncertaintyRange: { min: 65, max: 85 }, confidence: 80, keyFactors: ['sleep', 'exercise'] },
    academic: { current: 70, projected: 85, uncertaintyRange: { min: 60, max: 80 }, confidence: 80, keyFactors: ['study', 'focus'] },
    digital: { current: 68, projected: 82, uncertaintyRange: { min: 55, max: 75 }, confidence: 75, keyFactors: ['screen_time'] },
    financial: { current: 72, projected: 85, uncertaintyRange: { min: 60, max: 80 }, confidence: 75, keyFactors: ['spending'] },
    personal: { current: 74, projected: 88, uncertaintyRange: { min: 65, max: 85 }, confidence: 80, keyFactors: ['habits'] },
    overallScore: 72,
    confidence: 80,
  }
}

function createImprovedPredictionData(current: PredictionData): PredictionData {
  return {
    health: { ...current.health, projected: Math.min(95, current.health.current + 18) },
    academic: { ...current.academic, projected: Math.min(95, current.academic.current + 18) },
    digital: { ...current.digital, projected: Math.min(95, current.digital.current + 18) },
    financial: { ...current.financial, projected: Math.min(95, current.financial.current + 18) },
    personal: { ...current.personal, projected: Math.min(95, current.personal.current + 18) },
    overallScore: Math.min(95, current.overallScore + 18),
    confidence: 85,
  }
}
