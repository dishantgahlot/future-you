import { z } from 'zod'

// ============================================================================
// ZOD SCHEMAS FOR AI RESPONSE VALIDATION
// ============================================================================

// Future Letter Response Schema
export const FutureLetterResponseSchema = z.object({
  content: z.string().optional(),
  letter: z.string().optional(),
  text: z.string().optional(),
  body: z.string().optional(),
  letterType: z.enum(['six_month', 'five_year', 'current_path']).optional(),
  letter_type: z.enum(['six_month', 'five_year', 'current_path']).optional(),
  keyThemes: z.array(z.string()).optional(),
  key_themes: z.array(z.string()).optional(),
  actionItems: z.array(z.string()).optional(),
  action_items: z.array(z.string()).optional(),
}).transform(d => ({
  content: d.content || d.letter || d.text || d.body || '',
  letterType: (d.letterType || d.letter_type || 'five_year') as 'six_month' | 'five_year' | 'current_path',
  keyThemes: d.keyThemes || d.key_themes || ['#Consistency', '#Focus', '#IdentityShift'],
  actionItems: d.actionItems || d.action_items || ['Commit to 21-day consistency streak', 'Track weekly, adjust monthly'],
})).refine(d => d.content.length >= 20, { message: 'Letter content too short' })

export type FutureLetterResponse = z.infer<typeof FutureLetterResponseSchema>

// Weekly Insight Response Schema
export const WeeklyInsightRecommendationSchema = z.object({
  action: z.string().min(1),
  reason: z.string().min(1).optional().default('Builds consistency'),
  priority: z.enum(['high', 'medium', 'low']).default('medium'),
})

export const WeeklyInsightResponseSchema = z.object({
  summary: z.string().optional(),
  insight: z.string().optional(),
  text: z.string().optional(),
  content: z.string().optional(),
  overview: z.string().optional(),
  highlights: z.array(z.string()).optional(),
  concerns: z.array(z.string()).optional(),
  recommendations: z.array(z.any()).optional(),
  motivation: z.string().optional(),
}).transform(d => {
  const sum = d.summary || d.insight || d.text || d.content || d.overview || ''
  const recs = (d.recommendations || []).map((r: any) => {
    if (typeof r === 'string') {
      return { action: r, reason: 'Compounding momentum', priority: 'medium' as const }
    }
    return {
      action: r.action || r.recommendation || r.title || 'Maintain momentum',
      reason: r.reason || r.why || 'Builds consistency',
      priority: (['high', 'medium', 'low'].includes(r.priority) ? r.priority : 'medium') as 'high' | 'medium' | 'low',
    }
  })
  return {
    summary: sum,
    highlights: (d.highlights && d.highlights.length > 0) ? d.highlights : ['Consistent daily tracking and progress'],
    concerns: d.concerns || [],
    recommendations: recs.length > 0 ? recs : [{ action: 'Maintain daily streak', reason: 'Compounding momentum', priority: 'high' as const }],
    motivation: d.motivation || 'Every step compounds into long-term mastery.',
  }
}).refine(d => d.summary.length >= 15, { message: 'Summary too short' })

export type WeeklyInsightResponse = z.infer<typeof WeeklyInsightResponseSchema>

// Habit Recommendation Response Schema
export const HabitRecommendationItemSchema = z.object({
  name: z.string().min(1),
  category: z.string().min(1),
  frequency: z.enum(['daily', 'weekly', 'monthly']),
  targetValue: z.number().positive(),
  unit: z.string().min(1),
  why: z.string().min(10, 'Reasoning too short'),
  difficulty: z.enum(['easy', 'moderate', 'hard']),
  expectedImpact: z.enum(['high', 'medium', 'low']),
  firstMicroStep: z.string().min(5, 'Micro-step too short'),
})

export const HabitRecommendationResponseSchema = z.object({
  recommendations: z.array(HabitRecommendationItemSchema).min(1).max(10),
})

export type HabitRecommendationResponse = z.infer<typeof HabitRecommendationResponseSchema>

// Prediction Explanation Response Schema
export const LeveragePointSchema = z.object({
  habit: z.string().min(1),
  impact: z.string().min(1),
  why: z.string().min(1),
})

export const PredictionExplanationResponseSchema = z.object({
  currentPathSummary: z.string().min(50),
  improvedPathSummary: z.string().min(50),
  leveragePoints: z.array(LeveragePointSchema).min(1).max(5),
  feasibilityExplanation: z.string().min(30),
  breakEvenExplanation: z.string().min(30),
  uncertaintyExplanation: z.string().min(30),
  closing: z.string().min(20),
})

export type PredictionExplanationResponse = z.infer<typeof PredictionExplanationResponseSchema>

