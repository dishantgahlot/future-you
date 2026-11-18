import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react'
import { format } from 'date-fns'
import { getLocalHabits, getAllLocalLogs } from '../utils/habitStorage'
import {
  isNotificationSupported,
  getNotificationPermission,
  showDesktopNotification,
  registerNotificationServiceWorker,
} from '../utils/desktopNotification'

export interface AppNotification {
  id: string
  title: string
  message: string
  timestamp: string // ISO string
  cadence: '1h' | 'custom'
  read: boolean
  stats: {
    completedCount: number
    totalCount: number
    pendingCount: number
    percent: number
    pendingHabits: string[]
    completedHabits?: string[]
  }
}

interface NotificationContextType {
  notifications: AppNotification[]
  unreadCount: number
  isOpen: boolean
  activeToast: AppNotification | null
  isBrowserPermissionGranted: boolean
  browserPermission: NotificationPermission
  isBrowserSupported: boolean
  setIsOpen: (open: boolean) => void
  toggleOpen: () => void
  markAsRead: (id: string) => void
  markAllAsRead: () => void
  clearNotification: (id: string) => void
  clearAll: () => void
  dismissToast: () => void
  requestBrowserPermission: () => Promise<boolean>
  testDesktopNotification: () => void
  notifyHabitMilestone: (habitName: string, actual: number, target: number, unit?: string) => void
  triggerCadenceNotification: (cadence?: '1h') => void
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

const STORAGE_KEY = 'future-you-notifications-v2'
const LAST_HOURLY_NOTIFICATION_KEY = 'future-you-last-hourly-notification-time'
const ONE_HOUR_MS = 60 * 60 * 1000 // Exactly 1 hour (60 minutes) in milliseconds

export function computeTodayHabitStats() {
  const habits = getLocalHabits().filter((h) => h.is_active)
  const allLogs = getAllLocalLogs()
  const todayStr = format(new Date(), 'yyyy-MM-dd')
  const todayLogs = allLogs.filter((l) => l.log_date === todayStr)

  let completed = 0
  const pendingNames: string[] = []
  const completedNames: string[] = []

  habits.forEach((h) => {
    const log = todayLogs.find((l) => l.habit_id === h.id)
    const target = h.target_value || 1
    const actual = log?.actual_value !== undefined ? log.actual_value : log?.completion_status ? target : 0
    if (actual >= target && target > 0) {
      completed++
      completedNames.push(h.name)
    } else {
      pendingNames.push(h.name)
    }
  })

  const total = habits.length
  const pendingCount = pendingNames.length
  const percent = total > 0 ? Math.min(Math.round((completed / total) * 100), 100) : 0

  return {
    completedCount: completed,
    totalCount: total,
    pendingCount,
    percent,
    pendingHabits: pendingNames,
    completedHabits: completedNames,
  }
}

export function createCadenceNotification(
  cadence: '1h' | 'custom' = '1h',
  stats = computeTodayHabitStats()
): AppNotification {
  const { completedCount, totalCount, pendingCount, percent, pendingHabits } = stats

  let title = ''
  let message = ''

  if (totalCount === 0) {
    title = 'Hourly Routine · Set Up Your Habits'
    message = 'You have not set up any habits yet. Add your daily habits to start tracking progress and receive hourly check-ins!'
  } else if (pendingCount === 0) {
    // 100% completed
    title = `Hourly Check-in · All ${totalCount} Habits Completed! (100%)`
    message = `Incredible dedication! You have completed all ${totalCount} of ${totalCount} habits today (0 remaining). Consistency protecting your future self!`
  } else if (completedCount === 0) {
    // 0% completed
    const pendingListStr =
      pendingHabits.slice(0, 3).join(', ') + (pendingHabits.length > 3 ? ` +${pendingHabits.length - 3} more` : '')
    title = `Hourly Reminder · ${pendingCount} Habit${pendingCount > 1 ? 's' : ''} Haven't Been Done Yet (0%)`
    message = `Today's progress: 0/${totalCount} habits completed (0%). You haven't done ${pendingCount} habit${pendingCount > 1 ? 's' : ''} yet: ${pendingListStr}. Take a quick step to break inertia!`
  } else {
    // In progress (e.g. 2/5 done, 3 pending)
    const pendingListStr =
      pendingHabits.slice(0, 3).join(', ') + (pendingHabits.length > 3 ? ` +${pendingHabits.length - 3} more` : '')
    title = `Hourly Reminder · ${pendingCount} Habit${pendingCount > 1 ? 's' : ''} Remaining (${percent}% Done)`
    message = `Today's progress: ${completedCount}/${totalCount} completed (${percent}%). You currently haven't done ${pendingCount} habit${pendingCount > 1 ? 's' : ''} yet: ${pendingListStr}. Keep up your momentum!`
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
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.filter(
            (item: any) =>
              item &&
              item.cadence !== 'initial' &&
              !item.title?.toLowerCase().includes('daily habit slate ready')
          )
        }
      }
    } catch {
      // fallback
    }
    return []
  })

  const [isOpen, setIsOpen] = useState(false)
  const [activeToast, setActiveToast] = useState<AppNotification | null>(null)
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const isBrowserSupported = isNotificationSupported()
  const [browserPermission, setBrowserPermission] = useState<NotificationPermission>(() => {
    return getNotificationPermission()
  })

  const isBrowserPermissionGranted = browserPermission === 'granted'

  // Persist notifications
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications))
    } catch (e) {
      console.error('Error saving notifications:', e)
    }
  }, [notifications])

  // Register service worker on mount
  useEffect(() => {
    registerNotificationServiceWorker().catch(() => {})
  }, [])

  // Synchronize browser permission status on window focus
  useEffect(() => {
    const handleSyncPerm = () => {
      setBrowserPermission(getNotificationPermission())
    }
    window.addEventListener('focus', handleSyncPerm)
    return () => window.removeEventListener('focus', handleSyncPerm)
  }, [])

  // Send native desktop alert if permitted
  const sendDesktopAlert = useCallback((item: AppNotification) => {
    showDesktopNotification({
      title: item.title,
      body: item.message,
      tag: item.id || `future-you-${Date.now()}`,
      requireInteraction: true,
      onClick: () => {
        window.focus()
        setIsOpen(true)
      },
    }).catch(() => {})
  }, [])

  const dismissToast = useCallback(() => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current)
      toastTimeoutRef.current = null
    }
    setActiveToast(null)
  }, [])

  // Add notification helper: triggers desktop alert, sets in-app toast, and records in history
  const addNotification = useCallback((item: AppNotification) => {
    setNotifications((prev) => [item, ...prev.slice(0, 49)]) // Keep last 50

    // Trigger In-App Pop-up Toast for the Web
    setActiveToast(item)
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current)
    }
    toastTimeoutRef.current = setTimeout(() => {
      setActiveToast(null)
      toastTimeoutRef.current = null
    }, 9000)

    // Trigger Native OS Desktop Alert
    sendDesktopAlert(item)
  }, [sendDesktopAlert])

  // Request browser Notification permission
  const requestBrowserPermission = useCallback(async (): Promise<boolean> => {
    if (!isNotificationSupported()) return false
    try {
      const permission = await Notification.requestPermission()
      setBrowserPermission(permission)
      return permission === 'granted'
    } catch {
      return false
    }
  }, [])

  // Proactively ask user to turn on notifications on web upon first interaction
  useEffect(() => {
    if (!isBrowserSupported || browserPermission !== 'default') return

    const handlePromptOnInteraction = () => {
      requestBrowserPermission().catch(() => {})
    }

    window.addEventListener('click', handlePromptOnInteraction, { once: true })
    window.addEventListener('keydown', handlePromptOnInteraction, { once: true })

    return () => {
      window.removeEventListener('click', handlePromptOnInteraction)
      window.removeEventListener('keydown', handlePromptOnInteraction)
    }
  }, [browserPermission, isBrowserSupported, requestBrowserPermission])

  // Trigger notification immediately on both Desktop and Web
  const testDesktopNotification = useCallback(async () => {
    if (!isNotificationSupported()) {
      return
    }

    if (Notification.permission !== 'granted') {
      const granted = await requestBrowserPermission()
      if (!granted) return
    }

    const testItem = createCadenceNotification('1h')
    addNotification(testItem)
  }, [requestBrowserPermission, addNotification])

  // Trigger habit completion or milestone celebration notification
  const notifyHabitMilestone = useCallback((habitName: string, actual: number, target: number, unit?: string) => {
    const safeTarget = target > 0 ? target : 1
    const percent = Math.min(Math.round((actual / safeTarget) * 100), 100)
    const stats = computeTodayHabitStats()

    if (percent >= 100) {
      const item: AppNotification = {
        id: crypto.randomUUID(),
        title: `🎯 Habit Completed · ${habitName}`,
        message: `Outstanding discipline! You completed ${habitName} (${actual}/${safeTarget} ${unit || ''}). Identity compounded!`,
        timestamp: new Date().toISOString(),
        cadence: 'custom',
        read: false,
        stats,
      }
      addNotification(item)
    } else if (percent >= 70) {
      const item: AppNotification = {
        id: crypto.randomUUID(),
        title: `⚡ 70% Milestone Achieved · ${habitName}`,
        message: `Great momentum! You conquered 70% of ${habitName} today (${actual}/${safeTarget} ${unit || ''}). Activation inertia defeated!`,
        timestamp: new Date().toISOString(),
        cadence: 'custom',
        read: false,
        stats,
      }
      addNotification(item)
    }
  }, [addNotification])

  // Trigger hourly cadence notification
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

  // Automated Hourly Cadence Engine:
  // Strictly triggers once every hour to remind the user about habit progress and pending habits.
  useEffect(() => {
    const checkHourlyTrigger = () => {
      const nowMs = Date.now()
      let lastFiredTime = 0
      try {
        lastFiredTime = Number(localStorage.getItem(LAST_HOURLY_NOTIFICATION_KEY) || 0)
      } catch {
        lastFiredTime = 0
      }

      // If no notification was ever recorded, set the anchor to now
      if (!lastFiredTime) {
        try {
          localStorage.setItem(LAST_HOURLY_NOTIFICATION_KEY, String(nowMs))
        } catch {}
        return
      }

      const elapsed = nowMs - lastFiredTime

      // If at least 1 hour has elapsed since the last hourly notification, trigger the reminder!
      if (elapsed >= ONE_HOUR_MS) {
        triggerCadenceNotification('1h')
      }
    }

    // Check every 15 seconds on main thread
    const interval = setInterval(checkHourlyTrigger, 15000)

    // Also check immediately when window gains focus or visibility returns
    const handleVisibilityOrFocus = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        checkHourlyTrigger()
      }
    }
    window.addEventListener('focus', handleVisibilityOrFocus)
    document.addEventListener('visibilitychange', handleVisibilityOrFocus)

    // Inline Web Worker ticker to keep hourly checks running even when the tab is backgrounded
    let worker: Worker | null = null
    try {
      const workerCode = `
        let timer = null;
        self.onmessage = function(e) {
          if (e.data === 'start') {
            if (timer) clearInterval(timer);
            timer = setInterval(function() {
              self.postMessage('hourly-tick');
            }, 30000); // tick every 30s in worker
          } else if (e.data === 'stop') {
            if (timer) clearInterval(timer);
          }
        };
      `
      const blob = new Blob([workerCode], { type: 'application/javascript' })
      worker = new Worker(URL.createObjectURL(blob))
      worker.onmessage = () => {
        checkHourlyTrigger()
      }
      worker.postMessage('start')
    } catch {
      // Fallback relies on setInterval
    }

    return () => {
      clearInterval(interval)
      window.removeEventListener('focus', handleVisibilityOrFocus)
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus)
      if (worker) {
        try {
          worker.postMessage('stop')
          worker.terminate()
        } catch {}
      }
    }
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
        activeToast,
        isBrowserPermissionGranted,
        browserPermission,
        isBrowserSupported,
        setIsOpen,
        toggleOpen,
        markAsRead,
        markAllAsRead,
        clearNotification,
        clearAll,
        dismissToast,
        requestBrowserPermission,
        testDesktopNotification,
        notifyHabitMilestone,
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
