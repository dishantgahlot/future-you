import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faLock, faCheck } from '@fortawesome/free-solid-svg-icons'
import type { AchievementBadge } from '../../utils/achievementBadges'

export interface BadgeItemProps {
  badge: AchievementBadge
  onClick?: () => void
  selected?: boolean
}

/**
 * 3D octagonal achievement badge medallion
 */
export function BadgeMedallion({
  badge,
  size = 64,
}: {
  badge: AchievementBadge
  size?: number
}) {
  const { colors, isUnlocked, icon, multiplier } = badge

  if (!isUnlocked) {
    return (
      <div
        className="relative flex items-center justify-center flex-shrink-0 select-none"
        style={{ width: size, height: size }}
      >
        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-2xs">
          {/* Locked Octagon Base */}
          <polygon
            points="30,5 70,5 95,30 95,70 70,95 30,95 5,70 5,30"
            className="fill-[#EFE9DE] dark:fill-[#142019] stroke-[#D5CDBC] dark:stroke-[#243528]"
            strokeWidth="3"
            strokeDasharray="4 3"
          />
          <polygon
            points="32,10 68,10 90,32 90,68 68,90 32,90 10,68 10,32"
            className="fill-[#E4DDCF] dark:fill-[#18261E]"
            opacity="0.6"
          />
        </svg>

        {/* Locked Center Icon with Lock */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-[#9A9382] dark:text-[#7A8E76]">
          <FontAwesomeIcon icon={icon} className="text-sm opacity-40 dark:opacity-50" />
          <FontAwesomeIcon icon={faLock} className="text-[10px] mt-0.5 text-[#887F6E] dark:text-[#8FA58A]" />
        </div>
      </div>
    )
  }

  return (
    <div
      className="relative flex items-center justify-center flex-shrink-0 select-none group"
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_4px_10px_rgba(30,40,20,0.14)]">
        <defs>
          <linearGradient id={`outer-ring-${badge.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={colors.innerHighlight} />
            <stop offset="50%" stopColor={colors.outerRing} />
            <stop offset="100%" stopColor={colors.accent} />
          </linearGradient>

          <radialGradient id={`bg-radial-${badge.id}`} cx="50%" cy="40%" r="55%">
            <stop offset="0%" stopColor={colors.bgGradient[0]} />
            <stop offset="100%" stopColor={colors.bgGradient[1]} />
          </radialGradient>
        </defs>

        {/* Outer Beveled Octagon Ring */}
        <polygon
          points="30,4 70,4 96,30 96,70 70,96 30,96 4,70 4,30"
          fill={`url(#outer-ring-${badge.id})`}
        />

        {/* Inner Octagon Plate */}
        <polygon
          points="32,9 68,9 91,32 91,68 68,91 32,91 9,68 9,32"
          fill={`url(#bg-radial-${badge.id})`}
          stroke={colors.innerHighlight}
          strokeWidth="1.5"
        />

        {/* Subtle Inner Contour Line */}
        <polygon
          points="34,14 66,14 86,34 86,66 66,86 34,86 14,66 14,34"
          fill="none"
          stroke={colors.outerRing}
          strokeWidth="0.8"
          opacity="0.45"
        />
      </svg>

      {/* Centered Main Vector Icon */}
      <div
        className="absolute inset-0 flex items-center justify-center"
        style={{ color: colors.text }}
      >
        <FontAwesomeIcon
          icon={icon}
          className="text-lg filter drop-shadow-[0_1px_2px_rgba(0,0,0,0.15)] group-hover:scale-110 transition-transform"
        />
      </div>

      {/* Multiplier / Tier Pill */}
      {multiplier && (
        <span
          className="absolute -top-1 -right-1 px-1.5 py-0.2 rounded-full text-[9px] font-black tracking-tight text-white shadow-2xs border border-white/60"
          style={{ backgroundColor: colors.outerRing }}
        >
          {multiplier}
        </span>
      )}
    </div>
  )
}

/**
 * Backward compatibility alias
 */
export const GitHubBadgeMedallion = BadgeMedallion

/**
 * Achievement Badge Card (with description, tier, progress, and unlock date)
 */
export function BadgeCard({
  badge,
  onClick,
  selected,
}: BadgeItemProps) {
  const pct = Math.round((badge.progress / badge.maxProgress) * 100)

  return (
    <div
      onClick={onClick}
      className={`rounded-2xl sm:rounded-3xl border p-4 sm:p-4.5 transition-all flex items-start gap-3.5 select-none ${
        onClick ? 'cursor-pointer' : ''
      } ${
        badge.isUnlocked
          ? selected
            ? 'bg-[#FDFBF7] dark:bg-[#16271A] border-[#738541] dark:border-[#4E6826] shadow-md ring-2 ring-[#738541]/30 dark:ring-[#4E6826]/40'
            : 'bg-[#FAF8F3] hover:bg-white dark:bg-[#0E1714] dark:hover:bg-[#131F1B] border-[#E8E2D5] hover:border-[#CCD8B8] dark:border-[#1E2E27] dark:hover:border-[#2D4235] shadow-xs'
          : selected
          ? 'bg-[#EDE7DC] dark:bg-[#121E17] border-[#B8AF9C] dark:border-[#2A3E2D] shadow-xs ring-1 ring-[#738541]/20'
          : 'bg-[#F4F1E8] dark:bg-[#0B130F] border-[#E0D8CA] dark:border-[#18241D] hover:border-[#CCC3B2] dark:hover:border-[#243528]'
      }`}
    >
      {/* Medallion */}
      <BadgeMedallion badge={badge} size={58} />

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1.5 mb-0.5">
          <div className="flex items-center gap-1.5 min-w-0">
            <h4
              className={`font-serif font-bold text-sm sm:text-base truncate ${
                badge.isUnlocked
                  ? 'text-[#1D2516] dark:text-[#F5F2EB]'
                  : 'text-[#3E4833] dark:text-[#C5D4BF]'
              }`}
            >
              {badge.title}
            </h4>
            <span
              className={`px-1.5 py-0.2 rounded-md text-[10px] font-bold uppercase tracking-wider flex-shrink-0 ${
                badge.isUnlocked
                  ? 'bg-white dark:bg-[#1A2821] border border-[#DDD5C5] dark:border-[#24362B] text-[#4E5642] dark:text-[#B6DB8A]'
                  : 'bg-[#E3DCCE] dark:bg-[#142019] text-[#6E6756] dark:text-[#889B82] border border-transparent dark:border-[#1E2C22]'
              }`}
            >
              {badge.tierLabel}
            </span>
          </div>

          {badge.isUnlocked ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#556E2B] dark:text-[#A8D968] flex-shrink-0">
              <FontAwesomeIcon icon={faCheck} className="text-[10px]" />
              <span className="hidden sm:inline">Earned</span>
            </span>
          ) : (
            <span className="text-[11px] font-semibold text-[#7A7260] dark:text-[#8FA58A] tabular-nums flex-shrink-0">
              {badge.progress} / {badge.maxProgress}
            </span>
          )}
        </div>

        <p
          className={`text-xs leading-relaxed line-clamp-2 ${
            badge.isUnlocked
              ? 'text-[#556244] dark:text-[#A8BCA0]'
              : 'text-[#616B54] dark:text-[#8FA58A]'
          }`}
        >
          {badge.desc}
        </p>

        {/* Footer: Date or Progress Bar */}
        <div className="mt-2.5">
          {badge.isUnlocked ? (
            <span className="text-[10px] font-semibold text-[#738541] dark:text-[#A8D968] inline-flex items-center gap-1">
              <span>Unlocked {badge.unlockedDate}</span>
            </span>
          ) : (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[10px] text-[#7A7260] dark:text-[#8FA58A]">
                <span>Progress</span>
                <span className="font-bold text-[#3E4833] dark:text-[#C5D4BF]">{pct}%</span>
              </div>
              <div className="w-full h-1.5 bg-[#E0D8C8] dark:bg-[#131D17] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#738541] dark:bg-[#4E6826] rounded-full transition-all duration-300"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * Backward compatibility alias
 */
export const GitHubBadgeCard = BadgeCard
