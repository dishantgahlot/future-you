import type {
  FutureLetterResponse,
  WeeklyInsightResponse,
  HabitRecommendationResponse,
  PredictionExplanationResponse,
  CoachResponse,
} from './responseValidator.js'

import {
  DEFAULT_FUTURE_LETTER,
  DEFAULT_WEEKLY_INSIGHT,
  DEFAULT_HABIT_RECOMMENDATIONS,
  DEFAULT_PREDICTION_EXPLANATION,
} from './responseValidator.js'

// ============================================================================
// FALLBACK SERVICE - Template-based responses when AI is unavailable
// ============================================================================

export interface FallbackContext {
  userName?: string
  letterType?: 'six_month' | 'five_year' | 'current_path'
  currentScore?: number
  improvedScore?: number
  topHabits?: Array<{ name: string; category: string; completionRate: number; streak: number }>
  strugglingHabits?: Array<{ name: string; category: string; completionRate: number }>
  strengths?: string[]
  patterns?: string[]
  achievements?: Array<{ title: string; description: string }>
  leveragePoints?: string[]
  feasibilityScore?: number
  weekSummary?: {
    completionRate: number
    totalCompletions: number
    totalPossible: number
    categoryBreakdown: Record<string, { completed: number; total: number; rate: number }>
    streaks: Array<{ habitName: string; streak: number }>
    improvements: string[]
    declines: string[]
    comparisonChange?: number
  }
  habitDetails?: Array<{ name: string; category: string; completionRate: number; trend: string }>
  userGoals?: string[]
  questionCategory?: string
  question?: string
  habitSummary?: Array<{ name: string; category: string; completionRate: number; trend?: string; streak?: number }>
  availableTime?: string
  behavioralProfile?: {
    consistencyScore: number
    strengths: string[]
    weaknesses: string[]
    patterns: string[]
  }
  predictions?: {
    health: number
    academic: number
    digital: number
    financial: number
    personal: number
    overall: number
  }
  comparativeAnalysis?: {
    scoreDifference: number
    percentageImprovement: number
    keyLeveragePoints: string[]
    timeToBreakEven: number
    feasibilityScore: number
    assumptions: string[]
  }
}

/**
 * Generate fallback future letter using templates
 */
export function generateFallbackFutureLetter(context: FallbackContext): FutureLetterResponse {
  const {
    userName = 'there',
    letterType = 'six_month',
    currentScore = 50,
    improvedScore = 70,
    topHabits = [],
    strugglingHabits = [],
    strengths = [],
    patterns = [],
    achievements = [],
    leveragePoints = [],
    feasibilityScore = 0.7,
  } = context

  const name = userName
  const topHabitText = topHabits.length > 0
    ? topHabits.slice(0, 3).map(h =>
        `${h.name} (${Math.round(h.completionRate * 100)}%, ${h.streak}-day streak)`
      ).join(', ')
    : 'your emerging routines'

  const struggleText = strugglingHabits.length > 0
    ? strugglingHabits.slice(0, 2).map(h => h.name).join(' and ')
    : 'consistency'

  const achievementText = achievements.length > 0
    ? achievements.slice(0, 2).map(a => a.title).join(' and ')
    : 'showing up each day'

  const leverageText = leveragePoints.length > 0
    ? leveragePoints.slice(0, 2).join(' and ')
    : 'your key habits'

  const templates: Record<string, string> = {
    six_month: `Dear ${name},

Six months ago, you were at ${currentScore}% overall. Today, I'm writing to you at ${improvedScore}% - and the difference isn't magic. It's ${topHabitText}. It's showing up for ${struggleText} even when it was hard. It's ${achievementText}.

I remember the nights you wanted to skip your evening routine. The mornings you hit snooze. The weeks where nothing seemed to stick. But you kept going. That consistency score of ${Math.round((context.behavioralProfile?.consistencyScore || 0.7) * 100)}%? That's the real story.

The habits that changed everything: ${leverageText}. They rippled outward - better sleep meant sharper focus meant better decisions meant more energy for what matters.

You're not the same person who started this. You're the one who stayed.

With pride in your progress,
Your 6-Month Future Self`,

    five_year: `Dear ${name},

Five years. That's 1,825 days of choices. And looking back, the big moments weren't the breakthroughs - they were the Tuesdays you showed up anyway.

Your ${currentScore}% became ${improvedScore}% became a life you recognize. The career trajectory shifted when ${topHabits[0]?.name || 'your focus habits'} compounded. The health foundation you built in year 2 carried you through year 4's challenges. The relationships deepened because you had capacity - emotional, physical, mental - to be present.

The pattern was always the same: small habit → identity shift → life change. ${patterns[0] || 'Consistency over intensity'} became your operating system.

You wondered if the daily grind mattered. It did. Every single time.

With love and gratitude for the journey,
Your 5-Year Future Self`,

    current_path: `Dear ${name},

This is the letter I hope you never receive.

At ${currentScore}%, things don't get dramatically worse - they just... stay. The same energy dips. The same scattered focus. The same "I'll start Monday" that never comes.

${struggleText} never improves. It becomes your baseline. The gap between where you are and where you could be doesn't close - it widens, quietly, each year.

In 5 years, you're still at ~${currentScore}%. Not because you can't change, but because you didn't. The ${Math.round((1 - (feasibilityScore || 0.7)) * 100)}% feasibility of improvement? You left it on the table.

But here's the thing: this letter is conditional. It only comes true if you change nothing. And you've already proven you can change - ${achievementText} proves it.

The leverage points are still there: ${leverageText}. The window is still open.

It doesn't have to be this way.

A possible future you want to avoid,
Your Future Self (if nothing changes)`,
  }

  return {
    content: templates[letterType] || templates.six_month,
    letterType,
    keyThemes: ['consistency', 'compound effects', 'agency', 'identity'],
    actionItems: [
      'Identify your #1 leverage habit',
      'Commit to 21-day consistency streak',
      'Track weekly, adjust monthly',
    ],
  }
}

