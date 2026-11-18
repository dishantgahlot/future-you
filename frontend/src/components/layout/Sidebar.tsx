import { NavLink, useLocation } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faHouse,
  faSquareCheck,
  faChartSimple,
  faCompass,
  faCodeBranch,
  faBookOpen,
  faAward,
  faGear,
  faBars,
  faAnglesLeft,
  faAnglesRight,
  faRightFromBracket,
} from '@fortawesome/free-solid-svg-icons'
import { motion, AnimatePresence } from 'framer-motion'
import { useSidebar } from '../../contexts/SidebarContext'
import { useUserProfile } from '../../contexts/UserProfileContext'
import { useAuth } from '../../contexts/AuthContext'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: faHouse },
  { name: 'Habits', href: '/habits', icon: faSquareCheck },
  { name: 'Insights', href: '/insights', icon: faChartSimple },
  { name: 'Future Me', href: '/twin', icon: faCompass },
  { name: 'What-If', href: '/scenarios', icon: faCodeBranch },
  { name: 'Journal', href: '/journal', icon: faBookOpen },
  { name: 'Badges', href: '/badges', icon: faAward },
  { name: 'Settings', href: '/profile', icon: faGear },
]

export function Sidebar() {
  const location = useLocation()
  const { isOpen, isMobileOpen, closeSidebar, openSidebar, closeMobile, openMobile } = useSidebar()
  const { fullName, email, avatarUrl } = useUserProfile()
  const { signOut } = useAuth()

  const isDashboard = location.pathname === '/dashboard'

  return (
    <>
      {/* Mobile Hamburger Button (On non-dashboard pages; on dashboard it is integrated into the hero header) */}
      {!isDashboard && (
        <button
          type="button"
          className="lg:hidden fixed top-3 left-3 z-50 p-2.5 bg-white/95 dark:bg-[#0D1814] text-[#2B351F] dark:text-[#E2EBD8] rounded-2xl shadow-md border border-[#E8E2D5] dark:border-[#223326] cursor-pointer transition-colors"
          onClick={openMobile}
          aria-label="Open menu"
        >
          <FontAwesomeIcon icon={faBars} className="h-4 w-4 text-[#4A6225] dark:text-[#A8D968]" />
        </button>
      )}

      {/* Mobile Backdrop */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs lg:hidden"
            onClick={closeMobile}
          />
        )}
      </AnimatePresence>

      {/* Main Sidebar: Sleek Modern Slate & Crisp Emerald Accent */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 bg-white dark:bg-[#0C1615] border-r border-slate-200 dark:border-[#1E2E27] text-slate-800 dark:text-[#F5F2EB] transition-all duration-300 ease-in-out flex flex-col justify-between shadow-xs select-none ${
          isMobileOpen ? 'translate-x-0 w-60' : '-translate-x-full lg:translate-x-0'
        } ${
          isOpen ? 'lg:w-60' : 'lg:w-[68px]'
        }`}
      >
        {/* ========================================================
            COLLAPSED RAIL VIEW (Desktop only when !isOpen)
            ======================================================== */}
        <div
          className={`hidden ${
            !isOpen ? 'lg:flex' : ''
          } flex-col justify-between h-full py-4 px-2 w-full relative z-20`}
        >
          {/* Top: Logo & Website Name "FUTURE YOU" + Sidebar Expand Trigger */}
          <div className="flex flex-col items-center pb-2.5 border-b border-slate-200 dark:border-[#1E2E27] w-full">
            <button
              type="button"
              onClick={openSidebar}
              className="flex flex-col items-center group cursor-pointer w-full py-1 rounded-2xl hover:bg-slate-100/70 dark:hover:bg-[#15231C] transition-all relative"
              title="Future You — Expand sidebar (Ctrl+B)"
              aria-label="Future You — Expand sidebar"
            >
              {/* App Brand Icon Squircle */}
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-emerald-50 dark:bg-[#1E2F1A] text-emerald-600 dark:text-[#A8D968] shadow-2xs group-hover:bg-emerald-100 dark:group-hover:bg-[#283F23] group-hover:scale-105 transition-all">
                <img
                  src="/favicon-32x32.png"
                  alt="Future You"
                  className="w-5 h-5 object-contain group-hover:hidden transition-all"
                />
                <FontAwesomeIcon
                  icon={faAnglesRight}
                  className="w-4 h-4 hidden group-hover:block text-slate-800 dark:text-slate-100 transition-all"
                />
              </div>

              {/* Website Name "FUTURE YOU" in Collapsed Sidebar */}
              <div className="flex flex-col items-center mt-1.5 text-center leading-[1.15] select-none">
                <span className="font-serif font-bold text-[9px] tracking-wider text-slate-900 dark:text-[#F5F2EB] uppercase">
                  Future
                </span>
                <span className="font-serif font-bold text-[9px] tracking-wider text-emerald-600 dark:text-[#A8D968] uppercase">
                  You
                </span>
              </div>

              {/* Floating Tooltip to the right */}
              <span className="absolute left-full ml-3 px-3 py-1.5 bg-slate-900 dark:bg-[#16221C] text-slate-100 text-xs font-semibold rounded-xl shadow-xl border border-slate-700 dark:border-[#22352B] pointer-events-none whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all duration-150 transform -translate-x-1 group-hover:translate-x-0 z-50">
                Future You · Expand (Ctrl+B)
              </span>
            </button>
          </div>

          {/* Middle: Clean Vertical Column of Navigation Icon Buttons */}
          <nav className="pt-3 space-y-2 flex flex-col items-center flex-1" role="navigation">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href
              return (
                <NavLink
                  key={item.name}
                  to={item.href}
                  className={`group relative w-11 h-11 rounded-2xl flex items-center justify-center transition-all duration-200 cursor-pointer ${
                    isActive
                      ? 'bg-emerald-50 dark:bg-[#3A5222] text-emerald-700 dark:text-[#E2EBD6] shadow-2xs font-bold border border-emerald-200/80 dark:border-[#4E6E2E]'
                      : 'text-slate-500 dark:text-[#B2C5A9] hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-[#142019]'
                  }`}
                  title={item.name}
                  aria-label={item.name}
                >
                  <FontAwesomeIcon
                    icon={item.icon}
                    className={`h-4 w-4 transition-transform group-hover:scale-115 ${
                      isActive ? 'text-emerald-600 dark:text-[#A8D968]' : 'text-slate-400 dark:text-[#8AA182] group-hover:text-slate-700 dark:group-hover:text-[#A8D968]'
                    }`}
                  />
                  {/* Floating Tooltip on Hover */}
                  <span className="absolute left-full ml-3 px-3 py-1.5 bg-slate-900 dark:bg-[#16221C] text-slate-100 text-xs font-semibold rounded-xl shadow-xl border border-slate-700 dark:border-[#22352B] pointer-events-none whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all duration-150 transform -translate-x-1 group-hover:translate-x-0 z-50">
                    {item.name}
                  </span>
                </NavLink>
              )
            })}
          </nav>

          {/* Bottom Section in Collapsed Rail: User Profile Avatar */}
          <div className="pt-2 border-t border-slate-200 dark:border-[#1E2E27] flex flex-col items-center">
            <NavLink
              to="/profile"
              className="group relative w-10 h-10 rounded-2xl overflow-hidden border border-emerald-500/30 bg-emerald-50 dark:bg-[#1E2F1A] flex items-center justify-center hover:scale-105 transition-all shadow-2xs"
              title="Profile Settings"
              aria-label="Profile Settings"
            >
              <img
                src={avatarUrl}
                alt={fullName || 'User'}
                className="w-full h-full object-cover"
              />
              <span className="absolute left-full ml-3 px-3 py-1.5 bg-slate-900 dark:bg-[#16221C] text-slate-100 text-xs font-semibold rounded-xl shadow-xl border border-slate-700 dark:border-[#22352B] pointer-events-none whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all duration-150 transform -translate-x-1 group-hover:translate-x-0 z-50">
                {fullName || 'Profile Settings'}
              </span>
            </NavLink>
          </div>
        </div>

        {/* ========================================================
            FULL EXPANDED SIDEBAR VIEW
            ======================================================== */}
        <div
          className={`${
            !isOpen ? 'lg:hidden' : ''
          } flex flex-col justify-between h-full overflow-hidden relative z-20 w-full`}
        >
          {/* Subtle decorative sprig in background with muted opacity */}
          <div className="absolute bottom-16 -left-3 w-32 pointer-events-none opacity-15 dark:opacity-5 z-0 select-none">
            <img
              src="/botanical/leaf-2.png"
              alt=""
              className="w-full h-auto object-contain transform -rotate-12"
            />
          </div>

          {/* Top Header / Logo + Collapse Button */}
          <div className="relative z-10 p-5 pt-6">
            <div className="flex items-center justify-between">
              <NavLink
                to="/dashboard"
                onClick={closeMobile}
                className="flex items-center gap-2.5 group"
              >
                {/* App Brand Logo Icon */}
                <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-emerald-50 dark:bg-emerald-950/60 shadow-2xs group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900/60 transition-colors p-1">
                  <img src="/favicon-32x32.png" alt="Future You" className="w-full h-full object-contain" />
                </div>
                <span className="font-serif font-bold text-lg tracking-tight text-slate-900 dark:text-slate-100">
                  FUTURE YOU
                </span>
              </NavLink>

              {/* Collapse Sidebar Button */}
              <button
                type="button"
                onClick={() => {
                  closeSidebar()
                  closeMobile()
                }}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors cursor-pointer"
                title="Collapse sidebar (Ctrl+B)"
                aria-label="Collapse sidebar"
              >
                <FontAwesomeIcon icon={faAnglesLeft} className="w-4 h-4" />
              </button>
            </div>

            {/* Navigation Links with Icon + Label */}
            <nav className="mt-6 space-y-1" role="navigation">
              {navigation.map((item) => {
                const isActive = location.pathname === item.href
                return (
                  <NavLink
                    key={item.name}
                    to={item.href}
                    onClick={closeMobile}
                    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs sm:text-sm font-semibold transition-all duration-200 ${
                      isActive
                        ? 'bg-emerald-50 dark:bg-[#3A5222] text-emerald-800 dark:text-[#E2EBD6] shadow-2xs font-bold border border-emerald-200/80 dark:border-[#4E6E2E]'
                        : 'text-slate-600 dark:text-[#B2C5A9] hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-[#142019]'
                    }`}
                  >
                    <FontAwesomeIcon
                      icon={item.icon}
                      className={`h-4 w-4 flex-shrink-0 ${
                        isActive ? 'text-emerald-600 dark:text-[#A8D968]' : 'text-slate-400 dark:text-[#8AA182] group-hover:text-slate-700 dark:group-hover:text-[#A8D968]'
                      }`}
                    />
                    <span className="leading-tight">{item.name}</span>
                  </NavLink>
                )
              })}
            </nav>
          </div>

          {/* Bottom Section: Quote Card + User Profile Bar */}
          <div className="relative z-10 p-3.5 space-y-2.5">
            {/* Quote Card */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#0E1714] border border-slate-200 dark:border-[#1E2E27] shadow-2xs">
              <p className="font-serif italic text-xs text-slate-600 dark:text-[#C5D6BF] leading-relaxed">
                "A better tomorrow is the sum of today's small choices."
              </p>
            </div>

            {/* User Profile & Sign Out Bar */}
            <div className="p-2 px-2.5 rounded-2xl bg-slate-50 dark:bg-[#0E1714] border border-slate-200 dark:border-[#1E2E27] flex items-center justify-between gap-2 shadow-2xs">
              <NavLink
                to="/profile"
                onClick={closeMobile}
                className="flex items-center gap-2 min-w-0 flex-1 hover:opacity-90 transition-opacity"
                title="View Profile Settings"
              >
                <div className="w-7 h-7 rounded-full overflow-hidden border border-emerald-500/30 bg-emerald-50 dark:bg-[#1E2F1A] flex-shrink-0">
                  <img
                    src={avatarUrl}
                    alt={fullName || 'User'}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-900 dark:text-white truncate leading-tight">
                    {fullName || 'Member'}
                  </p>
                  <p className="text-[10px] text-slate-500 dark:text-[#A8BCA0] truncate leading-tight">
                    {email || 'Member'}
                  </p>
                </div>
              </NavLink>

              <button
                type="button"
                onClick={async () => {
                  await signOut()
                  closeMobile()
                }}
                className="p-1.5 rounded-xl hover:bg-rose-500/15 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer flex-shrink-0"
                title="Sign Out"
                aria-label="Sign Out"
              >
                <FontAwesomeIcon icon={faRightFromBracket} className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}
