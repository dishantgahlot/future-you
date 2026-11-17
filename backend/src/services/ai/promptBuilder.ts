// Prompt templates for all AI features

export interface UserProfile {
  id: string
  fullName?: string
  email?: string
  dateOfBirth?: string
  preferences?: any
}

export interface HabitSummary {
  id: string
  name: string
  category: string
  frequency: string
  targetValue: number
  unit: string
  completionRate: number
  currentStreak: number
  longestStreak: number
  totalLogs: number
  trend: 'improving' | 'declining' | 'stable'
  averageValue: number
  averageProgressPercentage?: number
  latestProgressPercentage?: number
  progressTier?: string
  highPartialCount?: number
}

export interface BehavioralProfile {
  strengths: string[]
  weaknesses: string[]
  patterns: string[]
  consistencyScore: number
  categoryBalance: Record<string, number>
  habitRipples: Array<{
    habitA: string
    habitB: string
    correlation: number
  }>
}

export interface PredictionData {
  health: DimensionPrediction
  academic: DimensionPrediction
  digital: DimensionPrediction
  financial: DimensionPrediction
  personal: DimensionPrediction
  overallScore: number
  confidence: number
}

export interface DimensionPrediction {
  current: number
  projected: number
  uncertaintyRange: { min: number; max: number }
  confidence: number
  keyFactors: string[]
}

export interface ComparativeAnalysis {
  scoreDifference: number
  percentageImprovement: number
  keyLeveragePoints: string[]
  timeToBreakEven: number
  feasibilityScore: number
  assumptions: string[]
}

export interface Achievement {
  id: string
  title: string
  description: string
  date: string
  category: string
}

export interface WeeklySummary {
  weekStart: string
  weekEnd: string
  totalCompletions: number
  totalPossible: number
  completionRate: number
  categoryBreakdown: Record<string, { completed: number; total: number; rate: number }>
  streaks: Array<{ habitName: string; streak: number }>
  improvements: string[]
  declines: string[]
  comparedToPreviousWeek: {
    completionRateChange: number
    streaksChanged: Array<{ habitName: string; change: number }>
  }
}

export interface CoachContext {
  userProfile: UserProfile
  habitSummary: HabitSummary[]
  behavioralProfile: BehavioralProfile
  currentPredictions: PredictionData
  improvedPredictions: PredictionData
  comparativeAnalysis: ComparativeAnalysis
  recentInsights: string[]
  savedLetters: Array<{ type: string; content: string; date: string }>
}

export type LetterType = 'six_month' | 'five_year' | 'current_path'
export type CoachCategory = 'habit' | 'prediction' | 'screen_time' | 'sleep' | 'study' | 'exercise' | 'finance' | 'general'

// ============================================================================
// FUTURE LETTER PROMPTS
// ============================================================================

