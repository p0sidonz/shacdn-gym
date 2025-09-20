import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import type { Inquiry, InquiryStatus, InquiryFollowup, FollowupType, FollowupMethod } from '@/types'
import { ActivityLogService } from '@/services/activityLogService'

interface StaffWithProfile {
  id: string
  user_id: string
  role: string
  profile: {
    first_name: string
    last_name: string
  }
}

interface CreateInquiryData {
  name: string
  phone: string
  email?: string
  age?: number
  gender?: string
  interest_area?: string
  preferred_timing?: string
  source: string
  notes?: string
}

interface UpdateInquiryData {
  status?: InquiryStatus
  assigned_to?: string
  follow_up_date?: string
  trial_date?: string
  conversion_date?: string
  package_interested?: string
  notes?: string
}

interface CreateFollowupData {
  inquiry_id: string
  staff_id?: string
  followup_type: FollowupType
  followup_date: string
  followup_method: FollowupMethod
  notes?: string
  next_followup_date?: string
}

export const useInquiries = () => {
  const { gymId, user, profile } = useAuth()
  const [inquiries, setInquiries] = useState<Inquiry[]>([])
  const [staff, setStaff] = useState<StaffWithProfile[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchInquiries = async () => {
    try {
      if (!gymId) return { data: [], error: 'Gym ID required' }

      setLoading(true)
      setError(null)

      const { data, error } = await supabase
        .from('inquiries')
        .select(`
          *,
          assigned_staff:staff!assigned_to(
            id,
            user_id,
            role
          ),
          package_details:membership_packages!package_interested(
            id,
            name,
            price
          )
        `)
        .eq('gym_id', gymId)
        .order('created_at', { ascending: false })

      if (error) throw error

      setInquiries(data || [])
      return { data: data || [], error: null }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch inquiries'
      setError(errorMessage)
      return { data: [], error: errorMessage }
    } finally {
      setLoading(false)
    }
  }

  const fetchStaff = async () => {
    try {
      if (!gymId) return { data: [], error: 'Gym ID required' }

      // First get staff with user_ids
      const { data: staffData, error: staffError } = await supabase
        .from('staff')
        .select(`
          id,
          user_id,
          role
        `)
        .eq('gym_id', gymId)
        .eq('status', 'active')

      if (staffError) throw staffError

      // Then get profiles for those user_ids
      if (staffData && staffData.length > 0) {
        const userIds = staffData.map(s => s.user_id)
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('user_id, first_name, last_name')
          .in('user_id', userIds)

        if (profilesError) throw profilesError

        // Combine staff and profile data
        const staffWithProfiles = staffData.map(staff => {
          const profile = profilesData?.find(p => p.user_id === staff.user_id)
          return {
            ...staff,
            profile: profile || { first_name: 'Unknown', last_name: 'User' }
          }
        })

        setStaff(staffWithProfiles)
        return { data: staffWithProfiles, error: null }
      } else {
        setStaff([])
        return { data: [], error: null }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch staff'
      return { data: [], error: errorMessage }
    }
  }

  const createInquiry = async (inquiryData: CreateInquiryData) => {
    try {
      if (!gymId) throw new Error('Gym ID required')

      setLoading(true)
      setError(null)

      const { data, error } = await supabase
        .from('inquiries')
        .insert({
          gym_id: gymId,
          name: inquiryData.name,
          phone: inquiryData.phone,
          email: inquiryData.email,
          age: inquiryData.age,
          gender: inquiryData.gender,
          interest_area: inquiryData.interest_area,
          preferred_timing: inquiryData.preferred_timing,
          source: inquiryData.source,
          notes: inquiryData.notes,
          status: 'new'
        })
        .select()
        .single()

      if (error) throw error

      await fetchInquiries() // Refresh inquiries list

      // Log creation
      try {
        await ActivityLogService.createLog({
          gym_id: gymId,
          resource_type: 'inquiry',
          resource_id: data.id,
          action: 'create',
          description: `Inquiry created: ${data.name}`,
          after_data: data,
        })
      } catch (e) {
        console.warn('Activity log (create) failed', e)
      }

      return { data, error: null }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create inquiry'
      setError(errorMessage)
      return { data: null, error: errorMessage }
    } finally {
      setLoading(false)
    }
  }

  const updateInquiry = async (inquiryId: string, updates: UpdateInquiryData) => {
    try {
      setLoading(true)
      setError(null)

      const before = inquiries.find(i => i.id === inquiryId) || null

      const { data, error } = await supabase
        .from('inquiries')
        .update(updates)
        .eq('id', inquiryId)
        .select()
        .single()

      if (error) throw error

      await fetchInquiries() // Refresh inquiries list

      // Log update/status change
      try {
        await ActivityLogService.createLog({
          gym_id: gymId as string,
          resource_type: 'inquiry',
          resource_id: inquiryId,
          action: updates.status ? 'status_change' : 'update',
          description: updates.status ? `Inquiry status changed to ${updates.status}` : 'Inquiry updated',
          before_data: before,
          after_data: data,
        })
      } catch (e) {
        console.warn('Activity log (update) failed', e)
      }

      return { data, error: null }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update inquiry'
      setError(errorMessage)
      return { data: null, error: errorMessage }
    } finally {
      setLoading(false)
    }
  }

  const deleteInquiry = async (inquiryId: string) => {
    try {
      setLoading(true)
      setError(null)

      // before snapshot
      const { data: before } = await supabase
        .from('inquiries')
        .select('*')
        .eq('id', inquiryId)
        .single()

      const { error } = await supabase
        .from('inquiries')
        .delete()
        .eq('id', inquiryId)

      if (error) throw error

      await fetchInquiries() // Refresh inquiries list

      // audit log
      try {
        await ActivityLogService.createLog({
          gym_id: gymId as string,
          actor_user_id: user?.id ?? null,
          actor_profile_id: profile?.id ?? null,
          resource_type: 'inquiry',
          resource_id: inquiryId,
          action: 'delete',
          description: 'Inquiry deleted',
          before_data: before,
          after_data: null,
        })
      } catch (e) {
        console.warn('Activity log (delete inquiry) failed', e)
      }

      return { data: null, error: null }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete inquiry'
      setError(errorMessage)
      return { data: null, error: errorMessage }
    } finally {
      setLoading(false)
    }
  }

  const convertToMember = async (inquiryId: string) => {
    try {
      setLoading(true)
      setError(null)

      // This would create a member record and update inquiry status
      // Implementation depends on your member creation flow
      const { data, error } = await supabase
        .from('inquiries')
        .update({
          status: 'converted',
          conversion_date: new Date().toISOString().split('T')[0]
        })
        .eq('id', inquiryId)
        .select()
        .single()

      if (error) throw error

      await fetchInquiries() // Refresh inquiries list
      return { data, error: null }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to convert inquiry'
      setError(errorMessage)
      return { data: null, error: errorMessage }
    } finally {
      setLoading(false)
    }
  }

  const getInquiryStats = () => {
    const total = inquiries.length
    const newInquiries = inquiries.filter(i => i.status === 'new').length
    const contacted = inquiries.filter(i => i.status === 'contacted').length
    const trialScheduled = inquiries.filter(i => i.status === 'trial_scheduled').length
    const converted = inquiries.filter(i => i.status === 'converted').length
    const lost = inquiries.filter(i => i.status === 'lost').length

    return {
      total,
      new: newInquiries,
      contacted,
      trialScheduled,
      converted,
      lost,
      conversionRate: total > 0 ? Math.round((converted / total) * 100) : 0
    }
  }

  // Follow-up Management Functions
  const createFollowup = async (followupData: CreateFollowupData) => {
    try {
      setLoading(true)
      setError(null)

      const { data, error } = await supabase
        .from('inquiry_followups')
        .insert({
          inquiry_id: followupData.inquiry_id,
          staff_id: followupData.staff_id,
          followup_type: followupData.followup_type,
          followup_date: followupData.followup_date,
          followup_method: followupData.followup_method,
          notes: followupData.notes,
          next_followup_date: followupData.next_followup_date,
          status: 'scheduled'
        })
        .select()
        .single()

      if (error) throw error

      // audit log
      try {
        await ActivityLogService.createLog({
          gym_id: gymId as string,
          actor_user_id: user?.id ?? null,
          actor_profile_id: profile?.id ?? null,
          resource_type: 'inquiry_followups',
          resource_id: data.id,
          action: 'create',
          description: 'Follow-up created',
          after_data: data,
        })
      } catch (e) {
        console.warn('Activity log (create follow-up) failed', e)
      }

      return { data, error: null }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create follow-up'
      setError(errorMessage)
      return { data: null, error: errorMessage }
    } finally {
      setLoading(false)
    }
  }

  const updateFollowup = async (followupId: string, updates: Partial<InquiryFollowup>) => {
    try {
      setLoading(true)
      setError(null)

      // before snapshot
      const { data: before } = await supabase
        .from('inquiry_followups')
        .select('*')
        .eq('id', followupId)
        .single()

      const { data, error } = await supabase
        .from('inquiry_followups')
        .update(updates)
        .eq('id', followupId)
        .select()
        .single()

      if (error) throw error

      // audit log
      try {
        await ActivityLogService.createLog({
          gym_id: gymId as string,
          actor_user_id: user?.id ?? null,
          actor_profile_id: profile?.id ?? null,
          resource_type: 'inquiry_followups',
          resource_id: followupId,
          action: updates?.status ? 'status_change' : 'update',
          description: updates?.status ? `Follow-up status changed to ${updates.status}` : 'Follow-up updated',
          before_data: before,
          after_data: data,
        })
      } catch (e) {
        console.warn('Activity log (update follow-up) failed', e)
      }

      return { data, error: null }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update follow-up'
      setError(errorMessage)
      return { data: null, error: errorMessage }
    } finally {
      setLoading(false)
    }
  }

  const getFollowupHistory = async (inquiryId: string) => {
    try {
      const { data, error } = await supabase
        .rpc('get_inquiry_followup_history', { p_inquiry_id: inquiryId })

      if (error) throw error

      return { data: data || [], error: null }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch follow-up history'
      return { data: [], error: errorMessage }
    }
  }

  const getUpcomingFollowups = async () => {
    try {
      if (!gymId) return { data: [], error: 'Gym ID required' }

      const { data, error } = await supabase
        .from('inquiry_followups')
        .select(`
          *,
          inquiry:inquiries!inquiry_id(
            id,
            name,
            phone,
            status
          ),
          staff:staff!staff_id(
            id,
            profile:profiles(
              first_name,
              last_name
            )
          )
        `)
        .eq('inquiry.gym_id', gymId)
        .eq('status', 'scheduled')
        .gte('followup_date', new Date().toISOString())
        .order('followup_date', { ascending: true })

      if (error) throw error

      return { data: data || [], error: null }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch upcoming follow-ups'
      return { data: [], error: errorMessage }
    }
  }

  // Auto-fetch inquiries when gymId changes
  useEffect(() => {
    if (gymId) {
      fetchInquiries()
      fetchStaff()
    }
  }, [gymId])

  return {
    inquiries,
    staff,
    loading,
    error,
    fetchInquiries,
    fetchStaff,
    createInquiry,
    updateInquiry,
    deleteInquiry,
    convertToMember,
    getInquiryStats,
    createFollowup,
    updateFollowup,
    getFollowupHistory,
    getUpcomingFollowups
  }
}
