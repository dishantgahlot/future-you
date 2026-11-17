/**
 * What-If Simulator - Reusable scenario testing for the What If feature
 *
 * Allows testing hypothetical behavior changes against the baseline profile
 * to show users the projected impact of specific habit modifications.
 */

import type {
  UserBehavioralProfile,
  UserGoals,
  ScenarioAssumptions,
  ProjectionResult,
  WhatIfScenario,
  WhatIfResult,
  BehaviorChange,
  ComparativeAnalysis,
} from './types.js'
import { DEFAULT_ASSUMPTIONS } from './types.js'
import { calculateProjection, resolveTargets } from './projectionCalculator.js'
import { generateScenario, generateComparativeAnalysis, buildScenarioAssumptions } from './scenarioGenerator.js'

// ============================================================================
// Difficulty Estimation
// ============================================================================

/**
 * Estimate difficulty of a behavior change based on current vs target
 */
export function estimateChangeDifficulty(
  currentValue: number,
  targetValue: number,
  metricType: keyof UserBehavioralProfile['averages']
): 'easy' | 'moderate' | 'hard' {
  const relativeChange = Math.abs(targetValue - currentValue) / Math.max(currentValue, 0.1)

  // Metric-specific difficulty thresholds
  const thresholds: Record<string, { easy: number; moderate: number }> = {
    sleepHours: { easy: 0.15, moderate: 0.35 }, // Increased moderate threshold
    studyHours: { easy: 0.3, moderate: 0.6 },
    screenTimeHours: { easy: 0.2, moderate: 0.4 }, // Reducing is harder
    exerciseMinutes: { easy: 0.25, moderate: 0.5 },
    spending: { easy: 0.15, moderate: 0.3 },
    habitCompletionRate: { easy: 0.2, moderate: 0.4 },
    consistencyScore: { easy: 0.2, moderate: 0.4 },
  }

  const metricThresholds = thresholds[metricType] || { easy: 0.2, moderate: 0.4 }

  if (relativeChange <= metricThresholds.easy) return 'easy'
  if (relativeChange <= metricThresholds.moderate) return 'moderate'
  return 'hard'
}

/**
 * Estimate timeline to achieve a behavior change
 */
export function estimateTimelineMonths(
  currentValue: number,
  targetValue: number,
  metricType: keyof UserBehavioralProfile['averages'],
  difficulty: 'easy' | 'moderate' | 'hard'
): number {
  const baseMonths: Record<string, number> = {
    sleepHours: 2,
    studyHours: 3,
    screenTimeHours: 3,
    exerciseMinutes: 3,
    spending: 1,
    habitCompletionRate: 3,
    consistencyScore: 4,
  }

  const difficultyMultiplier = { easy: 1, moderate: 2, hard: 4 }
  const relativeChange = Math.abs(targetValue - currentValue) / Math.max(currentValue, 0.1)

  // Scale with relative change but ensure minimum 1x (so easy changes get at least baseMonths)
  // For 20% change: factor = 1.0, for 100% change: factor = 5.0
  const changeFactor = Math.max(1, relativeChange * 5)

  return Math.ceil(
    baseMonths[metricType] * difficultyMultiplier[difficulty] * changeFactor
  )
}

// ============================================================================
// Predefined What-If Scenarios
// ============================================================================

