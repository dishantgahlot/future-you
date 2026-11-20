import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { supabase } from '../services/supabase'
import { useAuth } from './AuthContext'

export interface LoginRecord {
  id: string
  date: string
  timestamp: number
  device: string
  method: string
  status: 'Active' | 'Logged In'
}

export interface UserProfileContextType {
  fullName: string
  email: string
  avatarUrl: string
  avatarStyle: string
  avatarSeed: string
  lastLoginDate: string
  loginHistory: LoginRecord[]
  updateProfile: (data: Partial<{ fullName: string; email: string }>) => Promise<void> | void
  updateAvatar: (url: string, style?: string, seed?: string) => Promise<void> | void
  recordNewLogin: (method?: string) => void
}

const DEFAULT_AVATAR = 'https://api.dicebear.com/9.x/adventurer/svg?seed=Dishant'

const UserProfileContext = createContext<UserProfileContextType | undefined>(undefined)

const AVATAR_KEY = 'future_you_avatar_url'
const AVATAR_STYLE_KEY = 'future_you_avatar_style'
const AVATAR_SEED_KEY = 'future_you_avatar_seed'
const PROFILE_KEY = 'future_you_user_profile'
const LOGIN_HISTORY_KEY = 'future_you_login_history'

export function UserProfileProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()

  const [fullName, setFullName] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(PROFILE_KEY)
      if (saved) return JSON.parse(saved).fullName || 'Friend'
    } catch {}
    return 'Friend'
  })

  const [email, setEmail] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(PROFILE_KEY)
      if (saved) return JSON.parse(saved).email || 'user@futureyou.ai'
    } catch {}
    return 'user@futureyou.ai'
  })

  const [avatarUrl, setAvatarUrl] = useState<string>(() => {
    const saved = localStorage.getItem(AVATAR_KEY)
    return saved || DEFAULT_AVATAR
  })

  const [avatarStyle, setAvatarStyle] = useState<string>(() => {
    return localStorage.getItem(AVATAR_STYLE_KEY) || 'adventurer'
  })

  const [avatarSeed, setAvatarSeed] = useState<string>(() => {
    return localStorage.getItem(AVATAR_SEED_KEY) || 'Nature'
  })

  const [loginHistory, setLoginHistory] = useState<LoginRecord[]>(() => {
    try {
      const raw = localStorage.getItem(LOGIN_HISTORY_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed) && parsed.length > 0) return parsed
      }
    } catch {}

    const now = new Date()
    const yesterday = new Date(Date.now() - 86400000)
    const twoDaysAgo = new Date(Date.now() - 86400000 * 2)

    const initialLogins: LoginRecord[] = [
      {
        id: 'log-1',
        date: now.toLocaleString('en-US', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
        timestamp: now.getTime(),
        device: 'Web Desktop (Chrome)',
        method: 'Supabase Authentication',
        status: 'Active',
      },
      {
        id: 'log-2',
        date: yesterday.toLocaleString('en-US', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
        timestamp: yesterday.getTime(),
        device: 'Web Desktop (Chrome)',
        method: 'Token Verification',
        status: 'Logged In',
      },
      {
        id: 'log-3',
        date: twoDaysAgo.toLocaleString('en-US', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
        timestamp: twoDaysAgo.getTime(),
        device: 'Mobile Safari',
        method: 'Session Token',
        status: 'Logged In',
      },
    ]

    localStorage.setItem(LOGIN_HISTORY_KEY, JSON.stringify(initialLogins))
    return initialLogins
  })

  // Synchronize profile data with Supabase user on auth change
  useEffect(() => {
    if (!user) return

    if (user.id === 'demo-user-1') {
      setFullName('Alex Rivera')
      setEmail('alex@futureyou.app')
      return
    }

    const loadProfileFromDB = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle()

        if (data && !error) {
          if (data.full_name) {
            setFullName(data.full_name)
          } else if (user.user_metadata?.full_name) {
            setFullName(user.user_metadata.full_name)
          }
          if (data.email) {
            setEmail(data.email)
          } else if (user.email) {
            setEmail(user.email)
          }
          if (data.avatar_url) {
            setAvatarUrl(data.avatar_url)
            localStorage.setItem(AVATAR_KEY, data.avatar_url)
          }
          const prefs = data.preferences || {}
          if (prefs.avatar_style) {
            setAvatarStyle(prefs.avatar_style)
            localStorage.setItem(AVATAR_STYLE_KEY, prefs.avatar_style)
          }
          if (prefs.avatar_seed) {
            setAvatarSeed(prefs.avatar_seed)
            localStorage.setItem(AVATAR_SEED_KEY, prefs.avatar_seed)
          }
          if (Array.isArray(prefs.login_history) && prefs.login_history.length > 0) {
            setLoginHistory(prefs.login_history)
            localStorage.setItem(LOGIN_HISTORY_KEY, JSON.stringify(prefs.login_history))
          }
        } else {
          // If no profile found, use user metadata and create row
          const resolvedName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'User'
          setFullName(resolvedName)
          if (user.email) setEmail(user.email)
          
          await supabase.from('profiles').upsert({
            id: user.id,
            email: user.email || '',
            full_name: resolvedName,
            preferences: {
              theme: 'system',
              notifications: true,
              weekly_report: true,
              predictions: true,
              onboarding_completed: true,
            },
          })
        }
      } catch (e) {
        console.warn('Profile load from Supabase warning:', e)
      }
    }

    loadProfileFromDB()
  }, [user])

  const lastLoginDate = loginHistory.length > 0 ? loginHistory[0].date : 'Today'

  const recordNewLogin = (method = 'Web Session Login') => {
    const now = new Date()
    const newRecord: LoginRecord = {
      id: `log-${Date.now()}`,
      date: now.toLocaleString('en-US', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      timestamp: now.getTime(),
      device: typeof navigator !== 'undefined' && navigator.userAgent.includes('Mobile') ? 'Mobile Browser' : 'Web Desktop (Chrome)',
      method,
      status: 'Active',
    }

    setLoginHistory((prev) => {
      const updated = [newRecord, ...prev.slice(0, 19)]
      try {
        localStorage.setItem(LOGIN_HISTORY_KEY, JSON.stringify(updated))
      } catch {}

      if (user && user.id !== 'demo-user-1') {
        ;(async () => {
          try {
            const { data } = await supabase
              .from('profiles')
              .select('preferences')
              .eq('id', user.id)
              .maybeSingle()
            const prefs = data?.preferences || {}
            await supabase
              .from('profiles')
              .update({
                preferences: { ...prefs, login_history: updated },
                updated_at: new Date().toISOString(),
              })
              .eq('id', user.id)
          } catch {}
        })()
      }

      return updated
    })
  }

  const updateProfile = async (data: Partial<{ fullName: string; email: string }>) => {
    if (data.fullName !== undefined) setFullName(data.fullName)
    if (data.email !== undefined) setEmail(data.email)

    try {
      const current = {
        fullName: data.fullName ?? fullName,
        email: data.email ?? email,
      }
      localStorage.setItem(PROFILE_KEY, JSON.stringify(current))

      if (user && user.id !== 'demo-user-1') {
        const updates: Record<string, any> = { updated_at: new Date().toISOString() }
        if (data.fullName !== undefined) updates.full_name = data.fullName
        if (data.email !== undefined) updates.email = data.email

        await supabase.from('profiles').update(updates).eq('id', user.id)
      }
    } catch (e) {
      console.error('Error updating profile in Supabase:', e)
    }
  }

  const updateAvatar = async (url: string, style?: string, seed?: string) => {
    setAvatarUrl(url)
    try {
      localStorage.setItem(AVATAR_KEY, url)
      if (style) {
        setAvatarStyle(style)
        localStorage.setItem(AVATAR_STYLE_KEY, style)
      }
      if (seed) {
        setAvatarSeed(seed)
        localStorage.setItem(AVATAR_SEED_KEY, seed)
      }

      if (user && user.id !== 'demo-user-1') {
        const { data: profile } = await supabase
          .from('profiles')
          .select('preferences')
          .eq('id', user.id)
          .maybeSingle()
        const prefs = profile?.preferences || {}
        if (style) prefs.avatar_style = style
        if (seed) prefs.avatar_seed = seed

        await supabase
          .from('profiles')
          .update({
            avatar_url: url,
            preferences: prefs,
            updated_at: new Date().toISOString(),
          })
          .eq('id', user.id)
      }
    } catch (e) {
      console.error('Error updating avatar in Supabase:', e)
    }
  }

  return (
    <UserProfileContext.Provider
      value={{
        fullName,
        email,
        avatarUrl,
        avatarStyle,
        avatarSeed,
        lastLoginDate,
        loginHistory,
        updateProfile,
        updateAvatar,
        recordNewLogin,
      }}
    >
      {children}
    </UserProfileContext.Provider>
  )
}

export function useUserProfile() {
  const context = useContext(UserProfileContext)
  if (!context) {
    throw new Error('useUserProfile must be used within a UserProfileProvider')
  }
  return context
}
