/**
 * Core types for the Future You Prediction Engine
 *
 * This module provides a self-contained prediction engine that analyzes
 * historical behavioral data to generate future scenarios.
 *
 * Key principles:
 * - No external AI dependencies
 * - Transparent, explainable calculations
 * - Reasonable limits and uncertainty ranges
 * - Clear distinction between personalized predictions and illustrative simulations
 */

// ============================================================================
// Input Data Types
// ============================================================================

/** Daily metrics derived from habit logs */
export interface DailyMetrics {
  date: string
  sleepHours: number
  studyHours: number
  screenTimeHours: number
  exerciseMinutes: number
  spending: number
  habitCompletionRate: number
  consistencyScore: number
}

/** Aggregated user behavioral profile */
export interface UserBehavioralProfile {
  userId: string
  period: { start: string; end: string }
  daysOfData: number
  averages: {
    sleepHours: number
    studyHours: number
    screenTimeHours: number
    exerciseMinutes: number
    spending: number
    habitCompletionRate: number
    consistencyScore: number
  }
  trends: {
    sleep: TrendDirection
    study: TrendDirection
    screenTime: TrendDirection
    exercise: TrendDirection
    spending: TrendDirection
    completion: TrendDirection
  }
  categoryBreakdown: Record<string, CategoryMetrics>
  hasSufficientData: boolean
}

export interface CategoryMetrics {
  habitCount: number
  completionRate: number
  consistencyRate: number
  averageValue: number
}

export type TrendDirection = 'improving' | 'stable' | 'declining' | 'insufficient_data'

/** Habit with logs for prediction engine input */
export interface HabitWithLogs {
  id: string
  name: string
  category: string
  frequency: 'daily' | 'weekly' | 'custom'
  targetValue: number
  unit: string
  color: string
  icon: string
  logs: HabitLog[]
}

export interface HabitLog {
  id: string
  habitId: string
  logDate: string
  actualValue: number
  notes?: string
  createdAt: string
}

/** User profile with goals */
export interface UserProfile {
  id: string
  sleepGoal?: number
  studyGoal?: number
  screenTimeGoal?: number
  exerciseGoal?: number
  monthlyBudget?: number
  completionGoal?: number
}

/** User goals for scenario generation */
export interface UserGoals {
  targetSleepHours?: number
  targetStudyHours?: number
  targetScreenTimeHours?: number
  targetExerciseMinutes?: number
  targetMonthlySpending?: number
  targetCompletionRate?: number
}

// ============================================================================
// Scenario Types
// ============================================================================

export type ScenarioType = 'current_path' | 'improved_path'
export type ProjectionHorizon = '6_months' | '5_years'

export interface ScenarioAssumptions {
  // Behavioral assumptions
  habitFormationRate: number // months to form habit
  habitDecayRate: number // monthly decay without reinforcement
  improvementSustainability: number // 0-1, how well improvements stick
  regressionToMean: number // 0-1, tendency to revert to baseline

  // Biological/behavioral limits
  maxSleepHours: number
  minSleepHours: number
  maxStudyHours: number
  maxScreenTimeHours: number
  maxExerciseMinutes: number

  // Financial assumptions
  monthlyIncome?: number
  savingsRate: number
  investmentReturn: number
  inflationRate: number

  // Uncertainty
  baseUncertainty: number // 0-1
  uncertaintyGrowthPerYear: number // 0-1

  // Scenario-specific
  improvedPathImprovementRate: number // % improvement per month initially
}

export const DEFAULT_ASSUMPTIONS: ScenarioAssumptions = {
  habitFormationRate: 3,
  habitDecayRate: 0.05,
  improvementSustainability: 0.7,
  regressionToMean: 0.3,
  maxSleepHours: 10,
  minSleepHours: 4,
  maxStudyHours: 12,
  maxScreenTimeHours: 16,
  maxExerciseMinutes: 180,
  savingsRate: 0.2,
  investmentReturn: 0.07,
  inflationRate: 0.03,
  baseUncertainty: 0.15,
  uncertaintyGrowthPerYear: 0.08,
  improvedPathImprovementRate: 0.15,
}

// ============================================================================
// Output Types
// ============================================================================

