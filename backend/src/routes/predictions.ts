/**
 * Prediction Routes
 *
 * API endpoints for the Future You Prediction Engine
 * - POST /api/predictions/generate - Generate new predictions
 * - GET /api/predictions/current - Get latest cached predictions
 * - POST /api/predictions/what-if - Run what-if simulation
 * - GET /api/predictions/what-if/scenarios - Get predefined what-if scenarios
 */

import { Router, Response } from 'express'
import { z } from 'zod'
import { supabase } from '../services/supabase.js'
import { PredictionEngine, createPredictionEngine } from '../services/prediction-engine/index.js'
import type {
  HabitWithLogs,
  UserProfile,
  WhatIfScenario,
  BehaviorChange,
  UserBehavioralProfile,
} from '../services/prediction-engine/types.js'
import { AuthenticatedRequest } from '../middleware/auth.js'

// Enhanced scenario type for predefined scenarios with feasibility data
interface EnhancedPredefinedScenario {
  id: string
  name: string
  description: string
  changes: BehaviorChange[]
  feasibilityScore?: number
  projectedImprovement?: number
  keyLeveragePoints?: string[]
}

const router = Router()

// ============================================================================
// Validation Schemas
// ============================================================================

const generatePredictionSchema = z.object({
  dateRange: z.object({
    start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  }).optional(),
  assumptions: z.object({
    habitFormationRate: z.number().positive().optional(),
    habitDecayRate: z.number().min(0).max(1).optional(),
    improvementSustainability: z.number().min(0).max(1).optional(),
    regressionToMean: z.number().min(0).max(1).optional(),
    maxSleepHours: z.number().positive().optional(),
    minSleepHours: z.number().positive().optional(),
    maxStudyHours: z.number().positive().optional(),
    maxScreenTimeHours: z.number().positive().optional(),
    maxExerciseMinutes: z.number().positive().optional(),
    savingsRate: z.number().min(0).max(1).optional(),
    investmentReturn: z.number().optional(),
    inflationRate: z.number().optional(),
    baseUncertainty: z.number().min(0).max(1).optional(),
    uncertaintyGrowthPerYear: z.number().min(0).max(1).optional(),
    improvedPathImprovementRate: z.number().min(0).max(1).optional(),
  }).optional(),
  minimumDaysForPersonalized: z.number().int().positive().optional(),
  enableIllustrativeMode: z.boolean().optional(),
})

const whatIfSchema = z.object({
  scenario: z.object({
    id: z.string().optional(),
    name: z.string(),
    description: z.string(),
    changes: z.array(z.object({
      metric: z.enum([
        'sleepHours',
        'studyHours',
        'screenTimeHours',
        'exerciseMinutes',
        'spending',
        'habitCompletionRate',
        'consistencyScore',
      ]),
      targetValue: z.number(),
      timelineMonths: z.number().int().positive().optional(),
      difficulty: z.enum(['easy', 'moderate', 'hard']).optional(),
    })).min(1),
    assumptions: z.object({}).optional(),
  }),
  baseProfile: z.any().optional(), // UserBehavioralProfile - complex, validate loosely
})

const predefinedWhatIfSchema = z.object({
  scenarioId: z.enum([
    'better_sleep',
    'study_habit',
    'digital_detox',
    'exercise_routine',
    'financial_discipline',
    'holistic_improvement',
  ]),
})

// ============================================================================
// Helper Functions
// ============================================================================

const memoryPredictionCache = new Map<string, any>()

