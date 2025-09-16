import { supabase } from '@/lib/supabase'

export interface RefundFilters {
  gym_id?: string
  member_id?: string
  membership_id?: string
  status?: string
  date_from?: string
  date_to?: string
  page?: number
  limit?: number
}

export interface CreateRefundRequestData {
  gym_id: string
  member_id: string
  membership_id: string
  original_payment_id?: string
  refund_type: string
  requested_amount: number
  eligible_amount: number
  reason: string
  member_comments?: string
}

export class RefundService {
  // Get all refund requests with optional filters
  static async getRefundRequests(filters: RefundFilters = {}): Promise<any[]> {
    try {
      let query = supabase
        .from('refund_requests')
        .select(`
          *,
          members!refund_requests_member_id_fkey (
            id,
            member_id,
            status,
            profiles!profile_id (
              first_name,
              last_name,
              phone
            )
          ),
          memberships!refund_requests_membership_id_fkey (
            id,
            status,
            start_date,
            end_date,
            membership_packages (
              id,
              name,
              package_type
            )
          ),
          original_payment:payments!refund_requests_original_payment_id_fkey (
            id,
            amount,
            payment_date,
            payment_method
          )
        `)

      // Apply filters
      if (filters.gym_id) {
        query = query.eq('gym_id', filters.gym_id)
      }

      if (filters.member_id) {
        query = query.eq('member_id', filters.member_id)
      }

      if (filters.membership_id) {
        query = query.eq('membership_id', filters.membership_id)
      }

      if (filters.status) {
        query = query.eq('status', filters.status)
      }

      if (filters.date_from) {
        query = query.gte('request_date', filters.date_from)
      }

      if (filters.date_to) {
        query = query.lte('request_date', filters.date_to)
      }

      // Apply pagination
      if (filters.page && filters.limit) {
        const from = (filters.page - 1) * filters.limit
        const to = from + filters.limit - 1
        query = query.range(from, to)
      }

      const { data, error } = await query.order('request_date', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching refund requests:', error)
      throw error
    }
  }

  // Create new refund request
  static async createRefundRequest(refundData: CreateRefundRequestData): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('refund_requests')
        .insert([refundData])
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error creating refund request:', error)
      throw error
    }
  }

  // Update refund request
  static async updateRefundRequest(id: string, updates: Partial<any>): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('refund_requests')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error updating refund request:', error)
      throw error
    }
  }

  // Process refund request
  static async processRefundRequest(
    id: string, 
    processData: {
      approved_amount: number
      processing_fee: number
      final_refund_amount: number
      refund_method: string
      transaction_reference: string
      admin_comments: string
    }
  ): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('refund_requests')
        .update({
          status: 'processed',
          processed_date: new Date().toISOString().split('T')[0],
          ...processData
        })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error processing refund request:', error)
      throw error
    }
  }

  // Get refund statistics
  static async getRefundStats(gymId: string) {
    try {
      // Total refund requests
      const { count: totalRequests } = await supabase
        .from('refund_requests')
        .select('*', { count: 'exact', head: true })
        .eq('gym_id', gymId)

      // Pending requests
      const { count: pendingRequests } = await supabase
        .from('refund_requests')
        .select('*', { count: 'exact', head: true })
        .eq('gym_id', gymId)
        .eq('status', 'requested')

      // Total refunded amount
      const { data: refundedData } = await supabase
        .from('refund_requests')
        .select('final_refund_amount')
        .eq('gym_id', gymId)
        .eq('status', 'processed')

      const totalRefunded = refundedData?.reduce((sum, refund) => sum + (refund.final_refund_amount || 0), 0) || 0

      // This month's refunds
      const thisMonth = new Date()
      const startOfMonth = new Date(thisMonth.getFullYear(), thisMonth.getMonth(), 1)
      
      const { data: thisMonthData } = await supabase
        .from('refund_requests')
        .select('final_refund_amount')
        .eq('gym_id', gymId)
        .eq('status', 'processed')
        .gte('processed_date', startOfMonth.toISOString().split('T')[0])

      const thisMonthRefunds = thisMonthData?.reduce((sum, refund) => sum + (refund.final_refund_amount || 0), 0) || 0

      return {
        total_requests: totalRequests || 0,
        pending_requests: pendingRequests || 0,
        total_refunded: totalRefunded,
        this_month_refunds: thisMonthRefunds
      }
    } catch (error) {
      console.error('Error fetching refund stats:', error)
      throw error
    }
  }
}
