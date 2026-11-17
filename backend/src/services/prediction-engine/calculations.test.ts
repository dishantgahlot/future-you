/**
 * Unit Tests for Prediction Engine Calculations
 *
 * Run with: npm test -- calculations.test.ts
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  calculateBehavioralProfile,
  calculateHealthIndicators,
  calculateAcademicIndicators,
  calculateDigitalWellbeingIndicators,
  calculateFinancialIndicators,
  calculatePersonalDevelopmentIndicators,
  calculateUncertaintyRange,
  projectMetricValue,
  generateProjection,
  assessDataQuality,
} from './calculations.js'
import { DEFAULT_ASSUMPTIONS } from './types.js'

import type {
  DailyMetrics,
  UserBehavioralProfile,
  UserGoals,
  ScenarioAssumptions,
} from './types.js'

// ============================================================================
// Test Data Helpers
// ============================================================================

const createMockDailyMetrics = (overrides: Partial<DailyMetrics> = {}): DailyMetrics => ({
  date: '2024-01-01',
  sleepHours: 7.5,
  studyHours: 2,
  screenTimeHours: 4,
  exerciseMinutes: 30,
  spending: 40,
  habitCompletionRate: 70,
  consistencyScore: 75,
  ...overrides,
})

const createMockProfile = (overrides: Partial<UserBehavioralProfile> = {}): UserBehavioralProfile => ({
  userId: 'test-user',
  period: { start: '2024-01-01', end: '2024-03-01' },
  daysOfData: 60,
  averages: {
    sleepHours: 7.5,
    studyHours: 2,
    screenTimeHours: 4,
    exerciseMinutes: 30,
    spending: 40,
    habitCompletionRate: 70,
    consistencyScore: 75,
  },
  trends: {
    sleep: 'stable',
    study: 'improving',
    screenTime: 'stable',
    exercise: 'stable',
    spending: 'stable',
    completion: 'stable',
  },
  categoryBreakdown: {},
  hasSufficientData: true,
  ...overrides,
})

const createMockGoals = (overrides: Partial<UserGoals> = {}): UserGoals => ({
  targetSleepHours: 8,
  targetStudyHours: 3,
  targetScreenTimeHours: 3,
  targetExerciseMinutes: 30,
  targetMonthlySpending: 1000,
  targetCompletionRate: 80,
  ...overrides,
})

// ============================================================================
// calculateBehavioralProfile Tests
// ============================================================================

describe('calculateBehavioralProfile', () => {
  it('should calculate averages correctly from daily metrics', () => {
    const metrics: DailyMetrics[] = [
      createMockDailyMetrics({ sleepHours: 7, studyHours: 1, exerciseMinutes: 20 }),
      createMockDailyMetrics({ sleepHours: 8, studyHours: 3, exerciseMinutes: 40 }),
      createMockDailyMetrics({ sleepHours: 7.5, studyHours: 2, exerciseMinutes: 30 }),
    ]

    const profile = calculateBehavioralProfile(metrics)

    expect(profile.averages.sleepHours).toBeCloseTo(7.5, 1)
    expect(profile.averages.studyHours).toBeCloseTo(2, 1)
    expect(profile.averages.exerciseMinutes).toBeCloseTo(30, 1)
  })

  it('should detect trends when sufficient data', () => {
    // First half: low values, Second half: high values
    const metrics: DailyMetrics[] = []
    for (let i = 0; i < 10; i++) {
      metrics.push(createMockDailyMetrics({
        sleepHours: 6,
        studyHours: 1,
        date: `2024-01-${String(i + 1).padStart(2, '0')}`
      }))
    }
    for (let i = 0; i < 10; i++) {
      metrics.push(createMockDailyMetrics({
        sleepHours: 8,
        studyHours: 3,
        date: `2024-01-${String(i + 11).padStart(2, '0')}`
      }))
    }

    const profile = calculateBehavioralProfile(metrics)

    expect(profile.trends.sleep).toBe('improving')
    expect(profile.trends.study).toBe('improving')
  })

  it('should return insufficient_data for trends with < 14 days', () => {
    const metrics = [
      createMockDailyMetrics({ date: '2024-01-01' }),
      createMockDailyMetrics({ date: '2024-01-02' }),
    ]

    const profile = calculateBehavioralProfile(metrics)

    expect(profile.trends.sleep).toBe('insufficient_data')
    expect(profile.hasSufficientData).toBe(false)
  })

  it('should correctly identify hasSufficientData', () => {
    const metrics = Array(15).fill(null).map((_, i) =>
      createMockDailyMetrics({ date: `2024-01-${String(i + 1).padStart(2, '0')}` })
    )

    const profile = calculateBehavioralProfile(metrics)

    expect(profile.hasSufficientData).toBe(true)
    expect(profile.daysOfData).toBe(15)
  })
})

// ============================================================================
// calculateHealthIndicators Tests
// ============================================================================

describe('calculateHealthIndicators', () => {
  it('should give perfect score for optimal sleep (7-9 hours)', () => {
    const result = calculateHealthIndicators(8, 30, DEFAULT_ASSUMPTIONS)

    expect(result.sleepScore).toBe(100)
    expect(result.exerciseScore).toBe(100)
    expect(result.overallHealthIndex).toBe(100)
  })

  it('should reduce score for insufficient sleep', () => {
    const result = calculateHealthIndicators(5, 30, DEFAULT_ASSUMPTIONS)

    expect(result.sleepScore).toBeLessThan(70)
    expect(result.cardiovascularRisk).toBe('high')
    expect(result.energyLevel).toBe('low')
  })

  it('should reduce score for no exercise', () => {
    const result = calculateHealthIndicators(8, 0, DEFAULT_ASSUMPTIONS)

    expect(result.exerciseScore).toBe(0)
    expect(result.cardiovascularRisk).toBe('high')
  })

  it('should give moderate scores for moderate values', () => {
    const result = calculateHealthIndicators(6.5, 15, DEFAULT_ASSUMPTIONS)

    expect(result.sleepScore).toBeGreaterThan(50)
    expect(result.sleepScore).toBeLessThan(100)
    expect(result.cardiovascularRisk).toBe('moderate')
    expect(result.energyLevel).toBe('moderate')
  })
})

// ============================================================================
// calculateAcademicIndicators Tests
// ============================================================================

describe('calculateAcademicIndicators', () => {
  it('should calculate indicators from study hours and completion', () => {
    const result = calculateAcademicIndicators(3, 80, 85)

    expect(result.consistencyScore).toBe(85)
    expect(result.projectedStudyHours).toBe(3)
    expect(result.skillAcquisitionRate).toBeGreaterThan(1)
    expect(result.knowledgeRetention).toBeGreaterThan(70)
    expect(result.projectedCredentials).toBeGreaterThanOrEqual(0)
  })

  it('should cap consistency at 100', () => {
    const result = calculateAcademicIndicators(2, 90, 120)

    expect(result.consistencyScore).toBe(100)
  })

  it('should give low retention for low consistency', () => {
    const result = calculateAcademicIndicators(1, 30, 30)

    expect(result.knowledgeRetention).toBeLessThan(50)
  })
})

// ============================================================================
// calculateDigitalWellbeingIndicators Tests
// ============================================================================

describe('calculateDigitalWellbeingIndicators', () => {
  it('should give high score for low screen time', () => {
    const result = calculateDigitalWellbeingIndicators(2, 80, 80)

    expect(result.screenTimeScore).toBe(100)
    expect(result.focusCapacity).toBeGreaterThan(70)
    expect(result.digitalFatigueRisk).toBe('low')
    expect(result.attentionSpan).toBe('long')
  })

  it('should give high fatigue risk for high screen time', () => {
    const result = calculateDigitalWellbeingIndicators(9, 50, 50)

    expect(result.digitalFatigueRisk).toBe('high')
    expect(result.attentionSpan).toBe('short')
    expect(result.screenTimeScore).toBeLessThan(30)
  })

  it('should give moderate fatigue for moderate screen time', () => {
    const result = calculateDigitalWellbeingIndicators(7, 60, 60)

    expect(result.digitalFatigueRisk).toBe('moderate')
  })
})

// ============================================================================
// calculateFinancialIndicators Tests
// ============================================================================

describe('calculateFinancialIndicators', () => {
  it('should calculate savings and net worth', () => {
    const assumptions = { ...DEFAULT_ASSUMPTIONS, monthlyIncome: 5000 }
    const result = calculateFinancialIndicators(50, 5000, assumptions, 6)

    expect(result.projectedMonthlySpending).toBe(1522) // 50 * 30.44
    expect(result.projectedSavings).toBeGreaterThan(0)
    expect(result.projectedNetWorth).toBeGreaterThan(0)
    expect(result.financialStressLevel).toBe('low')
    expect(result.emergencyFundMonths).toBeGreaterThan(0)
  })

  it('should show high stress for negative savings', () => {
    const assumptions = { ...DEFAULT_ASSUMPTIONS, monthlyIncome: 2000 }
    const result = calculateFinancialIndicators(100, 2000, assumptions, 6)

    expect(result.financialStressLevel).toBe('high')
    expect(result.projectedSavings).toBeLessThan(0)
  })

  it('should show moderate stress for low savings rate', () => {
    const assumptions = { ...DEFAULT_ASSUMPTIONS, monthlyIncome: 3000 }
    // 95 * 30.44 = 2891.8 monthly spending, 3000 - 2891.8 = 108.2 savings, rate = 3.6%
    const result = calculateFinancialIndicators(95, 3000, assumptions, 6)

    expect(result.financialStressLevel).toBe('moderate')
  })
})

// ============================================================================
// calculatePersonalDevelopmentIndicators Tests
// ============================================================================

describe('calculatePersonalDevelopmentIndicators', () => {
  it('should calculate diversity and social scores', () => {
    const result = calculatePersonalDevelopmentIndicators(80, 80, 5, 2)

    expect(result.habitDiversityScore).toBeGreaterThan(80)
    expect(result.socialConnectionScore).toBeGreaterThan(50)
    expect(result.projectedActiveHabits).toBeGreaterThan(5)
    expect(result.lifeSatisfactionIndex).toBeGreaterThan(70)
    expect(result.resilienceScore).toBeGreaterThan(70)
  })

  it('should give low scores for low completion and consistency', () => {
    const result = calculatePersonalDevelopmentIndicators(30, 30, 2, 0)

    expect(result.habitDiversityScore).toBeLessThan(60)
    expect(result.lifeSatisfactionIndex).toBeLessThan(60)
    expect(result.resilienceScore).toBeLessThan(50)
  })
})

// ============================================================================
// calculateUncertaintyRange Tests
// ============================================================================

describe('calculateUncertaintyRange', () => {
  it('should give higher confidence for sufficient data', () => {
    const result = calculateUncertaintyRange(80, 6, DEFAULT_ASSUMPTIONS, {
      hasSufficientData: true,
      daysOfHistory: 60,
    })

    expect(result.confidenceLevel).toBeGreaterThan(70)
    expect(result.lowEstimate).toBeLessThan(80)
    expect(result.highEstimate).toBeGreaterThan(80)
  })

  it('should give lower confidence for insufficient data', () => {
    const result = calculateUncertaintyRange(80, 6, DEFAULT_ASSUMPTIONS, {
      hasSufficientData: false,
      daysOfHistory: 7,
    })

    expect(result.confidenceLevel).toBeLessThan(70)
    expect(result.note).toContain('Illustrative simulation')
  })

  it('should increase uncertainty for longer horizons', () => {
    const result6m = calculateUncertaintyRange(80, 6, DEFAULT_ASSUMPTIONS, {
      hasSufficientData: true,
      daysOfHistory: 60,
    })

    const result5y = calculateUncertaintyRange(80, 60, DEFAULT_ASSUMPTIONS, {
      hasSufficientData: true,
      daysOfHistory: 60,
    })

    expect(result5y.confidenceLevel).toBeLessThan(result6m.confidenceLevel)
    expect(result5y.highEstimate - result5y.lowEstimate).toBeGreaterThan(
      result6m.highEstimate - result6m.lowEstimate
    )
  })
})

// ============================================================================
// projectMetricValue Tests
// ============================================================================

describe('projectMetricValue', () => {
  const assumptions = DEFAULT_ASSUMPTIONS

  it('should project current path with decay', () => {
    const result = projectMetricValue(
      7, // current sleep
      8, // target
      6, // months
      assumptions,
      'current_path',
      'sleep'
    )

    // Current path should regress toward population average (7)
    expect(result).toBeLessThanOrEqual(7.5)
    expect(result).toBeGreaterThanOrEqual(4) // min sleep
  })

  it('should project improved path toward target', () => {
    const result = projectMetricValue(
      6, // current sleep
      8, // target
      6, // months
      assumptions,
      'improved_path',
      'sleep'
    )

    // Improved path should move toward target
    expect(result).toBeGreaterThan(6)
    expect(result).toBeLessThanOrEqual(8)
  })

  it('should respect maximum limits', () => {
    const result = projectMetricValue(
      9, // current sleep
      12, // target (above max)
      60, // 5 years
      assumptions,
      'improved_path',
      'sleep'
    )

    expect(result).toBeLessThanOrEqual(assumptions.maxSleepHours)
  })

  it('should respect minimum limits', () => {
    const result = projectMetricValue(
      5, // current sleep
      3, // target (below min)
      60,
      assumptions,
      'improved_path',
      'sleep'
    )

    expect(result).toBeGreaterThanOrEqual(assumptions.minSleepHours)
  })

  it('should handle screen time reduction (lower is better)', () => {
    const currentPath = projectMetricValue(
      6, // current high screen time
      3, // target lower
      6,
      assumptions,
      'current_path',
      'screenTime'
    )

    const improvedPath = projectMetricValue(
      6,
      3,
      6,
      assumptions,
      'improved_path',
      'screenTime'
    )

    // Both should trend downward but improved path faster
    expect(improvedPath).toBeLessThan(currentPath)
  })
})

// ============================================================================
// generateProjection Tests
// ============================================================================

describe('generateProjection', () => {
  it('should generate complete projection for 6 months', () => {
    const profile = createMockProfile()
    const goals = createMockGoals()
    const assumptions = DEFAULT_ASSUMPTIONS

    const projection = generateProjection(
      profile,
      goals,
      assumptions,
      'improved_path',
      6,
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
    const assumptions = DEFAULT_ASSUMPTIONS

    const projection = generateProjection(
      profile,
      goals,
      assumptions,
      'improved_path',
      60,
      5,
      1
    )

    expect(projection.horizon).toBe('5_years')
    expect(projection.uncertainty.confidenceLevel).toBeLessThan(80)
  })

  it('should add illustrative note when insufficient data', () => {
    const profile = createMockProfile({ hasSufficientData: false, daysOfData: 7 })
    const goals = createMockGoals()
    const assumptions = DEFAULT_ASSUMPTIONS

    const projection = generateProjection(
      profile,
      goals,
      assumptions,
      'improved_path',
      6,
      5,
      1
    )

    expect(projection.uncertainty.note).toContain('Illustrative simulation')
  })
})

// ============================================================================
// assessDataQuality Tests
// ============================================================================

describe('assessDataQuality', () => {
  it('should return sufficient data for 14+ days with all categories', () => {
    const profile = createMockProfile({ daysOfData: 30 })

    const quality = assessDataQuality(profile, 14)

    expect(quality.hasSufficientData).toBe(true)
    expect(quality.isIllustrative).toBe(false)
    expect(quality.confidenceImpact).toBe(0)
  })

  it('should return insufficient data for < 14 days', () => {
    const profile = createMockProfile({ daysOfData: 7 })

    const quality = assessDataQuality(profile, 14)

    expect(quality.hasSufficientData).toBe(false)
    expect(quality.isIllustrative).toBe(true)
    expect(quality.confidenceImpact).toBeGreaterThan(0)
  })

  it('should detect missing categories', () => {
    const profile = createMockProfile({
      averages: { ...createMockProfile().averages, sleepHours: 0, exerciseMinutes: 0 }
    })

    const quality = assessDataQuality(profile, 14)

    expect(quality.missingCategories).toContain('sleep')
    expect(quality.missingCategories).toContain('exercise')
    expect(quality.confidenceImpact).toBeGreaterThan(20)
  })
})