export function buildFutureLetterPrompt(params: {
  letterType: LetterType
  userProfile: UserProfile
  habitSummary: HabitSummary[]
  behavioralProfile: BehavioralProfile
  currentPathPrediction: PredictionData
  improvedPathPrediction: PredictionData
  comparativeAnalysis: ComparativeAnalysis
  achievements: Achievement[]
  tone?: 'encouraging' | 'realistic' | 'visionary'
}): string {
  const { letterType, userProfile, habitSummary, behavioralProfile, currentPathPrediction, improvedPathPrediction, comparativeAnalysis, achievements, tone = 'encouraging' } = params

  const name = userProfile.fullName || 'there'
  const age = userProfile.dateOfBirth ? calculateAge(userProfile.dateOfBirth) : null

  // Build habit highlights
  const topHabits = habitSummary
    .filter(h => h.completionRate > 0.5)
    .sort((a, b) => b.completionRate - a.completionRate)
    .slice(0, 5)

  const strugglingHabits = habitSummary
    .filter(h => h.completionRate < 0.4 && h.totalLogs > 3)
    .sort((a, b) => a.completionRate - b.completionRate)
    .slice(0, 3)

  const habitHighlights = topHabits.map(h =>
    `- ${h.name} (${h.category}): ${Math.round(h.completionRate * 100)}% completion, ${h.currentStreak}-day streak`
  ).join('\n')

  const struggleHighlights = strugglingHabits.map(h =>
    `- ${h.name} (${h.category}): ${Math.round(h.completionRate * 100)}% completion`
  ).join('\n')

  const achievementsText = achievements.length > 0
    ? achievements.slice(0, 5).map(a => `- ${a.title}: ${a.description}`).join('\n')
    : 'No major achievements recorded yet.'

  // Letter-type specific instructions
  let typeInstructions = ''
  let greeting = ''
  let signOff = ''

  switch (letterType) {
    case 'six_month':
      typeInstructions = `Write a letter from the user's future self, 6 months from now. Be optimistic but realistic. Reference specific improvements in their habits. Mention how their consistency has paid off. Include concrete details from their current trajectory (${Math.round(improvedPathPrediction.overallScore)}% overall score projected).`
      greeting = `Dear ${name},`
      signOff = `With pride in your progress,\nYour 6-Month Future Self`
      break

    case 'five_year':
      typeInstructions = `Write a visionary letter from the user's future self, 5 years from now. Paint a picture of their life trajectory based on current trends. Reference how small daily habits compounded into major life changes. Be inspiring but grounded in their actual behavioral patterns. Mention career, health, relationships, and personal growth.`
      greeting = `Dear ${name},`
      signOff = `With love and gratitude for the journey,\nYour 5-Year Future Self`
      break

    case 'current_path':
      typeInstructions = `Write a "warning letter" from the user's future self if they change NOTHING. Continue current trajectory (${Math.round(currentPathPrediction.overallScore)}% overall score). Be honest and slightly uncomfortable - this is a wake-up call. Reference specific habits that will deteriorate. Show the cost of inaction. End with hope: "It doesn't have to be this way."`
      greeting = `Dear ${name},`
      signOff = `A possible future you want to avoid,\nYour Future Self (if nothing changes)`
      break
  }

  const toneGuidance = {
    encouraging: 'Warm, supportive, celebrates progress, gentle accountability',
    realistic: 'Honest, balanced, acknowledges both wins and struggles, practical',
    visionary: 'Inspiring, expansive, sees the big picture, motivating',
  }[tone]

  return `${greeting}

${typeInstructions}

TONE: ${toneGuidance}

USER CONTEXT:
- Name: ${name}${age ? ` (age ${age})` : ''}
- Current Overall Life Score: ${Math.round(currentPathPrediction.overallScore)}%
- Projected Score (if improved): ${Math.round(improvedPathPrediction.overallScore)}%
- Consistency Score: ${Math.round(behavioralProfile.consistencyScore * 100)}%

TOP HABITS:
${habitHighlights || 'No strong habits yet.'}

AREAS NEEDING WORK:
${struggleHighlights || 'All habits are on track!'}

BEHAVIORAL STRENGTHS:
${behavioralProfile.strengths.map(s => `- ${s}`).join('\n') || '- Building consistency'}

KEY PATTERNS:
${behavioralProfile.patterns.map(p => `- ${p}`).join('\n') || '- Still learning your patterns'}

ACHIEVEMENTS:
${achievementsText}

PREDICTION INSIGHTS:
- Health: ${currentPathPrediction.health.current}% → ${Math.round(improvedPathPrediction.health.projected)}% (${improvedPathPrediction.health.keyFactors.join(', ')})
- Academic/Career: ${currentPathPrediction.academic.current}% → ${Math.round(improvedPathPrediction.academic.projected)}% (${improvedPathPrediction.academic.keyFactors.join(', ')})
- Digital Wellness: ${currentPathPrediction.digital.current}% → ${Math.round(improvedPathPrediction.digital.projected)}% (${improvedPathPrediction.digital.keyFactors.join(', ')})
- Financial: ${currentPathPrediction.financial.current}% → ${Math.round(improvedPathPrediction.financial.projected)}% (${improvedPathPrediction.financial.keyFactors.join(', ')})
- Personal Growth: ${currentPathPrediction.personal.current}% → ${Math.round(improvedPathPrediction.personal.projected)}% (${improvedPathPrediction.personal.keyFactors.join(', ')})

KEY LEVERAGE POINTS (highest impact changes):
${comparativeAnalysis.keyLeveragePoints.map(p => `- ${p}`).join('\n')}

FEASIBILITY OF IMPROVEMENT: ${Math.round(comparativeAnalysis.feasibilityScore * 100)}%

Write a deeply personal, emotionally resonant letter. Use "I remember" and "You will" language. Reference SPECIFIC habits and numbers. Avoid generic motivational phrases like "believe in yourself." Instead say "I remember how hard it was to get to 7 hours of sleep, but you did it." Make it feel like it's truly from their future self.

${signOff}

CRITICAL: Return ONLY a valid JSON object matching this structure:
{
  "content": "The complete letter text with emotional resonance and specific habit references...",
  "letterType": "${letterType}",
  "keyThemes": ["#Consistency", "#Focus", "#IdentityShift"],
  "actionItems": ["Maintain 8h sleep schedule", "Dedicate 2h daily to deep study"]
}`
}