export const PREDEFINED_SCENARIOS: Omit<WhatIfScenario, 'baseProfile' | 'assumptions'>[] = [
  {
    id: 'better_sleep',
    name: 'Prioritize Sleep',
    description: 'Increase sleep to 8 hours/night consistently',
    changes: [
      { metric: 'sleepHours', targetValue: 8, timelineMonths: 2, difficulty: 'moderate' },
      { metric: 'screenTimeHours', targetValue: 3, timelineMonths: 3, difficulty: 'moderate' },
    ],
  },
  {
    id: 'study_habit',
    name: 'Build Study Habit',
    description: 'Establish consistent 2-hour daily study routine',
    changes: [
      { metric: 'studyHours', targetValue: 2, timelineMonths: 3, difficulty: 'moderate' },
      { metric: 'habitCompletionRate', targetValue: 80, timelineMonths: 4, difficulty: 'moderate' },
    ],
  },
  {
    id: 'digital_detox',
    name: 'Digital Detox',
    description: 'Reduce screen time to under 3 hours/day',
    changes: [
      { metric: 'screenTimeHours', targetValue: 2.5, timelineMonths: 2, difficulty: 'hard' },
      { metric: 'habitCompletionRate', targetValue: 75, timelineMonths: 3, difficulty: 'moderate' },
    ],
  },
  {
    id: 'exercise_routine',
    name: 'Exercise Routine',
    description: 'Build consistent 30-min daily exercise habit',
    changes: [
      { metric: 'exerciseMinutes', targetValue: 30, timelineMonths: 3, difficulty: 'moderate' },
      { metric: 'consistencyScore', targetValue: 70, timelineMonths: 4, difficulty: 'moderate' },
    ],
  },
  {
    id: 'financial_discipline',
    name: 'Financial Discipline',
    description: 'Reduce spending by 20% and increase savings',
    changes: [
      { metric: 'spending', targetValue: 40, timelineMonths: 2, difficulty: 'moderate' },
      { metric: 'habitCompletionRate', targetValue: 70, timelineMonths: 3, difficulty: 'easy' },
    ],
  },
  {
    id: 'holistic_improvement',
    name: 'Holistic Improvement',
    description: 'Balanced improvement across all life domains',
    changes: [
      { metric: 'sleepHours', targetValue: 7.5, timelineMonths: 2, difficulty: 'moderate' },
      { metric: 'studyHours', targetValue: 2, timelineMonths: 3, difficulty: 'moderate' },
      { metric: 'screenTimeHours', targetValue: 3, timelineMonths: 3, difficulty: 'moderate' },
      { metric: 'exerciseMinutes', targetValue: 25, timelineMonths: 3, difficulty: 'moderate' },
      { metric: 'habitCompletionRate', targetValue: 75, timelineMonths: 4, difficulty: 'moderate' },
    ],
  },
]

// ============================================================================
// Scenario Application
// ============================================================================

/**
 * Apply behavior changes to a profile to create a modified profile
 */
export function applyBehaviorChanges(
  profile: UserBehavioralProfile,
  changes: BehaviorChange[],
  assumptions: ScenarioAssumptions
): UserBehavioralProfile {
  const modifiedAverages = { ...profile.averages }

  for (const change of changes) {
    const currentValue = modifiedAverages[change.metric]
    const targetValue = change.targetValue

    // Project forward to the timeline
    const months = change.timelineMonths
    const projectedValue = projectMetricValue(
      currentValue,
      targetValue,
      months,
      assumptions,
      'improved_path',
      change.metric
    )

    modifiedAverages[change.metric] = projectedValue
  }

  // Recalculate consistency based on completion changes
  if (changes.some(c => c.metric === 'habitCompletionRate')) {
    const completionChange = changes.find(c => c.metric === 'habitCompletionRate')!
    const completionImprovement = completionChange.targetValue - profile.averages.habitCompletionRate
    modifiedAverages.consistencyScore = Math.min(100,
      profile.averages.consistencyScore + completionImprovement * 0.4
    )
  }

  return {
    ...profile,
    averages: modifiedAverages,
    hasSufficientData: true, // What-if assumes we're testing from a baseline
  }
}

/**
 * Simplified metric projection for what-if (uses improved path logic)
 */
function projectMetricValue(
  currentValue: number,
  targetValue: number,
  months: number,
  assumptions: ScenarioAssumptions,
  scenarioType: 'current_path' | 'improved_path',
  metricType: keyof UserBehavioralProfile['averages']
): number {
  // Reuse the calculation logic from calculations.ts
  const limits = getMetricLimits(metricType, assumptions)
  const lowerIsBetter = metricType === 'screenTimeHours' || metricType === 'spending'

  if (scenarioType === 'improved_path') {
    const maxImprovement = lowerIsBetter ? currentValue - targetValue : targetValue - currentValue
    if (maxImprovement <= 0) return clamp(currentValue, limits.min, limits.max)

    const monthlyRate = assumptions.improvedPathImprovementRate
    const sustainability = assumptions.improvementSustainability

    const improvementFactor = Math.log(1 + months * monthlyRate)
      / Math.log(1 + months * monthlyRate / sustainability)
    const projected = lowerIsBetter
      ? currentValue - maxImprovement * Math.min(1, improvementFactor)
      : currentValue + maxImprovement * Math.min(1, improvementFactor)

    return clamp(projected, limits.min, limits.max)
  }

  return clamp(currentValue, limits.min, limits.max)
}

