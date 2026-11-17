/**
 * Future You Prediction Engine - Main Entry Point
 *
 * A self-contained TypeScript module for generating future life scenarios
 * based on historical behavioral data. No external AI dependencies.
 *
 * Key Features:
 * - Current Path vs Improved Path scenarios
 * - 6-month and 5-year projection horizons
 * - 5 indicator categories (Health, Academic, Digital, Financial, Personal)
 * - Transparent assumptions with uncertainty ranges
 * - Illustrative mode for insufficient data
 * - Reusable What-If simulator
 */

// Types
export * from './types.js'

// Core Calculations
export * from './calculations.js'

// Profile Builder
export * from './profileBuilder.js'

// Scenario Generator
export * from './scenarioGenerator.js'

// Projection Calculator
export * from './projectionCalculator.js'

// What-If Simulator
export * from './whatIfSimulator.js'

// ============================================================================
// Main Engine Class
// ============================================================================

import type {
  HabitWithLogs,
  UserProfile,
  UserBehavioralProfile,
  UserGoals,
  ScenarioAssumptions,
  PredictionOutput,
  Scenario,
  ProjectionHorizon,
  WhatIfScenario,
  WhatIfResult,
  PredictionEngineConfig,
} from './types.js'
import { DEFAULT_ASSUMPTIONS } from './types.js'

import {
  buildUserBehavioralProfile,
  getDefaultDateRange,
  filterHabitsByDateRange,
  getHabitsWithSufficientData,
} from './profileBuilder.js'

import {
  generateBothScenarios,
  generateComparativeAnalysis,
  getScenarioMetadata,
} from './scenarioGenerator.js'

import {
  calculateProjection,
  compareHorizons,
  performSensitivityAnalysis,
} from './projectionCalculator.js'

import {
  runWhatIfSimulation,
  createWhatIfScenario,
  getPredefinedScenarios,
  runPredefinedScenario,
  formatWhatIfResult,
} from './whatIfSimulator.js'

export interface PredictionEngineInput {
  userId: string
  habits: HabitWithLogs[]
  userProfile?: UserProfile
  dateRange?: { start: string; end: string }
  config?: PredictionEngineConfig
}

export interface PredictionEngineResult {
  prediction: PredictionOutput
  profile: UserBehavioralProfile
  dataQuality: {
    hasSufficientData: boolean
    daysOfHistory: number
    isIllustrative: boolean
  }
}

/**
 * Main Prediction Engine Class
 */
export class PredictionEngine {
  private config: Required<PredictionEngineConfig>

  constructor(config: PredictionEngineConfig = {}) {
    this.config = {
      assumptions: config.assumptions || {},
      minimumDaysForPersonalized: config.minimumDaysForPersonalized || 14,
      enableIllustrativeMode: config.enableIllustrativeMode !== false,
      customCategoryMapping: config.customCategoryMapping || {},
    }
  }

