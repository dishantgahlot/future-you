import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react'
import { format } from 'date-fns'
import { getLocalHabits, getAllLocalLogs } from '../utils/habitStorage'

export interface AppNotification {
  id: string
  title: string
  message: string
  timestamp: string // ISO string
  cadence: '1h' | 'initial' | 'custom'
  read: boolean
  stats: {
    completedCount: number
    totalCount: number
    percent: number
    pendingHabits: string[]
  }
}

interface NotificationContextType {
  notifications: AppNotification[]
  unreadCount: number
  isOpen: boolean
  isBrowserPermissionGranted: boolean
  setIsOpen: (open: boolean) => void
  toggleOpen: () => void
  markAsRead: (id: string) => void
  markAllAsRead: () => void
  clearNotification: (id: string) => void
  clearAll: () => void
  requestBrowserPermission: () => Promise<boolean>
  triggerCadenceNotification: (cadence?: '1h') => void
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

const STORAGE_KEY = 'future-you-notifications-v2'
const LAST_HOURLY_NOTIFICATION_KEY = 'future-you-last-hourly-notification-time'
const ONE_HOUR_MS = 60 * 60 * 1000 // Exactly 1 hour in milliseconds

function computeTodayHabitStats() {
  const habits = getLocalHabits().filter((h) => h.is_active)
  const allLogs = getAllLocalLogs()
  const todayStr = format(new Date(), 'yyyy-MM-dd')
  const todayLogs = allLogs.filter((l) => l.log_date === todayStr)

  let completed = 0
  const pendingNames: string[] = []

  habits.forEach((h) => {
    const log = todayLogs.find((l) => l.habit_id === h.id)
    const target = h.target_value || 1
    const actual = log?.actual_value !== undefined ? log.actual_value : log?.completion_status ? target : 0
    if (actual >= target && target > 0) {
      completed++
    } else {
      pendingNames.push(h.name)
    }
  })

  const total = habits.length || 1
  const percent = Math.min(Math.round((completed / total) * 100), 100)

  return {
    completedCount: completed,
    totalCount: habits.length,
    percent,
    pendingHabits: pendingNames,
  }
}

function createCadenceNotification(
  cadence: '1h' | 'initial' = '1h',
  stats = computeTodayHabitStats()
): AppNotification {
  const { completedCount, totalCount, percent, pendingHabits } = stats
  const pendingStr =
    pendingHabits.length > 0 ? pendingHabits.slice(0, 3).join(', ') : 'None (all completed)'

  let title = ''
  let message = ''

  if (cadence === '1h') {
    if (percent === 100) {
      title = 'Hourly Update · All Habits Done!'
      message = `Incredible! All ${totalCount} habits completed today. Consistency protecting your future trajectory.`
    } else if (percent === 0) {
      title = 'Hourly Routine Check-in'
      message = `0/${totalCount} habits logged today. Take a quick step on ${pendingStr} to break inertia.`
    } else {
      title = 'Hourly Progress Update'
      message = `${completedCount}/${totalCount} habits completed (${percent}%). Pending: ${pendingStr}.`
    }
  } else {
    title = 'Daily Habit Slate Ready'
    message =
      percent === 0
        ? `Your slate is fresh at 0% for today. Routine notifications will update you once every hour.`
        : `Today's current progress: ${completedCount}/${totalCount} done (${percent}%).`
  }

  return {
    id: crypto.randomUUID(),
    title,
    message,
    timestamp: new Date().toISOString(),
    cadence,
    read: false,
    stats,
  }
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed) && parsed.length > 0) return parsed
      }
    } catch {
      // fallback to initial
    }
    // Initial situation alert
    const initial = createCadenceNotification('initial')
    return [initial]
  })

  const [isOpen, setIsOpen] = useState(false)
  const [isBrowserPermissionGranted, setIsBrowserPermissionGranted] = useState(() => {
    return typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted'
  })

  const lastCadenceFired = useRef<{ [key: string]: number }>({})

  // Persist notifications
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications))
    } catch (e) {
      console.error('Error saving notifications:', e)
    }
  }, [notifications])

  // Request browser Notification permission
  const requestBrowserPermission = useCallback(async (): Promise<boolean> => {
    if (typeof window === 'undefined' || !('Notification' in window)) return false
    try {
      const permission = await Notification.requestPermission()
      const granted = permission === 'granted'
      setIsBrowserPermissionGranted(granted)
      return granted
    } catch {
      return false
    }
  }, [])

  // Send desktop alert if permitted
  const sendDesktopAlert = useCallback((item: AppNotification) => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(item.title, {
          body: item.message,
          icon: '/favicon.ico',
        })
      } catch {
        // Desktop notification failed silently
      }
    }
  }, [])

  // Add notification helper
  const addNotification = useCallback((item: AppNotification) => {
    setNotifications((prev) => [item, ...prev.slice(0, 49)]) // Keep last 50
    sendDesktopAlert(item)
  }, [sendDesktopAlert])

  // Trigger manual or programmatic cadence notification (restricted to hourly updates)
  const triggerCadenceNotification = useCallback((cadence: '1h' = '1h') => {
    const nowMs = Date.now()
    try {
      localStorage.setItem(LAST_HOURLY_NOTIFICATION_KEY, String(nowMs))
    } catch {
      // ignore
    }
    const item = createCadenceNotification(cadence)
    addNotification(item)
  }, [addNotification])

  // Automated cadence timer: strictly restricted to send once every 1 hour only
  useEffect(() => {
    // If this is the user's first session, record the starting timestamp so they aren't spammed immediately
    try {
      const stored = localStorage.getItem(LAST_HOURLY_NOTIFICATION_KEY)
      if (!stored) {
        localStorage.setItem(LAST_HOURLY_NOTIFICATION_KEY, String(Date.now()))
      }
    } catch {
      // ignore
    }

    const checkHourlyTrigger = () => {
      const now = new Date()
      const nowMs = now.getTime()
      const minute = now.getMinutes()
      const hour = now.getHours()
      const hourKey = `hourly-${now.getFullYear()}-${now.getMonth()}-${now.getDate()}-${hour}`

      let lastFiredTime = 0
      try {
        lastFiredTime = Number(localStorage.getItem(LAST_HOURLY_NOTIFICATION_KEY) || 0)
      } catch {
        lastFiredTime = 0
      }

      const elapsed = nowMs - lastFiredTime

      // Only trigger if at least 1 hour has elapsed since last notification,
      // or at top-of-hour (:00) if at least 50 minutes have elapsed
      if (!lastCadenceFired.current[hourKey]) {
        if ((minute === 0 && elapsed >= 50 * 60 * 1000) || elapsed >= ONE_HOUR_MS) {
          lastCadenceFired.current[hourKey] = nowMs
          triggerCadenceNotification('1h')
        }
      }
    }

    // Check periodically every 30 seconds for clock-based hourly trigger
    const interval = setInterval(checkHourlyTrigger, 30000)

    return () => clearInterval(interval)
  }, [triggerCadenceNotification])

  const unreadCount = notifications.filter((n) => !n.read).length

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    )
  }, [])

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }, [])

  const clearNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }, [])

  const clearAll = useCallback(() => {
    setNotifications([])
  }, [])

  const toggleOpen = useCallback(() => {
    setIsOpen((prev) => !prev)
  }, [])

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        isOpen,
        isBrowserPermissionGranted,
        setIsOpen,
        toggleOpen,
        markAsRead,
        markAllAsRead,
        clearNotification,
        clearAll,
        requestBrowserPermission,
        triggerCadenceNotification,
      }}
    >
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider')
  }
  return context
}