// ============================================================================
// WEEKLY INSIGHT PROMPT
// ============================================================================

export function buildWeeklyInsightPrompt(params: {
  weekSummary: WeeklySummary
  habitDetails: HabitSummary[]
  userProfile: UserProfile
  previousWeekComparison?: WeeklySummary
  upcomingGoals?: string[]
}): string {
  const { weekSummary, habitDetails, userProfile, previousWeekComparison, upcomingGoals } = params
  const name = userProfile.fullName || 'there'

  const categoryDetails = habitDetails
    .map(h => {
      const cat = weekSummary.categoryBreakdown[h.category]
      if (!cat) return null
      return `- ${h.name} (${h.category}): ${cat.completed}/${cat.total} (${Math.round(cat.rate * 100)}%) ${h.trend === 'improving' ? '📈' : h.trend === 'declining' ? '📉' : '➡️'}`
    })
    .filter(Boolean)
    .join('\n')

  const comparisonText = previousWeekComparison
    ? `Compared to last week (${Math.round(previousWeekComparison.completionRate * 100)}%): ${weekSummary.comparedToPreviousWeek.completionRateChange > 0 ? 'improved' : 'declined'} by ${Math.abs(Math.round(weekSummary.comparedToPreviousWeek.completionRateChange * 100))}%.`
    : 'No previous week data for comparison.'

  const goalsText = upcomingGoals && upcomingGoals.length > 0
    ? `\nUPCOMING GOALS:\n${upcomingGoals.map(g => `- ${g}`).join('\n')}`
    : ''

  return `Write a personalized weekly insight for ${name}. Be specific, encouraging, and actionable.

WEEK SUMMARY (${weekSummary.weekStart} to ${weekSummary.weekEnd}):
- Overall Completion: ${Math.round(weekSummary.completionRate * 100)}% (${weekSummary.totalCompletions}/${weekSummary.totalPossible})
- ${comparisonText}

CATEGORY BREAKDOWN:
${categoryDetails || 'No habit data this week.'}

STREAKS:
${weekSummary.streaks.length > 0
  ? weekSummary.streaks.map(s => `- ${s.habitName}: ${s.streak} days`).join('\n')
  : 'No active streaks.'}

WHAT IMPROVED:
${weekSummary.improvements.length > 0 ? weekSummary.improvements.map(i => `- ${i}`).join('\n') : '- Keep building consistency'}

WHAT DECLINED:
${weekSummary.declines.length > 0 ? weekSummary.declines.map(d => `- ${d}`).join('\n') : '- Nothing significant'}

${goalsText}

Tone: Warm coach who knows their data. No generic advice. Reference actual habits and numbers.

CRITICAL: Return ONLY valid JSON matching this schema:
{
  "summary": "3-4 sentence comprehensive weekly summary referencing actual numbers...",
  "highlights": ["Win 1 with specific habit data", "Win 2 with specific streak or metric"],
  "concerns": ["Area 1 needing attention", "Area 2 to watch"],
  "recommendations": [
    {
      "action": "Concrete action for next week",
      "reason": "Why this matters based on their habits",
      "priority": "high"
    }
  ],
  "motivation": "Inspiring closing message personalized to their journey"
}`
}