  /**
   * Generate complete prediction output from user habits
   */
  async generatePrediction(input: PredictionEngineInput): Promise<PredictionEngineResult> {
    const { userId, habits, userProfile, dateRange, config } = input

    // Use default date range if not provided
    const effectiveDateRange = dateRange || getDefaultDateRange()

    // Filter habits by date range
    const filteredHabits = filterHabitsByDateRange(habits, effectiveDateRange.start, effectiveDateRange.end)

    // Build behavioral profile
    const { profile, dataQuality, goals } = buildUserBehavioralProfile({
      userId,
      habits: filteredHabits,
      userProfile,
      dateRange: effectiveDateRange,
      minimumDaysForPersonalized: this.config.minimumDaysForPersonalized,
    })

    // Check if we have sufficient data
    const hasSufficientData = dataQuality.hasSufficientData

    if (!hasSufficientData && !this.config.enableIllustrativeMode) {
      throw new Error('Insufficient data for personalized prediction. Enable illustrative mode or collect more data.')
    }

    // Generate both scenarios
    const { currentPath, improvedPath } = generateBothScenarios(
      profile,
      goals,
      this.config.assumptions,
      new Set(filteredHabits.map(h => h.category)).size,
      filteredHabits.filter(h => ['social', 'relationship', 'family', 'friends'].includes(h.category.toLowerCase())).length,
      this.config.minimumDaysForPersonalized
    )

    // Generate comparative analysis
    const comparativeAnalysis = generateComparativeAnalysis(currentPath, improvedPath)

    // Build complete prediction output
    const prediction: PredictionOutput = {
      generatedAt: new Date().toISOString(),
      userId,
      currentPath,
      improvedPath,
      comparativeAnalysis,
      meta: {
        engineVersion: '1.0.0',
        assumptionsUsed: { ...DEFAULT_ASSUMPTIONS, ...this.config.assumptions },
        dataPeriod: effectiveDateRange,
        warnings: this.generateWarnings(dataQuality, profile),
      },
    }

    return {
      prediction,
      profile,
      dataQuality: {
        hasSufficientData,
        daysOfHistory: dataQuality.daysOfHistory,
        isIllustrative: dataQuality.isIllustrative,
      },
    }
  }

  /**
   * Generate prediction for a specific scenario only (used by What-If)
   */
  async generateScenarioPrediction(
    profile: UserBehavioralProfile,
    goals: UserGoals,
    scenarioType: 'current_path' | 'improved_path',
    horizons: ProjectionHorizon[] = ['6_months', '5_years']
  ): Promise<Record<ProjectionHorizon, Awaited<ReturnType<typeof calculateProjection>>>> {
    const assumptions = { ...DEFAULT_ASSUMPTIONS, ...this.config.assumptions }
    const categoryCount = 5 // Default
    const socialHabitsCount = 1 // Default

    const results: Record<ProjectionHorizon, any> = {} as any

    for (const horizon of horizons) {
      results[horizon] = calculateProjection(
        profile,
        goals,
        assumptions,
        scenarioType,
        horizon,
        categoryCount,
        socialHabitsCount
      )
    }

    return results
  }

  /**
   * Run a what-if simulation
   */
  async runWhatIf(scenario: WhatIfScenario): Promise<WhatIfResult> {
    // Override config with scenario assumptions
    const originalAssumptions = this.config.assumptions
    this.config.assumptions = { ...this.config.assumptions, ...scenario.assumptions }

    try {
      return runWhatIfSimulation(scenario)
    } finally {
      this.config.assumptions = originalAssumptions
    }
  }

  /**
   * Run a predefined what-if scenario
   */
  async runPredefinedWhatIf(
    scenarioId: string,
    baseProfile: UserBehavioralProfile
  ): Promise<WhatIfResult | null> {
    return runPredefinedScenario(scenarioId, baseProfile, this.config.assumptions)
  }

  /**
   * Get all predefined what-if scenarios
   */
  getPredefinedWhatIfScenarios() {
    return getPredefinedScenarios()
  }

  /**
   * Create custom what-if scenario
   */
  createWhatIfScenario(
    baseProfile: UserBehavioralProfile,
    changes: Array<{ metric: keyof UserBehavioralProfile['averages']; targetValue: number }>
  ): WhatIfScenario {
    return createWhatIfScenario(baseProfile, changes, this.config.assumptions)
  }

  /**
   * Format what-if result for display
   */
  formatWhatIfResult(result: WhatIfResult) {
    return formatWhatIfResult(result)
  }

  /**
   * Compare horizons for a scenario
   */
  compareHorizons(
    projection6m: Awaited<ReturnType<typeof calculateProjection>>,
    projection5y: Awaited<ReturnType<typeof calculateProjection>>
  ) {
    return compareHorizons(projection6m, projection5y)
  }

  /**
   * Perform sensitivity analysis
   */
  performSensitivityAnalysis(
    profile: UserBehavioralProfile,
    goals: UserGoals,
    scenarioType: 'current_path' | 'improved_path' = 'improved_path',
    horizon: ProjectionHorizon = '6_months'
  ) {
    const assumptions = { ...DEFAULT_ASSUMPTIONS, ...this.config.assumptions }
    return performSensitivityAnalysis(profile, goals, assumptions, scenarioType, horizon)
  }

