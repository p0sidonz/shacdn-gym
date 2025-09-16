import { supabase } from '@/lib/supabase'

export class AutoCheckoutService {
  private static instance: AutoCheckoutService
  private intervalId: NodeJS.Timeout | null = null

  static getInstance(): AutoCheckoutService {
    if (!AutoCheckoutService.instance) {
      AutoCheckoutService.instance = new AutoCheckoutService()
    }
    return AutoCheckoutService.instance
  }

  // Start the auto-checkout service (runs every hour)
  start() {
    if (this.intervalId) {
      console.log('Auto-checkout service is already running')
      return
    }

    console.log('Starting auto-checkout service...')
    
    // Run immediately on start
    this.runAutoCheckout()
    
    // Then run every hour
    this.intervalId = setInterval(() => {
      this.runAutoCheckout()
    }, 60 * 60 * 1000) // 1 hour in milliseconds
  }

  // Stop the auto-checkout service
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
      console.log('Auto-checkout service stopped')
    }
  }

  // Run auto-checkout for all gyms
  private async runAutoCheckout() {
    try {
      console.log('Running auto-checkout at:', new Date().toISOString())
      
      // Check if it's late enough (after 11:59 PM) or early morning (before 6 AM)
      const now = new Date()
      const hour = now.getHours()
      
      // Only run auto-checkout between midnight and 6 AM, or if it's past 11:30 PM
      if (!(hour >= 0 && hour < 6) && hour < 23) {
        console.log('Not time for auto-checkout yet, current hour:', hour)
        return
      }

      // Get all unique gym IDs from members
      const { data: gyms, error: gymsError } = await supabase
        .from('gyms')
        .select('id')

      if (gymsError) {
        console.error('Error fetching gyms:', gymsError)
        return
      }

      if (!gyms || gyms.length === 0) {
        console.log('No gyms found')
        return
      }

      // Run auto-checkout for each gym
      for (const gym of gyms) {
        await this.runAutoCheckoutForGym(gym.id)
      }

    } catch (error) {
      console.error('Error in auto-checkout service:', error)
    }
  }

  // Run auto-checkout for a specific gym
  async runAutoCheckoutForGym(gymId: string) {
    try {
      console.log(`Running auto-checkout for gym: ${gymId}`)

      // Calculate cutoff time (yesterday 11:59 PM)
      const cutoffTime = new Date()
      cutoffTime.setDate(cutoffTime.getDate() - 1)
      cutoffTime.setHours(23, 59, 59, 999)

      // Find all members who are still checked in from before the cutoff time
      const { data: pendingCheckouts, error: fetchError } = await supabase
        .from('member_attendance')
        .select(`
          id,
          member_id,
          check_in_time,
          member:members!member_attendance_member_id_fkey (
            member_id,
            gym_id,
            profiles!profile_id (
              first_name,
              last_name
            )
          )
        `)
        .eq('member.gym_id', gymId)
        .is('check_out_time', null)
        .lt('check_in_time', cutoffTime.toISOString())

      if (fetchError) {
        console.error(`Error fetching pending checkouts for gym ${gymId}:`, fetchError)
        return
      }

      if (!pendingCheckouts || pendingCheckouts.length === 0) {
        console.log(`No pending checkouts found for gym ${gymId}`)
        return
      }

      console.log(`Found ${pendingCheckouts.length} pending checkouts for gym ${gymId}`)

      // Auto checkout all pending members
      const { error: updateError } = await supabase
        .from('member_attendance')
        .update({
          check_out_time: cutoffTime.toISOString(),
          auto_checkout: true
        })
        .in('id', pendingCheckouts.map(p => p.id))

      if (updateError) {
        console.error(`Error updating attendance for gym ${gymId}:`, updateError)
        return
      }

      console.log(`Auto-checkout completed for ${pendingCheckouts.length} members in gym ${gymId}`)

      // Log the auto-checkout for audit purposes
      const auditData = {
        gym_id: gymId,
        action: 'auto_checkout',
        affected_count: pendingCheckouts.length,
        cutoff_time: cutoffTime.toISOString(),
        executed_at: new Date().toISOString(),
        details: pendingCheckouts.map(p => ({
          member_id: p.member?.member_id,
          name: `${p.member?.profiles?.first_name} ${p.member?.profiles?.last_name}`,
          check_in_time: p.check_in_time
        }))
      }

      // You could store this audit log in a separate table if needed
      console.log('Auto-checkout audit:', auditData)

    } catch (error) {
      console.error(`Error in auto-checkout for gym ${gymId}:`, error)
    }
  }

  // Manual trigger for auto-checkout (can be called from admin UI)
  async triggerManualAutoCheckout(gymId: string) {
    try {
      await this.runAutoCheckoutForGym(gymId)
      return {
        success: true,
        message: 'Auto-checkout completed successfully'
      }
    } catch (error) {
      console.error('Error in manual auto-checkout:', error)
      return {
        success: false,
        message: 'Error running auto-checkout: ' + (error instanceof Error ? error.message : 'Unknown error')
      }
    }
  }

  // Get auto-checkout statistics
  async getAutoCheckoutStats(gymId: string, days: number = 7) {
    try {
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)

      const { data: autoCheckouts, error } = await supabase
        .from('member_attendance')
        .select(`
          id,
          check_in_time,
          check_out_time,
          member:members!member_attendance_member_id_fkey (
            gym_id
          )
        `)
        .eq('member.gym_id', gymId)
        .eq('auto_checkout', true)
        .gte('check_out_time', startDate.toISOString())

      if (error) throw error

      const stats = {
        total_auto_checkouts: autoCheckouts?.length || 0,
        daily_average: Math.round((autoCheckouts?.length || 0) / days),
        last_7_days: autoCheckouts || []
      }

      return stats
    } catch (error) {
      console.error('Error getting auto-checkout stats:', error)
      throw error
    }
  }
}

// Export singleton instance
export const autoCheckoutService = AutoCheckoutService.getInstance()

// Auto-start the service when the module is imported
// Note: In a production environment, you might want to start this from a more controlled location
if (typeof window !== 'undefined') {
  // Only start in browser environment
  autoCheckoutService.start()
}
