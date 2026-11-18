import { Router, Response } from 'express'
import { z } from 'zod'
import {
  generateFutureLetter,
  getFutureLetters,
  deleteFutureLetter,
  type GenerateFutureLetterOptions,
} from '../services/ai/futureLetterService.js'
import {
  generateWeeklyInsight,
  getWeeklyInsights,
  getLatestWeeklyInsight,
  type GenerateWeeklyInsightOptions,
} from '../services/ai/weeklyInsightService.js'
import {
  generateHabitRecommendations,
  createHabitFromRecommendation,
  type GenerateHabitRecommendationsOptions,
} from '../services/ai/habitRecommendationService.js'
import {
  generatePredictionExplanation,
} from '../services/ai/predictionExplanationService.js'
import {
  askCoach,
  getCoachHistory,
  type AskCoachOptions,
} from '../services/ai/aiCoachService.js'
import { generateProgressReport } from '../services/ai/progressReportService.js'
import {
  simulateWhatIfScenario,
  getWhatIfChatHistory,
  clearWhatIfChatHistory,
  getWhatIfSessions,
  getWhatIfSessionMessages,
  deleteWhatIfSession,
} from '../services/ai/whatIfChatService.js'
import { AuthenticatedRequest } from '../middleware/auth.js'
import { asyncHandler, AppError } from '../middleware/errorHandler.js'
import { config } from '../config/index.js'
import { GoogleGenerativeAI } from '@google/generative-ai'

// Helper to check auth (with gentle demo fallback for unauthenticated local UI usage)
function requireAuth(req: AuthenticatedRequest): string {
  const userId = req.user?.id || (req.body?.userId as string) || (req.query?.userId as string) || 'd6dabc1d-aec5-4cfa-a742-181357ccd86c'
  return userId
}

const router = Router()

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const generateFutureLetterSchema = z.object({
  letterType: z.enum(['six_month', 'five_year', 'current_path']).optional(),
  letter_type: z.enum(['six_month', 'five_year', 'current_path']).optional(),
  regenerate: z.boolean().optional(),
  tone: z.enum(['encouraging', 'realistic', 'visionary']).optional(),
}).transform((data) => ({
  letterType: (data.letterType || data.letter_type || 'six_month') as 'six_month' | 'five_year' | 'current_path',
  regenerate: data.regenerate,
  tone: data.tone,
}))

const generateWeeklyInsightSchema = z.object({
  weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), // YYYY-MM-DD
  regenerate: z.boolean().optional(),
})

const generateHabitRecommendationsSchema = z.object({
  regenerate: z.boolean().optional(),
})

const askCoachSchema = z.object({
  question: z.string().min(3).max(2000),
  contextType: z.enum(['habit', 'prediction', 'screen_time', 'sleep', 'study', 'exercise', 'finance', 'general']).optional(),
  contextData: z.any().optional(),
})

const createHabitFromRecommendationSchema = z.object({
  name: z.string().min(1).max(100),
  category: z.string().min(1).max(50),
  frequency: z.enum(['daily', 'weekly', 'monthly']),
  targetValue: z.number().positive(),
  unit: z.string().min(1).max(20),
  why: z.string(),
  difficulty: z.enum(['easy', 'moderate', 'hard']),
  expectedImpact: z.enum(['high', 'medium', 'low']),
  firstMicroStep: z.string(),
})

// ============================================================================
// FUTURE LETTER ROUTES
// ============================================================================

/**
 * POST /api/ai/future-letter
 * Generate a future letter from your future self
 */
router.post('/future-letter', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = requireAuth(req)

  const validation = generateFutureLetterSchema.safeParse(req.body)
  if (!validation.success) {
    throw new AppError(400, 'Invalid request', validation.error.flatten())
  }

  const options: GenerateFutureLetterOptions = {
    userId,
    ...validation.data,
    habits: req.body.habits,
    logs: req.body.logs,
    userName: req.body.userName,
    apiKey: req.body.apiKey,
  }

  const result = await generateFutureLetter(options)

  res.json({
    success: true,
    data: {
      letter: result.letter,
      cached: result.cached,
      usedFallback: result.usedFallback,
    },
  })
}))

