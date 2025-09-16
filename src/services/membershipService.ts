import { supabase } from '@/lib/supabase'
import { PaymentPlanService } from './paymentPlanService'
import { type Membership, type MembershipChange } from '@/types'

export interface MembershipFilters {
  member_id?: string
  status?: string
  package_id?: string
  is_trial?: boolean
  start_date_from?: string
  start_date_to?: string
  end_date_from?: string
  end_date_to?: string
  page?: number
  limit?: number
}

export interface CreateMembershipData {
  member_id: string
  package_id: string
  payment_plan_id?: string
  discount_code_id?: string
  start_date: string
  end_date: string
  original_amount: number
  discount_applied?: number
  setup_fee_paid?: number
  security_deposit_paid?: number
  total_amount_due: number
  amount_paid?: number
  is_trial?: boolean
  auto_renew?: boolean
  addon_services?: any[]
  pt_sessions_remaining?: number
}

export class MembershipService {
  // Get all memberships with optional filters
  static async getMemberships(filters: MembershipFilters = {}): Promise<Membership[]> {
    try {
      let query = supabase
        .from('memberships')
        .select(`
          *,
          members!memberships_member_id_fkey (
            id,
            member_id,
            status,
            profiles!profile_id (
              first_name,
              last_name,
              phone
            )
          ),
          membership_packages (
            id,
            name,
            package_type,
            duration_days,
            price,
            features
          ),
          payment_plans (
            id,
            number_of_installments,
            installment_frequency
          ),
          discount_codes (
            id,
            code,
            discount_type,
            discount_value
          )
        `)

      // Apply filters
      if (filters.member_id) {
        query = query.eq('member_id', filters.member_id)
      }

      if (filters.status) {
        query = query.eq('status', filters.status)
      }

      if (filters.package_id) {
        query = query.eq('package_id', filters.package_id)
      }

      if (filters.is_trial !== undefined) {
        query = query.eq('is_trial', filters.is_trial)
      }

      if (filters.start_date_from) {
        query = query.gte('start_date', filters.start_date_from)
      }

      if (filters.start_date_to) {
        query = query.lte('start_date', filters.start_date_to)
      }

      if (filters.end_date_from) {
        query = query.gte('end_date', filters.end_date_from)
      }

      if (filters.end_date_to) {
        query = query.lte('end_date', filters.end_date_to)
      }

      // Apply pagination
      if (filters.page && filters.limit) {
        const from = (filters.page - 1) * filters.limit
        const to = from + filters.limit - 1
        query = query.range(from, to)
      }

      const { data, error } = await query.order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching memberships:', error)
      throw error
    }
  }

  // Get membership by ID
  static async getMembershipById(id: string): Promise<Membership | null> {
    try {
      const { data, error } = await supabase
        .from('memberships')
        .select(`
          *,
          members!memberships_member_id_fkey (
            id,
            member_id,
            status,
            profiles!profile_id (
              first_name,
              last_name,
              phone
            )
          ),
          membership_packages (
            id,
            name,
            package_type,
            duration_days,
            price,
            features
          ),
          payment_plans (
            id,
            number_of_installments,
            installment_frequency
          ),
          discount_codes (
            id,
            code,
            discount_type,
            discount_value
          )
        `)
        .eq('id', id)
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error fetching membership:', error)
      throw error
    }
  }

  // Create new membership
  static async createMembership(membershipData: CreateMembershipData): Promise<Membership> {
    try {
      console.log('MembershipService: Creating membership:', membershipData)
      
      const { data, error } = await supabase
        .from('memberships')
        .insert([membershipData])
        .select()
        .single()

      if (error) throw error

      // Don't create payment plan automatically
      // Let the user decide when to create payment plans
      console.log('MembershipService: Membership created without automatic payment plan')

      return data
    } catch (error) {
      console.error('Error creating membership:', error)
      throw error
    }
  }

  // Update membership
  static async updateMembership(id: string, updates: Partial<Membership>): Promise<Membership> {
    try {
      const { data, error } = await supabase
        .from('memberships')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error updating membership:', error)
      throw error
    }
  }

