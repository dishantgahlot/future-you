import { useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faBell,
  faCheck,
  faTrashCan,
  faXmark,
  faClock,
} from '@fortawesome/free-solid-svg-icons'
import { useNotifications } from '../../contexts/NotificationContext'
import { formatDistanceToNow } from 'date-fns'

export function NotificationPopover() {
  const {
    notifications,
    unreadCount,
    isOpen,
    setIsOpen,
    markAsRead,
    markAllAsRead,
    clearNotification,
    clearAll,
  } = useNotifications()

  const popoverRef = useRef<HTMLDivElement>(null)

  // ESC key listener to dismiss
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, setIsOpen])

  if (!isOpen || typeof document === 'undefined') return null

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex justify-end items-start p-3 sm:p-5 md:p-6 pointer-events-none">
        {/* Soft backdrop blur to catch clicks outside */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 bg-black/20 backdrop-blur-[2px] pointer-events-auto cursor-pointer"
        />

        {/* Minimal Botanical Floating Card */}
        <motion.div
          ref={popoverRef}
          initial={{ opacity: 0, y: -8, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.98 }}
          transition={{ duration: 0.16, ease: 'easeOut' }}
          className="relative z-10 w-full max-w-sm sm:max-w-[380px] bg-[#FCFAF6] dark:bg-[#0D1814] border border-[#DDD6C5] dark:border-[#223326] rounded-2xl sm:rounded-3xl shadow-[0_20px_50px_rgba(20,28,14,0.18)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.65)] overflow-hidden flex flex-col max-h-[85vh] pointer-events-auto mt-1 sm:mt-2 select-none"
        >
          {/* Header */}
          <div className="px-4 py-3 border-b border-[#EAE3D5] dark:border-[#223326] bg-[#FAF8F3] dark:bg-[#132219] flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-[#EEF4E8] dark:bg-[#1E2F22] text-[#415525] dark:text-[#A8D968] flex items-center justify-center text-xs">
                <FontAwesomeIcon icon={faBell} />
              </div>
              <h3 className="font-serif font-bold text-sm text-[#1D2516] dark:text-[#F5F2EB]">
                Notifications
              </h3>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-[#E57342] text-white text-[10px] font-bold">
                  {unreadCount}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllAsRead}
                  className="px-2 py-1 rounded-lg text-[#556933] dark:text-[#A8D968] hover:bg-[#EEF4E8] dark:hover:bg-[#1E2F22] text-[11px] font-semibold transition-colors cursor-pointer flex items-center gap-1"
                  title="Mark all as read"
                >
                  <FontAwesomeIcon icon={faCheck} className="text-[9px]" />
                  <span>Read all</span>
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  type="button"
                  onClick={clearAll}
                  className="p-1 rounded-lg text-[#8C8474] dark:text-[#8FA387] hover:text-red-700 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 text-xs transition-colors cursor-pointer"
                  title="Clear all"
                >
                  <FontAwesomeIcon icon={faTrashCan} />
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-6 h-6 rounded-lg text-[#8C8474] dark:text-[#8FA387] hover:text-[#1D2516] dark:hover:text-[#F5F2EB] hover:bg-black/5 dark:hover:bg-white/10 flex items-center justify-center transition-colors cursor-pointer"
                title="Close"
              >
                <FontAwesomeIcon icon={faXmark} />
              </button>
            </div>
          </div>

          {/* Notifications List */}
          <div className="overflow-y-auto divide-y divide-[#EAE3D5]/60 dark:divide-[#223326] flex-1 overscroll-contain">
            {notifications.length === 0 ? (
              <div className="py-12 px-5 text-center space-y-1.5">
                <p className="text-xs font-semibold text-[#1D2516] dark:text-[#F5F2EB]">All caught up!</p>
                <p className="text-[11px] text-[#766F60] dark:text-[#8FA387]">
                  Hourly habit progress check-ins will appear here.
                </p>
              </div>
            ) : (
              notifications.map((item) => {
                let timeFormatted = 'Just now'
                try {
                  timeFormatted = formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })
                } catch {
                  // fallback
                }

                return (
                  <div
                    key={item.id}
                    onClick={() => !item.read && markAsRead(item.id)}
                    className={`p-3 transition-colors flex gap-2.5 cursor-pointer group relative ${
                      item.read
                        ? 'bg-[#FCFAF6] dark:bg-[#0D1814] hover:bg-[#F5F2E9] dark:hover:bg-[#111F16]'
                        : 'bg-[#FAF5EA] dark:bg-[#132219] hover:bg-[#F3EDE0] dark:hover:bg-[#182C20]'
                    }`}
                  >
                    {/* Unread Accent Dot */}
                    <div className="pt-1 flex-shrink-0">
                      <span
                        className={`w-1.5 h-1.5 rounded-full block ${
                          item.read
                            ? 'bg-[#D2C9B8] dark:bg-[#2F4433]'
                            : 'bg-[#738541] dark:bg-[#A8D968]'
                        }`}
                      />
                    </div>

                    {/* Card Content */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-semibold text-xs text-[#1D2516] dark:text-[#F5F2EB] leading-tight truncate">
                          {item.title}
                        </h4>

                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <span className="text-[10px] text-[#8C8474] dark:text-[#8FA387] font-medium flex items-center gap-1">
                            <FontAwesomeIcon icon={faClock} className="text-[8px]" />
                            {timeFormatted}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              clearNotification(item.id)
                            }}
                            className="opacity-0 group-hover:opacity-100 text-[#8C8474] dark:text-[#8FA387] hover:text-red-700 dark:hover:text-red-400 p-0.5 text-xs transition-opacity cursor-pointer"
                            title="Dismiss"
                          >
                            <FontAwesomeIcon icon={faXmark} />
                          </button>
                        </div>
                      </div>

                      {/* Message Body */}
                      <p className="text-xs text-[#524B3D] dark:text-[#CBD8BF] leading-relaxed">
                        {item.message}
                      </p>

                      {/* Progress Line & Pending Habits */}
                      {item.stats && item.stats.totalCount > 0 && (
                        <div className="pt-1 space-y-1">
                          <div className="flex items-center justify-between text-[10px] text-[#556933] dark:text-[#A8D968] font-medium">
                            <span>
                              {item.stats.completedCount}/{item.stats.totalCount} completed
                            </span>
                            <span>{item.stats.percent}%</span>
                          </div>
                          <div className="h-1 bg-[#EDE8DB] dark:bg-[#1C2C20] rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[#738541] dark:bg-[#4E6826] rounded-full transition-all duration-300"
                              style={{ width: `${item.stats.percent}%` }}
                            />
                          </div>

                          {item.stats.pendingHabits && item.stats.pendingHabits.length > 0 && (
                            <p className="text-[10px] text-[#766F60] dark:text-[#9BAF90] truncate">
                              <span className="font-semibold text-[#556933] dark:text-[#A8D968]">Remaining: </span>
                              {item.stats.pendingHabits.join(', ')}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2 bg-[#FAF8F3] dark:bg-[#132219] border-t border-[#EAE3D5] dark:border-[#223326] text-[10px] text-[#766F60] dark:text-[#8FA387] flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#738541] dark:bg-[#A8D968]" />
              <span>Hourly check-ins</span>
            </span>
            <span>Resets at 00:00</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  )
}
