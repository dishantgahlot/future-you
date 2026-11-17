/**
 * Unit Tests for What-If Simulator
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  estimateChangeDifficulty,
  estimateTimelineMonths,
  applyBehaviorChanges,
  runWhatIfSimulation,
  createWhatIfScenario,
  getPredefinedScenarios,
  runPredefinedScenario,
  formatWhatIfResult,
  PREDEFINED_SCENARIOS,
} from './whatIfSimulator.js'
import { DEFAULT_ASSUMPTIONS } from './types.js'

import type {
  UserBehavioralProfile,
  WhatIfScenario,
  BehaviorChange,
} from './types.js'

// ============================================================================
// Test Data Helpers
// ============================================================================

const createMockProfile = (overrides: Partial<UserBehavioralProfile> = {}): UserBehavioralProfile => ({
  userId: 'test-user',
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
  ...overrides,
})

const createMockAssumptions = (overrides: Partial<any> = {}) => ({
  ...DEFAULT_ASSUMPTIONS,
  ...overrides,
})

// ============================================================================
// estimateChangeDifficulty Tests
// ============================================================================

describe('estimateChangeDifficulty', () => {
  it('should return easy for small changes', () => {
    const difficulty = estimateChangeDifficulty(7, 7.5, 'sleepHours')
    expect(difficulty).toBe('easy')
  })

  it('should return moderate for medium changes', () => {
    const difficulty = estimateChangeDifficulty(6, 8, 'sleepHours')
    expect(difficulty).toBe('moderate')
  })

  it('should return hard for large changes', () => {
    const difficulty = estimateChangeDifficulty(5, 9, 'sleepHours')
    expect(difficulty).toBe('hard')
  })

  it('should consider metric-specific thresholds', () => {
    // Screen time reduction is harder
    const screenTimeEasy = estimateChangeDifficulty(6, 5, 'screenTimeHours')
    const screenTimeModerate = estimateChangeDifficulty(6, 4, 'screenTimeHours')
    const screenTimeHard = estimateChangeDifficulty(6, 2, 'screenTimeHours')

    expect(screenTimeEasy).toBe('easy')
    expect(screenTimeModerate).toBe('moderate')
    expect(screenTimeHard).toBe('hard')
  })

  it('should handle spending reductions', () => {
    const difficulty = estimateChangeDifficulty(100, 80, 'spending')
    expect(difficulty).toBe('moderate')
  })
})

// ============================================================================
// estimateTimelineMonths Tests
// ============================================================================

describe('estimateTimelineMonths', () => {
  it('should return base months for easy changes', () => {
    const months = estimateTimelineMonths(7, 8, 'sleepHours', 'easy')
    expect(months).toBeGreaterThanOrEqual(2)
  })

  it('should multiply by difficulty', () => {
    const easy = estimateTimelineMonths(7, 8, 'sleepHours', 'easy')
    const moderate = estimateTimelineMonths(7, 8, 'sleepHours', 'moderate')
    const hard = estimateTimelineMonths(7, 8, 'sleepHours', 'hard')

    expect(moderate).toBeGreaterThan(easy)
    expect(hard).toBeGreaterThan(moderate)
  })

  it('should scale with relative change', () => {
    const small = estimateTimelineMonths(7, 7.5, 'sleepHours', 'moderate')
    const large = estimateTimelineMonths(5, 9, 'sleepHours', 'moderate')

    expect(large).toBeGreaterThan(small)
  })
})

// ============================================================================
// applyBehaviorChanges Tests
// ============================================================================

describe('applyBehaviorChanges', () => {
  it('should apply changes to profile averages', () => {
    const profile = createMockProfile()
    const changes: BehaviorChange[] = [
      { metric: 'sleepHours', targetValue: 8, timelineMonths: 3, difficulty: 'moderate' },
      { metric: 'exerciseMinutes', targetValue: 30, timelineMonths: 3, difficulty: 'moderate' },
    ]
    const assumptions = createMockAssumptions()

    const modified = applyBehaviorChanges(profile, changes, assumptions)

    expect(modified.averages.sleepHours).toBeGreaterThan(profile.averages.sleepHours)
    expect(modified.averages.sleepHours).toBeLessThanOrEqual(8)
    expect(modified.averages.exerciseMinutes).toBeGreaterThan(profile.averages.exerciseMinutes)
    expect(modified.averages.exerciseMinutes).toBeLessThanOrEqual(30)
  })

  it('should update consistency when completion rate changes', () => {
    const profile = createMockProfile()
    const changes: BehaviorChange[] = [
      { metric: 'habitCompletionRate', targetValue: 80, timelineMonths: 4, difficulty: 'moderate' },
    ]
    const assumptions = createMockAssumptions()

    const modified = applyBehaviorChanges(profile, changes, assumptions)

    // Consistency should improve by 40% of completion improvement
    const completionImprovement = 80 - profile.averages.habitCompletionRate
    const expectedConsistency = profile.averages.consistencyScore + completionImprovement * 0.4

    expect(modified.averages.consistencyScore).toBeCloseTo(expectedConsistency, 1)
  })

  it('should not exceed metric limits', () => {
    const profile = createMockProfile({ averages: { ...createMockProfile().averages, sleepHours: 9.5 } })
    const changes: BehaviorChange[] = [
      { metric: 'sleepHours', targetValue: 12, timelineMonths: 12, difficulty: 'hard' },
    ]
    const assumptions = createMockAssumptions()

    const modified = applyBehaviorChanges(profile, changes, assumptions)

    expect(modified.averages.sleepHours).toBeLessThanOrEqual(assumptions.maxSleepHours)
  })
})

// ============================================================================
// createWhatIfScenario Tests
// ============================================================================

describe('createWhatIfScenario', () => {
  it('should create scenario from selected changes', () => {
    const profile = createMockProfile()
    const selectedChanges = [
      { metric: 'sleepHours' as const, targetValue: 8 },
      { metric: 'exerciseMinutes' as const, targetValue: 30 },
    ]

    const scenario = createWhatIfScenario(profile, selectedChanges)

    expect(scenario.id).toContain('custom_')
    expect(scenario.changes.length).toBe(2)
    expect(scenario.changes[0].metric).toBe('sleepHours')
    expect(scenario.changes[0].targetValue).toBe(8)
    expect(scenario.changes[0].difficulty).toBeDefined()
    expect(scenario.changes[0].timelineMonths).toBeGreaterThan(0)
    expect(scenario.baseProfile).toBe(profile)
  })

  it('should estimate difficulty and timeline automatically', () => {
    const profile = createMockProfile()
    const selectedChanges = [
      { metric: 'sleepHours' as const, targetValue: 9 }, // large change
    ]

    const scenario = createWhatIfScenario(profile, selectedChanges)

    expect(scenario.changes[0].difficulty).toBe('hard')
    expect(scenario.changes[0].timelineMonths).toBeGreaterThan(3)
  })
})

// ============================================================================
// getPredefinedScenarios Tests
// ============================================================================

describe('getPredefinedScenarios', () => {
  it('should return all predefined scenarios', () => {
    const scenarios = getPredefinedScenarios()

    expect(scenarios.length).toBe(6)
    expect(scenarios.map(s => s.id)).toEqual([
      'better_sleep',
      'study_habit',
      'digital_detox',
      'exercise_routine',
      'financial_discipline',
      'holistic_improvement',
    ])
  })

  it('should have valid structure for each scenario', () => {
    const scenarios = getPredefinedScenarios()

    for (const scenario of scenarios) {
      expect(scenario.id).toBeDefined()
      expect(scenario.name).toBeDefined()
      expect(scenario.description).toBeDefined()
      expect(scenario.changes.length).toBeGreaterThan(0)

      for (const change of scenario.changes) {
        expect(change.metric).toBeDefined()
        expect(change.targetValue).toBeGreaterThan(0)
        expect(change.timelineMonths).toBeGreaterThan(0)
        expect(['easy', 'moderate', 'hard']).toContain(change.difficulty)
      }
    }
  })
})

// ============================================================================
// runPredefinedScenario Tests
// ============================================================================

describe('runPredefinedScenario', () => {
  it('should run predefined scenario by ID', () => {
    const profile = createMockProfile()

    const result = runPredefinedScenario('better_sleep', profile)

    expect(result).not.toBeNull()
    expect(result!.scenario.id).toBe('better_sleep')
    expect(result!.projections['6_months']).toBeDefined()
    expect(result!.projections['5_years']).toBeDefined()
  })

  it('should return null for invalid ID', () => {
    const profile = createMockProfile()

    const result = runPredefinedScenario('invalid_id', profile)

    expect(result).toBeNull()
  })
})

// ============================================================================
// formatWhatIfResult Tests
// ============================================================================

describe('formatWhatIfResult', () => {
  it('should format result for display', () => {
    const mockResult = {
      scenario: {
        id: 'test',
        name: 'Test Scenario',
        description: 'Test',
        changes: [
          { metric: 'sleepHours', targetValue: 8, timelineMonths: 2, difficulty: 'moderate' as const },
        ],
        baseProfile: createMockProfile(),
        assumptions: {},
      },
      projections: {
        '6_months': {
          health: { overallHealthIndex: 75, sleepScore: 80, exerciseScore: 70, projectedSleepHours: 7.5, projectedExerciseMinutes: 25, cardiovascularRisk: 'low' as const, energyLevel: 'high' as const },
          academic: { consistencyScore: 70, projectedStudyHours: 2, skillAcquisitionRate: 1.2, knowledgeRetention: 70, projectedCredentials: 1 },
          digitalWellbeing: { focusCapacity: 70, screenTimeScore: 70, projectedScreenTimeHours: 4, digitalFatigueRisk: 'low' as const, attentionSpan: 'moderate' as const },
          financial: { emergencyFundMonths: 2, projectedMonthlySpending: 1500, projectedSavings: 500, projectedNetWorth: 500, financialStressLevel: 'low' as const, investmentGrowth: 100 },
          personalDevelopment: { lifeSatisfactionIndex: 70, habitDiversityScore: 70, socialConnectionScore: 70, projectedActiveHabits: 5, resilienceScore: 70 },
          uncertainty: { confidenceLevel: 75, lowEstimate: 60, highEstimate: 85, note: '' },
          horizon: '6_months' as const,
        },
        '5_years': {
          health: { overallHealthIndex: 80, sleepScore: 85, exerciseScore: 75, projectedSleepHours: 8, projectedExerciseMinutes: 30, cardiovascularRisk: 'low' as const, energyLevel: 'high' as const },
          academic: { consistencyScore: 80, projectedStudyHours: 2.5, skillAcquisitionRate: 1.5, knowledgeRetention: 80, projectedCredentials: 3 },
          digitalWellbeing: { focusCapacity: 80, screenTimeScore: 80, projectedScreenTimeHours: 3, digitalFatigueRisk: 'low' as const, attentionSpan: 'long' as const },
          financial: { emergencyFundMonths: 6, projectedMonthlySpending: 1400, projectedSavings: 5000, projectedNetWorth: 5000, financialStressLevel: 'low' as const, investmentGrowth: 1000 },
          personalDevelopment: { lifeSatisfactionIndex: 80, habitDiversityScore: 80, socialConnectionScore: 80, projectedActiveHabits: 7, resilienceScore: 80 },
          uncertainty: { confidenceLevel: 55, lowEstimate: 50, highEstimate: 95, note: '' },
          horizon: '5_years' as const,
        },
      },
      comparativeToBaseline: {
        healthImprovement: 15,
        academicImprovement: 10,
        digitalWellbeingImprovement: 5,
        financialImprovement: 1,
        personalDevelopmentImprovement: 10,
        overallImprovement: 10,
        timeToBreakEven: '3 months',
        keyLeveragePoints: ['Sleep improvement yields highest returns'],
      },
      feasibilityScore: 70,
    }

    const formatted = formatWhatIfResult(mockResult as any)

    expect(formatted.summary).toContain('+10')
    expect(formatted.keyImprovements.length).toBeGreaterThan(0)
    expect(formatted.feasibility).toBe('High')
    expect(formatted.recommendation.toLowerCase()).toContain('recommended')
  })

  it('should show low feasibility for hard changes', () => {
    const mockResult = {
      scenario: {
        id: 'test',
        name: 'Test',
        description: 'Test',
        changes: [
          { metric: 'screenTimeHours', targetValue: 2, timelineMonths: 6, difficulty: 'hard' as const },
        ],
        baseProfile: createMockProfile(),
        assumptions: {},
      },
      projections: { '6_months': {}, '5_years': {} },
      comparativeToBaseline: {
        healthImprovement: 0,
        academicImprovement: 0,
        digitalWellbeingImprovement: 5,
        financialImprovement: 0,
        personalDevelopmentImprovement: 0,
        overallImprovement: 1,
        timeToBreakEven: '6+ months',
        keyLeveragePoints: [],
      },
      feasibilityScore: 35,
    }

    const formatted = formatWhatIfResult(mockResult as any)

    expect(formatted.feasibility).toBe('Low')
    expect(formatted.tradeoffs.length).toBeGreaterThan(0)
    expect(formatted.recommendation).toContain('easier changes')
  })
})