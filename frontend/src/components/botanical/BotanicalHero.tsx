import { useState, useEffect } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faChevronLeft,
  faChevronRight,
  faCalendarDays,
  faBell,
  faChevronDown,
  faRotateRight,
} from '@fortawesome/free-solid-svg-icons'
import { format, addDays, isSameDay, isToday } from 'date-fns'
import { Link } from 'react-router-dom'
import { useUserProfile } from '../../contexts/UserProfileContext'
import { useNotifications } from '../../contexts/NotificationContext'
import { NotificationPopover } from '../notifications/NotificationPopover'
import { BotanicalCalendarModal } from './BotanicalCalendarModal'
import { ThemeToggle } from '../common/ThemeToggle'
import { useTheme } from '../../contexts/ThemeContext'

interface BotanicalHeroProps {
  selectedDate: Date
  onSelectDate: (date: Date) => void
  userName?: string
}

interface HeroScene {
  id: string
  name: string
  timeLabel: string
  greeting: string
  src: string
}

const HERO_SCENES: HeroScene[] = [
  {
    id: 'mountain-sunrise',
    name: 'Mountain Sunrise',
    timeLabel: 'Morning',
    greeting: 'Good morning',
    src: '/botanical/hero-sunrise.jpg',
  },
  {
    id: 'misty-forest',
    name: 'Misty Evergreen',
    timeLabel: 'Morning',
    greeting: 'Good morning',
    src: '/botanical/hero-forest.jpg',
  },
  {
    id: 'emerald-glade',
    name: 'Emerald Canopy',
    timeLabel: 'Midday',
    greeting: 'Good afternoon',
    src: '/botanical/hero-afternoon.jpg',
  },
  {
    id: 'alpine-lake',
    name: 'Alpine Reflection',
    timeLabel: 'Afternoon',
    greeting: 'Good afternoon',
    src: '/botanical/hero-lake.jpg',
  },
  {
    id: 'foggy-pines',
    name: 'Pine Solitude',
    timeLabel: 'Afternoon',
    greeting: 'Good afternoon',
    src: '/botanical/hero-morning.jpg',
  },
  {
    id: 'golden-sunset',
    name: 'Golden Ridgeline',
    timeLabel: 'Evening',
    greeting: 'Good evening',
    src: '/botanical/hero-sunset.jpg',
  },
  {
    id: 'twilight-haven',
    name: 'Twilight Mist',
    timeLabel: 'Dusk',
    greeting: 'Good evening',
    src: '/botanical/hero-twilight.jpg',
  },
  {
    id: 'celestial-cosmos',
    name: 'Celestial Cosmos',
    timeLabel: 'Night',
    greeting: 'Good evening',
    src: '/botanical/hero-cosmos.jpg',
  },
]

function getInitialSceneIndex(): number {
  const hour = new Date().getHours()
  if (hour >= 5 && hour < 11) return 0 // Mountain Sunrise
  if (hour >= 11 && hour < 14) return 2 // Emerald Forest
  if (hour >= 14 && hour < 17) return 3 // Alpine Lake
  if (hour >= 17 && hour < 20) return 5 // Golden Sunset
  return 6 // Twilight
}

export function getRealTimeGreeting(): string {
  const hour = new Date().getHours()
  if (hour >= 5 && hour < 12) {
    return 'Good morning'
  }
  if (hour >= 12 && hour < 17) {
    return 'Good afternoon'
  }
  return 'Good evening'
}

