import { useState, useEffect } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faBell, faXmark, faChevronRight } from '@fortawesome/free-solid-svg-icons'
import { useNotifications } from '../../contexts/NotificationContext'

const DISMISSED_STORAGE_KEY = 'future-you-desktop-notification-banner-dismissed-v1'

export function DesktopNotificationBanner() {
  const { browserPermission, isBrowserSupported, requestBrowserPermission } = useNotifications()
  const [isDismissed, setIsDismissed] = useState(true)

  useEffect(() => {
    try {
      const dismissedUntil = localStorage.getItem(DISMISSED_STORAGE_KEY)
      if (dismissedUntil && Number(dismissedUntil) > Date.now()) {
        setIsDismissed(true)
      } else {
        setIsDismissed(false)
      }
    } catch {
      setIsDismissed(false)
    }
  }, [])

  // Only show if supported, permission is 'default' (not yet asked), and not dismissed
  if (!isBrowserSupported || browserPermission !== 'default' || isDismissed) {
    return null
  }

  const handleDismiss = () => {
    setIsDismissed(true)
    try {
      // Dismiss for 7 days
      localStorage.setItem(DISMISSED_STORAGE_KEY, String(Date.now() + 7 * 24 * 60 * 60 * 1000))
    } catch {}
  }

  const handleEnable = async () => {
    await requestBrowserPermission()
  }

  return (
    <div className="w-full bg-[#1F3D2B] dark:bg-[#13281E] border border-[#2F523B] dark:border-[#203D2F] rounded-2xl p-3 sm:py-2.5 sm:px-4 shadow-sm flex items-center justify-between gap-3 text-white transition-all select-none mb-4">
      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
        <div className="w-8 h-8 rounded-xl bg-[#2C573E] text-[#A8D968] flex items-center justify-center text-xs flex-shrink-0 shadow-2xs">
          <FontAwesomeIcon icon={faBell} />
        </div>
        <div className="min-w-0">
          <p className="text-xs sm:text-sm font-semibold text-[#F5F2EB] leading-tight flex items-center gap-1.5 flex-wrap">
            <span>Get notified of routine check-ins on your desktop</span>
            <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded-md bg-[#2C573E] text-[#A8D968]">
              WhatsApp-Style
            </span>
          </p>
          <p className="text-[11px] text-[#A8BCA0] leading-tight mt-0.5 truncate hidden sm:block">
            Receive native OS alerts and gentle chimes even when this tab is minimized.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          type="button"
          onClick={handleEnable}
          className="px-3 sm:px-3.5 py-1.5 rounded-xl bg-[#A8D968] hover:bg-[#BCE582] text-[#142319] text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-xs active:scale-95"
        >
          <span>Turn on</span>
          <FontAwesomeIcon icon={faChevronRight} className="text-[10px]" />
        </button>
        <button
          type="button"
          onClick={handleDismiss}
          className="w-7 h-7 rounded-lg text-[#8FA387] hover:text-white hover:bg-white/10 flex items-center justify-center transition-colors cursor-pointer"
          title="Dismiss banner"
        >
          <FontAwesomeIcon icon={faXmark} className="text-xs" />
        </button>
      </div>
    </div>
  )
}