/**
 * GET /api/ai/future-letters
 * Get all saved future letters for the user
 */
router.get('/future-letters', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = requireAuth(req)

  const letters = await getFutureLetters(userId)

  res.json({
    success: true,
    data: letters,
  })
}))

/**
 * DELETE /api/ai/future-letters/:id
 * Delete a future letter
 */
router.delete('/future-letters/:id', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = requireAuth(req)

  const { id } = req.params
  const letterId = Array.isArray(id) ? id[0] : id
  await deleteFutureLetter(userId, letterId)

  res.json({
    success: true,
    message: 'Letter deleted successfully',
  })
}))

// ============================================================================
// WEEKLY INSIGHT ROUTES
// ============================================================================

/**
 * POST /api/ai/weekly-insight
 * Generate a weekly insight
 */
router.post('/weekly-insight', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = requireAuth(req)

  const validation = generateWeeklyInsightSchema.safeParse(req.body)
  if (!validation.success) {
    throw new AppError(400, 'Invalid request', validation.error.flatten())
  }

  const options: GenerateWeeklyInsightOptions = {
    userId,
    ...validation.data,
    habits: req.body.habits,
    logs: req.body.logs,
    userName: req.body.userName,
    apiKey: req.body.apiKey,
  }

  const result = await generateWeeklyInsight(options)

  res.json({
    success: true,
    data: {
      insight: result.insight,
      cached: result.cached,
      usedFallback: result.usedFallback,
    },
  })
}))

/**
 * GET /api/ai/weekly-insights
 * Get all weekly insights for the user
 */
router.get('/weekly-insights', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = requireAuth(req)

  const limitParam = req.query.limit
  const limitStr = Array.isArray(limitParam) ? limitParam[0] : limitParam
  const limit = typeof limitStr === 'string' ? parseInt(limitStr, 10) : 12
  const insights = await getWeeklyInsights(userId, isNaN(limit) ? 12 : limit)

  res.json({
    success: true,
    data: insights,
  })
}))

/**
 * GET /api/ai/weekly-insight/latest
 * Get the latest weekly insight
 */
router.get('/weekly-insight/latest', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = requireAuth(req)

  const insight = await getLatestWeeklyInsight(userId)

  res.json({
    success: true,
    data: insight,
  })
}))

// ============================================================================
// HABIT RECOMMENDATION ROUTES
// ============================================================================

/**
 * POST /api/ai/habit-recommendations
 * Generate AI-powered habit recommendations
 */
router.post('/habit-recommendations', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = requireAuth(req)

  const validation = generateHabitRecommendationsSchema.safeParse(req.body)
  if (!validation.success) {
    throw new AppError(400, 'Invalid request', validation.error.flatten())
  }

  const options: GenerateHabitRecommendationsOptions = {
    userId,
    ...validation.data,
  }

  const result = await generateHabitRecommendations(options)

  res.json({
    success: true,
    data: {
      recommendations: result.recommendations,
      usedFallback: result.usedFallback,
    },
  })
}))

// Route alias for /recommendations
router.post('/recommendations', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = requireAuth(req)
  const validation = generateHabitRecommendationsSchema.safeParse(req.body)
  const options: GenerateHabitRecommendationsOptions = {
    userId,
    ...(validation.success ? validation.data : {}),
  }
  const result = await generateHabitRecommendations(options)
  res.json({
    success: true,
    data: {
      recommendations: result.recommendations,
      usedFallback: result.usedFallback,
    },
  })
}))

/**
 * POST /api/ai/habits/from-recommendation
 * Create a habit from a recommendation
 */
router.post('/habits/from-recommendation', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = requireAuth(req)

  const validation = createHabitFromRecommendationSchema.safeParse(req.body)
  if (!validation.success) {
    throw new AppError(400, 'Invalid request', validation.error.flatten())
  }

  const habit = await createHabitFromRecommendation(userId, validation.data as any)

  res.json({
    success: true,
    data: habit,
  })
}))