function getDefaultHabitsWithLogs(): HabitWithLogs[] {
  const dates = Array.from({ length: 14 }).map((_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (13 - i))
    return d.toISOString().split('T')[0]
  })

  return [
    {
      id: 'h-sleep',
      name: 'Sleep',
      category: 'sleep',
      frequency: 'daily',
      targetValue: 8,
      unit: 'hours',
      color: '#7E6BA5',
      icon: '🌙',
      logs: dates.map((date, i) => ({
        id: `l-sleep-${i}`,
        habitId: 'h-sleep',
        logDate: date,
        actualValue: [7.5, 7.8, 8.0, 7.2, 7.5, 8.0, 7.6, 7.5, 7.9, 8.1, 7.4, 7.5, 7.7, 7.5][i % 14],
        createdAt: new Date().toISOString(),
      })),
    },
    {
      id: 'h-study',
      name: 'Study',
      category: 'learning',
      frequency: 'daily',
      targetValue: 2,
      unit: 'hours',
      color: '#C87850',
      icon: '📖',
      logs: dates.map((date, i) => ({
        id: `l-study-${i}`,
        habitId: 'h-study',
        logDate: date,
        actualValue: [1.5, 2.0, 1.8, 1.0, 2.0, 1.5, 2.2, 1.5, 2.0, 1.5, 1.0, 2.0, 1.5, 1.5][i % 14],
        createdAt: new Date().toISOString(),
      })),
    },
    {
      id: 'h-exercise',
      name: 'Exercise',
      category: 'fitness',
      frequency: 'daily',
      targetValue: 30,
      unit: 'minutes',
      color: '#6B8E4E',
      icon: '🏃',
      logs: dates.map((date, i) => ({
        id: `l-ex-${i}`,
        habitId: 'h-exercise',
        logDate: date,
        actualValue: [30, 30, 25, 30, 35, 30, 30, 25, 30, 30, 35, 30, 30, 30][i % 14],
        createdAt: new Date().toISOString(),
      })),
    },
    {
      id: 'h-screen',
      name: 'Screen Time',
      category: 'productivity',
      frequency: 'daily',
      targetValue: 3,
      unit: 'hours',
      color: '#C88E3E',
      icon: '📱',
      logs: dates.map((date, i) => ({
        id: `l-sc-${i}`,
        habitId: 'h-screen',
        logDate: date,
        actualValue: [2.5, 2.8, 2.2, 3.1, 2.4, 2.0, 2.6, 2.4, 2.3, 2.7, 2.4, 2.5, 2.4, 2.4][i % 14],
        createdAt: new Date().toISOString(),
      })),
    },
    {
      id: 'h-spending',
      name: 'Daily Spending',
      category: 'finance',
      frequency: 'daily',
      targetValue: 25,
      unit: 'dollars',
      color: '#738541',
      icon: '💰',
      logs: dates.map((date, i) => ({
        id: `l-sp-${i}`,
        habitId: 'h-spending',
        logDate: date,
        actualValue: [18, 22, 25, 30, 20, 15, 22, 19, 21, 24, 20, 18, 22, 20][i % 14],
        createdAt: new Date().toISOString(),
      })),
    },
  ]
}