/**
 * Generate fallback weekly insight
 */
export function generateFallbackWeeklyInsight(context: FallbackContext): WeeklyInsightResponse {
  const {
    weekSummary,
    habitDetails = [],
    userGoals = [],
  } = context

  const completionRate = weekSummary?.completionRate || 0
  const ratePercent = Math.round(completionRate * 100)
  const totalCompletions = weekSummary?.totalCompletions || 0
  const totalPossible = weekSummary?.totalPossible || 0

  // Find highlights from habit details
  const improving = habitDetails.filter(h => h.trend === 'improving').slice(0, 2)
  const declining = habitDetails.filter(h => h.trend === 'declining').slice(0, 2)
  const streaks = weekSummary?.streaks?.slice(0, 3) || []

  const highlights = [
    ...improving.map(h => `${h.name}: ${Math.round(h.completionRate * 100)}% (improving)`),
    ...streaks.map(s => `${s.habitName}: ${s.streak}-day streak`),
  ].slice(0, 3)

  if (highlights.length === 0) {
    highlights.push(`${ratePercent}% overall completion (${totalCompletions}/${totalPossible})`)
  }

  const concerns = declining.map(h => `${h.name}: ${Math.round(h.completionRate * 100)}% (declining)`)
  if (concerns.length === 0 && ratePercent < 70) {
    concerns.push('Overall completion below target - focus on consistency')
  }

  // Generate recommendations based on data
  const recommendations = []

  if (declining.length > 0) {
    recommendations.push({
      action: `Rebuild ${declining[0].name} consistency`,
      reason: `This habit dropped to ${Math.round(declining[0].completionRate * 100)}% - it was a strength`,
      priority: 'high' as const,
    })
  }

  if (ratePercent < 60) {
    recommendations.push({
      action: 'Reduce habit load to 3 core habits',
      reason: 'Lower completion suggests too many simultaneous commitments',
      priority: 'high' as const,
    })
  } else if (ratePercent < 80) {
    recommendations.push({
      action: 'Add one "anchor habit" to stabilize routine',
      reason: 'Anchor habits (sleep/wake, morning routine) improve all other completion rates',
      priority: 'medium' as const,
    })
  }

  if (userGoals.length > 0) {
    recommendations.push({
      action: `Align one habit with: ${userGoals[0]}`,
      reason: 'Goal-aligned habits have 3x higher retention',
      priority: 'medium' as const,
    })
  }

  // Ensure at least one recommendation
  if (recommendations.length === 0) {
    recommendations.push({
      action: 'Maintain current momentum',
      reason: 'You\'re in the 70-85% zone - consistency now compounds exponentially',
      priority: 'low' as const,
    })
  }

  const comparisonText = weekSummary?.comparisonChange
    ? weekSummary.comparisonChange > 0
      ? `Up ${Math.round(weekSummary.comparisonChange * 100)}% from last week - momentum building.`
      : `Down ${Math.round(Math.abs(weekSummary.comparisonChange) * 100)}% from last week - normal fluctuation, refocus.`
    : ''

  return {
    summary: `This week you hit ${ratePercent}% completion (${totalCompletions}/${totalPossible}). ${comparisonText} Your ${improving.length > 0 ? 'improving habits show momentum' : 'consistency is your foundation'}.`,
    highlights,
    concerns: concerns.slice(0, 2),
    recommendations: recommendations.slice(0, 3),
    motivation: ratePercent >= 80
      ? 'You\'re in the excellence zone. This consistency is rare - protect it.'
      : ratePercent >= 60
        ? 'Solid week. The compounding is working - trust the process.'
        : 'Every master was once a beginner. This week\'s data is just feedback, not judgment. Next week is a fresh canvas.',
  }
}

