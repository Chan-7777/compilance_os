import { useState, useEffect } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

interface UserProfile {
  id: string
  email: string
  company_id: string
  role: string
  company: {
    id: string
    name: string
    size: string
    iec: string | null
    plan: string
  } | null
}

const SUPABASE_AVAILABLE = !!(
  import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY
)

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(SUPABASE_AVAILABLE)

  useEffect(() => {
    if (!SUPABASE_AVAILABLE) return

    // Get initial session
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s)
      setUser(s?.user ?? null)
      if (s?.user) {
        fetchProfile(s.user.id)
      } else {
        setLoading(false)
      }
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
      setUser(s?.user ?? null)
      if (s?.user) {
        fetchProfile(s.user.id)
      } else {
        setProfile(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function fetchProfile(userId: string) {
    if (!SUPABASE_AVAILABLE) return
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*, companies(*)')
      .eq('id', userId)
      .single()

    if (data && !error) {
      setProfile({
        id: data.id,
        email: data.email,
        company_id: data.company_id,
        role: data.role,
        company: data.companies,
      })
    }
    setLoading(false)
  }

  async function signUp(email: string, password: string, fullName?: string) {
    if (!SUPABASE_AVAILABLE) return { data: null, error: { message: 'Supabase not configured' } }
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    })
    return { data, error }
  }

  async function signIn(email: string, password: string) {
    if (!SUPABASE_AVAILABLE) return { data: null, error: { message: 'Supabase not configured' } }
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    return { data, error }
  }

  async function signOut() {
    if (!SUPABASE_AVAILABLE) return
    await supabase.auth.signOut()
    setUser(null)
    setSession(null)
    setProfile(null)
  }

  return {
    user,
    session,
    profile,
    loading,
    signUp,
    signIn,
    signOut,
  }
}