async function getUserHabits(userId: string): Promise<HabitWithLogs[]> {
  try {
    const { data: habits, error: habitsError } = await supabase
      .from('habits')
      .select(`
        id,
        name,
        category,
        frequency,
        target_value,
        unit,
        color,
        icon,
        habit_logs (
          id,
          log_date,
          actual_value,
          notes,
          created_at
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: true })

    if (!habitsError && habits && habits.length > 0) {
      return habits.map(habit => ({
        id: habit.id,
        name: habit.name,
        category: habit.category,
        frequency: habit.frequency,
        targetValue: habit.target_value,
        unit: habit.unit,
        color: habit.color,
        icon: habit.icon,
        logs: (habit.habit_logs || []).map((log: any) => ({
          id: log.id,
          habitId: log.habit_id,
          logDate: log.log_date,
          actualValue: log.actual_value,
          notes: log.notes,
          createdAt: log.created_at,
        })),
      }))
    }
  } catch (err) {
    console.warn('getUserHabits fallback to default habits')
  }

  return getDefaultHabitsWithLogs()
}

async function getUserProfile(userId: string): Promise<UserProfile | null> {
  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (!error && profile) {
      return {
        id: profile.id,
        sleepGoal: profile.sleep_goal,
        studyGoal: profile.study_goal,
        screenTimeGoal: profile.screen_time_goal,
        exerciseGoal: profile.exercise_goal,
        monthlyBudget: profile.monthly_budget,
        completionGoal: profile.completion_goal,
      }
    }
  } catch (err) {}

  return {
    id: userId,
    sleepGoal: 8,
    studyGoal: 2,
    screenTimeGoal: 3,
    exerciseGoal: 30,
    monthlyBudget: 750,
    completionGoal: 85,
  }
}

async function getCachedPrediction(userId: string) {
  try {
    const { data, error } = await supabase
      .from('prediction_engine_outputs')
      .select('*')
      .eq('user_id', userId)
      .order('generated_at', { ascending: false })
      .limit(1)
      .single()

    if (!error && data) return data
  } catch (err) {}

  return memoryPredictionCache.get(userId) || null
}

async function savePrediction(userId: string, prediction: any, profile: any, dataQuality: any) {
  const record = {
    user_id: userId,
    current_path: prediction.currentPath,
    improved_path: prediction.improvedPath,
    comparative_analysis: prediction.comparativeAnalysis,
    meta: prediction.meta,
    behavioral_profile: profile,
    data_quality: dataQuality,
    engine_version: prediction.meta?.engineVersion || '1.0.0',
    generated_at: new Date().toISOString(),
  }

  memoryPredictionCache.set(userId, record)

  try {
    await supabase
      .from('prediction_engine_outputs')
      .upsert(record, { onConflict: 'user_id' })
  } catch (err) {
    console.warn('Could not upsert to Supabase prediction_engine_outputs, saved in-memory cache')
  }
}

// ============================================================================
// Routes
// ============================================================================

/**
 * POST /api/predictions/generate
 * Generate new predictions for the current user
 */
router.post('/generate', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    // Validate request body
    const validation = generatePredictionSchema.safeParse(req.body)
    if (!validation.success) {
      return res.status(400).json({
        error: 'Invalid request',
        details: validation.error.flatten()
      })
    }

    const { dateRange, assumptions, minimumDaysForPersonalized, enableIllustrativeMode } = validation.data

    // Fetch user data
    const [habits, userProfile] = await Promise.all([
      getUserHabits(userId),
      getUserProfile(userId),
    ])

    if (habits.length === 0) {
      return res.status(400).json({
        error: 'No habits found',
        message: 'Create some habits first to generate predictions'
      })
    }

    // Create prediction engine
    const engine = createPredictionEngine({
      assumptions,
      minimumDaysForPersonalized,
      enableIllustrativeMode,
    })

    // Generate prediction
    const result = await engine.generatePrediction({
      userId,
      habits,
      userProfile: userProfile || undefined,
      dateRange,
    })

    // Save to database
    await savePrediction(userId, result.prediction, result.profile, result.dataQuality)

    res.json({
      success: true,
      data: result.prediction,
      meta: {
        dataQuality: result.dataQuality,
        profile: {
          daysOfData: result.profile.daysOfData,
          hasSufficientData: result.profile.hasSufficientData,
        },
      },
    })
  } catch (error) {
    console.error('Prediction generation error:', error)
    res.status(500).json({
      error: 'Failed to generate prediction',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

/**
 * GET /api/predictions/current
 * Get the latest cached prediction for the current user
 */
router.get('/current', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const cached = await getCachedPrediction(userId)

    if (!cached) {
      return res.status(404).json({
        error: 'No predictions found',
        message: 'Generate a prediction first using POST /predictions/generate',
      })
    }

    // Reconstruct prediction object from new table structure
    const prediction = {
      currentPath: cached.current_path,
      improvedPath: cached.improved_path,
      comparativeAnalysis: cached.comparative_analysis,
      meta: cached.meta,
    }

    res.json({
      success: true,
      data: prediction,
      meta: {
        generatedAt: cached.generated_at,
        cached: true,
      },
    })
  } catch (error) {
    console.error('Get prediction error:', error)
    res.status(500).json({
      error: 'Failed to fetch prediction',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

/**
 * POST /api/predictions/what-if
 * Run a what-if simulation
 */
router.post('/what-if', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    // Validate request body
    const validation = whatIfSchema.safeParse(req.body)
    if (!validation.success) {
      return res.status(400).json({
        error: 'Invalid request',
        details: validation.error.flatten()
      })
    }

    const { scenario, baseProfile } = validation.data

    // If no baseProfile provided, generate current prediction first
    let profile = baseProfile
    if (!profile) {
      const habits = await getUserHabits(userId)
      const userProfile = await getUserProfile(userId)

      if (habits.length === 0) {
        return res.status(400).json({
          error: 'No habits found',
          message: 'Create some habits first'
        })
      }

      const engine = createPredictionEngine()
      const result = await engine.generatePrediction({
        userId,
        habits,
        userProfile: userProfile || undefined,
      })
      profile = result.profile
    }

    // Create engine with scenario assumptions
    const engine = createPredictionEngine({
      assumptions: scenario.assumptions,
    })

    // Run what-if simulation
    const whatIfScenario: WhatIfScenario = {
      id: scenario.id || `custom_${Date.now()}`,
      name: scenario.name,
      description: scenario.description,
      changes: scenario.changes.map(c => ({
        metric: c.metric,
        targetValue: c.targetValue,
        timelineMonths: c.timelineMonths || 3,
        difficulty: c.difficulty || 'moderate',
      })),
      baseProfile: profile,
      assumptions: scenario.assumptions || {},
    }

    const result = await engine.runWhatIf(whatIfScenario)
    const formatted = engine.formatWhatIfResult(result)

    res.json({
      success: true,
      data: {
        scenario: result.scenario,
        projections: result.projections,
        comparativeToBaseline: result.comparativeToBaseline,
        feasibilityScore: result.feasibilityScore,
        formatted,
      },
    })
  } catch (error) {
    console.error('What-if simulation error:', error)
    res.status(500).json({
      error: 'Failed to run what-if simulation',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

/**
 * GET /api/predictions/what-if/scenarios
 * Get all predefined what-if scenarios
 */
router.get('/what-if/scenarios', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const engine = createPredictionEngine()
    const scenarios = engine.getPredefinedWhatIfScenarios()

    // Get user's profile to customize difficulty estimates
    const habits = await getUserHabits(userId)
    let userProfileData = null

    if (habits.length > 0) {
      const userProfile = await getUserProfile(userId)
      const result = await engine.generatePrediction({
        userId,
        habits,
        userProfile: userProfile || undefined,
      })
      userProfileData = result.profile
    }

    // Enhance scenarios with user-specific info if profile available
    const enhancedScenarios = scenarios.map(scenario => {
      let enhanced: EnhancedPredefinedScenario = { ...scenario }

      if (userProfileData) {
        // Run quick simulation to get feasibility
        const whatIfScenario: WhatIfScenario = {
          id: scenario.id,
          name: scenario.name,
          description: scenario.description,
          changes: scenario.changes,
          baseProfile: userProfileData,
          assumptions: {},
        }

        try {
          const result = engine.runWhatIfSimulation(whatIfScenario)
          enhanced = {
            ...enhanced,
            feasibilityScore: result.feasibilityScore,
            projectedImprovement: result.comparativeToBaseline.overallImprovement,
            keyLeveragePoints: result.comparativeToBaseline.keyLeveragePoints,
          }
        } catch {
          // Ignore errors, return base scenario
        }
      }

      return enhanced
    })

    res.json({
      success: true,
      data: enhancedScenarios,
    })
  } catch (error) {
    console.error('Get scenarios error:', error)
    res.status(500).json({
      error: 'Failed to fetch scenarios',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

/**
 * POST /api/predictions/what-if/predefined
 * Run a predefined what-if scenario
 */
router.post('/what-if/predefined', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const validation = predefinedWhatIfSchema.safeParse(req.body)
    if (!validation.success) {
      return res.status(400).json({
        error: 'Invalid request',
        details: validation.error.flatten()
      })
    }

    const { scenarioId } = validation.data

    // Get user's current profile
    const habits = await getUserHabits(userId)
    const userProfile = await getUserProfile(userId)

    if (habits.length === 0) {
      return res.status(400).json({
        error: 'No habits found',
        message: 'Create some habits first'
      })
    }

    const engine = createPredictionEngine()
    const result = await engine.generatePrediction({
      userId,
      habits,
      userProfile: userProfile || undefined,
    })

    // Run predefined scenario
    const whatIfResult = await engine.runPredefinedWhatIf(scenarioId, result.profile)

    if (!whatIfResult) {
      return res.status(404).json({ error: 'Scenario not found' })
    }

    const formatted = engine.formatWhatIfResult(whatIfResult)

    res.json({
      success: true,
      data: {
        scenario: whatIfResult.scenario,
        projections: whatIfResult.projections,
        comparativeToBaseline: whatIfResult.comparativeToBaseline,
        feasibilityScore: whatIfResult.feasibilityScore,
        formatted,
      },
    })
  } catch (error) {
    console.error('Predefined what-if error:', error)
    res.status(500).json({
      error: 'Failed to run predefined scenario',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

/**
 * GET /api/predictions/meta
 * Get prediction engine metadata
 */
router.get('/meta', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    // Check if user has any predictions
    const cached = await getCachedPrediction(userId)

    res.json({
      success: true,
      data: {
        engineVersion: '1.0.0',
        supportedHorizons: ['6_months', '5_years'],
        scenarioTypes: ['current_path', 'improved_path'],
        indicatorCategories: [
          'health',
          'academic',
          'digitalWellbeing',
          'financial',
          'personalDevelopment',
        ],
        hasCachedPrediction: !!cached,
        lastGeneratedAt: cached?.generated_at || null,
      },
    })
  } catch (error) {
    console.error('Get meta error:', error)
    res.status(500).json({
      error: 'Failed to fetch metadata',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

export default router