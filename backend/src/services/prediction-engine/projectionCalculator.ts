/**
 * Projection Calculator - Horizon-specific projection calculations
 *
 * Handles the mathematical projections for 6-month and 5-year horizons
 * with compounding effects, uncertainty ranges, and category-specific logic.
 */

import type {
  ProjectionResult,
  ProjectionHorizon,
  ScenarioAssumptions,
  UserBehavioralProfile,
  UserGoals,
  HealthIndicators,
  AcademicIndicators,
  DigitalWellbeingIndicators,
  FinancialIndicators,
  PersonalDevelopmentIndicators,
  UncertaintyRange,
} from './types.js'
import { DEFAULT_ASSUMPTIONS } from './types.js'
import {
  calculateHealthIndicators,
  calculateAcademicIndicators,
  calculateDigitalWellbeingIndicators,
  calculateFinancialIndicators,
  calculatePersonalDevelopmentIndicators,
  calculateUncertaintyRange,
  projectMetricValue,
} from './calculations.js'

// ============================================================================
// Horizon Configuration
// ============================================================================

export const HORIZON_CONFIG = {
  '6_months': {
    months: 6,
    label: '6 Months',
    description: 'Near-term projection with higher confidence',
    compoundingFactor: 1.0,
    uncertaintyMultiplier: 1.0,
  },
  '5_years': {
    months: 60,
    label: '5 Years',
    description: 'Long-term projection with significant uncertainty',
    compoundingFactor: 1.5, // Compounding effects stronger over longer period
    uncertaintyMultiplier: 2.5,
  },
} as const

// ============================================================================
// Target Resolution
// ============================================================================

export interface ResolvedTargets {
  sleepHours: number
  studyHours: number
  screenTimeHours: number
  exerciseMinutes: number
  spending: number
  habitCompletionRate: number
  consistencyScore: number
}

/**
 * Resolve target values from goals or use intelligent defaults
 */
export function resolveTargets(
  goals: UserGoals | undefined,
  currentAverages: UserBehavioralProfile['averages'],
  profile: UserBehavioralProfile
): ResolvedTargets {
  // Default targets based on behavioral science recommendations
  const defaults = {
    sleepHours: 8,
    studyHours: 3,
    screenTimeHours: 3,
    exerciseMinutes: 30,
    spending: currentAverages.spending * 0.9, // 10% reduction
    habitCompletionRate: 80,
    consistencyScore: 75,
  }

  return {
    sleepHours: goals?.targetSleepHours ?? defaults.sleepHours,
    studyHours: goals?.targetStudyHours ?? defaults.studyHours,
    screenTimeHours: goals?.targetScreenTimeHours ?? defaults.screenTimeHours,
    exerciseMinutes: goals?.targetExerciseMinutes ?? defaults.exerciseMinutes,
    spending: goals?.targetMonthlySpending
      ? goals.targetMonthlySpending / 30.44
      : defaults.spending,
    habitCompletionRate: goals?.targetCompletionRate ?? defaults.habitCompletionRate,
    consistencyScore: defaults.consistencyScore,
  }
}

// ============================================================================
// Metric Projection with Horizon Adjustments
// ============================================================================

/**
 * Project all metrics for a specific horizon
 */
export function projectMetricsForHorizon(
  current: UserBehavioralProfile['averages'],
  targets: ResolvedTargets,
  assumptions: ScenarioAssumptions,
  scenarioType: 'current_path' | 'improved_path',
  horizon: ProjectionHorizon
): ResolvedTargets {
  const horizonConfig = HORIZON_CONFIG[horizon]
  const months = horizonConfig.months

  // Apply horizon-specific adjustments
  const adjustedAssumptions = {
    ...assumptions,
    // Longer horizons have more uncertainty
    baseUncertainty: assumptions.baseUncertainty * horizonConfig.uncertaintyMultiplier,
    uncertaintyGrowthPerYear: assumptions.uncertaintyGrowthPerYear * horizonConfig.uncertaintyMultiplier,
  }

  return {
    sleepHours: projectMetricValue(current.sleepHours, targets.sleepHours, months, adjustedAssumptions, scenarioType, 'sleep'),
    studyHours: projectMetricValue(current.studyHours, targets.studyHours, months, adjustedAssumptions, scenarioType, 'study'),
    screenTimeHours: projectMetricValue(current.screenTimeHours, targets.screenTimeHours, months, adjustedAssumptions, scenarioType, 'screenTime'),
    exerciseMinutes: projectMetricValue(current.exerciseMinutes, targets.exerciseMinutes, months, adjustedAssumptions, scenarioType, 'exercise'),
    spending: projectMetricValue(current.spending, targets.spending, months, adjustedAssumptions, scenarioType, 'spending'),
    habitCompletionRate: projectMetricValue(current.habitCompletionRate, targets.habitCompletionRate, months, adjustedAssumptions, scenarioType, 'completion'),
    // Consistency is derived from completion + trend
    consistencyScore: projectConsistency(current, targets, scenarioType, months, adjustedAssumptions),
  }
}

