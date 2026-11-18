import { useState, useMemo, useEffect } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faAward, faCheckCircle, faLock } from '@fortawesome/free-solid-svg-icons'
import { getLocalHabits, getAllLocalLogs } from '../utils/habitStorage'
import { calculateUserBadges } from '../utils/achievementBadges'
import { BadgeCard, BadgeMedallion } from '../components/profile/GitHubBadgeItem'

export function Badges() {
  const [badgeFilter, setBadgeFilter] = useState<'all' | 'unlocked' | 'locked'>('all')
  const [selectedBadgeId, setSelectedBadgeId] = useState<string | null>(null)

  const [habits, setHabits] = useState(() => getLocalHabits())
  const [logs, setLogs] = useState(() => getAllLocalLogs())

  useEffect(() => {
    const handleSync = () => {
      setHabits(getLocalHabits())
      setLogs(getAllLocalLogs())
    }
    window.addEventListener('future-you-storage-updated', handleSync)
    return () => window.removeEventListener('future-you-storage-updated', handleSync)
  }, [])

  const currentStreak = useMemo(() => {
    const activeDates = Array.from(
      new Set(logs.filter((l) => l.completion_status).map((l) => l.log_date))
    ).sort()
    return activeDates.length
  }, [logs])

  const { badges, unlockedCount, totalCount } = useMemo(() => {
    return calculateUserBadges(habits, logs, currentStreak)
  }, [habits, logs, currentStreak])

  const completionPct = Math.round((unlockedCount / totalCount) * 100)

  const displayedBadges = useMemo(() => {
    if (badgeFilter === 'unlocked') return badges.filter((b) => b.isUnlocked)
    if (badgeFilter === 'locked') return badges.filter((b) => !b.isUnlocked)
    return badges
  }, [badges, badgeFilter])

  const selectedBadge = useMemo(() => {
    return badges.find((b) => b.id === selectedBadgeId) || null
  }, [badges, selectedBadgeId])

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in max-w-5xl mx-auto pb-10">
      {/* Top Banner with Leaf Accent */}
      <div className="relative overflow-hidden rounded-3xl bg-[#FAF7F0] dark:bg-[#0D1814] border border-[#E8E2D5] dark:border-[#1E2E27] p-6 sm:p-8 shadow-xs transition-colors">
        <div className="absolute -top-3 -right-3 w-40 pointer-events-none opacity-80 dark:opacity-30 select-none hidden sm:block">
          <img src="/botanical/leaf-1.png" alt="" className="w-full h-auto object-contain transform rotate-180" />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-[#DFEACF] dark:bg-[#253A1D] text-[#435824] dark:text-[#B6DB8A] border border-[#CCD8B8] dark:border-[#385926] inline-flex items-center gap-1.5 shadow-2xs">
              <FontAwesomeIcon icon={faAward} className="w-3.5 h-3.5 text-[#5A732E] dark:text-[#A8D968]" />
              <span>Milestones & Mastery</span>
            </span>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-serif font-bold text-[#1D2516] dark:text-[#F5F2EB] tracking-tight">
              Badges & Achievements
            </h1>
            <p className="text-sm text-[#556244] dark:text-[#A8BCA0] font-medium leading-relaxed">
              Honoring your consistency, streaks, and healthy daily habits. Badges unlock automatically as you log routines and conquer your goals.
            </p>
          </div>

          {/* Quick Progress Dial / Bar */}
          <div className="bg-white/90 dark:bg-[#101B16] border border-[#E3DDCF] dark:border-[#1E2E27] rounded-2xl p-4 sm:p-5 flex flex-col gap-2 w-full md:w-auto md:min-w-[220px] shadow-2xs transition-colors">
            <div className="flex items-center justify-between text-xs font-bold text-[#1D2516] dark:text-[#F5F2EB]">
              <span>Overall Progress</span>
              <span className="text-[#556E2B] dark:text-[#A8D968] tabular-nums">{completionPct}%</span>
            </div>
            <div className="w-full h-2.5 bg-[#EAE4D5] dark:bg-[#16241D] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#738541] dark:bg-[#4E6826] rounded-full transition-all duration-500 ease-out"
                style={{ width: `${completionPct}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] font-semibold text-[#6F6759] dark:text-[#A8BCA0] pt-0.5">
              <span>{unlockedCount} Unlocked</span>
              <span>{totalCount - unlockedCount} Locked</span>
            </div>
          </div>
        </div>
      </div>

      {/* Selected Badge Spotlight Banner (if user clicked a badge) */}
      {selectedBadge && (
        <div className="bg-[#FAF8F3] dark:bg-[#0E1714] border-2 border-[#738541]/40 dark:border-[#4E6826]/60 rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row items-center gap-5 relative animate-fade-in transition-colors">
          <BadgeMedallion badge={selectedBadge} size={76} />
          <div className="flex-1 text-center sm:text-left">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-1">
              <h3 className="font-serif font-bold text-lg text-[#1D2516] dark:text-[#F5F2EB]">
                {selectedBadge.title}
              </h3>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-white dark:bg-[#1A2821] border border-[#DDD5C5] dark:border-[#24362B] text-[#4E5642] dark:text-[#B6DB8A]">
                {selectedBadge.tierLabel}
              </span>
              {selectedBadge.isUnlocked ? (
                <span className="inline-flex items-center gap-1 text-xs font-bold text-[#556E2B] dark:text-[#A8D968]">
                  <FontAwesomeIcon icon={faCheckCircle} className="text-xs" />
                  <span>Unlocked {selectedBadge.unlockedDate}</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs font-bold text-[#8A8270] dark:text-[#A8BCA0]">
                  <FontAwesomeIcon icon={faLock} className="text-xs" />
                  <span>In Progress ({selectedBadge.progress}/{selectedBadge.maxProgress})</span>
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-[#556244] dark:text-[#CBD8BF] leading-relaxed">
              {selectedBadge.desc}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setSelectedBadgeId(null)}
            className="text-xs font-semibold text-[#6F6759] dark:text-[#A8BCA0] hover:text-[#1D2516] dark:hover:text-white px-3 py-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Filter Tabs & Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-2">
          {(['all', 'unlocked', 'locked'] as const).map((filter) => {
            const isSel = badgeFilter === filter
            const count =
              filter === 'all'
                ? totalCount
                : filter === 'unlocked'
                ? unlockedCount
                : totalCount - unlockedCount

            return (
              <button
                key={filter}
                type="button"
                onClick={() => setBadgeFilter(filter)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  isSel
                    ? 'bg-[#DFEACF] dark:bg-[#3A5222] text-[#3D5220] dark:text-[#E2EBD6] border border-[#CCD8B8] dark:border-[#4E6E2E] shadow-2xs font-bold'
                    : 'bg-[#FAF8F3] dark:bg-[#121D17] text-[#6F6759] dark:text-[#A8BCA0] hover:text-[#1D2516] dark:hover:text-white hover:bg-[#F2ECE0] dark:hover:bg-[#1A2A20] border border-transparent dark:border-[#1E2E25]'
                }`}
              >
                {filter === 'all' && `All (${count})`}
                {filter === 'unlocked' && `Unlocked (${count})`}
                {filter === 'locked' && `In Progress (${count})`}
              </button>
            )
          })}
        </div>

        <div className="text-xs font-semibold text-[#556244] dark:text-[#A8BCA0] inline-flex items-center gap-2">
          <FontAwesomeIcon icon={faCheckCircle} className="text-[#556E2B] dark:text-[#A8D968]" />
          <span>
            <strong className="text-[#1D2516] dark:text-[#F5F2EB]">{unlockedCount}</strong> of {totalCount} Badges Unlocked
          </span>
        </div>
      </div>

      {/* Badges Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
        {displayedBadges.map((badge) => (
          <BadgeCard
            key={badge.id}
            badge={badge}
            selected={selectedBadgeId === badge.id}
            onClick={() => setSelectedBadgeId(badge.id === selectedBadgeId ? null : badge.id)}
          />
        ))}
      </div>
    </div>
  )
}
