import { supabase } from '@/lib/supabase'

export interface IncomeFilters {
  gym_id?: string
  payment_type?: string
  date_from?: string
  date_to?: string
  member_id?: string
}

export interface IncomeStats {
  totalIncome: number
  membershipIncome: number
  ptIncome: number
  addonIncome: number
  penaltyIncome: number
  setupFeeIncome: number
  transferFeeIncome: number
  upgradeFeeIncome: number
  dailyIncome: { date: string; amount: number }[]
  categoryBreakdown: Record<string, number>
  topPayingMembers: Array<{
    member_id: string
    member_name: string
    total_paid: number
    payment_count: number
  }>
}

export class IncomeService {
  // Get all income from payments
  static async getIncome(filters: IncomeFilters = {}) {
    try {
      let query = supabase
        .from('payments')
        .select(`
          id,
          amount,
          payment_date,
          payment_method,
          payment_type,
          status,
          description,
          transaction_id,
          created_at,
          member:members!payments_member_id_fkey (
            member_id,
            profiles!profile_id (
              first_name,
              last_name
            )
          ),
          membership:memberships!payments_membership_id_fkey (
            membership_packages!package_id (
              name,
              package_type
            )
          )
        `)
        .eq('status', 'paid') // Only count paid payments as income

      // Apply gym filter through member relationship
      if (filters.gym_id) {
        query = query.eq('member.gym_id', filters.gym_id)
      }

      // Apply payment type filter
      if (filters.payment_type) {
        query = query.eq('payment_type', filters.payment_type)
      }

      // Apply member filter
      if (filters.member_id) {
        query = query.eq('member_id', filters.member_id)
      }

      // Apply date filters
      if (filters.date_from) {
        query = query.gte('payment_date', filters.date_from)
      }
      if (filters.date_to) {
        query = query.lte('payment_date', filters.date_to)
      }

      // Order by date (latest first)
      query = query.order('payment_date', { ascending: false })

      const { data, error } = await query

      if (error) throw error

      return data || []
    } catch (error) {
      console.error('Error fetching income:', error)
      throw error
    }
  }

  // Get comprehensive income statistics
  static async getIncomeStats(gymId: string, dateFrom?: string, dateTo?: string): Promise<IncomeStats> {
    try {
      const incomeData = await this.getIncome({
        gym_id: gymId,
        date_from: dateFrom,
        date_to: dateTo
      })

      // Calculate total income
      const totalIncome = incomeData.reduce((sum, payment) => {
        return sum + parseFloat(payment.amount)
      }, 0)

      // Calculate income by payment type
      const categoryBreakdown = incomeData.reduce((acc, payment) => {
        const type = payment.payment_type || 'other'
        if (!acc[type]) {
          acc[type] = 0
        }
        acc[type] += parseFloat(payment.amount)
        return acc
      }, {} as Record<string, number>)

      // Extract specific categories
      const membershipIncome = categoryBreakdown['membership_fee'] || 0
      const ptIncome = categoryBreakdown['personal_training'] || 0
      const addonIncome = categoryBreakdown['addon_service'] || 0
      const penaltyIncome = categoryBreakdown['penalty'] || 0
      const setupFeeIncome = categoryBreakdown['setup_fee'] || 0
      const transferFeeIncome = categoryBreakdown['transfer_fee'] || 0
      const upgradeFeeIncome = categoryBreakdown['upgrade_fee'] || 0

      // Calculate daily income
      const dailyIncomeMap = incomeData.reduce((acc, payment) => {
        const date = payment.payment_date
        if (!acc[date]) {
          acc[date] = 0
        }
        acc[date] += parseFloat(payment.amount)
        return acc
      }, {} as Record<string, number>)

      const dailyIncome = Object.entries(dailyIncomeMap)
        .map(([date, amount]) => ({ date, amount }))
        .sort((a, b) => a.date.localeCompare(b.date))

      // Calculate top paying members
      const memberIncomeMap = incomeData.reduce((acc, payment) => {
        const memberId = payment.member?.member_id || 'Unknown'
        const memberName = payment.member?.profiles 
          ? `${payment.member.profiles.first_name} ${payment.member.profiles.last_name}`
          : 'Unknown Member'
        
        if (!acc[memberId]) {
          acc[memberId] = {
            member_id: memberId,
            member_name: memberName,
            total_paid: 0,
            payment_count: 0
          }
        }
        
        acc[memberId].total_paid += parseFloat(payment.amount)
        acc[memberId].payment_count += 1
        
        return acc
      }, {} as Record<string, any>)

      const topPayingMembers = Object.values(memberIncomeMap)
        .sort((a: any, b: any) => b.total_paid - a.total_paid)
        .slice(0, 10) // Top 10 paying members

      return {
        totalIncome,
        membershipIncome,
        ptIncome,
        addonIncome,
        penaltyIncome,
        setupFeeIncome,
        transferFeeIncome,
        upgradeFeeIncome,
        dailyIncome,
        categoryBreakdown,
        topPayingMembers
      }
    } catch (error) {
      console.error('Error getting income stats:', error)
      throw error
    }
  }

