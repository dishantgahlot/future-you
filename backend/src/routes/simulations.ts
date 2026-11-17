/**
 * Simulation Routes
 *
 * API endpoints for the What-If Interactive Future Simulator
 * - POST /api/simulations/run - Run a what-if simulation with custom parameters
 * - POST /api/simulations/save - Save a simulation with custom name
 * - GET /api/simulations - List saved simulations for the user
 * - DELETE /api/simulations/:id - Delete a saved simulation
 */

import { Router, Response } from 'express'
import { z } from 'zod'
import { supabase } from '../services/supabase.js'
import { PredictionEngine, createPredictionEngine } from '../services/prediction-engine/index.js'
import type {
  HabitWithLogs,
  UserProfile,
  UserBehavioralProfile,
  WhatIfScenario,
  WhatIfResult,
} from '../services/prediction-engine/types.js'
import { AuthenticatedRequest } from '../middleware/auth.js'

const router = Router()

// ============================================================================
// Validation Schemas
// ============================================================================

const runSimulationSchema = z.object({
  // Base profile from current habits (optional - will be generated if not provided)
  baseProfile: z.any().optional(),
  // Changes to simulate
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
    currentValue: z.number(),
    simulatedValue: z.number(),
    timelineMonths: z.number().int().positive().optional(),
    difficulty: z.enum(['easy', 'moderate', 'hard']).optional(),
  })).min(1),
  // Assumptions for the simulation
  assumptions: z.object({}).optional(),
  // Horizon to focus on
  horizon: z.enum(['6_months', '5_years', 'both']).default('both'),
})

const saveSimulationSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  changes: z.array(z.object({
    metric: z.string(),
    currentValue: z.number(),
    simulatedValue: z.number(),
    timelineMonths: z.number().int().positive().optional(),
    difficulty: z.enum(['easy', 'moderate', 'hard']).optional(),
  })).min(1),
  assumptions: z.object({}).optional(),
  horizon: z.enum(['6_months', '5_years', 'both']),
  result: z.any(), // The full simulation result
})

const updateSimulationSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
})

// ============================================================================
// Helper Functions
// ============================================================================

async function getUserHabits(userId: string): Promise<HabitWithLogs[]> {
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

  if (habitsError) throw habitsError

  return (habits || []).map(habit => ({
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

async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (error || !profile) return null

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

async function getOrGenerateBaseProfile(userId: string, engine: PredictionEngine): Promise<UserBehavioralProfile> {
  const [habits, userProfile] = await Promise.all([
    getUserHabits(userId),
    getUserProfile(userId),
  ])

  if (habits.length === 0) {
    throw new Error('No habits found')
  }

  const result = await engine.generatePrediction({
    userId,
    habits,
    userProfile: userProfile || undefined,
  })

  return result.profile
}

// ============================================================================
// Routes
// ============================================================================

/**
 * POST /api/simulations/run
 * Run a what-if simulation with custom parameters
 */
router.post('/run', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    // Validate request body
    const validation = runSimulationSchema.safeParse(req.body)
    if (!validation.success) {
      return res.status(400).json({
        error: 'Invalid request',
        details: validation.error.flatten()
      })
    }

    const { baseProfile, changes, assumptions, horizon } = validation.data

    // Create prediction engine
    const engine = createPredictionEngine({ assumptions })

    // Get or generate base profile
    const profile = baseProfile || await getOrGenerateBaseProfile(userId, engine)

    // Convert changes to WhatIfScenario format
    const whatIfScenario: WhatIfScenario = {
      id: `sim_${Date.now()}`,
      name: 'Custom Simulation',
      description: 'User-defined what-if scenario',
      changes: changes.map(c => ({
        metric: c.metric,
        targetValue: c.simulatedValue,
        timelineMonths: c.timelineMonths || 3,
        difficulty: c.difficulty || 'moderate',
      })),
      baseProfile: profile,
      assumptions: assumptions || {},
    }

    // Run what-if simulation
    const result = await engine.runWhatIf(whatIfScenario)
    const formatted = engine.formatWhatIfResult(result)

    // Filter projections based on requested horizon
    let filteredProjections: Record<string, any> = result.projections
    if (horizon === '6_months') {
      filteredProjections = { '6_months': result.projections['6_months'] }
    } else if (horizon === '5_years') {
      filteredProjections = { '5_years': result.projections['5_years'] }
    }

    res.json({
      success: true,
      data: {
        scenario: result.scenario,
        projections: filteredProjections,
        comparativeToBaseline: result.comparativeToBaseline,
        feasibilityScore: result.feasibilityScore,
        formatted,
        // Include current values for reference
        currentValues: changes.map(c => ({
          metric: c.metric,
          currentValue: c.currentValue,
          simulatedValue: c.simulatedValue,
        })),
      },
    })
  } catch (error) {
    console.error('Simulation run error:', error)
    res.status(500).json({
      error: 'Failed to run simulation',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

/**
 * POST /api/simulations/save
 * Save a simulation with custom name
 */
router.post('/save', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    // Validate request body
    const validation = saveSimulationSchema.safeParse(req.body)
    if (!validation.success) {
      return res.status(400).json({
        error: 'Invalid request',
        details: validation.error.flatten()
      })
    }

    const { name, description, changes, assumptions, horizon, result } = validation.data

    // Save to database
    const { data, error } = await supabase
      .from('saved_simulations')
      .insert({
        user_id: userId,
        name,
        description,
        changes,
        assumptions,
        horizon,
        result,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) throw error

    res.json({
      success: true,
      data,
    })
  } catch (error) {
    console.error('Save simulation error:', error)
    res.status(500).json({
      error: 'Failed to save simulation',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

/**
 * GET /api/simulations
 * List saved simulations for the current user
 */
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const { data, error } = await supabase
      .from('saved_simulations')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })

    if (error) throw error

    res.json({
      success: true,
      data: data || [],
    })
  } catch (error) {
    console.error('Get simulations error:', error)
    res.status(500).json({
      error: 'Failed to fetch simulations',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

/**
 * GET /api/simulations/:id
 * Get a specific saved simulation
 */
router.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const { id } = req.params

    const { data, error } = await supabase
      .from('saved_simulations')
      .select('*')
      .eq('user_id', userId)
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Simulation not found' })
      }
      throw error
    }

    res.json({
      success: true,
      data,
    })
  } catch (error) {
    console.error('Get simulation error:', error)
    res.status(500).json({
      error: 'Failed to fetch simulation',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

/**
 * PATCH /api/simulations/:id
 * Update a saved simulation (name, description)
 */
router.patch('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const { id } = req.params

    // Validate request body
    const validation = updateSimulationSchema.safeParse(req.body)
    if (!validation.success) {
      return res.status(400).json({
        error: 'Invalid request',
        details: validation.error.flatten()
      })
    }

    const { data, error } = await supabase
      .from('saved_simulations')
      .update({
        ...validation.data,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Simulation not found' })
      }
      throw error
    }

    res.json({
      success: true,
      data,
    })
  } catch (error) {
    console.error('Update simulation error:', error)
    res.status(500).json({
      error: 'Failed to update simulation',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

/**
 * DELETE /api/simulations/:id
 * Delete a saved simulation
 */
router.delete('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const { id } = req.params

    const { error } = await supabase
      .from('saved_simulations')
      .delete()
      .eq('user_id', userId)
      .eq('id', id)

    if (error) throw error

    res.json({
      success: true,
      message: 'Simulation deleted successfully',
    })
  } catch (error) {
    console.error('Delete simulation error:', error)
    res.status(500).json({
      error: 'Failed to delete simulation',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

export default router