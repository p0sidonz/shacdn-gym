import { supabase } from '@/lib/supabase'

export interface FollowUp {
  id: string
  gym_id: string
  member_id: string
  assigned_to?: string
  follow_up_date: string
  response?: string
  convertibility: 'high' | 'medium' | 'low'
  next_follow_up_date?: string
  next_follow_up_time?: string
  remark?: string
  status: 'pending' | 'completed' | 'cancelled'
  created_by?: string
  created_at: string
  updated_at: string
  // Joined data
  assigned_staff?: {
    id: string
    employee_id: string
    profile?: {
      first_name: string
      last_name: string
    }
  }
}

export interface CreateFollowUpData {
  member_id: string
  assigned_to?: string
  follow_up_date: string
  response?: string
  convertibility: 'high' | 'medium' | 'low'
  next_follow_up_date?: string
  next_follow_up_time?: string
  remark?: string
}

export interface UpdateFollowUpData {
  assigned_to?: string
  follow_up_date?: string
  response?: string
  convertibility?: 'high' | 'medium' | 'low'
  next_follow_up_date?: string
  next_follow_up_time?: string
  remark?: string
  status?: 'pending' | 'completed' | 'cancelled'
}

export class FollowUpService {
  static async getFollowUps(memberId: string): Promise<FollowUp[]> {
    const { data, error } = await supabase
      .from('follow_ups')
      .select(`
        *,
        assigned_staff:staff!follow_ups_assigned_to_fkey(
          id,
          employee_id,
          user_id
        )
      `)
      .eq('member_id', memberId)
      .order('follow_up_date', { ascending: false })

    if (error) {
      console.error('Error fetching follow-ups:', error)
      throw error
    }

    // Manually fetch profile data for each staff member
    const followUpsWithProfiles = await Promise.all(
      (data || []).map(async (followUp) => {
        if (followUp.assigned_staff?.user_id) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('first_name, last_name')
            .eq('user_id', followUp.assigned_staff.user_id)
            .single()
          
          return {
            ...followUp,
            assigned_staff: {
              ...followUp.assigned_staff,
              profile
            }
          }
        }
        return followUp
      })
    )

    return followUpsWithProfiles
  }

  static async createFollowUp(data: CreateFollowUpData): Promise<FollowUp> {
    const { data: user } = await supabase.auth.getUser()
    const { data: gym } = await supabase
      .from('members')
      .select('gym_id')
      .eq('id', data.member_id)
      .single()

    if (!gym) {
      throw new Error('Member not found')
    }

    const { data: followUp, error } = await supabase
      .from('follow_ups')
      .insert({
        gym_id: gym.gym_id,
        member_id: data.member_id,
        assigned_to: data.assigned_to,
        follow_up_date: data.follow_up_date,
        response: data.response,
        convertibility: data.convertibility,
        next_follow_up_date: data.next_follow_up_date,
        next_follow_up_time: data.next_follow_up_time,
        remark: data.remark,
        created_by: user.user?.id
      })
      .select(`
        *,
        assigned_staff:staff!follow_ups_assigned_to_fkey(
          id,
          employee_id,
          user_id
        )
      `)
      .single()

    if (error) {
      console.error('Error creating follow-up:', error)
      throw error
    }

    // Manually fetch profile data
    if (followUp.assigned_staff?.user_id) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('user_id', followUp.assigned_staff.user_id)
        .single()
      
      followUp.assigned_staff.profile = profile
    }

    return followUp
  }

  static async updateFollowUp(id: string, data: UpdateFollowUpData): Promise<FollowUp> {
    const { data: followUp, error } = await supabase
      .from('follow_ups')
      .update(data)
      .eq('id', id)
      .select(`
        *,
        assigned_staff:staff!follow_ups_assigned_to_fkey(
          id,
          employee_id,
          user_id
        )
      `)
      .single()

    if (error) {
      console.error('Error updating follow-up:', error)
      throw error
    }

    // Manually fetch profile data
    if (followUp.assigned_staff?.user_id) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('user_id', followUp.assigned_staff.user_id)
        .single()
      
      followUp.assigned_staff.profile = profile
    }

    return followUp
  }

  static async deleteFollowUp(id: string): Promise<void> {
    const { error } = await supabase
      .from('follow_ups')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting follow-up:', error)
      throw error
    }
  }

  static async getActiveTrainers(gymId: string): Promise<Array<{id: string, name: string}>> {
    const { data, error } = await supabase
      .from('staff')
      .select(`
        id,
        employee_id,
        user_id
      `)
      .eq('gym_id', gymId)
      .eq('role', 'trainer')
      .eq('status', 'active')

    if (error) {
      console.error('Error fetching trainers:', error)
      throw error
    }

    // Manually fetch profile data for each trainer
    const trainersWithProfiles = await Promise.all(
      (data || []).map(async (staff) => {
        const { data: profile } = await supabase
          .from('profiles')
          .select('first_name, last_name')
          .eq('user_id', staff.user_id)
          .single()
        
        return {
          id: staff.id,
          name: profile ? `${profile.first_name} ${profile.last_name}` : staff.employee_id
        }
      })
    )

    return trainersWithProfiles
  }
}