// ============================================================================
// HABIT RECOMMENDATION PROMPT
// ============================================================================

export function buildHabitRecommendationPrompt(params: {
  userProfile: UserProfile
  habitSummary: HabitSummary[]
  behavioralProfile: BehavioralProfile
  currentPredictions: PredictionData
  goals?: string[]
  availableTime?: string // e.g., "30 min/day", "1 hour 3x/week"
}): string {
  const { userProfile, habitSummary, behavioralProfile, currentPredictions, goals, availableTime } = params
  const name = userProfile.fullName || 'there'

  // Find category gaps
  const categories = ['health', 'fitness', 'nutrition', 'sleep', 'mental_health', 'productivity', 'learning', 'finance', 'social', 'other']
  const coveredCategories = new Set(habitSummary.map(h => h.category))
  const missingCategories = categories.filter(c => !coveredCategories.has(c))

  // Find lowest scoring dimensions
  const dimensions: Array<{ name: string; score: number; keyFactors: string[] }> = [
    { name: 'Health', score: currentPredictions.health.current, keyFactors: currentPredictions.health.keyFactors },
    { name: 'Academic/Career', score: currentPredictions.academic.current, keyFactors: currentPredictions.academic.keyFactors },
    { name: 'Digital Wellness', score: currentPredictions.digital.current, keyFactors: currentPredictions.digital.keyFactors },
    { name: 'Financial', score: currentPredictions.financial.current, keyFactors: currentPredictions.financial.keyFactors },
    { name: 'Personal Growth', score: currentPredictions.personal.current, keyFactors: currentPredictions.personal.keyFactors },
  ]
  dimensions.sort((a, b) => a.score - b.score)

  const habitRipples = behavioralProfile.habitRipples
    .filter(r => r.correlation > 0.3)
    .slice(0, 3)
    .map(r => `- ${r.habitA} → ${r.habitB} (correlation: ${r.correlation.toFixed(2)})`)
    .join('\n')

  return `Recommend 3-5 new habits for ${name} based on their data.

CURRENT HABITS (${habitSummary.length} active):
${habitSummary.map(h => `- ${h.name} (${h.category}): ${Math.round(h.completionRate * 100)}% completion`).join('\n')}

MISSING CATEGORIES: ${missingCategories.join(', ') || 'All categories covered'}

LOWEST DIMENSIONS (need most help):
${dimensions.slice(0, 3).map(d => `- ${d.name}: ${d.score}% (factors: ${d.keyFactors.join(', ')})`).join('\n')}

HABIT RIPPLES (strong correlations):
${habitRipples || 'Insufficient data for correlations'}

USER GOALS: ${goals?.join(', ') || 'Not specified'}
AVAILABLE TIME: ${availableTime || 'Not specified'}

BEHAVIORAL PROFILE:
- Consistency: ${Math.round(behavioralProfile.consistencyScore * 100)}%
- Strengths: ${behavioralProfile.strengths.join(', ') || 'Building'}
- Weaknesses: ${behavioralProfile.weaknesses.join(', ') || 'Identifying'}

For each recommendation, provide:
1. Habit name
2. Category
3. Suggested frequency (daily/weekly)
4. Target value & unit
5. WHY: Data-driven reason (reference specific gaps, correlations, or goals)
6. Difficulty: easy/moderate/hard
7. Expected impact: high/medium/low
8. First micro-step (tiny action to start today)

Return ONLY valid JSON:
{
  "recommendations": [
    {
      "name": "string",
      "category": "string",
      "frequency": "daily|weekly|monthly",
      "targetValue": number,
      "unit": "string",
      "why": "string",
      "difficulty": "easy|moderate|hard",
      "expectedImpact": "high|medium|low",
      "firstMicroStep": "string"
    }
  ]
}`
}

