/**
 * Unit Tests for Projection Calculator
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  resolveTargets,
  projectMetricsForHorizon,
  calculateAllIndicators,
  calculateProjectionUncertainty,
  calculateProjection,
  performSensitivityAnalysis,
  compareHorizons,
  HORIZON_CONFIG,
} from './projectionCalculator.js'
import { DEFAULT_ASSUMPTIONS } from './types.js'

import type {
  UserBehavioralProfile,
  UserGoals,
  ScenarioAssumptions,
  ProjectionHorizon,
} from './types.js'

// ============================================================================
// Test Data Helpers
// ============================================================================

const createMockProfile = (overrides: Partial<UserBehavioralProfile> = {}): UserBehavioralProfile => ({
  userId: 'test-user',
  period: { start: '2024-01-01', end: '2024-03-01' },
  daysOfData: 60,
  averages: {
    sleepHours: 7,
    studyHours: 1.5,
    screenTimeHours: 5,
    exerciseMinutes: 20,
    spending: 50,
    habitCompletionRate: 60,
    consistencyScore: 65,
  },
  trends: {
    sleep: 'stable',
    study: 'improving',
    screenTime: 'stable',
    exercise: 'declining',
    spending: 'stable',
    completion: 'stable',
  },
  categoryBreakdown: {},
  hasSufficientData: true,
  ...overrides,
})

const createMockGoals = (overrides: Partial<UserGoals> = {}): UserGoals => ({
  targetSleepHours: 8,
  targetStudyHours: 2.5,
  targetScreenTimeHours: 3,
  targetExerciseMinutes: 30,
  targetMonthlySpending: 1200,
  targetCompletionRate: 80,
  ...overrides,
})

const createMockAssumptions = (overrides: Partial<ScenarioAssumptions> = {}): ScenarioAssumptions => ({
  ...DEFAULT_ASSUMPTIONS,
  ...overrides,
})

// ============================================================================
// resolveTargets Tests
// ============================================================================

describe('resolveTargets', () => {
  it('should use goals when provided', () => {
    const profile = createMockProfile()
    const goals = createMockGoals({ targetSleepHours: 9, targetStudyHours: 4 })

    const targets = resolveTargets(goals, profile.averages, profile)

    expect(targets.sleepHours).toBe(9)
    expect(targets.studyHours).toBe(4)
  })

  it('should use defaults when goals not provided', () => {
    const profile = createMockProfile()

    const targets = resolveTargets(undefined, profile.averages, profile)

    expect(targets.sleepHours).toBe(8)
    expect(targets.studyHours).toBe(3)
    expect(targets.screenTimeHours).toBe(3)
    expect(targets.exerciseMinutes).toBe(30)
    expect(targets.habitCompletionRate).toBe(80)
  })

  it('should calculate daily spending from monthly budget', () => {
    const profile = createMockProfile()
    const goals = createMockGoals({ targetMonthlySpending: 1500 })

    const targets = resolveTargets(goals, profile.averages, profile)

    expect(targets.spending).toBeCloseTo(1500 / 30.44, 1)
  })

  it('should default to 90% of current spending if no budget', () => {
    const profile = createMockProfile({ averages: { ...createMockProfile().averages, spending: 100 } })

    const targets = resolveTargets(undefined, profile.averages, profile)

    expect(targets.spending).toBe(90)
  })
})

// ============================================================================
// projectMetricsForHorizon Tests
// ============================================================================

describe('projectMetricsForHorizon', () => {
  it('should project metrics for 6-month horizon', () => {
    const profile = createMockProfile()
    const targets = resolveTargets(createMockGoals(), profile.averages, profile)
    const assumptions = createMockAssumptions()

    const projected = projectMetricsForHorizon(
      profile.averages,
      targets,
      assumptions,
      'improved_path',
      '6_months'
    )

    expect(projected.sleepHours).toBeGreaterThan(profile.averages.sleepHours)
    expect(projected.sleepHours).toBeLessThanOrEqual(targets.sleepHours)
    expect(projected.exerciseMinutes).toBeGreaterThan(profile.averages.exerciseMinutes)
    expect(projected.screenTimeHours).toBeLessThan(profile.averages.screenTimeHours)
  })

  it('should project metrics for 5-year horizon', () => {
    const profile = createMockProfile()
    const targets = resolveTargets(createMockGoals(), profile.averages, profile)
    const assumptions = createMockAssumptions()

    const projected = projectMetricsForHorizon(
      profile.averages,
      targets,
      assumptions,
      'improved_path',
      '5_years'
    )

    // 5 years should be closer to targets
    expect(projected.sleepHours).toBeGreaterThanOrEqual(
      projectMetricsForHorizon(profile.averages, targets, assumptions, 'improved_path', '6_months').sleepHours
    )
  })

  it('should apply current path decay', () => {
    const profile = createMockProfile()
    const targets = resolveTargets(createMockGoals(), profile.averages, profile)
    const assumptions = createMockAssumptions()

    const currentPath = projectMetricsForHorizon(
      profile.averages,
      targets,
      assumptions,
      'current_path',
      '6_months'
    )

    const improvedPath = projectMetricsForHorizon(
      profile.averages,
      targets,
      assumptions,
      'improved_path',
      '6_months'
    )

    // Current path should be worse than improved path
    expect(currentPath.sleepHours).toBeLessThan(improvedPath.sleepHours)
    expect(currentPath.exerciseMinutes).toBeLessThan(improvedPath.exerciseMinutes)
    expect(currentPath.screenTimeHours).toBeGreaterThan(improvedPath.screenTimeHours)
  })
})

// ============================================================================
// calculateAllIndicators Tests
// ============================================================================

describe('calculateAllIndicators', () => {
  it('should calculate all five indicator categories', () => {
    const profile = createMockProfile()
    const targets = resolveTargets(createMockGoals(), profile.averages, profile)
    const assumptions = createMockAssumptions()

    const projected = projectMetricsForHorizon(
      profile.averages,
      targets,
      assumptions,
      'improved_path',
      '6_months'
    )

    const indicators = calculateAllIndicators(
      projected,
      assumptions,
      '6_months',
      5,
      1,
      profile
    )

    expect(indicators.health).toBeDefined()
    expect(indicators.academic).toBeDefined()
    expect(indicators.digitalWellbeing).toBeDefined()
    expect(indicators.financial).toBeDefined()
    expect(indicators.personalDevelopment).toBeDefined()
  })

  it('should produce reasonable health indicators', () => {
    const profile = createMockProfile()
    const targets = resolveTargets(createMockGoals(), profile.averages, profile)
    const assumptions = createMockAssumptions()

    const projected = projectMetricsForHorizon(
      profile.averages,
      targets,
      assumptions,
      'improved_path',
      '6_months'
    )

    const indicators = calculateAllIndicators(
      projected,
      assumptions,
      '6_months',
      5,
      1,
      profile
    )

    expect(indicators.health.sleepScore).toBeGreaterThanOrEqual(0)
    expect(indicators.health.sleepScore).toBeLessThanOrEqual(100)
    expect(indicators.health.overallHealthIndex).toBeGreaterThanOrEqual(0)
    expect(indicators.health.overallHealthIndex).toBeLessThanOrEqual(100)
    expect(['low', 'moderate', 'high']).toContain(indicators.health.cardiovascularRisk)
    expect(['low', 'moderate', 'high']).toContain(indicators.health.energyLevel)
  })
})

// ============================================================================
// calculateProjectionUncertainty Tests
// ============================================================================

describe('calculateProjectionUncertainty', () => {
  it('should increase uncertainty for longer horizons', () => {
    const assumptions = createMockAssumptions()
    const dataQuality = { hasSufficientData: true, daysOfHistory: 60 }

    const uncertainty6m = calculateProjectionUncertainty(75, '6_months', assumptions, dataQuality)
    const uncertainty5y = calculateProjectionUncertainty(75, '5_years', assumptions, dataQuality)

    expect(uncertainty5y.confidenceLevel).toBeLessThan(uncertainty6m.confidenceLevel)
    expect(uncertainty5y.highEstimate - uncertainty5y.lowEstimate)
      .toBeGreaterThan(uncertainty6m.highEstimate - uncertainty6m.lowEstimate)
  })

  it('should reduce confidence for insufficient data', () => {
    const assumptions = createMockAssumptions()

    const sufficient = calculateProjectionUncertainty(75, '6_months', assumptions, { hasSufficientData: true, daysOfHistory: 60 })
    const insufficient = calculateProjectionUncertainty(75, '6_months', assumptions, { hasSufficientData: false, daysOfHistory: 7 })

    expect(insufficient.confidenceLevel).toBeLessThan(sufficient.confidenceLevel)
    expect(insufficient.note).toContain('Illustrative simulation')
  })
})

// ============================================================================
// calculateProjection Tests
// ============================================================================

describe('calculateProjection', () => {
  it('should generate complete projection for 6 months', () => {
    const profile = createMockProfile()
    const goals = createMockGoals()
    const assumptions = createMockAssumptions()

    const projection = calculateProjection(
      profile,
      goals,
      assumptions,
      'improved_path',
      '6_months',
      5,
      1
    )

    expect(projection.horizon).toBe('6_months')
    expect(projection.health).toBeDefined()
    expect(projection.academic).toBeDefined()
    expect(projection.digitalWellbeing).toBeDefined()
    expect(projection.financial).toBeDefined()
    expect(projection.personalDevelopment).toBeDefined()
    expect(projection.uncertainty).toBeDefined()
  })

  it('should generate complete projection for 5 years', () => {
    const profile = createMockProfile()
    const goals = createMockGoals()
    const assumptions = createMockAssumptions()

    const projection = calculateProjection(
      profile,
      goals,
      assumptions,
      'improved_path',
      '5_years',
      5,
      1
    )

    expect(projection.horizon).toBe('5_years')
    expect(projection.uncertainty.confidenceLevel).toBeLessThan(80)
  })

  it('should differ between current and improved paths', () => {
    const profile = createMockProfile()
    const goals = createMockGoals()
    const assumptions = createMockAssumptions()

    const current = calculateProjection(profile, goals, assumptions, 'current_path', '6_months', 5, 1)
    const improved = calculateProjection(profile, goals, assumptions, 'improved_path', '6_months', 5, 1)

    expect(improved.health.overallHealthIndex).toBeGreaterThan(current.health.overallHealthIndex)
    expect(improved.academic.knowledgeRetention).toBeGreaterThan(current.academic.knowledgeRetention)
    expect(improved.digitalWellbeing.focusCapacity).toBeGreaterThan(current.digitalWellbeing.focusCapacity)
  })
})

// ============================================================================
// performSensitivityAnalysis Tests
// ============================================================================

describe('performSensitivityAnalysis', () => {
  it('should analyze sensitivity for key metrics', () => {
    const profile = createMockProfile()
    const goals = createMockGoals()
    const assumptions = createMockAssumptions()

    const results = performSensitivityAnalysis(profile, goals, assumptions, 'improved_path', '6_months')

    expect(results.length).toBe(5)
    expect(results.map(r => r.metric)).toEqual([
      'Sleep Hours',
      'Exercise Minutes',
      'Screen Time',
      'Study Hours',
      'Completion Rate',
    ])

    for (const result of results) {
      expect(result.sensitivity).toBeGreaterThanOrEqual(0)
      // Note: optimisticValue vs pessimisticValue depends on metric direction
      // Screen time: lower is better, so optimistic (lower) gives higher health
      // Others: higher is better, so optimistic (higher) gives higher health
    }
  })

  it('should show screen time has inverse sensitivity', () => {
    const profile = createMockProfile()
    const goals = createMockGoals()
    const assumptions = createMockAssumptions()

    const results = performSensitivityAnalysis(profile, goals, assumptions, 'improved_path', '6_months')
    const screenTimeResult = results.find(r => r.metric === 'Screen Time')!

    // Reducing screen time (optimistic) should increase health
    expect(screenTimeResult.optimisticValue).toBeGreaterThan(screenTimeResult.pessimisticValue)
  })
})

// ============================================================================
// compareHorizons Tests
// ============================================================================

describe('compareHorizons', () => {
  it('should identify improving trajectory', () => {
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
      academic: { ...projection6m.academic, knowledgeRetention: 80, projectedCredentials: 5 },
      financial: { ...projection6m.financial, emergencyFundMonths: 8, investmentGrowth: 2000 }, // diff = 6 > 5
    }

    const comparison = compareHorizons(projection6m, projection5y)

    expect(comparison.healthTrajectory).toBe('improving')
    expect(comparison.academicTrajectory).toBe('improving')
    expect(comparison.financialTrajectory).toBe('improving')
    expect(comparison.compoundingEffects.length).toBeGreaterThan(0)
  })

  it('should identify declining trajectory', () => {
    const projection6m = {
      health: { overallHealthIndex: 70, sleepScore: 70, exerciseScore: 70, projectedSleepHours: 7.5, projectedExerciseMinutes: 30, cardiovascularRisk: 'low' as const, energyLevel: 'high' as const },
      academic: { consistencyScore: 70, projectedStudyHours: 2, skillAcquisitionRate: 1.2, knowledgeRetention: 70, projectedCredentials: 1 },
      digitalWellbeing: { focusCapacity: 70, screenTimeScore: 70, projectedScreenTimeHours: 3, digitalFatigueRisk: 'low' as const, attentionSpan: 'long' as const },
      financial: { emergencyFundMonths: 3, projectedMonthlySpending: 1400, projectedSavings: 2000, projectedNetWorth: 2000, financialStressLevel: 'low' as const, investmentGrowth: 500 },
      personalDevelopment: { lifeSatisfactionIndex: 70, habitDiversityScore: 70, socialConnectionScore: 70, projectedActiveHabits: 5, resilienceScore: 70 },
      uncertainty: { confidenceLevel: 75, lowEstimate: 60, highEstimate: 80, note: '' },
      horizon: '6_months' as const,
    }

    const projection5y = {
      ...projection6m,
      health: { ...projection6m.health, overallHealthIndex: 50 },
      digitalWellbeing: { ...projection6m.digitalWellbeing, focusCapacity: 50, digitalFatigueRisk: 'high' as const },
    }

    const comparison = compareHorizons(projection6m, projection5y)

    expect(comparison.healthTrajectory).toBe('declining')
    expect(comparison.digitalTrajectory).toBe('declining')
    expect(comparison.warnings.length).toBeGreaterThan(0)
  })

  it('should warn about low confidence at 5 years', () => {
    const projection6m = {
      health: { overallHealthIndex: 70, sleepScore: 70, exerciseScore: 70, projectedSleepHours: 7.5, projectedExerciseMinutes: 30, cardiovascularRisk: 'low' as const, energyLevel: 'high' as const },
      academic: { consistencyScore: 70, projectedStudyHours: 2, skillAcquisitionRate: 1.2, knowledgeRetention: 70, projectedCredentials: 1 },
      digitalWellbeing: { focusCapacity: 70, screenTimeScore: 70, projectedScreenTimeHours: 3, digitalFatigueRisk: 'low' as const, attentionSpan: 'long' as const },
      financial: { emergencyFundMonths: 3, projectedMonthlySpending: 1400, projectedSavings: 2000, projectedNetWorth: 2000, financialStressLevel: 'low' as const, investmentGrowth: 500 },
      personalDevelopment: { lifeSatisfactionIndex: 70, habitDiversityScore: 70, socialConnectionScore: 70, projectedActiveHabits: 5, resilienceScore: 70 },
      uncertainty: { confidenceLevel: 75, lowEstimate: 60, highEstimate: 80, note: '' },
      horizon: '6_months' as const,
    }

    const projection5y = {
      ...projection6m,
      uncertainty: { confidenceLevel: 35, lowEstimate: 30, highEstimate: 90, note: 'Low confidence' },
    }

    const comparison = compareHorizons(projection6m, projection5y)

    expect(comparison.warnings.some(w => w.includes('uncertainty') || w.includes('confidence'))).toBe(true)
  })
})

// ============================================================================
// HORIZON_CONFIG Tests
// ============================================================================

describe('HORIZON_CONFIG', () => {
  it('should have correct configuration for both horizons', () => {
    expect(HORIZON_CONFIG['6_months'].months).toBe(6)
    expect(HORIZON_CONFIG['6_months'].label).toBe('6 Months')
    expect(HORIZON_CONFIG['6_months'].uncertaintyMultiplier).toBe(1.0)

    expect(HORIZON_CONFIG['5_years'].months).toBe(60)
    expect(HORIZON_CONFIG['5_years'].label).toBe('5 Years')
    expect(HORIZON_CONFIG['5_years'].uncertaintyMultiplier).toBe(2.5)
    expect(HORIZON_CONFIG['5_years'].compoundingFactor).toBe(1.5)
  })
})