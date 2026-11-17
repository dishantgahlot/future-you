import { useState, useCallback, useEffect } from 'react'
import { aiApi } from '../services/api'
import type {
  FutureLetter,
  FutureLetterResponse,
  WeeklyInsight,
  WeeklyInsightResponse,
  HabitRecommendation,
  PredictionExplanation,
  CoachSession,
  CoachResponse,
} from '../types'

// ============================================================================
// Future Letters Hook
// ============================================================================

export function useFutureLetters() {
  const [letters, setLetters] = useState<FutureLetter[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchLetters = useCallback(async () => {
    setLoading(true)
    setError(null)
    const result = await aiApi.getFutureLetters()
    if (result.error) {
      setError(result.error)
    } else {
      setLetters(result.data || [])
    }
    setLoading(false)
  }, [])

  const generateLetter = useCallback(async (
    letterType: 'six_month' | 'five_year' | 'current_path',
    regenerate = false
  ): Promise<FutureLetterResponse | null> => {
    setLoading(true)
    setError(null)
    const result = await aiApi.generateFutureLetter(letterType, regenerate)
    if (result.error) {
      setError(result.error)
      setLoading(false)
      return null
    }
    if (result.data?.letter) {
      // Add to letters list if not cached, or update if cached
      setLetters(prev => {
        const exists = prev.find(l => l.letter_type === letterType)
        if (exists && !result.data?.cached) {
          return prev.map(l => l.letter_type === letterType ? result.data!.letter : l)
        }
        if (!exists) {
          return [result.data!.letter, ...prev]
        }
        return prev
      })
    }
    setLoading(false)
    return result.data || null
  }, [])

  const deleteLetter = useCallback(async (id: string) => {
    setError(null)
    const result = await aiApi.deleteFutureLetter(id)
    if (result.error) {
      setError(result.error)
      return false
    }
    setLetters(prev => prev.filter(l => l.id !== id))
    return true
  }, [])

  useEffect(() => {
    fetchLetters()
  }, [fetchLetters])

  return {
    letters,
    loading,
    error,
    fetchLetters,
    generateLetter,
    deleteLetter,
  }
}

// ============================================================================
// Weekly Insight Hook
// ============================================================================

export function useWeeklyInsight() {
  const [insight, setInsight] = useState<WeeklyInsight | null>(null)
  const [insights, setInsights] = useState<WeeklyInsight[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchInsights = useCallback(async (limit = 12) => {
    setLoading(true)
    setError(null)
    const result = await aiApi.getWeeklyInsights(limit)
    if (result.error) {
      setError(result.error)
    } else {
      setInsights(result.data || [])
    }
    setLoading(false)
  }, [])

  const fetchLatestInsight = useCallback(async () => {
    setLoading(true)
    setError(null)
    const result = await aiApi.getLatestWeeklyInsight()
    if (result.error) {
      setError(result.error)
    } else {
      setInsight(result.data)
    }
    setLoading(false)
  }, [])

  const generateInsight = useCallback(async (
    weekStart?: string,
    regenerate = false
  ): Promise<WeeklyInsightResponse | null> => {
    setLoading(true)
    setError(null)
    const result = await aiApi.generateWeeklyInsight(weekStart, regenerate)
    if (result.error) {
      setError(result.error)
      setLoading(false)
      return null
    }
    if (result.data?.insight) {
      setInsight(result.data.insight)
      // Add to insights list
      setInsights(prev => {
        const exists = prev.find(i => i.week_start === result.data?.insight.week_start)
        if (exists) {
          return prev.map(i => i.week_start === result.data!.insight.week_start ? result.data!.insight : i)
        }
        return [result.data!.insight, ...prev]
      })
    }
    setLoading(false)
    return result.data || null
  }, [])

  useEffect(() => {
    fetchLatestInsight()
    fetchInsights()
  }, [fetchLatestInsight, fetchInsights])

  return {
    insight,
    insights,
    loading,
    error,
    fetchInsights,
    fetchLatestInsight,
    generateInsight,
  }
}

// ============================================================================
// Habit Recommendations Hook
// ============================================================================

export function useHabitRecommendations() {
  const [recommendations, setRecommendations] = useState<HabitRecommendation[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchRecommendations = useCallback(async (regenerate = false) => {
    setLoading(true)
    setError(null)
    const result = await aiApi.generateHabitRecommendations(regenerate)
    if (result.error) {
      setError(result.error)
    } else {
      setRecommendations(result.data?.recommendations || [])
    }
    setLoading(false)
    return result.data || null
  }, [])

  const createHabit = useCallback(async (recommendation: HabitRecommendation) => {
    setError(null)
    const result = await aiApi.createHabitFromRecommendation(recommendation)
    if (result.error) {
      setError(result.error)
      return null
    }
    return result.data
  }, [])

  return {
    recommendations,
    loading,
    error,
    fetchRecommendations,
    createHabit,
  }
}

// ============================================================================
// Prediction Explanation Hook
// ============================================================================

export function usePredictionExplanation() {
  const [explanation, setExplanation] = useState<PredictionExplanation | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchExplanation = useCallback(async () => {
    setLoading(true)
    setError(null)
    const result = await aiApi.getPredictionExplanation()
    if (result.error) {
      setError(result.error)
    } else {
      setExplanation(result.data?.explanation || null)
    }
    setLoading(false)
    return result.data || null
  }, [])

  return {
    explanation,
    loading,
    error,
    fetchExplanation,
  }
}

// ============================================================================
// AI Coach Hook
// ============================================================================

interface CoachMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  followUpQuestions?: string[]
  suggestedActions?: string[]
}

export function useAICoach() {
  const [messages, setMessages] = useState<CoachMessage[]>([])
  const [history, setHistory] = useState<CoachSession[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchHistory = useCallback(async (limit = 20) => {
    setError(null)
    const result = await aiApi.getCoachHistory(limit)
    if (result.error) {
      setError(result.error)
    } else {
      setHistory(result.data || [])
      // Convert history to messages format
      const formattedMessages: CoachMessage[] = (result.data || [])
        .reverse()
        .flatMap(session => [
          { role: 'user' as const, content: session.question, timestamp: new Date(session.generated_at) },
          { role: 'assistant' as const, content: session.answer, timestamp: new Date(session.generated_at) },
        ])
      setMessages(formattedMessages)
    }
  }, [])

  const askQuestion = useCallback(async (
    question: string,
    contextType?: string,
    contextData?: Record<string, unknown>
  ): Promise<CoachResponse | null> => {
    setLoading(true)
    setError(null)

    // Add user message immediately
    const userMessage: CoachMessage = {
      role: 'user',
      content: question,
      timestamp: new Date(),
    }
    setMessages(prev => [...prev, userMessage])

    const result = await aiApi.askCoach(question, contextType, contextData)

    if (result.error) {
      setError(result.error)
      // Remove the user message on error
      setMessages(prev => prev.slice(0, -1))
      setLoading(false)
      return null
    }

    if (result.data) {
      const assistantMessage: CoachMessage = {
        role: 'assistant',
        content: result.data.answer,
        timestamp: new Date(),
        followUpQuestions: result.data.followUpQuestions,
        suggestedActions: result.data.suggestedActions,
      }
      setMessages(prev => [...prev, assistantMessage])

      // Refresh history
      fetchHistory()
    }

    setLoading(false)
    return result.data || null
  }, [fetchHistory])

  const clearMessages = useCallback(() => {
    setMessages([])
  }, [])

  useEffect(() => {
    fetchHistory()
  }, [fetchHistory])

  return {
    messages,
    history,
    loading,
    error,
    askQuestion,
    clearMessages,
    fetchHistory,
  }
}

// ============================================================================
// Combined AI Hook (for convenience)
// ============================================================================

export function useAI() {
  const futureLetters = useFutureLetters()
  const weeklyInsight = useWeeklyInsight()
  const habitRecommendations = useHabitRecommendations()
  const predictionExplanation = usePredictionExplanation()
  const aiCoach = useAICoach()

  const loading = futureLetters.loading || weeklyInsight.loading || habitRecommendations.loading ||
    predictionExplanation.loading || aiCoach.loading

  const error = futureLetters.error || weeklyInsight.error || habitRecommendations.error ||
    predictionExplanation.error || aiCoach.error

  return {
    futureLetters,
    weeklyInsight,
    habitRecommendations,
    predictionExplanation,
    aiCoach,
    loading,
    error,
  }
}