/**
 * Project consistency score based on completion and trends
 */
function projectConsistency(
  current: UserBehavioralProfile['averages'],
  targets: ResolvedTargets,
  scenarioType: 'current_path' | 'improved_path',
  months: number,
  assumptions: ScenarioAssumptions
): number {
  const currentConsistency = current.consistencyScore
  const targetConsistency = targets.consistencyScore

  if (scenarioType === 'improved_path') {
    // Consistency improves with completion rate improvement
    const completionImprovement = targets.habitCompletionRate - current.habitCompletionRate
    const consistencyGain = completionImprovement * 0.4 // 40% of completion improvement transfers

    // Logarithmic improvement curve
    const improvementFactor = Math.log(1 + months * assumptions.improvedPathImprovementRate)
      / Math.log(1 + 60 * assumptions.improvedPathImprovementRate)

    return Math.min(100, currentConsistency + consistencyGain * improvementFactor)
  } else {
    // Current path: consistency decays
    const decayFactor = Math.pow(1 - assumptions.habitDecayRate, months / 3)
    const regressionFactor = assumptions.regressionToMean * (1 - decayFactor)
    const populationBaseline = 40 // Population average consistency

    return Math.max(0, currentConsistency * decayFactor + populationBaseline * regressionFactor)
  }
}

// ============================================================================
// Indicator Calculations with Horizon Context
// ============================================================================

/**
 * Calculate all indicators for a horizon
 */
export function calculateAllIndicators(
  projected: ResolvedTargets,
  assumptions: ScenarioAssumptions,
  horizon: ProjectionHorizon,
  categoryCount: number,
  socialHabitsCount: number,
  profile: UserBehavioralProfile
): {
  health: HealthIndicators
  academic: AcademicIndicators
  digitalWellbeing: DigitalWellbeingIndicators
  financial: FinancialIndicators
  personalDevelopment: PersonalDevelopmentIndicators
} {
  const horizonConfig = HORIZON_CONFIG[horizon]

  // Health indicators
  const health = calculateHealthIndicators(
    projected.sleepHours,
    projected.exerciseMinutes,
    assumptions
  )

  // Academic indicators
  const academic = calculateAcademicIndicators(
    projected.studyHours,
    projected.habitCompletionRate,
    projected.consistencyScore
  )

  // Digital wellbeing indicators
  const digitalWellbeing = calculateDigitalWellbeingIndicators(
    projected.screenTimeHours,
    projected.habitCompletionRate,
    projected.consistencyScore
  )

  // Financial indicators
  const financial = calculateFinancialIndicators(
    projected.spending,
    undefined, // Will use default
    assumptions,
    horizonConfig.months
  )

  // Personal development indicators
  const personalDevelopment = calculatePersonalDevelopmentIndicators(
    projected.habitCompletionRate,
    projected.consistencyScore,
    categoryCount,
    socialHabitsCount
  )

  return {
    health,
    academic,
    digitalWellbeing,
    financial,
    personalDevelopment,
  }
}

// ============================================================================
// Uncertainty Calculation
// ============================================================================

/**
 * Calculate comprehensive uncertainty for projection
 */
export function calculateProjectionUncertainty(
  healthIndex: number,
  horizon: ProjectionHorizon,
  assumptions: ScenarioAssumptions,
  dataQuality: { hasSufficientData: boolean; daysOfHistory: number }
): UncertaintyRange {
  const horizonConfig = HORIZON_CONFIG[horizon]
  const adjustedAssumptions = {
    ...assumptions,
    baseUncertainty: assumptions.baseUncertainty * horizonConfig.uncertaintyMultiplier,
    uncertaintyGrowthPerYear: assumptions.uncertaintyGrowthPerYear * horizonConfig.uncertaintyMultiplier,
  }

  return calculateUncertaintyRange(
    healthIndex,
    horizonConfig.months,
    adjustedAssumptions,
    dataQuality
  )
}

// ============================================================================
// Main Projection Function
// ============================================================================

/**
 * Calculate complete projection result for a horizon
 */
