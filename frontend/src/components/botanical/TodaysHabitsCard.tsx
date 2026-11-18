import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { isSameDay, format } from 'date-fns'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faSeedling,
  faLeaf,
  faBrain,
  faMoon,
  faBed,
  faBookOpen,
  faBook,
  faDumbbell,
  faPersonRunning,
  faPersonWalking,
  faDroplet,
  faWater,
  faMobileScreen,
  faSun,
  faMountainSun,
  faCalendarCheck,
  faBullseye,
  faHeartPulse,
  faSpa,
  faAppleWhole,
  faMugSaucer,
  faCheck,
  faSliders,
  faArrowRight,
  faLock,
} from '@fortawesome/free-solid-svg-icons'
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core'
import type { Habit, HabitLog } from '../../types'

interface TodaysHabitsCardProps {
  habits: Habit[]
  logs: HabitLog[]
  onManageHabits: () => void
  onToggleHabit?: (habit: Habit, log: HabitLog | undefined) => void
  onUpdateProgress?: (habit: Habit, newValue: number) => void
  onAddHabit?: () => void
  onEditHabit?: (habit: Habit) => void
  onDeleteHabit?: (habitId: string) => void
  selectedDate?: Date
}

/**
 * Maps habit name / category to authentic FontAwesome vector icons
 */
export function getHabitIconDef(habit: Habit): { icon: IconDefinition; isSunVariant?: boolean } {
  const name = habit.name.toLowerCase()
  const cat = (habit.category || '').toLowerCase()

  if (name.includes('bed') || name.includes('rest')) return { icon: faBed }
  if (name.includes('sleep') || cat.includes('sleep') || name.includes('night')) return { icon: faMoon }
  if (name.includes('study') || name.includes('focus') || name.includes('learn') || name.includes('code') || cat.includes('learning')) {
    return { icon: faBookOpen }
  }
  if (name.includes('workout') || name.includes('gym') || name.includes('exercise') || name.includes('lift') || cat.includes('fitness')) {
    return { icon: faDumbbell }
  }
  if (name.includes('walk') || name.includes('step')) return { icon: faPersonWalking }
  if (name.includes('run') || name.includes('jog')) return { icon: faPersonRunning }
  if (name.includes('water')) return { icon: faWater }
  if (name.includes('hydrat') || name.includes('drink')) return { icon: faDroplet }
  if (name.includes('mountain') || name.includes('hike') || name.includes('outdoor')) return { icon: faMountainSun }
  if (name.includes('sun') || name.includes('morning') || name.includes('dawn') || name.includes('wake')) {
    return { icon: faSun, isSunVariant: true }
  }
  if (name.includes('screen') || name.includes('phone') || name.includes('digital') || name.includes('social')) {
    return { icon: faMobileScreen }
  }
  if (name.includes('mind') || name.includes('meditat') || name.includes('calm') || name.includes('breathe') || name.includes('zen') || cat.includes('mental')) {
    return { icon: faSpa }
  }
  if (name.includes('brain') || name.includes('dopamine') || name.includes('mental') || name.includes('think')) {
    return { icon: faBrain }
  }
  if (name.includes('read') || name.includes('book')) return { icon: faBook }
  if (name.includes('diet') || name.includes('food') || name.includes('eat') || name.includes('nutrition') || name.includes('fruit')) {
    return { icon: faAppleWhole }
  }
  if (name.includes('coffee') || name.includes('tea') || name.includes('matcha')) return { icon: faMugSaucer }
  if (name.includes('heart') || name.includes('cardio') || name.includes('pulse') || cat.includes('health')) return { icon: faHeartPulse }
  if (name.includes('target') || name.includes('goal') || name.includes('year') || name.includes('unstuck')) return { icon: faBullseye }
  if (name.includes('week') || name.includes('schedule') || name.includes('calendar') || name.includes('plan')) return { icon: faCalendarCheck }
  if (name.includes('leaf') || name.includes('plant') || name.includes('nature') || name.includes('green')) return { icon: faLeaf }

  return { icon: faSeedling }
}

