import { supabase } from '@/lib/supabase'

export interface CreatePaymentPlanData {
  gym_id: string
  member_id: string
  total_amount: number
  down_payment: number
  remaining_amount: number
  number_of_installments: number
  installment_amount: number
  installment_frequency: 'weekly' | 'monthly' | 'quarterly'
  first_installment_date: string
  last_installment_date: string
  late_fee_percentage?: number
  grace_period_days?: number
}

export interface PaymentPlan {
  id: string
  gym_id: string
  member_id: string
  total_amount: number
  down_payment: number
  remaining_amount: number
  number_of_installments: number
  installment_amount: number
  installment_frequency: string
  first_installment_date: string
  last_installment_date: string
  late_fee_percentage: number
  grace_period_days: number
  status: string
  created_at: string
  updated_at: string
}

export interface Installment {
  id: string
  payment_plan_id: string
  installment_number: number
  amount: number
  due_date: string
  paid_date?: string
  paid_amount: number
  late_fee: number
  status: 'pending' | 'paid' | 'overdue' | 'cancelled' | 'adjusted'
  payment_method?: string
  transaction_reference?: string
  notes?: string
  created_at: string
  updated_at: string
}

export class PaymentPlanService {
  // Create payment plan
  static async createPaymentPlan(planData: CreatePaymentPlanData): Promise<PaymentPlan> {
    try {
      console.log('PaymentPlanService: Creating payment plan:', planData)
      
      const { data, error } = await supabase
        .from('payment_plans')
        .insert([planData])
        .select()
        .single()

      if (error) {
        console.error('PaymentPlanService: Error creating payment plan:', error)
        throw error
      }

      console.log('PaymentPlanService: Payment plan created successfully:', data)
      return data
    } catch (error) {
      console.error('PaymentPlanService: Error creating payment plan:', error)
      throw error
    }
  }

  // Get payment plan by ID
  static async getPaymentPlan(id: string): Promise<PaymentPlan | null> {
    try {
      const { data, error } = await supabase
        .from('payment_plans')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error fetching payment plan:', error)
      throw error
    }
  }

  // Get installments for a payment plan
  static async getInstallments(paymentPlanId: string): Promise<Installment[]> {
    try {
      const { data, error } = await supabase
        .from('installments')
        .select('*')
        .eq('payment_plan_id', paymentPlanId)
        .order('installment_number', { ascending: true })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching installments:', error)
      throw error
    }
  }

  // Get installments for a member
  static async getMemberInstallments(memberId: string): Promise<Installment[]> {
    try {
      const { data, error } = await supabase
        .from('installments')
        .select(`
          *,
          payment_plans!inner(
            member_id
          )
        `)
        .eq('payment_plans.member_id', memberId)
        .order('due_date', { ascending: true })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching member installments:', error)
      throw error
    }
  }

  // Pay installment
  static async payInstallment(
    installmentId: string, 
    paymentData: {
      paid_amount: number
      payment_method: string
      transaction_reference?: string
      notes?: string
    }
  ): Promise<Installment> {
    try {
      console.log('PaymentPlanService: Paying installment:', installmentId, paymentData)
      
      // Get installment details
      const { data: installment, error: fetchError } = await supabase
        .from('installments')
        .select('*')
        .eq('id', installmentId)
        .single()

      if (fetchError) throw fetchError

      // Calculate if payment is late
      const dueDate = new Date(installment.due_date)
      const today = new Date()
      const isLate = today > dueDate

      // Calculate late fee if applicable
      let lateFee = 0
      if (isLate) {
        const { data: planData, error: planError } = await supabase
          .from('payment_plans')
          .select('late_fee_percentage, grace_period_days')
          .eq('id', installment.payment_plan_id)
          .single()

        if (planError) throw planError

        const gracePeriod = planData.grace_period_days || 7
        const daysLate = Math.max(0, Math.ceil((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)) - gracePeriod)
        
        if (daysLate > 0) {
          lateFee = (installment.amount * planData.late_fee_percentage) / 100
        }
      }

      // Update installment
      const { data, error } = await supabase
        .from('installments')
        .update({
          paid_date: new Date().toISOString().split('T')[0],
          paid_amount: paymentData.paid_amount,
          late_fee: lateFee,
          status: paymentData.paid_amount >= installment.amount ? 'paid' : 'adjusted',
          payment_method: paymentData.payment_method,
          transaction_reference: paymentData.transaction_reference,
          notes: paymentData.notes
        })
        .eq('id', installmentId)
        .select()
        .single()

      if (error) throw error

      // Update payment plan remaining amount
      await this.updatePaymentPlanRemainingAmount(installment.payment_plan_id)

      console.log('PaymentPlanService: Installment paid successfully:', data)
      return data
    } catch (error) {
      console.error('PaymentPlanService: Error paying installment:', error)
      throw error
    }
  }

