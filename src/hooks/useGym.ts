import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import type { Gym, Staff, UserRole } from '@/types'

interface GymWithStats extends Gym {
  stats?: {
    totalMembers: number
    activeMembers: number
    totalStaff: number
    monthlyRevenue: number
    todayAttendance: number
  }
}

interface CreateStaffData {
  email: string
  password: string // Required for account creation
  firstName: string
  lastName: string
  phone: string
  role: UserRole
  employeeId: string
  salaryAmount: number
  salaryType: string
  baseCommissionRate?: number
  hireDate: string
  probationEndDate?: string
  contractEndDate?: string
  specializations?: string[]
  maxClients?: number
  hourlyRate?: number
  overtimeRate?: number
  experienceYears?: number
  languages?: string[]
  workSchedule?: any
  certifications?: any[]
  education?: any[]
  bankAccountDetails?: any
  taxDetails?: any
  notes?: string
}

export const useGym = () => {
  const { gymId } = useAuth()
  const [gym, setGym] = useState<GymWithStats | null>(null)
  const [staff, setStaff] = useState<Staff[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchGym = async () => {
    try {
      if (!gymId) return { data: null, error: 'Gym ID required' }

      setLoading(true)
      setError(null)

      const { data, error } = await supabase
        .from('gyms')
        .select('*')
        .eq('id', gymId)
        .maybeSingle() // Use maybeSingle() instead of single() to handle 0 results gracefully

      if (error) throw error

      if (data) {
        // Fetch gym stats
        const stats = await fetchGymStats(data.id)
        const gymWithStats = { ...data, stats }
        setGym(gymWithStats)
        return { data: gymWithStats, error: null }
      }

      // No gym found - this is expected for new users
      setGym(null)
      return { data: null, error: null }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch gym'
      setError(errorMessage)
      return { data: null, error: errorMessage }
    } finally {
      setLoading(false)
    }
  }

  const createGym = async (gymData: Partial<Gym>) => {
    try {
      const { user } = useAuth()
      if (!user?.id) throw new Error('User ID required')

      setLoading(true)
      setError(null)

      const { data, error } = await supabase
        .from('gyms')
        .insert({
          owner_id: user.id,
          name: gymData.name || '',
          description: gymData.description,
          address: gymData.address || '',
          city: gymData.city || '',
          state: gymData.state || '',
          postal_code: gymData.postal_code,
          phone: gymData.phone || '',
          email: gymData.email || '',
          operating_hours: gymData.operating_hours || {},
          facilities: gymData.facilities || [],
          amenities: gymData.amenities || [],
          policies: gymData.policies || {},
          is_active: true
        })
        .select()
        .single()

      if (error) throw error

      setGym(data)
      return { data, error: null }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create gym'
      setError(errorMessage)
      return { data: null, error: errorMessage }
    } finally {
      setLoading(false)
    }
  }

  const updateGym = async (updates: Partial<Gym>) => {
    try {
      if (!gym?.id) throw new Error('Gym not found')

      setLoading(true)
      setError(null)

      const { data, error } = await supabase
        .from('gyms')
        .update(updates)
        .eq('id', gym.id)
        .select()
        .single()

      if (error) throw error

      setGym(prev => prev ? { ...prev, ...data } : data)
      return { data, error: null }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update gym'
      setError(errorMessage)
      return { data: null, error: errorMessage }
    } finally {
      setLoading(false)
    }
  }

  const fetchStaff = async () => {
    try {
      const currentGymId = gymId || gym?.id
      if (!currentGymId) return { data: [], error: 'Gym ID required' }

      const { data, error } = await supabase
        .from('staff')
        .select('*')
        .eq('gym_id', currentGymId)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Fetch profiles for each staff member (simple approach)
      const staffWithProfiles = await Promise.all(
        (data || []).map(async (staffMember) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', staffMember.user_id)
            .single()

          return {
            ...staffMember,
            profile
          }
        })
      )

      setStaff(staffWithProfiles)
      return { data: staffWithProfiles, error: null }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch staff'
      return { data: [], error: errorMessage }
    }
  }

  const createStaff = async (staffData: CreateStaffData) => {
    try {
      const currentGymId = gymId || gym?.id
      if (!currentGymId) throw new Error('Gym ID required')

      setLoading(true)
      setError(null)

      console.log('🚀 Starting staff creation process...')

      // Step 1: Create user account with Supabase Auth
      console.log('👤 Creating user account...')
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: staffData.email,
        password: staffData.password,
        options: {
          data: {
            first_name: staffData.firstName,
            last_name: staffData.lastName,
            phone: staffData.phone,
            role: staffData.role
          }
        }
      })

      if (authError) {
        console.error('❌ Auth error:', authError)
        throw authError
      }
      if (!authData.user) {
        throw new Error('Failed to create user account')
      }

      console.log('✅ User account created:', authData.user.id)

      // Step 2: Create profile first (ensure it exists before staff record)
      console.log('📋 Creating profile...')
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          user_id: authData.user.id,
          first_name: staffData.firstName,
          last_name: staffData.lastName,
          phone: staffData.phone
        })

      if (profileError) {
        console.error('❌ Profile creation error:', profileError)
        // Try to update if it already exists
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            first_name: staffData.firstName,
            last_name: staffData.lastName,
            phone: staffData.phone
          })
          .eq('user_id', authData.user.id)
        
        if (updateError) {
          console.error('❌ Profile update error:', updateError)
          throw new Error('Failed to create or update profile')
        } else {
          console.log('✅ Profile updated successfully')
        }
      } else {
        console.log('✅ Profile created successfully')
      }

      // Step 3: Create staff record
      console.log('👥 Creating staff record...')
      const { data: staffRecord, error: staffError } = await supabase
        .from('staff')
        .insert({
          gym_id: currentGymId,
          user_id: authData.user.id,
          role: staffData.role,
          employee_id: staffData.employeeId,
          salary_amount: staffData.salaryAmount,
          salary_type: staffData.salaryType,
          base_commission_rate: staffData.baseCommissionRate || 0,
          hire_date: staffData.hireDate,
          probation_end_date: staffData.probationEndDate || null,
          contract_end_date: staffData.contractEndDate || null,
          specializations: staffData.specializations || [],
          max_clients: staffData.maxClients,
          hourly_rate: staffData.hourlyRate,
          overtime_rate: staffData.overtimeRate,
          experience_years: staffData.experienceYears || 0,
          languages: staffData.languages || [],
          work_schedule: staffData.workSchedule || {},
          certifications: staffData.certifications || [],
          education: staffData.education || [],
          bank_account_details: staffData.bankAccountDetails || {},
          tax_details: staffData.taxDetails || {},
          notes: staffData.notes || null,
          status: 'active'
        })
        .select()
        .single()

      if (staffError) {
        console.error('❌ Staff creation error:', staffError)
        throw staffError
      }

      console.log('✅ Staff record created:', staffRecord.id)

      await fetchStaff() // Refresh staff list
      
      return { 
        data: {
          ...staffRecord,
          credentials: {
            email: staffData.email,
            password: staffData.password
          }
        }, 
        error: null 
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create staff'
      setError(errorMessage)
      return { data: null, error: errorMessage }
    } finally {
      setLoading(false)
    }
  }

  const updateStaff = async (staffId: string, updates: Partial<Staff>) => {
    try {
      setLoading(true)
      setError(null)

      const { data, error } = await supabase
        .from('staff')
        .update(updates)
        .eq('id', staffId)
        .select()
        .single()

      if (error) throw error

      await fetchStaff() // Refresh staff list
      return { data, error: null }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update staff'
      setError(errorMessage)
      return { data: null, error: errorMessage }
    } finally {
      setLoading(false)
    }
  }

  const fetchGymStats = async (gymId: string) => {
    try {
      const today = new Date().toISOString().split('T')[0]
      const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]

      // Get member counts
      const { data: members, error: membersError } = await supabase
        .from('members')
        .select('status')
        .eq('gym_id', gymId)

      if (membersError) throw membersError

      // Get staff count
      const { data: staffData, error: staffError } = await supabase
        .from('staff')
        .select('id')
        .eq('gym_id', gymId)
        .eq('status', 'active')

      if (staffError) throw staffError

      // Get monthly revenue
      const { data: payments, error: paymentsError } = await supabase
        .from('payments')
        .select('amount')
        .eq('gym_id', gymId)
        .eq('status', 'paid')
        .gte('payment_date', monthStart)

      if (paymentsError) throw paymentsError

      // Get today's attendance
      const { data: attendance, error: attendanceError } = await supabase
        .from('attendance')
        .select('id')
        .eq('gym_id', gymId)
        .eq('attendance_date', today)
        .eq('status', 'present')

      if (attendanceError) throw attendanceError

      return {
        totalMembers: members?.length || 0,
        activeMembers: members?.filter(m => m.status === 'active').length || 0,
        totalStaff: staffData?.length || 0,
        monthlyRevenue: payments?.reduce((sum, p) => sum + p.amount, 0) || 0,
        todayAttendance: attendance?.length || 0
      }
    } catch (error) {
      console.error('Error fetching gym stats:', error)
      return {
        totalMembers: 0,
        activeMembers: 0,
        totalStaff: 0,
        monthlyRevenue: 0,
        todayAttendance: 0
      }
    }
  }

  const getDashboardData = async () => {
    try {
      if (!gym?.id) return { data: null, error: 'Gym ID required' }

      const [
        membersResult,
        paymentsResult,
        attendanceResult,
        membershipResult
      ] = await Promise.all([
        // Recent members
        supabase
          .from('members')
          .select('*')
          .eq('gym_id', gym.id)
          .order('created_at', { ascending: false })
          .limit(5),

        // Recent payments
        supabase
          .from('payments')
          .select('*')
          .eq('gym_id', gym.id)
          .order('payment_date', { ascending: false })
          .limit(5),

        // Today's attendance
        supabase
          .from('attendance')
          .select('*')
          .eq('gym_id', gym.id)
          .eq('attendance_date', new Date().toISOString().split('T')[0])
          .eq('status', 'present'),

        // Expiring memberships
        supabase
          .from('memberships')
          .select('*, members!inner(gym_id)')
          .eq('members.gym_id', gym.id)
          .lte('end_date', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
          .eq('status', 'active')
          .limit(5)
      ])

      return {
        data: {
          recentMembers: membersResult.data || [],
          recentPayments: paymentsResult.data || [],
          todayAttendance: attendanceResult.data || [],
          expiringMemberships: membershipResult.data || []
        },
        error: null
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch dashboard data'
      return { data: null, error: errorMessage }
    }
  }

  // Auto-fetch gym when gymId changes
  useEffect(() => {
    if (gymId) {
      fetchGym()
    }
  }, [gymId])

  // Auto-fetch staff when gym changes
  useEffect(() => {
    if (gym?.id) {
      fetchStaff()
    }
  }, [gym?.id])

  return {
    gym,
    staff,
    loading,
    error,
    fetchGym,
    createGym,
    updateGym,
    fetchStaff,
    createStaff,
    updateStaff,
    getDashboardData
  }
}
