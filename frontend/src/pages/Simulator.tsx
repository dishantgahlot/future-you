import { useState, useMemo, useRef, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { format, subDays, parseISO } from 'date-fns'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faPaperPlane,
  faRotateRight,
  faTrashCan,
  faArrowRight,
  faUser,
  faLeaf,
  faCompass,
  faPlus,
  faClockRotateLeft,
  faComments,
  faComment,
  faChevronLeft,
  faMessage,
  faLightbulb,
  faCalendarDays,
  faCodeBranch,
  faChevronDown,
  faChevronUp,
  faCheck,
} from '@fortawesome/free-solid-svg-icons'
import { useUserProfile } from '../contexts/UserProfileContext'
import { useAuth } from '../contexts/AuthContext'
import { useAppDate } from '../contexts/DateContext'
import { getLocalHabits, getAllLocalLogs, getHabitsForDate } from '../utils/habitStorage'
import { aiApi } from '../services/api'
import { getHabitIconDef } from '../components/botanical/TodaysHabitsCard'

interface ChatMessage {
  id: string
  role: 'user' | 'model'
  content: string
  timestamp: string
}

interface SavedSession {
  sessionId: string
  title: string
  lastMessage: string
  messageCount: number
  createdAt: string
  updatedAt: string
}

// Curated starter scenarios designed for the Future You persona & app context
const STARTER_SCENARIOS = [
  'What was my habit data and completion yesterday?',
  'What if I completed 100% of my habits yesterday?',
  'How is my habit trajectory looking today?',
  'Where am I lagging the most, and how do I fix it?',
  'I hit 70% progress today—how does Future You view this?',
  'Why do my weekends drop off, and how do we bridge the gap?',
]

function formatSessionTime(isoString?: string) {
  if (!isoString) return ''
  const date = new Date(isoString)
  if (isNaN(date.getTime())) return ''
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  if (diffDays === 0) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  } else if (diffDays === 1) {
    return 'Yesterday'
  } else if (diffDays < 7) {
    return `${diffDays}d ago`
  }
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

function renderFormattedText(text: string) {
  const lines = text.split('\n')
  return (
    <div className="space-y-1.5 text-xs sm:text-sm">
      {lines.map((line, lIdx) => {
        const trimmed = line.trim()
        if (!trimmed) {
          return <div key={lIdx} className="h-1.5" />
        }

        const isHeading = trimmed.startsWith('###') || trimmed.startsWith('##')
        const isSubBullet = line.startsWith('  -') || line.startsWith('    -') || line.startsWith('  *') || line.startsWith('   •')
        const isMainBullet = trimmed.startsWith('•') || trimmed.startsWith('-') || trimmed.startsWith('*')
        const isNumbered = /^\d+\.\s/.test(trimmed)

        // Clean bullet/heading prefix
        let cleanText = line
        if (isHeading) {
          cleanText = trimmed.replace(/^#+\s*/, '')
        }

        // Parse bold **text** and italic *text*
        const parts = cleanText.split(/(\*\*.*?\*\*|\*[^*]+?\*)/g)
        const rendered = parts.map((part, pIdx) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return (
              <strong key={pIdx} className="font-bold text-[#1D2516] dark:text-[#F5F2EB]">
                {part.slice(2, -2)}
              </strong>
            )
          }
          if (part.startsWith('*') && part.endsWith('*') && !part.startsWith('**')) {
            return (
              <em key={pIdx} className="italic text-[#4A6225] dark:text-[#A8D968]">
                {part.slice(1, -1)}
              </em>
            )
          }
          return <span key={pIdx}>{part}</span>
        })

        if (isHeading) {
          return (
            <div key={lIdx} className="font-serif font-bold text-sm sm:text-base text-[#1D2516] dark:text-[#F5F2EB] pt-1">
              {rendered}
            </div>
          )
        }

        return (
          <div
            key={lIdx}
            className={`${
              isSubBullet
                ? 'pl-5 text-[#5C6E56] dark:text-[#A8BCA0] text-[12px]'
                : isMainBullet || isNumbered
                ? 'pl-1.5 font-normal text-[#2B351F] dark:text-[#E2EBD8]'
                : 'text-[#2B351F] dark:text-[#E2EBD8]'
            } leading-relaxed`}
          >
            {rendered}
          </div>
        )
      })}
    </div>
  )
}

