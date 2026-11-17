import { useState, useEffect, useCallback } from 'react'
import { fetchHabits, createHabit, updateHabit, deleteHabit, fetchHabitLogs, upsertHabitLog, fetchTodaysLogs } from '../services/api'
import type { Habit, HabitLog, HabitFormData } from '../types'

export function useHabits() {
  const [habits, setHabits] = useState<Habit[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadHabits = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error } = await fetchHabits()
    if (error) {
      setError(error)
    } else {
      setHabits(data || [])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    loadHabits()
  }, [loadHabits])

  const addHabit = async (data: HabitFormData) => {
    const { data: newHabit, error } = await createHabit(data)
    if (error) throw new Error(error)
    setHabits(prev => [...prev, newHabit!])
    return newHabit
  }

  const editHabit = async (id: string, data: Partial<HabitFormData>) => {
    const { data: updatedHabit, error } = await updateHabit(id, data)
    if (error) throw new Error(error)
    setHabits(prev => prev.map(h => h.id === id ? updatedHabit! : h))
    return updatedHabit
  }

  const removeHabit = async (id: string) => {
    const { error } = await deleteHabit(id)
    if (error) throw new Error(error)
    setHabits(prev => prev.filter(h => h.id !== id))
  }

  return { habits, loading, error, refetch: loadHabits, addHabit, editHabit, removeHabit }
}

export function useHabitLogs(habitId: string, startDate?: string, endDate?: string) {
  const [logs, setLogs] = useState<HabitLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadLogs = useCallback(async () => {
    if (!habitId) return
    setLoading(true)
    setError(null)
    const { data, error } = await fetchHabitLogs(habitId, startDate, endDate)
    if (error) {
      setError(error)
    } else {
      setLogs(data || [])
    }
    setLoading(false)
  }, [habitId, startDate, endDate])

  useEffect(() => {
    loadLogs()
  }, [loadLogs])

  const addLog = async (logDate: string, actualValue: number, notes?: string) => {
    const { data: newLog, error } = await upsertHabitLog(habitId, logDate, actualValue, notes)
    if (error) throw new Error(error)
    setLogs(prev => {
      const existing = prev.findIndex(l => l.log_date === logDate)
      if (existing >= 0) {
        const updated = [...prev]
        updated[existing] = newLog!
        return updated
      }
      return [...prev, newLog!]
    })
    return newLog
  }

  const editLog = async (logId: string, actualValue: number, notes?: string) => {
    const { data: updatedLog, error } = await upsertHabitLog(habitId, '', actualValue, notes)
    // Note: we need the log date for upsert, so this might need adjustment
    if (error) throw new Error(error)
    setLogs(prev => prev.map(l => l.id === logId ? updatedLog! : l))
    return updatedLog
  }

  return { logs, loading, error, refetch: loadLogs, addLog, editLog }
}

export function useTodaysLogs(date: string) {
  const [logs, setLogs] = useState<HabitLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadLogs = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error } = await fetchTodaysLogs(date)
    if (error) {
      setError(error)
    } else {
      setLogs(data || [])
    }
    setLoading(false)
  }, [date])

  useEffect(() => {
    loadLogs()
  }, [loadLogs])

  const upsertLog = async (habitId: string, actualValue: number, notes?: string) => {
    const { data: newLog, error } = await upsertHabitLog(habitId, date, actualValue, notes)
    if (error) throw new Error(error)
    setLogs(prev => {
      const existing = prev.findIndex(l => l.habit_id === habitId)
      if (existing >= 0) {
        const updated = [...prev]
        updated[existing] = newLog!
        return updated
      }
      return [...prev, newLog!]
    })
    return newLog
  }

  return { logs, loading, error, refetch: loadLogs, upsertLog }
}