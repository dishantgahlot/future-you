import { motion } from 'framer-motion'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSun, faMoon } from '@fortawesome/free-solid-svg-icons'
import { useTheme } from '../../contexts/ThemeContext'

interface ThemeToggleProps {
  className?: string
  showLabel?: boolean
}

export function ThemeToggle({ className = '', showLabel = false }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`w-9 h-9 rounded-2xl bg-white/90 hover:bg-white dark:bg-[#0D1814] dark:hover:bg-[#15231C] border border-[#E8E2D5] dark:border-[#223326] text-[#2B351F] dark:text-[#E2EBD8] transition-all shadow-xs flex items-center justify-center cursor-pointer select-none group relative ${className}`}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <motion.div
        key={theme}
        initial={{ rotate: -90, scale: 0.6, opacity: 0 }}
        animate={{ rotate: 0, scale: 1, opacity: 1 }}
        exit={{ rotate: 90, scale: 0.6, opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="flex items-center justify-center"
      >
        <FontAwesomeIcon
          icon={isDark ? faSun : faMoon}
          className={`text-sm transition-colors ${
            isDark
              ? 'text-[#E5B54F] group-hover:text-[#F3C766]'
              : 'text-[#556933] group-hover:text-[#384622]'
          }`}
        />
      </motion.div>

      {showLabel && (
        <span className="text-xs font-bold capitalize ml-2">
          {isDark ? 'Light' : 'Dark'}
        </span>
      )}
    </button>
  )
}
