import { supabase } from '@/lib/supabase'
import { MembershipService } from './membershipService'
import { PaymentPlanService } from './paymentPlanService'

export interface PaymentFilters {
  gym_id?: string
  member_id?: string
  membership_id?: string
  status?: string
  payment_type?: string
  payment_method?: string
  date_from?: string
  date_to?: string
  page?: number
  limit?: number
}

export interface CreatePaymentData {
  gym_id: string
  member_id: string
  membership_id?: string
  installment_id?: string
  payment_plan_id?: string
  payment_type: string
  amount: number
  original_amount: number
  payment_method: string
  payment_date: string
  due_date?: string
  description?: string
  notes?: string
  transaction_id?: string
  receipt_number: string
}

export class PaymentService {
  // Get all payments with optional filters
  static async getPayments(filters: PaymentFilters = {}): Promise<any[]> {
    try {
      let query = supabase
        .from('payments')
        .select(`
          *,
          members!payments_member_id_fkey (
            id,
            member_id,
            status,
            profiles!profile_id (
              first_name,
              last_name,
              phone
            )
          ),
          memberships!payments_membership_id_fkey (
            id,
            status,
            start_date,
            end_date,
            membership_packages (
              id,
              name,
              package_type
            )
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

      if (filters.payment_type) {
        query = query.eq('payment_type', filters.payment_type)
      }

      if (filters.payment_method) {
        query = query.eq('payment_method', filters.payment_method)
      }

      if (filters.date_from) {
        query = query.gte('payment_date', filters.date_from)
      }

      if (filters.date_to) {
        query = query.lte('payment_date', filters.date_to)
      }

      // Apply pagination
      if (filters.page && filters.limit) {
        const from = (filters.page - 1) * filters.limit
        const to = from + filters.limit - 1
        query = query.range(from, to)
      }

      const { data, error } = await query.order('payment_date', { ascending: false })

      if (error) {
        console.error('PaymentService: Error fetching payments:', error)
        throw error
      }
      
      console.log('PaymentService: Fetched payments:', data)
      return data || []
    } catch (error) {
      console.error('Error fetching payments:', error)
      throw error
    }
  }

  // Create new payment
  static async createPayment(paymentData: CreatePaymentData): Promise<any> {
    try {
      console.log('PaymentService: Creating payment with data:', paymentData)
      
      // If this is a membership payment, check if there's an installment to pay
      if (paymentData.membership_id && paymentData.payment_type === 'membership_fee') {
        // Get member's payment plan
        const { error: memberError } = await supabase
          .from('members')
          .select('id')
          .eq('id', paymentData.member_id)
          .single()

        if (memberError) throw memberError

        // Get payment plan for this member
        const { data: paymentPlans, error: planError } = await supabase
          .from('payment_plans')
          .select('id')
          .eq('member_id', paymentData.member_id)
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(1)

        if (planError) throw planError

        if (paymentPlans && paymentPlans.length > 0) {
          // Get pending installments
          const { data: installments, error: installmentsError } = await supabase
            .from('installments')
            .select('*')
            .eq('payment_plan_id', paymentPlans[0].id)
            .eq('status', 'pending')
            .order('due_date', { ascending: true })
            .limit(1)

          if (installmentsError) throw installmentsError

          if (installments && installments.length > 0) {
            // Pay the next installment
            const installment = installments[0]
            console.log('PaymentService: Paying installment:', installment.id)
            
            await PaymentPlanService.payInstallment(installment.id, {
              paid_amount: paymentData.amount,
              payment_method: paymentData.payment_method,
              transaction_reference: paymentData.transaction_id,
              notes: paymentData.description
            })

            // Update payment data to link with installment
            paymentData.installment_id = installment.id
            paymentData.payment_plan_id = installment.payment_plan_id
          }
        }
      }

      const { data, error } = await supabase
        .from('payments')
        .insert([paymentData])
        .select()
        .single()

      if (error) {
        console.error('PaymentService: Database error:', error)
        throw error
      }
      
      console.log('PaymentService: Payment created successfully:', data)
      
      // Update membership amounts if this is a membership payment
      if (paymentData.membership_id && paymentData.payment_type === 'membership_fee') {
        await this.updateMembershipAmounts(paymentData.membership_id)
      }
      
      return data
    } catch (error) {
      console.error('PaymentService: Error creating payment:', error)
      throw error
    }
  }

  // Update membership amounts based on payments
  static async updateMembershipAmounts(membershipId: string): Promise<void> {
    try {
      console.log('PaymentService: Updating membership amounts for:', membershipId)
      
      // Get all payments for this membership
      const { data: payments, error: paymentsError } = await supabase
        .from('payments')
        .select('amount, status')
        .eq('membership_id', membershipId)
        .eq('status', 'paid')

      if (paymentsError) {
        console.error('PaymentService: Error fetching payments for membership:', paymentsError)
        throw paymentsError
      }

      // Calculate total amount paid
      const totalPaid = payments?.reduce((sum, payment) => sum + payment.amount, 0) || 0
      
      // Get current membership details
      const { data: membership, error: membershipError } = await supabase
        .from('memberships')
        .select('total_amount_due')
        .eq('id', membershipId)
        .single()

      if (membershipError) {
        console.error('PaymentService: Error fetching membership:', membershipError)
        throw membershipError
      }

      // Calculate pending amount
      const amountPending = Math.max(0, membership.total_amount_due - totalPaid)
      
      console.log('PaymentService: Updating membership amounts - Total Due:', membership.total_amount_due, 'Amount Paid:', totalPaid, 'Amount Pending:', amountPending)

      // Update membership with new amounts
      await MembershipService.updateMembership(membershipId, {
        amount_paid: totalPaid,
        amount_pending: amountPending
      })

      console.log('PaymentService: Membership amounts updated successfully')
    } catch (error) {
      console.error('PaymentService: Error updating membership amounts:', error)
      throw error
    }
  }

  // Recalculate membership amounts for all memberships (utility function)
  static async recalculateAllMembershipAmounts(gymId: string): Promise<void> {
    try {
      console.log('PaymentService: Recalculating membership amounts for gym:', gymId)
      
      // Get all active memberships for the gym
      const { data: memberships, error: membershipsError } = await supabase
        .from('memberships')
        .select('id')
        .eq('gym_id', gymId)
        .in('status', ['active', 'trial', 'pending_payment'])

      if (membershipsError) {
        console.error('PaymentService: Error fetching memberships:', membershipsError)
        throw membershipsError
      }

      // Update amounts for each membership
      for (const membership of memberships || []) {
        await this.updateMembershipAmounts(membership.id)
      }

      console.log('PaymentService: All membership amounts recalculated successfully')
    } catch (error) {
      console.error('PaymentService: Error recalculating membership amounts:', error)
      throw error
    }
  }

  // Update payment
  static async updatePayment(id: string, updates: Partial<any>): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('payments')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error updating payment:', error)
      throw error
    }
  }

  // Get payment statistics
  static async getPaymentStats(gymId: string) {
    try {
      // Total payments
      const { count: totalPayments } = await supabase
        .from('payments')
        .select('*', { count: 'exact', head: true })
        .eq('gym_id', gymId)

      // Total revenue
      const { data: revenueData } = await supabase
        .from('payments')
        .select('amount')
        .eq('gym_id', gymId)
        .eq('status', 'paid')

      const totalRevenue = revenueData?.reduce((sum, payment) => sum + payment.amount, 0) || 0

      // Pending payments
      const { count: pendingPayments } = await supabase
        .from('payments')
        .select('*', { count: 'exact', head: true })
        .eq('gym_id', gymId)
        .eq('status', 'pending')

      // This month's revenue
      const thisMonth = new Date()
      const startOfMonth = new Date(thisMonth.getFullYear(), thisMonth.getMonth(), 1)
      
      const { data: thisMonthData } = await supabase
        .from('payments')
        .select('amount')
        .eq('gym_id', gymId)
        .eq('status', 'paid')
        .gte('payment_date', startOfMonth.toISOString().split('T')[0])

      const thisMonthRevenue = thisMonthData?.reduce((sum, payment) => sum + payment.amount, 0) || 0

      return {
        total_payments: totalPayments || 0,
        total_revenue: totalRevenue,
        pending_payments: pendingPayments || 0,
        this_month_revenue: thisMonthRevenue
      }
    } catch (error) {
      console.error('Error fetching payment stats:', error)
      throw error
    }
  }
}