export function calculateProjection(
  profile: UserBehavioralProfile,
  goals: UserGoals | undefined,
  assumptions: ScenarioAssumptions,
  scenarioType: 'current_path' | 'improved_path',
  horizon: ProjectionHorizon,
  categoryCount: number,
  socialHabitsCount: number
): ProjectionResult {
  // Resolve targets
  const targets = resolveTargets(goals, profile.averages, profile)

  // Project metrics for horizon
  const projectedMetrics = projectMetricsForHorizon(
    profile.averages,
    targets,
    assumptions,
    scenarioType,
    horizon
  )

  // Calculate all indicators
  const indicators = calculateAllIndicators(
    projectedMetrics,
    assumptions,
    horizon,
    categoryCount,
    socialHabitsCount,
    profile
  )

  // Calculate uncertainty
  const uncertainty = calculateProjectionUncertainty(
    indicators.health.overallHealthIndex,
    horizon,
    assumptions,
    { hasSufficientData: profile.hasSufficientData, daysOfHistory: profile.daysOfData }
  )

  return {
    horizon,
    ...indicators,
    uncertainty,
  }
}

// ============================================================================
// Sensitivity Analysis
// ============================================================================

export interface SensitivityResult {
  metric: string
  baseValue: number
  optimisticValue: number // +20% improvement in input
  pessimisticValue: number // -20% degradation in input
  sensitivity: number // % change in output per % change in input
}

/**
 * Perform sensitivity analysis on key metrics
 */
export function performSensitivityAnalysis(
  profile: UserBehavioralProfile,
  goals: UserGoals | undefined,
  assumptions: ScenarioAssumptions,
  scenarioType: 'current_path' | 'improved_path',
  horizon: ProjectionHorizon
): SensitivityResult[] {
  const targets = resolveTargets(goals, profile.averages, profile)
  const baseProjection = calculateProjection(profile, goals, assumptions, scenarioType, horizon, 5, 1)

  const keyMetrics: Array<{
    name: string
    key: keyof ResolvedTargets
    adjust: (base: number) => { optimistic: number; pessimistic: number }
  }> = [
    {
      name: 'Sleep Hours',
      key: 'sleepHours',
      adjust: (base) => ({ optimistic: base * 1.2, pessimistic: base * 0.8 }),
    },
    {
      name: 'Exercise Minutes',
      key: 'exerciseMinutes',
      adjust: (base) => ({ optimistic: base * 1.3, pessimistic: base * 0.7 }),
    },
    {
      name: 'Screen Time',
      key: 'screenTimeHours',
      adjust: (base) => ({ optimistic: base * 0.7, pessimistic: base * 1.3 }), // Lower is better
    },
    {
      name: 'Study Hours',
      key: 'studyHours',
      adjust: (base) => ({ optimistic: base * 1.3, pessimistic: base * 0.7 }),
    },
    {
      name: 'Completion Rate',
      key: 'habitCompletionRate',
      adjust: (base) => ({ optimistic: Math.min(100, base * 1.25), pessimistic: base * 0.75 }),
    },
  ]

  return keyMetrics.map(({ name, key, adjust }) => {
    const baseValue = targets[key]
    const { optimistic, pessimistic } = adjust(baseValue)

    // Create modified targets
    const optimisticTargets = { ...targets, [key]: optimistic }
    const pessimisticTargets = { ...targets, [key]: pessimistic }

    // Project with modified targets
    const optimisticProjected = projectMetricsForHorizon(
      profile.averages,
      optimisticTargets,
      assumptions,
      scenarioType,
      horizon
    )
    const pessimisticProjected = projectMetricsForHorizon(
      profile.averages,
      pessimisticTargets,
      assumptions,
      scenarioType,
      horizon
    )

    // Calculate all indicators for both projections
    const optimisticIndicators = calculateAllIndicators(
      optimisticProjected,
      assumptions,
      horizon,
      5, // category count
      1, // social habits
      profile
    )
    const pessimisticIndicators = calculateAllIndicators(
      pessimisticProjected,
      assumptions,
      horizon,
      5,
      1,
      profile
    )

    // Use metric-appropriate output indicator
    let baseOutput: number
    let optimisticOutput: number
    let pessimisticOutput: number

    switch (key) {
      case 'sleepHours':
      case 'exerciseMinutes':
        baseOutput = baseProjection.health.overallHealthIndex
        optimisticOutput = optimisticIndicators.health.overallHealthIndex
        pessimisticOutput = pessimisticIndicators.health.overallHealthIndex
        break
      case 'screenTimeHours':
        baseOutput = baseProjection.digitalWellbeing.focusCapacity
        optimisticOutput = optimisticIndicators.digitalWellbeing.focusCapacity
        pessimisticOutput = pessimisticIndicators.digitalWellbeing.focusCapacity
        break
      case 'studyHours':
        baseOutput = baseProjection.academic.knowledgeRetention
        optimisticOutput = optimisticIndicators.academic.knowledgeRetention
        pessimisticOutput = pessimisticIndicators.academic.knowledgeRetention
        break
      case 'habitCompletionRate':
        baseOutput = baseProjection.personalDevelopment.lifeSatisfactionIndex
        optimisticOutput = optimisticIndicators.personalDevelopment.lifeSatisfactionIndex
        pessimisticOutput = pessimisticIndicators.personalDevelopment.lifeSatisfactionIndex
        break
      default:
        baseOutput = baseProjection.health.overallHealthIndex
        optimisticOutput = optimisticIndicators.health.overallHealthIndex
        pessimisticOutput = pessimisticIndicators.health.overallHealthIndex
    }

    const outputChange = Math.abs(optimisticOutput - pessimisticOutput)
    const inputChange = Math.abs(optimistic - pessimistic) / baseValue
    const sensitivity = inputChange > 0 ? (outputChange / Math.max(baseOutput, 1)) / inputChange : 0

    return {
      metric: name,
      baseValue: baseOutput,
      optimisticValue: optimisticOutput,
      pessimisticValue: pessimisticOutput,
      sensitivity: Math.round(sensitivity * 100) / 100,
    }
  })
}

