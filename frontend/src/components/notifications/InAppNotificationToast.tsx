import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faBell,
  faXmark,
  faArrowRight,
} from '@fortawesome/free-solid-svg-icons'
import { useNotifications } from '../../contexts/NotificationContext'

export function InAppNotificationToast() {
  const { activeToast, dismissToast, setIsOpen, markAsRead } = useNotifications()
  const navigate = useNavigate()

  useEffect(() => {
    // Esc key dismisses toast
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && activeToast) {
        dismissToast()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeToast, dismissToast])

  if (!activeToast) return null

  const { title, message, stats } = activeToast

  const handleGoToHabits = (e: React.MouseEvent) => {
    e.stopPropagation()
    markAsRead(activeToast.id)
    dismissToast()
    navigate('/habits')
  }

  const handleOpenPopover = () => {
    markAsRead(activeToast.id)
    dismissToast()
    setIsOpen(true)
  }

  return (
    <AnimatePresence>
      <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-[9999] pointer-events-none select-none max-w-sm sm:max-w-md w-[calc(100vw-2rem)]">
        <motion.div
          initial={{ opacity: 0, y: 25, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 15, scale: 0.97 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          onClick={handleOpenPopover}
          className="pointer-events-auto bg-[#FCFAF6] dark:bg-[#0D1814] border border-[#DDD6C5] dark:border-[#223326] rounded-2xl sm:rounded-3xl p-4 shadow-[0_15px_40px_rgba(20,28,14,0.14)] dark:shadow-[0_15px_40px_rgba(0,0,0,0.65)] backdrop-blur-md cursor-pointer transition-transform hover:scale-[1.01] relative select-none"
        >
          {/* Header row */}
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-lg bg-[#EEF4E8] dark:bg-[#1E2F22] text-[#415525] dark:text-[#A8D968] flex items-center justify-center text-[10px]">
                <FontAwesomeIcon icon={faBell} />
              </div>
              <span className="text-[11px] font-semibold text-[#4A6225] dark:text-[#A8D968]">
                {activeToast.cadence === '1h' ? 'Hourly Reminder' : 'Habit Alert'}
              </span>
              <span className="text-[10px] text-[#8C8474] dark:text-[#8FA387] font-medium">· Just now</span>
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                dismissToast()
              }}
              className="w-5 h-5 rounded-md text-[#8C8474] hover:text-[#1D2516] dark:hover:text-[#F5F2EB] hover:bg-black/5 dark:hover:bg-white/10 flex items-center justify-center transition-colors cursor-pointer"
              title="Dismiss toast"
            >
              <FontAwesomeIcon icon={faXmark} className="text-xs" />
            </button>
          </div>

          {/* Title */}
          <h4 className="font-serif font-bold text-sm text-[#1D2516] dark:text-[#F5F2EB] leading-snug mb-1">
            {title}
          </h4>

          {/* Message body */}
          <p className="text-xs text-[#524B3D] dark:text-[#CBD8BF] leading-relaxed mb-2.5">
            {message}
          </p>

          {/* Stats Progress Bar & Pending Count */}
          {stats && stats.totalCount > 0 && (
            <div className="bg-[#FAF6EE] dark:bg-[#132219] rounded-xl p-2 border border-[#EAE3D5]/80 dark:border-[#223326]/80 space-y-1.5 mb-2.5">
              <div className="flex items-center justify-between text-[10px] font-medium text-[#1D2516] dark:text-[#F5F2EB]">
                <span>Progress</span>
                <span className="font-semibold text-[#4A6225] dark:text-[#A8D968]">
                  {stats.completedCount}/{stats.totalCount} completed ({stats.growthRate ?? stats.percent}% growth rate)
                </span>
              </div>

              {/* Progress bar track */}
              <div className="h-1.5 w-full bg-[#EAE3D5] dark:bg-[#1C2C20] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#738541] dark:bg-[#4E6826] rounded-full transition-all duration-300"
                  style={{ width: `${stats.growthRate ?? stats.percent}%` }}
                />
              </div>

              {/* Pending habits */}
              {stats.pendingHabits && stats.pendingHabits.length > 0 && (
                <p className="text-[10px] text-[#766F60] dark:text-[#8FA387] truncate pt-0.5">
                  <span className="font-semibold text-[#556933] dark:text-[#A8D968]">Remaining: </span>
                  {stats.pendingHabits.join(', ')}
                </p>
              )}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center justify-between pt-0.5">
            <span className="text-[10px] text-[#8C8474] dark:text-[#8FA387]">
              Click to view all
            </span>

            <button
              type="button"
              onClick={handleGoToHabits}
              className="px-2.5 py-1 rounded-xl bg-[#738541] hover:bg-[#5E6D34] text-white text-[11px] font-semibold shadow-2xs flex items-center gap-1 transition-all cursor-pointer active:scale-95"
            >
              <span>Log Habits</span>
              <FontAwesomeIcon icon={faArrowRight} className="text-[9px]" />
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