// Coach Response Schema (simple text response)
export const CoachResponseSchema = z.object({
  answer: z.string().min(10, 'Response too short'),
  followUpQuestions: z.array(z.string()).optional(),
  suggestedActions: z.array(z.string()).optional(),
})

export type CoachResponse = z.infer<typeof CoachResponseSchema>

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validate and parse AI response with detailed error reporting
 */
export function validateResponse<T>(
  schema: z.ZodType<T, any, any>,
  data: unknown,
  context: string
): { success: true; data: T } | { success: false; errors: string[] } {
  const result = schema.safeParse(data)

  if (result.success) {
    return { success: true, data: result.data }
  }

  const errors = result.error.errors.map(err =>
    `${err.path.join('.')}: ${err.message}`
  )

  console.warn(`[ResponseValidator] ${context} validation failed:`, errors)
  return { success: false, errors }
}

/**
 * Validate future letter response
 */
export function validateFutureLetterResponse(data: unknown) {
  return validateResponse(FutureLetterResponseSchema, data, 'FutureLetter')
}

/**
 * Validate weekly insight response
 */
export function validateWeeklyInsightResponse(data: unknown) {
  return validateResponse(WeeklyInsightResponseSchema, data, 'WeeklyInsight')
}

/**
 * Validate habit recommendation response
 */
export function validateHabitRecommendationResponse(data: unknown) {
  return validateResponse(HabitRecommendationResponseSchema, data, 'HabitRecommendation')
}

/**
 * Validate prediction explanation response
 */
export function validatePredictionExplanationResponse(data: unknown) {
  return validateResponse(PredictionExplanationResponseSchema, data, 'PredictionExplanation')
}

/**
 * Validate coach response
 */
export function validateCoachResponse(data: unknown) {
  return validateResponse(CoachResponseSchema, data, 'Coach')
}

// ============================================================================
// SANITIZATION FUNCTIONS
// ============================================================================

/**
 * Sanitize string to prevent XSS
 */
export function sanitizeString(str: string): string {
  return str
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"')
    .replace(/\//g, '&#x2F;')
}

/**
 * Sanitize future letter content (allow basic formatting)
 */
export function sanitizeLetterContent(content: string): string {
  // Allow basic markdown-like formatting but sanitize HTML
  return content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/on\w+="[^"]*"/gi, '')
    .replace(/javascript:/gi, '')
}

/**
 * Sanitize AI response object recursively
 */
export function sanitizeResponse<T extends Record<string, any>>(obj: T): T {
  const sanitized: any = {}

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeString(value)
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map(v =>
        typeof v === 'string' ? sanitizeString(v) : sanitizeResponse(v)
      )
    } else if (value && typeof value === 'object') {
      sanitized[key] = sanitizeResponse(value)
    } else {
      sanitized[key] = value
    }
  }

  return sanitized
}

// ============================================================================
// RESPONSE PARSING HELPERS
// ============================================================================

/**
 * Extract JSON from AI response that might be wrapped in markdown
 */
export function extractJSONFromResponse(response: string): string {
  // Try to find JSON in markdown code blocks
  const codeBlockMatch = response.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
  if (codeBlockMatch) {
    return codeBlockMatch[1].trim()
  }

  // Try to find JSON object in the response
  const jsonMatch = response.match(/\{[\s\S]*\}/)
  if (jsonMatch) {
    return jsonMatch[0]
  }

  // Return as-is if no JSON found
  return response.trim()
}

/**
 * Parse and validate JSON response from AI
 */
export function parseAndValidateJSON<T>(
  response: string,
  schema: z.ZodSchema<T>,
  context: string
): { success: true; data: T } | { success: false; errors: string[]; rawResponse: string } {
  try {
    const jsonString = extractJSONFromResponse(response)
    const parsed = JSON.parse(jsonString)
    const validation = validateResponse(schema, parsed, context)

    if (validation.success) {
      return { success: true, data: validation.data }
    }

    return {
      success: false,
      errors: (validation as any).errors || [],
      rawResponse: response,
    }
  } catch (parseError) {
    return {
      success: false,
      errors: [`JSON parse error: ${parseError instanceof Error ? parseError.message : 'Unknown'}`],
      rawResponse: response,
    }
  }
}

// ============================================================================
// DEFAULT/FALLBACK VALUES
// ============================================================================