  // Cancel membership
  static async cancelMembership(
    id: string, 
    cancellationData: {
      cancellation_date: string
      cancellation_reason: string
      cancellation_notice_period?: number
      refund_eligible_amount?: number
    }
  ): Promise<Membership> {
    try {
      const { data, error } = await supabase
        .from('memberships')
        .update({
          status: 'cancelled',
          ...cancellationData
        })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error cancelling membership:', error)
      throw error
    }
  }

  // Freeze membership
  static async freezeMembership(
    id: string,
    freezeData: {
      freeze_start_date: string
      freeze_end_date: string
      freeze_reason: string
      freeze_days_used: number
    }
  ): Promise<Membership> {
    try {
      const { data, error } = await supabase
        .from('memberships')
        .update({
          status: 'frozen',
          ...freezeData
        })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error freezing membership:', error)
      throw error
    }
  }

  // Unfreeze membership
  static async unfreezeMembership(id: string): Promise<Membership> {
    try {
      const { data, error } = await supabase
        .from('memberships')
        .update({
          status: 'active',
          freeze_start_date: null,
          freeze_end_date: null,
          freeze_reason: null
        })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error unfreezing membership:', error)
      throw error
    }
  }

  // Upgrade/Downgrade membership
  static async changeMembership(
    membershipId: string,
    newPackageId: string,
    changeData: {
      change_type: 'upgrade' | 'downgrade'
      reason: string
      amount_difference: number
      adjustment_amount: number
      additional_payment?: number
      refund_amount?: number
      prorated_amount?: number
      remaining_days?: number
      new_trainer_id?: string
    }
  ): Promise<{ oldMembership: Membership; newMembership: Membership; change: MembershipChange }> {
    try {
      // Get current membership
      const currentMembership = await this.getMembershipById(membershipId)
      if (!currentMembership) throw new Error('Membership not found')

      // Get new package details
      const { data: newPackage } = await supabase
        .from('membership_packages')
        .select('*')
        .eq('id', newPackageId)
        .single()

      if (!newPackage) throw new Error('New package not found')

      // Calculate new end date based on remaining days
      const remainingDays = changeData.remaining_days || 0
      const newEndDate = new Date()
      newEndDate.setDate(newEndDate.getDate() + remainingDays)

      // Create new membership
      const newMembershipData: CreateMembershipData = {
        member_id: currentMembership.member_id,
        package_id: newPackageId,
        payment_plan_id: currentMembership.payment_plan_id,
        start_date: new Date().toISOString().split('T')[0],
        end_date: newEndDate.toISOString().split('T')[0],
        original_amount: newPackage.price,
        total_amount_due: changeData.additional_payment || 0,
        amount_paid: changeData.additional_payment || 0,
        is_trial: false,
        auto_renew: currentMembership.auto_renew,
        addon_services: currentMembership.addon_services,
        pt_sessions_remaining: newPackage.pt_sessions_included
      }

      const newMembership = await this.createMembership(newMembershipData)

      // Update old membership status
      const oldMembership = await this.updateMembership(membershipId, {
        status: changeData.change_type === 'upgrade' ? 'upgraded' : 'downgraded',
        actual_end_date: new Date().toISOString().split('T')[0]
      })

      // Record the change
      const { data: changeRecord, error: changeError } = await supabase
        .from('membership_changes')
        .insert([{
          member_id: currentMembership.member_id,
          from_membership_id: membershipId,
          to_membership_id: newMembership.id,
          change_type: changeData.change_type,
          change_date: new Date().toISOString().split('T')[0],
          amount_difference: changeData.amount_difference,
          adjustment_amount: changeData.adjustment_amount,
          additional_payment: changeData.additional_payment,
          refund_amount: changeData.refund_amount,
          reason: changeData.reason,
          remaining_days: changeData.remaining_days,
          prorated_amount: changeData.prorated_amount,
          new_trainer_id: changeData.new_trainer_id
        }])
        .select()
        .single()

      if (changeError) throw changeError

      return {
        oldMembership,
        newMembership,
        change: changeRecord
      }
    } catch (error) {
      console.error('Error changing membership:', error)
      throw error
    }
  }

