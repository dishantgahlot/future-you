import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Sidebar } from '../components/layout/Sidebar'
import { Header } from '../components/layout/Header'
import { MobileNav } from '../components/layout/MobileNav'
import { InAppNotificationToast } from '../components/notifications/InAppNotificationToast'
import { motion } from 'framer-motion'
import { useSidebar } from '../contexts/SidebarContext'

export function MainLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const isDashboard = location.pathname === '/dashboard'
  const { isOpen } = useSidebar()

  const handleOpenAddModal = () => {
    window.dispatchEvent(new CustomEvent('open-add-habit-modal'))
    if (location.pathname !== '/dashboard' && location.pathname !== '/habits') {
      navigate('/habits?action=add')
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-200 flex relative w-full overflow-x-hidden max-w-full">
      <Sidebar />

      <div
        className={`flex-1 min-w-0 flex flex-col min-h-screen transition-all duration-300 ease-in-out w-full overflow-x-hidden max-w-full ${
          isOpen ? 'lg:pl-60' : 'lg:pl-[68px]'
        }`}
      >
        {!isDashboard && <Header />}
        <main className={`flex-1 px-3 sm:px-5 lg:px-6 pb-32 sm:pb-28 lg:pb-10 max-w-[1600px] 2xl:max-w-[1680px] w-full mx-auto overflow-x-hidden ${isDashboard ? 'pt-2.5 sm:pt-3.5' : 'pt-2'}`}>
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <Outlet />
          </motion.div>
        </main>
        <MobileNav onOpenAddModal={handleOpenAddModal} />
      </div>

      {/* Global Floating In-App Web Notification Toast */}
      <InAppNotificationToast />
    </div>
  )
}