export function Simulator() {
  const { fullName, avatarUrl } = useUserProfile()
  const { user } = useAuth()

  const userName = fullName || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Friend'

  const welcomeMessage: ChatMessage = useMemo(() => ({
    id: 'welcome',
    role: 'model',
    content: `Hey **${userName}**! I am **Future You**—the voice, wisdom, and compass of where your daily habits and choices are taking us.

• **Dedicated Persona**: I am personalized exclusively for your growth journey, habit systems, mindset, and life trajectory.
• **Live Habit Intelligence**: I continuously track your real habits, exact completion percentages, and the compounding math of your consistency.
• **What We Can Explore**: Test what-if future projections, diagnose friction in lagging habits, master the 70% continuous progress rule, or design daily focus rituals!`,
    timestamp: 'Just now',
  }), [userName])

  const [sessions, setSessions] = useState<SavedSession[]>([])
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isLoadingSessions, setIsLoadingSessions] = useState(false)
  const [isLoadingMessages, setIsLoadingMessages] = useState(true)
  const [messages, setMessages] = useState<ChatMessage[]>([welcomeMessage])
  const [inputVal, setInputVal] = useState('')
  const [isSending, setIsSending] = useState(false)

  const chatBottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const [searchParams] = useSearchParams()
  const queryDate = searchParams.get('date')
  const { selectedDateStr, isToday } = useAppDate()

  const yesterdayDateStr = useMemo(() => {
    const y = new Date(Date.now() - 86400000)
    return format(y, 'yyyy-MM-dd')
  }, [])

  const [selectedHistoryDate, setSelectedHistoryDate] = useState<string>(() => {
    if (queryDate && /^\d{4}-\d{2}-\d{2}$/.test(queryDate)) {
      return queryDate
    }
    if (selectedDateStr && /^\d{4}-\d{2}-\d{2}$/.test(selectedDateStr) && !isToday) {
      return selectedDateStr
    }
    const y = new Date(Date.now() - 86400000)
    return format(y, 'yyyy-MM-dd')
  })

  const [isHistoryExpanded, setIsHistoryExpanded] = useState<boolean>(() => Boolean(queryDate) || !isToday)

  useEffect(() => {
    if (queryDate && /^\d{4}-\d{2}-\d{2}$/.test(queryDate) && queryDate !== selectedHistoryDate) {
      setSelectedHistoryDate(queryDate)
      setIsHistoryExpanded(true)
    } else if (!isToday && selectedDateStr && selectedDateStr !== selectedHistoryDate) {
      setSelectedHistoryDate(selectedDateStr)
      setIsHistoryExpanded(true)
    }
  }, [queryDate, selectedDateStr, isToday, selectedHistoryDate])

  const [habits, setHabits] = useState(() => getLocalHabits(user?.id))
  const [allLogs, setAllLogs] = useState(() => getAllLocalLogs(user?.id))

  // Keep habits & logs fresh whenever updated elsewhere in the app
  useEffect(() => {
    const handleSync = () => {
      setHabits(getLocalHabits(user?.id))
      setAllLogs(getAllLocalLogs(user?.id))
    }
    handleSync()
    window.addEventListener('future-you-storage-updated', handleSync)
    window.addEventListener('storage', handleSync)
    window.addEventListener('focus', handleSync)
    return () => {
      window.removeEventListener('future-you-storage-updated', handleSync)
      window.removeEventListener('storage', handleSync)
      window.removeEventListener('focus', handleSync)
    }
  }, [user?.id])

  // Quick dates for past 5 days
  const quickDates = useMemo(() => {
    const dates = []
    const now = new Date()
    for (let i = 1; i <= 5; i++) {
      const d = subDays(now, i)
      const dateStr = format(d, 'yyyy-MM-dd')
      const label = i === 1 ? 'Yesterday' : `${i}d ago`
      dates.push({ dateStr, label, dateObj: d, fullLabel: format(d, 'EEE, MMM d') })
    }
    return dates
  }, [])

  // Logs and statistics for currently selected history date
  const selectedDateLogs = useMemo(() => {
    return allLogs.filter((l) => l.log_date === selectedHistoryDate)
  }, [allLogs, selectedHistoryDate])

  const selectedDateStats = useMemo(() => {
    let completed = 0
    let inProgress = 0
    let missed = 0
    let progressSum = 0

    const dayHabits = getHabitsForDate(habits, selectedHistoryDate, allLogs)

    const habitBreakdown = dayHabits.map((h) => {
      const log = selectedDateLogs.find((l) => l.habit_id === h.id)
      const target = log?.target_value || h.target_value || 1
      const actual = log?.actual_value !== undefined ? log.actual_value : log?.completion_status ? target : 0
      const pct = target > 0 ? Math.min(Math.round((actual / target) * 100), 100) : 0
      progressSum += pct

      const isCompleted = actual >= target && target > 0
      const isInProgress = actual > 0 && actual < target
      const isMissed = actual === 0

      if (isCompleted) completed++
      else if (isInProgress) inProgress++
      else missed++

      return {
        habit: h,
        target,
        actual,
        pct,
        isCompleted,
        isInProgress,
        isMissed,
        hasLog: Boolean(log),
      }
    })

    const overallPct = dayHabits.length > 0 ? Math.round(progressSum / dayHabits.length) : 0
    return {
      dateStr: selectedHistoryDate,
      overallPct,
      completed,
      inProgress,
      missed,
      habits: habitBreakdown,
      hasLogs: habitBreakdown.some((h) => h.hasLog || h.actual > 0),
    }
  }, [habits, allLogs, selectedDateLogs, selectedHistoryDate])

  const activeSession = useMemo(() => {
    return sessions.find((s) => s.sessionId === activeSessionId)
  }, [sessions, activeSessionId])

  // Fetch the saved sessions list for the current user
  const loadSessionsList = async () => {
    try {
      const res = await aiApi.getWhatIfSessions()
      if (res.data && Array.isArray(res.data)) {
        setSessions(res.data)
        return res.data
      }
    } catch (err) {
      console.warn('Could not load saved sessions:', err)
    }
    return []
  }

  // Initial load: Fetch saved chat sessions and restore the most recent session
  useEffect(() => {
    let isMounted = true

    async function init() {
      setIsLoadingSessions(true)
      setIsLoadingMessages(true)
      try {
        const res = await aiApi.getWhatIfSessions()
        if (!isMounted) return

        const sessionList = res.data && Array.isArray(res.data) ? res.data : []
        setSessions(sessionList)

        if (sessionList.length > 0) {
          const latest = sessionList[0]
          setActiveSessionId(latest.sessionId)

          const msgRes = await aiApi.getWhatIfSessionMessages(latest.sessionId)
          if (isMounted && msgRes.data && Array.isArray(msgRes.data) && msgRes.data.length > 0) {
            setMessages(
              msgRes.data.map((m: any) => ({
                id: m.id || `hist-${Math.random()}`,
                role: m.role,
                content: m.content,
                timestamp: m.timestamp || 'Saved',
              }))
            )
          } else if (isMounted) {
            setMessages([welcomeMessage])
          }
        } else if (isMounted) {
          setActiveSessionId(null)
          setMessages([welcomeMessage])
        }
      } catch (err) {
        console.warn('Error during session initialization:', err)
        if (isMounted) setMessages([welcomeMessage])
      } finally {
        if (isMounted) {
          setIsLoadingSessions(false)
          setIsLoadingMessages(false)
        }
      }
    }

    init()
    return () => {
      isMounted = false
    }
  }, [user?.id, welcomeMessage])

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isSending])

  // Adjust textarea height automatically
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`
    }
  }, [inputVal])

  // Switch to a selected saved chat session
  const handleSelectSession = async (sessionId: string) => {
    if (sessionId === activeSessionId || isLoadingMessages || isSending) return

    setActiveSessionId(sessionId)
    setIsLoadingMessages(true)
    if (typeof window !== 'undefined' && window.innerWidth < 640) {
      setIsSidebarOpen(false)
    }
    try {
      const res = await aiApi.getWhatIfSessionMessages(sessionId)
      if (res.data && Array.isArray(res.data) && res.data.length > 0) {
        setMessages(
          res.data.map((m: any) => ({
            id: m.id || `m-${Math.random()}`,
            role: m.role,
            content: m.content,
            timestamp: m.timestamp || 'Saved',
          }))
        )
      } else {
        setMessages([welcomeMessage])
      }
    } catch (err) {
      console.warn('Error loading session messages:', err)
      setMessages([welcomeMessage])
    } finally {
      setIsLoadingMessages(false)
    }
  }

  // Start a fresh conversation (+ New Chat)
  const handleNewChat = () => {
    setActiveSessionId(null)
    setMessages([welcomeMessage])
    setInputVal('')
    if (typeof window !== 'undefined' && window.innerWidth < 640) {
      setIsSidebarOpen(false)
    }
    if (textareaRef.current) {
      textareaRef.current.focus()
    }
  }

  // Delete a specific session
  const handleDeleteSession = async (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation()
    try {
      await aiApi.deleteWhatIfSession(sessionId)
      setSessions((prev) => prev.filter((s) => s.sessionId !== sessionId))
      if (activeSessionId === sessionId) {
        handleNewChat()
      }
    } catch (err) {
      console.warn('Failed to delete session:', err)
    }
  }

  // Send message
  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputVal).trim()
    if (!query || isSending) return

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }

    setMessages((prev) => [...prev, userMsg])
    if (!textToSend) {
      setInputVal('')
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
      }
    }
    setIsSending(true)

    try {
      const historyPayload = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }))

      // Read fresh live habits and logs from storage
      const liveHabits = getLocalHabits(user?.id)
      const liveLogs = getAllLocalLogs(user?.id)

      const res = await aiApi.askWhatIfSimulation({
        message: query,
        userId: user?.id,
        sessionId: activeSessionId || undefined,
        sessionTitle: activeSession?.title || undefined,
        conversationHistory: historyPayload,
        habits: liveHabits,
        logs: liveLogs,
        userName,
        targetDate: selectedHistoryDate || undefined,
      })

      const replyText =
        res.data?.reply ||
        (res.data as any)?.data?.reply ||
        `• **Simulation Recorded**: Scenario evaluated against your database.`

      const botMsg: ChatMessage = {
        id: `m-${Date.now()}`,
        role: 'model',
        content: replyText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }
      setMessages((prev) => [...prev, botMsg])

      // If a new session was created by the backend, update our activeSessionId
      const returnedSessionId = res.data?.sessionId || (res.data as any)?.data?.sessionId
      if (returnedSessionId && returnedSessionId !== activeSessionId) {
        setActiveSessionId(returnedSessionId)
      }

      // Refresh saved chat sessions list immediately
      loadSessionsList()
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'model',
        content: `• **Error**: Could not connect with AI agent (${err?.message || 'Network error'}). Please try again.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }
      setMessages((prev) => [...prev, errorMsg])
    } finally {
      setIsSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-4 pb-8">
      {/* 1. Minimalist Top Bar */}
      <div className="bg-[#FAF7F0] dark:bg-[#0E1714] rounded-2xl border border-[#E8E2D5] dark:border-[#1E2E27] px-3.5 sm:px-5 py-2.5 sm:py-3.5 shadow-xs flex items-center justify-between gap-2.5 sm:gap-3 transition-colors">
        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-[#EEF4E8] dark:bg-[#16271D] text-[#4A6225] dark:text-[#A8D968] flex items-center justify-center text-xs sm:text-sm shadow-2xs flex-shrink-0">
            <FontAwesomeIcon icon={faCompass} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <h1 className="font-serif font-bold text-base sm:text-lg text-[#1D2516] dark:text-[#F5F2EB] tracking-tight truncate">
                Future You Persona
              </h1>
              <span className="hidden xs:inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#EEF4E8] dark:bg-[#16271D] text-[#4A6225] dark:text-[#A8D968] border border-[#CCD8B8] dark:border-[#22352B]">
                AI Persona
              </span>
            </div>
            <p className="text-[10px] sm:text-[11px] text-[#7A8C74] dark:text-[#83967D] flex items-center gap-1.5 flex-wrap truncate">
              <span>Personal Growth Persona · {habits.length} habits tracked</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={handleNewChat}
            className="px-3 sm:px-3.5 py-1.5 rounded-xl bg-[#4A6225] hover:bg-[#3D521E] dark:bg-[#4E6826] dark:hover:bg-[#41581F] text-xs font-semibold text-white transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
          >
            <FontAwesomeIcon icon={faPlus} className="text-[10px] sm:text-[11px]" />
            <span className="hidden xs:inline">New Chat</span>
            <span className="xs:hidden">New</span>
          </button>
        </div>
      </div>

      {/* 2. Main Container: ChatGPT-Style Saved Chats Sidebar + Chat Area */}
      <div className="bg-white dark:bg-[#0E1714] rounded-2xl sm:rounded-3xl border border-[#E8E2D5] dark:border-[#1E2E27] shadow-xs flex h-[calc(100dvh-175px)] min-h-[460px] max-h-[720px] sm:h-[640px] overflow-hidden relative transition-colors">
        {/* Mobile Backdrop for Saved Chats Drawer */}
        {isSidebarOpen && (
          <div
            className="sm:hidden absolute inset-0 bg-black/45 backdrop-blur-xs z-25 transition-opacity"
            onClick={() => setIsSidebarOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* Saved Chats Div (ChatGPT-Style Sidebar) */}
        <aside
          className={`${
            isSidebarOpen
              ? 'w-[84vw] max-w-xs sm:w-72 md:w-80 border-r border-[#E8E2D5] dark:border-[#1E2E27] shadow-2xl sm:shadow-none'
              : 'w-0 border-r-0 pointer-events-none'
          } transition-all duration-200 ease-in-out bg-[#F8F5ED] dark:bg-[#0C1615] flex flex-col h-full overflow-hidden flex-shrink-0 absolute sm:relative inset-y-0 left-0 z-30 sm:z-10`}
        >
          {/* Sidebar Top: Header & Collapse Toggle */}
          <div className="p-3.5 border-b border-[#E8E2D5] dark:border-[#1E2E27] flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-[#EEF4E8] dark:bg-[#16271D] text-[#4A6225] dark:text-[#A8D968] flex items-center justify-center text-xs flex-shrink-0">
                <FontAwesomeIcon icon={faComments} />
              </div>
              <div className="min-w-0">
                <span className="font-serif font-bold text-sm text-[#1D2516] dark:text-[#F5F2EB] tracking-tight block truncate">
                  Saved Chats
                </span>
                <span className="text-[10px] text-[#7A8C74] dark:text-[#83967D] block">
                  {sessions.length} {sessions.length === 1 ? 'conversation' : 'conversations'}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsSidebarOpen(false)}
              title="Close sidebar"
              className="w-7 h-7 rounded-lg hover:bg-[#EAE4D5] dark:hover:bg-[#16271D] text-[#6E8268] dark:text-[#8FA387] hover:text-[#1D2516] dark:hover:text-[#F5F2EB] flex items-center justify-center text-xs transition-colors cursor-pointer"
            >
              <FontAwesomeIcon icon={faChevronLeft} />
            </button>
          </div>

          {/* "+ New Chat" Button (ChatGPT style) */}
          <div className="p-3 border-b border-[#E8E2D5] dark:border-[#1E2E27]">
            <button
              type="button"
              onClick={handleNewChat}
              className="w-full py-2.5 px-3.5 rounded-xl bg-white dark:bg-[#121D17] hover:bg-[#EEF4E8] dark:hover:bg-[#1A2A20] text-[#1D2516] dark:text-[#F5F2EB] border border-[#E8E2D5] dark:border-[#1E2E27] text-xs font-semibold flex items-center justify-between transition-all cursor-pointer shadow-2xs group"
            >
              <span className="flex items-center gap-2">
                <FontAwesomeIcon icon={faPlus} className="text-[#4A6225] dark:text-[#A8D968] group-hover:scale-110 transition-transform" />
                <span>New Chat</span>
              </span>
              <span className="text-[10px] text-[#7A8C74] dark:text-[#83967D] font-mono bg-[#FAF8F3] dark:bg-[#0C1615] px-1.5 py-0.5 rounded border border-[#E8E2D5] dark:border-[#1E2E27]">
                +
              </span>
            </button>
          </div>

          {/* Saved Sessions Scrollable List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {isLoadingSessions ? (
              <div className="flex flex-col items-center justify-center py-12 text-xs text-[#7A8C74] dark:text-[#83967D] gap-2">
                <FontAwesomeIcon icon={faRotateRight} className="animate-spin text-[#4A6225] dark:text-[#A8D968]" />
                <span>Loading conversations...</span>
              </div>
            ) : sessions.length === 0 ? (
              <div className="p-4 text-center text-xs text-[#7A8C74] dark:text-[#83967D] space-y-2 mt-8">
                <FontAwesomeIcon icon={faMessage} className="text-2xl text-[#B8C7B0] dark:text-[#2E4233]" />
                <p className="font-semibold text-[#2B351F] dark:text-[#E2EBD8]">No saved chats yet</p>
                <p className="text-[11px] text-[#7A8C74] dark:text-[#83967D]">
                  Start chatting and every conversation will be saved here automatically.
                </p>
              </div>
            ) : (
              sessions.map((s) => {
                const isActive = s.sessionId === activeSessionId
                return (
                  <div
                    key={s.sessionId}
                    onClick={() => handleSelectSession(s.sessionId)}
                    className={`group relative rounded-xl px-3 py-2.5 flex items-start gap-2.5 cursor-pointer transition-all border ${
                      isActive
                        ? 'bg-white dark:bg-[#16271D] border-[#738541] dark:border-[#38592A] shadow-2xs'
                        : 'bg-transparent border-transparent hover:bg-white/80 dark:hover:bg-[#121D17]'
                    }`}
                  >
                    <div className={`mt-0.5 text-xs ${isActive ? 'text-[#4A6225] dark:text-[#A8D968]' : 'text-[#8A847A] dark:text-[#5C6E56]'}`}>
                      <FontAwesomeIcon icon={faComment} />
                    </div>

                    <div className="flex-1 min-w-0 pr-6">
                      <p
                        className={`text-xs truncate ${
                          isActive ? 'text-[#1D2516] dark:text-[#F5F2EB] font-semibold' : 'text-[#2B351F] dark:text-[#C5D2BE] font-medium'
                        }`}
                        title={s.title}
                      >
                        {s.title || 'Conversation'}
                      </p>
                      <div className="flex items-center gap-1.5 text-[10px] text-[#7A8C74] dark:text-[#83967D] mt-0.5">
                        <span>{s.messageCount} msgs</span>
                        <span>·</span>
                        <span>{formatSessionTime(s.updatedAt)}</span>
                      </div>
                    </div>

                    {/* Delete Icon on hover / active */}
                    <button
                      type="button"
                      onClick={(e) => handleDeleteSession(e, s.sessionId)}
                      title="Delete conversation"
                      className="absolute right-2 top-2.5 w-6 h-6 rounded-lg text-[#8A847A] dark:text-[#6E8268] hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center text-[11px] cursor-pointer"
                    >
                      <FontAwesomeIcon icon={faTrashCan} />
                    </button>
                  </div>
                )
              })
            )}
          </div>

          {/* User Footer */}
          <div className="p-3 border-t border-[#E8E2D5] dark:border-[#1E2E27] bg-[#F2EDE2]/60 dark:bg-[#091312] text-[10px] text-[#5C6E56] dark:text-[#8FA387] flex items-center justify-between">
            <div className="flex items-center gap-1.5 truncate">
              <FontAwesomeIcon icon={faLeaf} className="text-[#4A6225] dark:text-[#A8D968] text-[9px]" />
              <span className="truncate font-medium">{userName}</span>
            </div>
          </div>
        </aside>

        {/* Main Conversation Stream & Input */}
        <main className="flex-1 min-w-0 flex flex-col h-full bg-white dark:bg-[#091312] relative transition-colors">
          {/* Conversation Sub-Header */}
          <div className="px-4 py-2.5 border-b border-[#E8E2D5] dark:border-[#1E2E27] bg-[#FAF8F3] dark:bg-[#0E1714]/90 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              {!isSidebarOpen && (
                <button
                  type="button"
                  onClick={() => setIsSidebarOpen(true)}
                  title="Open saved chats"
                  className="px-2.5 py-1.5 rounded-xl border border-[#E8E2D5] dark:border-[#1E2E27] bg-white dark:bg-[#121D17] hover:bg-[#EEF4E8] dark:hover:bg-[#1A2A20] text-xs font-semibold text-[#1D2516] dark:text-[#F5F2EB] transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
                >
                  <FontAwesomeIcon icon={faClockRotateLeft} className="text-[#4A6225] dark:text-[#A8D968] text-[11px]" />
                  <span className="hidden sm:inline">Chats</span>
                  <span className="text-[10px] bg-[#EEF4E8] dark:bg-[#16271D] text-[#4A6225] dark:text-[#A8D968] px-1.5 py-0.2 rounded-full border border-[#CCD8B8] dark:border-[#22352B]">
                    {sessions.length}
                  </span>
                </button>
              )}

              <div className="min-w-0">
                <h2 className="text-xs sm:text-sm font-semibold text-[#1D2516] dark:text-[#F5F2EB] truncate">
                  {activeSession?.title || (activeSessionId ? 'Saved Conversation' : 'New Conversation')}
                </h2>
                <p className="text-[10px] text-[#7A8C74] dark:text-[#83967D] truncate">
                  {activeSessionId ? `${messages.length} messages in this thread` : 'Ask anything or simulate your habits'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleNewChat}
                title="Start a new chat"
                className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-[#121D17] hover:bg-[#EEF4E8] dark:hover:bg-[#1A2A20] border border-[#E8E2D5] dark:border-[#1E2E27] text-xs font-semibold text-[#1D2516] dark:text-[#F5F2EB] transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
              >
                <FontAwesomeIcon icon={faPlus} className="text-[10px] text-[#4A6225] dark:text-[#A8D968]" />
                <span className="hidden sm:inline">New Chat</span>
              </button>

              {activeSessionId && (
                <button
                  type="button"
                  onClick={(e) => handleDeleteSession(e, activeSessionId)}
                  title="Delete this chat thread"
                  className="px-2.5 py-1.5 rounded-xl border border-[#E8E2D5] dark:border-[#1E2E27] hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-semibold text-[#8A847A] hover:text-rose-600 transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <FontAwesomeIcon icon={faTrashCan} className="text-[10px]" />
                  <span className="hidden sm:inline">Delete</span>
                </button>
              )}
            </div>
          </div>

          {/* Interactive Previous Day & Historical Data Inspector */}
          <div className="border-b border-[#E8E2D5] dark:border-[#1E2E27] bg-[#FAF8F3]/90 dark:bg-[#0B1412] px-3.5 sm:px-5 py-2.5 transition-colors">
            {/* Top Bar: Date Selector & Quick Pills */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <div className="flex items-center gap-1.5 text-xs font-serif font-bold text-[#1D2516] dark:text-[#F5F2EB] mr-1">
                  <FontAwesomeIcon icon={faCalendarDays} className="text-[#4A6225] dark:text-[#A8D968]" />
                  <span>Previous Day Data:</span>
                </div>

                {quickDates.map((item) => {
                  const isSelected = selectedHistoryDate === item.dateStr
                  return (
                    <button
                      key={item.dateStr}
                      type="button"
                      onClick={() => {
                        setSelectedHistoryDate(item.dateStr)
                        setIsHistoryExpanded(true)
                      }}
                      className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
                        isSelected
                          ? 'bg-[#4A6225] text-white border-[#3D521E] shadow-2xs'
                          : 'bg-white dark:bg-[#121D17] text-[#5C6E56] dark:text-[#A8BCA0] border-[#E8E2D5] dark:border-[#1E2E27] hover:bg-[#EEF4E8] dark:hover:bg-[#1A2A20]'
                      }`}
                    >
                      {item.label}
                    </button>
                  )
                })}

                {/* Custom Date Input */}
                <input
                  type="date"
                  value={selectedHistoryDate}
                  onChange={(e) => {
                    if (e.target.value) {
                      setSelectedHistoryDate(e.target.value)
                      setIsHistoryExpanded(true)
                    }
                  }}
                  className="px-2 py-0.5 rounded-xl text-xs font-medium bg-white dark:bg-[#121D17] text-[#1D2516] dark:text-[#F5F2EB] border border-[#E8E2D5] dark:border-[#1E2E27] cursor-pointer"
                  title="Pick any past date to inspect"
                />
              </div>

              {/* Right Controls: Expand/Collapse Toggle */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold text-[#4A6225] dark:text-[#A8D968] bg-[#EEF4E8] dark:bg-[#1A2F1C] px-2 py-0.5 rounded-full border border-[#D5E3C4] dark:border-[#2A4426]">
                  {selectedDateStats.overallPct}% completed
                </span>

                <button
                  type="button"
                  onClick={() => setIsHistoryExpanded(!isHistoryExpanded)}
                  className="text-xs text-[#5C6E56] dark:text-[#A8BCA0] hover:text-[#1D2516] dark:hover:text-white px-2 py-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer flex items-center gap-1 font-medium"
                >
                  <span>{isHistoryExpanded ? 'Hide Habits' : 'View Habits'}</span>
                  <FontAwesomeIcon icon={isHistoryExpanded ? faChevronUp : faChevronDown} className="text-[10px]" />
                </button>
              </div>
            </div>

            {/* Expanded Previous Day Detail Card */}
            {isHistoryExpanded && (
              <div className="mt-2.5 pt-2.5 border-t border-[#E8E2D5]/70 dark:border-[#1E2E27] space-y-2.5 animate-fade-in">
                {/* Summary Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-serif font-bold text-[#1D2516] dark:text-[#F5F2EB]">
                      {selectedHistoryDate === yesterdayDateStr ? 'Yesterday' : 'Date'}:{' '}
                      {(() => {
                        try {
                          return format(parseISO(selectedHistoryDate), 'EEEE, MMMM d, yyyy')
                        } catch {
                          return selectedHistoryDate
                        }
                      })()}
                    </span>
                    <span className="text-[#7A8C74] dark:text-[#83967D]">
                      ({selectedDateStats.completed} completed, {selectedDateStats.inProgress} in progress, {selectedDateStats.missed} missed)
                    </span>
                  </div>

                  {/* Overall Day Progress Mini Bar */}
                  <div className="flex items-center gap-2 min-w-[140px]">
                    <div className="flex-1 h-1.5 bg-[#E8E2D5] dark:bg-[#1E2E27] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#4A6225] dark:bg-[#A8D968] rounded-full transition-all"
                        style={{ width: `${selectedDateStats.overallPct}%` }}
                      />
                    </div>
                    <span className="font-bold text-[11px] text-[#1D2516] dark:text-[#F5F2EB] tabular-nums">
                      {selectedDateStats.overallPct}%
                    </span>
                  </div>
                </div>

                {/* Habit Cards Grid */}
                {selectedDateStats.habits.length === 0 ? (
                  <p className="text-xs text-[#7A8C74] dark:text-[#83967D] py-1">
                    No habits are configured in your tracker. Create habits in the Habits section to track your routines.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {selectedDateStats.habits.map(({ habit, target, actual, pct, isCompleted, isInProgress }) => {
                      const { icon } = getHabitIconDef(habit)
                      const unitDisplay = habit.unit === 'm' ? 'mins' : habit.unit

                      return (
                        <div
                          key={habit.id}
                          className={`p-2 sm:p-2.5 rounded-xl border flex items-center justify-between gap-2 transition-colors ${
                            isCompleted
                              ? 'bg-[#F2F7EC] dark:bg-[#162919] border-[#738541]/40 dark:border-[#335928]'
                              : isInProgress
                              ? 'bg-[#FCFAF5] dark:bg-[#1E2616] border-[#D4CBB9] dark:border-[#3E4D27]'
                              : 'bg-white dark:bg-[#121D17] border-[#E8E2D5] dark:border-[#1E2E27]'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <div
                              className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs flex-shrink-0 ${
                                isCompleted
                                  ? 'bg-[#E3EDD7] text-[#415525] dark:bg-[#253A1D] dark:text-[#A8D968]'
                                  : isInProgress
                                  ? 'bg-[#F6EEDD] text-[#845E1B] dark:bg-[#382D16] dark:text-[#FBBF24]'
                                  : 'bg-[#EDE8DB] text-[#738541] dark:bg-[#1A2821] dark:text-[#A8BCA0]'
                              }`}
                            >
                              <FontAwesomeIcon icon={icon} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-semibold text-[#1D2516] dark:text-[#F5F2EB] truncate leading-tight">
                                {habit.name}
                              </p>
                              <p className="text-[10px] text-[#7A8C74] dark:text-[#83967D] truncate mt-0.5">
                                {actual} / {target} {unitDisplay}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                                isCompleted
                                  ? 'bg-[#E3EDD7] text-[#415525] dark:bg-[#253A1D] dark:text-[#A8D968]'
                                  : isInProgress
                                  ? 'bg-[#F6EEDD] text-[#845E1B] dark:bg-[#382D16] dark:text-[#FBBF24]'
                                  : 'bg-black/5 dark:bg-white/10 text-[#8C8271] dark:text-[#A8BCA0]'
                              }`}
                            >
                              {isCompleted ? (
                                <span className="inline-flex items-center gap-1">
                                  <FontAwesomeIcon icon={faCheck} className="text-[8px]" /> Done
                                </span>
                              ) : (
                                `${pct}%`
                              )}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* 1-Click Ask What-If Agent Action Chips */}
                <div className="pt-1 flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] font-bold text-[#4A6225] dark:text-[#A8D968] mr-1 flex items-center gap-1">
                    <FontAwesomeIcon icon={faCodeBranch} className="text-[10px]" />
                    <span>Ask What-If:</span>
                  </span>

                  <button
                    type="button"
                    onClick={() =>
                      handleSendMessage(
                        `Can you analyze my habit performance and completion for ${selectedHistoryDate}? What habits did I complete, and where did I lag?`
                      )
                    }
                    className="px-2.5 py-1 rounded-lg bg-white dark:bg-[#121D17] hover:bg-[#EEF4E8] dark:hover:bg-[#1A2A20] text-[#1D2516] dark:text-[#F5F2EB] text-[11px] font-medium border border-[#E8E2D5] dark:border-[#1E2E27] hover:border-[#CCD8B8] transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                  >
                    <span>💬 Analyze this day</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      handleSendMessage(
                        `What if I had achieved 100% on all my habits on ${selectedHistoryDate}? How would that change my rolling consistency and 6-month trajectory?`
                      )
                    }
                    className="px-2.5 py-1 rounded-lg bg-white dark:bg-[#121D17] hover:bg-[#EEF4E8] dark:hover:bg-[#1A2A20] text-[#1D2516] dark:text-[#F5F2EB] text-[11px] font-medium border border-[#E8E2D5] dark:border-[#1E2E27] hover:border-[#CCD8B8] transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                  >
                    <span>🔮 What if 100% completed?</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      handleSendMessage(
                        `What if I had not missed any habits on ${selectedHistoryDate}? What friction caused me to miss them and how can I fix it?`
                      )
                    }
                    className="px-2.5 py-1 rounded-lg bg-white dark:bg-[#121D17] hover:bg-[#EEF4E8] dark:hover:bg-[#1A2A20] text-[#1D2516] dark:text-[#F5F2EB] text-[11px] font-medium border border-[#E8E2D5] dark:border-[#1E2E27] hover:border-[#CCD8B8] transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                  >
                    <span>⚡ What if I fixed missed habits?</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      handleSendMessage(
                        `Compare my habit completion on ${selectedHistoryDate} with my progress today.`
                      )
                    }
                    className="px-2.5 py-1 rounded-lg bg-white dark:bg-[#121D17] hover:bg-[#EEF4E8] dark:hover:bg-[#1A2A20] text-[#1D2516] dark:text-[#F5F2EB] text-[11px] font-medium border border-[#E8E2D5] dark:border-[#1E2E27] hover:border-[#CCD8B8] transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                  >
                    <span>📊 Compare with today</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Messages Stream */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 pr-2">
            {isLoadingMessages ? (
              <div className="flex flex-col items-center justify-center h-full text-xs text-[#7A8C74] dark:text-[#83967D] gap-2.5">
                <FontAwesomeIcon icon={faRotateRight} className="animate-spin text-base text-[#4A6225] dark:text-[#A8D968]" />
                <span className="font-medium text-[#1D2516] dark:text-[#F5F2EB]">Loading saved messages...</span>
              </div>
            ) : (
              messages.map((msg) => {
                const isUser = msg.role === 'user'
                return (
                  <div
                    key={msg.id}
                    className={`flex gap-3 max-w-[92%] sm:max-w-[85%] ${
                      isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'
                    }`}
                  >
                    {/* Avatar Icon */}
                    <div
                      className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs flex-shrink-0 mt-0.5 shadow-2xs overflow-hidden ${
                        isUser
                          ? 'bg-[#4A6225] dark:bg-[#4E6826] text-white'
                          : 'bg-[#EEF4E8] dark:bg-[#16271D] text-[#4A6225] dark:text-[#A8D968] border border-[#CCD8B8] dark:border-[#22352B]'
                      }`}
                    >
                      {isUser ? (
                        avatarUrl ? (
                          <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <FontAwesomeIcon icon={faUser} />
                        )
                      ) : (
                        <FontAwesomeIcon icon={faLeaf} className="text-[#4A6225] dark:text-[#A8D968] transform -rotate-12 text-[11px]" />
                      )}
                    </div>

                    {/* Bubble */}
                    <div className="flex flex-col gap-1 min-w-0">
                      <div
                        className={`rounded-2xl px-4 py-3 text-xs sm:text-sm shadow-xs ${
                          isUser
                            ? 'bg-[#4A6225] dark:bg-[#4E6826] text-white font-medium rounded-tr-xs'
                            : 'bg-[#FAF7F0] dark:bg-[#121D17] text-[#1D2516] dark:text-[#F5F2EB] border border-[#E8E2D5] dark:border-[#1E2E27] rounded-tl-xs'
                        }`}
                      >
                        {isUser ? (
                          <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                        ) : (
                          renderFormattedText(msg.content)
                        )}
                      </div>
                      <span
                        className={`text-[10px] text-[#8A847A] dark:text-[#6E8268] px-1 ${
                          isUser ? 'text-right' : 'text-left'
                        }`}
                      >
                        {msg.timestamp}
                      </span>
                    </div>
                  </div>
                )
              })
            )}

            {/* Relocated In-Chat Starter Suggestions */}
            {messages.length <= 1 && !isLoadingMessages && (
              <div className="mt-4 pt-3 border-t border-[#E8E2D5]/70 dark:border-[#1E2E27]">
                <div className="flex items-center gap-1.5 mb-2.5 text-[11px] font-semibold text-[#4A6225] dark:text-[#A8D968] uppercase tracking-wider">
                  <FontAwesomeIcon icon={faLightbulb} className="text-[10px]" />
                  <span>Suggested Prompts to Explore</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {STARTER_SCENARIOS.map((scenario, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSendMessage(scenario)}
                      disabled={isSending}
                      className="text-left p-3 rounded-xl bg-[#FAF7F0] dark:bg-[#121D17] hover:bg-[#EEF4E8] dark:hover:bg-[#16271D] border border-[#E8E2D5] dark:border-[#1E2E27] hover:border-[#CCD8B8] dark:hover:border-[#38592A] transition-all cursor-pointer group flex items-center justify-between gap-2 shadow-2xs"
                    >
                      <span className="text-xs font-medium text-[#2B351F] dark:text-[#E2EBD8] group-hover:text-[#1D2516] dark:group-hover:text-white leading-snug">
                        {scenario}
                      </span>
                      <FontAwesomeIcon
                        icon={faArrowRight}
                        className="text-[10px] text-[#4A6225] dark:text-[#A8D968] opacity-70 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all flex-shrink-0"
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {isSending && (
              <div className="flex items-center gap-2.5 text-xs text-[#4A6225] dark:text-[#A8D968] p-3 bg-[#EEF4E8] dark:bg-[#16271D] rounded-2xl w-fit border border-[#CCD8B8] dark:border-[#22352B] animate-pulse">
                <FontAwesomeIcon icon={faRotateRight} className="animate-spin text-[#4A6225] dark:text-[#A8D968]" />
                <span>Consulting Future You & your habit trajectory...</span>
              </div>
            )}

            <div ref={chatBottomRef} />
          </div>

          {/* Chat Input Box */}
          <div className="p-3 sm:p-4 bg-[#FAF8F3] dark:bg-[#0C1615] border-t border-[#E8E2D5] dark:border-[#1E2E27] transition-colors">
            <div className="flex items-end gap-2 bg-white dark:bg-[#121D18] rounded-2xl border border-[#E8E2D5] dark:border-[#22352B] focus-within:border-[#738541] dark:focus-within:border-[#82A84E] px-3 py-2 shadow-2xs transition-colors">
              <textarea
                ref={textareaRef}
                rows={1}
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask Future You about your habits, simulate a 6-month trajectory, or get focus advice..."
                disabled={isSending}
                className="flex-1 py-1 px-1.5 bg-transparent text-xs sm:text-sm text-[#1D2516] dark:text-[#F5F2EB] placeholder-[#8A847A] dark:placeholder-[#6E8268] focus:outline-none resize-none font-medium max-h-28"
              />

              <button
                type="button"
                onClick={() => handleSendMessage()}
                disabled={!inputVal.trim() || isSending}
                className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs text-white transition-all cursor-pointer flex-shrink-0 mb-0.5 ${
                  !inputVal.trim() || isSending
                    ? 'bg-[#E8E2D5] dark:bg-[#1E2E27] text-[#8A847A] dark:text-[#5C6E56] cursor-not-allowed'
                    : 'bg-[#4A6225] hover:bg-[#3D521E] dark:bg-[#4E6826] dark:hover:bg-[#41581F] active:scale-95 shadow-xs'
                }`}
                title="Send message"
              >
                <FontAwesomeIcon icon={faPaperPlane} />
              </button>
            </div>
            <div className="flex justify-between items-center text-[10px] text-[#7A8C74] dark:text-[#6E8268] mt-1.5 px-1">
              <span className="flex items-center gap-1">
                <FontAwesomeIcon icon={faLeaf} className="text-[#4A6225] dark:text-[#A8D968] text-[9px]" />
                Future You AI Persona
              </span>
              <span>Shift + Enter for new line</span>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
