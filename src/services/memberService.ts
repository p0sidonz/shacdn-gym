import { supabase } from '@/lib/supabase'
import type { MemberWithDetails } from '@/types'
import { ActivityLogService } from '@/services/activityLogService'

export interface MemberFilters {
  gym_id?: string
  status?: string
  search?: string
  page?: number
  limit?: number
}

export interface AuditContext {
  gymId?: string
  actorUserId?: string | null
  actorProfileId?: string | null
}

export interface MemberStats {
  total_members: number
  active_members: number
  trial_members: number
  expired_members: number
  suspended_members: number
  pending_payment_members: number
  new_this_month: number
  revenue_this_month: number
  pending_payments: number
  average_attendance: number
}

export class MemberService {
  // Get all members with optional filters
  static async getMembers(filters: MemberFilters = {}): Promise<MemberWithDetails[]> {
    try {
      let query = supabase
        .from('members')
        .select(`
          *,
          profile:profiles!profile_id!inner(
            first_name,
            last_name,
            phone,
            date_of_birth,
            gender,
            address,
            emergency_contact_name,
            emergency_contact_phone,
            profile_image_url
          ),
          assigned_trainer:staff!assigned_trainer_id(
            id,
            employee_id,
            profile:profiles!profile_id(
              first_name,
              last_name,
              phone
            )
          ),
          memberships!memberships_member_id_fkey(
            id,
            status,
            start_date,
            end_date,
            is_trial,
            amount_paid,
            amount_pending,
            membership_packages(
              id,
              name,
              price,
              duration_days,
              package_type,
              is_trial,
              pt_sessions_included,
              features
            ),
            payment_plans(
              id,
              total_amount,
              down_payment,
              remaining_amount,
              number_of_installments,
              installment_amount,
              installment_frequency,
              status
            )
          )
        `)

      // Apply filters
      if (filters.gym_id) {
        query = query.eq('gym_id', filters.gym_id)
      }

      if (filters.status) {
        query = query.eq('status', filters.status)
      }

      if (filters.search) {
        query = query.or(`member_id.ilike.%${filters.search}%,profile.first_name.ilike.%${filters.search}%,profile.last_name.ilike.%${filters.search}%`)
      }

      // Apply pagination
      if (filters.page && filters.limit) {
        const from = (filters.page - 1) * filters.limit
        const to = from + filters.limit - 1
        query = query.range(from, to)
      }

      const { data, error } = await query.order('created_at', { ascending: false })

      if (error) throw error
      
      // Transform data to match UI expectations
      const transformedData = (data || []).map(member => {
        // Find active or trial membership (both should be considered "current")
        const activeMembership = member.memberships?.find((m: any) => 
          m.status === 'active' || m.status === 'trial'
        )
        
        return {
          ...member,
          current_membership: activeMembership,
          membership_package: activeMembership?.membership_packages,
          // assigned_trainer is already properly joined from the query
          attendance_stats: {
            attendance_percentage: 0, // Will be calculated separately if needed
            last_visit: null
          }
        }
      })
      
      return transformedData
    } catch (error) {
      console.error('Error fetching members:', error)
      throw error
    }
  }

  // Get member by ID
  static async getMemberById(id: string): Promise<MemberWithDetails | null> {
    try {
      const { data, error } = await supabase
        .from('members')
        .select(`
          *,
          profile:profiles!profile_id!inner(
            first_name,
            last_name,
            phone,
            date_of_birth,
            gender,
            address,
            emergency_contact_name,
            emergency_contact_phone,
            profile_image_url
          ),
          memberships!memberships_member_id_fkey(
            id,
            status,
            start_date,
            end_date,
            is_trial,
            amount_paid,
            amount_pending,
            total_amount_due,
            membership_packages(
              id,
              name,
              price,
              duration_days,
              package_type
            ),
            payment_plans(
              id,
              total_amount,
              down_payment,
              remaining_amount,
              number_of_installments,
              installment_amount,
              installment_frequency,
              status
            )
          )
        `)
        .eq('id', id)
        .single()

      if (error) throw error
      
      // Transform data to match UI expectations
      const activeMembership = data.memberships?.find((m: any) => 
        m.status === 'active' || m.status === 'trial'
      )
      
      return {
        ...data,
        current_membership: activeMembership,
        membership_package: activeMembership?.membership_packages
      }
    } catch (error) {
      console.error('Error fetching member:', error)
      throw error
    }
  }

