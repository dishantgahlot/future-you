import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faXmark,
  faLeaf,
  faHeartPulse,
  faMoon,
  faBookOpen,
  faDumbbell,
  faMobileScreen,
  faSpa,
  faAppleWhole,
  faCheck,
  faPlus,
} from '@fortawesome/free-solid-svg-icons'
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core'
import type { Habit, HabitCategory } from '../../types'
import { getActiveUserId } from '../../utils/habitStorage'

interface HabitFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (habitData: Partial<Habit>) => void
  editingHabit?: Habit | null
}

const CATEGORY_OPTIONS: { value: HabitCategory; label: string; icon: IconDefinition }[] = [
  { value: 'health', label: 'Health', icon: faHeartPulse },
  { value: 'sleep', label: 'Sleep', icon: faMoon },
  { value: 'learning', label: 'Learning', icon: faBookOpen },
  { value: 'fitness', label: 'Fitness', icon: faDumbbell },
  { value: 'productivity', label: 'Focus', icon: faMobileScreen },
  { value: 'mental_health', label: 'Mind', icon: faSpa },
  { value: 'nutrition', label: 'Nutrition', icon: faAppleWhole },
]

function getCategoryStickyTheme(cat: HabitCategory): string {
  if (cat === 'sleep') return 'lavender'
  if (cat === 'learning') return 'kraft'
  if (cat === 'fitness') return 'sage'
  if (cat === 'health') return 'cream'
  if (cat === 'productivity') return 'chamomile'
  if (cat === 'nutrition') return 'peach'
  if (cat === 'mental_health') return 'sage'
  return 'cream'
}

