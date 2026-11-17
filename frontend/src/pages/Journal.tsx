import { useState, useEffect } from 'react'
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
  faFeatherPointed,
} from '@fortawesome/free-solid-svg-icons'

interface JournalEntry {
  id: string
  date: string
  title: string
  content: string
}

const STORAGE_KEY = 'future_you_journal_entries'

const DEFAULT_ENTRIES: JournalEntry[] = [
  {
    id: 'entry-1',
    date: 'Mon, 16 Nov 2026',
    title: 'Morning Clarity & Fresh Focus',
    content:
      'Woke up early after a consistent 8-hour sleep. Completed the morning run with high energy. Kept notifications silenced for the first two hours of deep work, which noticeably improved concentration.',
  },
  {
    id: 'entry-2',
    date: 'Sun, 15 Nov 2026',
    title: 'Digital Fasting Reflection',
    content:
      'Kept screen time under 2 hours today. Spent the evening reading instead of scrolling. Feeling grounded and ready for the week ahead.',
  },
]

export function Journal() {
  const [entries, setEntries] = useState<JournalEntry[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) return JSON.parse(saved)
    } catch {
      // Fallback
    }
    return DEFAULT_ENTRIES
  })

  const [isAdding, setIsAdding] = useState(false)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')

  // Persist entries to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
  }, [entries])

  const handleSaveEntry = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !content.trim()) return

    const todayStr = new Intl.DateTimeFormat('en-US', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(new Date())

    const newEntry: JournalEntry = {
      id: `entry-${Date.now()}`,
      date: todayStr,
      title: title.trim(),
      content: content.trim(),
    }

    setEntries([newEntry, ...entries])
    setTitle('')
    setContent('')
    setIsAdding(false)
  }

  const handleDeleteEntry = (id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id))
  }

  return (
    <div className="space-y-4">
      {/* 1. Header Card */}
      <div className="bg-white/95 dark:bg-[#0D1814] rounded-3xl border border-[#E8E2D5] dark:border-[#223326] p-5 sm:p-6 shadow-[0_2px_12px_rgba(29,37,22,0.03)] flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#EAEFE2] dark:bg-[#1D2D23] text-[#4E6228] dark:text-[#B6CDB0] text-xs font-semibold uppercase tracking-wider mb-2">
            <FontAwesomeIcon icon={faBookOpen} className="w-3 h-3 text-[#738541] dark:text-[#9EB868]" />
            <span>Daily Reflections</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#1D2516] dark:text-[#F5F2EB] tracking-tight">
            Journal & Notes
          </h1>
          <p className="text-xs sm:text-sm text-[#4E5642] dark:text-[#9BAF90] mt-1">
            Capture thoughts, track mindset, and write reflections to your future self.
          </p>
        </div>

        <button
          onClick={() => setIsAdding(!isAdding)}
          className="self-start sm:self-center inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#738541] hover:bg-[#5E6D34] dark:bg-[#4E6826] dark:hover:bg-[#41581F] text-white text-xs sm:text-sm font-semibold shadow-xs transition-colors cursor-pointer"
        >
          <FontAwesomeIcon icon={isAdding ? faXmark : faPlus} className="w-3.5 h-3.5" />
          <span>{isAdding ? 'Close Composer' : 'New Entry'}</span>
        </button>
      </div>

      {/* 2. New Entry Composer */}
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
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#738541] dark:text-[#9EB868]">
                <FontAwesomeIcon icon={faPenToSquare} className="w-3.5 h-3.5" />
                <span>Write Today's Reflection</span>
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

      {/* 3. Reflection Feed */}
      <div className="space-y-3">
        {entries.length === 0 ? (
          <div className="bg-white/95 dark:bg-[#0D1814] rounded-3xl border border-[#E8E2D5] dark:border-[#223326] p-10 text-center space-y-2 transition-colors">
            <FontAwesomeIcon icon={faFeatherPointed} className="w-7 h-7 text-[#8A9280] dark:text-[#6E8268] mx-auto mb-2" />
            <h3 className="font-serif font-bold text-base text-[#1D2516] dark:text-[#F5F2EB]">No reflections yet</h3>
            <p className="text-xs text-[#4E5642] dark:text-[#9BAF90]">
              Tap "New Entry" above to write down your first reflection.
            </p>
          </div>
        ) : (
          entries.map((entry) => (
            <div
              key={entry.id}
              className="bg-white/95 dark:bg-[#0D1814] rounded-3xl border border-[#E8E2D5] dark:border-[#223326] p-5 sm:p-6 shadow-[0_2px_12px_rgba(29,37,22,0.03)] hover:border-[#D6CEBE] dark:hover:border-[#38592A] transition-colors group"
            >
              <div className="flex items-start justify-between gap-4 mb-2">
                <div>
                  <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#738541] dark:text-[#9EB868] mb-1">
                    <FontAwesomeIcon icon={faCalendarDay} className="w-3 h-3 text-[#738541]/70 dark:text-[#9EB868]/70" />
                    <span>{entry.date}</span>
                  </div>
                  <h3 className="font-serif font-bold text-base sm:text-lg text-[#1D2516] dark:text-[#F5F2EB]">
                    {entry.title}
                  </h3>
                </div>

                <button
                  onClick={() => handleDeleteEntry(entry.id)}
                  title="Delete Entry"
                  className="opacity-60 group-hover:opacity-100 p-2 rounded-lg text-[#8A9280] dark:text-[#6E8268] hover:text-[#B44C3A] hover:bg-[#FBEAE8] dark:hover:bg-rose-950/40 transition-all cursor-pointer"
                >
                  <FontAwesomeIcon icon={faTrash} className="w-3.5 h-3.5" />
                </button>
              </div>

              <p className="text-xs sm:text-sm text-[#4E5642] dark:text-[#9BAF90] leading-relaxed whitespace-pre-wrap">
                {entry.content}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