/**
 * Generate fallback habit recommendations
 */
export function generateFallbackHabitRecommendations(context: FallbackContext): HabitRecommendationResponse {
  const {
    habitSummary = [],
    behavioralProfile,
    predictions,
    userGoals = [],
    availableTime = '30 min/day',
  } = context

  // Determine missing categories
  const categories = ['health', 'fitness', 'nutrition', 'sleep', 'mental_health', 'productivity', 'learning', 'finance', 'social']
  const coveredCategories = new Set(habitSummary.map((h: { category: string }) => h.category))
  const missingCategories = categories.filter(c => !coveredCategories.has(c))

  // Find lowest prediction dimensions
  const dimScores = predictions ? [
    { name: 'Health', score: predictions.health, category: 'health' },
    { name: 'Academic/Career', score: predictions.academic, category: 'learning' },
    { name: 'Digital Wellness', score: predictions.digital, category: 'mental_health' },
    { name: 'Financial', score: predictions.financial, category: 'finance' },
    { name: 'Personal Growth', score: predictions.personal, category: 'mental_health' },
  ].sort((a, b) => a.score - b.score) : []

  const recommendations: HabitRecommendationResponse['recommendations'] = []

  // 1. Address lowest dimension
  if (dimScores.length > 0) {
    const lowest = dimScores[0]
    recommendations.push({
      name: getHabitForDimension(lowest.category),
      category: lowest.category,
      frequency: 'daily' as const,
      targetValue: getTargetForCategory(lowest.category),
      unit: getUnitForCategory(lowest.category),
      why: `Your ${lowest.name} score (${lowest.score}%) is your lowest dimension. This habit directly targets the key factors.`,
      difficulty: 'easy' as const,
      expectedImpact: 'high' as const,
      firstMicroStep: getMicroStepForCategory(lowest.category),
    })
  }

  // 2. Fill missing category
  if (missingCategories.length > 0 && recommendations.length < 5) {
    const cat = missingCategories[0]
    recommendations.push({
      name: getHabitForDimension(cat),
      category: cat,
      frequency: 'daily' as const,
      targetValue: getTargetForCategory(cat),
      unit: getUnitForCategory(cat),
      why: `You have no habits in ${cat}. Adding even one creates category balance and new ripple effects.`,
      difficulty: 'easy' as const,
      expectedImpact: 'medium' as const,
      firstMicroStep: getMicroStepForCategory(cat),
    })
  }

  // 3. Leverage existing strength (habit ripple)
  if (behavioralProfile?.patterns.length && recommendations.length < 5) {
    const strengthHabit = habitSummary
      .filter((h: { completionRate: number }) => h.completionRate > 0.7)
      .sort((a: { completionRate: number }, b: { completionRate: number }) => b.completionRate - a.completionRate)[0]

    if (strengthHabit) {
      recommendations.push({
        name: `Post-${strengthHabit.name} ${getComplementaryHabit(strengthHabit.category)}`,
        category: getComplementaryCategory(strengthHabit.category),
        frequency: 'daily' as const,
        targetValue: 5,
        unit: 'minutes',
        why: `Your ${strengthHabit.name} habit (${Math.round(strengthHabit.completionRate * 100)}%) is a proven anchor. Stacking a micro-habit after it has 80%+ adoption rate.`,
        difficulty: 'easy' as const,
        expectedImpact: 'medium' as const,
        firstMicroStep: `After ${strengthHabit.name}, do 1 minute of ${getComplementaryHabit(strengthHabit.category).toLowerCase()}`,
      })
    }
  }

  // 4. Goal-aligned habit
  if (userGoals.length > 0 && recommendations.length < 5) {
    const goal = userGoals[0].toLowerCase()
    let cat = 'productivity'
    if (goal.includes('health') || goal.includes('fit') || goal.includes('weight')) cat = 'fitness'
    else if (goal.includes('learn') || goal.includes('skill') || goal.includes('career')) cat = 'learning'
    else if (goal.includes('money') || goal.includes('financ') || goal.includes('save')) cat = 'finance'
    else if (goal.includes('sleep') || goal.includes('rest')) cat = 'sleep'
    else if (goal.includes('stress') || goal.includes('anxiety') || goal.includes('mental')) cat = 'mental_health'

    recommendations.push({
      name: getHabitForDimension(cat),
      category: cat,
      frequency: 'daily',
      targetValue: getTargetForCategory(cat),
      unit: getUnitForCategory(cat),
      why: `Directly supports your goal: "${userGoals[0]}". Goal-aligned habits have 3x retention.`,
      difficulty: 'moderate',
      expectedImpact: 'high',
      firstMicroStep: getMicroStepForCategory(cat),
    })
  }

  // 5. Digital wellness (almost everyone needs this)
  if (!habitSummary.some(h => h.category === 'mental_health' || h.name.toLowerCase().includes('screen')) && recommendations.length < 5) {
    recommendations.push({
      name: 'Evening Digital Sunset',
      category: 'mental_health',
      frequency: 'daily',
      targetValue: 60,
      unit: 'minutes before bed',
      why: 'Screen time before bed correlates with next-day focus, mood, and sleep quality across all users.',
      difficulty: 'moderate',
      expectedImpact: 'high',
      firstMicroStep: 'Put phone in another room 15 min before sleep tonight',
    })
  }

  // Pad with generic if needed
  while (recommendations.length < 3) {
    recommendations.push({
      name: 'Daily Movement',
      category: 'fitness',
      frequency: 'daily',
      targetValue: 15,
      unit: 'minutes',
      why: 'Movement is the highest-leverage keystone habit - improves sleep, focus, mood, and health simultaneously.',
      difficulty: 'easy',
      expectedImpact: 'high',
      firstMicroStep: 'Walk around the block once today',
    })
  }

  return { recommendations: recommendations.slice(0, 5) }
}

