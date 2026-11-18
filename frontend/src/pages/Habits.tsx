import { useState, useMemo, useEffect } from 'react'
import { motion } from 'framer-motion'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faPlus,
  faMinus,
  faMagnifyingGlass,
  faTrash,
  faPenToSquare,
  faPlay,
  faPause,
  faSun,
  faMoon,
  faBookOpen,
  faDumbbell,
  faPersonWalking,
  faDroplet,
  faMobileScreen,
  faSpa,
  faBrain,
  faAppleWhole,
  faHeartPulse,
  faSeedling,
  faLeaf,
  faBullseye,
  faCheck,
  faXmark,
} from '@fortawesome/free-solid-svg-icons'
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core'
import type { Habit, HabitCategory, HabitLog } from '../types'
import {
  getLocalHabits,
  saveLocalHabits,
  deleteLocalHabit,
  getAllLocalLogs,
  saveLocalLog,
  getActiveUserId,
} from '../utils/habitStorage'
import { deleteHabit, updateHabit, upsertHabitLog, createHabit } from '../services/api'
import { HabitFormModal } from '../components/habits/HabitFormModal'
import { format } from 'date-fns'

const CATEGORY_FILTERS: { value: HabitCategory | 'all'; label: string; icon: IconDefinition }[] = [
  { value: 'all', label: 'All', icon: faLeaf },
  { value: 'health', label: 'Health', icon: faHeartPulse },
  { value: 'sleep', label: 'Sleep', icon: faMoon },
  { value: 'learning', label: 'Learning', icon: faBookOpen },
  { value: 'fitness', label: 'Fitness', icon: faDumbbell },
  { value: 'productivity', label: 'Focus', icon: faMobileScreen },
  { value: 'mental_health', label: 'Mind', icon: faSpa },
  { value: 'nutrition', label: 'Nutrition', icon: faAppleWhole },
]

const STICKY_THEMES = ['cream', 'sage', 'kraft', 'lavender', 'peach', 'chamomile'] as const
type StickyTheme = (typeof STICKY_THEMES)[number]

const THEME_FALLBACK_BG: Record<StickyTheme, string> = {
  cream: 'bg-[#FBF8EF] dark:bg-[#121E17]',
  sage: 'bg-[#EFF5E8] dark:bg-[#132219]',
  kraft: 'bg-[#F7EFE1] dark:bg-[#162016]',
  lavender: 'bg-[#F3EEF8] dark:bg-[#151D21]',
  peach: 'bg-[#FDF0E6] dark:bg-[#1A2016]',
  chamomile: 'bg-[#FAF6E4] dark:bg-[#172217]',
}

function getHabitTheme(habit: Habit, index: number): StickyTheme {
  if (habit.color_theme && (STICKY_THEMES as readonly string[]).includes(habit.color_theme)) {
    return habit.color_theme as StickyTheme
  }
  const cat = (habit.category || '').toLowerCase()
  if (cat === 'sleep') return index % 2 === 0 ? 'lavender' : 'cream'
  if (cat === 'learning') return 'kraft'
  if (cat === 'fitness') return index % 2 === 0 ? 'sage' : 'peach'
  if (cat === 'productivity') return 'chamomile'
  if (cat === 'nutrition') return 'peach'
  if (cat === 'mental_health') return 'sage'
  if (cat === 'health') return 'cream'
  return STICKY_THEMES[index % STICKY_THEMES.length]
}

function getHabitIconDef(habit: Habit): IconDefinition {
  const name = habit.name.toLowerCase()
  const cat = (habit.category || '').toLowerCase()

  if (name.includes('sleep') || cat.includes('sleep') || name.includes('bed')) return faMoon
  if (name.includes('study') || name.includes('focus') || name.includes('learn') || cat.includes('learning')) return faBookOpen
  if (name.includes('workout') || name.includes('gym') || name.includes('exercise') || cat.includes('fitness')) return faDumbbell
  if (name.includes('walk') || name.includes('step') || name.includes('run')) return faPersonWalking
  if (name.includes('hydrat') || name.includes('water')) return faDroplet
  if (name.includes('sun') || (name.includes('morning') && !name.includes('hydrat'))) return faSun
  if (name.includes('screen') || name.includes('phone')) return faMobileScreen
  if (name.includes('mind') || name.includes('meditat') || cat.includes('mental')) return faSpa
  if (name.includes('brain') || name.includes('dopamine')) return faBrain
  if (name.includes('diet') || name.includes('food') || cat.includes('nutrition')) return faAppleWhole
  if (name.includes('target') || name.includes('goal')) return faBullseye
  return faSeedling
}