export function HabitFormModal({
  isOpen,
  onClose,
  onSave,
  editingHabit,
}: HabitFormModalProps) {
  const [name, setName] = useState('')
  const [category, setCategory] = useState<HabitCategory>('health')
  const [error, setError] = useState('')

  useEffect(() => {
    if (editingHabit) {
      setName(editingHabit.name || '')
      setCategory(editingHabit.category || 'health')
    } else {
      setName('')
      setCategory('health')
    }
    setError('')
  }, [editingHabit, isOpen])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) {
      setError('Please enter a habit name')
      return
    }

    if (editingHabit) {
      onSave({
        ...editingHabit,
        name: trimmed,
        category,
        color_theme: editingHabit.color_theme || getCategoryStickyTheme(category),
        updated_at: new Date().toISOString(),
      })
    } else {
      // Sensible defaults inferred from category
      let defaultTarget = 1
      let defaultUnit = 'times'

      if (category === 'sleep') {
        defaultTarget = 8
        defaultUnit = 'h'
      } else if (category === 'learning') {
        defaultTarget = 2
        defaultUnit = 'h'
      } else if (category === 'fitness') {
        defaultTarget = 30
        defaultUnit = 'm'
      } else if (category === 'health' && trimmed.toLowerCase().includes('hydrat')) {
        defaultTarget = 2000
        defaultUnit = 'ml'
      } else if (category === 'productivity') {
        defaultTarget = 3
        defaultUnit = 'h'
      }

      onSave({
        id: crypto.randomUUID(),
        user_id: getActiveUserId(),
        name: trimmed,
        description: null,
        category,
        frequency: 'daily',
        target_value: defaultTarget,
        unit: defaultUnit,
        color: '#738541',
        color_theme: getCategoryStickyTheme(category),
        icon: 'leaf',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
    }

    onClose()
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#1B2314]/50 dark:bg-black/75 backdrop-blur-xs dark:backdrop-blur-sm overflow-y-auto">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="relative z-10 w-full max-w-md max-h-[90vh] flex flex-col bg-[#FDFBF7] dark:bg-[#0D1814] rounded-2xl sm:rounded-3xl border border-[#E9E1D2] dark:border-[#223326] shadow-[0_20px_50px_rgba(29,37,22,0.18)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.65)] p-4 sm:p-6 sm:p-7 select-none overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3 mb-4 sm:mb-5">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#DFEACF] dark:bg-[#1C2C1D] text-[#435824] dark:text-[#A8D968] border border-transparent dark:border-[#2E4731] text-[10px] font-bold uppercase tracking-wider mb-1.5 shadow-2xs">
                  <FontAwesomeIcon icon={faLeaf} className="w-2.5 h-2.5 text-[#5A732E] dark:text-[#A8D968]" />
                  <span>Habit Architecture</span>
                </div>
                <h3 className="font-serif font-bold text-lg sm:text-2xl text-[#1D2516] dark:text-[#F5F2EB] tracking-tight">
                  {editingHabit ? 'Edit Habit' : 'New Habit'}
                </h3>
                <p className="font-serif italic text-xs text-[#6F6759] dark:text-[#8FA387] mt-0.5">
                  Simple daily routines build a remarkable future.
                </p>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-[#FAF5EB] hover:bg-[#EAE0CF] dark:bg-[#132219] dark:hover:bg-[#1E3326] text-[#6F6759] hover:text-[#1D2516] dark:text-[#8FA387] dark:hover:text-[#F5F2EB] border border-[#E8DFC8] dark:border-[#223326] flex items-center justify-center transition-colors cursor-pointer flex-shrink-0"
                title="Close"
              >
                <FontAwesomeIcon icon={faXmark} className="text-xs" />
              </button>
            </div>

            {/* Minimal Form: Only Category & Task Name */}
            <form onSubmit={handleSubmit} className="space-y-3.5 sm:space-y-4.5">
              {error && (
                <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 text-xs rounded-xl font-medium">
                  {error}
                </div>
              )}

              {/* 1. Category Selection */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#6F6759] dark:text-[#8FA387] mb-1.5 sm:mb-2">
                  Category
                </label>
                <div className="flex flex-wrap gap-1.5 sm:gap-2">
                  {CATEGORY_OPTIONS.map((cat) => {
                    const isSelected = category === cat.value
                    return (
                      <button
                        key={cat.value}
                        type="button"
                        onClick={() => {
                          setCategory(cat.value)
                          setError('')
                        }}
                        className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full text-xs transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#DFEACF] dark:bg-[#203625] text-[#3D5220] dark:text-[#A8D968] border border-[#CCD8B8] dark:border-[#3C5D41] font-bold shadow-2xs ring-1 ring-[#738541]/30 dark:ring-[#A8D968]/30'
                            : 'bg-[#FAF8F3] dark:bg-[#132219] text-[#6F6759] dark:text-[#8FA387] hover:text-[#1D2516] dark:hover:text-[#F5F2EB] hover:bg-[#F2ECE0] dark:hover:bg-[#1A2C22] border border-[#E8E2D5] dark:border-[#223326] font-medium'
                        }`}
                      >
                        <FontAwesomeIcon icon={cat.icon} className="text-[11px]" />
                        <span>{cat.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* 2. Habit Name Input */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#6F6759] dark:text-[#8FA387] mb-1.5">
                  Habit Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value)
                    setError('')
                  }}
                  placeholder="e.g. Read 20 Pages, Morning Walk, Hydration..."
                  className="w-full px-3.5 sm:px-4 py-2 sm:py-2.5 bg-[#F6F3EB]/80 dark:bg-[#132219] border border-[#E0D7C6] dark:border-[#223326] rounded-xl sm:rounded-2xl text-xs sm:text-sm font-medium text-[#1D2516] dark:text-[#F5F2EB] placeholder:text-[#8A9280] dark:placeholder-[#5D705C] focus:outline-none focus:border-[#738541] dark:focus:border-[#4A6225] focus:bg-white dark:focus:bg-[#16271D] focus:ring-2 focus:ring-[#738541]/20 dark:focus:ring-[#4A6225]/20 transition-all"
                  autoFocus
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 sm:gap-2.5 pt-3 border-t border-[#ECE5D8]/80 dark:border-[#223326]">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 sm:px-4 py-2 rounded-full text-xs font-semibold text-[#6F6759] dark:text-[#8FA387] hover:text-[#1D2516] dark:hover:text-[#F5F2EB] hover:bg-[#F2ECE0] dark:hover:bg-[#132219] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-4 sm:px-5 py-2 sm:py-2.5 rounded-full bg-[#4A6225] hover:bg-[#3D521E] dark:bg-[#4E6826] dark:hover:bg-[#5D7E2D] active:scale-98 text-white text-xs sm:text-sm font-semibold shadow-xs dark:shadow-md border border-transparent dark:border-[#5E7E2E] transition-all cursor-pointer"
                >
                  <FontAwesomeIcon icon={editingHabit ? faCheck : faPlus} className="text-[11px]" />
                  <span>{editingHabit ? 'Save Changes' : 'Create Habit'}</span>
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
