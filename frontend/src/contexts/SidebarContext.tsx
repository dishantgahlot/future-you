import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'

interface SidebarContextType {
  isOpen: boolean
  isMobileOpen: boolean
  toggleSidebar: () => void
  openSidebar: () => void
  closeSidebar: () => void
  openMobile: () => void
  closeMobile: () => void
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined)

const STORAGE_KEY = 'future_you_sidebar_open'

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved !== null) return saved === 'true'
    } catch {}
    return true // default open on web
  })

  const [isMobileOpen, setIsMobileOpen] = useState<boolean>(false)

  const toggleSidebar = () => {
    setIsOpen((prev) => {
      const next = !prev
      try {
        localStorage.setItem(STORAGE_KEY, String(next))
      } catch {}
      return next
    })
  }

  const openSidebar = () => {
    setIsOpen(true)
    try {
      localStorage.setItem(STORAGE_KEY, 'true')
    } catch {}
  }

  const closeSidebar = () => {
    setIsOpen(false)
    try {
      localStorage.setItem(STORAGE_KEY, 'false')
    } catch {}
  }

  const openMobile = () => setIsMobileOpen(true)
  const closeMobile = () => setIsMobileOpen(false)

  // Keyboard shortcut Ctrl+B / Cmd+B to toggle sidebar in web mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault()
        toggleSidebar()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <SidebarContext.Provider
      value={{
        isOpen,
        isMobileOpen,
        toggleSidebar,
        openSidebar,
        closeSidebar,
        openMobile,
        closeMobile,
      }}
    >
      {children}
    </SidebarContext.Provider>
  )
}

export function useSidebar() {
  const context = useContext(SidebarContext)
  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider')
  }
  return context
}