// ============================================================================
// PREDICTION EXPLANATION PROMPT
// ============================================================================

export function buildPredictionExplanationPrompt(params: {
  currentPath: PredictionData
  improvedPath: PredictionData
  comparativeAnalysis: ComparativeAnalysis
  behavioralProfile: BehavioralProfile
  userProfile: UserProfile
}): string {
  const { currentPath, improvedPath, comparativeAnalysis, behavioralProfile, userProfile } = params
  const name = userProfile.fullName || 'there'

  return `Explain the prediction results to ${name} in plain, conversational language.

CURRENT PATH (if nothing changes):
- Overall Score: ${Math.round(currentPath.overallScore)}%
- Health: ${currentPath.health.current}% (range: ${currentPath.health.uncertaintyRange.min}-${currentPath.health.uncertaintyRange.max}%)
- Academic/Career: ${currentPath.academic.current}% (range: ${currentPath.academic.uncertaintyRange.min}-${currentPath.academic.uncertaintyRange.max}%)
- Digital Wellness: ${currentPath.digital.current}% (range: ${currentPath.digital.uncertaintyRange.min}-${currentPath.digital.uncertaintyRange.max}%)
- Financial: ${currentPath.financial.current}% (range: ${currentPath.financial.uncertaintyRange.min}-${currentPath.financial.uncertaintyRange.max}%)
- Personal Growth: ${currentPath.personal.current}% (range: ${currentPath.personal.uncertaintyRange.min}-${currentPath.personal.uncertaintyRange.max}%)

IMPROVED PATH (with habit changes):
- Overall Score: ${Math.round(improvedPath.overallScore)}%
- Health: ${improvedPath.health.projected}%
- Academic/Career: ${improvedPath.academic.projected}%
- Digital Wellness: ${improvedPath.digital.projected}%
- Financial: ${improvedPath.financial.projected}%
- Personal Growth: ${improvedPath.personal.projected}%

COMPARATIVE ANALYSIS:
- Score Difference: +${comparativeAnalysis.scoreDifference} points (${comparativeAnalysis.percentageImprovement}% improvement)
- Time to Break Even: ${comparativeAnalysis.timeToBreakEven} months
- Feasibility Score: ${Math.round(comparativeAnalysis.feasibilityScore * 100)}%
- Key Leverage Points: ${comparativeAnalysis.keyLeveragePoints.join(', ')}
- Assumptions: ${comparativeAnalysis.assumptions.join('; ')}

USER'S BEHAVIORAL PROFILE:
- Consistency: ${Math.round(behavioralProfile.consistencyScore * 100)}%
- Strengths: ${behavioralProfile.strengths.join(', ')}
- Patterns: ${behavioralProfile.patterns.join(', ')}

Write a clear explanation covering:
1. What the "Current Path" means in everyday terms
2. What the "Improved Path" could look like
3. The 3 biggest leverage points (why these specific habits matter most)
4. What "Feasibility Score" means for them personally
5. What "Time to Break Even" means
6. What the uncertainty ranges mean (don't use statistical jargon)
7. A realistic expectation-setting closing

Tone: Like a knowledgeable friend explaining over coffee. No jargon. Use analogies. Be honest about uncertainty.`
}

// ============================================================================
// AI COACH PROMPT
// ============================================================================