  /**
   * Get scenario metadata for UI
   */
  getScenarioMetadata(scenario: Scenario) {
    return getScenarioMetadata(scenario)
  }

  /**
   * Generate warnings based on data quality and profile
   */
  private generateWarnings(
    dataQuality: { hasSufficientData: boolean; daysOfHistory: number; isIllustrative: boolean },
    profile: UserBehavioralProfile
  ): string[] {
    const warnings: string[] = []

    if (dataQuality.isIllustrative) {
      warnings.push(
        `Illustrative simulation: Only ${dataQuality.daysOfHistory} days of data available. ` +
        `Minimum ${this.config.minimumDaysForPersonalized} days recommended for personalized predictions.`
      )
    }

    if (profile.daysOfData < 7) {
      warnings.push('Very limited data - projections are highly speculative')
    }

    // Check for missing critical categories
    const criticalCategories = ['sleep', 'exercise']
    for (const cat of criticalCategories) {
      if (!profile.categoryBreakdown[cat] && profile.averages[cat === 'sleep' ? 'sleepHours' : 'exerciseMinutes'] === 0) {
        warnings.push(`No ${cat} data available - ${cat} projections use population averages`)
      }
    }

    // Check for extreme values
    if (profile.averages.sleepHours > 0 && (profile.averages.sleepHours < 4 || profile.averages.sleepHours > 11)) {
      warnings.push('Reported sleep hours outside typical range - verify data accuracy')
    }

    if (profile.averages.screenTimeHours > 14) {
      warnings.push('Reported screen time extremely high - verify data accuracy')
    }

    return warnings
  }

  /**
   * Update engine configuration
   */
  updateConfig(config: Partial<PredictionEngineConfig>) {
    this.config.assumptions = { ...this.config.assumptions, ...config.assumptions }
    if (config.minimumDaysForPersonalized) this.config.minimumDaysForPersonalized = config.minimumDaysForPersonalized
    if (config.enableIllustrativeMode !== undefined) this.config.enableIllustrativeMode = config.enableIllustrativeMode
    if (config.customCategoryMapping) this.config.customCategoryMapping = config.customCategoryMapping
  }

  /**
   * Run a what-if simulation
   */
  runWhatIfSimulation(scenario: WhatIfScenario): WhatIfResult {
    return runWhatIfSimulation(scenario)
  }

  /**
   * Get current configuration
   */
  getConfig(): Required<PredictionEngineConfig> {
    return { ...this.config }
  }
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Create a prediction engine with default configuration
 */
export function createPredictionEngine(config?: PredictionEngineConfig): PredictionEngine {
  return new PredictionEngine(config)
}

/**
 * Quick prediction generation (single function call)
 */
export async function quickPredict(
  userId: string,
  habits: HabitWithLogs[],
  userProfile?: UserProfile,
  options?: {
    dateRange?: { start: string; end: string }
    assumptions?: Partial<ScenarioAssumptions>
    minimumDays?: number
  }
): Promise<PredictionEngineResult> {
  const engine = createPredictionEngine({
    assumptions: options?.assumptions,
    minimumDaysForPersonalized: options?.minimumDays,
  })

  return engine.generatePrediction({
    userId,
    habits,
    userProfile,
    dateRange: options?.dateRange,
  })
}

// ============================================================================
// Version Info
// ============================================================================

export const ENGINE_VERSION = '1.0.0'
export const ENGINE_NAME = 'Future You Prediction Engine'
export const SUPPORTED_HORIZONS: ProjectionHorizon[] = ['6_months', '5_years']
export const SCENARIO_TYPES = ['current_path', 'improved_path'] as const
export const INDICATOR_CATEGORIES = [
  'health',
  'academic',
  'digitalWellbeing',
  'financial',
  'personalDevelopment',
] as const