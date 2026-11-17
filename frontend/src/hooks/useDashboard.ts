import { useState, useEffect, useCallback } from 'react'
import {
  fetchDashboardStats,
  fetchWeeklyData,
  fetchHeatmapData,
  fetchMonthlyData,
  fetchStreaks,
  fetchProfile,
} from '../services/api'
import type { DashboardStats, WeeklyDataPoint, HeatmapDataPoint, UserProfile } from '../types'

export function useDashboardStats() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadStats = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error } = await fetchDashboardStats()
    if (error) {
      setError(error)
    } else {
      setStats(data)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    loadStats()
  }, [loadStats])

  return { stats, loading, error, refetch: loadStats }
}

export function useWeeklyData(startDate: string, endDate: string) {
  const [data, setData] = useState<WeeklyDataPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error } = await fetchWeeklyData(startDate, endDate)
    if (error) {
      setError(error)
    } else {
      setData(data || [])
    }
    setLoading(false)
  }, [startDate, endDate])

  useEffect(() => {
    loadData()
  }, [loadData])

  return { data, loading, error, refetch: loadData }
}

export function useHeatmapData(habitIds: string[], startDate: string, endDate: string) {
  const [data, setData] = useState<HeatmapDataPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    if (habitIds.length === 0) {
      setData([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    const { data, error } = await fetchHeatmapData(habitIds, startDate, endDate)
    if (error) {
      setError(error)
    } else {
      setData(data || [])
    }
    setLoading(false)
  }, [habitIds.join(','), startDate, endDate])

  useEffect(() => {
    loadData()
  }, [loadData])

  return { data, loading, error, refetch: loadData }
}

export function useMonthlyData(year: number, month: number) {
  const [data, setData] = useState<WeeklyDataPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error } = await fetchMonthlyData(year, month)
    if (error) {
      setError(error)
    } else {
      setData(data || [])
    }
    setLoading(false)
  }, [year, month])

  useEffect(() => {
    loadData()
  }, [loadData])

  return { data, loading, error, refetch: loadData }
}

export function useStreaks() {
  const [streaks, setStreaks] = useState<{ current: number; longest: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadStreaks = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error } = await fetchStreaks()
    if (error) {
      setError(error)
    } else {
      setStreaks(data)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    loadStreaks()
  }, [loadStreaks])

  return { streaks, loading, error, refetch: loadStreaks }
}

export function useProfile() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadProfile = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error } = await fetchProfile()
    if (error) {
      setError(error)
    } else {
      setProfile(data)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    loadProfile()
  }, [loadProfile])

  return { profile, loading, error, refetch: loadProfile }
}