export function buildCoachPrompt(params: {
  question: string
  context: CoachContext
  questionCategory: CoachCategory
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>
}): string {
  const { question, context, questionCategory, conversationHistory } = params
  const name = context.userProfile.fullName || 'there'

  // Build relevant context summary based on question category
  let relevantContext = ''

  switch (questionCategory) {
    case 'habit':
      relevantContext = `
RELEVANT HABIT & PROGRESS DATA (EXACT PERCENTAGES TRACKED):
${context.habitSummary.map(h => `- ${h.name} (${h.category}): ${h.latestProgressPercentage !== undefined ? `Latest: ${h.latestProgressPercentage}%, ` : ''}${Math.round(h.completionRate * 100)}% full-completion rate, 7-day avg progress: ${h.averageProgressPercentage || Math.round(h.completionRate * 100)}%, ${h.currentStreak}-day streak, tier: ${(h.progressTier || 'active').toUpperCase()}`).join('\n')}

BEHAVIORAL PATTERNS:
${context.behavioralProfile.patterns.join('\n')}`
      break

    case 'prediction':
      relevantContext = `
CURRENT PREDICTIONS:
- Health: ${context.currentPredictions.health.current}% → ${Math.round(context.improvedPredictions.health.projected)}%
- Academic/Career: ${context.currentPredictions.academic.current}% → ${Math.round(context.improvedPredictions.academic.projected)}%
- Digital Wellness: ${context.currentPredictions.digital.current}% → ${Math.round(context.improvedPredictions.digital.projected)}%
- Financial: ${context.currentPredictions.financial.current}% → ${Math.round(context.improvedPredictions.financial.projected)}%
- Personal Growth: ${context.currentPredictions.personal.current}% → ${Math.round(context.improvedPredictions.personal.projected)}%

KEY LEVERAGE POINTS:
${context.comparativeAnalysis.keyLeveragePoints.join('\n')}`
      break

    case 'screen_time':
    case 'sleep':
    case 'study':
    case 'exercise':
    case 'finance':
      const categoryHabits = context.habitSummary.filter(h => h.category === questionCategory || h.name.toLowerCase().includes(questionCategory))
      relevantContext = `
RELEVANT HABITS:
${categoryHabits.length > 0
  ? categoryHabits.map(h => `- ${h.name}: ${Math.round(h.completionRate * 100)}% completion, ${h.currentStreak}-day streak`).join('\n')
  : 'No habits in this category yet.'}

RELATED PREDICTIONS:
${questionCategory === 'screen_time' || questionCategory === 'sleep' ? `- Digital Wellness: ${context.currentPredictions.digital.current}%` : ''}
${questionCategory === 'study' ? `- Academic/Career: ${context.currentPredictions.academic.current}%` : ''}
${questionCategory === 'exercise' ? `- Health: ${context.currentPredictions.health.current}%` : ''}
${questionCategory === 'finance' ? `- Financial: ${context.currentPredictions.financial.current}%` : ''}`
      break

    default:
      relevantContext = `
OVERVIEW:
- Overall Score: ${Math.round(context.currentPredictions.overallScore)}%
- Consistency: ${Math.round(context.behavioralProfile.consistencyScore * 100)}%
- Top Habits: ${context.habitSummary.filter(h => h.completionRate > 0.6).slice(0, 3).map(h => h.name).join(', ') || 'Building habits'}
- Struggling: ${context.habitSummary.filter(h => h.completionRate < 0.4).slice(0, 3).map(h => h.name).join(', ') || 'None significant'}`
  }

  const historyText = conversationHistory && conversationHistory.length > 0
    ? `\nRECENT CONVERSATION:\n${conversationHistory.slice(-6).map(m => `${m.role === 'user' ? 'User' : 'Coach'}: ${m.content}`).join('\n')}`
    : ''

  return `You are "Future You AI Coach" for ${name} — a frontier-grade, highly versatile conversational AI companion (like ChatGPT) with full world knowledge, reasoning, and real-time awareness of ${name}'s habits, continuous percentages, and growth trajectories.

=== CORE BEHAVIORAL DIRECTIVES (STRICT) ===
1. ANSWER THE USER'S QUERY DIRECTLY AND FIRST (LIKE CHATGPT):
   - You can answer ANY question on ANY subject: programming (e.g. "what is api", code debugging, architecture), science, mathematics, philosophy, literature, history, general knowledge, creative writing, or casual chat.
   - Answer DIRECTLY, thoroughly, clearly, and brilliantly as an expert LLM.
   - NEVER start your response with a canned greeting reciting habit statistics.
   - NEVER inject unprompted habit statistics or check-in lectures into general knowledge or technical questions.
2. PERSONALIZED HABIT & RECOVERY INTELLIGENCE ON-DEMAND:
   - When the user asks about habits, routines, sleep, focus, burnout, goals, or time management, seamlessly connect your answer to their tracked metrics below.
   - CONTINUOUS PROGRESS AWARENESS: Recognize and praise partial completions (like 70% progress) as huge wins—never treat them as complete failure.
3. VOICE & FORMAT:
   - Clear, intelligent, warm, direct, and helpful. Use clean Markdown with bolding, lists, and code blocks where helpful.

USER CONTEXT:
- Name: ${name}
- Overall Life Score: ${Math.round(context.currentPredictions.overallScore)}%
- Consistency Score: ${Math.round(context.behavioralProfile.consistencyScore * 100)}%
- Active Habits: ${context.habitSummary.length}
${relevantContext}

${historyText}

USER QUESTION: "${question}"

Provide a direct, high-value, comprehensive answer now:`
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function calculateAge(dateOfBirth: string): number {
  const today = new Date()
  const birth = new Date(dateOfBirth)
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--
  }
  return age
}

