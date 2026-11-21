import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { supabase } from '../services/supabase'
import { API_BASE } from '../services/api'
import { syncUserData } from '../services/dataSync'
import type { User } from '@supabase/supabase-js'

interface AuthContextType {
  user: User | null
  loading: boolean
  onboardingCompleted: boolean
  checkingOnboarding: boolean
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: Error | null }>
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signInAsGuest: () => void
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<{ error: Error | null }>
  resendConfirmationEmail: (email: string) => Promise<{ error: Error | null }>
  checkOnboarding: () => Promise<void>
  setOnboardingCompleted: (completed: boolean) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [onboardingCompleted, setOnboardingCompleted] = useState(false)
  const [checkingOnboarding, setCheckingOnboarding] = useState(false)

  const checkOnboarding = useCallback(async () => {
    if (!user) return

    // If local storage already says onboarded for this user, resolve immediately
    if (localStorage.getItem(`future_you_onboarded_${user.id}`) === 'true') {
      setOnboardingCompleted(true)
      return
    }

    setCheckingOnboarding(true)
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('preferences')
        .eq('id', user.id)
        .single()

      if (error) {
        setOnboardingCompleted(true)
      } else {
        const completed = data?.preferences?.onboarding_completed ?? true
        setOnboardingCompleted(completed)
        if (completed) {
          localStorage.setItem(`future_you_onboarded_${user.id}`, 'true')
        }
      }
    } catch (error) {
      setOnboardingCompleted(true)
    } finally {
      setCheckingOnboarding(false)
    }
  }, [user])

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        localStorage.setItem('future_you_active_user_id', session.user.id)
        localStorage.setItem(`future_you_onboarded_${session.user.id}`, 'true')
        setUser(session.user)
        setOnboardingCompleted(true)
        try {
          await syncUserData(session.user.id)
        } catch {}
      } else {
        const savedActive = localStorage.getItem('future_you_active_user')
        const savedDemo = localStorage.getItem('future_you_demo_user')
        if (savedActive) {
          try {
            const parsed = JSON.parse(savedActive)
            if (parsed?.id) localStorage.setItem('future_you_active_user_id', parsed.id)
            setUser(parsed)
          } catch {
            setUser(null)
          }
        } else if (savedDemo) {
          try {
            const parsed = JSON.parse(savedDemo)
            if (parsed?.id) localStorage.setItem('future_you_active_user_id', parsed.id)
            setUser(parsed)
            setOnboardingCompleted(true)
          } catch {
            setUser(null)
          }
        } else {
          setUser(null)
        }
      }
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      // If Supabase sends a password recovery event or the URL has a recovery hash, route to /reset-password
      const isRecovery =
        event === 'PASSWORD_RECOVERY' ||
        (typeof window !== 'undefined' &&
          (window.location.hash.includes('type=recovery') ||
            window.location.search.includes('type=recovery')))

      if (isRecovery && typeof window !== 'undefined' && !window.location.pathname.startsWith('/reset-password')) {
        window.location.replace('/reset-password' + window.location.hash + window.location.search)
        return
      }

      if (session?.user) {
        localStorage.setItem('future_you_active_user_id', session.user.id)
        localStorage.setItem(`future_you_onboarded_${session.user.id}`, 'true')
        setUser(session.user)
        setOnboardingCompleted(true)
        try {
          await syncUserData(session.user.id)
        } catch {}
      } else {
        localStorage.removeItem('future_you_active_user_id')
        setUser(null)
      }
      window.dispatchEvent(new CustomEvent('future-you-storage-updated'))
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  // Check onboarding when user changes
  useEffect(() => {
    if (user) {
      checkOnboarding()
    } else {
      setOnboardingCompleted(false)
    }
  }, [user, checkOnboarding])

  const signUp = async (email: string, password: string, fullName?: string) => {
    const trimmedEmail = email.trim()
    const cleanName = fullName?.trim() || trimmedEmail.split('@')[0]

    let createdUserId: string | null = null

    // 1. Try our backend signup API first (auto-confirms email so user can sign in)
    try {
      const response = await fetch(`${API_BASE}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: trimmedEmail,
          password,
          full_name: cleanName,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        if (data?.user?.id) {
          createdUserId = data.user.id
        }
      }
    } catch (apiErr) {
      console.warn('Backend signup API call failed, falling back to direct Supabase:', apiErr)
    }

    // 2. Direct Supabase Client SignUp fallback
    if (!createdUserId) {
      const { data, error } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
        options: {
          data: {
            full_name: cleanName,
          },
        },
      })

      if (error) {
        return { error: new Error(error.message) }
      }

      if (data?.user) {
        createdUserId = data.user.id

        // Auto-confirm via backend endpoint so user can log in without email lock
        try {
          await fetch(`${API_BASE}/auth/confirm-user`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: trimmedEmail }),
          })
        } catch (confirmErr) {
          console.warn('Auto-confirm attempt failed:', confirmErr)
        }
      }
    }

    if (createdUserId) {
      try {
        await supabase.from('profiles').upsert({
          id: createdUserId,
          email: trimmedEmail,
          full_name: cleanName,
          preferences: {
            theme: 'system',
            notifications: true,
            weekly_report: true,
            predictions: true,
            onboarding_completed: false,
          },
        })
      } catch (upsertErr) {
        console.warn('Profile upsert warning:', upsertErr)
      }
    }

    // Explicitly do NOT log in after creating account.
    // Clear any active session so user is redirected to sign in manually.
    try {
      await supabase.auth.signOut()
    } catch {
      // ignore
    }
    setUser(null)
    localStorage.removeItem('future_you_active_user')
    localStorage.removeItem('future_you_demo_user')
    setOnboardingCompleted(false)

    return { error: null }
  }

  const signIn = async (email: string, password: string) => {
    const trimmedEmail = email.trim()
    let { data, error } = await supabase.auth.signInWithPassword({ email: trimmedEmail, password })

    // Auto-heal unconfirmed email if encountered
    if (error && error.message?.toLowerCase().includes('email not confirmed')) {
      try {
        const confirmRes = await fetch(`${API_BASE}/auth/confirm-user`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: trimmedEmail }),
        })
        if (confirmRes.ok) {
          const retry = await supabase.auth.signInWithPassword({ email: trimmedEmail, password })
          if (!retry.error && retry.data?.user) {
            data = retry.data
            error = null
          }
        }
      } catch (confirmErr) {
        console.warn('Auto-confirm attempt failed on sign in:', confirmErr)
      }
    }

    if (!error && data?.user) {
      // Existing user signing in - set user immediately and mark onboarding completed
      setUser(data.user)
      setOnboardingCompleted(true)
      localStorage.setItem(`future_you_onboarded_${data.user.id}`, 'true')
      localStorage.setItem('future_you_active_user_id', data.user.id)
      try {
        await syncUserData(data.user.id)
      } catch (syncErr) {
        console.warn('Sign-in sync note:', syncErr)
      }
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', data.user.id)
          .maybeSingle()
        if (!profile) {
          await supabase.from('profiles').insert({
            id: data.user.id,
            email: data.user.email || email,
            full_name: data.user.user_metadata?.full_name || email.split('@')[0],
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
        console.warn('Profile sync check warning:', e)
      }
    }
    return { error: error ? new Error(error.message) : null }
  }

  const resendConfirmationEmail = async (email: string) => {
    const trimmedEmail = email.trim()
    try {
      const confirmRes = await fetch(`${API_BASE}/auth/confirm-user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmedEmail }),
      })
      if (confirmRes.ok) {
        return { error: null }
      }
    } catch {
      // Fallback to Supabase resend
    }

    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: trimmedEmail,
    })
    return { error: error ? new Error(error.message) : null }
  }

  const signInAsGuest = () => {
    const demoUser = {
      id: 'demo-user-1',
      app_metadata: {},
      user_metadata: { full_name: 'Alex Rivera' },
      aud: 'authenticated',
      created_at: new Date().toISOString(),
      email: 'alex@futureyou.app',
    } as unknown as User
    localStorage.setItem('future_you_demo_user', JSON.stringify(demoUser))
    localStorage.setItem('future_you_active_user_id', demoUser.id)
    setUser(demoUser)
    setOnboardingCompleted(true)
    window.dispatchEvent(new CustomEvent('future-you-storage-updated'))
  }

  const signOut = async () => {
    localStorage.removeItem('future_you_demo_user')
    localStorage.removeItem('future_you_active_user')
    localStorage.removeItem('future_you_active_user_id')
    try {
      await supabase.auth.signOut()
    } catch (e) {
      console.error(e)
    }
    setUser(null)
    setOnboardingCompleted(false)
    window.dispatchEvent(new CustomEvent('future-you-storage-updated'))
  }

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    return { error: error ? new Error(error.message) : null }
  }

  const setOnboardingCompletedState = (completed: boolean) => {
    setOnboardingCompleted(completed)
  }

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      onboardingCompleted,
      checkingOnboarding,
      signUp,
      signIn,
      signInAsGuest,
      signOut,
      resetPassword,
      resendConfirmationEmail,
      checkOnboarding,
      setOnboardingCompleted: setOnboardingCompletedState
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
