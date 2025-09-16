import { supabase } from '@/lib/supabase'

export interface PTSession {
  id: string
  member_id: string
  trainer_id: string
  membership_id?: string
  session_date: string
  start_time: string
  end_time: string
  duration_minutes: number
  session_type: string
  session_focus: string
  session_number: number
  total_sessions: number
  session_fee: number
  trainer_fee: number
  exercises_performed: any[]
  member_fitness_level: string
  session_rating?: number
  calories_burned?: number
  notes?: string
  member_feedback?: string
  trainer_notes?: string
  homework_assigned?: string
  next_session_plan?: string
  completed: boolean
  cancelled: boolean
  cancellation_reason?: string
  cancelled_by?: string
  cancellation_fee: number
  rescheduled_from?: string
  reschedule_fee: number
  no_show: boolean
  no_show_fee: number
  late_arrival_minutes: number
  progress_photos: string[]
  created_at: string
  updated_at: string
  // Joined data
  trainer?: {
    id: string
    employee_id: string
    profile?: {
      first_name: string
      last_name: string
    }
  }
  member?: {
    id: string
    member_id: string
    profile?: {
      first_name: string
      last_name: string
    }
  }
}

export interface CreatePTSessionData {
  member_id: string
  trainer_id: string
  membership_id?: string
  session_date: string
  start_time: string
  end_time: string
  duration_minutes: number
  session_type?: string
  session_focus: string
  session_fee: number
  trainer_fee: number
  notes?: string
}

export interface UpdatePTSessionData {
  trainer_id?: string
  session_date?: string
  start_time?: string
  end_time?: string
  duration_minutes?: number
  session_type?: string
  session_focus?: string
  session_fee?: number
  trainer_fee?: number
  exercises_performed?: any[]
  member_fitness_level?: string
  session_rating?: number
  calories_burned?: number
  notes?: string
  member_feedback?: string
  trainer_notes?: string
  homework_assigned?: string
  next_session_plan?: string
  completed?: boolean
  cancelled?: boolean
  cancellation_reason?: string
  cancelled_by?: string
  cancellation_fee?: number
  no_show?: boolean
  no_show_fee?: number
  late_arrival_minutes?: number
}

export class PTService {
  static async getPTSessions(memberId: string): Promise<PTSession[]> {
    const { data, error } = await supabase
      .from('training_sessions')
      .select(`
        *,
        trainer:staff!training_sessions_trainer_id_fkey(
          id,
          employee_id,
          user_id
        ),
        member:members!training_sessions_member_id_fkey(
          id,
          member_id,
          profile_id
        )
      `)
      .eq('member_id', memberId)
      .order('session_date', { ascending: false })

    if (error) {
      console.error('Error fetching PT sessions:', error)
      throw error
    }

    // Manually fetch profile data for trainer and member
    const sessionsWithProfiles = await Promise.all(
      (data || []).map(async (session) => {
        let trainerProfile = null
        let memberProfile = null

        if (session.trainer?.user_id) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('first_name, last_name')
            .eq('user_id', session.trainer.user_id)
            .single()
          trainerProfile = profile
        }

        if (session.member?.profile_id) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('first_name, last_name')
            .eq('id', session.member.profile_id)
            .single()
          memberProfile = profile
        }

        return {
          ...session,
          trainer: session.trainer ? {
            ...session.trainer,
            profile: trainerProfile
          } : null,
          member: session.member ? {
            ...session.member,
            profile: memberProfile
          } : null
        }
      })
    )

    return sessionsWithProfiles
  }

  static async createPTSession(data: CreatePTSessionData): Promise<PTSession> {
    // Calculate session number
    const { data: existingSessions } = await supabase
      .from('training_sessions')
      .select('session_number')
      .eq('member_id', data.member_id)
      .order('session_number', { ascending: false })
      .limit(1)

    const sessionNumber = existingSessions && existingSessions.length > 0 
      ? (existingSessions[0].session_number || 0) + 1 
      : 1

    const { data: ptSession, error } = await supabase
      .from('training_sessions')
      .insert({
        ...data,
        session_number: sessionNumber,
        total_sessions: 10, // Default, can be made configurable
        session_type: data.session_type || 'personal_training',
        exercises_performed: [],
        member_fitness_level: 'beginner', // Default
        completed: false,
        cancelled: false,
        cancellation_fee: 0,
        reschedule_fee: 0,
        no_show: false,
        no_show_fee: 0,
        late_arrival_minutes: 0,
        progress_photos: []
      })
      .select(`
        *,
        trainer:staff!training_sessions_trainer_id_fkey(
          id,
          employee_id,
          user_id
        ),
        member:members!training_sessions_member_id_fkey(
          id,
          member_id,
          profile_id
        )
      `)
      .single()

    if (error) {
      console.error('Error creating PT session:', error)
      throw error
    }

    // Manually fetch profile data
    let trainerProfile = null
    let memberProfile = null

    if (ptSession.trainer?.user_id) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('user_id', ptSession.trainer.user_id)
        .single()
      trainerProfile = profile
    }

    if (ptSession.member?.profile_id) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', ptSession.member.profile_id)
        .single()
      memberProfile = profile
    }

    return {
      ...ptSession,
      trainer: ptSession.trainer ? {
        ...ptSession.trainer,
        profile: trainerProfile
      } : null,
      member: ptSession.member ? {
        ...ptSession.member,
        profile: memberProfile
      } : null
    }
  }

  static async updatePTSession(id: string, data: UpdatePTSessionData): Promise<PTSession> {
    const { data: ptSession, error } = await supabase
      .from('training_sessions')
      .update(data)
      .eq('id', id)
      .select(`
        *,
        trainer:staff!training_sessions_trainer_id_fkey(
          id,
          employee_id,
          user_id
        ),
        member:members!training_sessions_member_id_fkey(
          id,
          member_id,
          profile_id
        )
      `)
      .single()

    if (error) {
      console.error('Error updating PT session:', error)
      throw error
    }

    // Manually fetch profile data
    let trainerProfile = null
    let memberProfile = null

    if (ptSession.trainer?.user_id) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('user_id', ptSession.trainer.user_id)
        .single()
      trainerProfile = profile
    }

    if (ptSession.member?.profile_id) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', ptSession.member.profile_id)
        .single()
      memberProfile = profile
    }

    return {
      ...ptSession,
      trainer: ptSession.trainer ? {
        ...ptSession.trainer,
        profile: trainerProfile
      } : null,
      member: ptSession.member ? {
        ...ptSession.member,
        profile: memberProfile
      } : null
    }
  }

  static async deletePTSession(id: string): Promise<void> {
    const { error } = await supabase
      .from('training_sessions')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting PT session:', error)
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

  static async completeSession(id: string, data: {
    member_feedback?: string
    trainer_notes?: string
    session_rating?: number
    calories_burned?: number
    homework_assigned?: string
    next_session_plan?: string
  }): Promise<PTSession> {
    return this.updatePTSession(id, {
      ...data,
      completed: true
    })
  }

  static async cancelSession(id: string, data: {
    cancellation_reason: string
    cancelled_by: string
    cancellation_fee?: number
  }): Promise<PTSession> {
    return this.updatePTSession(id, {
      ...data,
      cancelled: true
    })
  }
}
