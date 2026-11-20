import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { format, parseISO, isValid } from 'date-fns'

interface DateContextType {
  selectedDate: Date
  selectedDateStr: string
  setSelectedDate: (date: Date | string) => void
  isToday: boolean
  resetToToday: () => void
  todayStr: string
  todayDate: Date
}

const DateContext = createContext<DateContextType | undefined>(undefined)

const SESSION_DATE_KEY = 'future_you_selected_date'

export function DateProvider({ children }: { children: React.ReactNode }) {
  const [searchParams, setSearchParams] = useSearchParams()
  const dateParam = searchParams.get('date')

  const [todayDate, setTodayDate] = useState(() => new Date())
  const todayStr = useMemo(() => format(todayDate, 'yyyy-MM-dd'), [todayDate])

  // Initial date resolution:
  // 1. URL search parameter ?date=YYYY-MM-DD
  // 2. Session storage active date (if historical)
  // 3. Fallback to today's date
  const [selectedDate, setSelectedDateState] = useState<Date>(() => {
    if (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
      const parsed = parseISO(dateParam)
      if (isValid(parsed)) return parsed
    }
    try {
      const stored = sessionStorage.getItem(SESSION_DATE_KEY)
      if (stored && /^\d{4}-\d{2}-\d{2}$/.test(stored)) {
        const parsed = parseISO(stored)
        if (isValid(parsed)) return parsed
      }
    } catch {}
    return new Date()
  })

  const selectedDateStr = useMemo(() => format(selectedDate, 'yyyy-MM-dd'), [selectedDate])
  const isToday = useMemo(() => selectedDateStr === todayStr, [selectedDateStr, todayStr])

  // Synchronize when URL search param ?date= changes
  useEffect(() => {
    if (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
      const parsed = parseISO(dateParam)
      if (isValid(parsed)) {
        if (dateParam !== selectedDateStr) {
          setSelectedDateState(parsed)
        }
        try {
          if (dateParam === todayStr) {
            sessionStorage.removeItem(SESSION_DATE_KEY)
          } else {
            sessionStorage.setItem(SESSION_DATE_KEY, dateParam)
          }
        } catch {}
      }
    } else if (!dateParam) {
      // If URL has no dateParam, check if session storage had a historical date that should be restored
      try {
        const stored = sessionStorage.getItem(SESSION_DATE_KEY)
        if (stored && stored !== todayStr && /^\d{4}-\d{2}-\d{2}$/.test(stored)) {
          const parsed = parseISO(stored)
          if (isValid(parsed)) {
            setSelectedDateState(parsed)
            setSearchParams((prev) => {
              const next = new URLSearchParams(prev)
              next.set('date', stored)
              return next
            }, { replace: true })
            return
          }
        }
      } catch {}

      if (!isToday) {
        setSelectedDateState(new Date())
      }
    }
  }, [dateParam, selectedDateStr, todayStr, isToday, setSearchParams])

  // Midnight day-rollover monitor
  useEffect(() => {
    const handleDaySync = () => {
      const now = new Date()
      const nowStr = format(now, 'yyyy-MM-dd')
      if (nowStr !== todayStr) {
        setTodayDate(now)
        if (isToday) {
          setSelectedDateState(now)
          try {
            sessionStorage.removeItem(SESSION_DATE_KEY)
          } catch {}
        }
      }
    }

    window.addEventListener('future-you-day-rollover', handleDaySync)
    window.addEventListener('focus', handleDaySync)
    const handleVis = () => {
      if (document.visibilityState === 'visible') handleDaySync()
    }
    document.addEventListener('visibilitychange', handleVis)
    const timer = setInterval(handleDaySync, 30000)
    return () => {
      window.removeEventListener('future-you-day-rollover', handleDaySync)
      window.removeEventListener('focus', handleDaySync)
      document.removeEventListener('visibilitychange', handleVis)
      clearInterval(timer)
    }
  }, [todayStr, isToday])

  const setSelectedDate = useCallback((date: Date | string) => {
    const parsed = typeof date === 'string' ? parseISO(date) : date
    if (!isValid(parsed)) return

    const dStr = format(parsed, 'yyyy-MM-dd')
    const currentTodayStr = format(new Date(), 'yyyy-MM-dd')
    setSelectedDateState(parsed)

    try {
      if (dStr === currentTodayStr) {
        sessionStorage.removeItem(SESSION_DATE_KEY)
      } else {
        sessionStorage.setItem(SESSION_DATE_KEY, dStr)
      }
    } catch {}

    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      if (dStr === currentTodayStr) {
        next.delete('date')
      } else {
        next.set('date', dStr)
      }
      return next
    }, { replace: true })
  }, [setSearchParams])

  const resetToToday = useCallback(() => {
    const now = new Date()
    setSelectedDateState(now)
    try {
      sessionStorage.removeItem(SESSION_DATE_KEY)
    } catch {}
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.delete('date')
      return next
    }, { replace: true })
  }, [setSearchParams])

  return (
    <DateContext.Provider
      value={{
        selectedDate,
        selectedDateStr,
        setSelectedDate,
        isToday,
        resetToToday,
        todayStr,
        todayDate,
      }}
    >
      {children}
    </DateContext.Provider>
  )
}

export function useAppDate() {
  const context = useContext(DateContext)
  if (!context) {
    throw new Error('useAppDate must be used within a DateProvider')
  }
  return context
}