  // Transfer membership
  static async transferMembership(
    membershipId: string,
    toMemberId: string,
    transferData: {
      transfer_fee_paid: number
      reason: string
    }
  ): Promise<{ updatedMembership: Membership; change: MembershipChange }> {
    try {
      // Get current membership
      const currentMembership = await this.getMembershipById(membershipId)
      if (!currentMembership) throw new Error('Membership not found')

      // Update membership with transfer details
      const updatedMembership = await this.updateMembership(membershipId, {
        member_id: toMemberId,
        status: 'transferred',
        transferred_to_member_id: toMemberId,
        transfer_fee_paid: transferData.transfer_fee_paid
      })

      // Record the transfer
      const { data: changeRecord, error: changeError } = await supabase
        .from('membership_changes')
        .insert([{
          member_id: currentMembership.member_id,
          from_membership_id: membershipId,
          change_type: 'transfer',
          change_date: new Date().toISOString().split('T')[0],
          reason: transferData.reason,
          additional_payment: transferData.transfer_fee_paid
        }])
        .select()
        .single()

      if (changeError) throw changeError

      return {
        updatedMembership,
        change: changeRecord
      }
    } catch (error) {
      console.error('Error transferring membership:', error)
      throw error
    }
  }

  // Get membership changes history
  static async getMembershipChanges(memberId: string): Promise<MembershipChange[]> {
    try {
      const { data, error } = await supabase
        .from('membership_changes')
        .select(`
          *,
          from_membership:from_membership_id (
            id,
            membership_packages (
              name,
              package_type
            )
          ),
          to_membership:to_membership_id (
            id,
            membership_packages (
              name,
              package_type
            )
          ),
          old_trainer:old_trainer_id (
            id,
            employee_id,
            profiles!profile_id (
              first_name,
              last_name
            )
          ),
          new_trainer:new_trainer_id (
            id,
            employee_id,
            profiles!profile_id (
              first_name,
              last_name
            )
          )
        `)
        .eq('member_id', memberId)
        .order('change_date', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching membership changes:', error)
      throw error
    }
  }

  // Get expiring memberships
  static async getExpiringMemberships(days: number = 30): Promise<Membership[]> {
    try {
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + days)

      const { data, error } = await supabase
        .from('memberships')
        .select(`
          *,
          members!memberships_member_id_fkey (
            id,
            member_id,
            profiles!profile_id (
              first_name,
              last_name,
              phone
            )
          ),
          membership_packages (
            id,
            name,
            package_type
          )
        `)
        .eq('status', 'active')
        .lte('end_date', futureDate.toISOString().split('T')[0])
        .order('end_date', { ascending: true })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching expiring memberships:', error)
      throw error
    }
  }

  // Get trial memberships
  static async getTrialMemberships(): Promise<Membership[]> {
    try {
      const { data, error } = await supabase
        .from('memberships')
        .select(`
          *,
          members!memberships_member_id_fkey (
            id,
            member_id,
            profiles!profile_id (
              first_name,
              last_name,
              phone
            )
          ),
          membership_packages (
            id,
            name,
            package_type
          )
        `)
        .eq('is_trial', true)
        .eq('status', 'trial')
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching trial memberships:', error)
      throw error
    }
  }

  // Convert trial to full membership
  static async convertTrialMembership(
    membershipId: string,
    conversionData: {
      new_package_id: string
      trial_conversion_discount: number
      payment_plan_id?: string
    }
  ): Promise<Membership> {
    try {
      const { data, error } = await supabase
        .from('memberships')
        .update({
          package_id: conversionData.new_package_id,
          payment_plan_id: conversionData.payment_plan_id,
          is_trial: false,
          trial_converted_date: new Date().toISOString().split('T')[0],
          trial_conversion_discount: conversionData.trial_conversion_discount,
          status: 'active'
        })
        .eq('id', membershipId)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error converting trial membership:', error)
      throw error
    }
  }