/**
 * Generate fallback prediction explanation
 */
export function generateFallbackPredictionExplanation(context: FallbackContext): PredictionExplanationResponse {
  const {
    predictions,
    comparativeAnalysis,
    behavioralProfile,
  } = context

  const currentOverall = predictions?.overall || 50
  const improvedOverall = (predictions?.overall || 50) + (comparativeAnalysis?.scoreDifference || 20)

  return {
    currentPathSummary: `If you continue exactly as you are, your overall life score stabilizes around ${currentOverall}%. Your consistency (${Math.round((behavioralProfile?.consistencyScore || 0.7) * 100)}%) keeps you from declining, but without intentional changes, you won't see significant improvement either. Think of it as maintaining your current trajectory - steady but not ascending.`,
    improvedPathSummary: `With targeted changes to your top leverage habits, your overall score could reach ${improvedOverall}% within 6 months. The model projects the biggest gains in ${getLowestDimension(predictions)} and digital wellness. This isn't optimism - it's the math of compounding small changes.`,
    leveragePoints: (comparativeAnalysis?.keyLeveragePoints || [
      'Sleep Consistency',
      'Evening Screen Limit',
      'Daily Movement',
    ]).slice(0, 3).map((habit, i) => ({
      habit,
      impact: i === 0 ? 'High - affects energy, focus, mood, and exercise recovery' :
              i === 1 ? 'High - improves sleep quality and morning productivity' :
                        'Medium - compounds over time for health and mental clarity',
      why: getLeverageWhy(habit),
    })),
    feasibilityExplanation: `Your feasibility score of ${Math.round((comparativeAnalysis?.feasibilityScore || 0.75) * 100)}% means the changes are very achievable given your current consistency level. You're not starting from zero - you have proven you can build habits. The score accounts for your current habit load, consistency patterns, and the difficulty of the recommended changes.`,
    breakEvenExplanation: `Break-even at ${comparativeAnalysis?.timeToBreakEven || 3} months means the effort you invest starts paying visible dividends around then. The first month feels like work, month 2 feels like routine, month 3 feels like results. This is based on habit formation research - the "plateau of latent potential" where effort hasn't yet visible results.`,
    uncertaintyExplanation: `The ranges represent natural life variability - some weeks you'll exceed expectations, others you'll dip. The model accounts for this using historical variance in your data. Focus on the trend over 4+ weeks, not weekly fluctuations. A dip isn't failure - it's data.`,
    closing: `You have more control than you think. The data doesn't determine your future - it illuminates the path. Your next choice matters. The version of you at ${improvedOverall}% isn't a different person - it's you, making slightly better choices, consistently.`,
  }
}

