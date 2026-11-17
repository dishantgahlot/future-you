import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faSeedling,
  faMoon,
  faBookOpen,
  faDumbbell,
  faMobileScreen,
  faDroplet,
  faPersonWalking,
  faSpa,
  faAppleWhole,
  faCheck,
  faPlus,
  faMinus,
  faEllipsisVertical,
  faPenToSquare,
  faTrashCan,
  faFire,
} from '@fortawesome/free-solid-svg-icons'
import type { Habit, HabitLog } from '../../types'
import { getHabitColorTheme } from '../../utils/habitColors'

function getHabitFAIcon(habit: Habit) {
  const name = (habit.name || '').toLowerCase()
  const cat = (habit.category || '').toLowerCase()
  if (name.includes('sleep') || cat.includes('sleep') || name.includes('bed')) return faMoon
  if (name.includes('study') || name.includes('focus') || name.includes('learn') || cat.includes('learning')) return faBookOpen
  if (name.includes('workout') || name.includes('gym') || name.includes('exercise') || cat.includes('fitness')) return faDumbbell
  if (name.includes('walk') || name.includes('step') || name.includes('run')) return faPersonWalking
  if (name.includes('hydrat') || name.includes('water')) return faDroplet
  if (name.includes('screen') || name.includes('phone')) return faMobileScreen
  if (name.includes('mind') || name.includes('meditat') || cat.includes('mental')) return faSpa
  if (name.includes('diet') || name.includes('food') || cat.includes('nutrition')) return faAppleWhole
  return faSeedling
}

interface HabitCardProps {
  index: number
  habit: Habit
  log: HabitLog | undefined
  onToggle: (habit: Habit, log: HabitLog | undefined) => void
  onValueChange: (habit: Habit, newValue: number) => void
  onEdit: (habit: Habit) => void
  onDelete: (habitId: string) => void
  streak?: number
}

