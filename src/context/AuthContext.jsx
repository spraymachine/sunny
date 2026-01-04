import { createContext, useContext, useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})

export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const currentUserIdRef = useRef(null)
  const profileRef = useRef(null)
  const profileFetchInFlightRef = useRef(false)
  const getSessionInFlightRef = useRef(null)
  const fetchProfileInFlightRef = useRef(null)

  useEffect(() => {
    let isMounted = true
    
    const initAuth = async () => {
      // Check if Supabase is configured
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL

      if (!supabaseUrl || supabaseUrl.includes('placeholder')) {
        console.warn('⚠️ Supabase not configured')
        if (isMounted) {
          setLoading(false)
        }
        return
      }

      try {
        // Single-flight getSession to avoid concurrent calls (StrictMode / refresh races)
        if (!getSessionInFlightRef.current) {
          const p = supabase.auth.getSession()
          getSessionInFlightRef.current = p
          p.finally(() => {
            if (getSessionInFlightRef.current === p) getSessionInFlightRef.current = null
          }).catch(() => {})
        }
        const getSessionPromise = getSessionInFlightRef.current
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('getSession timeout after 8000ms')), 8000))
        const { data, error } = await Promise.race([getSessionPromise, timeoutPromise])

        if (error) {
          console.error('getSession error:', error)
          if (isMounted) {
            setLoading(false)
          }
          return
        }

        if (isMounted) {
          const sessionUser = data?.session?.user ?? null
          setUser(sessionUser)
          
          if (sessionUser) {
            currentUserIdRef.current = sessionUser.id
            await fetchProfile(sessionUser.id)
          } else {
            setLoading(false)
          }
        }
      } catch (error) {
        console.error('Exception in initAuth:', error)
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    initAuth()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return
        
        const newUserId = session?.user?.id ?? null
        const previousUserId = currentUserIdRef.current

        // If tab is hidden, don't kick the UI back into loading or start network calls.
        if (typeof document !== 'undefined' && document.hidden) {
          setUser(session?.user ?? null)
          return
        }

        // Only handle actual user changes, not token refreshes or tab focus events
        // Skip if: same user AND we already have profile loaded AND not a sign-out
        if (event === 'TOKEN_REFRESHED') {
          // Token refresh - don't reload anything, just update user object
          setUser(session?.user ?? null)
          return
        }

        if (event === 'SIGNED_IN' && newUserId === previousUserId && profileRef.current !== null) {
          // Same user re-authenticated (tab focus, etc.) - skip reload
          setUser(session?.user ?? null)
          return
        }

        // Actual auth change - handle it
        setUser(session?.user ?? null)
        
        if (session?.user) {
          // Only show loading and fetch profile if user changed or we don't have profile
          if (newUserId !== previousUserId || profileRef.current === null) {
            currentUserIdRef.current = newUserId
            setLoading(true)
            await fetchProfile(session.user.id)
          }
        } else {
          // User signed out
          currentUserIdRef.current = null
          profileRef.current = null
          setProfile(null)
          setLoading(false)
        }
      }
    )

    return () => {
      isMounted = false
      if (subscription) {
        subscription.unsubscribe()
      }
    }
  }, [])

  const fetchProfile = async (userId) => {
    if (profileFetchInFlightRef.current) {
      return
    }

    try {
      profileFetchInFlightRef.current = true
      // Single-flight profile fetch to avoid races across initAuth + onAuthStateChange
      if (!fetchProfileInFlightRef.current) {
        const thenable = supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single()
        // Supabase query builders are Promise-like but may not implement .finally()
        const p = Promise.resolve(thenable)
        fetchProfileInFlightRef.current = p
        p.finally(() => {
          if (fetchProfileInFlightRef.current === p) fetchProfileInFlightRef.current = null
        }).catch(() => {})
      }
      const profilePromise = fetchProfileInFlightRef.current
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('fetchProfile timeout after 8000ms')), 8000))
      const { data, error } = await Promise.race([profilePromise, timeoutPromise])

      if (error) {
        console.warn('Profile query error:', error.message)
        profileRef.current = null
        setProfile(null)
      } else {
        profileRef.current = data
        setProfile(data)
      }
    } catch (error) {
      console.error('Error fetching profile:', error)
      fetchProfileInFlightRef.current = null
      profileRef.current = null
      setProfile(null)
    } finally {
      profileFetchInFlightRef.current = false
      setLoading(false)
    }
  }

  const signIn = async (email, password) => {
    try {
      const signInPromise = supabase.auth.signInWithPassword({ email, password })
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('signIn timeout after 12000ms')), 12000))
      const { data, error } = await Promise.race([signInPromise, timeoutPromise])
      return { data, error }
    } catch (e) {
      return { data: null, error: { message: e?.message || 'Sign in failed' } }
    }
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (!error) {
      setUser(null)
      setProfile(null)
    }
    return { error }
  }

  const isAdmin = profile?.role === 'admin'

  const value = {
    user,
    profile,
    loading,
    isAdmin,
    signIn,
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