  // Get member statistics
  static async getMemberStats(gymId: string): Promise<MemberStats> {
    try {
      // Total members
      const { count: totalCount } = await supabase
        .from('members')
        .select('*', { count: 'exact', head: true })
        .eq('gym_id', gymId)

      // Active members
      const { count: activeCount } = await supabase
        .from('members')
        .select('*', { count: 'exact', head: true })
        .eq('gym_id', gymId)
        .eq('status', 'active')

      // Trial members
      const { count: trialCount } = await supabase
        .from('members')
        .select('*', { count: 'exact', head: true })
        .eq('gym_id', gymId)
        .eq('status', 'trial')

      // Expired members
      const { count: expiredCount } = await supabase
        .from('members')
        .select('*', { count: 'exact', head: true })
        .eq('gym_id', gymId)
        .eq('status', 'expired')

      // Suspended members
      const { count: suspendedCount } = await supabase
        .from('members')
        .select('*', { count: 'exact', head: true })
        .eq('gym_id', gymId)
        .eq('status', 'suspended')

      // Pending payment members
      const { count: pendingPaymentCount } = await supabase
        .from('members')
        .select('*', { count: 'exact', head: true })
        .eq('gym_id', gymId)
        .eq('status', 'pending_payment')

      // New this month
      const { count: newThisMonth } = await supabase
        .from('members')
        .select('*', { count: 'exact', head: true })
        .eq('gym_id', gymId)
        .gte('joining_date', '2025-09-01')  // Adjust based on current date

      // Revenue this month - sum payments
      const { data: payments } = await supabase
        .from('payments')
        .select('amount')
        .eq('gym_id', gymId)
        .gte('payment_date', '2025-09-01')
        .eq('status', 'paid')

      const revenueThisMonth = payments?.reduce((sum, p) => sum + p.amount, 0) || 0

      // Pending payments - count memberships with amount_pending > 0
      const { count: pendingCount } = await supabase
        .from('memberships')
        .select('*, members!inner(gym_id)', { count: 'exact', head: true })
        .eq('members.gym_id', gymId)
        .gt('amount_pending', 0)

      const pendingPayments = pendingCount || 0

      // Average attendance - placeholder
      const averageAttendance = 75 // Implement properly

      return {
        total_members: totalCount || 0,
        active_members: activeCount || 0,
        trial_members: trialCount || 0,
        expired_members: expiredCount || 0,
        suspended_members: suspendedCount || 0,
        pending_payment_members: pendingPaymentCount || 0,
        new_this_month: newThisMonth || 0,
        revenue_this_month: revenueThisMonth,
        pending_payments: pendingPayments,
        average_attendance: averageAttendance
      }
    } catch (error) {
      console.error('Error fetching member stats:', error)
      throw error
    }
  }

  // Create new member
  static async createMember(memberData: any, ctx?: AuditContext): Promise<any> {
    try {
      console.log('MemberService.createMember called with:', memberData)
      const { data, error } = await supabase
        .from('members')
        .insert([memberData])
        .select()
        .single()

      if (error) {
        console.error('Member creation error:', error)
        throw new Error(`Member creation failed: ${error.message}`)
      }
      console.log('Member created successfully:', data)

      // Audit log (create)
      try {
        await ActivityLogService.createLog({
          gym_id: ctx?.gymId || data.gym_id,
          actor_user_id: ctx?.actorUserId ?? null,
          actor_profile_id: ctx?.actorProfileId ?? null,
          resource_type: 'member',
          resource_id: data.id,
          action: 'create',
          description: `Member created: ${data.id}`,
          after_data: data,
        })
      } catch (e) {
        console.warn('audit(createMember) failed', e)
      }
      return data
    } catch (error) {
      console.error('Error creating member:', error)
      throw error
    }
  }

  // Update member
  static async updateMember(id: string, updates: Partial<any>, ctx?: AuditContext): Promise<any> {
    try {
      // Fetch before snapshot
      const { data: before } = await supabase
        .from('members')
        .select('*')
        .eq('id', id)
        .single()

      const { data, error } = await supabase
        .from('members')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      // Audit log (update)
      try {
        await ActivityLogService.createLog({
          gym_id: ctx?.gymId || data.gym_id,
          actor_user_id: ctx?.actorUserId ?? null,
          actor_profile_id: ctx?.actorProfileId ?? null,
          resource_type: 'member',
          resource_id: id,
          action: updates?.status ? 'status_change' : 'update',
          description: updates?.status ? `Member status changed to ${updates.status}` : 'Member updated',
          before_data: before,
          after_data: data,
        })
      } catch (e) {
        console.warn('audit(updateMember) failed', e)
      }
      return data
    } catch (error) {
      console.error('Error updating member:', error)
      throw error
    }
  }