export const DEFAULT_FUTURE_LETTER: FutureLetterResponse = {
  content: `Dear friend,

I'm writing to you from six months in the future. The journey hasn't been perfect, but every small choice you made today compounded into something meaningful. Your consistency with sleep and exercise created a foundation that rippled into everything else - clearer thinking at work, more patience with loved ones, and a sense of agency you didn't have before.

Remember how hard it was to put the phone down at 10 PM? You did it. Not every night, but enough nights. That single habit changed your mornings, which changed your days, which changed your trajectory.

The habits you're building now aren't just checkboxes. They're votes for the person you're becoming. Keep voting.

With pride in your progress,
Your 6-Month Future Self`,
  letterType: 'six_month' as const,
  keyThemes: ['consistency', 'compound effects', 'sleep', 'agency'],
  actionItems: ['Maintain sleep schedule', 'Continue exercise streak', 'Track progress weekly'],
}

export const DEFAULT_WEEKLY_INSIGHT: WeeklyInsightResponse = {
  summary: 'This week you maintained solid consistency across your core habits. Your sleep schedule improved on weekdays, and your study sessions showed great focus.',
  highlights: [
    'Sleep: 6/7 nights on target',
    'Study: 5 sessions completed',
    'Exercise: 3 workouts logged',
  ],
  concerns: ['Weekend screen time crept up', 'Hydration tracking inconsistent'],
  recommendations: [
    {
      action: 'Set a weekend screen-time limit',
      reason: 'Weekend usage was 40% higher than weekdays, affecting Monday energy',
      priority: 'high',
    },
    {
      action: 'Add water tracking to morning routine',
      reason: 'Hydration correlates with your best focus days',
      priority: 'medium',
    },
  ],
  motivation: 'You\'re building something real here. The data shows it. Trust the process.',
}

export const DEFAULT_HABIT_RECOMMENDATIONS: HabitRecommendationResponse = {
  recommendations: [
    {
      name: 'Morning Hydration',
      category: 'health',
      frequency: 'daily',
      targetValue: 500,
      unit: 'ml',
      why: 'You have strong morning routines but no hydration habit. Starting with water primes metabolism and cognitive function.',
      difficulty: 'easy',
      expectedImpact: 'high',
      firstMicroStep: 'Place a glass of water by your bed tonight',
    },
    {
      name: 'Evening Reflection',
      category: 'mental_health',
      frequency: 'daily',
      targetValue: 5,
      unit: 'minutes',
      why: 'Your screen time peaks at night. A reflection habit creates a natural transition away from devices.',
      difficulty: 'easy',
      expectedImpact: 'high',
      firstMicroStep: 'Write one sentence about today before bed',
    },
    {
      name: 'Weekly Financial Review',
      category: 'finance',
      frequency: 'weekly',
      targetValue: 1,
      unit: 'session',
      why: 'Financial dimension is your lowest score. Weekly awareness prevents surprise expenses.',
      difficulty: 'moderate',
      expectedImpact: 'high',
      firstMicroStep: 'Log yesterday\'s spending in 2 minutes',
    },
  ],
}

export const DEFAULT_PREDICTION_EXPLANATION: PredictionExplanationResponse = {
  currentPathSummary: 'If you continue exactly as you are, your overall life score stabilizes around your current level. Your strengths in consistency keep you from declining, but without intentional changes, you won\'t see significant improvement either.',
  improvedPathSummary: 'With targeted changes to your top 3 leverage habits, your overall score could improve substantially within 6 months. The model projects the biggest gains in health and digital wellness.',
  leveragePoints: [
    {
      habit: 'Sleep Consistency',
      impact: 'High - affects energy, focus, mood, and exercise recovery',
      why: 'Your sleep data shows high variability. Stabilizing this single habit ripples into 4 other dimensions.',
    },
    {
      habit: 'Evening Screen Limit',
      impact: 'High - improves sleep quality and morning productivity',
      why: 'Screen time after 10 PM correlates with your lowest next-day scores across all dimensions.',
    },
    {
      habit: 'Daily Movement',
      impact: 'Medium - compounds over time for health and mental clarity',
      why: 'Even 15 minutes daily shows measurable improvement in your health projection within 3 months.',
    },
  ],
  feasibilityExplanation: 'Your feasibility score of 75% means the changes are very achievable given your current consistency level. You\'re not starting from zero - you have proven you can build habits.',
  breakEvenExplanation: 'Break-even at 3 months means the effort you invest starts paying visible dividends around then. The first month feels like work, month 2 feels like routine, month 3 feels like results.',
  uncertaintyExplanation: 'The ranges (e.g., 65-78%) represent natural life variability - some weeks you\'ll exceed expectations, others you\'ll dip. The model accounts for this. Focus on the trend, not weekly fluctuations.',
  closing: 'You have more control than you think. The data doesn\'t determine your future - it illuminates the path. Your next choice matters.',
}

// ============================================================================
// TYPE EXPORTS
// ============================================================================
// Types are already exported inline with their declarations above