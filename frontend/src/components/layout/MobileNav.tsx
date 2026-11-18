import { NavLink, useLocation } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faHouse,
  faSquareCheck,
  faChartSimple,
  faUser,
  faPlus,
} from '@fortawesome/free-solid-svg-icons'
import { motion } from 'framer-motion'

interface MobileNavProps {
  onOpenAddModal?: () => void
}

export function MobileNav({ onOpenAddModal }: MobileNavProps) {
  const location = useLocation()

  const navItems = [
    { name: 'Today', href: '/dashboard', icon: faHouse },
    { name: 'Habits', href: '/habits', icon: faSquareCheck },
    { name: 'Insights', href: '/insights', icon: faChartSimple },
    { name: 'Settings', href: '/profile', icon: faUser },
  ]

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-1 pointer-events-none">
      <nav className="pointer-events-auto max-w-md mx-auto bg-white/95 dark:bg-[#0D1814]/95 backdrop-blur-xl border border-[#E8E2D5] dark:border-[#223326] shadow-lg rounded-3xl px-4 py-2 flex items-center justify-between transition-colors">
        {/* Left two items */}
        {navItems.slice(0, 2).map((item) => {
          const isActive = location.pathname === item.href
          return (
            <NavLink
              key={item.name}
              to={item.href}
              className="flex flex-col items-center justify-center flex-1 py-1 relative group"
            >
              <div
                className={`p-1.5 rounded-2xl transition-all duration-300 ${
                  isActive
                    ? 'bg-[#EEF4E8] dark:bg-[#1A2D20] text-[#4A6225] dark:text-[#A8D968] scale-110'
                    : 'text-[#8A9280] dark:text-[#6E8268] group-hover:text-[#1D2516] dark:group-hover:text-[#F5F2EB]'
                }`}
              >
                <FontAwesomeIcon icon={item.icon} className="h-4 w-4" />
              </div>
              <span
                className={`text-[11px] font-medium transition-colors ${
                  isActive ? 'text-[#4A6225] dark:text-[#A8D968] font-semibold' : 'text-[#6F6759] dark:text-[#83967D]'
                }`}
              >
                {item.name}
              </span>
              {isActive && (
                <motion.div
                  layoutId="activeIndicator"
                  className="w-1.5 h-1.5 rounded-full bg-[#4A6225] dark:bg-[#A8D968] mt-0.5"
                />
              )}
            </NavLink>
          )
        })}

        {/* Center Floating Plus Button */}
        <div className="flex-1 flex justify-center -mt-6">
          <motion.button
            whileTap={{ scale: 0.9 }}
            whileHover={{ scale: 1.05 }}
            onClick={onOpenAddModal}
            className="w-12 h-12 rounded-2xl bg-[#4A6225] hover:bg-[#3D521E] dark:bg-[#4E6826] text-white flex items-center justify-center shadow-lg shadow-[#4A6225]/30 border-2 border-white dark:border-[#0D1814] transition-all cursor-pointer"
            aria-label="Add Habit"
          >
            <FontAwesomeIcon icon={faPlus} className="h-5 w-5" />
          </motion.button>
        </div>

        {/* Right two items */}
        {navItems.slice(2).map((item) => {
          const isActive = location.pathname === item.href
          return (
            <NavLink
              key={item.name}
              to={item.href}
              className="flex flex-col items-center justify-center flex-1 py-1 relative group"
            >
              <div
                className={`p-1.5 rounded-2xl transition-all duration-300 ${
                  isActive
                    ? 'bg-[#EEF4E8] dark:bg-[#1A2D20] text-[#4A6225] dark:text-[#A8D968] scale-110'
                    : 'text-[#8A9280] dark:text-[#6E8268] group-hover:text-[#1D2516] dark:group-hover:text-[#F5F2EB]'
                }`}
              >
                <FontAwesomeIcon icon={item.icon} className="h-4 w-4" />
              </div>
              <span
                className={`text-[11px] font-medium transition-colors ${
                  isActive ? 'text-[#4A6225] dark:text-[#A8D968] font-semibold' : 'text-[#6F6759] dark:text-[#83967D]'
                }`}
              >
                {item.name}
              </span>
              {isActive && (
                <motion.div
                  layoutId="activeIndicator"
                  className="w-1.5 h-1.5 rounded-full bg-[#4A6225] dark:bg-[#A8D968] mt-0.5"
                />
              )}
            </NavLink>
          )
        })}
      </nav>
    </div>
  )
}
