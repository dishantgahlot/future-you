/**
 * Core calculation functions for the Prediction Engine
 *
 * All calculations are pure functions with no external dependencies.
 * Each function is documented with its assumptions and limitations.
 */

import type {
  DailyMetrics,
  UserBehavioralProfile,
  UserGoals,
  ScenarioAssumptions,
  ProjectionResult,
  HealthIndicators,
  AcademicIndicators,
  DigitalWellbeingIndicators,
  FinancialIndicators,
  PersonalDevelopmentIndicators,
  UncertaintyRange,
  TrendDirection,
} from './types.js'
import { DEFAULT_ASSUMPTIONS } from './types.js'

// ============================================================================
// Constants
// ============================================================================

const MONTHS_IN_6_MONTHS = 6
const MONTHS_IN_5_YEARS = 60
const DAYS_IN_MONTH = 30.44

// Scoring weights (sum to 1.0 for each category)
const HEALTH_WEIGHTS = {
  sleep: 0.6,
  exercise: 0.4,
} as const

const ACADEMIC_WEIGHTS = {
  consistency: 0.4,
  studyHours: 0.3,
  retention: 0.3,
} as const

const DIGITAL_WEIGHTS = {
  screenTime: 0.5,
  focusCapacity: 0.5,
} as const

const FINANCIAL_WEIGHTS = {
  spendingControl: 0.4,
  savingsRate: 0.3,
  emergencyFund: 0.3,
} as const

const PERSONAL_WEIGHTS = {
  habitDiversity: 0.35,
  socialConnection: 0.35,
  resilience: 0.3,
} as const

// ============================================================================
// Behavioral Profile Calculation
// ============================================================================

/**
 * Calculate user behavioral profile from daily metrics
 */
export function calculateBehavioralProfile(
  dailyMetrics: DailyMetrics[],
  userGoals?: UserGoals
): UserBehavioralProfile {
  const validMetrics = dailyMetrics.filter(m =>
    m.sleepHours > 0 || m.studyHours > 0 || m.screenTimeHours > 0 ||
    m.exerciseMinutes > 0 || m.spending >= 0
  )

  const daysOfData = validMetrics.length
  const startDate = validMetrics[0]?.date || new Date().toISOString().split('T')[0]
  const endDate = validMetrics[validMetrics.length - 1]?.date || new Date().toISOString().split('T')[0]

  // Calculate averages
  const sum = validMetrics.reduce((acc, m) => ({
    sleepHours: acc.sleepHours + m.sleepHours,
    studyHours: acc.studyHours + m.studyHours,
    screenTimeHours: acc.screenTimeHours + m.screenTimeHours,
    exerciseMinutes: acc.exerciseMinutes + m.exerciseMinutes,
    spending: acc.spending + m.spending,
    habitCompletionRate: acc.habitCompletionRate + m.habitCompletionRate,
    consistencyScore: acc.consistencyScore + m.consistencyScore,
  }), {
    sleepHours: 0,
    studyHours: 0,
    screenTimeHours: 0,
    exerciseMinutes: 0,
    spending: 0,
    habitCompletionRate: 0,
    consistencyScore: 0,
  })

  const averages = {
    sleepHours: sum.sleepHours / daysOfData,
    studyHours: sum.studyHours / daysOfData,
    screenTimeHours: sum.screenTimeHours / daysOfData,
    exerciseMinutes: sum.exerciseMinutes / daysOfData,
    spending: sum.spending / daysOfData,
    habitCompletionRate: sum.habitCompletionRate / daysOfData,
    consistencyScore: sum.consistencyScore / daysOfData,
  }

  // Calculate trends (last 30 days vs previous 30 days)
  const trends = calculateTrends(validMetrics)

  // Minimum days for personalized predictions
  const minimumDaysRequired = 14
  const hasSufficientData = daysOfData >= minimumDaysRequired

  return {
    userId: '', // Set by caller
    period: { start: startDate, end: endDate },
    daysOfData,
    averages,
    trends,
    categoryBreakdown: {},
    hasSufficientData,
  }
}

/**
 * Calculate trend direction for each metric
 */