// ============================================================================
// PREDICTION EXPLANATION ROUTES
// ============================================================================

/**
 * GET /api/ai/prediction-explanation
 * Get a plain-language explanation of the user's predictions
 */
router.get('/prediction-explanation', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = requireAuth(req)

  const result = await generatePredictionExplanation(userId)

  res.json({
    success: true,
    data: {
      explanation: result.explanation,
      usedFallback: result.usedFallback,
    },
  })
}))

// ============================================================================
// AI COACH ROUTES
// ============================================================================

/**
 * POST /api/ai/coach
 * Ask the AI Coach a question
 */
router.post('/coach', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = requireAuth(req)

  const validation = askCoachSchema.safeParse(req.body)
  if (!validation.success) {
    throw new AppError(400, 'Invalid request', validation.error.flatten())
  }

  const options: AskCoachOptions = {
    userId,
    question: validation.data.question,
    contextType: validation.data.contextType as any,
    contextData: validation.data.contextData,
  }

  const result = await askCoach(options)

  res.json({
    success: true,
    data: {
      answer: result.answer,
      followUpQuestions: result.followUpQuestions,
      suggestedActions: result.suggestedActions,
      sessionId: result.sessionId,
      usedFallback: result.usedFallback,
    },
  })
}))

/**
 * GET /api/ai/coach/history
 * Get AI Coach conversation history
 */
router.get('/coach/history', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = requireAuth(req)

  const limitParam = req.query.limit
  const limitStr = Array.isArray(limitParam) ? limitParam[0] : limitParam
  const limit = typeof limitStr === 'string' ? parseInt(limitStr, 10) : 20
  const history = await getCoachHistory(userId, isNaN(limit) ? 20 : limit)

  res.json({
    success: true,
    data: history,
  })
}))

// ============================================================================
// PROGRESS REPORT ROUTES (WEEKLY & MONTHLY)
// ============================================================================

/**
 * POST /api/ai/progress-report
 * Generate in-depth AI Progress Report (shortcomings, areas of improvement, how to improve, tips & tricks, websites/resources)
 */
router.post('/progress-report', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = requireAuth(req)
  const { period = 'weekly', habits = [], logs = [], userName = 'Friend', apiKey } = req.body

  if (period !== 'weekly' && period !== 'monthly') {
    throw new AppError(400, 'Invalid period: must be weekly or monthly')
  }

  const result = await generateProgressReport({
    userId,
    userName,
    period,
    habits,
    logs,
    apiKey,
  })

  res.json({
    success: true,
    data: {
      ...result.report,
      usedFallback: result.usedFallback,
      model: result.model,
    },
    usedFallback: result.usedFallback,
    model: result.model,
  })
}))

// ============================================================================
// WHAT-IF SCENARIO AI CHAT SIMULATOR
// ============================================================================

/**
 * POST /api/ai/what-if-chat
 * Interactive AI Chatbot session simulating hypothetical scenarios against real habit data
 */
router.post('/what-if-chat', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = requireAuth(req)
  const { message, sessionId, sessionTitle, conversationHistory = [], habits = [], logs = [], userName = 'Friend', apiKey } = req.body

  if (!message || typeof message !== 'string' || !message.trim()) {
    throw new AppError(400, 'Message is required for what-if simulation')
  }

  const result = await simulateWhatIfScenario({
    userId,
    sessionId,
    sessionTitle,
    message: message.trim(),
    conversationHistory,
    habits,
    logs,
    userName,
    apiKey,
  })

  res.json({
    success: true,
    data: result,
  })
}))

/**
 * GET /api/ai/what-if-chat/sessions
 * List all saved ChatGPT-style chat sessions for the authenticated user
 */
router.get('/what-if-chat/sessions', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = requireAuth(req)
  const sessions = await getWhatIfSessions(userId)

  res.json({
    success: true,
    data: sessions,
  })
}))

