import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Habit, HabitLog } from '../types'
import {
  getLocalHabits,
  saveLocalHabits,
  getAllLocalLogs,
  getActiveUserId,
} from '../utils/habitStorage'
import {
  fetchHabits,
  createHabit,
  updateHabit,
} from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import { useUserProfile } from '../contexts/UserProfileContext'
import { BotanicalHero } from '../components/botanical/BotanicalHero'
import { QuickStatsBar } from '../components/botanical/QuickStatsBar'
import { TodaysHabitsCard } from '../components/botanical/TodaysHabitsCard'
import { WeeklyInsightsCard } from '../components/botanical/WeeklyInsightsCard'
import { MonthlyInsightsCard } from '../components/botanical/MonthlyInsightsCard'
import { HabitConsistencyCard } from '../components/botanical/HabitConsistencyCard'
import { DailyProgressCard } from '../components/botanical/DailyProgressCard'
import { InsightsModal } from '../components/botanical/InsightsModal'
import { HabitFormModal } from '../components/habits/HabitFormModal'
import { format, isSameDay, parseISO } from 'date-fns'

export function TodayPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { fullName } = useUserProfile()

  // Selected date defaults to current live date
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date())
  const [habits, setHabits] = useState<Habit[]>(() => getLocalHabits(user?.id))
  const [allLogs, setAllLogs] = useState<HabitLog[]>(() => getAllLocalLogs(user?.id))
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null)
  const [selectedModalGraph, setSelectedModalGraph] = useState<'weekly' | 'monthly' | null>(null)
  const [modalInitialTab, setModalInitialTab] = useState<'analytics' | 'report'>('analytics')

  // Track live real-world date to handle automatic midnight & new-day reset
  const lastRealDateStrRef = useRef<string>(format(new Date(), 'yyyy-MM-dd'))
  const wasDateManuallyPickedRef = useRef<boolean>(false)

  // Live midnight & day-rollover monitor:
  // Automatically advances to the new day and resets daily progress bar and daily habits to 0%,
  // while preserving all accumulated logs in allLogs for weekly and monthly insights.
  useEffect(() => {
    const handleDayCheck = () => {
      const currentRealDayStr = format(new Date(), 'yyyy-MM-dd')
      if (currentRealDayStr !== lastRealDateStrRef.current) {
        lastRealDateStrRef.current = currentRealDayStr
        // If the user hasn't explicitly locked onto a historical past date:
        if (!wasDateManuallyPickedRef.current || isSameDay(selectedDate, parseISO(lastRealDateStrRef.current))) {
          wasDateManuallyPickedRef.current = false
          setSelectedDate(new Date())
        }
        // Sync storage and notify rest of app
        setHabits(getLocalHabits(user?.id))
        setAllLogs(getAllLocalLogs(user?.id))
        window.dispatchEvent(new CustomEvent('future-you-day-rollover', { detail: { date: currentRealDayStr } }))
      }
    }

    const interval = setInterval(handleDayCheck, 15000)
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        handleDayCheck()
      }
    }

    window.addEventListener('focus', handleDayCheck)
    document.addEventListener('visibilitychange', handleVisibility)
    return () => {
      clearInterval(interval)
      window.removeEventListener('focus', handleDayCheck)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [user?.id, selectedDate])

  // Load habits from backend / Supabase when available
  const loadRemoteHabits = useCallback(async () => {
    if (!user) return
    try {
      const res = await fetchHabits()
      if (res.data && Array.isArray(res.data) && res.data.length > 0) {
        setHabits(res.data)
        saveLocalHabits(res.data, user.id)
      }
    } catch {
      // Graceful fallback to local habits
    }
  }, [user])

  useEffect(() => {
    loadRemoteHabits()
  }, [loadRemoteHabits])

  // Listen to mobile nav quick add event
  useEffect(() => {
    const handleQuickAdd = () => {
      setEditingHabit(null)
      setShowAddModal(true)
    }
    window.addEventListener('open-add-habit-modal', handleQuickAdd)
    return () => window.removeEventListener('open-add-habit-modal', handleQuickAdd)
  }, [])

  // Synchronize state when storage changes or user changes
  useEffect(() => {
    const handleSync = () => {
      setHabits(getLocalHabits(user?.id))
      setAllLogs(getAllLocalLogs(user?.id))
    }
    handleSync()
    window.addEventListener('future-you-storage-updated', handleSync)
    window.addEventListener('storage', handleSync)
    window.addEventListener('focus', handleSync)
    return () => {
      window.removeEventListener('future-you-storage-updated', handleSync)
      window.removeEventListener('storage', handleSync)
      window.removeEventListener('focus', handleSync)
    }
  }, [user?.id])

  // Persist habits to local storage whenever they change
  useEffect(() => {
    saveLocalHabits(habits)
  }, [habits])

  const selectedDateStr = format(selectedDate, 'yyyy-MM-dd')

  // Logs for current selected day
  const todayLogs = useMemo(() => {
    return allLogs.filter((l) => l.log_date === selectedDateStr)
  }, [allLogs, selectedDateStr])

  // Detailed progress counts for the selected day
  const { completedCount, inProgressCount, pendingCount, dayOverallPercent } = useMemo(() => {
    let completed = 0
    let inProgress = 0
    let pending = 0
    let progressSum = 0

    if (habits.length === 0) {
      return { completedCount: 0, inProgressCount: 0, pendingCount: 0, dayOverallPercent: 0 }
    }

    habits.forEach((h) => {
      const log = todayLogs.find((l) => l.habit_id === h.id)
      const target = h.target_value || 1
      const actual = log?.actual_value !== undefined ? log.actual_value : log?.completion_status ? target : 0
      const ratio = Math.min(actual / target, 1)
      progressSum += ratio

      if (actual >= target && target > 0) {
        completed++
      } else if (actual > 0) {
        inProgress++
      } else {
        pending++
      }
    })

    const overall = Math.round((progressSum / habits.length) * 100)
    return {
      completedCount: completed,
      inProgressCount: inProgress,
      pendingCount: pending,
      dayOverallPercent: overall,
    }
  }, [habits, todayLogs])

  // Handle save (create or update) habit
  const handleSaveHabit = async (habitData: Partial<Habit>) => {
    if (editingHabit) {
      // Update existing habit
      const updated = { ...editingHabit, ...habitData, updated_at: new Date().toISOString() } as Habit
      setHabits((prev) =>
        prev.map((h) => (h.id === editingHabit.id ? updated : h))
      )
      try {
        await updateHabit(editingHabit.id, {
          name: updated.name,
          description: updated.description || '',
          category: updated.category,
          frequency: updated.frequency,
          target_value: updated.target_value,
          unit: updated.unit,
          color: updated.color,
          icon: updated.icon,
        })
      } catch {
        // Saved locally
      }
    } else {
      // Create new habit
      const newHabit: Habit = {
        id: crypto.randomUUID(),
        user_id: user?.id || getActiveUserId(),
        name: habitData.name || 'New Habit',
        description: habitData.description || null,
        category: habitData.category || 'health',
        frequency: habitData.frequency || 'daily',
        target_value: habitData.target_value || 1,
        unit: habitData.unit || 'times',
        color: habitData.color || '#738541',
        icon: habitData.icon || 'leaf',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      setHabits((prev) => [...prev, newHabit])

      try {
        await createHabit({
          name: newHabit.name,
          description: newHabit.description || '',
          category: newHabit.category,
          frequency: newHabit.frequency,
          target_value: newHabit.target_value,
          unit: newHabit.unit,
          color: newHabit.color,
          icon: newHabit.icon,
        })
      } catch {
        // Saved locally
      }
    }
    setEditingHabit(null)
    setShowAddModal(false)
  }

  const displayName = fullName || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Friend'

  return (
    <div className="space-y-3.5 sm:space-y-4">
      {/* 1. Botanical Hero Banner with Yellowish-Green Glow & Calendar Strip */}
      <BotanicalHero
        selectedDate={selectedDate}
        onSelectDate={(d) => {
          wasDateManuallyPickedRef.current = !isSameDay(d, new Date())
          setSelectedDate(d)
        }}
        userName={displayName}
      />

      {/* 2. 4-Card Quick Stats Bar Directly Below Hero */}
      <QuickStatsBar
        allLogs={allLogs}
        habits={habits}
        todayLogs={todayLogs}
        selectedDate={selectedDate}
      />

      {/* 3. Full-Width Habit Consistency Heatmap (All 12 Months, Full Year, Just Like GitHub) */}
      <HabitConsistencyCard
        allLogs={allLogs}
        habits={habits}
        selectedDate={selectedDate}
        onSelectDate={(d) => {
          wasDateManuallyPickedRef.current = !isSameDay(d, new Date())
          setSelectedDate(d)
        }}
      />

      {/* 4. Horizontal Overview Row: 3 Balanced Cards Side-by-Side */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 sm:gap-4 items-stretch">
        <DailyProgressCard
          completed={completedCount}
          inProgress={inProgressCount}
          pending={pendingCount}
          total={habits.length || 6}
          overallPercent={dayOverallPercent}
          selectedDate={selectedDate}
        />

        <WeeklyInsightsCard
          allLogs={allLogs}
          habits={habits}
          selectedDate={selectedDate}
          onSelectDate={(d) => {
            wasDateManuallyPickedRef.current = !isSameDay(d, new Date())
            setSelectedDate(d)
          }}
          onExpand={() => {
            setSelectedModalGraph('weekly')
            setModalInitialTab('analytics')
          }}
        />

        <MonthlyInsightsCard
          allLogs={allLogs}
          habits={habits}
          selectedDate={selectedDate}
          onSelectDate={(d) => {
            wasDateManuallyPickedRef.current = !isSameDay(d, new Date())
            setSelectedDate(d)
          }}
          onExpand={() => {
            setSelectedModalGraph('monthly')
            setModalInitialTab('analytics')
          }}
        />
      </div>

      {/* 5. Full-Width Horizontal Today's Habits Section (3-4 Cards Per Row Across Page) */}
      <TodaysHabitsCard
        habits={habits}
        logs={todayLogs}
        onManageHabits={() => navigate('/habits')}
        selectedDate={selectedDate}
      />

      {/* Full Expanded Graph & AI Progress Report Modal with Blur Background */}
      <InsightsModal
        isOpen={selectedModalGraph !== null}
        onClose={() => setSelectedModalGraph(null)}
        initialTab={modalInitialTab}
        selectedType={selectedModalGraph || 'weekly'}
        allLogs={allLogs}
        habits={habits}
        selectedDate={selectedDate}
        userName={displayName}
      />

      {/* Add / Edit Habit Modal */}
      <HabitFormModal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false)
          setEditingHabit(null)
        }}
        onSave={handleSaveHabit}
        editingHabit={editingHabit}
      />
    </div>
  )
}