  // Update profile (first_name, last_name, phone, date_of_birth, gender, address, emergency contacts, image, etc.)
  static async updateProfile(profileId: string, updates: Partial<any>, ctx?: AuditContext): Promise<any> {
    try {
      // Ensure we never allow email updates here (guard)
      const { email, ...safeUpdates } = updates as any

      // Resolve gym via members.profile_id if not provided
      let resolvedGymId = ctx?.gymId
      if (!resolvedGymId) {
        const { data: memberOfProfile } = await supabase
          .from('members')
          .select('gym_id, id')
          .eq('profile_id', profileId)
          .single()
        resolvedGymId = memberOfProfile?.gym_id
      }

      // Before snapshot
      const { data: before } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', profileId)
        .single()

      const { data, error } = await supabase
        .from('profiles')
        .update(safeUpdates)
        .eq('id', profileId)
        .select()
        .single()

      if (error) throw error

      // Audit log (update profile)
      try {
        await ActivityLogService.createLog({
          gym_id: resolvedGymId as string,
          actor_user_id: ctx?.actorUserId ?? null,
          actor_profile_id: ctx?.actorProfileId ?? null,
          resource_type: 'profile',
          resource_id: profileId,
          action: 'update',
          description: 'Profile updated',
          before_data: before,
          after_data: data,
        })
      } catch (e) {
        console.warn('audit(updateProfile) failed', e)
      }
      return data
    } catch (error) {
      console.error('Error updating profile:', error)
      throw error
    }
  }

  // Delete member
  static async deleteMember(id: string, ctx?: AuditContext): Promise<void> {
    try {
      // Before snapshot
      const { data: before } = await supabase
        .from('members')
        .select('*')
        .eq('id', id)
        .single()

      const { error } = await supabase
        .from('members')
        .delete()
        .eq('id', id)

      if (error) throw error

      // Audit log (delete)
      try {
        await ActivityLogService.createLog({
          gym_id: ctx?.gymId || before?.gym_id,
          actor_user_id: ctx?.actorUserId ?? null,
          actor_profile_id: ctx?.actorProfileId ?? null,
          resource_type: 'member',
          resource_id: id,
          action: 'delete',
          description: 'Member deleted',
          before_data: before,
          after_data: null,
        })
      } catch (e) {
        console.warn('audit(deleteMember) failed', e)
      }
    } catch (error) {
      console.error('Error deleting member:', error)
      throw error
    }
  }

  // Get member with full details (memberships, staff assignments)
  static async getMemberWithDetails(id: string): Promise<any> {
    try {
      // Get member with profile
      const member = await this.getMemberById(id)
      if (!member) return null

      // Get current membership
      const { data: membership } = await supabase
        .from('memberships')
        .select(`
          *,
          membership_packages(
            id,
            name,
            package_type,
            duration_days,
            price,
            features
          )
        `)
        .eq('member_id', id)
        .in('status', ['active', 'trial'])
        .single()

      // Get assigned trainer
      let assignedTrainer = null
      if (member.assigned_trainer_id) {
        const { data: trainer } = await supabase
          .from('staff')
          .select(`
            id,
            employee_id,
            profiles!profile_id(
              first_name,
              last_name,
              phone
            )
          `)
          .eq('id', member.assigned_trainer_id)
          .single()
        assignedTrainer = trainer
      }

      // Get assigned nutritionist
      let assignedNutritionist = null
      if (member.assigned_nutritionist_id) {
        const { data: nutritionist } = await supabase
          .from('staff')
          .select(`
            id,
            employee_id,
            profiles!profile_id(
              first_name,
              last_name,
              phone
            )
          `)
          .eq('id', member.assigned_nutritionist_id)
          .single()
        assignedNutritionist = nutritionist
      }

      return {
        ...member,
        current_membership: membership,
        assigned_trainer: assignedTrainer,
        assigned_nutritionist: assignedNutritionist
      }
    } catch (error) {
      console.error('Error fetching member with details:', error)
      throw error
    }
  }
}