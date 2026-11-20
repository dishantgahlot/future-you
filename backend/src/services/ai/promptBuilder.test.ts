import { describe, it, expect } from 'vitest'
import {
  buildFutureLetterPrompt,
  buildWeeklyInsightPrompt,
  buildHabitRecommendationPrompt,
  buildPredictionExplanationPrompt,
  buildCoachPrompt,
  type UserProfile,
  type HabitSummary,
  type PredictionData,
  type BehavioralProfile,
  type ComparativeAnalysis,
  type WeeklySummary,
  type CoachContext,
} from './promptBuilder.js'

describe('AI Prompt Builder Suite', () => {
  const mockProfile: UserProfile = {
    id: 'user-123',
    fullName: 'Alex Mercer',
    email: 'alex@example.com',
    dateOfBirth: '1995-05-15',
  }

  const mockHabits: HabitSummary[] = [
    {
      id: 'h1',
      name: 'Morning Meditation',
      category: 'mental_health',
      frequency: 'daily',
      targetValue: 15,
      unit: 'mins',
      completionRate: 0.85,
      currentStreak: 12,
      longestStreak: 20,
      totalLogs: 30,
      trend: 'improving',
      averageValue: 15,
      latestProgressPercentage: 100,
    },
    {
      id: 'h2',
      name: 'Daily Hydration',
      category: 'health',
      frequency: 'daily',
      targetValue: 3000,
      unit: 'ml',
      completionRate: 0.65,
      currentStreak: 4,
      longestStreak: 14,
      totalLogs: 28,
      trend: 'stable',
      averageValue: 2400,
      latestProgressPercentage: 80,
    },
  ]

  const mockPredictions: PredictionData = {
    health: {
      current: 72,
      projected: 84,
      uncertaintyRange: { min: 78, max: 89 },
      confidence: 0.88,
      keyFactors: ['Hydration', 'Meditation'],
    },
    academic: {
      current: 70,
      projected: 76,
      uncertaintyRange: { min: 72, max: 80 },
      confidence: 0.82,
      keyFactors: ['Focus blocks'],
    },
    digital: {
      current: 65,
      projected: 78,
      uncertaintyRange: { min: 74, max: 82 },
      confidence: 0.80,
      keyFactors: ['Screen time limit'],
    },
    financial: {
      current: 60,
      projected: 70,
      uncertaintyRange: { min: 66, max: 74 },
      confidence: 0.75,
      keyFactors: ['Weekly budgeting'],
    },
    personal: {
      current: 75,
      projected: 85,
      uncertaintyRange: { min: 80, max: 90 },
      confidence: 0.85,
      keyFactors: ['Consistent journaling'],
    },
    overallScore: 78,
    confidence: 0.84,
  }

  const mockComparative: ComparativeAnalysis = {
    scoreDifference: 15,
    percentageImprovement: 21.4,
    timeToBreakEven: 3,
    feasibilityScore: 0.82,
    keyLeveragePoints: ['Morning Meditation', 'Daily Hydration'],
    assumptions: ['Maintains 80%+ consistency'],
  }

  const mockBehavior: BehavioralProfile = {
    strengths: ['Morning consistency', 'High mindfulness commitment'],
    weaknesses: ['Evening screen time'],
    patterns: ['Higher completion on weekdays vs weekends'],
    consistencyScore: 0.82,
    categoryBalance: { health: 0.5, mental_health: 0.5 },
    habitRipples: [
      { habitA: 'Morning Meditation', habitB: 'Daily Hydration', correlation: 0.76 },
    ],
  }

  describe('buildFutureLetterPrompt', () => {
    it('constructs six-month future letter prompt with user details and habit context', () => {
      const prompt = buildFutureLetterPrompt({
        letterType: 'six_month',
        userProfile: mockProfile,
        habitSummary: mockHabits,
        behavioralProfile: mockBehavior,
        currentPathPrediction: mockPredictions,
        improvedPathPrediction: mockPredictions,
        comparativeAnalysis: mockComparative,
        achievements: [],
        tone: 'encouraging',
      })

      expect(prompt).toContain('Alex Mercer')
      expect(prompt).toContain('6 months from now')
      expect(prompt).toContain('Morning Meditation')
      expect(prompt).toContain('Daily Hydration')
    })

    it('constructs five-year vision prompt with long-term compounding focus', () => {
      const prompt = buildFutureLetterPrompt({
        letterType: 'five_year',
        userProfile: mockProfile,
        habitSummary: mockHabits,
        behavioralProfile: mockBehavior,
        currentPathPrediction: mockPredictions,
        improvedPathPrediction: mockPredictions,
        comparativeAnalysis: mockComparative,
        achievements: [],
        tone: 'visionary',
      })

      expect(prompt).toContain('5 years from now')
      expect(prompt).toContain('Alex Mercer')
    })
  })

  describe('buildWeeklyInsightPrompt', () => {
    it('constructs weekly insight prompt with completion breakdown and ripple effects', () => {
      const mockWeekSummary: WeeklySummary = {
        weekStart: '2026-11-13',
        weekEnd: '2026-11-20',
        totalCompletions: 11,
        totalPossible: 14,
        completionRate: 0.78,
        categoryBreakdown: {
          mental_health: { completed: 6, total: 7, rate: 0.85 },
          health: { completed: 5, total: 7, rate: 0.71 },
        },
        streaks: [
          { habitName: 'Morning Meditation', streak: 12 },
          { habitName: 'Daily Hydration', streak: 4 },
        ],
        improvements: ['Meditation consistency increased by 15%'],
        declines: [],
        comparedToPreviousWeek: {
          completionRateChange: 0.05,
          streaksChanged: [{ habitName: 'Morning Meditation', change: 7 }],
        },
      }

      const prompt = buildWeeklyInsightPrompt({
        weekSummary: mockWeekSummary,
        habitDetails: mockHabits,
        userProfile: mockProfile,
      })

      expect(prompt).toContain('Alex Mercer')
      expect(prompt).toContain('Morning Meditation')
      expect(prompt).toContain('Daily Hydration')
    })
  })

  describe('buildHabitRecommendationPrompt', () => {
    it('constructs personalized recommendations prompt addressing gaps', () => {
      const prompt = buildHabitRecommendationPrompt({
        userProfile: mockProfile,
        habitSummary: mockHabits,
        behavioralProfile: mockBehavior,
        currentPredictions: mockPredictions,
        availableTime: '30 min/day',
      })

      expect(prompt).toContain('Alex Mercer')
      expect(prompt).toContain('firstMicroStep')
    })
  })

  describe('buildPredictionExplanationPrompt', () => {
    it('constructs prediction explanation prompt with leverage points and break-even rationale', () => {
      const prompt = buildPredictionExplanationPrompt({
        currentPath: mockPredictions,
        improvedPath: mockPredictions,
        comparativeAnalysis: mockComparative,
        behavioralProfile: mockBehavior,
        userProfile: mockProfile,
      })

      expect(prompt).toContain('Alex Mercer')
      expect(prompt).toContain('CURRENT PATH')
      expect(prompt).toContain('IMPROVED PATH')
      expect(prompt).toContain('COMPARATIVE ANALYSIS')
      expect(prompt).toContain('Time to Break Even: 3 months')
    })
  })

  describe('buildCoachPrompt', () => {
    it('constructs interactive AI coach prompt with conversation history and context', () => {
      const coachContext: CoachContext = {
        userProfile: mockProfile,
        habitSummary: mockHabits,
        behavioralProfile: mockBehavior,
        currentPredictions: mockPredictions,
        improvedPredictions: mockPredictions,
        comparativeAnalysis: mockComparative,
        recentInsights: ['Meditation consistency high'],
        savedLetters: [],
      }

      const prompt = buildCoachPrompt({
        question: 'How do I maintain my habit while traveling?',
        context: coachContext,
        questionCategory: 'habit',
        conversationHistory: [
          { role: 'user', content: 'Hi coach' },
          { role: 'assistant', content: 'Hello Alex! How can I help your routine today?' },
        ],
      })

      expect(prompt).toContain('traveling')
      expect(prompt).toContain('Alex Mercer')
      expect(prompt).toContain('Morning Meditation')
    })
  })
})