export interface ProjectionResult {
  horizon: ProjectionHorizon
  health: HealthIndicators
  academic: AcademicIndicators
  digitalWellbeing: DigitalWellbeingIndicators
  financial: FinancialIndicators
  personalDevelopment: PersonalDevelopmentIndicators
  uncertainty: UncertaintyRange
}

export interface HealthIndicators {
  sleepScore: number // 0-100
  exerciseScore: number // 0-100
  overallHealthIndex: number // 0-100
  projectedSleepHours: number
  projectedExerciseMinutes: number
  cardiovascularRisk: 'low' | 'moderate' | 'high'
  energyLevel: 'low' | 'moderate' | 'high'
}

export interface AcademicIndicators {
  consistencyScore: number // 0-100
  projectedStudyHours: number
  skillAcquisitionRate: number // relative to baseline
  knowledgeRetention: number // 0-100
  projectedCredentials: number // estimated certifications/degrees
}

export interface DigitalWellbeingIndicators {
  screenTimeScore: number // 0-100
  focusCapacity: number // 0-100
  projectedScreenTimeHours: number
  digitalFatigueRisk: 'low' | 'moderate' | 'high'
  attentionSpan: 'short' | 'moderate' | 'long'
}

export interface FinancialIndicators {
  projectedMonthlySpending: number
  projectedSavings: number
  projectedNetWorth: number
  financialStressLevel: 'low' | 'moderate' | 'high'
  emergencyFundMonths: number
  investmentGrowth: number
}

export interface PersonalDevelopmentIndicators {
  habitDiversityScore: number // 0-100
  socialConnectionScore: number // 0-100
  projectedActiveHabits: number
  lifeSatisfactionIndex: number // 0-100
  resilienceScore: number // 0-100
}

export interface UncertaintyRange {
  confidenceLevel: number // 0-100
  lowEstimate: number
  highEstimate: number
  note: string
}

export interface Scenario {
  type: ScenarioType
  label: string
  description: string
  assumptions: ScenarioAssumptions
  projections: {
    '6_months': ProjectionResult
    '5_years': ProjectionResult
  }
  dataQuality: DataQualityAssessment
}

export interface DataQualityAssessment {
  hasSufficientData: boolean
  daysOfHistory: number
  minimumDaysRequired: number
  isIllustrative: boolean
  missingCategories: string[]
  confidenceImpact: number // 0-100 reduction
}

export interface PredictionOutput {
  generatedAt: string
  userId: string
  currentPath: Scenario
  improvedPath: Scenario
  comparativeAnalysis: ComparativeAnalysis
  meta: {
    engineVersion: string
    assumptionsUsed: ScenarioAssumptions
    dataPeriod: { start: string; end: string }
    warnings: string[]
  }
}

export interface ComparativeAnalysis {
  healthImprovement: number // percentage points
  academicImprovement: number
  digitalWellbeingImprovement: number
  financialImprovement: number
  personalDevelopmentImprovement: number
  overallImprovement: number
  timeToBreakEven: string // e.g., "3 months"
  keyLeveragePoints: string[]
}

// ============================================================================
// Configuration Types
// ============================================================================

export interface PredictionEngineConfig {
  assumptions?: Partial<ScenarioAssumptions>
  minimumDaysForPersonalized?: number
  enableIllustrativeMode?: boolean
  customCategoryMapping?: Record<string, string[]>
}

// ============================================================================
// What-If Simulation Types (for reusability)
// ============================================================================

export interface WhatIfScenario {
  id: string
  name: string
  description: string
  changes: BehaviorChange[]
  baseProfile: UserBehavioralProfile
  assumptions: Partial<ScenarioAssumptions>
}

export interface BehaviorChange {
  metric: keyof UserBehavioralProfile['averages']
  targetValue: number
  timelineMonths: number
  difficulty: 'easy' | 'moderate' | 'hard'
}

export interface WhatIfResult {
  scenario: WhatIfScenario
  projections: {
    '6_months': ProjectionResult
    '5_years': ProjectionResult
  }
  comparativeToBaseline: ComparativeAnalysis
  feasibilityScore: number // 0-100
}