export function TodaysHabitsCard({
  habits,
  logs,
  onManageHabits,
  selectedDate,
}: TodaysHabitsCardProps) {
  const isToday = !selectedDate || isSameDay(selectedDate, new Date())

  // Sort habits: active habits first
  const displayHabits = useMemo(() => {
    return [...habits].sort((a, b) => (b.is_active ? 1 : 0) - (a.is_active ? 1 : 0))
  }, [habits])

  const completedCount = useMemo(() => {
    return habits.filter((h) => {
      const log = logs.find((l) => l.habit_id === h.id)
      const target = h.target_value || 1
      const actual = log?.actual_value !== undefined ? log.actual_value : log?.completion_status ? target : 0
      return actual >= target && target > 0
    }).length
  }, [habits, logs])

  return (
    <div className="bg-white dark:bg-[#0E1714] border border-[#E8E2D5] dark:border-[#1E2E27] rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 shadow-[0_2px_12px_rgba(29,37,22,0.03)] flex flex-col justify-between w-full transition-colors">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 sm:pb-3 border-b border-[#E8E3D7] dark:border-[#1E2E27]">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-[#EEF4E8] dark:bg-[#1E2F1A] flex items-center justify-center text-[#738541] dark:text-[#A8D968] shadow-2xs">
            <FontAwesomeIcon icon={faSun} className="text-xs sm:text-sm" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-2xl font-serif font-bold text-[#1D2516] dark:text-[#F5F2EB] leading-tight">
                {isToday ? "Today's Habits" : `${format(selectedDate!, 'MMM d')} Habits`}
              </h2>
              <span className="px-2 py-0.5 rounded-lg bg-[#EEF4E8] dark:bg-[#253A1D] text-[#415525] dark:text-[#B6DB8A] text-[11px] sm:text-xs font-semibold border border-[#D5E3C4] dark:border-[#385926]">
                {completedCount} of {habits.length} done
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-[#6F6759] dark:text-[#A8BCA0] mt-0.5">
              {isToday
                ? 'Live progress · Manage & complete in Habit section'
                : `Status for ${format(selectedDate!, 'EEEE, d MMMM yyyy')}`}
            </p>
          </div>
        </div>

        {/* Go to Habit Section Button */}
        <button
          type="button"
          onClick={onManageHabits}
          className="self-start sm:self-auto py-1 sm:py-1.5 px-3 sm:px-3.5 rounded-xl bg-[#EEF4E8] dark:bg-[#253A1D] text-[#415525] dark:text-[#B6DB8A] hover:bg-[#E3EDD7] dark:hover:bg-[#2F4A24] font-bold text-xs transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer border border-[#D5E3C4] dark:border-[#385926]"
        >
          <FontAwesomeIcon icon={faSliders} className="text-[11px]" />
          <span>Habit Studio</span>
          <FontAwesomeIcon icon={faArrowRight} className="text-[10px]" />
        </button>
      </div>

      {/* Habits Progress Grid (Read-Only on Dashboard) */}
      <div className="pt-3">
        {displayHabits.length === 0 ? (
          <div className="text-center py-10 px-4 rounded-2xl border-2 border-dashed border-[#E3DCCE] dark:border-[#1E2E27] bg-[#FAF8F3] dark:bg-[#0B130F] space-y-3">
            <div className="w-12 h-12 rounded-full bg-[#EEF4E8] dark:bg-[#1E2F1A] text-[#738541] dark:text-[#A8D968] flex items-center justify-center mx-auto text-xl shadow-2xs">
              <FontAwesomeIcon icon={faSeedling} />
            </div>
            <div>
              <h4 className="font-serif font-bold text-base text-[#1D2516] dark:text-[#F5F2EB]">No habits set</h4>
              <p className="text-xs text-[#6F6759] dark:text-[#A8BCA0] mt-0.5 max-w-xs mx-auto">
                Open the Habits section in the sidebar to create and configure your routines.
              </p>
            </div>
            <button
              type="button"
              onClick={onManageHabits}
              className="py-2 px-4 rounded-xl bg-[#738541] dark:bg-[#4E6826] text-white text-xs font-bold shadow-xs hover:bg-[#5E6F34] dark:hover:bg-[#41581F] cursor-pointer inline-flex items-center gap-1.5"
            >
              <span>Go to Habits</span>
              <FontAwesomeIcon icon={faArrowRight} className="text-[11px]" />
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 sm:gap-3.5">
            {displayHabits.map((habit) => {
              const log = logs.find((l) => l.habit_id === habit.id)
              const isCompleted = log?.completion_status || false
              const targetVal = log?.target_value || habit.target_value || 1
              const actualVal =
                log?.actual_value !== undefined ? log.actual_value : isCompleted ? targetVal : 0
              const percent = Math.min(Math.round((actualVal / targetVal) * 100), 100)
              const isInProgress = actualVal > 0 && actualVal < targetVal
              const unitDisplay = habit.unit === 'm' ? 'mins' : habit.unit

              const { icon } = getHabitIconDef(habit)

              return (
                <div
                  key={habit.id}
                  onClick={onManageHabits}
                  className={`relative rounded-2xl border p-3 sm:p-3.5 flex flex-col justify-between transition-all duration-200 select-none cursor-pointer group ${
                    isCompleted
                      ? 'bg-[#F2F7EC] dark:bg-[#162919] border-[#738541]/45 dark:border-[#335928] shadow-2xs'
                      : isInProgress
                      ? 'bg-[#FCFAF5] dark:bg-[#1B2616] border-[#D4CBB9] dark:border-[#3E4D27] shadow-2xs'
                      : 'bg-[#FCFAF7] hover:bg-white dark:bg-[#111C16] dark:hover:bg-[#15231B] border-[#EAE3D5] hover:border-[#D0C5B0] dark:border-[#223528] dark:hover:border-[#304A38] shadow-2xs'
                  } ${!habit.is_active ? 'opacity-55' : ''}`}
                  title="Go to Habits section to log or complete"
                >
                  {/* Top: Icon + Title + Status Badge */}
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1">
                        {/* Botanical Icon Badge */}
                        <div
                          className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
                            isCompleted
                              ? 'bg-[#E3EDD7] text-[#415525] dark:bg-[#253A1D] dark:text-[#A8D968]'
                              : isInProgress
                              ? 'bg-[#F6EEDD] text-[#845E1B] dark:bg-[#382D16] dark:text-[#FBBF24]'
                              : 'bg-[#EDE8DB] text-[#738541] dark:bg-[#1A2821] dark:text-[#A8BCA0]'
                          }`}
                        >
                          <FontAwesomeIcon icon={icon} className="text-sm" />
                        </div>

                        {/* Title */}
                        <div className="min-w-0 flex-1">
                          <h4 className="font-serif font-bold text-sm sm:text-[15px] text-[#1D2516] dark:text-[#F5F2EB] leading-tight truncate group-hover:text-[#415525] dark:group-hover:text-[#A8D968] transition-colors">
                            {habit.name}
                          </h4>
                          <span className="text-[11px] text-[#6F6759] dark:text-[#A8BCA0] font-medium capitalize">
                            {habit.category || 'Routine'}
                          </span>
                        </div>
                      </div>

                      {/* Status indicator (Read-only, no clicking to complete from dashboard) */}
                      <div className="flex-shrink-0">
                        {isCompleted ? (
                          <span className="text-[11px] font-bold text-[#415525] dark:text-[#A8D968] bg-[#E3EDD7] dark:bg-[#253A1D] px-2 py-0.5 rounded-full inline-flex items-center gap-1 border border-transparent dark:border-[#385926]">
                            <FontAwesomeIcon icon={faCheck} className="text-[9px]" /> Done
                          </span>
                        ) : isInProgress ? (
                          <span className="text-[11px] font-semibold text-[#845E1B] dark:text-[#FBBF24] bg-[#FBF3E4] dark:bg-[#382D16] px-2 py-0.5 rounded-full border border-transparent dark:border-[#57431E]">
                            {percent}%
                          </span>
                        ) : (
                          <span className="text-[11px] text-[#8C8271] dark:text-[#A8BCA0] bg-black/5 dark:bg-white/10 px-2 py-0.5 rounded-full">
                            0%
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Bottom: Dedicated Progress Bar and Numbers */}
                  <div className="pt-3 mt-2 border-t border-[#ECE7DC]/80 dark:border-[#1E2E27]">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <div className="font-semibold text-[#1D2516] dark:text-[#F5F2EB] tabular-nums">
                        <span className="font-bold text-sm">{actualVal}</span>
                        <span className="text-[#6F6759] dark:text-[#A8BCA0] font-normal"> / {targetVal} {unitDisplay}</span>
                      </div>
                      <div className="text-[11px] font-medium text-[#738541] dark:text-[#A8D968] group-hover:underline inline-flex items-center gap-1">
                        <span>Manage</span>
                        <FontAwesomeIcon icon={faArrowRight} className="text-[9px]" />
                      </div>
                    </div>

                    {/* Progress Bar (Read-Only) */}
                    <div className="w-full h-2 bg-[#E8E2D5] dark:bg-[#0A120E] rounded-full overflow-hidden">
                      <motion.div
                        initial={false}
                        animate={{ width: `${percent}%` }}
                        transition={{ duration: 0.35, ease: 'easeOut' }}
                        className={`h-full rounded-full transition-colors ${
                          isCompleted
                            ? 'bg-[#738541] dark:bg-[#4E6826]'
                            : isInProgress
                            ? 'bg-[#A3B864] dark:bg-[#82A84E]'
                            : 'bg-[#B0B89C] dark:bg-[#243528]'
                        }`}
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Footer Navigation Link */}
      <div className="pt-3 mt-3 border-t border-[#E8E3D7] dark:border-[#1E2E27] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-[#6F6759] dark:text-[#A8BCA0]">
        <span className="inline-flex items-center gap-1">
          <FontAwesomeIcon icon={faLock} className="text-[10px] text-[#8C8271] dark:text-[#A8BCA0]" />
          <span>Completion is logged in the sidebar Habit section</span>
        </span>
        <button
          type="button"
          onClick={onManageHabits}
          className="font-bold text-[#415525] dark:text-[#A8D968] hover:text-[#1D2516] dark:hover:text-[#F5F2EB] inline-flex items-center gap-1 cursor-pointer transition-colors shrink-0"
        >
          <span>Open Habit Section</span>
          <FontAwesomeIcon icon={faArrowRight} className="text-[10px]" />
        </button>
      </div>
    </div>
  )
}
