import { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faSliders,
  faUser,
  faEnvelope,
  faCheck,
  faCircleCheck,
  faBell,
  faDesktop,
} from '@fortawesome/free-solid-svg-icons'
import { useUserProfile } from '../contexts/UserProfileContext'
import { useNotifications } from '../contexts/NotificationContext'
import { saveLocalHabits } from '../utils/habitStorage'
import { AvatarPickerSection } from '../components/profile/AvatarPickerSection'

export function Profile() {
  const {
    fullName,
    email,
    updateProfile,
  } = useUserProfile()

  const {
    browserPermission,
    isBrowserPermissionGranted,
    requestBrowserPermission,
    testDesktopNotification,
  } = useNotifications()

  const [nameInput, setNameInput] = useState(fullName)
  const [statusMsg, setStatusMsg] = useState<string | null>(null)
  const [resetConfirm, setResetConfirm] = useState(false)

  const showNotification = (msg: string) => {
    setStatusMsg(msg)
    setTimeout(() => setStatusMsg(null), 3000)
  }

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault()
    if (!nameInput.trim()) return
    updateProfile({ fullName: nameInput.trim() })
    showNotification('Profile updated successfully.')
  }

  const handleResetHabits = () => {
    saveLocalHabits([])
    setResetConfirm(false)
    showNotification('Habits cleared. You can now add your own habits fresh.')
  }

  return (
    <div className="space-y-5 max-w-4xl mx-auto pb-8">
      {/* 1. Header Card */}
      <div className="bg-white/95 dark:bg-[#0D1814] rounded-3xl border border-[#E8E2D5] dark:border-[#223326] p-5 sm:p-6 shadow-[0_2px_12px_rgba(29,37,22,0.03)] flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#EAEFE2] dark:bg-[#1D2D23] text-[#4E6228] dark:text-[#B6CDB0] text-xs font-semibold uppercase tracking-wider mb-2">
            <FontAwesomeIcon icon={faSliders} className="w-3 h-3 text-[#738541] dark:text-[#9EB868]" />
            <span>Preferences</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#1D2516] dark:text-[#F5F2EB] tracking-tight">
            Settings & Profile
          </h1>
          <p className="text-xs sm:text-sm text-[#4E5642] dark:text-[#9BAF90] mt-1">
            Customize your avatar character and manage your personal details.
          </p>
        </div>

        {statusMsg && (
          <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#EAEFE2] dark:bg-[#1D2D23] border border-[#CCD8B8] dark:border-[#2E4334] text-xs font-semibold text-[#4E6228] dark:text-[#B6CDB0] animate-fade-in">
            <FontAwesomeIcon icon={faCircleCheck} className="w-3.5 h-3.5 text-[#738541] dark:text-[#9EB868]" />
            <span>{statusMsg}</span>
          </div>
        )}
      </div>

      {/* 2. Interactive "Pick Your Avatar" Section */}
      <AvatarPickerSection />

      {/* 3. Personal Identity Details Card */}
      <div className="bg-white/95 dark:bg-[#0D1814] rounded-3xl border border-[#E8E2D5] dark:border-[#223326] p-5 sm:p-6 shadow-[0_2px_12px_rgba(29,37,22,0.03)] space-y-4 transition-colors">
        <div>
          <h2 className="font-serif font-bold text-lg text-[#1D2516] dark:text-[#F5F2EB]">
            Personal Identity
          </h2>
          <p className="text-xs text-[#4E5642] dark:text-[#9BAF90] mt-0.5">
            Your display name is used for personal greetings across the dashboard.
          </p>
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-3.5 pt-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#738541] dark:text-[#9EB868] mb-1.5">
                Display Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#8A9280] dark:text-[#6E8268]">
                  <FontAwesomeIcon icon={faUser} className="w-3.5 h-3.5" />
                </div>
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="Your Name"
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-[#F6F3EB]/60 dark:bg-[#15231C] border border-[#E8E2D5] dark:border-[#223326] text-sm text-[#1D2516] dark:text-[#F5F2EB] font-medium placeholder-[#8A9280] dark:placeholder-[#6E8268] focus:outline-none focus:border-[#738541] dark:focus:border-[#4E6826] transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#738541] dark:text-[#9EB868] mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#8A9280] dark:text-[#6E8268]">
                  <FontAwesomeIcon icon={faEnvelope} className="w-3.5 h-3.5" />
                </div>
                <input
                  type="email"
                  value={email}
                  disabled
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-[#F6F3EB]/30 dark:bg-[#101915] border border-[#E8E2D5] dark:border-[#223326] text-sm text-[#8A9280] dark:text-[#6E8268] font-medium cursor-not-allowed"
                />
              </div>
            </div>
          </div>

          <div className="pt-1 flex justify-end">
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#738541] hover:bg-[#5E6D34] dark:bg-[#4E6826] dark:hover:bg-[#41581F] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <FontAwesomeIcon icon={faCheck} className="w-3 h-3" />
              <span>Save Changes</span>
            </button>
          </div>
        </form>
      </div>

      {/* 4. Desktop Notifications (WhatsApp-Style) Section */}
      <div className="bg-white/95 dark:bg-[#0D1814] rounded-3xl border border-[#E8E2D5] dark:border-[#223326] p-5 sm:p-6 shadow-[0_2px_12px_rgba(29,37,22,0.03)] space-y-4 transition-colors">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-serif font-bold text-lg text-[#1D2516] dark:text-[#F5F2EB]">
                Desktop Notifications
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#EAEFE2] dark:bg-[#1D2D23] text-[#4E6228] dark:text-[#A8D968]">
                WhatsApp-Style
              </span>
            </div>
            <p className="text-xs text-[#4E5642] dark:text-[#9BAF90] mt-0.5">
              Receive native operating system alerts and gentle chimes when habits are completed or during hourly routine check-ins.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {isBrowserPermissionGranted ? (
              <button
                type="button"
                onClick={testDesktopNotification}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#738541] hover:bg-[#5E6D34] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer active:scale-95"
              >
                <FontAwesomeIcon icon={faBell} className="w-3 h-3" />
                <span>Send Test Desktop Alert</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={requestBrowserPermission}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#738541] hover:bg-[#5E6D34] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer active:scale-95"
              >
                <FontAwesomeIcon icon={faDesktop} className="w-3 h-3" />
                <span>Enable Desktop Notifications</span>
              </button>
            )}
          </div>
        </div>

        <div className="p-3 rounded-2xl bg-[#F6F3EB]/60 dark:bg-[#15231C] border border-[#E8E2D5] dark:border-[#223326] flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                isBrowserPermissionGranted
                  ? 'bg-emerald-500 ring-2 ring-emerald-500/20 animate-pulse'
                  : browserPermission === 'denied'
                  ? 'bg-rose-500'
                  : 'bg-amber-400'
              }`}
            />
            <span className="font-semibold text-[#1D2516] dark:text-[#F5F2EB]">
              Status:{' '}
              {isBrowserPermissionGranted
                ? 'Active & Permitted (OS Alerts & Audio Chime)'
                : browserPermission === 'denied'
                ? 'Blocked by browser permissions (Allow in browser site settings)'
                : 'Awaiting permission (Click Enable above)'}
            </span>
          </div>

          <span className="text-[11px] text-[#8A9280] dark:text-[#8FA387] hidden sm:inline">
            Works across Windows, macOS, and Linux
          </span>
        </div>
      </div>

      {/* 5. System Preferences & Session */}
      <div className="bg-white/95 dark:bg-[#0D1814] rounded-3xl border border-[#E8E2D5] dark:border-[#223326] p-5 sm:p-6 shadow-[0_2px_12px_rgba(29,37,22,0.03)] space-y-4 transition-colors">
        <div>
          <h2 className="font-serif font-bold text-lg text-[#1D2516] dark:text-[#F5F2EB]">
            System & Data
          </h2>
          <p className="text-xs text-[#4E5642] dark:text-[#9BAF90] mt-0.5">
            Reset default habits or restore settings.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2 border-t border-[#E8E2D5] dark:border-[#223326]">
          <div>
            <div className="text-xs font-semibold text-[#1D2516] dark:text-[#F5F2EB]">
              Restore Default Habit Set
            </div>
            <div className="text-[11px] text-[#8A9280] dark:text-[#8FA387]">
              Resets your habit list back to the curated 7 core routines.
            </div>
          </div>

          {resetConfirm ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setResetConfirm(false)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-[#4E5642] dark:text-[#9BAF90] hover:bg-[#F6F3EB] dark:hover:bg-[#1D2D23] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleResetHabits}
                className="px-3 py-1.5 rounded-xl bg-[#B44C3A] hover:bg-[#993E2F] text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                Confirm Reset
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setResetConfirm(true)}
              className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl border border-[#E8E2D5] dark:border-[#223326] bg-[#FCFAF7] dark:bg-[#15231C] hover:bg-[#F6F3EB] dark:hover:bg-[#1D2D23] text-xs font-semibold text-[#4E5642] dark:text-[#E2EBD8] transition-colors cursor-pointer"
            >
              <span>Reset Habits</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