export function HabitCard({
  index,
  habit,
  log,
  onToggle,
  onValueChange,
  onEdit,
  onDelete,
  streak = 0,
}: HabitCardProps) {
  const [showMenu, setShowMenu] = useState(false)
  const isCompleted = log?.completion_status || false
  const currentValue = log?.actual_value || 0
  const targetValue = habit.target_value || 1
  const isNumeric = targetValue > 1

  const progressPercent = Math.min(
    Math.round((currentValue / targetValue) * 100),
    100
  )

  const theme = getHabitColorTheme(habit.color || habit.category)

  // Step increments for quick + / -
  const getStepValue = () => {
    if (habit.unit === 'ml') return 250
    if (habit.unit === 'pages') return 5
    if (habit.unit === 'mins' || habit.unit === 'minutes') return 5
    if (habit.unit === 'hours') return 1
    return 1
  }

  const handleIncrement = () => {
    const step = getStepValue()
    const nextVal = currentValue + step
    onValueChange(habit, nextVal)
  }

  const handleDecrement = () => {
    const step = getStepValue()
    const nextVal = Math.max(0, currentValue - step)
    onValueChange(habit, nextVal)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ delay: index * 0.04, duration: 0.3 }}
      className={`relative group rounded-3xl p-4 sm:p-5 border transition-all duration-300 ${
        isCompleted
          ? `${theme.bgSoft} ${theme.border} shadow-sm`
          : 'bg-card border-border/80 hover:border-border hover:shadow-card'
      }`}
    >
      <div className="flex items-center gap-3.5 sm:gap-4">
        {/* Habit Icon Container */}
        <motion.div
          whileHover={{ scale: 1.08, rotate: [0, -5, 5, 0] }}
          whileTap={{ scale: 0.95 }}
          className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0 shadow-sm transition-all duration-300 ${
            isCompleted
              ? `${theme.iconBg} text-white shadow-md ${theme.glow}`
              : 'bg-accent/80 text-foreground border border-border/40'
          }`}
          style={!isCompleted ? { backgroundColor: `${theme.hex}18` } : undefined}
        >
          <FontAwesomeIcon icon={getHabitFAIcon(habit)} className="text-xl" />
        </motion.div>

        {/* Habit Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h3
              className={`font-semibold text-base sm:text-lg tracking-tight truncate transition-colors ${
                isCompleted
                  ? `${theme.text} line-through decoration-current/40`
                  : 'text-foreground'
              }`}
            >
              {habit.name}
            </h3>

            {/* Habit Menu */}
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/80 opacity-60 group-hover:opacity-100 transition-all cursor-pointer"
                aria-label="Habit options"
              >
                <FontAwesomeIcon icon={faEllipsisVertical} className="w-4 h-4" />
              </button>

              <AnimatePresence>
                {showMenu && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 5 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 5 }}
                    className="absolute right-0 top-8 z-30 w-36 bg-popover border border-border shadow-elevated rounded-2xl p-1.5 flex flex-col gap-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() => {
                        setShowMenu(false)
                        onEdit(habit)
                      }}
                      className="flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-xl text-foreground hover:bg-accent transition-colors cursor-pointer"
                    >
                      <FontAwesomeIcon icon={faPenToSquare} className="w-3.5 h-3.5 text-muted-foreground" />
                      Edit Habit
                    </button>
                    <button
                      onClick={() => {
                        setShowMenu(false)
                        onDelete(habit.id)
                      }}
                      className="flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-xl text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                    >
                      <FontAwesomeIcon icon={faTrashCan} className="w-3.5 h-3.5" />
                      Delete Habit
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Meta & Badges */}
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <span
              className={`inline-flex items-center text-xs font-semibold px-2.5 py-0.5 rounded-full ${theme.badgeBg}`}
            >
              {habit.category.replace('_', ' ')}
            </span>

            {streak > 0 && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">
                <FontAwesomeIcon icon={faFire} className="w-3 h-3 text-amber-500" />
                {streak} {streak === 1 ? 'day' : 'days'}
              </span>
            )}

            <span className="text-xs text-muted-foreground font-medium">
              {isNumeric
                ? `${currentValue} / ${targetValue} ${habit.unit}`
                : `${habit.frequency}`}
            </span>
          </div>

          {/* Progress Bar for Numeric Habits */}
          {isNumeric && (
            <div className="w-full mt-2.5">
              <div className="w-full h-2 rounded-full bg-border/60 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercent}%` }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                  className={`h-full rounded-full ${theme.progressBar}`}
                />
              </div>
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
          {/* Quick Increment/Decrement for numeric habits */}
          {isNumeric && (
            <div className="hidden sm:flex items-center gap-1 bg-accent/60 p-1 rounded-2xl border border-border/50">
              <button
                onClick={handleDecrement}
                disabled={currentValue <= 0}
                className="w-7 h-7 rounded-xl flex items-center justify-center hover:bg-card disabled:opacity-40 text-muted-foreground hover:text-foreground transition-all cursor-pointer"
                aria-label="Decrease"
              >
                <FontAwesomeIcon icon={faMinus} className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleIncrement}
                className="w-7 h-7 rounded-xl flex items-center justify-center hover:bg-card text-muted-foreground hover:text-foreground transition-all cursor-pointer"
                aria-label="Increase"
              >
                <FontAwesomeIcon icon={faPlus} className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Primary Big Checkmark Toggle */}
          <motion.button
            whileTap={{ scale: 0.88 }}
            whileHover={{ scale: 1.05 }}
            onClick={() => onToggle(habit, log)}
            className={`w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center transition-all duration-300 border-2 cursor-pointer ${
              isCompleted
                ? `${theme.buttonBg} border-transparent shadow-md ${theme.glow}`
                : 'border-border bg-card/60 hover:border-primary/60 hover:bg-accent/60 text-transparent'
            }`}
            aria-label={isCompleted ? 'Mark incomplete' : 'Mark complete'}
          >
            <motion.div
              initial={false}
              animate={isCompleted ? { scale: [0, 1.25, 1] } : { scale: 0 }}
              transition={{ duration: 0.25 }}
            >
              <FontAwesomeIcon icon={faCheck} className="w-5 h-5 text-white" />
            </motion.div>
          </motion.button>
        </div>
      </div>
    </motion.div>
  )
}
