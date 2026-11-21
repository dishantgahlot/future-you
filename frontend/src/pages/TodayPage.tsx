import { useState, useMemo, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCalendarDays, faCodeBranch, faListCheck } from '@fortawesome/free-solid-svg-icons'
import type { Habit, HabitLog } from '../types'
import {
  getLocalHabits,
  saveLocalHabits,
  getAllLocalLogs,
  saveLocalLog,
  getActiveUserId,
  getHabitsForDate,
  isLogForDate,
  autoRecurHabitsForDate,
} from '../utils/habitStorage'
import {
  createHabit,
  updateHabit,
} from '../services/api'
import { syncUserData } from '../services/dataSync'
import { useAuth } from '../contexts/AuthContext'
import { useUserProfile } from '../contexts/UserProfileContext'
import { useAppDate } from '../contexts/DateContext'
import { BotanicalHero } from '../components/botanical/BotanicalHero'
import { QuickStatsBar } from '../components/botanical/QuickStatsBar'
import { TodaysHabitsCard } from '../components/botanical/TodaysHabitsCard'
import { WeeklyInsightsCard } from '../components/botanical/WeeklyInsightsCard'
import { MonthlyInsightsCard } from '../components/botanical/MonthlyInsightsCard'
import { HabitConsistencyCard } from '../components/botanical/HabitConsistencyCard'
import { DailyProgressCard } from '../components/botanical/DailyProgressCard'
import { InsightsModal } from '../components/botanical/InsightsModal'
import { HabitFormModal } from '../components/habits/HabitFormModal'
import { format } from 'date-fns'

