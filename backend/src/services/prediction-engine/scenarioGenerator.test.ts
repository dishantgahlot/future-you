/**
 * Unit Tests for Scenario Generator
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  buildScenarioAssumptions,
  generateScenario,
  generateBothScenarios,
  generateComparativeAnalysis,
  getScenarioMetadata,
  SCENARIO_CONFIGS,
} from './scenarioGenerator.js'
import { DEFAULT_ASSUMPTIONS } from './types.js'

import type {
  UserBehavioralProfile,
  UserGoals,
  ScenarioAssumptions,
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
// buildScenarioAssumptions Tests
// ============================================================================

describe('buildScenarioAssumptions', () => {
  it('should merge defaults with custom and scenario-specific overrides', () => {
    const customAssumptions = { habitFormationRate: 2 }
    const assumptions = buildScenarioAssumptions(customAssumptions, 'current_path')

    expect(assumptions.habitFormationRate).toBe(2)
    expect(assumptions.improvementSustainability).toBe(0.5) // current_path override
    expect(assumptions.regressionToMean).toBe(0.4) // current_path override
  })

  it('should apply improved_path overrides', () => {
    const assumptions = buildScenarioAssumptions({}, 'improved_path')

    expect(assumptions.improvementSustainability).toBe(0.8)
    expect(assumptions.regressionToMean).toBe(0.2)
    expect(assumptions.improvedPathImprovementRate).toBe(0.15)
  })

  it('should prioritize custom assumptions over scenario defaults', () => {
    const customAssumptions = { improvementSustainability: 0.9 }
    const assumptions = buildScenarioAssumptions(customAssumptions, 'current_path')

    // Custom should win over scenario-specific
    expect(assumptions.improvementSustainability).toBe(0.9)
  })
})

// ============================================================================
// generateScenario Tests
// ============================================================================

describe('generateScenario', () => {
  it('should generate scenario with both horizons', () => {
    const profile = createMockProfile()
    const goals = createMockGoals()
    const assumptions = createMockAssumptions()

    const dataQuality = {
      hasSufficientData: true,
      daysOfHistory: 60,
      minimumDaysRequired: 14,
      isIllustrative: false,
      missingCategories: [],
      confidenceImpact: 0,
    }

    const scenario = generateScenario(
      profile,
      goals,
      assumptions,
      'improved_path',
      5,
      1,
      dataQuality
    )

    expect(scenario.type).toBe('improved_path')
    expect(scenario.label).toBe('Improved Path')
    expect(scenario.projections['6_months']).toBeDefined()
    expect(scenario.projections['5_years']).toBeDefined()
    expect(scenario.dataQuality).toEqual(dataQuality)
  })

  it('should add illustrative note for insufficient data', () => {
    const profile = createMockProfile()
    const goals = createMockGoals()
    const assumptions = createMockAssumptions()

    const dataQuality = {
      hasSufficientData: false,
      daysOfHistory: 7,
      minimumDaysRequired: 14,
      isIllustrative: true,
      missingCategories: [],
      confidenceImpact: 30,
    }

    const scenario = generateScenario(
      profile,
      goals,
      assumptions,
      'improved_path',
      5,
      1,
      dataQuality
    )

    expect(scenario.projections['6_months'].uncertainty.note).toContain('Illustrative simulation')
  })
})

// ============================================================================
// generateBothScenarios Tests
// ============================================================================

describe('generateBothScenarios', () => {
  it('should generate both current and improved path scenarios', () => {
    const profile = createMockProfile()
    const goals = createMockGoals()
    // Pass empty baseAssumptions to test scenario-specific overrides
    const baseAssumptions = {}

    const { currentPath, improvedPath } = generateBothScenarios(
      profile,
      goals,
      baseAssumptions,
      5,
      1
    )

    expect(currentPath.type).toBe('current_path')
    expect(improvedPath.type).toBe('improved_path')

    // Current path should have lower sustainability (0.5 vs 0.8)
    expect(currentPath.assumptions.improvementSustainability).toBe(0.5)
    expect(improvedPath.assumptions.improvementSustainability).toBe(0.8)
    expect(currentPath.assumptions.improvementSustainability).toBeLessThan(
      improvedPath.assumptions.improvementSustainability
    )
  })

  it('should assess data quality from profile', () => {
    const profile = createMockProfile({ daysOfData: 7, hasSufficientData: false })
    const goals = createMockGoals()

    const { currentPath } = generateBothScenarios(profile, goals, {}, 5, 1)

    expect(currentPath.dataQuality.hasSufficientData).toBe(false)
    expect(currentPath.dataQuality.isIllustrative).toBe(true)
  })
})

// ============================================================================
// generateComparativeAnalysis Tests
// ============================================================================

describe('generateComparativeAnalysis', () => {
  it('should calculate improvements between scenarios', () => {
    // Create mock scenarios with known differences
    const current6m = {
      health: { overallHealthIndex: 60, sleepScore: 50, exerciseScore: 70, projectedSleepHours: 7, projectedExerciseMinutes: 20, cardiovascularRisk: 'moderate' as const, energyLevel: 'moderate' as const },
      academic: { consistencyScore: 50, projectedStudyHours: 1, skillAcquisitionRate: 1, knowledgeRetention: 50, projectedCredentials: 0 },
      digitalWellbeing: { focusCapacity: 50, screenTimeScore: 50, projectedScreenTimeHours: 5, digitalFatigueRisk: 'moderate' as const, attentionSpan: 'moderate' as const },
      financial: { emergencyFundMonths: 1, projectedMonthlySpending: 1500, projectedSavings: 0, projectedNetWorth: 0, financialStressLevel: 'moderate' as const, investmentGrowth: 0 },
      personalDevelopment: { lifeSatisfactionIndex: 50, habitDiversityScore: 50, socialConnectionScore: 50, projectedActiveHabits: 3, resilienceScore: 50 },
      uncertainty: { confidenceLevel: 70, lowEstimate: 50, highEstimate: 70, note: '' },
      horizon: '6_months' as const,
    }

    const improved6m = {
      ...current6m,
      health: { ...current6m.health, overallHealthIndex: 80 },
      academic: { ...current6m.academic, consistencyScore: 75, knowledgeRetention: 75 },
      digitalWellbeing: { ...current6m.digitalWellbeing, focusCapacity: 75 },
      financial: { ...current6m.financial, emergencyFundMonths: 3 },
      personalDevelopment: { ...current6m.personalDevelopment, lifeSatisfactionIndex: 75 },
    }

    const currentPath = { projections: { '6_months': current6m, '5_years': current6m } }
    const improvedPath = { projections: { '6_months': improved6m, '5_years': improved6m } }

    const analysis = generateComparativeAnalysis(currentPath as any, improvedPath as any)

    expect(analysis.healthImprovement).toBe(20)
    expect(analysis.academicImprovement).toBe(25) // (75+75)/2 - (50+50)/2
    expect(analysis.digitalWellbeingImprovement).toBe(25)
    expect(analysis.financialImprovement).toBe(2)
    expect(analysis.personalDevelopmentImprovement).toBe(25)
    expect(analysis.overallImprovement).toBeGreaterThan(15)
  })

  it('should identify leverage points', () => {
    const current6m = {
      health: { overallHealthIndex: 40, sleepScore: 30, exerciseScore: 50, projectedSleepHours: 5.5, projectedExerciseMinutes: 10, cardiovascularRisk: 'high' as const, energyLevel: 'low' as const },
      academic: { consistencyScore: 30, projectedStudyHours: 0.5, skillAcquisitionRate: 0.8, knowledgeRetention: 30, projectedCredentials: 0 },
      digitalWellbeing: { focusCapacity: 30, screenTimeScore: 30, projectedScreenTimeHours: 8, digitalFatigueRisk: 'high' as const, attentionSpan: 'short' as const },
      financial: { emergencyFundMonths: 0, projectedMonthlySpending: 2000, projectedSavings: -500, projectedNetWorth: -500, financialStressLevel: 'high' as const, investmentGrowth: 0 },
      personalDevelopment: { lifeSatisfactionIndex: 30, habitDiversityScore: 30, socialConnectionScore: 30, projectedActiveHabits: 1, resilienceScore: 30 },
      uncertainty: { confidenceLevel: 70, lowEstimate: 30, highEstimate: 50, note: '' },
      horizon: '6_months' as const,
    }

    const improved6m = {
      ...current6m,
      health: { ...current6m.health, overallHealthIndex: 70, sleepScore: 85, exerciseScore: 80 },
    }

    const currentPath = { projections: { '6_months': current6m, '5_years': current6m } }
    const improvedPath = { projections: { '6_months': improved6m, '5_years': improved6m } }

    const analysis = generateComparativeAnalysis(currentPath as any, improvedPath as any)

    expect(analysis.keyLeveragePoints.length).toBeGreaterThan(0)
    expect(analysis.keyLeveragePoints.some(p => p.includes('sleep'))).toBe(true)
  })

  it('should estimate break-even time', () => {
    const current6m = {
      health: { overallHealthIndex: 50, sleepScore: 50, exerciseScore: 50, projectedSleepHours: 6, projectedExerciseMinutes: 15, cardiovascularRisk: 'moderate' as const, energyLevel: 'moderate' as const },
      academic: { consistencyScore: 50, projectedStudyHours: 1, skillAcquisitionRate: 1, knowledgeRetention: 50, projectedCredentials: 0 },
      digitalWellbeing: { focusCapacity: 50, screenTimeScore: 50, projectedScreenTimeHours: 5, digitalFatigueRisk: 'moderate' as const, attentionSpan: 'moderate' as const },
      financial: { emergencyFundMonths: 1, projectedMonthlySpending: 1500, projectedSavings: 0, projectedNetWorth: 0, financialStressLevel: 'moderate' as const, investmentGrowth: 0 },
      personalDevelopment: { lifeSatisfactionIndex: 50, habitDiversityScore: 50, socialConnectionScore: 50, projectedActiveHabits: 3, resilienceScore: 50 },
      uncertainty: { confidenceLevel: 70, lowEstimate: 40, highEstimate: 60, note: '' },
      horizon: '6_months' as const,
    }

    // Small improvement
    const improved6mSmall = {
      ...current6m,
      health: { ...current6m.health, overallHealthIndex: 58 },
    }

    const currentPath = { projections: { '6_months': current6m, '5_years': current6m } }
    const improvedPathSmall = { projections: { '6_months': improved6mSmall, '5_years': improved6mSmall } }

    const analysisSmall = generateComparativeAnalysis(currentPath as any, improvedPathSmall as any)
    expect(analysisSmall.timeToBreakEven).toBe('4-5 months')

    // Large improvement
    const improved6mLarge = {
      ...current6m,
      health: { ...current6m.health, overallHealthIndex: 70 },
    }

    const improvedPathLarge = { projections: { '6_months': improved6mLarge, '5_years': improved6mLarge } }

    const analysisLarge = generateComparativeAnalysis(currentPath as any, improvedPathLarge as any)
    expect(analysisLarge.timeToBreakEven).toBe('1-2 months')
  })
})

// ============================================================================
// getScenarioMetadata Tests
// ============================================================================

describe('getScenarioMetadata', () => {
  it('should return formatted metadata for UI', () => {
    const profile = createMockProfile()
    const goals = createMockGoals()
    const assumptions = createMockAssumptions()
    const dataQuality = {
      hasSufficientData: true,
      daysOfHistory: 60,
      minimumDaysRequired: 14,
      isIllustrative: false,
      missingCategories: [],
      confidenceImpact: 0,
    }

    const scenario = generateScenario(profile, goals, assumptions, 'improved_path', 5, 1, dataQuality)
    const metadata = getScenarioMetadata(scenario)

    expect(metadata.type).toBe('improved_path')
    expect(metadata.label).toBe('Improved Path')
    expect(metadata.isIllustrative).toBe(false)
    expect(metadata.dataQuality.daysOfHistory).toBe(60)
    expect(metadata.keyAssumptions.habitFormationRate).toBeDefined()
  })
})