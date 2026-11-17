import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { supabase } from '../services/supabase'
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
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user)
      } else {
        const savedDemo = localStorage.getItem('future_you_demo_user')
        if (savedDemo) {
          try {
            setUser(JSON.parse(savedDemo))
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
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user)
      }
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
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName || email.split('@')[0],
        },
      },
    })
    if (!error && data?.user) {
      setOnboardingCompleted(false)
      try {
        await supabase.from('profiles').upsert({
          id: data.user.id,
          email: data.user.email || email,
          full_name: fullName || email.split('@')[0],
          preferences: {
            theme: 'system',
            notifications: true,
            weekly_report: true,
            predictions: true,
            onboarding_completed: false, // New user needs initial setup!
          },
        })
      } catch (e) {
        console.warn('Profile upsert warning:', e)
      }
    }
    return { error: error ? new Error(error.message) : null }
  }

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (!error && data?.user) {
      // Existing user signing in - mark onboarding completed so they go straight to dashboard
      setOnboardingCompleted(true)
      localStorage.setItem(`future_you_onboarded_${data.user.id}`, 'true')
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
    setUser(demoUser)
    setOnboardingCompleted(true)
  }

  const signOut = async () => {
    localStorage.removeItem('future_you_demo_user')
    try {
      await supabase.auth.signOut()
    } catch (e) {
      console.error(e)
    }
    setUser(null)
    setOnboardingCompleted(false)
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