export function TodayPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { fullName } = useUserProfile()
  const { selectedDate, setSelectedDate, selectedDateStr, isToday, resetToToday } = useAppDate()

  const [habits, setHabits] = useState<Habit[]>(() => getLocalHabits(user?.id))
  const [allLogs, setAllLogs] = useState<HabitLog[]>(() => getAllLocalLogs(user?.id))
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null)
  const [selectedModalGraph, setSelectedModalGraph] = useState<'weekly' | 'monthly' | null>(null)
  const [modalInitialTab, setModalInitialTab] = useState<'analytics' | 'report'>('analytics')

  // Load all user habits & logs from Supabase
  const loadRemoteData = useCallback(async () => {
    const uid = user?.id || getActiveUserId()
    if (!uid || uid === 'guest-user' || uid === 'demo-user-1') return
    try {
      const res = await syncUserData(uid)
      if (res.success) {
        setHabits(res.habits)
        setAllLogs(res.logs)
      }
    } catch {
      // Graceful fallback to local habits
    }
  }, [user?.id])

  useEffect(() => {
    loadRemoteData()
  }, [loadRemoteData])

  // Automatically recur daily habits for today on load
  useEffect(() => {
    const uid = user?.id || getActiveUserId()
    if (isToday) {
      const recurred = autoRecurHabitsForDate(selectedDateStr, uid)
      if (recurred.length > 0) {
        setHabits(getLocalHabits(uid))
        setAllLogs(getAllLocalLogs(uid))
      }
    }
  }, [isToday, selectedDateStr, user?.id])

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

  // Persist habits to local storage whenever they change, if we have an active user and habits
  useEffect(() => {
    const uid = user?.id || getActiveUserId()
    if (uid && habits.length > 0) {
      saveLocalHabits(habits, uid)
    }
  }, [habits, user?.id])

  // Habits active on the selected date (omits habits created on later dates)
  const habitsForSelectedDate = useMemo(() => {
    return getHabitsForDate(habits, selectedDateStr, allLogs)
  }, [habits, selectedDateStr, allLogs])

  // Logs for current selected day
  const todayLogs = useMemo(() => {
    return allLogs.filter((l) => isLogForDate(l, selectedDateStr))
  }, [allLogs, selectedDateStr])

  // Detailed progress counts for the selected day
  const { completedCount, inProgressCount, pendingCount, dayOverallPercent } = useMemo(() => {
    let completed = 0
    let inProgress = 0
    let pending = 0
    let progressSum = 0

    if (habitsForSelectedDate.length === 0) {
      return { completedCount: 0, inProgressCount: 0, pendingCount: 0, dayOverallPercent: 0 }
    }

    habitsForSelectedDate.forEach((h) => {
      const log = todayLogs.find((l) => l.habit_id === h.id)
      const target = log?.target_value || h.target_value || 1
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

    const overall = Math.round((progressSum / habitsForSelectedDate.length) * 100)
    return {
      completedCount: completed,
      inProgressCount: inProgress,
      pendingCount: pending,
      dayOverallPercent: overall,
    }
  }, [habitsForSelectedDate, todayLogs])

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
      // Create new habit anchored to the currently viewed date
      const habitCreatedAt = `${selectedDateStr}T${new Date().toISOString().slice(11)}`

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
        target_date: selectedDateStr,
        created_at: habitCreatedAt,
        updated_at: new Date().toISOString(),
      }

      setHabits((prev) => [...prev, newHabit])
      // Initialize zero-progress log for this date so it's tied to this day
      saveLocalLog(newHabit.id, selectedDateStr, 0, newHabit.target_value, undefined, newHabit.user_id)
      setAllLogs(getAllLocalLogs(user?.id))

      try {
        await createHabit({
          id: newHabit.id,
          name: newHabit.name,
          description: newHabit.description || '',
          category: newHabit.category,
          frequency: newHabit.frequency,
          target_value: newHabit.target_value,
          unit: newHabit.unit,
          color: newHabit.color,
          color_theme: (newHabit as any).color_theme || 'cream',
          icon: newHabit.icon,
          target_date: newHabit.target_date,
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
        onSelectDate={(d) => setSelectedDate(d)}
        userName={displayName}
      />

      {/* Previous Day & Historical Day Banner: Prompt user to chat with What-If Agent */}
      {!isToday && (
        <div className="bg-[#FAF7F0] dark:bg-[#121D17] border border-[#CCD8B8] dark:border-[#22352B] rounded-2xl px-4 py-2.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 shadow-2xs transition-colors">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#4A6225] text-white flex items-center justify-center text-xs">
              <FontAwesomeIcon icon={faCalendarDays} />
            </div>
            <div>
              <p className="text-xs sm:text-sm font-serif font-bold text-[#1D2516] dark:text-[#F5F2EB]">
                Viewing Record for {format(selectedDate, 'EEEE, MMMM d, yyyy')}
              </p>
              <p className="text-[11px] text-[#5C6E56] dark:text-[#A8BCA0]">
                {completedCount} of {habitsForSelectedDate.length} habits completed ({dayOverallPercent}% execution)
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-stretch sm:self-auto">
            <button
              type="button"
              onClick={() => navigate(`/habits?date=${selectedDateStr}`)}
              className="px-3 py-1.5 rounded-xl bg-[#EAE2D2] hover:bg-[#DDD3BF] dark:bg-[#1E3023] dark:hover:bg-[#28402F] text-[#3D5220] dark:text-[#E2EBD6] text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
            >
              <FontAwesomeIcon icon={faListCheck} className="text-[10px]" />
              <span>Habits of this Day</span>
            </button>
            <button
              type="button"
              onClick={() => navigate(`/scenarios?date=${selectedDateStr}`)}
              className="flex-1 sm:flex-initial px-3 py-1.5 rounded-xl bg-[#4A6225] hover:bg-[#3D521E] text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
            >
              <FontAwesomeIcon icon={faCodeBranch} className="text-[10px]" />
              <span>Ask What-If Agent</span>
            </button>
            <button
              type="button"
              onClick={resetToToday}
              className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-[#16271D] text-[#5C6E56] dark:text-[#A8BCA0] hover:text-[#1D2516] dark:hover:text-white border border-[#CCD8B8] dark:border-[#22352B] text-xs font-semibold transition-colors cursor-pointer"
            >
              Back to Today
            </button>
          </div>
        </div>
      )}

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
        onSelectDate={(d) => setSelectedDate(d)}
      />

      {/* 4. Horizontal Overview Row: 3 Balanced Cards Side-by-Side */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 sm:gap-4 items-stretch">
        <DailyProgressCard
          completed={completedCount}
          inProgress={inProgressCount}
          pending={pendingCount}
          total={habitsForSelectedDate.length}
          overallPercent={dayOverallPercent}
          selectedDate={selectedDate}
        />

        <WeeklyInsightsCard
          allLogs={allLogs}
          habits={habits}
          selectedDate={selectedDate}
          onSelectDate={(d) => setSelectedDate(d)}
          onExpand={() => {
            setSelectedModalGraph('weekly')
            setModalInitialTab('analytics')
          }}
        />

        <MonthlyInsightsCard
          allLogs={allLogs}
          habits={habits}
          selectedDate={selectedDate}
          onSelectDate={(d) => setSelectedDate(d)}
          onExpand={() => {
            setSelectedModalGraph('monthly')
            setModalInitialTab('analytics')
          }}
        />
      </div>

      {/* 5. Full-Width Horizontal Today's Habits Section (3-4 Cards Per Row Across Page) */}
      <TodaysHabitsCard
        habits={habitsForSelectedDate}
        logs={todayLogs}
        onManageHabits={(habitId) =>
          navigate(`/habits?date=${selectedDateStr}${habitId ? `&habitId=${habitId}` : ''}`)
        }
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
