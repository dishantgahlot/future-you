import { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCalendarDays, faBell, faChevronDown, faRotateRight } from '@fortawesome/free-solid-svg-icons'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { useUserProfile } from '../../contexts/UserProfileContext'
import { useNotifications } from '../../contexts/NotificationContext'
import { useAppDate } from '../../contexts/DateContext'
import { NotificationPopover } from '../notifications/NotificationPopover'
import { BotanicalCalendarModal } from '../botanical/BotanicalCalendarModal'
import { ThemeToggle } from '../common/ThemeToggle'

export function Header() {
  const { avatarUrl, fullName } = useUserProfile()
  const { unreadCount, toggleOpen } = useNotifications()
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)
  const { selectedDate, setSelectedDate, isToday, resetToToday } = useAppDate()

  const todayFormatted = format(selectedDate, 'EEE, d MMM yyyy')

  return (
    <header className="h-14 flex items-center justify-end px-3 sm:px-8 pt-3 pb-1 gap-2 sm:gap-2.5 z-30 bg-transparent relative">
      {/* Jump back to Today button when viewing a past date */}
      {!isToday && (
        <button
          type="button"
          onClick={resetToToday}
          className="px-2.5 py-1.5 rounded-2xl bg-[#4A6225] hover:bg-[#3D521E] text-white text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
          title="Return to Today"
        >
          <FontAwesomeIcon icon={faRotateRight} className="text-[10px]" />
          <span>Today</span>
        </button>
      )}

      {/* Date Dropdown Pill */}
      <button
        type="button"
        onClick={() => setIsCalendarOpen(true)}
        className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1.5 bg-white/90 dark:bg-[#0D1814]/90 backdrop-blur-xs border rounded-2xl shadow-xs text-xs sm:text-sm font-medium transition-colors select-none cursor-pointer ${
          !isToday
            ? 'border-[#738541] dark:border-[#4E6826] text-[#4A6225] dark:text-[#A8D968] font-bold bg-[#FAF6E8] dark:bg-[#132219]'
            : 'border-[#E8E2D5] dark:border-[#223326] text-[#1D2516] dark:text-[#F5F2EB] hover:border-[#738541] dark:hover:border-[#4E6826]'
        }`}
        title="Click to switch date"
      >
        <FontAwesomeIcon icon={faCalendarDays} className="w-3.5 h-3.5 text-[#4A6225] dark:text-[#A8D968]" />
        <span className="hidden sm:inline">{todayFormatted}</span>
        <span className="sm:hidden">{format(selectedDate, 'MMM d')}</span>
        <FontAwesomeIcon icon={faChevronDown} className="w-2.5 sm:w-3 h-2.5 sm:h-3 text-[#7A8C74] dark:text-[#83967D]" />
      </button>

      {/* Theme Toggle Button (Light/Dark Mode) */}
      <ThemeToggle />

      {/* Notification Bell Button */}
      <button
        type="button"
        onClick={toggleOpen}
        data-notification-trigger="true"
        className="w-9 h-9 rounded-2xl bg-white/90 dark:bg-[#0D1814]/90 backdrop-blur-xs border border-[#E8E2D5] dark:border-[#223326] text-[#2B351F] dark:text-[#E2EBD8] hover:bg-white dark:hover:bg-[#15231C] transition-colors relative shadow-xs flex items-center justify-center cursor-pointer"
        aria-label="Notifications"
        title={unreadCount > 0 ? `${unreadCount} unread routine notifications` : 'Routine Notifications'}
      >
        <FontAwesomeIcon icon={faBell} className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-[#2B351F] dark:text-[#E2EBD8]" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white dark:ring-[#0D1814]">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Global Notification Popover */}
      <NotificationPopover />

      {/* Botanical Calendar Modal */}
      <BotanicalCalendarModal
        isOpen={isCalendarOpen}
        onClose={() => setIsCalendarOpen(false)}
        selectedDate={selectedDate}
        onSelectDate={(date) => {
          setSelectedDate(date)
          setIsCalendarOpen(false)
        }}
      />

      {/* User Avatar */}
      <Link
        to="/profile"
        className="w-9 h-9 rounded-full overflow-hidden border-2 border-white dark:border-[#223326] shadow-xs cursor-pointer flex-shrink-0 bg-[#EEF4E8] dark:bg-[#15231C] hover:ring-2 hover:ring-[#738541] transition-all"
        title="Open Profile"
      >
        <img
          src={avatarUrl}
          alt={fullName || 'Profile'}
          className="w-full h-full object-cover"
        />
      </Link>
    </header>
  )
}