// ============================================================================
// Horizon Comparison
// ============================================================================

/**
 * Compare projections across horizons
 */
export function compareHorizons(
  projection6m: ProjectionResult,
  projection5y: ProjectionResult
): {
  healthTrajectory: 'improving' | 'stable' | 'declining'
  academicTrajectory: 'improving' | 'stable' | 'declining'
  digitalTrajectory: 'improving' | 'stable' | 'declining'
  financialTrajectory: 'improving' | 'stable' | 'declining'
  personalTrajectory: 'improving' | 'stable' | 'declining'
  compoundingEffects: string[]
  warnings: string[]
} {
  const getTrajectory = (current: number, future: number): 'improving' | 'stable' | 'declining' => {
    const diff = future - current
    if (diff > 5) return 'improving'
    if (diff < -5) return 'declining'
    return 'stable'
  }

  const compoundingEffects: string[] = []
  const warnings: string[] = []

  // Health trajectory
  const healthTrajectory = getTrajectory(
    projection6m.health.overallHealthIndex,
    projection5y.health.overallHealthIndex
  )

  // Check for compounding
  if (projection5y.health.overallHealthIndex > projection6m.health.overallHealthIndex + 10) {
    compoundingEffects.push('Health improvements compound significantly over 5 years')
  }

  // Academic trajectory
  const academicTrajectory = getTrajectory(
    projection6m.academic.knowledgeRetention,
    projection5y.academic.knowledgeRetention
  )

  if (projection5y.academic.projectedCredentials > projection6m.academic.projectedCredentials * 5) {
    compoundingEffects.push('Learning compounds: credentials grow super-linearly with consistent study')
  }

  // Digital trajectory
  const digitalTrajectory = getTrajectory(
    projection6m.digitalWellbeing.focusCapacity,
    projection5y.digitalWellbeing.focusCapacity
  )

  if (projection6m.digitalWellbeing.digitalFatigueRisk !== projection5y.digitalWellbeing.digitalFatigueRisk) {
    warnings.push('Digital fatigue risk changes over long horizon - monitor screen time habits')
  }

  // Financial trajectory
  const financialTrajectory = getTrajectory(
    projection6m.financial.emergencyFundMonths,
    projection5y.financial.emergencyFundMonths
  )

  if (projection5y.financial.investmentGrowth > projection6m.financial.investmentGrowth * 8) {
    compoundingEffects.push('Investment returns compound exponentially over 5 years')
  }

  // Personal trajectory
  const personalTrajectory = getTrajectory(
    projection6m.personalDevelopment.lifeSatisfactionIndex,
    projection5y.personalDevelopment.lifeSatisfactionIndex
  )

  // General warnings
  if (projection5y.uncertainty.confidenceLevel < 50) {
    warnings.push('5-year projection has high uncertainty - treat as illustrative')
  }

  if (projection5y.uncertainty.confidenceLevel < projection6m.uncertainty.confidenceLevel * 0.6) {
    warnings.push('Confidence drops significantly for 5-year horizon')
  }

  return {
    healthTrajectory,
    academicTrajectory,
    digitalTrajectory,
    financialTrajectory,
    personalTrajectory,
    compoundingEffects,
    warnings,
  }
}