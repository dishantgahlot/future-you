import { useState, useCallback, useEffect } from 'react'
import { predictionsApi } from '../services/api'
import { useAuth } from '../contexts/AuthContext'

export interface PredictionData {
  currentPath: any
  improvedPath: any
  comparativeAnalysis: any
  meta: any
}

export interface WhatIfResult {
  scenario: any
  projections: any
  comparativeToBaseline: any
  feasibilityScore: number
  formatted: any
}

export function usePredictions() {
  const { user } = useAuth()
  const [prediction, setPrediction] = useState<PredictionData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [whatIfResult, setWhatIfResult] = useState<WhatIfResult | null>(null)
  const [whatIfLoading, setWhatIfLoading] = useState(false)
  const [predefinedScenarios, setPredefinedScenarios] = useState<any[]>([])
  const [scenariosLoading, setScenariosLoading] = useState(false)

  const generatePrediction = useCallback(async (options?: {
    dateRange?: { start: string; end: string }
    assumptions?: Record<string, unknown>
    minimumDaysForPersonalized?: number
    enableIllustrativeMode?: boolean
  }) => {
    setLoading(true)
    setError(null)
    try {
      const response = await predictionsApi.generate(options)
      setPrediction(response.data)
      return response.data
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate prediction'
      setError(message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchCurrentPrediction = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await predictionsApi.getCurrent()
      setPrediction(response.data)
      return response.data
    } catch (err) {
      // Don't set error for 404 - just means no prediction exists yet
      if (err instanceof Error && !err.message.includes('404')) {
        setError(err.message)
      }
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const runWhatIf = useCallback(async (
    scenario: {
      id?: string
      name: string
      description: string
      changes: Array<{
        metric: string
        targetValue: number
        timelineMonths?: number
        difficulty?: 'easy' | 'moderate' | 'hard'
      }>
      assumptions?: Record<string, unknown>
    },
    baseProfile?: any
  ) => {
    setWhatIfLoading(true)
    setError(null)
    try {
      const response = await predictionsApi.runWhatIf(scenario, baseProfile)
      setWhatIfResult(response.data)
      return response.data
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to run what-if simulation'
      setError(message)
      throw err
    } finally {
      setWhatIfLoading(false)
    }
  }, [])

  const fetchPredefinedScenarios = useCallback(async () => {
    setScenariosLoading(true)
    try {
      const response = await predictionsApi.getPredefinedScenarios()
      setPredefinedScenarios(response.data)
      return response.data
    } catch (err) {
      console.error('Failed to fetch scenarios:', err)
      return []
    } finally {
      setScenariosLoading(false)
    }
  }, [])

  const runPredefinedScenario = useCallback(async (scenarioId: string) => {
    setWhatIfLoading(true)
    setError(null)
    try {
      const response = await predictionsApi.runPredefinedScenario(scenarioId)
      setWhatIfResult(response.data)
      return response.data
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to run scenario'
      setError(message)
      throw err
    } finally {
      setWhatIfLoading(false)
    }
  }, [])

  const clearWhatIf = useCallback(() => {
    setWhatIfResult(null)
  }, [])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  // Auto-fetch current prediction when user logs in
  useEffect(() => {
    if (user) {
      fetchCurrentPrediction()
    } else {
      setPrediction(null)
    }
  }, [user, fetchCurrentPrediction])

  return {
    prediction,
    loading,
    error,
    whatIfResult,
    whatIfLoading,
    predefinedScenarios,
    scenariosLoading,
    generatePrediction,
    fetchCurrentPrediction,
    runWhatIf,
    fetchPredefinedScenarios,
    runPredefinedScenario,
    clearWhatIf,
    clearError,
  }
}