/**
 * Generate fallback coach response
 */
export function generateFallbackCoachResponse(context: FallbackContext): CoachResponse {
  const {
    question = '',
    questionCategory = 'general',
    userName = 'there',
    habitSummary = [],
    predictions,
    behavioralProfile,
  } = context

  const name = userName
  const overallScore = predictions?.overall || 50
  const consistency = Math.round((behavioralProfile?.consistencyScore || 0.7) * 100)

  // Categorize question and give relevant response
  const lowerQuestion = question.toLowerCase()

  let answer = ''
  let followUpQuestions: string[] = []
  let suggestedActions: string[] = []

  if (lowerQuestion.includes('70%') || lowerQuestion.includes('percent') || lowerQuestion.includes('partial')) {
    const partialHabit = habitSummary.find((h: any) => (h.latestProgressPercentage >= 70 && h.latestProgressPercentage < 100) || (h.averageProgressPercentage >= 70 && h.averageProgressPercentage < 100)) || habitSummary[0] || { name: 'Focus Study', latestProgressPercentage: 70 }
    const pct = (partialHabit as any).latestProgressPercentage || 70
    answer = `${name}, hitting **${pct}% completion** on **${partialHabit.name}** is a major success! In our continuous tracking system, 70% is never discarded as a failure—it is classified as **High-Partial Execution**. You've already overcome the activation barrier and captured over two-thirds of the session. That level of consistency produces over 80% of the long-term cognitive and identity compounding benefits.`
    followUpQuestions = ['What usually causes you to stop around the 70% mark?', 'Can we turn the remaining 30% into a 5-minute micro-finish?']
    suggestedActions = ['Celebrate the 70% win—consistency beats perfection', 'Take a 5-minute stretch break before attempting the final 30%']
  } else if (lowerQuestion.includes('improve') || lowerQuestion.includes('better') || lowerQuestion.includes('focus')) {
    answer = `${name}, at ${overallScore}% overall with ${consistency}% consistency, your biggest lever is ${getTopLeverage(habitSummary)}. The data shows this single habit ripples into 3+ other areas.`
    followUpQuestions = ['What time of day works best for this habit?', 'What\'s blocked you before?']
    suggestedActions = ['Set a 21-day streak goal for this habit', 'Track it daily this week']
  } else if (lowerQuestion.includes('sleep') || lowerQuestion.includes('tired') || lowerQuestion.includes('energy')) {
    const sleepHabit = habitSummary.find((h: { category: string }) => h.category === 'sleep')
    if (sleepHabit) {
      answer = `Your ${sleepHabit.name} is at ${Math.round(sleepHabit.completionRate * 100)}% completion with a ${sleepHabit.streak || 0}-day streak. The pattern: weekdays ${sleepHabit.completionRate > 0.7 ? 'strong' : 'inconsistent'}, weekends drop off.`
    } else {
      answer = `You don't have a sleep habit tracked yet. That's a major gap - sleep affects every other dimension. Your ${overallScore}% overall score would likely jump 10-15 points with consistent sleep.`
    }
    followUpQuestions = ['What\'s your current bedtime?', 'What keeps you up?']
    suggestedActions = ['Set a consistent wake time (even weekends)', 'No screens 30 min before bed']
  } else if (lowerQuestion.includes('screen') || lowerQuestion.includes('phone') || lowerQuestion.includes('digital')) {
    answer = `Digital wellness sits at ${predictions?.digital || '?'}%. The clearest pattern: evening screen time after 10 PM predicts next-day focus crashes across all your data. It's not the total hours - it's the timing.`
    followUpQuestions = ['When do you usually put the phone down?', 'What do you do on your phone at night?']
    suggestedActions = ['Phone in another room at 10 PM', 'Replace scrolling with reading/stretching']
  } else if (lowerQuestion.includes('study') || lowerQuestion.includes('learn') || lowerQuestion.includes('focus') || lowerQuestion.includes('productiv')) {
    const studyHabit = habitSummary.find((h: { category: string }) => h.category === 'learning' || h.category === 'productivity')
    answer = studyHabit
      ? `Your ${studyHabit.name} runs at ${Math.round(studyHabit.completionRate * 100)}%. The insight: your best focus days follow good sleep nights (r=0.6+). Fix sleep, focus improves automatically.`
      : `No learning/productivity habit tracked. Your academic score is ${predictions?.academic || '?'}%. Even 20 min/day of focused learning compounds significantly.`
    followUpQuestions = ['When are you sharpest? Morning or evening?', 'What subject excites you?']
    suggestedActions = ['Schedule 25-min focus block at your peak hour', 'Use Pomodoro: 25/5 intervals']
  } else if (lowerQuestion.includes('exercise') || lowerQuestion.includes('workout') || lowerQuestion.includes('fit') || lowerQuestion.includes('move')) {
    const exHabit = habitSummary.find((h: { category: string }) => h.category === 'fitness' || h.category === 'health')
    answer = exHabit
      ? `Your ${exHabit.name} at ${Math.round(exHabit.completionRate * 100)}%. Key finding: you exercise more on days you sleep 7+ hours. The habit stack: sleep → energy → movement.`
      : `No exercise habit yet. Your health score is ${predictions?.health || '?'}%. Start absurdly small - 5 minutes daily beats 60 minutes weekly for habit formation.`
    followUpQuestions = ['What movement do you enjoy?', 'Morning or evening better?']
    suggestedActions = ['5-min daily: walk, stretch, bodyweight', 'Pair with existing habit (after coffee, before shower)']
  } else if (lowerQuestion.includes('money') || lowerQuestion.includes('financ') || lowerQuestion.includes('spend') || lowerQuestion.includes('budget')) {
    answer = `Financial dimension at ${predictions?.financial || '?'}%. Most users underestimate this - it's not about restriction, it's awareness. Simply tracking daily spend for 2 weeks changes behavior automatically.`
    followUpQuestions = ['Do you know where your money goes weekly?', 'Any subscriptions you don\'t use?']
    suggestedActions = ['Log every expense for 14 days', 'Review and cancel 1 unused subscription']
  } else if (lowerQuestion.includes('stress') || lowerQuestion.includes('anxiety') || lowerQuestion.includes('overwhelm') || lowerQuestion.includes('mental')) {
    answer = `Mental health at ${predictions?.personal || '?'}%. Your data shows: days with 5+ min reflection/journaling have 30% lower next-day stress. It's not magic - it's processing.`
    followUpQuestions = ['What triggers stress most?', 'Do you have a decompression ritual?']
    suggestedActions = ['5-min evening brain dump (paper)', 'One "no input" hour daily - no phone, no media']
  } else if (lowerQuestion.includes('api') || lowerQuestion.includes('endpoint') || lowerQuestion.includes('code') || lowerQuestion.includes('program') || lowerQuestion.includes('software') || lowerQuestion.includes('developer')) {
    if (lowerQuestion.includes('api')) {
      answer = `An **API** (Application Programming Interface) is essentially a digital messenger that allows two different pieces of software to communicate and exchange data.

### The Restaurant Analogy:
- **You (The Client)**: You sit at the table with a menu.
- **The Kitchen (The Server / Database)**: Where data lives and business logic happens.
- **The Waiter (The API)**: Takes your order to the kitchen, gets the prepared food, and brings it back to you.

### Core Concepts:
1. **Endpoint**: The specific web address you talk to (e.g., \`GET /api/habits\`, \`POST /api/ai/coach\`).
2. **HTTP Methods**:
   - \`GET\`: Retrieve information.
   - \`POST\`: Submit or create new records.
   - \`PUT\` / \`PATCH\`: Modify existing records.
   - \`DELETE\`: Remove a resource.
3. **JSON**: The clean text format used to package data.

In **Future You**, APIs are what connect your React frontend with your Supabase database and the Google Gemini LLM!`
      followUpQuestions = ['Would you like to see a code example of calling an API?', 'How do REST and GraphQL APIs compare?']
      suggestedActions = ['Inspect the Network tab in Chrome DevTools to see live API calls', 'Try a simple fetch() call in JavaScript']
    } else {
      answer = `Software development and coding are fundamentally about breaking down complex problems into clean, testable sub-problems. Consistency in learning compounds: 60 minutes of daily coding beats a 7-hour marathon on weekends because sleep consolidates syntax and algorithmic reasoning.`
      followUpQuestions = ['What language or technology are you working with?', 'Are you working on a project or learning algorithms?']
      suggestedActions = ['Protect a dedicated 60-90 minute deep work block for coding', 'Always write out pseudocode before typing syntax']
    }
  } else {
    // General coaching
    const topHabit = habitSummary
      .filter((h: { completionRate: number }) => h.completionRate > 0.6)
      .sort((a: { completionRate: number }, b: { completionRate: number }) => b.completionRate - a.completionRate)[0]

    answer = `Great question, ${name}. At ${overallScore}% overall with ${consistency}% consistency, you're ${overallScore >= 70 ? 'in the growth zone' : 'building your foundation'}. ${topHabit ? `Your strongest lever: ${topHabit.name} (${Math.round(topHabit.completionRate * 100)}%).` : 'Focus on establishing 1-2 anchor habits first.'} What specific area feels most alive for you right now?`
    followUpQuestions = ['What would you improve if you could only pick one?', 'What\'s working well that you want more of?']
    suggestedActions = ['Pick ONE habit to double down on this week', 'Track it daily, review Sunday']
  }

  return { answer, followUpQuestions, suggestedActions }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getHabitForDimension(category: string): string {
  const habits: Record<string, string> = {
    health: 'Morning Hydration',
    fitness: 'Daily Movement',
    nutrition: 'Vegetable Serving Tracker',
    sleep: 'Consistent Wake Time',
    mental_health: 'Evening Reflection',
    productivity: 'Top 3 Priorities',
    learning: '20-Min Learning Block',
    finance: 'Daily Spend Log',
    social: 'Connection Outreach',
  }
  return habits[category] || 'Daily Check-in'
}

function getTargetForCategory(category: string): number {
  const targets: Record<string, number> = {
    health: 500,
    fitness: 15,
    nutrition: 3,
    sleep: 7,
    mental_health: 5,
    productivity: 3,
    learning: 20,
    finance: 1,
    social: 1,
  }
  return targets[category] || 1
}

function getUnitForCategory(category: string): string {
  const units: Record<string, string> = {
    health: 'ml',
    fitness: 'minutes',
    nutrition: 'servings',
    sleep: 'hours',
    mental_health: 'minutes',
    productivity: 'tasks',
    learning: 'minutes',
    finance: 'session',
    social: 'interaction',
  }
  return units[category] || 'times'
}

function getMicroStepForCategory(category: string): string {
  const steps: Record<string, string> = {
    health: 'Drink a glass of water upon waking',
    fitness: 'Walk around the block once',
    nutrition: 'Add one vegetable to lunch',
    sleep: 'Set alarm for same wake time tomorrow',
    mental_health: 'Write one sentence about today',
    productivity: 'Write tomorrow\'s top 3 tonight',
    learning: 'Read 2 pages or watch 5 min tutorial',
    finance: 'Log today\'s spending in notes',
    social: 'Send one "thinking of you" text',
  }
  return steps[category] || 'Do the habit for 2 minutes today'
}

function getComplementaryHabit(category: string): string {
  const pairs: Record<string, string> = {
    sleep: 'Morning Hydration',
    fitness: 'Protein Intake',
    learning: 'Note Review',
    productivity: 'Inbox Zero',
    mental_health: 'Gratitude Note',
    finance: 'Expense Log',
    nutrition: 'Meal Prep',
    health: 'Stretch Break',
    social: 'Active Listening',
  }
  return pairs[category] || 'Mindful Breathing'
}

function getComplementaryCategory(category: string): string {
  const pairs: Record<string, string> = {
    sleep: 'health',
    fitness: 'nutrition',
    learning: 'productivity',
    productivity: 'mental_health',
    mental_health: 'sleep',
    finance: 'productivity',
    nutrition: 'health',
    health: 'fitness',
    social: 'mental_health',
  }
  return pairs[category] || 'mental_health'
}

function getLowestDimension(predictions?: Record<string, number>): string {
  if (!predictions) return 'health'
  const dims = [
    { name: 'health', score: predictions.health },
    { name: 'academic/career', score: predictions.academic },
    { name: 'digital wellness', score: predictions.digital },
    { name: 'financial', score: predictions.financial },
    { name: 'personal growth', score: predictions.personal },
  ].sort((a, b) => (a.score || 0) - (b.score || 0))
  return dims[0]?.name || 'health'
}

function getLeverageWhy(habit: string): string {
  const reasons: Record<string, string> = {
    'Sleep Consistency': 'Stabilizes circadian rhythm → better energy, focus, mood, recovery',
    'Evening Screen Limit': 'Reduces blue light → melatonin production → sleep quality → next-day everything',
    'Daily Movement': 'Increases BDNF → neuroplasticity, mood, energy → compounds across all dimensions',
    'Morning Hydration': 'Rehydrates after sleep → cognitive function, metabolism, energy',
    'Top 3 Priorities': 'Reduces decision fatigue → focus on high-leverage work → progress on goals',
    '20-Min Learning Block': 'Identity as learner → career growth, confidence, adaptability',
    'Daily Spend Log': 'Awareness → automatic behavior change → financial control',
    'Evening Reflection': 'Processes day → reduces rumination → better sleep → better tomorrow',
  }
  return reasons[habit] || 'High-leverage keystone habit with proven ripple effects'
}

function getTopLeverage(habits: Array<{ name: string; completionRate: number }>): string {
  const strong = habits.filter(h => h.completionRate > 0.6).sort((a, b) => b.completionRate - a.completionRate)
  return strong[0]?.name || 'establishing an anchor habit'
}

// ============================================================================
// MAIN FALLBACK FUNCTION
// ============================================================================

export interface FallbackType {
  futureLetter: (ctx: FallbackContext) => FutureLetterResponse
  weeklyInsight: (ctx: FallbackContext) => WeeklyInsightResponse
  habitRecommendation: (ctx: FallbackContext) => HabitRecommendationResponse
  predictionExplanation: (ctx: FallbackContext) => PredictionExplanationResponse
  coach: (ctx: FallbackContext) => CoachResponse
}

export const fallbackService: FallbackType = {
  futureLetter: generateFallbackFutureLetter,
  weeklyInsight: generateFallbackWeeklyInsight,
  habitRecommendation: generateFallbackHabitRecommendations,
  predictionExplanation: generateFallbackPredictionExplanation,
  coach: generateFallbackCoachResponse,
}

/**
 * Check if we should use fallback (no API key or API error)
 */
export function shouldUseFallback(geminiAvailable: boolean, lastError?: Error): boolean {
  if (!geminiAvailable) return true
  if (lastError) {
    const errorMessage = lastError.message.toLowerCase()
    // Use fallback for rate limits, network errors, service unavailable
    if (errorMessage.includes('rate limit') ||
        errorMessage.includes('429') ||
        errorMessage.includes('network') ||
        errorMessage.includes('service unavailable') ||
        errorMessage.includes('503') ||
        errorMessage.includes('timeout')) {
      return true
    }
  }
  return false
}

/**
 * Check if Gemini is available (re-export from geminiClient for convenience)
 */
export { isGeminiAvailable } from './geminiClient.js'