// ============================================================================
// RESPONSE SCHEMAS (for JSON validation)
// ============================================================================

export const futureLetterResponseSchema = {
  type: 'object',
  properties: {
    content: { type: 'string' },
    letterType: { type: 'string', enum: ['six_month', 'five_year', 'current_path'] },
    keyThemes: { type: 'array', items: { type: 'string' } },
    actionItems: { type: 'array', items: { type: 'string' } },
  },
  required: ['content', 'letterType'],
}

export const weeklyInsightResponseSchema = {
  type: 'object',
  properties: {
    summary: { type: 'string' },
    highlights: { type: 'array', items: { type: 'string' } },
    concerns: { type: 'array', items: { type: 'string' } },
    recommendations: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          action: { type: 'string' },
          reason: { type: 'string' },
          priority: { type: 'string', enum: ['high', 'medium', 'low'] },
        },
        required: ['action', 'reason'],
      },
    },
    motivation: { type: 'string' },
  },
  required: ['summary', 'highlights', 'recommendations', 'motivation'],
}

export const habitRecommendationResponseSchema = {
  type: 'object',
  properties: {
    recommendations: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          category: { type: 'string' },
          frequency: { type: 'string', enum: ['daily', 'weekly', 'monthly'] },
          targetValue: { type: 'number' },
          unit: { type: 'string' },
          why: { type: 'string' },
          difficulty: { type: 'string', enum: ['easy', 'moderate', 'hard'] },
          expectedImpact: { type: 'string', enum: ['high', 'medium', 'low'] },
          firstMicroStep: { type: 'string' },
        },
        required: ['name', 'category', 'frequency', 'targetValue', 'unit', 'why', 'difficulty', 'expectedImpact', 'firstMicroStep'],
      },
    },
  },
  required: ['recommendations'],
}

export const predictionExplanationResponseSchema = {
  type: 'object',
  properties: {
    currentPathSummary: { type: 'string' },
    improvedPathSummary: { type: 'string' },
    leveragePoints: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          habit: { type: 'string' },
          impact: { type: 'string' },
          why: { type: 'string' },
        },
        required: ['habit', 'impact', 'why'],
      },
    },
    feasibilityExplanation: { type: 'string' },
    breakEvenExplanation: { type: 'string' },
    uncertaintyExplanation: { type: 'string' },
    closing: { type: 'string' },
  },
  required: ['currentPathSummary', 'improvedPathSummary', 'leveragePoints', 'feasibilityExplanation', 'breakEvenExplanation', 'uncertaintyExplanation', 'closing'],
}