  // Get monthly income comparison
  static async getMonthlyIncomeComparison(gymId: string, months: number = 12) {
    try {
      const monthsAgo = new Date()
      monthsAgo.setMonth(monthsAgo.getMonth() - months)
      
      const incomeData = await this.getIncome({
        gym_id: gymId,
        date_from: monthsAgo.toISOString().split('T')[0]
      })

      // Group by month
      const monthlyIncome = incomeData.reduce((acc, payment) => {
        const date = new Date(payment.payment_date)
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        
        if (!acc[monthKey]) {
          acc[monthKey] = 0
        }
        acc[monthKey] += parseFloat(payment.amount)
        
        return acc
      }, {} as Record<string, number>)

      // Convert to array and sort
      const monthlyData = Object.entries(monthlyIncome)
        .map(([month, amount]) => ({ month, amount }))
        .sort((a, b) => a.month.localeCompare(b.month))

      return monthlyData
    } catch (error) {
      console.error('Error getting monthly income comparison:', error)
      throw error
    }
  }

  // Get income vs target analysis
  static async getIncomeVsTarget(gymId: string, targetAmount: number, dateFrom: string, dateTo: string) {
    try {
      const stats = await this.getIncomeStats(gymId, dateFrom, dateTo)
      
      const actualIncome = stats.totalIncome
      const targetAchievement = (actualIncome / targetAmount) * 100
      const gap = targetAmount - actualIncome
      
      return {
        targetAmount,
        actualIncome,
        targetAchievement,
        gap,
        isTargetMet: actualIncome >= targetAmount
      }
    } catch (error) {
      console.error('Error getting income vs target:', error)
      throw error
    }
  }

  // Get income growth rate
  static async getIncomeGrowthRate(gymId: string, currentPeriodFrom: string, currentPeriodTo: string) {
    try {
      // Calculate current period income
      const currentStats = await this.getIncomeStats(gymId, currentPeriodFrom, currentPeriodTo)
      
      // Calculate previous period (same duration)
      const currentStart = new Date(currentPeriodFrom)
      const currentEnd = new Date(currentPeriodTo)
      const periodDuration = currentEnd.getTime() - currentStart.getTime()
      
      const previousEnd = new Date(currentStart.getTime() - 1) // One day before current period
      const previousStart = new Date(previousEnd.getTime() - periodDuration)
      
      const previousStats = await this.getIncomeStats(
        gymId,
        previousStart.toISOString().split('T')[0],
        previousEnd.toISOString().split('T')[0]
      )
      
      const growthRate = previousStats.totalIncome > 0 
        ? ((currentStats.totalIncome - previousStats.totalIncome) / previousStats.totalIncome) * 100
        : 0
      
      return {
        currentIncome: currentStats.totalIncome,
        previousIncome: previousStats.totalIncome,
        growthRate,
        growthAmount: currentStats.totalIncome - previousStats.totalIncome
      }
    } catch (error) {
      console.error('Error calculating income growth rate:', error)
      throw error
    }
  }
}

