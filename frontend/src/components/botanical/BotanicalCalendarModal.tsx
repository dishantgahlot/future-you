import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faCalendarDays,
  faChevronLeft,
  faChevronRight,
  faXmark,
  faRotateRight,
  faCheck,
  faArrowRight,
} from '@fortawesome/free-solid-svg-icons'
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  addMonths,
  subMonths,
  setMonth as setDateMonth,
  setYear as setDateYear,
  parseISO,
  isValid,
} from 'date-fns'

interface BotanicalCalendarModalProps {
  isOpen: boolean
  onClose: () => void
  selectedDate: Date
  onSelectDate: (date: Date) => void
}

const WEEKDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

export function BotanicalCalendarModal({
  isOpen,
  onClose,
  selectedDate,
  onSelectDate,
}: BotanicalCalendarModalProps) {
  // Month currently being viewed in the calendar
  const [currentMonth, setCurrentMonth] = useState<Date>(() => selectedDate)
  // Typeable date input state
  const [typedDateStr, setTypedDateStr] = useState<string>('')
  // Typeable year input state
  const [typedYear, setTypedYear] = useState<string>(() => String(selectedDate.getFullYear()))
  const [inputError, setInputError] = useState<string | null>(null)

  // Sync viewed month when selectedDate changes or modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentMonth(selectedDate)
      setTypedYear(String(selectedDate.getFullYear()))
      setTypedDateStr(format(selectedDate, 'yyyy-MM-dd'))
      setInputError(null)
    }
  }, [isOpen, selectedDate])

  // ESC key handler
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen || typeof document === 'undefined') return null

  // Calculate days grid starting on Sunday (weekStartsOn: 0)
  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(monthStart)
  const startDate = startOfWeek(monthStart, { weekStartsOn: 0 })
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 })
  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate })

  const handlePrevMonth = () => {
    const prev = subMonths(currentMonth, 1)
    setCurrentMonth(prev)
    setTypedYear(String(prev.getFullYear()))
  }

  const handleNextMonth = () => {
    const next = addMonths(currentMonth, 1)
    setCurrentMonth(next)
    setTypedYear(String(next.getFullYear()))
  }

  const handleJumpToToday = () => {
    const today = new Date()
    setCurrentMonth(today)
    setTypedYear(String(today.getFullYear()))
    setTypedDateStr(format(today, 'yyyy-MM-dd'))
    onSelectDate(today)
    setInputError(null)
  }

  const handleSelectDay = (day: Date) => {
    onSelectDate(day)
    setTypedDateStr(format(day, 'yyyy-MM-dd'))
    setTypedYear(String(day.getFullYear()))
    setInputError(null)
    if (!isSameMonth(day, currentMonth)) {
      setCurrentMonth(day)
    }
  }

  // Handle month dropdown change
  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newMonthIndex = parseInt(e.target.value, 10)
    const updated = setDateMonth(currentMonth, newMonthIndex)
    setCurrentMonth(updated)
  }

  // Handle typing year directly
  const handleYearChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setTypedYear(val)
    const parsed = parseInt(val, 10)
    if (!isNaN(parsed) && parsed >= 1950 && parsed <= 2100) {
      const updated = setDateYear(currentMonth, parsed)
      setCurrentMonth(updated)
      setInputError(null)
    }
  }

  // Handle typing full date directly (e.g. 2023-08-14)
  const handleApplyTypedDate = () => {
    if (!typedDateStr.trim()) return

    // Clean up input
    const trimmed = typedDateStr.trim()
    let parsedDate: Date | null = null

    // Try standard YYYY-MM-DD
    if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(trimmed)) {
      parsedDate = parseISO(trimmed)
    } else if (/^\d{1,2}[/-]\d{1,2}[/-]\d{4}$/.test(trimmed)) {
      // Support DD/MM/YYYY or DD-MM-YYYY
      const parts = trimmed.split(/[/-]/)
      const day = parseInt(parts[0], 10)
      const month = parseInt(parts[1], 10) - 1
      const year = parseInt(parts[2], 10)
      parsedDate = new Date(year, month, day)
    } else {
      parsedDate = new Date(trimmed)
    }

    if (parsedDate && isValid(parsedDate)) {
      onSelectDate(parsedDate)
      setCurrentMonth(parsedDate)
      setTypedYear(String(parsedDate.getFullYear()))
      setInputError(null)
    } else {
      setInputError('Please enter a valid date (e.g. 2024-05-18 or 18/05/2024)')
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4">
      {/* Dark backdrop with blur */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/40 dark:bg-black/75 backdrop-blur-xs dark:backdrop-blur-sm cursor-pointer"
      />

      {/* Calendar Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-sm sm:max-w-md bg-[#FCFAF6] dark:bg-[#0D1814] border border-[#DDD6C5] dark:border-[#223326] rounded-3xl shadow-[0_24px_64px_rgba(20,28,14,0.25)] dark:shadow-[0_24px_64px_rgba(0,0,0,0.7)] overflow-hidden flex flex-col p-4 sm:p-5 select-none"
      >
        {/* Top Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#EAE3D5] dark:border-[#223326]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#EEF4E8] dark:bg-[#1C2C1D] text-[#415525] dark:text-[#A8D968] flex items-center justify-center shadow-2xs border border-[#D5E3C4] dark:border-[#2E4731]">
              <FontAwesomeIcon icon={faCalendarDays} className="text-sm" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-base sm:text-lg text-[#1D2516] dark:text-[#F5F2EB] leading-tight">
                Select Date
              </h3>
              <p className="text-[11px] text-[#6F6759] dark:text-[#8FA387]">
                Type or pick any date to inspect progress
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleJumpToToday}
              className="px-2.5 py-1 rounded-xl bg-[#EEF4E8] dark:bg-[#1C2C1D] text-[#415525] dark:text-[#A8D968] hover:bg-[#E2ECD6] dark:hover:bg-[#253A26] font-bold text-xs transition-colors cursor-pointer border border-[#D5E3C4] dark:border-[#2E4731] flex items-center gap-1 shadow-2xs"
              title="Jump to today"
            >
              <FontAwesomeIcon icon={faRotateRight} className="text-[10px]" />
              <span>Today</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-xl text-[#6F6759] dark:text-[#8FA387] hover:text-[#1D2516] dark:hover:text-[#F5F2EB] hover:bg-black/5 dark:hover:bg-white/5 flex items-center justify-center transition-colors cursor-pointer"
              title="Close"
            >
              <FontAwesomeIcon icon={faXmark} />
            </button>
          </div>
        </div>

        {/* 1. Typeable Quick Jump Input Bar */}
        <div className="pt-3 pb-2">
          <label className="text-[11px] font-bold text-[#556933] dark:text-[#A8D968] block mb-1">
            Type Date or Year:
          </label>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={typedDateStr}
                onChange={(e) => {
                  setTypedDateStr(e.target.value)
                  setInputError(null)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleApplyTypedDate()
                  }
                }}
                placeholder="YYYY-MM-DD (e.g. 2021-06-15)"
                className="w-full px-3 py-1.5 text-xs sm:text-sm rounded-xl bg-white dark:bg-[#132219] border border-[#D5CBB6] dark:border-[#223326] text-[#1D2516] dark:text-[#F5F2EB] placeholder:text-[#9A9180] dark:placeholder-[#5D705C] focus:outline-none focus:ring-2 focus:ring-[#738541] dark:focus:ring-[#4E6826] focus:border-transparent transition-all shadow-2xs font-mono"
              />
            </div>
            <button
              type="button"
              onClick={handleApplyTypedDate}
              className="px-3 py-1.5 rounded-xl bg-[#738541] hover:bg-[#5E6F34] dark:bg-[#4E6826] dark:hover:bg-[#5D7E2D] text-white font-bold text-xs sm:text-sm transition-colors cursor-pointer shadow-2xs flex items-center gap-1 flex-shrink-0"
              title="Jump to typed date"
            >
              <span>Jump</span>
              <FontAwesomeIcon icon={faArrowRight} className="text-[10px]" />
            </button>
          </div>
          {inputError && (
            <p className="text-[11px] text-red-600 dark:text-red-400 mt-1 font-medium">{inputError}</p>
          )}
        </div>

        {/* 2. Month Dropdown & Typeable Year Navigation Row */}
        <div className="flex items-center justify-between py-2 border-t border-[#EAE3D5]/60 dark:border-[#223326]">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="w-8 h-8 rounded-xl text-[#415525] dark:text-[#A8D968] hover:bg-[#EEF4E8] dark:hover:bg-[#1C2C1D] flex items-center justify-center transition-colors cursor-pointer border border-transparent hover:border-[#D5E3C4] dark:hover:border-[#2E4731]"
            aria-label="Previous month"
            title="Previous month"
          >
            <FontAwesomeIcon icon={faChevronLeft} className="text-xs" />
          </button>

          {/* Typeable Month & Year Selectors */}
          <div className="flex items-center gap-1.5">
            {/* Month Dropdown */}
            <select
              value={currentMonth.getMonth()}
              onChange={handleMonthChange}
              className="px-2 py-1 rounded-lg bg-white dark:bg-[#132219] border border-[#D5CBB6] dark:border-[#223326] text-xs sm:text-sm font-bold text-[#1D2516] dark:text-[#F5F2EB] focus:outline-none focus:ring-1 focus:ring-[#738541] dark:focus:ring-[#4E6826] cursor-pointer shadow-2xs"
            >
              {MONTHS.map((m, idx) => (
                <option key={m} value={idx}>
                  {m}
                </option>
              ))}
            </select>

            {/* Typeable Year Input */}
            <input
              type="number"
              min="1950"
              max="2100"
              value={typedYear}
              onChange={handleYearChange}
              className="w-16 px-2 py-1 rounded-lg bg-white dark:bg-[#132219] border border-[#D5CBB6] dark:border-[#223326] text-xs sm:text-sm font-bold text-[#1D2516] dark:text-[#F5F2EB] text-center focus:outline-none focus:ring-1 focus:ring-[#738541] dark:focus:ring-[#4E6826] font-mono shadow-2xs"
              title="Type year directly"
            />
          </div>

          <button
            type="button"
            onClick={handleNextMonth}
            className="w-8 h-8 rounded-xl text-[#415525] dark:text-[#A8D968] hover:bg-[#EEF4E8] dark:hover:bg-[#1C2C1D] flex items-center justify-center transition-colors cursor-pointer border border-transparent hover:border-[#D5E3C4] dark:hover:border-[#2E4731]"
            aria-label="Next month"
            title="Next month"
          >
            <FontAwesomeIcon icon={faChevronRight} className="text-xs" />
          </button>
        </div>

        {/* Weekday Names Header (Starting Sunday) */}
        <div className="grid grid-cols-7 gap-1 text-center py-1 border-b border-[#EAE3D5]/60 dark:border-[#223326] mb-1">
          {WEEKDAY_NAMES.map((w, idx) => (
            <div
              key={w}
              className={`text-[11px] font-bold py-1 ${
                idx === 0 || idx === 6 ? 'text-[#8C8474] dark:text-[#7A8E76]' : 'text-[#556933] dark:text-[#A8D968]'
              }`}
            >
              {w}
            </div>
          ))}
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 gap-1 sm:gap-1.5 py-1">
          {calendarDays.map((day) => {
            const inCurrentMonth = isSameMonth(day, currentMonth)
            const isSelected = isSameDay(day, selectedDate)
            const isCurrentDay = isToday(day)

            return (
              <button
                key={day.toISOString()}
                type="button"
                onClick={() => handleSelectDay(day)}
                className={`h-9 sm:h-10 rounded-xl sm:rounded-2xl flex flex-col items-center justify-center transition-all cursor-pointer relative ${
                  isSelected
                    ? 'bg-[#738541] dark:bg-[#4E6826] text-white font-bold shadow-sm shadow-[#738541]/40 scale-102 ring-2 ring-[#415525] dark:ring-[#739938]'
                    : inCurrentMonth
                    ? 'text-[#1D2516] dark:text-[#F5F2EB] hover:bg-[#EEF4E8] dark:hover:bg-[#1C2C1D] hover:text-[#415525] dark:hover:text-[#A8D968]'
                    : 'text-[#B0A795] dark:text-[#4A5D4D] hover:bg-[#F2ECE1] dark:hover:bg-[#142019] opacity-50'
                } ${isCurrentDay && !isSelected ? 'border border-[#738541] dark:border-[#4E6826] font-bold text-[#415525] dark:text-[#A8D968]' : ''}`}
              >
                <span className="text-xs sm:text-sm leading-tight">
                  {format(day, 'd')}
                </span>
                {isCurrentDay && !isSelected && (
                  <span className="w-1 h-1 rounded-full bg-[#738541] dark:bg-[#A8D968] mt-0.5" />
                )}
              </button>
            )
          })}
        </div>

        {/* Selected Date Summary & Done Button */}
        <div className="mt-3 pt-3 border-t border-[#EAE3D5] dark:border-[#223326] flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#8C8474] dark:text-[#8FA387] block">
              Active Date
            </span>
            <span className="text-xs sm:text-sm font-bold text-[#1D2516] dark:text-[#F5F2EB] truncate block">
              {format(selectedDate, 'EEEE, d MMMM yyyy')}
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="py-2 px-4 rounded-xl bg-[#738541] hover:bg-[#5E6F34] dark:bg-[#4E6826] dark:hover:bg-[#5D7E2D] text-white font-bold text-xs sm:text-sm transition-colors cursor-pointer shadow-xs flex items-center gap-1.5 flex-shrink-0"
          >
            <FontAwesomeIcon icon={faCheck} className="text-xs" />
            <span>Apply</span>
          </button>
        </div>
      </motion.div>
    </div>,
    document.body
  )
}