// 7 Weekdays starting from Sunday as requested
const WEEK_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const WEEK_DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function BotanicalHero({
  selectedDate,
  onSelectDate,
  userName = 'Dishant',
}: BotanicalHeroProps) {
  const { avatarUrl, fullName } = useUserProfile()
  const { unreadCount, toggleOpen } = useNotifications()
  const displayName = fullName || userName

  const [currentSceneIndex, setCurrentSceneIndex] = useState<number>(getInitialSceneIndex)
  const [greeting, setGreeting] = useState<string>(getRealTimeGreeting)
  const [isAutoCycling] = useState<boolean>(true)
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)

  // Keep greeting strictly synchronized with real-world local time
  useEffect(() => {
    setGreeting(getRealTimeGreeting())
    const timer = setInterval(() => {
      setGreeting(getRealTimeGreeting())
    }, 30000)
    return () => clearInterval(timer)
  }, [])

  // Automatically cycle scenes over time
  useEffect(() => {
    if (!isAutoCycling) return
    const timer = setInterval(() => {
      setCurrentSceneIndex((prev) => (prev + 1) % HERO_SCENES.length)
    }, 9000)
    return () => clearInterval(timer)
  }, [isAutoCycling])

  const handleNextScene = () => {
    setCurrentSceneIndex((prev) => (prev + 1) % HERO_SCENES.length)
  }

  // Weekdays grid starting strictly on Sunday (getDay() returns 0 for Sunday)
  const baseDate = new Date(selectedDate)
  const sundayOffset = baseDate.getDay() // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  const weekStart = addDays(baseDate, -sundayOffset)
  const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i))

  const handlePrevWeek = () => {
    onSelectDate(addDays(selectedDate, -7))
  }

  const handleNextWeek = () => {
    onSelectDate(addDays(selectedDate, 7))
  }

  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const isTodaySelected = isSameDay(selectedDate, new Date())
  const currentScene = HERO_SCENES[currentSceneIndex]

  return (
    <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-botanical-cream dark:bg-[#08100C] border border-botanical-border/70 dark:border-[#223326] min-h-[195px] sm:min-h-[235px] lg:min-h-[245px] flex flex-col justify-between p-3 sm:p-5 shadow-sm">
      {/* 1. Background Artworks */}
      <div className="absolute inset-0 w-full h-full pointer-events-none select-none overflow-hidden z-0">
        {HERO_SCENES.map((scene, idx) => (
          <img
            key={scene.id}
            src={scene.src}
            alt={scene.name}
            onError={(e) => {
              e.currentTarget.src = '/botanical/hero-sunrise.jpg'
            }}
            className={`absolute inset-0 w-full h-full object-cover object-center select-none pointer-events-none transition-opacity duration-1000 ease-in-out ${
              idx === currentSceneIndex ? 'opacity-85' : 'opacity-0'
            }`}
          />
        ))}

        {/* Ambient gentle gradient overlay - clean and clear, zero glowing yellow haze */}
        <div className={`absolute inset-0 pointer-events-none transition-colors duration-300 ${
          isDark
            ? 'bg-gradient-to-t from-black/45 via-transparent to-black/20'
            : 'bg-gradient-to-t from-botanical-cream/40 via-transparent to-black/10'
        }`} />
      </div>

      {/* 2. Top Bar Controls: LEFT Calendar Pill, RIGHT Avatar & Notification Bell */}
      <div className="relative z-30 flex items-center justify-between gap-1.5 sm:gap-2.5 w-full">
        {/* LEFT SIDE: Clickable Calendar Date & Number Widget */}
        <div className="flex items-center gap-1 sm:gap-2 min-w-0">
          <button
            type="button"
            onClick={() => setIsCalendarOpen(true)}
            className="flex items-center gap-1.5 sm:gap-2.5 px-2 sm:px-3.5 py-1 sm:py-1.5 bg-white/95 hover:bg-white dark:bg-[#0D1814]/90 dark:hover:bg-[#15231C] backdrop-blur-md border border-botanical-border dark:border-[#223326] rounded-xl sm:rounded-2xl shadow-xs text-xs sm:text-sm font-semibold text-leaf-darkText dark:text-[#F5F2EB] hover:border-[#738541] dark:hover:border-[#4E6826] transition-all cursor-pointer group max-w-[210px] xs:max-w-none"
            title="Click to open calendar and manually switch between dates"
          >
            <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-lg bg-[#EEF4E8] dark:bg-[#1D2D23] text-[#738541] dark:text-[#9EB868] flex items-center justify-center text-[10px] sm:text-xs group-hover:bg-[#738541] group-hover:text-white transition-colors flex-shrink-0">
              <FontAwesomeIcon icon={faCalendarDays} />
            </div>
            <div className="flex flex-col text-left min-w-0">
              <span className="text-[11px] sm:text-[13px] font-bold text-[#1D2516] dark:text-[#F5F2EB] leading-tight truncate">
                <span className="hidden sm:inline">{format(selectedDate, 'EEE, d MMM yyyy')}</span>
                <span className="sm:hidden">{format(selectedDate, 'MMM d, yyyy')}</span>
              </span>
              <span className="text-[9px] sm:text-[10px] text-[#738541] dark:text-[#9EB868] font-medium leading-none mt-0.5 truncate">
                {isTodaySelected ? 'Today · Switch' : 'Switch date'}
              </span>
            </div>
            <FontAwesomeIcon
              icon={faChevronDown}
              className="w-2 h-2 sm:w-2.5 sm:h-2.5 text-botanical-mutedText dark:text-[#8FA387] ml-0.5 sm:ml-1 group-hover:text-[#738541] dark:group-hover:text-[#9EB868] transition-colors flex-shrink-0"
            />
          </button>

          {/* Jump to Today Pill Button if not on today */}
          {!isTodaySelected && (
            <button
              type="button"
              onClick={() => onSelectDate(new Date())}
              className="px-2 sm:px-3 py-1 sm:py-1.5 rounded-xl sm:rounded-2xl bg-[#738541] dark:bg-[#4E6826] text-white hover:bg-[#607034] dark:hover:bg-[#41581F] text-[11px] sm:text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shadow-2xs border border-[#5E6F34] dark:border-[#5E7E2E] flex-shrink-0"
              title="Jump back to Today"
            >
              <FontAwesomeIcon icon={faRotateRight} className="text-[10px]" />
              <span className="hidden xs:inline sm:inline">Today</span>
            </button>
          )}
        </div>

        {/* RIGHT SIDE: Scene Switcher, Notification Bell, Avatar */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 flex-shrink-0">
          {/* Scene Indicator / Switcher Pill */}
          <button
            type="button"
            onClick={handleNextScene}
            className="px-3 py-1.5 bg-white/90 hover:bg-white dark:bg-[#0D1814]/90 dark:hover:bg-[#15231C] backdrop-blur-md border border-botanical-border dark:border-[#223326] rounded-2xl shadow-xs text-xs font-semibold text-leaf-darkText dark:text-[#E2EBD8] transition-all cursor-pointer hidden md:flex items-center gap-1.5"
            title="Click to cycle next artwork scene"
          >
            <span>{currentScene.name}</span>
          </button>

          {/* Theme Toggle Button (Light/Dark Mode) */}
          <ThemeToggle />

          {/* Notification Bell with Global Popover */}
          <button
            type="button"
            onClick={toggleOpen}
            data-notification-trigger="true"
            className="w-9 h-9 rounded-2xl bg-white/95 dark:bg-[#0D1814]/90 dark:hover:bg-[#15231C] backdrop-blur-md border border-botanical-border dark:border-[#223326] text-leaf-darkText dark:text-[#E2EBD8] hover:bg-white transition-colors relative shadow-xs flex items-center justify-center cursor-pointer"
            aria-label="Notifications"
            title={unreadCount > 0 ? `${unreadCount} unread routine notifications` : 'Routine Notifications'}
          >
            <FontAwesomeIcon icon={faBell} className="w-3.5 h-3.5 text-leaf-darkText dark:text-[#E2EBD8]" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[#E57342] text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white dark:ring-[#0D1814]">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* User Avatar */}
          <Link
            to="/profile"
            className="w-9 h-9 rounded-full overflow-hidden border-2 border-white dark:border-[#223326] shadow-xs cursor-pointer flex-shrink-0 bg-leaf-pill hover:ring-2 hover:ring-leaf-1 transition-all"
            title="Open Profile"
          >
            <img
              src={avatarUrl}
              alt={displayName}
              className="w-full h-full object-cover"
            />
          </Link>
        </div>
      </div>

      {/* 3. Middle Content: Centered Greeting, Date Day Year Display, & Green Weekdays Bar */}
      <div className="relative z-20 flex-1 flex flex-col items-center justify-center text-center my-auto py-1 sm:py-2 max-w-2xl mx-auto w-full">
        <h1
          className="text-lg sm:text-2xl lg:text-[28px] font-serif font-black tracking-tight select-none transition-colors duration-200"
          style={{
            color: isDark ? '#FFFFFF' : '#111827',
            textShadow: isDark
              ? '0 2px 4px rgba(0,0,0,0.85)'
              : '0 1px 2px rgba(255,255,255,0.85)',
          }}
        >
          {greeting}, {displayName}
        </h1>

        <p
          className="text-[11px] sm:text-[13px] font-bold leading-normal mt-0.5 sm:mt-1 max-w-lg mx-auto select-none transition-colors duration-200"
          style={{
            color: isDark ? '#F1F5F9' : '#1F2937',
            textShadow: isDark
              ? '0 1px 3px rgba(0,0,0,0.85)'
              : '0 1px 2px rgba(255,255,255,0.85)',
          }}
        >
          Small, consistent habits today build a better version of you tomorrow.
        </p>

        {/* Middle Green Weekdays Strip (Sunday, Monday, Tuesday, Wednesday, Thursday, Friday, Saturday) */}
        <div className="mt-2 sm:mt-2.5 inline-flex items-center gap-0.5 sm:gap-1 p-0.5 sm:p-1.5 bg-[#202816]/95 dark:bg-[#0D1814]/95 backdrop-blur-md border border-[#384628] dark:border-[#223326] rounded-xl sm:rounded-2xl shadow-md text-white max-w-full overflow-hidden">
          <button
            onClick={handlePrevWeek}
            className="p-1 sm:p-1.5 rounded-lg sm:rounded-xl text-[#B7C2A1] dark:text-[#8FA387] hover:text-white dark:hover:text-white hover:bg-white/10 dark:hover:bg-white/10 transition-colors cursor-pointer shrink-0"
            aria-label="Previous week"
            title="Previous week"
          >
            <FontAwesomeIcon icon={faChevronLeft} className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          </button>

          <div className="flex items-center gap-0.5 sm:gap-1.5 overflow-x-auto no-scrollbar max-w-[calc(100vw-68px)] sm:max-w-full">
            {weekDays.map((day, idx) => {
              const isSelected = isSameDay(day, selectedDate)
              const isCurrentDay = isToday(day)

              return (
                <button
                  key={idx}
                  onClick={() => onSelectDate(day)}
                  className={`flex flex-col items-center justify-center py-1 sm:py-1.5 px-1.5 sm:px-3 min-w-[30px] sm:min-w-[48px] rounded-lg sm:rounded-2xl transition-all duration-200 cursor-pointer ${
                    isSelected
                      ? 'bg-[#738541] dark:bg-[#4E6826] text-white shadow-md shadow-[#738541]/40 dark:shadow-[#4E6826]/40 scale-102 font-bold ring-2 ring-white/30 dark:ring-[#A8D968]/40'
                      : 'text-[#D0DAC0] dark:text-[#CBD8BF] hover:text-white dark:hover:text-white hover:bg-white/10 dark:hover:bg-white/10'
                  }`}
                  title={`${WEEK_DAYS[idx]}, ${format(day, 'd MMMM yyyy')}`}
                >
                  {/* Full Weekday name on large screens, short on mobile */}
                  <span
                    className={`text-[9px] sm:text-[11px] font-medium hidden md:inline ${
                      isSelected ? 'text-white' : 'text-[#A0B086] dark:text-slate-400'
                    }`}
                  >
                    {WEEK_DAYS[idx]}
                  </span>
                  <span
                    className={`text-[9px] sm:text-[11px] font-medium md:hidden ${
                      isSelected ? 'text-white' : 'text-[#A0B086] dark:text-slate-400'
                    }`}
                  >
                    {WEEK_DAYS_SHORT[idx]}
                  </span>

                  {/* Day number */}
                  <span
                    className={`text-xs sm:text-base font-bold leading-tight mt-0.5 flex items-center gap-0.5 ${
                      isSelected ? 'text-white' : 'text-[#E8EFCF] dark:text-slate-100'
                    }`}
                  >
                    {format(day, 'd')}
                    {isCurrentDay && !isSelected && (
                      <span className="w-1 h-1 rounded-full bg-[#E57342]" title="Today" />
                    )}
                  </span>
                </button>
              )
            })}
          </div>

          <button
            onClick={handleNextWeek}
            className="p-1 sm:p-1.5 rounded-xl text-[#B7C2A1] dark:text-slate-400 hover:text-white dark:hover:text-white hover:bg-white/10 dark:hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Next week"
            title="Next week"
          >
            <FontAwesomeIcon icon={faChevronRight} className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 4. Bottom: Subtle Scene Pagination Dots */}
      <div className="relative z-20 flex items-center justify-center gap-1.5 pt-1">
        {HERO_SCENES.map((scene, idx) => (
          <button
            key={scene.id}
            onClick={() => setCurrentSceneIndex(idx)}
            className={`h-1.5 rounded-full transition-all cursor-pointer ${
              idx === currentSceneIndex
                ? 'bg-[#738541] dark:bg-emerald-400 w-5'
                : 'bg-black/20 dark:bg-white/20 hover:bg-black/40 dark:hover:bg-white/40 w-1.5'
            }`}
            title={`Switch to ${scene.name} (${scene.timeLabel})`}
            aria-label={`Switch to ${scene.name}`}
          />
        ))}
      </div>

      {/* Global Portal-Based Notification Popover (Rendered to document.body, free from hero overflow-hidden) */}
      <NotificationPopover />

      {/* Interactive Botanical Date Picker Calendar Modal (Rendered to document.body) */}
      <BotanicalCalendarModal
        isOpen={isCalendarOpen}
        onClose={() => setIsCalendarOpen(false)}
        selectedDate={selectedDate}
        onSelectDate={(date) => {
          onSelectDate(date)
          setIsCalendarOpen(false)
        }}
      />
    </div>
  )
}
