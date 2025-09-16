import React, { createContext, useContext, useEffect, useState } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { UserRole, UserProfile } from '@/types'

interface AuthContextType {
  user: User | null
  session: Session | null
  profile: UserProfile | null
  role: UserRole | null
  loading: boolean
  gymId: string | null
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, userData: Partial<UserProfile>) => Promise<void>
  signOut: () => Promise<void>
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>
  verifySession: () => Promise<boolean>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: React.ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [role, setRole] = useState<UserRole | null>(null)
  const [gymId, setGymId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    console.log('🚀 AuthProvider useEffect starting...')
    
    // Get initial session from Supabase
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('❌ Error getting session:', error)
          setLoading(false)
          return
        }
        
        console.log('📡 Initial session check:', { session: !!session, user: !!session?.user })
        
        setSession(session)
        setUser(session?.user ?? null)
        
        if (session?.user) {
          await loadUserProfile(session.user.id)
        } else {
          console.log('❌ No session found')
          setLoading(false)
        }
      } catch (error) {
        console.error('❌ Error in getInitialSession:', error)
        setLoading(false)
      }
    }

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔄 Auth state changed:', event, { session: !!session })
        
        setSession(session)
        setUser(session?.user ?? null)
        
        if (session?.user) {
          await loadUserProfile(session.user.id)
        } else {
          // Clear everything on logout
          setProfile(null)
          setRole(null)
          setGymId(null)
          setLoading(false)
        }
      }
    )

    // Initialize
    getInitialSession()

    return () => subscription.unsubscribe()
  }, [])


  const loadUserProfile = async (userId: string) => {
    try {
      console.log('👤 Loading profile for user:', userId)
      
      // Get profile data
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (profileError) {
        console.error('❌ Profile error:', profileError)
        throw profileError
      }
      
      console.log('✅ Profile data loaded')
      setProfile(profileData)

      // Determine role: Check if user is staff first, then fallback to member
      console.log('🔍 Checking staff role...')
      const { data: staffData, error: staffError } = await supabase
        .from('staff')
        .select('role, gym_id')
        .eq('user_id', userId)
        .single()

      if (staffData && !staffError) {
        // User is staff member
        console.log('✅ User is staff:', staffData.role)
        setRole(staffData.role as UserRole)
        setGymId(staffData.gym_id)
      } else {
        // Check if user is gym owner
        console.log('🔍 Checking gym owner...')
        const { data: gymData, error: gymError } = await supabase
          .from('gyms')
          .select('id')
          .eq('owner_id', userId)
          .single()

        if (gymData && !gymError) {
          console.log('✅ User is gym owner')
          setRole('gym_owner')
          setGymId(gymData.id)
        } else {
          // Default to member
          console.log('✅ User is member (default)')
          setRole('member')
          setGymId(null)
        }
      }
    } catch (error) {
      console.error('❌ Error loading user profile:', error)
      setRole('member') // Default fallback
      setGymId(null)
    } finally {
      console.log('🏁 Profile loading complete, setting loading to false')
      setLoading(false)
    }
  }

  const signIn = async (email: string, password: string) => {
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) throw error
    } catch (error) {
      setLoading(false)
      throw error
    }
  }

  const signUp = async (email: string, password: string, userData: Partial<UserProfile>) => {
    setLoading(true)
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            role: userData.first_name ? 'gym_owner' : 'member', // Default logic
          }
        }
      })

      if (error) throw error

      if (data.user) {
        // Create profile
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            user_id: data.user.id,
            first_name: userData.first_name || '',
            last_name: userData.last_name || '',
            phone: userData.phone || '',
            address: userData.address,
            date_of_birth: userData.date_of_birth,
            emergency_contact_name: userData.emergency_contact_name,
            emergency_contact_phone: userData.emergency_contact_phone,
          })

        if (profileError) throw profileError
      }
    } catch (error) {
      setLoading(false)
      throw error
    }
  }

  const signOut = async () => {
    setLoading(true)
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
    } catch (error) {
      setLoading(false)
      throw error
    }
  }

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user) throw new Error('No user logged in')

    try {
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('user_id', user.id)

      if (error) throw error

      setProfile(current => current ? { ...current, ...updates } : null)
    } catch (error) {
      throw error
    }
  }

  const verifySession = async (): Promise<boolean> => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser()
      
      if (error || !user) {
        // Session is invalid, clear everything
        setUser(null)
        setSession(null)
        setProfile(null)
        setRole(null)
        setGymId(null)
        return false
      }

      // Session is valid, ensure profile is loaded
      if (!profile || !role) {
        await loadUserProfile(user.id)
      }
      
      return true
    } catch (error) {
      console.error('Error verifying session:', error)
      return false
    }
  }

  const value: AuthContextType = {
    user,
    session,
    profile,
    role,
    loading,
    gymId,
    signIn,
    signUp,
    signOut,
    updateProfile,
    verifySession,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
