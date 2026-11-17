/**
 * Scenario Generator - Creates Current Path and Improved Path scenarios
 *
 * Generates two contrasting future scenarios based on user's behavioral profile:
 * - Current Path: Continues current trajectory with natural decay/regression
 * - Improved Path: Models gradual improvement toward user goals
 */

import type {
  UserBehavioralProfile,
  UserGoals,
  ScenarioAssumptions,
  Scenario,
  ProjectionResult,
} from './types.js'
import { DEFAULT_ASSUMPTIONS } from './types.js'
import { generateProjection, calculateUncertaintyRange } from './calculations.js'

// ============================================================================
// Scenario Configuration
// ============================================================================

export const SCENARIO_CONFIGS = {
  current_path: {
    label: 'Current Path',
    description: 'Projection if you maintain current habits without intentional changes. Includes natural habit decay and regression toward population averages.',
    assumptionsOverrides: {
      // Current path uses defaults but with lower sustainability
      improvementSustainability: 0.5,
      regressionToMean: 0.4,
    },
  },
  improved_path: {
    label: 'Improved Path',
    description: 'Projection if you consistently work toward your goals. Models habit formation, sustainable improvement, and compounding benefits.',
    assumptionsOverrides: {
      // Improved path has better sustainability and lower regression
      improvementSustainability: 0.8,
      regressionToMean: 0.2,
      improvedPathImprovementRate: 0.15,
    },
  },
} as const

// ============================================================================
// Assumption Merging
// ============================================================================

/**
 * Merge user-provided assumptions with defaults and scenario-specific overrides
 * Priority: custom assumptions > scenario-specific overrides > defaults
 */
export function buildScenarioAssumptions(
  baseAssumptions: Partial<ScenarioAssumptions> = {},
  scenarioType: 'current_path' | 'improved_path'
): ScenarioAssumptions {
  const scenarioConfig = SCENARIO_CONFIGS[scenarioType]

  return {
    ...DEFAULT_ASSUMPTIONS,
    ...scenarioConfig.assumptionsOverrides,
    ...baseAssumptions,
  }
}

// ============================================================================
// Scenario Generation
// ============================================================================

/**
 * Generate a complete scenario with both horizons
 */
export function generateScenario(
  profile: UserBehavioralProfile,
  goals: UserGoals,
  assumptions: ScenarioAssumptions,
  scenarioType: 'current_path' | 'improved_path',
  categoryCount: number,
  socialHabitsCount: number,
  dataQuality: ReturnType<typeof import('./calculations.js').assessDataQuality>
): Scenario {
  const scenarioConfig = SCENARIO_CONFIGS[scenarioType]

  // Generate projections for both horizons
  const projection6Months = generateProjection(
    profile,
    goals,
    assumptions,
    scenarioType,
    6,
    categoryCount,
    socialHabitsCount
  )

  const projection5Years = generateProjection(
    profile,
    goals,
    assumptions,
    scenarioType,
    60,
    categoryCount,
    socialHabitsCount
  )

  // Add scenario-specific notes to uncertainty
  const addScenarioNote = (proj: ProjectionResult, horizonMonths: number) => {
    const uncertainty = calculateUncertaintyRange(
      proj.health.overallHealthIndex,
      horizonMonths,
      assumptions,
      { hasSufficientData: dataQuality.hasSufficientData, daysOfHistory: dataQuality.daysOfHistory }
    )

    if (!dataQuality.hasSufficientData) {
      uncertainty.note = `[${scenarioConfig.label}] ${uncertainty.note} This is an illustrative simulation based on behavioral science defaults.`
    }

    return { ...proj, uncertainty }
  }

  return {
    type: scenarioType,
    label: scenarioConfig.label,
    description: scenarioConfig.description,
    assumptions,
    projections: {
      '6_months': addScenarioNote(projection6Months, 6),
      '5_years': addScenarioNote(projection5Years, 60),
    },
    dataQuality,
  }
}

/**
 * Generate both scenarios (current and improved)
 */
export function generateBothScenarios(
  profile: UserBehavioralProfile,
  goals: UserGoals,
  baseAssumptions: Partial<ScenarioAssumptions> = {},
  categoryCount: number,
  socialHabitsCount: number,
  minimumDaysForPersonalized: number = 14
): { currentPath: Scenario; improvedPath: Scenario } {
  // Assess data quality once
  const dataQuality = {
    hasSufficientData: profile.daysOfData >= minimumDaysForPersonalized && profile.hasSufficientData,
    daysOfHistory: profile.daysOfData,
    minimumDaysRequired: minimumDaysForPersonalized,
    isIllustrative: profile.daysOfData < minimumDaysForPersonalized || !profile.hasSufficientData,
    missingCategories: [],
    confidenceImpact: profile.daysOfData < minimumDaysForPersonalized ? 30 : 0,
  }

  // Build assumptions for each scenario
  const currentAssumptions = buildScenarioAssumptions(baseAssumptions, 'current_path')
  const improvedAssumptions = buildScenarioAssumptions(baseAssumptions, 'improved_path')

  // Generate scenarios
  const currentPath = generateScenario(
    profile,
    goals,
    currentAssumptions,
    'current_path',
    categoryCount,
    socialHabitsCount,
    dataQuality
  )

  const improvedPath = generateScenario(
    profile,
    goals,
    improvedAssumptions,
    'improved_path',
    categoryCount,
    socialHabitsCount,
    dataQuality
  )

  return { currentPath, improvedPath }
}

