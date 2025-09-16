import { supabase } from '@/lib/supabase'

export interface AttendanceFilters {
  gym_id?: string
  member_id?: string
  date_from?: string
  date_to?: string
  status?: 'checked_in' | 'checked_out' | 'auto_checkout' | 'all'
  package_type?: string
  search?: string
}

export class AttendanceService {
  // Get attendance records with filters
  static async getAttendance(filters: AttendanceFilters = {}) {
    try {
      let query = supabase
        .from('member_attendance')
        .select(`
          *,
          member:members!member_attendance_member_id_fkey (
            member_id,
            status,
            gym_id,
            profiles!profile_id (
              first_name,
              last_name,
              phone
            )
          ),
          membership:memberships!member_attendance_membership_id_fkey (
            status,
            membership_packages!package_id (
              name,
              package_type
            )
          )
        `)

      // Apply gym filter
      if (filters.gym_id) {
        query = query.eq('member.gym_id', filters.gym_id)
      }

      // Apply member filter
      if (filters.member_id) {
        query = query.eq('member_id', filters.member_id)
      }

      // Apply date filters
      if (filters.date_from) {
        query = query.gte('date', filters.date_from)
      }
      if (filters.date_to) {
        query = query.lte('date', filters.date_to)
      }

      // Order by check-in time (latest first)
      query = query.order('check_in_time', { ascending: false })

      const { data, error } = await query

      if (error) throw error

      let filteredData = data || []

      // Apply status filter (client-side for complex logic)
      if (filters.status && filters.status !== 'all') {
        switch (filters.status) {
          case 'checked_in':
            filteredData = filteredData.filter(a => !a.check_out_time)
            break
          case 'checked_out':
            filteredData = filteredData.filter(a => a.check_out_time && !a.auto_checkout)
            break
          case 'auto_checkout':
            filteredData = filteredData.filter(a => a.auto_checkout)
            break
        }
      }

      // Apply package type filter
      if (filters.package_type && filters.package_type !== 'all') {
        filteredData = filteredData.filter(a => 
          a.membership?.membership_packages?.package_type === filters.package_type
        )
      }

      // Apply search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase()
        filteredData = filteredData.filter(a => 
          a.member?.profiles?.first_name?.toLowerCase().includes(searchLower) ||
          a.member?.profiles?.last_name?.toLowerCase().includes(searchLower) ||
          a.member?.member_id?.toLowerCase().includes(searchLower) ||
          a.member?.profiles?.phone?.includes(filters.search)
        )
      }

      return filteredData
    } catch (error) {
      console.error('Error fetching attendance:', error)
      throw error
    }
  }

  // Process attendance (check-in or check-out)
  static async processAttendance(memberCode: string) {
    try {
      // Parse QR code JSON if it looks like JSON, otherwise use as direct member ID
      let actualMemberId = memberCode.trim()
      let expectedGymId: string | null = null
      
      try {
        // Check if the input is JSON (QR code data)
        const qrData = JSON.parse(memberCode)
        if (qrData.type === 'gym_attendance' && qrData.member_id) {
          actualMemberId = qrData.member_id
          expectedGymId = qrData.gym_id
          console.log('Parsed QR code:', qrData)
        }
      } catch (e) {
        // Not JSON, treat as direct member ID
        console.log('Using direct member ID:', actualMemberId)
      }

      // First, check if member exists at all (without status filter)
      const { data: allMembers, error: searchError } = await supabase
        .from('members')
        .select('member_id, status, gym_id')
        .eq('member_id', actualMemberId)

      console.log('Member search results:', { 
        actualMemberId, 
        foundMembers: allMembers,
        searchError: searchError?.message 
      })

      if (searchError) {
        return {
          success: false,
          message: `Database error: ${searchError.message}`
        }
      }

      if (!allMembers || allMembers.length === 0) {
        return {
          success: false,
          message: `Member ID "${actualMemberId}" not found in database. Please check your member ID.`
        }
      }

      const foundMember = allMembers[0]
      
      if (foundMember.status !== 'active') {
        return {
          success: false,
          message: `Member "${actualMemberId}" exists but is ${foundMember.status}. Please contact reception.`
        }
      }

      // Validate gym ID if QR code provided one
      if (expectedGymId && foundMember.gym_id !== expectedGymId) {
        return {
          success: false,
          message: `QR code is for a different gym. This member belongs to gym ${foundMember.gym_id} but QR code is for gym ${expectedGymId}.`
        }
      }

      // Now get the full member details with memberships
      const { data: member, error: memberError } = await supabase
        .from('members')
        .select(`
          id,
          member_id,
          status,
          gym_id,
          profiles!profile_id (
            first_name,
            last_name,
            phone
          ),
          memberships!memberships_member_id_fkey (
            id,
            status,
            start_date,
            end_date,
            membership_packages (
              name,
              package_type
            )
          )
        `)
        .eq('member_id', actualMemberId)
        .eq('status', 'active')
        .single()

      if (memberError || !member) {
        console.log('Member details lookup failed:', { 
          actualMemberId, 
          error: memberError?.message
        })
        return {
          success: false,
          message: `Error loading member details: ${memberError?.message || 'Unknown error'}`
        }
      }

      // Check if member has active membership
      const activeMembership = member.memberships.find((m: any) => 
        m.status === 'active' && 
        new Date(m.end_date) >= new Date()
      )

      if (!activeMembership) {
        return {
          success: false,
          message: 'No active membership found. Please contact reception.',
          member
        }
      }

      // Check if already checked in today
      const today = new Date().toISOString().split('T')[0]
      const { data: todayAttendance } = await supabase
        .from('member_attendance')
        .select('*')
        .eq('member_id', member.id)
        .eq('date', today)
        .order('check_in_time', { ascending: false })
        .limit(1)

      const lastAttendance = todayAttendance?.[0]
      let action: 'check_in' | 'check_out' = 'check_in'
      let attendanceData: any

      if (lastAttendance && !lastAttendance.check_out_time) {
        // Member is checked in, perform checkout
        action = 'check_out'
        const { data: updatedAttendance, error: updateError } = await supabase
          .from('member_attendance')
          .update({
            check_out_time: new Date().toISOString(),
            auto_checkout: false
          })
          .eq('id', lastAttendance.id)
          .select()
          .single()

        if (updateError) throw updateError
        attendanceData = updatedAttendance
      } else {
        // Perform check in
        action = 'check_in'
        const { data: newAttendance, error: insertError } = await supabase
          .from('member_attendance')
          .insert([{
            gym_id: member.gym_id,
            member_id: member.id,
            membership_id: activeMembership.id,
            check_in_time: new Date().toISOString(),
            date: today,
            auto_checkout: false
          }])
          .select()
          .single()

        if (insertError) throw insertError
        attendanceData = newAttendance
      }

      return {
        success: true,
        member,
        membership: activeMembership,
        action,
        message: action === 'check_in' 
          ? `Welcome ${member.profiles.first_name}! Check-in successful.`
          : `Goodbye ${member.profiles.first_name}! Check-out successful.`,
        attendance: attendanceData
      }

    } catch (error) {
      console.error('Error processing attendance:', error)
      return {
        success: false,
        message: 'Error processing attendance. Please try again or contact reception.'
      }
    }
  }

  // Get attendance statistics
  static async getAttendanceStats(gymId: string) {
    try {
      const today = new Date().toISOString().split('T')[0]
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

      // Get all attendance for the gym
      const { data: allAttendance, error } = await supabase
        .from('member_attendance')
        .select(`
          *,
          member:members!member_attendance_member_id_fkey (
            gym_id
          )
        `)
        .eq('member.gym_id', gymId)
        .gte('date', monthAgo)

      if (error) throw error

      const attendanceData = allAttendance || []

      // Calculate stats
      const todayAttendance = attendanceData.filter(a => a.date === today)
      const yesterdayAttendance = attendanceData.filter(a => a.date === yesterday)
      const weekAttendance = attendanceData.filter(a => a.date >= weekAgo)
      const monthAttendance = attendanceData

      const stats = {
        todayTotal: todayAttendance.length,
        todayCheckedIn: todayAttendance.filter(a => !a.check_out_time).length,
        yesterdayTotal: yesterdayAttendance.length,
        weekTotal: weekAttendance.length,
        monthTotal: monthAttendance.length,
        averageDaily: Math.round(weekAttendance.length / 7),
        autoCheckouts: todayAttendance.filter(a => a.auto_checkout).length,
        peakHour: this.calculatePeakHour(todayAttendance)
      }

      return stats
    } catch (error) {
      console.error('Error getting attendance stats:', error)
      throw error
    }
  }

  // Calculate peak hour from attendance data
  private static calculatePeakHour(attendanceData: any[]) {
    const hourCounts: { [key: string]: number } = {}
    
    attendanceData.forEach(record => {
      if (record.check_in_time) {
        const hour = new Date(record.check_in_time).getHours()
        const hourKey = `${hour}:00`
        hourCounts[hourKey] = (hourCounts[hourKey] || 0) + 1
      }
    })

    let peakHour = '9:00'
    let maxCount = 0
    
    Object.entries(hourCounts).forEach(([hour, count]) => {
      if (count > maxCount) {
        maxCount = count
        peakHour = hour
      }
    })

    return peakHour
  }

  // Run auto-checkout for members who forgot to check out
  static async runAutoCheckout(gymId: string) {
    try {
      // Get all checked-in members from yesterday or earlier
      const cutoffTime = new Date()
      cutoffTime.setDate(cutoffTime.getDate() - 1)
      cutoffTime.setHours(23, 59, 59, 999)
      
      const { data: pendingCheckouts, error } = await supabase
        .from('member_attendance')
        .select(`
          *,
          member:members!member_attendance_member_id_fkey (
            gym_id
          )
        `)
        .eq('member.gym_id', gymId)
        .is('check_out_time', null)
        .lt('check_in_time', cutoffTime.toISOString())

      if (error) throw error

      if (pendingCheckouts && pendingCheckouts.length > 0) {
        // Auto checkout all pending
        const checkoutTime = cutoffTime.toISOString()
        
        const { error: updateError } = await supabase
          .from('member_attendance')
          .update({
            check_out_time: checkoutTime,
            auto_checkout: true
          })
          .in('id', pendingCheckouts.map(p => p.id))

        if (updateError) throw updateError

        return {
          success: true,
          count: pendingCheckouts.length,
          message: `Auto-checkout completed for ${pendingCheckouts.length} members`
        }
      } else {
        return {
          success: true,
          count: 0,
          message: 'No pending checkouts found'
        }
      }
    } catch (error) {
      console.error('Error running auto-checkout:', error)
      throw error
    }
  }

  // Generate QR code data for a member
  static generateMemberQRData(member: any) {
    return {
      type: 'gym_member',
      member_id: member.member_id,
      gym_id: member.gym_id,
      generated_at: new Date().toISOString()
    }
  }

  // Manual check-out for admin
  static async manualCheckout(attendanceId: string, reason?: string) {
    try {
      const { data: updatedAttendance, error } = await supabase
        .from('member_attendance')
        .update({
          check_out_time: new Date().toISOString(),
          auto_checkout: false,
          notes: reason ? `Manual checkout: ${reason}` : 'Manual checkout by admin'
        })
        .eq('id', attendanceId)
        .select()
        .single()

      if (error) throw error

      return {
        success: true,
        attendance: updatedAttendance,
        message: 'Member checked out successfully'
      }
    } catch (error) {
      console.error('Error with manual checkout:', error)
      throw error
    }
  }
}