  // Update payment plan remaining amount
  static async updatePaymentPlanRemainingAmount(paymentPlanId: string): Promise<void> {
    try {
      // Get total paid amount from installments
      const { data: installments, error: installmentsError } = await supabase
        .from('installments')
        .select('paid_amount')
        .eq('payment_plan_id', paymentPlanId)

      if (installmentsError) throw installmentsError

      const totalPaid = installments?.reduce((sum, inst) => sum + (inst.paid_amount || 0), 0) || 0

      // Get payment plan details
      const { data: plan, error: planError } = await supabase
        .from('payment_plans')
        .select('total_amount, down_payment')
        .eq('id', paymentPlanId)
        .single()

      if (planError) throw planError

      const remainingAmount = plan.total_amount - plan.down_payment - totalPaid

      // Update payment plan
      const { error: updateError } = await supabase
        .from('payment_plans')
        .update({
          remaining_amount: Math.max(0, remainingAmount),
          status: remainingAmount <= 0 ? 'completed' : 'active'
        })
        .eq('id', paymentPlanId)

      if (updateError) throw updateError

      console.log('PaymentPlanService: Payment plan remaining amount updated:', remainingAmount)
    } catch (error) {
      console.error('PaymentPlanService: Error updating payment plan remaining amount:', error)
      throw error
    }
  }

  // Get payment plan summary for a member
  static async getMemberPaymentSummary(memberId: string): Promise<{
    totalAmount: number
    downPayment: number
    paidAmount: number
    remainingAmount: number
    nextDueDate?: string
    nextDueAmount?: number
    overdueAmount: number
    totalInstallments: number
    paidInstallments: number
    pendingInstallments: number
  }> {
    try {
      // Get payment plans for member
      const { data: plans, error: plansError } = await supabase
        .from('payment_plans')
        .select('*')
        .eq('member_id', memberId)
        .eq('status', 'active')

      if (plansError) throw plansError

      if (!plans || plans.length === 0) {
        return {
          totalAmount: 0,
          downPayment: 0,
          paidAmount: 0,
          remainingAmount: 0,
          overdueAmount: 0,
          totalInstallments: 0,
          paidInstallments: 0,
          pendingInstallments: 0
        }
      }

      const plan = plans[0] // Assuming one active plan per member

      // Get installments
      const installments = await this.getInstallments(plan.id)

      const paidInstallments = installments.filter(inst => inst.status === 'paid')
      const pendingInstallments = installments.filter(inst => inst.status === 'pending')
      const overdueInstallments = installments.filter(inst => {
        const dueDate = new Date(inst.due_date)
        const today = new Date()
        return inst.status === 'pending' && today > dueDate
      })

      const paidAmount = paidInstallments.reduce((sum, inst) => sum + inst.paid_amount, 0)
      const overdueAmount = overdueInstallments.reduce((sum, inst) => sum + inst.amount, 0)

      // Find next due installment
      const nextDue = pendingInstallments
        .filter(inst => {
          const dueDate = new Date(inst.due_date)
          const today = new Date()
          return dueDate >= today
        })
        .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())[0]

      return {
        totalAmount: plan.total_amount,
        downPayment: plan.down_payment,
        paidAmount: paidAmount,
        remainingAmount: plan.remaining_amount,
        nextDueDate: nextDue?.due_date,
        nextDueAmount: nextDue?.amount,
        overdueAmount: overdueAmount,
        totalInstallments: plan.number_of_installments,
        paidInstallments: paidInstallments.length,
        pendingInstallments: pendingInstallments.length
      }
    } catch (error) {
      console.error('Error getting member payment summary:', error)
      throw error
    }
  }
}