  // Create payment plan for existing membership
  static async createPaymentPlanForMembership(membershipId: string): Promise<void> {
    try {
      // Get membership details
      const membership = await this.getMembershipById(membershipId)
      if (!membership) throw new Error('Membership not found')

      // Check if payment plan already exists
      if (membership.payment_plan_id) {
        console.log('Payment plan already exists for this membership')
        return
      }

      // Only create for non-trial memberships with amount due
      if (membership.is_trial || membership.total_amount_due <= 0) {
        console.log('Skipping payment plan creation for trial membership or zero amount')
        return
      }

      // Get gym_id from member
      const { data: memberData } = await supabase
        .from('members')
        .select('gym_id')
        .eq('id', membership.member_id)
        .single()

      if (!memberData) {
        throw new Error('Member not found')
      }

      // Calculate installment details
      const totalAmount = membership.total_amount_due
      const downPayment = membership.amount_paid || 0
      const remainingAmount = totalAmount - downPayment
      
      // Default to monthly installments
      const numberOfInstallments = 12
      const installmentAmount = remainingAmount / numberOfInstallments
      
      // Calculate dates
      const startDate = new Date(membership.start_date)
      const firstInstallmentDate = new Date(startDate)
      firstInstallmentDate.setMonth(firstInstallmentDate.getMonth() + 1) // First installment after 1 month
      
      const lastInstallmentDate = new Date(firstInstallmentDate)
      lastInstallmentDate.setMonth(lastInstallmentDate.getMonth() + numberOfInstallments - 1)

      const paymentPlanData = {
        gym_id: memberData.gym_id,
        member_id: membership.member_id,
        total_amount: totalAmount,
        down_payment: downPayment,
        remaining_amount: remainingAmount,
        number_of_installments: numberOfInstallments,
        installment_amount: Math.round(installmentAmount * 100) / 100,
        installment_frequency: 'monthly' as const,
        first_installment_date: firstInstallmentDate.toISOString().split('T')[0],
        last_installment_date: lastInstallmentDate.toISOString().split('T')[0],
        late_fee_percentage: 2.0,
        grace_period_days: 7
      }

      const paymentPlan = await PaymentPlanService.createPaymentPlan(paymentPlanData)
      
      // Update membership with payment plan ID
      await this.updateMembership(membershipId, {
        payment_plan_id: paymentPlan.id
      })

      console.log('Payment plan created successfully for existing membership')
    } catch (error) {
      console.error('Error creating payment plan for membership:', error)
      throw error
    }
  }

  // Get membership statistics
  static async getMembershipStats(gymId: string) {
    try {
      // Get total active memberships - join with members to filter by gym_id
      const { count: totalActive } = await supabase
        .from('memberships')
        .select('*, members!inner(gym_id)', { count: 'exact', head: true })
        .eq('members.gym_id', gymId)
        .eq('status', 'active')

      // Get trial memberships
      const { count: trialMemberships } = await supabase
        .from('memberships')
        .select('*, members!inner(gym_id)', { count: 'exact', head: true })
        .eq('members.gym_id', gymId)
        .eq('is_trial', true)

      // Get expiring memberships (next 30 days)
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 30)
      const { count: expiringMemberships } = await supabase
        .from('memberships')
        .select('*, members!inner(gym_id)', { count: 'exact', head: true })
        .eq('members.gym_id', gymId)
        .eq('status', 'active')
        .lte('end_date', futureDate.toISOString().split('T')[0])

      // Get total revenue from memberships
      const { data: revenueData } = await supabase
        .from('memberships')
        .select('amount_paid, members!inner(gym_id)')
        .eq('members.gym_id', gymId)

      const totalRevenue = revenueData?.reduce((sum, membership) => sum + membership.amount_paid, 0) || 0

      return {
        total_active: totalActive || 0,
        trial_memberships: trialMemberships || 0,
        expiring_memberships: expiringMemberships || 0,
        total_revenue: totalRevenue
      }
    } catch (error) {
      console.error('Error fetching membership stats:', error)
      throw error
    }
  }
}