function getMetricLimits(
  metricType: keyof UserBehavioralProfile['averages'],
  assumptions: ScenarioAssumptions
): { min: number; max: number } {
  const limitsMap: Record<string, { min: number; max: number }> = {
    sleepHours: { min: assumptions.minSleepHours, max: assumptions.maxSleepHours },
    studyHours: { min: 0, max: assumptions.maxStudyHours },
    screenTimeHours: { min: 0, max: assumptions.maxScreenTimeHours },
    exerciseMinutes: { min: 0, max: assumptions.maxExerciseMinutes },
    spending: { min: 0, max: Infinity },
    habitCompletionRate: { min: 0, max: 100 },
    consistencyScore: { min: 0, max: 100 },
  }
  return limitsMap[metricType] || { min: 0, max: Infinity }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

// ============================================================================
// What-If Simulation
// ============================================================================

/**
 * Run a what-if simulation
 */
export function runWhatIfSimulation(
  scenario: WhatIfScenario
): WhatIfResult {
  const { baseProfile, changes, assumptions: customAssumptions = {} } = scenario

  // Build assumptions
  const assumptions = buildScenarioAssumptions(customAssumptions, 'improved_path')

  // Apply changes to create modified profile
  const modifiedProfile = applyBehaviorChanges(baseProfile, changes, assumptions)

  // Resolve goals (use current targets as baseline, modified as goals)
  const goals: UserGoals = {
    targetSleepHours: modifiedProfile.averages.sleepHours,
    targetStudyHours: modifiedProfile.averages.studyHours,
    targetScreenTimeHours: modifiedProfile.averages.screenTimeHours,
    targetExerciseMinutes: modifiedProfile.averages.exerciseMinutes,
    targetMonthlySpending: modifiedProfile.averages.spending * 30.44,
    targetCompletionRate: modifiedProfile.averages.habitCompletionRate,
  }

  // Calculate projections for both horizons
  const projection6m = calculateProjection(
    modifiedProfile,
    goals,
    assumptions,
    'improved_path',
    '6_months',
    5, // Default category count
    1  // Default social habits
  )

  const projection5y = calculateProjection(
    modifiedProfile,
    goals,
    assumptions,
    'improved_path',
    '5_years',
    5,
    1
  )

  // Generate comparative analysis vs baseline
  const baselineProjection6m = calculateProjection(
    baseProfile,
    goals,
    assumptions,
    'improved_path',
    '6_months',
    5,
    1
  )

  const baselineScenario = generateScenario(
    baseProfile,
    goals,
    assumptions,
    'improved_path',
    5,
    1,
    { hasSufficientData: true, daysOfHistory: baseProfile.daysOfData, minimumDaysRequired: 14, isIllustrative: false, missingCategories: [], confidenceImpact: 0 }
  )

  const modifiedScenario = generateScenario(
    modifiedProfile,
    goals,
    assumptions,
    'improved_path',
    5,
    1,
    { hasSufficientData: true, daysOfHistory: baseProfile.daysOfData, minimumDaysRequired: 14, isIllustrative: false, missingCategories: [], confidenceImpact: 0 }
  )

  const comparativeToBaseline = generateComparativeAnalysis(
    baselineScenario,
    modifiedScenario
  )

  // Calculate feasibility score
  const feasibilityScore = calculateFeasibilityScore(changes)

  return {
    scenario,
    projections: {
      '6_months': projection6m,
      '5_years': projection5y,
    },
    comparativeToBaseline,
    feasibilityScore,
  }
}

/**
 * Calculate feasibility score for a set of changes
 */
function calculateFeasibilityScore(changes: BehaviorChange[]): number {
  if (changes.length === 0) return 100

  const difficultyScores = { easy: 90, moderate: 65, hard: 35 }
  const totalScore = changes.reduce((sum, change) =>
    sum + difficultyScores[change.difficulty], 0
  )

  // Penalize too many simultaneous changes
  const changeCountPenalty = Math.max(0, (changes.length - 3) * 10)

  return Math.max(0, Math.min(100, Math.round(totalScore / changes.length) - changeCountPenalty))
}

// ============================================================================
// What-If Helpers
// ============================================================================

/**
 * Create a what-if scenario from user selections
 */
export function createWhatIfScenario(
  baseProfile: UserBehavioralProfile,
  selectedChanges: Array<{
    metric: keyof UserBehavioralProfile['averages']
    targetValue: number
  }>,
  customAssumptions?: Partial<ScenarioAssumptions>
): WhatIfScenario {
  const changes: BehaviorChange[] = selectedChanges.map(({ metric, targetValue }) => {
    const currentValue = baseProfile.averages[metric]
    const difficulty = estimateChangeDifficulty(currentValue, targetValue, metric)
    const timelineMonths = estimateTimelineMonths(currentValue, targetValue, metric, difficulty)

    return {
      metric,
      targetValue,
      timelineMonths,
      difficulty,
    }
  })

  return {
    id: `custom_${Date.now()}`,
    name: 'Custom Scenario',
    description: `Custom what-if with ${changes.length} change${changes.length !== 1 ? 's' : ''}`,
    changes,
    baseProfile,
    assumptions: customAssumptions || {},
  }
}

/**
 * Get available predefined scenarios
 */
export function getPredefinedScenarios(): typeof PREDEFINED_SCENARIOS {
  return PREDEFINED_SCENARIOS
}

/**
 * Run predefined scenario by ID
 */
export function runPredefinedScenario(
  scenarioId: string,
  baseProfile: UserBehavioralProfile,
  customAssumptions?: Partial<ScenarioAssumptions>
): WhatIfResult | null {
  const predefined = PREDEFINED_SCENARIOS.find(s => s.id === scenarioId)
  if (!predefined) return null

  const scenario = createWhatIfScenario(baseProfile, predefined.changes, customAssumptions)
  scenario.name = predefined.name
  scenario.description = predefined.description
  scenario.id = predefined.id

  return runWhatIfSimulation(scenario)
}

/**
 * Format what-if results for display
 */
export function formatWhatIfResult(result: WhatIfResult): {
  summary: string
  keyImprovements: string[]
  tradeoffs: string[]
  feasibility: string
  recommendation: string
} {
  const { scenario, projections, comparativeToBaseline, feasibilityScore } = result

  const improvements: string[] = []
  const tradeoffs: string[] = []

  // Health
  if (comparativeToBaseline.healthImprovement > 5) {
    improvements.push(`Health +${comparativeToBaseline.healthImprovement} pts`)
  }

  // Academic
  if (comparativeToBaseline.academicImprovement > 5) {
    improvements.push(`Academic +${comparativeToBaseline.academicImprovement} pts`)
  }

  // Digital
  if (comparativeToBaseline.digitalWellbeingImprovement > 5) {
    improvements.push(`Focus +${comparativeToBaseline.digitalWellbeingImprovement} pts`)
  }

  // Financial
  if (comparativeToBaseline.financialImprovement > 0) {
    improvements.push(`Emergency fund +${comparativeToBaseline.financialImprovement} months`)
  }

  // Personal
  if (comparativeToBaseline.personalDevelopmentImprovement > 5) {
    improvements.push(`Life satisfaction +${comparativeToBaseline.personalDevelopmentImprovement} pts`)
  }

  // Tradeoffs (things that get worse or require effort)
  for (const change of scenario.changes) {
    if (change.difficulty === 'hard') {
      tradeoffs.push(`${change.metric}: ${change.difficulty} difficulty (${change.timelineMonths} months)`)
    }
  }

  const feasibility = feasibilityScore >= 70 ? 'High' : feasibilityScore >= 40 ? 'Moderate' : 'Low'

  let recommendation = ''
  if (feasibilityScore >= 70 && comparativeToBaseline.overallImprovement > 10) {
    recommendation = 'Highly recommended - strong improvements with feasible changes'
  } else if (feasibilityScore >= 40 && comparativeToBaseline.overallImprovement > 5) {
    recommendation = 'Recommended - meaningful improvements with moderate effort'
  } else if (comparativeToBaseline.overallImprovement > 0) {
    recommendation = 'Consider starting with 1-2 easier changes first'
  } else {
    recommendation = 'Changes may not yield significant improvements - review targets'
  }

  return {
    summary: `${scenario.name}: ${comparativeToBaseline.overallImprovement > 0 ? '+' : ''}${comparativeToBaseline.overallImprovement} overall improvement at 6 months`,
    keyImprovements: improvements,
    tradeoffs,
    feasibility,
    recommendation,
  }
}