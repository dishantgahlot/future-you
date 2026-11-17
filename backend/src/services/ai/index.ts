// AI Services Index - Main exports for all AI functionality

// Client
export {
  GeminiClient,
  createGeminiClient,
  generateText,
  generateJSON,
  isGeminiAvailable,
  type GeminiResponse,
  type GeminiClientOptions,
  type GeminiError,
} from './geminiClient.js'

// Prompt Builder
export {
  buildFutureLetterPrompt,
  buildWeeklyInsightPrompt,
  buildHabitRecommendationPrompt,
  buildPredictionExplanationPrompt,
  buildCoachPrompt,
  type UserProfile,
  type HabitSummary,
  type BehavioralProfile,
  type PredictionData,
  type ComparativeAnalysis,
  type Achievement,
  type WeeklySummary,
  type CoachContext,
  type LetterType,
  type CoachCategory,
  // Response schemas
  futureLetterResponseSchema,
  weeklyInsightResponseSchema,
  habitRecommendationResponseSchema,
  predictionExplanationResponseSchema,
} from './promptBuilder.js'

// Response Validator
export {
  FutureLetterResponseSchema,
  WeeklyInsightResponseSchema,
  HabitRecommendationResponseSchema,
  PredictionExplanationResponseSchema,
  CoachResponseSchema,
  validateFutureLetterResponse,
  validateWeeklyInsightResponse,
  validateHabitRecommendationResponse,
  validatePredictionExplanationResponse,
  validateCoachResponse,
  sanitizeString,
  sanitizeLetterContent,
  sanitizeResponse,
  extractJSONFromResponse,
  parseAndValidateJSON,
  DEFAULT_FUTURE_LETTER,
  DEFAULT_WEEKLY_INSIGHT,
  DEFAULT_HABIT_RECOMMENDATIONS,
  DEFAULT_PREDICTION_EXPLANATION,
  type FutureLetterResponse,
  type WeeklyInsightResponse,
  type HabitRecommendationResponse,
  type PredictionExplanationResponse,
  type CoachResponse,
} from './responseValidator.js'

// Fallback Service
export {
  generateFallbackFutureLetter,
  generateFallbackWeeklyInsight,
  generateFallbackHabitRecommendations,
  generateFallbackPredictionExplanation,
  generateFallbackCoachResponse,
  shouldUseFallback,
  fallbackService,
  type FallbackContext,
  type FallbackType,
} from './fallbackService.js'

// Future Letter Service
export {
  generateFutureLetter,
  getFutureLetters,
  deleteFutureLetter,
  type FutureLetter,
  type GenerateFutureLetterOptions,
} from './futureLetterService.js'

// Weekly Insight Service
export {
  generateWeeklyInsight,
  getWeeklyInsights,
  getLatestWeeklyInsight,
  type WeeklyInsight,
  type GenerateWeeklyInsightOptions,
} from './weeklyInsightService.js'

// Habit Recommendation Service
export {
  generateHabitRecommendations,
  createHabitFromRecommendation,
  type HabitRecommendation,
  type GenerateHabitRecommendationsOptions,
} from './habitRecommendationService.js'

// Prediction Explanation Service
export {
  generatePredictionExplanation,
  type PredictionExplanation,
} from './predictionExplanationService.js'

// AI Coach Service
export {
  askCoach,
  getCoachHistory,
  type CoachSession,
  type AskCoachOptions,
} from './aiCoachService.js'