/**
 * GET /api/ai/what-if-chat/sessions/:sessionId
 * Get all messages for a specific chat session
 */
router.get('/what-if-chat/sessions/:sessionId', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = requireAuth(req)
  const sessionId = Array.isArray(req.params.sessionId) ? req.params.sessionId[0] : req.params.sessionId

  const messages = await getWhatIfSessionMessages(userId, sessionId)

  res.json({
    success: true,
    data: messages,
  })
}))

/**
 * DELETE /api/ai/what-if-chat/sessions/:sessionId
 * Delete a specific chat session for the authenticated user
 */
router.delete('/what-if-chat/sessions/:sessionId', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = requireAuth(req)
  const sessionId = Array.isArray(req.params.sessionId) ? req.params.sessionId[0] : req.params.sessionId

  await deleteWhatIfSession(userId, sessionId)

  res.json({
    success: true,
    message: 'Session deleted successfully',
  })
}))

/**
 * GET /api/ai/what-if-chat/history
 * Get flat chat history for the authenticated user (backwards compatible)
 */
router.get('/what-if-chat/history', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = requireAuth(req)
  const limitParam = req.query.limit
  const limitStr = Array.isArray(limitParam) ? limitParam[0] : limitParam
  const limit = typeof limitStr === 'string' ? parseInt(limitStr, 10) : 50

  const history = await getWhatIfChatHistory(userId, isNaN(limit) ? 50 : limit)

  res.json({
    success: true,
    data: history,
  })
}))

/**
 * DELETE /api/ai/what-if-chat/history
 * Clear all chat history for the authenticated user
 */
router.delete('/what-if-chat/history', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = requireAuth(req)
  await clearWhatIfChatHistory(userId)

  res.json({
    success: true,
    message: 'Chat history cleared successfully',
  })
}))

// ============================================================================
// API KEY CONFIGURATION & STATUS
// ============================================================================

/**
 * POST /api/ai/config-key
 * Verify and apply Google Gemini API Key
 */
router.post('/config-key', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { apiKey } = req.body
  if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length < 10) {
    throw new AppError(400, 'A valid Google Gemini API Key is required')
  }

  const cleanKey = apiKey.trim()

  try {
    const genAI = new GoogleGenerativeAI(cleanKey)
    const model = genAI.getGenerativeModel({ model: config.gemini.model || 'gemini-3.5-flash' })
    const testResult = await model.generateContent('Verify connection with one word: Success.')
    const responseText = testResult.response.text()

    // Store in active config
    config.gemini.apiKey = cleanKey
    process.env.GEMINI_API_KEY = cleanKey

    res.json({
      success: true,
      message: 'Google Gemini API Key verified and active!',
      sampleResponse: responseText.trim(),
      model: config.gemini.model || 'gemini-3.5-flash',
    })
  } catch (err: any) {
    throw new AppError(400, `Failed to connect with Google Gemini: ${err.message || 'Invalid API Key'}`)
  }
}))

/**
 * GET /api/ai/key-status
 * Check current Gemini key status
 */
router.get('/key-status', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const hasKey = !!config.gemini.apiKey && config.gemini.apiKey !== 'your_gemini_api_key'
  res.json({
    success: true,
    data: {
      hasKey,
      model: config.gemini.model || 'gemini-3.5-flash',
    },
  })
}))

// ============================================================================
// HEALTH CHECK
// ============================================================================

/**
 * GET /api/ai/health
 * Check if AI services are available
 */
router.get('/health', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { isGeminiAvailable } = await import('../services/ai/index.js')
  const geminiAvailable = isGeminiAvailable()

  res.json({
    success: true,
    data: {
      geminiAvailable,
      fallbackMode: !geminiAvailable,
      services: {
        futureLetter: true,
        weeklyInsight: true,
        habitRecommendations: true,
        predictionExplanation: true,
        coach: true,
      },
    },
  })
}))

export default router