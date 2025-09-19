import { supabase } from '@/lib/supabase'

export type ActivityAction =
  | 'create'
  | 'update'
  | 'delete'
  | 'status_change'
  | 'assign'
  | 'unassign'
  | 'login'
  | 'logout'
  | 'payment'
  | 'refund'

export interface CreateActivityLog {
  gym_id: string
  actor_user_id?: string | null
  actor_profile_id?: string | null
  resource_type: string
  resource_id: string
  action: ActivityAction
  description?: string
  before_data?: any
  after_data?: any
}

export interface FetchActivityLogs {
  gym_id: string
  resource_type?: string
  resource_id?: string
  actor_user_id?: string
  from?: string // ISO date
  to?: string   // ISO date
  limit?: number
}

export class ActivityLogService {
  static async createLog(payload: CreateActivityLog) {
    const { error } = await supabase.from('activity_logs').insert({
      gym_id: payload.gym_id,
      actor_user_id: payload.actor_user_id ?? null,
      actor_profile_id: payload.actor_profile_id ?? null,
      resource_type: payload.resource_type,
      resource_id: payload.resource_id,
      action: payload.action,
      description: payload.description,
      before_data: payload.before_data ?? null,
      after_data: payload.after_data ?? null,
    })
    if (error) throw error
  }

  static async fetchLogs(params: FetchActivityLogs) {
    let query = supabase
      .from('activity_logs')
      .select('*')
      .eq('gym_id', params.gym_id)
      .order('created_at', { ascending: false })

    if (params.resource_type) query = query.eq('resource_type', params.resource_type)
    if (params.resource_id) query = query.eq('resource_id', params.resource_id)
    if (params.actor_user_id) query = query.eq('actor_user_id', params.actor_user_id)
    if (params.from) query = query.gte('created_at', params.from)
    if (params.to) query = query.lte('created_at', params.to)
    if (params.limit) query = query.limit(params.limit)

    const { data, error } = await query
    if (error) throw error
    return data ?? []
  }
}