function calculateTrends(metrics: DailyMetrics[]): UserBehavioralProfile['trends'] {
  if (metrics.length < 14) {
    return {
      sleep: 'insufficient_data',
      study: 'insufficient_data',
      screenTime: 'insufficient_data',
      exercise: 'insufficient_data',
      spending: 'insufficient_data',
      completion: 'insufficient_data',
    }
  }

  const midpoint = Math.floor(metrics.length / 2)
  const firstHalf = metrics.slice(0, midpoint)
  const secondHalf = metrics.slice(midpoint)

  const avgFirst = calculateAverages(firstHalf)
  const avgSecond = calculateAverages(secondHalf)

  return {
    sleep: getTrendDirection(avgFirst.sleepHours, avgSecond.sleepHours),
    study: getTrendDirection(avgFirst.studyHours, avgSecond.studyHours),
    screenTime: getTrendDirection(avgFirst.screenTimeHours, avgSecond.screenTimeHours, true), // Lower is better
    exercise: getTrendDirection(avgFirst.exerciseMinutes, avgSecond.exerciseMinutes),
    spending: getTrendDirection(avgFirst.dailySpending, avgSecond.dailySpending, true), // Lower is better
    completion: getTrendDirection(avgFirst.habitCompletionRate, avgSecond.habitCompletionRate),
  }
}

function calculateAverages(metrics: DailyMetrics[]) {
  if (metrics.length === 0) {
    return { sleepHours: 0, studyHours: 0, screenTimeHours: 0, exerciseMinutes: 0, dailySpending: 0, habitCompletionRate: 0 }
  }
  const sum = metrics.reduce((acc, m) => ({
    sleepHours: acc.sleepHours + m.sleepHours,
    studyHours: acc.studyHours + m.studyHours,
    screenTimeHours: acc.screenTimeHours + m.screenTimeHours,
    exerciseMinutes: acc.exerciseMinutes + m.exerciseMinutes,
    dailySpending: acc.dailySpending + m.spending,
    habitCompletionRate: acc.habitCompletionRate + m.habitCompletionRate,
  }), { sleepHours: 0, studyHours: 0, screenTimeHours: 0, exerciseMinutes: 0, dailySpending: 0, habitCompletionRate: 0 })

  return {
    sleepHours: sum.sleepHours / metrics.length,
    studyHours: sum.studyHours / metrics.length,
    screenTimeHours: sum.screenTimeHours / metrics.length,
    exerciseMinutes: sum.exerciseMinutes / metrics.length,
    dailySpending: sum.dailySpending / metrics.length,
    habitCompletionRate: sum.habitCompletionRate / metrics.length,
  }
}

function getTrendDirection(before: number, after: number, lowerIsBetter = false): TrendDirection {
  const change = lowerIsBetter ? (before - after) / Math.max(before, 0.1) : (after - before) / Math.max(before, 0.1)
  if (Math.abs(change) < 0.05) return 'stable'
  return change > 0 ? 'improving' : 'declining'
}

// ============================================================================
// Scenario Value Projection
// ============================================================================

/**
 * Project a metric value over time with scenario-specific logic
 */
export function projectMetricValue(
  currentValue: number,
  targetValue: number,
  months: number,
  assumptions: ScenarioAssumptions,
  scenarioType: 'current_path' | 'improved_path',
  metricType: 'sleep' | 'study' | 'screenTime' | 'exercise' | 'spending' | 'completion'
): number {
  const limits = getMetricLimits(metricType, assumptions)
  const lowerIsBetter = metricType === 'screenTime' || metricType === 'spending'

  if (scenarioType === 'current_path') {
    // Current path: slight regression to mean, natural decay
    const decayFactor = Math.pow(1 - assumptions.habitDecayRate, months)
    const regressionFactor = assumptions.regressionToMean * (1 - decayFactor)

    // Population average baselines (used for regression)
    const populationBaseline = getPopulationBaseline(metricType)

    let projected = currentValue * decayFactor + populationBaseline * regressionFactor

    // Apply trend influence if available (simplified)
    const trendInfluence = getTrendInfluence(metricType, months)
    projected += trendInfluence

    return clamp(projected, limits.min, limits.max)
  } else {
    // Improved path: gradual improvement toward target
    // For "lower is better" metrics, improvement means decreasing towards target
    const maxImprovement = lowerIsBetter ? currentValue - targetValue : targetValue - currentValue
    if (maxImprovement <= 0) return clamp(currentValue, limits.min, limits.max)

    // Improvement follows diminishing returns curve
    const monthlyRate = assumptions.improvedPathImprovementRate
    const sustainability = assumptions.improvementSustainability

    // Logarithmic improvement curve: fast initial gains, slower later
    const improvementFactor = Math.log(1 + months * monthlyRate) / Math.log(1 + months * monthlyRate / sustainability)
    const projected = lowerIsBetter
      ? currentValue - maxImprovement * Math.min(1, improvementFactor)
      : currentValue + maxImprovement * Math.min(1, improvementFactor)

    return clamp(projected, limits.min, limits.max)
  }
}

