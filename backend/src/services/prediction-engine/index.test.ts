/**
 * Unit Tests for Prediction Engine Main Module
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  PredictionEngine,
  createPredictionEngine,
  quickPredict,
  ENGINE_VERSION,
  SUPPORTED_HORIZONS,
  SCENARIO_TYPES,
  INDICATOR_CATEGORIES,
} from './index.js'

import type {
  HabitWithLogs,
  UserProfile,
  PredictionEngineConfig,
} from './types.js'

// ============================================================================
// Test Data Helpers
// ============================================================================

const createMockHabit = (overrides: Partial<HabitWithLogs> = {}): HabitWithLogs => ({
  id: 'habit-1',
  name: 'Test Habit',
  category: 'exercise',
  frequency: 'daily',
  targetValue: 30,
  unit: 'minutes',
  color: '#3B82F6',
  icon: 'dumbbell',
  logs: [
    { id: 'log-1', habitId: 'habit-1', logDate: '2024-01-15', actualValue: 30, createdAt: '2024-01-15T08:00:00Z' },
    { id: 'log-2', habitId: 'habit-1', logDate: '2024-01-16', actualValue: 30, createdAt: '2024-01-16T08:00:00Z' },
    { id: 'log-3', habitId: 'habit-1', logDate: '2024-01-17', actualValue: 25, createdAt: '2024-01-17T08:00:00Z' },
  ],
  ...overrides,
})

const createMockProfile = (overrides: Partial<UserProfile> = {}): UserProfile => ({
  id: 'user-1',
  sleepGoal: 8,
  studyGoal: 2,
  screenTimeGoal: 3,
  exerciseGoal: 30,
  monthlyBudget: 1000,
  completionGoal: 80,
  ...overrides,
})

// ============================================================================
// PredictionEngine Class Tests
// ============================================================================

describe('PredictionEngine', () => {
  let engine: PredictionEngine

  beforeEach(() => {
    engine = new PredictionEngine({
      minimumDaysForPersonalized: 3, // Lower for testing
      enableIllustrativeMode: true,
    })
  })

  it('should create engine with default config', () => {
    const defaultEngine = new PredictionEngine()
    const config = defaultEngine.getConfig()

    expect(config.minimumDaysForPersonalized).toBe(14)
    expect(config.enableIllustrativeMode).toBe(true)
  })

  it('should create engine with custom config', () => {
    const customEngine = new PredictionEngine({
      minimumDaysForPersonalized: 7,
      enableIllustrativeMode: false,
      assumptions: { habitFormationRate: 2 },
    })

    const config = customEngine.getConfig()
    expect(config.minimumDaysForPersonalized).toBe(7)
    expect(config.enableIllustrativeMode).toBe(false)
    expect(config.assumptions.habitFormationRate).toBe(2)
  })

  it('should generate prediction with sufficient data', async () => {
    // Create habits with multiple categories and sufficient logs
    const habits: HabitWithLogs[] = [
      createMockHabit({ id: 'h1', category: 'sleep', targetValue: 8, logs: Array(10).fill(null).map((_, i) => ({
        id: `log-${i}`, habitId: 'h1', logDate: `2024-01-${String(i+1).padStart(2,'0')}`, actualValue: 7.5 + Math.random(), createdAt: ''
      })) }),
      createMockHabit({ id: 'h2', category: 'exercise', targetValue: 30, logs: Array(10).fill(null).map((_, i) => ({
        id: `log-${i}`, habitId: 'h2', logDate: `2024-01-${String(i+1).padStart(2,'0')}`, actualValue: 30, createdAt: ''
      })) }),
      createMockHabit({ id: 'h3', category: 'study', targetValue: 2, logs: Array(10).fill(null).map((_, i) => ({
        id: `log-${i}`, habitId: 'h3', logDate: `2024-01-${String(i+1).padStart(2,'0')}`, actualValue: 1.5, createdAt: ''
      })) }),
    ]

    const result = await engine.generatePrediction({
      userId: 'user-1',
      habits,
      userProfile: createMockProfile(),
      dateRange: { start: '2024-01-01', end: '2024-01-10' },
    })

    expect(result.prediction.userId).toBe('user-1')
    expect(result.prediction.currentPath).toBeDefined()
    expect(result.prediction.improvedPath).toBeDefined()
    expect(result.prediction.comparativeAnalysis).toBeDefined()
    expect(result.prediction.meta.engineVersion).toBe(ENGINE_VERSION)
    expect(result.dataQuality.hasSufficientData).toBe(true)
  })

  it('should generate illustrative prediction with insufficient data', async () => {
    const habits: HabitWithLogs[] = [
      createMockHabit({ id: 'h1', category: 'sleep', logs: [{ id: 'log-1', habitId: 'h1', logDate: '2024-01-15', actualValue: 8, createdAt: '' }] }),
    ]

    const result = await engine.generatePrediction({
      userId: 'user-1',
      habits,
      dateRange: { start: '2024-01-15', end: '2024-01-15' },
    })

    expect(result.dataQuality.isIllustrative).toBe(true)
    expect(result.prediction.meta.warnings.length).toBeGreaterThan(0)
    expect(result.prediction.meta.warnings.some(w => w.includes('Illustrative'))).toBe(true)
  })

  it('should throw error when illustrative mode disabled and insufficient data', async () => {
    const strictEngine = new PredictionEngine({
      minimumDaysForPersonalized: 14,
      enableIllustrativeMode: false,
    })

    const habits: HabitWithLogs[] = [
      createMockHabit({ id: 'h1', category: 'sleep', logs: [{ id: 'log-1', habitId: 'h1', logDate: '2024-01-15', actualValue: 8, createdAt: '' }] }),
    ]

    await expect(strictEngine.generatePrediction({
      userId: 'user-1',
      habits,
      dateRange: { start: '2024-01-15', end: '2024-01-15' },
    })).rejects.toThrow('Insufficient data')
  })

  it('should run what-if simulation', async () => {
    // First generate a prediction to get a profile
    const habits: HabitWithLogs[] = [
      createMockHabit({ id: 'h1', category: 'sleep', targetValue: 8, logs: Array(10).fill(null).map((_, i) => ({
        id: `log-${i}`, habitId: 'h1', logDate: `2024-01-${String(i+1).padStart(2,'0')}`, actualValue: 7, createdAt: ''
      })) }),
    ]

    const predictionResult = await engine.generatePrediction({
      userId: 'user-1',
      habits,
      dateRange: { start: '2024-01-01', end: '2024-01-10' },
    })

    const profile = predictionResult.profile

    // Run what-if
    const whatIfResult = await engine.runWhatIf({
      id: 'test_whatif',
      name: 'Test What-If',
      description: 'Test',
      changes: [
        { metric: 'sleepHours', targetValue: 8, timelineMonths: 2, difficulty: 'moderate' },
      ],
      baseProfile: profile,
      assumptions: {},
    })

    expect(whatIfResult.scenario.id).toBe('test_whatif')
    expect(whatIfResult.projections['6_months']).toBeDefined()
    expect(whatIfResult.feasibilityScore).toBeGreaterThan(0)
  })

  it('should run predefined what-if scenario', async () => {
    const habits: HabitWithLogs[] = [
      createMockHabit({ id: 'h1', category: 'sleep', targetValue: 8, logs: Array(10).fill(null).map((_, i) => ({
        id: `log-${i}`, habitId: 'h1', logDate: `2024-01-${String(i+1).padStart(2,'0')}`, actualValue: 7, createdAt: ''
      })) }),
    ]

    const predictionResult = await engine.generatePrediction({
      userId: 'user-1',
      habits,
      dateRange: { start: '2024-01-01', end: '2024-01-10' },
    })

    const result = await engine.runPredefinedWhatIf('better_sleep', predictionResult.profile)

    expect(result).not.toBeNull()
    expect(result!.scenario.id).toBe('better_sleep')
    expect(result!.scenario.name).toBe('Prioritize Sleep')
  })

  it('should return null for invalid predefined scenario', async () => {
    const profile = createMockProfile() as any
    const result = await engine.runPredefinedWhatIf('invalid', profile)
    expect(result).toBeNull()
  })

  it('should get predefined scenarios', () => {
    const scenarios = engine.getPredefinedWhatIfScenarios()

    expect(scenarios.length).toBe(6)
    expect(scenarios[0].id).toBe('better_sleep')
  })

  it('should create custom what-if scenario', () => {
    // Create a proper UserBehavioralProfile mock
    const profile = {
      userId: 'user-1',
      period: { start: '2024-01-01', end: '2024-03-01' },
      daysOfData: 60,
      averages: {
        sleepHours: 6.5,
        studyHours: 1,
        screenTimeHours: 6,
        exerciseMinutes: 15,
        spending: 60,
        habitCompletionRate: 50,
        consistencyScore: 55,
      },
      trends: {
        sleep: 'stable',
        study: 'stable',
        screenTime: 'stable',
        exercise: 'stable',
        spending: 'stable',
        completion: 'stable',
      },
      categoryBreakdown: {},
      hasSufficientData: true,
    } as any

    const scenario = engine.createWhatIfScenario(profile, [
      { metric: 'sleepHours', targetValue: 8 },
      { metric: 'exerciseMinutes', targetValue: 30 },
    ])

    expect(scenario.changes.length).toBe(2)
    expect(scenario.baseProfile).toBe(profile)
  })

  it('should format what-if result', () => {
    const mockResult = {
      scenario: { id: 'test', name: 'Test', description: 'Test', changes: [], baseProfile: {} as any, assumptions: {} },
      projections: { '6_months': {}, '5_years': {} },
      comparativeToBaseline: { overallImprovement: 10, healthImprovement: 5, academicImprovement: 5, digitalWellbeingImprovement: 0, financialImprovement: 0, personalDevelopmentImprovement: 0, timeToBreakEven: '3 months', keyLeveragePoints: [] },
      feasibilityScore: 70,
    }

    const formatted = engine.formatWhatIfResult(mockResult as any)

    expect(formatted.summary).toContain('+10')
    expect(formatted.feasibility).toBe('High')
  })

  it('should compare horizons', () => {
    const projection6m = {
      health: { overallHealthIndex: 60, sleepScore: 60, exerciseScore: 60, projectedSleepHours: 7, projectedExerciseMinutes: 25, cardiovascularRisk: 'moderate' as const, energyLevel: 'moderate' as const },
      academic: { consistencyScore: 60, projectedStudyHours: 2, skillAcquisitionRate: 1.2, knowledgeRetention: 60, projectedCredentials: 1 },
      digitalWellbeing: { focusCapacity: 60, screenTimeScore: 60, projectedScreenTimeHours: 4, digitalFatigueRisk: 'moderate' as const, attentionSpan: 'moderate' as const },
      financial: { emergencyFundMonths: 2, projectedMonthlySpending: 1500, projectedSavings: 1000, projectedNetWorth: 1000, financialStressLevel: 'moderate' as const, investmentGrowth: 200 },
      personalDevelopment: { lifeSatisfactionIndex: 60, habitDiversityScore: 60, socialConnectionScore: 60, projectedActiveHabits: 4, resilienceScore: 60 },
      uncertainty: { confidenceLevel: 75, lowEstimate: 50, highEstimate: 70, note: '' },
      horizon: '6_months' as const,
    }

    const projection5y = {
      ...projection6m,
      health: { ...projection6m.health, overallHealthIndex: 80 },
    }

    const comparison = engine.compareHorizons(projection6m, projection5y)

    expect(comparison.healthTrajectory).toBe('improving')
  })

  it('should perform sensitivity analysis', async () => {
    const habits: HabitWithLogs[] = [
      createMockHabit({ id: 'h1', category: 'sleep', targetValue: 8, logs: Array(10).fill(null).map((_, i) => ({
        id: `log-${i}`, habitId: 'h1', logDate: `2024-01-${String(i+1).padStart(2,'0')}`, actualValue: 7, createdAt: ''
      })) }),
    ]

    const predictionResult = await engine.generatePrediction({
      userId: 'user-1',
      habits,
      dateRange: { start: '2024-01-01', end: '2024-01-10' },
    })

    const sensitivity = engine.performSensitivityAnalysis(
      predictionResult.profile,
      { targetSleepHours: 8 },
      'improved_path',
      '6_months'
    )

    expect(sensitivity.length).toBe(5)
  })

  it('should update config', () => {
    engine.updateConfig({ minimumDaysForPersonalized: 21 })

    const config = engine.getConfig()
    expect(config.minimumDaysForPersonalized).toBe(21)
  })

  it('should get scenario metadata', () => {
    const mockProjection = {
      horizon: '6_months' as const,
      health: { overallHealthIndex: 70, sleepScore: 70, exerciseScore: 70, projectedSleepHours: 7.5, projectedExerciseMinutes: 30, cardiovascularRisk: 'low' as const, energyLevel: 'high' as const },
      academic: { consistencyScore: 70, projectedStudyHours: 2, skillAcquisitionRate: 1.2, knowledgeRetention: 70, projectedCredentials: 1 },
      digitalWellbeing: { focusCapacity: 70, screenTimeScore: 70, projectedScreenTimeHours: 3, digitalFatigueRisk: 'low' as const, attentionSpan: 'long' as const },
      financial: { emergencyFundMonths: 3, projectedMonthlySpending: 1500, projectedSavings: 2000, projectedNetWorth: 2000, financialStressLevel: 'low' as const, investmentGrowth: 500 },
      personalDevelopment: { lifeSatisfactionIndex: 70, habitDiversityScore: 70, socialConnectionScore: 70, projectedActiveHabits: 5, resilienceScore: 70 },
      uncertainty: { confidenceLevel: 75, lowEstimate: 60, highEstimate: 80, note: '' },
    }

    const mockScenario = {
      type: 'improved_path' as const,
      label: 'Improved Path',
      description: 'Test',
      assumptions: {} as any,
      projections: { '6_months': mockProjection, '5_years': mockProjection },
      dataQuality: { hasSufficientData: true, daysOfHistory: 60, minimumDaysRequired: 14, isIllustrative: false, missingCategories: [], confidenceImpact: 0 },
    }

    const metadata = engine.getScenarioMetadata(mockScenario)

    expect(metadata.type).toBe('improved_path')
    expect(metadata.label).toBe('Improved Path')
    expect(metadata.isIllustrative).toBe(false)
  })
})

// ============================================================================
// Convenience Functions Tests
// ============================================================================

describe('createPredictionEngine', () => {
  it('should create engine instance', () => {
    const engine = createPredictionEngine({ minimumDaysForPersonalized: 7 })
    expect(engine).toBeInstanceOf(PredictionEngine)
  })
})

describe('quickPredict', () => {
  it('should generate prediction in single call', async () => {
    const habits: HabitWithLogs[] = [
      createMockHabit({ id: 'h1', category: 'sleep', targetValue: 8, logs: Array(10).fill(null).map((_, i) => ({
        id: `log-${i}`, habitId: 'h1', logDate: `2024-01-${String(i+1).padStart(2,'0')}`, actualValue: 7, createdAt: ''
      })) }),
      createMockHabit({ id: 'h2', category: 'exercise', targetValue: 30, logs: Array(10).fill(null).map((_, i) => ({
        id: `log-${i}`, habitId: 'h2', logDate: `2024-01-${String(i+1).padStart(2,'0')}`, actualValue: 30, createdAt: ''
      })) }),
      createMockHabit({ id: 'h3', category: 'study', targetValue: 2, logs: Array(10).fill(null).map((_, i) => ({
        id: `log-${i}`, habitId: 'h3', logDate: `2024-01-${String(i+1).padStart(2,'0')}`, actualValue: 1.5, createdAt: ''
      })) }),
      createMockHabit({ id: 'h4', category: 'screen_time', targetValue: 3, logs: Array(10).fill(null).map((_, i) => ({
        id: `log-${i}`, habitId: 'h4', logDate: `2024-01-${String(i+1).padStart(2,'0')}`, actualValue: 4, createdAt: ''
      })) }),
    ]

    const result = await quickPredict('user-1', habits, createMockProfile(), {
      dateRange: { start: '2024-01-01', end: '2024-01-10' },
      minimumDays: 3,
    })

    expect(result.prediction.userId).toBe('user-1')
    expect(result.dataQuality.hasSufficientData).toBe(true)
  })
})

// ============================================================================
// Constants Tests
// ============================================================================

describe('Engine Constants', () => {
  it('should have correct version', () => {
    expect(ENGINE_VERSION).toBe('1.0.0')
  })

  it('should support both horizons', () => {
    expect(SUPPORTED_HORIZONS).toEqual(['6_months', '5_years'])
  })

  it('should support both scenario types', () => {
    expect(SCENARIO_TYPES).toEqual(['current_path', 'improved_path'])
  })

  it('should have all indicator categories', () => {
    expect(INDICATOR_CATEGORIES).toEqual([
      'health',
      'academic',
      'digitalWellbeing',
      'financial',
      'personalDevelopment',
    ])
  })
})