function getHabitStep(habit: Habit): number {
  const target = habit.target_value || 1
  const unit = (habit.unit || '').toLowerCase()

  if (unit === 'ml' || target >= 1000) return 250
  if (unit === 'min' || unit === 'm' || (target >= 30 && target <= 120)) return 15
  if (unit === 'pages' || target >= 20) return 5
  if (target <= 5) return 0.5
  if (target <= 12) return 1
  return Math.max(1, Math.round(target / 10))
}

function formatUnit(unit?: string): string {
  if (!unit) return ''
  const u = unit.toLowerCase()
  if (u === 'min' || u === 'minutes' || u === 'mins') return 'm'
  if (u === 'hours' || u === 'hr' || u === 'hrs') return 'h'
  return unit
}

export function Habits() {
  const [habits, setHabits] = useState<Habit[]>(() => getLocalHabits())
  const [logs, setLogs] = useState<HabitLog[]>(() => getAllLocalLogs())
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<HabitCategory | 'all'>('all')
  const [showModal, setShowModal] = useState(false)
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null)
  const [deletingConfirmId, setDeletingConfirmId] = useState<string | null>(null)

  const todayStr = useMemo(() => format(new Date(), 'yyyy-MM-dd'), [])

  useEffect(() => {
    const handleQuickAdd = () => {
      setEditingHabit(null)
      setShowModal(true)
    }
    window.addEventListener('open-add-habit-modal', handleQuickAdd)
    return () => window.removeEventListener('open-add-habit-modal', handleQuickAdd)
  }, [])

  useEffect(() => {
    saveLocalHabits(habits)
  }, [habits])

  // Sync logs and habits from storage if changed externally
  useEffect(() => {
    const syncState = () => {
      setHabits(getLocalHabits())
      setLogs(getAllLocalLogs())
    }
    window.addEventListener('future-you-storage-updated', syncState)
    return () => window.removeEventListener('future-you-storage-updated', syncState)
  }, [])

  // Filtered habits
  const filteredHabits = useMemo(() => {
    return habits.filter((habit) => {
      const matchesSearch =
        habit.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        habit.description?.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesCat =
        selectedCategory === 'all' || habit.category === selectedCategory
      return matchesSearch && matchesCat
    })
  }, [habits, searchQuery, selectedCategory])

  const activeCount = habits.filter((h) => h.is_active).length
  const completedTodayCount = habits.filter((h) => {
    const log = logs.find((l) => l.habit_id === h.id && l.log_date === todayStr)
    return log?.completion_status
  }).length

  // Update progress value for today
  const handleUpdateProgress = async (habit: Habit, nextVal: number) => {
    const clampedVal = Math.max(0, Math.round(nextVal * 10) / 10)
    const target = habit.target_value || 1

    const updatedLog = saveLocalLog(habit.id, todayStr, clampedVal, target)
    setLogs((prev) => {
      const filtered = prev.filter((l) => !(l.habit_id === habit.id && l.log_date === todayStr))
      return [...filtered, updatedLog]
    })

    try {
      await upsertHabitLog(habit.id, todayStr, clampedVal)
    } catch {
      // Local copy saved safely
    }
  }

  // Plus / Minus step handlers
  const handleStep = (habit: Habit, deltaMultiplier: number) => {
    const log = logs.find((l) => l.habit_id === habit.id && l.log_date === todayStr)
    const actualVal =
      log?.actual_value !== undefined
        ? log.actual_value
        : log?.completion_status
        ? habit.target_value
        : 0
    const step = getHabitStep(habit)
    const nextVal = Math.max(0, actualVal + step * deltaMultiplier)
    handleUpdateProgress(habit, nextVal)
  }

  // Toggle Mark as Done (0 <-> 100%)
  const handleToggleDone = (habit: Habit) => {
    const log = logs.find((l) => l.habit_id === habit.id && l.log_date === todayStr)
    const isDone = log?.completion_status || false
    const nextVal = isDone ? 0 : habit.target_value || 1
    handleUpdateProgress(habit, nextVal)
  }

  // Toggle Active / Paused
  const handleToggleActive = async (habit: Habit) => {
    const updated = { ...habit, is_active: !habit.is_active, updated_at: new Date().toISOString() }
    setHabits((prev) => prev.map((h) => (h.id === habit.id ? updated : h)))
    try {
      await updateHabit(habit.id, { is_active: updated.is_active } as any)
    } catch {
      // Local state preserved
    }
  }

  // Delete Habit
  const handleDelete = async (id: string) => {
    deleteLocalHabit(id)
    setHabits((prev) => prev.filter((h) => h.id !== id))
    setDeletingConfirmId(null)
    try {
      await deleteHabit(id)
    } catch {
      // Local deletion completed
    }
  }

  // Save (Create or Edit) Habit Modal Handler
  const handleSaveModalHabit = async (data: Partial<Habit>) => {
    if (editingHabit) {
      const updated: Habit = {
        ...editingHabit,
        ...data,
        color_theme: data.color_theme || editingHabit.color_theme,
        updated_at: new Date().toISOString(),
      } as Habit
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
      const assignedTheme =
        data.color_theme ||
        STICKY_THEMES[habits.length % STICKY_THEMES.length]

      const newHabit: Habit = {
        id: crypto.randomUUID(),
        user_id: getActiveUserId(),
        name: data.name || 'New Habit',
        description: data.description || null,
        category: data.category || 'health',
        frequency: data.frequency || 'daily',
        target_value: data.target_value || 1,
        unit: data.unit || 'times',
        color: data.color || '#738541',
        color_theme: assignedTheme,
        icon: data.icon || 'leaf',
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
    setShowModal(false)
  }

  return (
    <div className="space-y-4 sm:space-y-5 max-w-7xl mx-auto pb-8 sm:pb-0">
      {/* 1. Header Banner ("Habit Studio" with watercolor botanical landscape & quote) */}
      <div className="bg-[#FAF7F0] dark:bg-[#0D1814] rounded-3xl border border-[#E9E1D2] dark:border-[#223326] p-4 sm:p-6 md:p-7 shadow-[0_2px_12px_rgba(29,37,22,0.03)] relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors">
        {/* Watercolor botanical background on right */}
        <div className="absolute right-0 top-0 bottom-0 w-full sm:w-2/3 md:w-1/2 pointer-events-none opacity-85 dark:opacity-40 overflow-hidden">
          <svg
            viewBox="0 0 600 220"
            preserveAspectRatio="xMaxYMid slice"
            className="w-full h-full"
            fill="none"
          >
            <defs>
              <linearGradient id="hillWash1" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#EAE1CF" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#DFE7D2" stopOpacity="0.65" />
              </linearGradient>
              <linearGradient id="hillWash2" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#D5E0C5" stopOpacity="0.45" />
                <stop offset="100%" stopColor="#BFCEA9" stopOpacity="0.7" />
              </linearGradient>
              <linearGradient id="bannerLeafGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#8DA868" />
                <stop offset="100%" stopColor="#556C36" />
              </linearGradient>
            </defs>
            {/* Watercolor hills */}
            <path
              d="M 50 220 Q 200 150 350 170 T 520 140 T 600 120 L 600 220 Z"
              fill="url(#hillWash1)"
            />
            <path
              d="M 220 220 Q 340 140 460 160 T 600 130 L 600 220 Z"
              fill="url(#hillWash2)"
            />
            {/* Botanical eucalyptus branch */}
            <g stroke="#617643" strokeWidth="1.8" strokeLinecap="round" fill="none">
              <path d="M 360 190 Q 430 160 500 120 T 590 70" />
              <path d="M 430 155 Q 410 125 435 95" />
              <path d="M 470 135 Q 510 105 495 75" />
              <path d="M 520 110 Q 545 75 565 55" />
              <path d="M 555 90 Q 580 80 595 55" />
            </g>
            {/* Soft watercolor eucalyptus leaves */}
            <g fill="url(#bannerLeafGrad)" fillOpacity="0.65" stroke="#485B2E" strokeWidth="0.8">
              <ellipse cx="432" cy="94" rx="13" ry="21" transform="rotate(-25 432 94)" />
              <ellipse cx="450" cy="125" rx="11" ry="18" transform="rotate(35 450 125)" />
              <ellipse cx="495" cy="74" rx="14" ry="23" transform="rotate(15 495 74)" />
              <ellipse cx="515" cy="105" rx="12" ry="19" transform="rotate(-40 515 105)" />
              <ellipse cx="560" cy="55" rx="13" ry="21" transform="rotate(25 560 55)" />
              <ellipse cx="575" cy="85" rx="12" ry="18" transform="rotate(-30 575 85)" />
            </g>
          </svg>
        </div>

        {/* Banner Content */}
        <div className="relative z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#DFEACF] dark:bg-[#253A1D] text-[#435824] dark:text-[#B6DB8A] text-[11px] font-bold uppercase tracking-wider mb-2 shadow-2xs border border-transparent dark:border-[#385926]">
            <FontAwesomeIcon icon={faLeaf} className="w-3 h-3 text-[#5A732E] dark:text-[#98C45A]" />
            <span>Habit Architecture</span>
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-serif font-bold text-[#1D2516] dark:text-[#F5F2EB] tracking-tight">
            Habit Studio
          </h1>
          <p className="font-serif italic text-xs sm:text-sm text-[#4E5642] dark:text-[#CBD8BF] mt-1.5">
            "We do not rise to the level of our goals; we fall to the level of our systems."
          </p>
        </div>

        {/* Action Button */}
        <button
          type="button"
          onClick={() => {
            setEditingHabit(null)
            setShowModal(true)
          }}
          className="self-start md:self-center relative z-10 inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#4A6225] hover:bg-[#3D521E] dark:bg-[#4E6826] dark:hover:bg-[#41581F] active:scale-98 text-white text-xs sm:text-sm font-semibold shadow-xs transition-all cursor-pointer border border-transparent dark:border-[#5E7E2E]"
        >
          <FontAwesomeIcon icon={faPlus} className="w-3.5 h-3.5" />
          <span>New Habit</span>
        </button>
      </div>

      {/* 2. Filter Bar & Search Box */}
      <div className="bg-white/95 dark:bg-[#0E1714] rounded-2xl border border-[#E8E2D5] dark:border-[#203024] p-2.5 sm:p-3 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5 sm:gap-3 transition-colors">
        {/* Category Pills - Wraps naturally on mobile without horizontal scroll */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 py-0.5 w-full">
          {CATEGORY_FILTERS.map((tab) => {
            const isSelected = selectedCategory === tab.value
            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => setSelectedCategory(tab.value)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs whitespace-nowrap transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#DFEACF] dark:bg-[#3A5222] text-[#3D5220] dark:text-[#E2EBD6] border border-[#CCD8B8] dark:border-[#4E6E2E] font-bold shadow-2xs'
                    : 'bg-[#FAF8F3] dark:bg-[#142019] text-[#6F6759] dark:text-[#A8BCA0] hover:text-[#1D2516] dark:hover:text-white hover:bg-[#F2ECE0] dark:hover:bg-[#1A2A21] border border-transparent dark:border-[#203024] font-medium'
                }`}
              >
                <FontAwesomeIcon icon={tab.icon} className="text-[11px]" />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </div>

        {/* Search & Completion Counter */}
        <div className="flex items-center gap-2 sm:gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-56 min-w-0">
            <FontAwesomeIcon
              icon={faMagnifyingGlass}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[#8A9280] dark:text-[#6E8268]"
            />
            <input
              type="search"
              placeholder="Search habits..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-[#F6F3EB]/70 dark:bg-[#0A120E] border border-[#E8E2D5] dark:border-[#223528] rounded-full text-xs text-[#1D2516] dark:text-[#F5F2EB] placeholder:text-[#8A9280] dark:placeholder:text-[#6E8268] focus:outline-none focus:border-[#738541] dark:focus:border-[#82A84E] font-medium"
            />
          </div>

          <div className="px-2.5 sm:px-3 py-1.5 rounded-full bg-[#FAF8F3] dark:bg-[#142019] border border-[#E8E2D5] dark:border-[#223528] text-[11px] sm:text-xs font-semibold text-[#6F6759] dark:text-[#A8BCA0] whitespace-nowrap inline-flex items-center gap-1 shrink-0">
            <span className="text-[#1D2516] dark:text-[#F5F2EB] font-bold">{completedTodayCount}/{activeCount}</span>
            <span>done today</span>
          </div>
        </div>
      </div>

      {/* 3. Authentic Sticky Note Habit Cards Grid (Using Uploaded Real Sticky Note Background with Different Colors) */}
      {filteredHabits.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5 pt-2">
          {filteredHabits.map((habit, index) => {
            const icon = getHabitIconDef(habit)
            const log = logs.find((l) => l.habit_id === habit.id && l.log_date === todayStr)
            const isDone = log?.completion_status || false
            const actualVal =
              log?.actual_value !== undefined
                ? log.actual_value
                : isDone
                ? habit.target_value
                : 0
            const targetVal = habit.target_value || 1
            const percent = Math.min(Math.round((actualVal / targetVal) * 100), 100)
            const unitDisplay = formatUnit(habit.unit)
            const theme = getHabitTheme(habit, index)

            return (
              <motion.div
                key={habit.id}
                layout
                className={`relative isolate flex flex-col justify-between sm:min-h-[245px] pt-4.5 pb-4 px-4 sm:pt-9 sm:pb-6 sm:px-6 select-none transition-all group overflow-visible rounded-2xl border border-[#E5DDD0] sm:border-none ${
                  THEME_FALLBACK_BG[theme]
                } dark:border-[#223528] shadow-xs sm:shadow-none ${
                  !habit.is_active ? 'opacity-60' : ''
                }`}
              >
                {/* Mobile Stationery Accent Tab: Decorative Washi Tape at Top-Center */}
                <div className="sm:hidden absolute -top-2 left-1/2 -translate-x-1/2 w-14 h-3.5 rounded-xs bg-[#E5D7B7]/80 dark:bg-[#324536]/80 border border-[#C8B895]/50 dark:border-[#435C48]/60 shadow-2xs z-20 pointer-events-none flex items-center justify-center">
                  <span className="w-8 h-px border-t border-dashed border-[#A89874]/40 dark:border-[#73946B]/40" />
                </div>

                {/* Real Sticky Note Background Image with torn edges, washi tape, and turned-up dog-ear corner (Desktop & Tablet only) */}
                <picture className="hidden sm:block absolute inset-0 w-full h-full pointer-events-none select-none z-0">
                  <source srcSet={`/botanical/sticky-${theme}.webp`} type="image/webp" />
                  <img
                    src={`/botanical/sticky-${theme}.png`}
                    alt=""
                    loading="eager"
                    decoding="sync"
                    className="w-full h-full object-fill pointer-events-none select-none drop-shadow-sm dark:brightness-[0.25] dark:contrast-[1.12] dark:saturate-[1.15] transition-all"
                  />
                </picture>

                {/* Top Section: Icon, Habit Name, Subtitle, and Mark Done Toggle */}
                <div className="relative z-10">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      {/* Icon */}
                      <div className="w-8 h-8 sm:w-6 sm:h-6 rounded-xl sm:rounded-none bg-[#1D2516]/5 sm:bg-transparent dark:bg-white/10 sm:dark:bg-transparent flex items-center justify-center text-[#232B1C] dark:text-[#E2EBD6] text-sm sm:text-base flex-shrink-0">
                        <FontAwesomeIcon icon={icon} />
                      </div>

                      {/* Name & Target */}
                      <div className="min-w-0 flex-1">
                        <h3 className="font-serif font-bold text-base sm:text-[17px] text-[#1D2516] dark:text-[#F5F2EB] leading-tight truncate">
                          {habit.name}
                        </h3>
                        <p className="text-[11px] sm:text-xs text-[#556244] dark:text-[#CBD8BF] font-medium truncate mt-0.5">
                          {habit.target_value} {unitDisplay} · {habit.frequency}
                        </p>
                      </div>
                    </div>

                    {/* Right side: Mark Done Toggle Pill */}
                    <button
                      type="button"
                      onClick={() => handleToggleDone(habit)}
                      className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer inline-flex items-center gap-1 shadow-2xs flex-shrink-0 ${
                        isDone
                          ? 'bg-[#4A6225] hover:bg-[#3D521E] dark:bg-[#4E6826] dark:hover:bg-[#41581F] text-white border border-[#3D521E]'
                          : 'bg-white/85 hover:bg-white dark:bg-black/35 dark:hover:bg-black/55 text-[#2B351F] dark:text-[#E2EBD6] border border-[#DDD3BF] dark:border-white/20 backdrop-blur-xs'
                      }`}
                      title={isDone ? 'Mark as pending' : 'Mark complete for today'}
                    >
                      <FontAwesomeIcon icon={faCheck} className="text-[9px]" />
                      <span>{isDone ? 'Done' : 'Mark Done'}</span>
                    </button>
                  </div>
                </div>

                {/* Middle: Progress Numbers & Steppers Row */}
                <div className="relative z-10 mt-2.5 sm:my-2 pt-2 border-t border-[#1D2516]/10 dark:border-white/10">
                  {/* Numbers row */}
                  <div className="flex items-center justify-between text-xs mb-1.5 tabular-nums">
                    <div>
                      <span className="font-bold text-sm text-[#1D2516] dark:text-[#F5F2EB]">{actualVal}</span>
                      <span className="text-[#556244] dark:text-[#CBD8BF] font-medium"> / {targetVal} {unitDisplay}</span>
                    </div>
                    <span className="text-xs font-bold text-[#1D2516] dark:text-[#F5F2EB]">
                      {percent}%
                    </span>
                  </div>

                  {/* Stepper Row: Minus Button, Progress Bar Track, Plus Button */}
                  <div className="flex items-center gap-2">
                    {/* Minus Button */}
                    <button
                      type="button"
                      disabled={actualVal <= 0}
                      onClick={() => handleStep(habit, -1)}
                      className="w-8 h-8 sm:w-6 sm:h-6 rounded-full bg-[#1D2516]/10 hover:bg-[#1D2516]/20 dark:bg-white/15 dark:hover:bg-white/25 active:scale-95 disabled:opacity-40 text-[#2B351F] dark:text-white flex items-center justify-center font-bold text-xs transition-all cursor-pointer flex-shrink-0 border border-transparent dark:border-white/10"
                      title="Decrease progress for today"
                    >
                      <FontAwesomeIcon icon={faMinus} className="text-xs sm:text-[9px]" />
                    </button>

                    {/* Progress Bar Track & Fill */}
                    <div className="h-2.5 bg-[#1D2516]/15 dark:bg-black/45 rounded-full overflow-hidden flex-1 relative">
                      <motion.div
                        initial={false}
                        animate={{ width: `${percent}%` }}
                        transition={{ duration: 0.25, ease: 'easeOut' }}
                        className="h-full rounded-full bg-[#4A6225] dark:bg-[#82A84E]"
                      />
                    </div>

                    {/* Plus Button */}
                    <button
                      type="button"
                      onClick={() => handleStep(habit, 1)}
                      className="w-8 h-8 sm:w-6 sm:h-6 rounded-full bg-[#1D2516]/10 hover:bg-[#1D2516]/20 dark:bg-white/15 dark:hover:bg-white/25 active:scale-95 text-[#2B351F] dark:text-white flex items-center justify-center font-bold text-xs transition-all cursor-pointer flex-shrink-0 border border-transparent dark:border-white/10"
                      title="Increase progress for today"
                    >
                      <FontAwesomeIcon icon={faPlus} className="text-xs sm:text-[9px]" />
                    </button>
                  </div>
                </div>

                {/* Bottom Footer Row: Active/Pause, Edit, Delete (with pr-2 on mobile, pr-9 on desktop) */}
                <div className="relative z-10 flex items-center justify-between mt-2 sm:mt-0 pt-2 sm:pt-1.5 border-t border-[#1D2516]/10 dark:border-white/10 text-[11px] pr-2 sm:pr-9">
                  {/* Pause / Resume Toggle */}
                  <button
                    type="button"
                    onClick={() => handleToggleActive(habit)}
                    className="text-[#556244] dark:text-[#CBD8BF] hover:text-[#1D2516] dark:hover:text-white font-medium inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <FontAwesomeIcon icon={habit.is_active ? faPause : faPlay} className="text-[9px]" />
                    <span>{habit.is_active ? 'Active' : 'Paused'}</span>
                  </button>

                  <div className="flex items-center gap-2.5">
                    {/* Edit Modal Trigger */}
                    <button
                      type="button"
                      onClick={() => {
                        setEditingHabit(habit)
                        setShowModal(true)
                      }}
                      className="text-[#556244] dark:text-[#CBD8BF] hover:text-[#1D2516] dark:hover:text-white font-medium inline-flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <FontAwesomeIcon icon={faPenToSquare} className="text-[9px]" />
                      <span>Edit</span>
                    </button>

                    {/* Delete Trigger */}
                    {deletingConfirmId === habit.id ? (
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleDelete(habit.id)}
                          className="text-white bg-rose-600 px-1.5 py-0.5 rounded text-[10px] font-bold cursor-pointer"
                        >
                          Confirm
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingConfirmId(null)}
                          className="text-[#6F6759] dark:text-slate-400 hover:bg-black/5 dark:hover:bg-white/10 p-1 rounded text-[10px] cursor-pointer"
                          title="Cancel"
                          aria-label="Cancel"
                        >
                          <FontAwesomeIcon icon={faXmark} className="text-[10px]" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setDeletingConfirmId(habit.id)}
                        className="text-[#7A856D] dark:text-[#CBD8BF] hover:text-rose-600 dark:hover:text-rose-400 p-1 rounded transition-colors cursor-pointer"
                        title="Delete habit"
                      >
                        <FontAwesomeIcon icon={faTrash} className="text-[10px]" />
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      ) : (
        /* Empty State */
        <div className="text-center py-12 px-4 rounded-3xl border-2 border-dashed border-[#E3DCCE] dark:border-[#223326] bg-white/95 dark:bg-[#0D1814] space-y-3 transition-colors">
          <div className="w-12 h-12 rounded-full bg-[#EEF4E8] dark:bg-[#1D2D23] text-[#738541] dark:text-[#9EB868] flex items-center justify-center mx-auto text-xl shadow-2xs">
            <FontAwesomeIcon icon={faSeedling} />
          </div>
          <h3 className="font-serif font-bold text-lg text-[#1D2516] dark:text-[#F5F2EB]">No habits found</h3>
          <p className="text-xs text-[#6F6759] dark:text-[#9BAF90] max-w-sm mx-auto">
            {searchQuery
              ? `No habits matching "${searchQuery}". Clear your search to see all routines.`
              : 'Add your first daily routine to begin tracking progress.'}
          </p>
          <button
            type="button"
            onClick={() => {
              setEditingHabit(null)
              setShowModal(true)
            }}
            className="py-2 px-4 rounded-full bg-[#4A6225] text-white text-xs font-bold shadow-xs hover:bg-[#3D521E] cursor-pointer inline-flex items-center gap-1.5"
          >
            <FontAwesomeIcon icon={faPlus} className="text-xs" />
            <span>Create Habit</span>
          </button>
        </div>
      )}

      {/* Habit Form Modal */}
      <HabitFormModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false)
          setEditingHabit(null)
        }}
        onSave={handleSaveModalHabit}
        editingHabit={editingHabit}
      />
    </div>
  )
}