function getMetricLimits(metricType: string, assumptions: ScenarioAssumptions): { min: number; max: number } {
  switch (metricType) {
    case 'sleep': return { min: assumptions.minSleepHours, max: assumptions.maxSleepHours }
    case 'study': return { min: 0, max: assumptions.maxStudyHours }
    case 'screenTime': return { min: 0, max: assumptions.maxScreenTimeHours }
    case 'exercise': return { min: 0, max: assumptions.maxExerciseMinutes }
    case 'spending': return { min: 0, max: Infinity }
    case 'completion': return { min: 0, max: 100 }
    default: return { min: 0, max: Infinity }
  }
}

function getPopulationBaseline(metricType: string): number {
  // Population averages for regression to mean
  const baselines: Record<string, number> = {
    sleep: 7.0,
    study: 1.5,
    screenTime: 6.5,
    exercise: 20,
    spending: 50,
    completion: 40,
  }
  return baselines[metricType] || 0
}

function getTrendInfluence(metricType: string, months: number): number {
  // Simplified trend influence (in real implementation, would use actual trend data)
  const influences: Record<string, number> = {
    sleep: 0.01,
    study: 0.02,
    screenTime: -0.02,
    exercise: 0.5,
    spending: -0.5,
    completion: 0.5,
  }
  return (influences[metricType] || 0) * months
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

// ============================================================================
// Indicator Calculations
// ============================================================================

/**
 * Calculate health indicators
 */
export function calculateHealthIndicators(
  sleepHours: number,
  exerciseMinutes: number,
  assumptions: ScenarioAssumptions
): HealthIndicators {
  // Sleep score: optimal at 7-9 hours
  const sleepScore = calculateSleepScore(sleepHours)

  // Exercise score: based on WHO guidelines (150 min/week = ~21 min/day)
  const exerciseScore = calculateExerciseScore(exerciseMinutes)

  const overallHealthIndex = Math.round(
    sleepScore * HEALTH_WEIGHTS.sleep + exerciseScore * HEALTH_WEIGHTS.exercise
  )

  // Cardiovascular risk assessment
  let cardiovascularRisk: 'low' | 'moderate' | 'high' = 'low'
  if (sleepHours < 6 || exerciseMinutes < 10) cardiovascularRisk = 'high'
  else if (sleepHours < 7 || exerciseMinutes < 15) cardiovascularRisk = 'moderate'

  // Energy level
  let energyLevel: 'low' | 'moderate' | 'high' = 'moderate'
  if (sleepHours >= 7.5 && exerciseMinutes >= 30) energyLevel = 'high'
  else if (sleepHours < 6 || exerciseMinutes < 10) energyLevel = 'low'

  return {
    sleepScore,
    exerciseScore,
    overallHealthIndex,
    projectedSleepHours: Math.round(sleepHours * 10) / 10,
    projectedExerciseMinutes: Math.round(exerciseMinutes),
    cardiovascularRisk,
    energyLevel,
  }
}

function calculateSleepScore(hours: number): number {
  if (hours >= 7 && hours <= 9) return 100
  if (hours >= 6.5 && hours <= 9.5) return 85
  if (hours >= 6 && hours <= 10) return 70
  if (hours >= 5.5 && hours <= 10.5) return 50
  return Math.max(0, 50 - Math.abs(hours - 7.5) * 10)
}

function calculateExerciseScore(minutes: number): number {
  const weeklyMinutes = minutes * 7
  if (weeklyMinutes >= 150) return 100
  if (weeklyMinutes >= 75) return 75
  if (weeklyMinutes >= 30) return 50
  return Math.max(0, weeklyMinutes / 30 * 50)
}

/**
 * Calculate academic indicators
 */
export function calculateAcademicIndicators(
  studyHours: number,
  completionRate: number,
  consistencyScore: number
): AcademicIndicators {
  // Consistency score (0-100)
  const consistency = Math.min(100, consistencyScore)

  // Study hours score (optimal around 3-4 hours/day)
  const studyScore = Math.min(100, studyHours / 3.5 * 100)

  // Skill acquisition rate (relative to baseline of 1.0)
  const skillAcquisitionRate = Math.min(3, 0.5 + studyHours / 4 + completionRate / 200)

  // Knowledge retention (based on consistency and spacing)
  const knowledgeRetention = Math.min(100, consistency * 0.6 + studyScore * 0.4)

  // Projected credentials (very rough estimate)
  const projectedCredentials = Math.round(studyHours * 365 / 500) // ~500 hours per credential

  return {
    consistencyScore: Math.round(consistency),
    projectedStudyHours: Math.round(studyHours * 10) / 10,
    skillAcquisitionRate: Math.round(skillAcquisitionRate * 100) / 100,
    knowledgeRetention: Math.round(knowledgeRetention),
    projectedCredentials,
  }
}

/**
 * Calculate digital wellbeing indicators
 */
export function calculateDigitalWellbeingIndicators(
  screenTimeHours: number,
  completionRate: number,
  consistencyScore: number
): DigitalWellbeingIndicators {
  // Screen time score (lower is better, optimal < 3 hours)
  let screenTimeScore: number
  if (screenTimeHours <= 2) screenTimeScore = 100
  else if (screenTimeHours <= 4) screenTimeScore = 80
  else if (screenTimeHours <= 6) screenTimeScore = 60
  else if (screenTimeHours <= 8) screenTimeScore = 40
  else screenTimeScore = Math.max(0, 100 - screenTimeHours * 10)

  // Focus capacity (based on low screen time + high completion)
  const focusCapacity = Math.min(100, (100 - screenTimeHours * 8) * 0.5 + completionRate * 0.5)

  // Digital fatigue risk
  let digitalFatigueRisk: 'low' | 'moderate' | 'high' = 'low'
  if (screenTimeHours > 8) digitalFatigueRisk = 'high'
  else if (screenTimeHours > 6) digitalFatigueRisk = 'moderate'

  // Attention span
  let attentionSpan: 'short' | 'moderate' | 'long' = 'moderate'
  if (screenTimeHours < 3 && completionRate > 70) attentionSpan = 'long'
  else if (screenTimeHours > 7 || completionRate < 40) attentionSpan = 'short'

  return {
    screenTimeScore: Math.round(screenTimeScore),
    focusCapacity: Math.round(focusCapacity),
    projectedScreenTimeHours: Math.round(screenTimeHours * 10) / 10,
    digitalFatigueRisk,
    attentionSpan,
  }
}

/**
 * Calculate financial indicators
 */
export function calculateFinancialIndicators(
  dailySpending: number,
  monthlyIncome: number = 3000,
  assumptions: ScenarioAssumptions,
  months: number
): FinancialIndicators {
  const monthlySpending = dailySpending * DAYS_IN_MONTH
  const monthlySavings = monthlyIncome - monthlySpending
  const savingsRate = monthlyIncome > 0 ? monthlySavings / monthlyIncome : 0

  // Project savings with investment returns
  let projectedSavings = 0
  let projectedNetWorth = 0
  const monthlyReturn = Math.pow(1 + assumptions.investmentReturn, 1/12) - 1

  for (let m = 1; m <= months; m++) {
    projectedSavings += monthlySavings
    projectedSavings *= (1 + monthlyReturn)
  }
  projectedNetWorth = projectedSavings // Simplified

  // Financial stress level
  let financialStressLevel: 'low' | 'moderate' | 'high' = 'low'
  if (savingsRate < 0) financialStressLevel = 'high'
  else if (savingsRate < 0.1) financialStressLevel = 'moderate'

  // Emergency fund months
  const emergencyFundMonths = monthlySpending > 0 ? projectedSavings / monthlySpending : 0

  // Investment growth
  const investmentGrowth = projectedSavings - (monthlySavings * months)

  return {
    projectedMonthlySpending: Math.round(monthlySpending),
    projectedSavings: Math.round(projectedSavings),
    projectedNetWorth: Math.round(projectedNetWorth),
    financialStressLevel,
    emergencyFundMonths: Math.round(emergencyFundMonths * 10) / 10,
    investmentGrowth: Math.round(investmentGrowth),
  }
}

/**
 * Calculate personal development indicators
 */
export function calculatePersonalDevelopmentIndicators(
  habitCompletionRate: number,
  consistencyScore: number,
  categoryCount: number,
  socialHabitsCount: number = 0
): PersonalDevelopmentIndicators {
  // Habit diversity score
  const habitDiversityScore = Math.min(100, categoryCount * 12 + habitCompletionRate * 0.3)

  // Social connection score
  const socialConnectionScore = Math.min(100, socialHabitsCount * 25 + consistencyScore * 0.5)

  // Projected active habits
  const projectedActiveHabits = Math.round(categoryCount * (1 + habitCompletionRate / 100))

  // Life satisfaction index (composite)
  const lifeSatisfactionIndex = Math.round(
    habitDiversityScore * PERSONAL_WEIGHTS.habitDiversity +
    socialConnectionScore * PERSONAL_WEIGHTS.socialConnection +
    consistencyScore * PERSONAL_WEIGHTS.resilience
  )

  // Resilience score (ability to bounce back)
  const resilienceScore = Math.min(100, consistencyScore * 0.7 + habitCompletionRate * 0.3)

  return {
    habitDiversityScore: Math.round(habitDiversityScore),
    socialConnectionScore: Math.round(socialConnectionScore),
    projectedActiveHabits,
    lifeSatisfactionIndex: Math.round(lifeSatisfactionIndex),
    resilienceScore: Math.round(resilienceScore),
  }
}

/**
 * Calculate uncertainty range for projections
 */
export function calculateUncertaintyRange(
  baseValue: number,
  months: number,
  assumptions: ScenarioAssumptions,
  dataQuality: { hasSufficientData: boolean; daysOfHistory: number }
): UncertaintyRange {
  const years = months / 12
  const baseUncertainty = assumptions.baseUncertainty + assumptions.uncertaintyGrowthPerYear * years
  const dataPenalty = dataQuality.hasSufficientData ? 0 : 0.2
  const totalUncertainty = Math.min(0.5, baseUncertainty + dataPenalty)

  const confidenceLevel = Math.round((1 - totalUncertainty) * 100)
  const margin = baseValue * totalUncertainty

  let note = ''
  if (!dataQuality.hasSufficientData) {
    note = 'Illustrative simulation - insufficient historical data for personalized prediction. '
  }
  note += `Uncertainty grows with projection horizon (${years.toFixed(1)} years).`

  return {
    confidenceLevel,
    lowEstimate: Math.round(baseValue * (1 - totalUncertainty)),
    highEstimate: Math.round(baseValue * (1 + totalUncertainty)),
    note,
  }
}

// ============================================================================
// Scenario Projection
// ============================================================================

/**
 * Generate a full projection result for a scenario at a given horizon
 */
export function generateProjection(
  profile: UserBehavioralProfile,
  goals: UserGoals | undefined,
  assumptions: ScenarioAssumptions,
  scenarioType: 'current_path' | 'improved_path',
  horizonMonths: number,
  categoryCount: number,
  socialHabitsCount: number
): ProjectionResult {
  const current = profile.averages

  // Determine target values (use goals or sensible defaults)
  const targets = {
    sleepHours: goals?.targetSleepHours ?? 8,
    studyHours: goals?.targetStudyHours ?? 3,
    screenTimeHours: goals?.targetScreenTimeHours ?? 3,
    exerciseMinutes: goals?.targetExerciseMinutes ?? 30,
    spending: goals?.targetMonthlySpending ? goals.targetMonthlySpending / DAYS_IN_MONTH : current.spending * 0.9,
    habitCompletionRate: goals?.targetCompletionRate ?? 80,
  }

  // Project each metric
  const projectedSleep = projectMetricValue(
    current.sleepHours, targets.sleepHours, horizonMonths, assumptions, scenarioType, 'sleep'
  )
  const projectedStudy = projectMetricValue(
    current.studyHours, targets.studyHours, horizonMonths, assumptions, scenarioType, 'study'
  )
  const projectedScreenTime = projectMetricValue(
    current.screenTimeHours, targets.screenTimeHours, horizonMonths, assumptions, scenarioType, 'screenTime'
  )
  const projectedExercise = projectMetricValue(
    current.exerciseMinutes, targets.exerciseMinutes, horizonMonths, assumptions, scenarioType, 'exercise'
  )
  const projectedSpending = projectMetricValue(
    current.spending, targets.spending, horizonMonths, assumptions, scenarioType, 'spending'
  )
  const projectedCompletion = projectMetricValue(
    current.habitCompletionRate, targets.habitCompletionRate, horizonMonths, assumptions, scenarioType, 'completion'
  )

  // Project consistency (improves with completion, decays without)
  const projectedConsistency = scenarioType === 'improved_path'
    ? Math.min(100, current.consistencyScore + (targets.habitCompletionRate - current.habitCompletionRate) * 0.5 * Math.log(1 + horizonMonths / 3))
    : Math.max(0, current.consistencyScore * Math.pow(1 - assumptions.habitDecayRate, horizonMonths / 3))

  // Calculate indicators
  const health = calculateHealthIndicators(projectedSleep, projectedExercise, assumptions)
  const academic = calculateAcademicIndicators(projectedStudy, projectedCompletion, projectedConsistency)
  const digital = calculateDigitalWellbeingIndicators(projectedScreenTime, projectedCompletion, projectedConsistency)
  const financial = calculateFinancialIndicators(projectedSpending, undefined, assumptions, horizonMonths)
  const personal = calculatePersonalDevelopmentIndicators(
    projectedCompletion, projectedConsistency, categoryCount, socialHabitsCount
  )

  // Overall uncertainty (based on health index as representative)
  const uncertainty = calculateUncertaintyRange(
    health.overallHealthIndex,
    horizonMonths,
    assumptions,
    { hasSufficientData: profile.hasSufficientData, daysOfHistory: profile.daysOfData }
  )

  return {
    horizon: horizonMonths === 6 ? '6_months' : '5_years',
    health,
    academic,
    digitalWellbeing: digital,
    financial,
    personalDevelopment: personal,
    uncertainty,
  }
}

// ============================================================================
// Data Quality Assessment
// ============================================================================

export function assessDataQuality(profile: UserBehavioralProfile, minimumDays: number = 14): {
  hasSufficientData: boolean
  daysOfHistory: number
  minimumDaysRequired: number
  isIllustrative: boolean
  missingCategories: string[]
  confidenceImpact: number
} {
  const missingCategories: string[] = []

  // Check for data in key categories
  if (profile.averages.sleepHours === 0) missingCategories.push('sleep')
  if (profile.averages.studyHours === 0) missingCategories.push('study')
  if (profile.averages.exerciseMinutes === 0) missingCategories.push('exercise')
  if (profile.averages.screenTimeHours === 0) missingCategories.push('screen_time')

  const hasSufficientData = profile.daysOfData >= minimumDays && missingCategories.length <= 1
  const confidenceImpact = hasSufficientData ? 0 : Math.min(40, 20 + missingCategories.length * 10)

  return {
    hasSufficientData,
    daysOfHistory: profile.daysOfData,
    minimumDaysRequired: minimumDays,
    isIllustrative: !hasSufficientData,
    missingCategories,
    confidenceImpact,
  }
}