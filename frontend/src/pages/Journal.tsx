import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faBookOpen,
  faPlus,
  faTrash,
  faPenToSquare,
  faCheck,
  faXmark,
  faCalendarDay,
  faCalendarDays,
  faFeatherPointed,
  faClockRotateLeft,
  faRotateLeft,
  faLock,
} from '@fortawesome/free-solid-svg-icons'
import { format, subDays } from 'date-fns'
import { useAuth } from '../contexts/AuthContext'
import { useAppDate } from '../contexts/DateContext'
import {
  type JournalEntry,
  JOURNAL_STORAGE_KEY,
  DEFAULT_JOURNAL_ENTRIES,
  filterEntriesForDate,
  getDatesWithEntries,
  createJournalEntry,
} from '../utils/journalStorage'

export function Journal() {
  const { user } = useAuth()
  const { selectedDate, selectedDateStr, setSelectedDate, isToday, todayStr, resetToToday } = useAppDate()
  const isPastDate = selectedDateStr < todayStr
  const userStorageKey = user?.id ? `${JOURNAL_STORAGE_KEY}_${user.id}` : JOURNAL_STORAGE_KEY

  const [entries, setEntries] = useState<JournalEntry[]>(() => {
    try {
      const specific = localStorage.getItem(userStorageKey)
      if (specific) {
        const parsed = JSON.parse(specific)
        if (Array.isArray(parsed) && parsed.length > 0) return parsed
      }
      const legacy = localStorage.getItem(JOURNAL_STORAGE_KEY)
      if (legacy) {
        const parsed = JSON.parse(legacy)
        if (Array.isArray(parsed) && parsed.length > 0) return parsed
      }
    } catch {
      // Fallback
    }
    return DEFAULT_JOURNAL_ENTRIES
  })

  const [isAdding, setIsAdding] = useState(false)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')

  // Inline editing state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editContent, setEditContent] = useState('')

  // Sync entries when user changes
  useEffect(() => {
    try {
      const specific = localStorage.getItem(userStorageKey)
      if (specific) {
        const parsed = JSON.parse(specific)
        if (Array.isArray(parsed)) {
          setEntries(parsed)
          return
        }
      }
      const legacy = localStorage.getItem(JOURNAL_STORAGE_KEY)
      if (legacy) {
        const parsed = JSON.parse(legacy)
        if (Array.isArray(parsed)) {
          setEntries(parsed)
          return
        }
      }
    } catch {}
    setEntries(DEFAULT_JOURNAL_ENTRIES)
  }, [userStorageKey])

  // Persist entries to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(userStorageKey, JSON.stringify(entries))
    } catch {}
  }, [entries, userStorageKey])

  // Quick Day navigation pills (matching Habits Studio)
  const quickDayOptions = useMemo(() => {
    const opts = [{ dateStr: todayStr, label: 'Today' }]
    const now = new Date()
    for (let i = 1; i <= 6; i++) {
      const d = subDays(now, i)
      const dStr = format(d, 'yyyy-MM-dd')
      opts.push({
        dateStr: dStr,
        label: i === 1 ? 'Yesterday' : format(d, 'd MMM'),
      })
    }
    return opts
  }, [todayStr])

  // Filter entries strictly for the selected date (no carryover across days)
  const dayEntries = useMemo(() => {
    return filterEntriesForDate(entries, selectedDateStr)
  }, [entries, selectedDateStr])

  // List of all dates that currently have recorded reflections
  const datesWithEntries = useMemo(() => {
    return getDatesWithEntries(entries)
  }, [entries])

  const handleSelectDate = (dateStr: string) => {
    setSelectedDate(dateStr)
    setIsAdding(false)
    // If inline editing was active, cancel it when switching days
    if (editingId) {
      setEditingId(null)
      setEditTitle('')
      setEditContent('')
    }
  }

  const handleSaveEntry = (e: React.FormEvent) => {
    e.preventDefault()
    if (isPastDate) return
    if (!title.trim() || !content.trim()) return

    const newEntry = createJournalEntry(title, content, selectedDate, selectedDateStr)

    setEntries([newEntry, ...entries])
    setTitle('')
    setContent('')
    setIsAdding(false)
  }

  const handleStartEdit = (entry: JournalEntry) => {
    if (isPastDate) return
    setEditingId(entry.id)
    setEditTitle(entry.title)
    setEditContent(entry.content)
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditTitle('')
    setEditContent('')
  }

  const handleSaveEdit = (id: string) => {
    if (isPastDate) return
    if (!editTitle.trim() || !editContent.trim()) return

    setEntries((prev) =>
      prev.map((e) =>
        e.id === id
          ? {
              ...e,
              title: editTitle.trim(),
              content: editContent.trim(),
              updatedAt: new Date().toISOString(),
            }
          : e
      )
    )
    handleCancelEdit()
  }

  const handleDeleteEntry = (id: string) => {
    if (isPastDate) return
    if (editingId === id) {
      handleCancelEdit()
    }
    setEntries((prev) => prev.filter((e) => e.id !== id))
  }

  const formattedSelectedDate = format(selectedDate, 'EEEE, d MMMM yyyy')

  return (
    <div className="space-y-4">
      {/* 1. Header Card */}
      <div className="bg-white/95 dark:bg-[#0D1814] rounded-3xl border border-[#E8E2D5] dark:border-[#223326] p-5 sm:p-6 shadow-[0_2px_12px_rgba(29,37,22,0.03)] flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#EAEFE2] dark:bg-[#1D2D23] text-[#4E6228] dark:text-[#B6CDB0] text-xs font-semibold uppercase tracking-wider mb-2">
            <FontAwesomeIcon icon={faBookOpen} className="w-3 h-3 text-[#738541] dark:text-[#9EB868]" />
            <span>Daily Reflections & Journal</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#1D2516] dark:text-[#F5F2EB] tracking-tight">
            Journal Studio
          </h1>
          <p className="text-xs sm:text-sm text-[#4E5642] dark:text-[#9BAF90] mt-1">
            Capture thoughts, track mindset, and write reflections unique to each day.
          </p>
        </div>

        {!isPastDate ? (
          <button
            onClick={() => setIsAdding(!isAdding)}
            className="self-start sm:self-center inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#738541] hover:bg-[#5E6D34] dark:bg-[#4E6826] dark:hover:bg-[#41581F] text-white text-xs sm:text-sm font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <FontAwesomeIcon icon={isAdding ? faXmark : faPlus} className="w-3.5 h-3.5" />
            <span>{isAdding ? 'Close Composer' : 'New Entry'}</span>
          </button>
        ) : (
          <div className="self-start sm:self-center inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#EAEFE2] dark:bg-[#1A2A20] text-[#4E6228] dark:text-[#A8C7A0] border border-[#D5E3C4] dark:border-[#2B4232] text-xs font-bold">
            <FontAwesomeIcon icon={faLock} className="text-[11px]" />
            <span>Past Date (Read-Only)</span>
          </div>
        )}
      </div>

      {/* 2. Date Switcher & Historical Day Navigator */}
      <div className="bg-[#FAF7F0] dark:bg-[#101C16] rounded-2xl border border-[#E8E2D5] dark:border-[#22352B] p-3 sm:p-3.5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-3 transition-colors">
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#DFEACF] dark:bg-[#203423] text-[#3D5220] dark:text-[#B6DB8A] text-xs font-bold shrink-0">
            <FontAwesomeIcon icon={faCalendarDays} className="text-[11px]" />
            <span>Day:</span>
          </div>

          {/* Quick Dates: Today, Yesterday, 2d ago, etc. */}
          {quickDayOptions.map((opt) => {
            const isSelected = selectedDateStr === opt.dateStr
            return (
              <button
                key={opt.dateStr}
                type="button"
                onClick={() => handleSelectDate(opt.dateStr)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#738541] text-white shadow-xs'
                    : 'bg-white dark:bg-[#16271D] text-[#4E5642] dark:text-[#9BAF90] hover:bg-[#EEF4E8] dark:hover:bg-[#1E3024] border border-[#E0D7C6] dark:border-[#22352B]'
                }`}
              >
                {opt.label}
              </button>
            )
          })}

          {/* Custom Date Input */}
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white dark:bg-[#16271D] border border-[#E0D7C6] dark:border-[#22352B] text-xs text-[#556244] dark:text-[#A8BCA0]">
            <input
              type="date"
              value={selectedDateStr}
              onChange={(e) => {
                if (e.target.value) handleSelectDate(e.target.value)
              }}
              className="bg-transparent text-xs font-semibold text-[#1D2516] dark:text-[#F5F2EB] focus:outline-none cursor-pointer"
            />
          </div>
        </div>

        {/* Date status / Return to Today */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-end">
          {!isToday ? (
            <button
              type="button"
              onClick={resetToToday}
              className="px-3 py-1.5 rounded-xl bg-white dark:bg-[#16271D] text-[#556244] dark:text-[#A8BCA0] hover:text-[#1D2516] dark:hover:text-white border border-[#E0D7C6] dark:border-[#22352B] text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <FontAwesomeIcon icon={faRotateLeft} className="text-[10px]" />
              <span>Back to Today</span>
            </button>
          ) : (
            <span className="text-[11px] font-medium text-[#7A8C74] dark:text-[#8FA387]">
              Today's reflection space
            </span>
          )}
        </div>
      </div>

      {/* 3. New Entry Composer */}
      <AnimatePresence>
        {isAdding && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <form
              onSubmit={handleSaveEntry}
              className="bg-white/95 dark:bg-[#0D1814] rounded-3xl border border-[#E8E2D5] dark:border-[#223326] p-5 sm:p-6 shadow-[0_2px_12px_rgba(29,37,22,0.03)] space-y-3.5 transition-colors"
            >
              <div className="flex items-center justify-between pb-1 border-b border-[#ECE7DC] dark:border-[#1E2E27]">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#738541] dark:text-[#9EB868]">
                  <FontAwesomeIcon icon={faPenToSquare} className="w-3.5 h-3.5" />
                  <span>
                    Writing reflection for: {isToday ? 'Today, ' : ''}
                    {formattedSelectedDate}
                  </span>
                </div>
                <span className="text-[11px] font-mono text-[#8A9280] dark:text-[#6E8268]">
                  {selectedDateStr}
                </span>
              </div>

              <input
                type="text"
                placeholder="Title (e.g. Quiet Morning Run, Digital Reset...)"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                autoFocus
                className="w-full px-4 py-2.5 rounded-xl bg-[#F6F3EB]/60 dark:bg-[#15231C] border border-[#E8E2D5] dark:border-[#223326] text-sm text-[#1D2516] dark:text-[#F5F2EB] font-medium placeholder-[#8A9280] dark:placeholder-[#6E8268] focus:outline-none focus:border-[#738541] dark:focus:border-[#4E6826] transition-colors"
              />

              <textarea
                rows={4}
                placeholder="What felt effortless today? What habit gave you energy? What did you notice about your mindset?"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-[#F6F3EB]/60 dark:bg-[#15231C] border border-[#E8E2D5] dark:border-[#223326] text-sm text-[#1D2516] dark:text-[#F5F2EB] placeholder-[#8A9280] dark:placeholder-[#6E8268] focus:outline-none focus:border-[#738541] dark:focus:border-[#4E6826] transition-colors resize-none leading-relaxed"
              />

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setIsAdding(false)
                    setTitle('')
                    setContent('')
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[#4E5642] dark:text-[#9BAF90] hover:bg-[#F6F3EB] dark:hover:bg-[#1D2D23] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!title.trim() || !content.trim()}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#738541] hover:bg-[#5E6D34] dark:bg-[#4E6826] dark:hover:bg-[#41581F] disabled:opacity-50 text-white text-xs font-semibold transition-colors cursor-pointer shadow-xs"
                >
                  <FontAwesomeIcon icon={faCheck} className="w-3 h-3" />
                  <span>Save Entry</span>
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 4. Active Day Banner */}
      <div className="flex items-center justify-between px-1 text-xs text-[#5E6750] dark:text-[#8E9F84]">
        <div className="flex items-center gap-2">
          <FontAwesomeIcon icon={faCalendarDay} className="w-3.5 h-3.5 text-[#738541] dark:text-[#9EB868]" />
          <span className="font-semibold text-[#1D2516] dark:text-[#F5F2EB]">
            {isToday ? `Today's Log: ${formattedSelectedDate}` : `Historical Log: ${formattedSelectedDate}`}
          </span>
          <span className="text-[11px] text-[#8A9280] dark:text-[#6E8268]">
            ({dayEntries.length} {dayEntries.length === 1 ? 'entry' : 'entries'})
          </span>
        </div>

        {datesWithEntries.length > 0 && (
          <span className="hidden sm:inline text-[11px] text-[#7A8C74] dark:text-[#8FA387]">
            {datesWithEntries.length} {datesWithEntries.length === 1 ? 'day recorded' : 'days recorded'} in journal
          </span>
        )}
      </div>

      {/* 5. Date-Specific Reflection Feed */}
      <div className="space-y-3">
        {dayEntries.length === 0 ? (
          <div className="bg-white/95 dark:bg-[#0D1814] rounded-3xl border border-[#E8E2D5] dark:border-[#223326] p-10 text-center space-y-3 transition-colors">
            <FontAwesomeIcon icon={faFeatherPointed} className="w-8 h-8 text-[#8A9280] dark:text-[#6E8268] mx-auto mb-1" />
            <h3 className="font-serif font-bold text-base sm:text-lg text-[#1D2516] dark:text-[#F5F2EB]">
              {isToday
                ? 'Fresh Canvas for Today'
                : `No reflection recorded for ${formattedSelectedDate}`}
            </h3>
            <p className="text-xs text-[#4E5642] dark:text-[#9BAF90] max-w-md mx-auto leading-relaxed">
              {isToday
                ? 'Each new day starts with a fresh canvas. Capture what felt effortless today, how habits felt, and thoughts for your future self.'
                : 'This date has already passed. Past days are preserved as read-only historical records, so new journal reflections cannot be added retroactively.'}
            </p>

            {!isPastDate && (
              <button
                type="button"
                onClick={() => setIsAdding(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#738541] hover:bg-[#5E6D34] dark:bg-[#4E6826] dark:hover:bg-[#41581F] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer mt-2"
              >
                <FontAwesomeIcon icon={faPlus} className="w-3 h-3" />
                <span>Write reflection for today</span>
              </button>
            )}
          </div>
        ) : (
          dayEntries.map((entry) => (
            <div
              key={entry.id}
              className="bg-white/95 dark:bg-[#0D1814] rounded-3xl border border-[#E8E2D5] dark:border-[#223326] p-5 sm:p-6 shadow-[0_2px_12px_rgba(29,37,22,0.03)] hover:border-[#D6CEBE] dark:hover:border-[#38592A] transition-colors group"
            >
              {editingId === entry.id ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    handleSaveEdit(entry.id)
                  }}
                  className="space-y-3.5"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-[#E8E2D5] dark:border-[#223326]">
                    <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#738541] dark:text-[#9EB868]">
                      <FontAwesomeIcon icon={faPenToSquare} className="w-3.5 h-3.5" />
                      <span>Edit Reflection</span>
                    </div>
                    <span className="text-[11px] text-[#8A9280] dark:text-[#6E8268]">
                      Date: {entry.date} ({entry.dateStr || selectedDateStr})
                    </span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-[#6F6759] dark:text-[#8FA387] mb-1">
                      Title
                    </label>
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      placeholder="Title..."
                      autoFocus
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#F6F3EB]/60 dark:bg-[#15231C] border border-[#E8E2D5] dark:border-[#223326] text-sm text-[#1D2516] dark:text-[#F5F2EB] font-bold focus:outline-none focus:border-[#738541] dark:focus:border-[#4E6826] transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-[#6F6759] dark:text-[#8FA387] mb-1">
                      Reflection & Thoughts
                    </label>
                    <textarea
                      rows={5}
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      onKeyDown={(e) => {
                        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                          e.preventDefault()
                          handleSaveEdit(entry.id)
                        }
                      }}
                      placeholder="Write your reflections... (Ctrl + Enter to save)"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#F6F3EB]/60 dark:bg-[#15231C] border border-[#E8E2D5] dark:border-[#223326] text-sm text-[#1D2516] dark:text-[#F5F2EB] focus:outline-none focus:border-[#738541] dark:focus:border-[#4E6826] transition-colors resize-none leading-relaxed"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] text-[#8A9280] dark:text-[#6E8268] hidden sm:inline">
                      Tip: Press <kbd className="px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/10 font-mono text-[9px]">Ctrl</kbd> + <kbd className="px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/10 font-mono text-[9px]">Enter</kbd> to save
                    </span>
                    <div className="flex items-center gap-2 ml-auto">
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-[#4E5642] dark:text-[#9BAF90] hover:bg-[#F6F3EB] dark:hover:bg-[#1D2D23] transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={!editTitle.trim() || !editContent.trim()}
                        className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-[#738541] hover:bg-[#5E6D34] dark:bg-[#4E6826] dark:hover:bg-[#41581F] disabled:opacity-50 text-white text-xs font-semibold transition-colors cursor-pointer shadow-xs"
                      >
                        <FontAwesomeIcon icon={faCheck} className="w-3 h-3" />
                        <span>Save Changes</span>
                      </button>
                    </div>
                  </div>
                </form>
              ) : (
                <>
                  <div className="flex flex-wrap sm:flex-nowrap items-start justify-between gap-3 mb-2.5">
                    <div className="min-w-0 flex-1">
                      <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#738541] dark:text-[#9EB868] mb-1">
                        <FontAwesomeIcon icon={faCalendarDay} className="w-3 h-3 text-[#738541]/70 dark:text-[#9EB868]/70" />
                        <span>{entry.date}</span>
                        {entry.updatedAt && (
                          <span className="px-1.5 py-0.2 rounded-md bg-[#EEF4E8] dark:bg-[#1D2D23] text-[#4E6228] dark:text-[#A8BCA0] text-[9px] font-medium">
                            edited
                          </span>
                        )}
                      </div>
                      <h3 className="font-serif font-bold text-base sm:text-lg text-[#1D2516] dark:text-[#F5F2EB] break-words">
                        {entry.title}
                      </h3>
                    </div>

                    {!isPastDate ? (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleStartEdit(entry)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#EEF4E8] hover:bg-[#DFEACF] dark:bg-[#1E2F1A] dark:hover:bg-[#283F23] text-[#415525] dark:text-[#A8D968] text-xs font-bold transition-all border border-[#D5E3C4] dark:border-[#385926] shadow-2xs cursor-pointer"
                          title="Edit this journal entry"
                          aria-label="Edit this journal entry"
                        >
                          <FontAwesomeIcon icon={faPenToSquare} className="w-3.5 h-3.5 text-[#5A732E] dark:text-[#A8D968]" />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteEntry(entry.id)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 text-xs font-medium transition-colors cursor-pointer"
                          title="Delete this journal entry"
                          aria-label="Delete this journal entry"
                        >
                          <FontAwesomeIcon icon={faTrash} className="w-3 h-3" />
                          <span className="hidden sm:inline">Delete</span>
                        </button>
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#EEF4E8] dark:bg-[#1E2F1A] text-[#415525] dark:text-[#A8D968] text-xs font-semibold shrink-0 border border-[#D5E3C4] dark:border-[#385926]">
                        <FontAwesomeIcon icon={faLock} className="text-[10px]" />
                        <span>Archived</span>
                      </div>
                    )}
                  </div>

                  <p className="text-xs sm:text-sm text-[#4E5642] dark:text-[#9BAF90] leading-relaxed whitespace-pre-wrap break-words">
                    {entry.content}
                  </p>

                  {/* Card Footer Metadata */}
                  <div className="flex items-center gap-2 pt-3 mt-3.5 border-t border-[#ECE7DC]/80 dark:border-[#1E2E27] text-[11px] text-[#7A8C74] dark:text-[#8FA387]">
                    <span>{entry.content.split(/\s+/).filter(Boolean).length} words</span>
                    {entry.updatedAt && (
                      <>
                        <span>·</span>
                        <span className="text-emerald-700 dark:text-emerald-400 font-medium">Edited</span>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </div>

      {/* 6. Past Days with Recorded Entries (Quick Jump Archive) */}
      {datesWithEntries.length > 0 && (
        <div className="bg-white/60 dark:bg-[#0D1814]/60 rounded-2xl border border-[#E8E2D5]/70 dark:border-[#223326]/70 p-4 transition-colors">
          <div className="flex items-center gap-2 text-xs font-bold text-[#4E6228] dark:text-[#B6CDB0] mb-2.5">
            <FontAwesomeIcon icon={faClockRotateLeft} className="w-3 h-3 text-[#738541]" />
            <span>Dates with Recorded Entries:</span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {datesWithEntries.map((dStr) => {
              const isSelected = selectedDateStr === dStr
              const count = filterEntriesForDate(entries, dStr).length
              return (
                <button
                  key={dStr}
                  type="button"
                  onClick={() => handleSelectDate(dStr)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-[#738541] text-white shadow-2xs'
                      : 'bg-[#F2ECE1]/80 dark:bg-[#16271D] text-[#4E5642] dark:text-[#A8BCA0] hover:bg-[#E5DDCF] dark:hover:bg-[#1F3325] border border-[#E0D7C6] dark:border-[#22352B]'
                  }`}
                >
                  <span>{dStr}</span>
                  <span
                    className={`px-1 py-0.2 rounded-full text-[9px] ${
                      isSelected
                        ? 'bg-white/20 text-white'
                        : 'bg-black/5 dark:bg-white/10 text-[#4E5642] dark:text-[#A8BCA0]'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