// ============================================================================
// Comparative Analysis
// ============================================================================

/**
 * Generate comparative analysis between current and improved paths
 */
export function generateComparativeAnalysis(
  currentPath: Scenario,
  improvedPath: Scenario
) {
  const current6m = currentPath.projections['6_months']
  const improved6m = improvedPath.projections['6_months']
  const current5y = currentPath.projections['5_years']
  const improved5y = improvedPath.projections['5_years']

  // Calculate improvements at 6 months (primary comparison horizon)
  const healthImprovement = Math.round(improved6m.health.overallHealthIndex - current6m.health.overallHealthIndex)
  const academicImprovement = Math.round(
    (improved6m.academic.consistencyScore + improved6m.academic.knowledgeRetention) / 2
    - (current6m.academic.consistencyScore + current6m.academic.knowledgeRetention) / 2
  )
  const digitalImprovement = Math.round(improved6m.digitalWellbeing.focusCapacity - current6m.digitalWellbeing.focusCapacity)
  const financialImprovement = Math.round(
    improved6m.financial.emergencyFundMonths - current6m.financial.emergencyFundMonths
  )
  const personalImprovement = Math.round(improved6m.personalDevelopment.lifeSatisfactionIndex - current6m.personalDevelopment.lifeSatisfactionIndex)

  const overallImprovement = Math.round(
    (healthImprovement + academicImprovement + digitalImprovement + financialImprovement + personalImprovement) / 5
  )

  // Estimate time to break even (when improved path exceeds current path significantly)
  const timeToBreakEven = estimateBreakEven(currentPath, improvedPath)

  // Identify key leverage points
  const keyLeveragePoints = identifyLeveragePoints(current6m, improved6m)

  return {
    healthImprovement,
    academicImprovement,
    digitalWellbeingImprovement: digitalImprovement,
    financialImprovement,
    personalDevelopmentImprovement: personalImprovement,
    overallImprovement,
    timeToBreakEven,
    keyLeveragePoints,
  }
}

/**
 * Estimate when improved path becomes meaningfully better
 */
function estimateBreakEven(currentPath: Scenario, improvedPath: Scenario): string {
  // Simple heuristic: check 6-month projection
  const current6m = currentPath.projections['6_months']
  const improved6m = improvedPath.projections['6_months']

  const currentHealth = current6m.health.overallHealthIndex
  const improvedHealth = improved6m.health.overallHealthIndex

  if (improvedHealth <= currentHealth) return '6+ months'
  if (improvedHealth - currentHealth > 15) return '1-2 months'
  if (improvedHealth - currentHealth > 8) return '3 months'
  return '4-5 months'
}

/**
 * Identify key leverage points for improvement
 */
function identifyLeveragePoints(
  current: ProjectionResult,
  improved: ProjectionResult
): string[] {
  const points: string[] = []

  // Health leverage
  if (improved.health.sleepScore - current.health.sleepScore > 15) {
    points.push('Improving sleep consistency yields the highest health returns')
  }
  if (improved.health.exerciseScore - current.health.exerciseScore > 15) {
    points.push('Regular exercise compounds cardiovascular benefits over time')
  }

  // Academic leverage
  if (improved.academic.consistencyScore - current.academic.consistencyScore > 15) {
    points.push('Consistent study habits accelerate skill acquisition exponentially')
  }

  // Digital wellbeing leverage
  if (improved.digitalWellbeing.focusCapacity - current.digitalWellbeing.focusCapacity > 15) {
    points.push('Reducing screen time improves focus capacity across all domains')
  }

  // Financial leverage
  if (improved.financial.emergencyFundMonths - current.financial.emergencyFundMonths > 2) {
    points.push('Small spending reductions build financial resilience quickly')
  }

  // Personal development leverage
  if (improved.personalDevelopment.habitDiversityScore - current.personalDevelopment.habitDiversityScore > 15) {
    points.push('Adding diverse habit categories creates positive ripple effects')
  }

  // Default if no strong leverage points
  if (points.length === 0) {
    points.push('Consistent small improvements across all areas compound over time')
  }

  return points.slice(0, 4) // Limit to top 4
}

// ============================================================================
// Scenario Metadata
// ============================================================================

/**
 * Get scenario display metadata for UI
 */
export function getScenarioMetadata(scenario: Scenario) {
  return {
    type: scenario.type,
    label: scenario.label,
    description: scenario.description,
    isIllustrative: scenario.dataQuality.isIllustrative,
    dataQuality: {
      daysOfHistory: scenario.dataQuality.daysOfHistory,
      minimumDaysRequired: scenario.dataQuality.minimumDaysRequired,
      hasSufficientData: scenario.dataQuality.hasSufficientData,
    },
    keyAssumptions: {
      habitFormationRate: scenario.assumptions.habitFormationRate,
      improvementSustainability: scenario.assumptions.improvementSustainability,
      regressionToMean: scenario.assumptions.regressionToMean,
    },
  }
}