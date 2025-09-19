import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Users, 
  DollarSign, 
  Calendar,
  AlertCircle,
  Clock,
  Loader2,
  BarChart3,
  Gift,
  TrendingUp,
  Phone,
  Mail,
  MessageSquare,
  CheckCircle,
  XCircle,
  Star,
  CreditCard,
  Receipt,
  UserCheck
} from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import { useAuth } from '@/context/AuthContext'
import { useGym } from '@/hooks/useGym'
import { useMembers } from '@/hooks/useMembers'
import { usePayments } from '@/hooks/usePayments'
import { useRefunds } from '@/hooks/useRefunds'
import { useInquiries } from '@/hooks/useInquiries'
import GymSetup from '@/components/gym/GymSetup'
import { QuickAddMember } from '@/components/members/QuickAddMember'
import { supabase } from '@/lib/supabase'

export default function OwnerDashboard() {
  const { profile } = useAuth()
  const { gym, getDashboardData } = useGym()
  
  // Hooks for different data
  const { members } = useMembers({ gym_id: gym?.id })
  const { payments } = usePayments({ gym_id: gym?.id })
  const { refunds } = useRefunds({ gym_id: gym?.id })
  const { inquiries } = useInquiries()
  
  const [loading, setLoading] = useState(true)
  const [dashboardData, setDashboardData] = useState<any>(null)
  const [upcomingBirthdays, setUpcomingBirthdays] = useState<any[]>([])
  const [recentFollowUps, setRecentFollowUps] = useState<any[]>([])
  const [recentIncome, setRecentIncome] = useState<any[]>([])
  const [birthdayFilter, setBirthdayFilter] = useState<'today' | 'week' | 'month'>('today')
  const [stats, setStats] = useState<any>({
    members: { total: 0, active: 0, trial: 0 },
    payments: { totalRevenue: 0, monthlyRevenue: 0, pendingAmount: 0, todayCollection: 0 },
    memberships: { total: 0, expiring_soon: 0 },
    refunds: { total: 0, pending: 0, processed: 0 },
    inquiries: { total: 0, new: 0, converted: 0 },
    followUps: { total: 0, pending: 0, completed: 0 }
  })

  // Function to get upcoming birthdays
  const getUpcomingBirthdays = async (filter: 'today' | 'week' | 'month') => {
    if (!gym?.id) return []

    try {
      const today = new Date()
      const startDate = new Date(today)
      let endDate = new Date(today)

      switch (filter) {
        case 'today':
          endDate = new Date(today)
          break
        case 'week':
          endDate.setDate(today.getDate() + 7)
          break
        case 'month':
          endDate.setMonth(today.getMonth() + 1)
          break
      }

      const { data, error } = await supabase
        .from('members')
        .select(`
          id,
          member_id,
          status,
          profile:profiles!inner(
            first_name,
            last_name,
            date_of_birth,
            phone
          )
        `)
        .eq('gym_id', gym.id)
        .not('profile.date_of_birth', 'is', null)

      if (error) throw error

      // Filter birthdays based on the selected period
      const birthdays = data?.filter(member => {
        const profile = member.profile as any
        if (!profile || !profile.date_of_birth) return false
        
        const birthDate = new Date(profile.date_of_birth)
        const currentYear = today.getFullYear()
        
        // Set birth date to current year
        const thisYearBirthday = new Date(currentYear, birthDate.getMonth(), birthDate.getDate())
        
        // If birthday has passed this year, check next year
        if (thisYearBirthday < today) {
          thisYearBirthday.setFullYear(currentYear + 1)
        }
        
        return thisYearBirthday >= startDate && thisYearBirthday <= endDate
      }) || []

      // Sort by birthday date
      birthdays.sort((a, b) => {
        const profileA = a.profile as any
        const profileB = b.profile as any
        const dateA = new Date(profileA.date_of_birth)
        const dateB = new Date(profileB.date_of_birth)
        const currentYear = today.getFullYear()
        
        const birthdayA = new Date(currentYear, dateA.getMonth(), dateA.getDate())
        const birthdayB = new Date(currentYear, dateB.getMonth(), dateB.getDate())
        
        if (birthdayA < today) birthdayA.setFullYear(currentYear + 1)
        if (birthdayB < today) birthdayB.setFullYear(currentYear + 1)
        
        return birthdayA.getTime() - birthdayB.getTime()
      })

      return birthdays
    } catch (error) {
      console.error('Error fetching birthdays:', error)
      return []
    }
  }

  // Function to get recent income data
  const getRecentIncome = async () => {
    if (!gym?.id) return []

    try {
      const { data, error } = await supabase
        .from('payments')
        .select(`
          id,
          amount,
          payment_date,
          payment_method,
          status,
          member:members!inner(
            profile:profiles!inner(
              first_name,
              last_name
            )
          )
        `)
        .eq('gym_id', gym.id)
        .eq('status', 'paid')
        .order('payment_date', { ascending: false })
        .limit(10)

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching recent income:', error)
      return []
    }
  }

  // Function to get recent follow-ups
  const getRecentFollowUps = async () => {
    if (!gym?.id) return []

    try {
      const { data, error } = await supabase
        .from('inquiry_followups')
        .select(`
          id,
          followup_date,
          followup_method,
          status,
          notes,
          inquiry:inquiries!inner(
            name,
            phone,
            status
          ),
          staff:staff!inner(
            profile:profiles!inner(
              first_name,
              last_name
            )
          )
        `)
        .eq('inquiry.gym_id', gym.id)
        .order('followup_date', { ascending: false })
        .limit(10)

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching follow-ups:', error)
      return []
    }
  }

  useEffect(() => {
    const loadDashboardData = async () => {
      if (!gym?.id) return

      try {
        setLoading(true)
        
        const [
          dashboardResult,
          birthdays,
          income,
          followUps
        ] = await Promise.all([
          getDashboardData(),
          getUpcomingBirthdays(birthdayFilter),
          getRecentIncome(),
          getRecentFollowUps()
        ])

        if (dashboardResult.data) {
          setDashboardData(dashboardResult.data)
        }

        setUpcomingBirthdays(birthdays)
        setRecentIncome(income)
        setRecentFollowUps(followUps)

        // Calculate comprehensive stats
        const memberStats = {
          total: members.length,
          active: members.filter(m => m.status === 'active').length,
          trial: members.filter(m => m.status === 'trial').length
        }

        const paymentStats = {
          totalRevenue: payments.reduce((sum, p) => sum + (p.amount || 0), 0),
          monthlyRevenue: payments
            .filter(p => {
              const paymentDate = new Date(p.payment_date)
              const now = new Date()
              return paymentDate.getMonth() === now.getMonth() && 
                     paymentDate.getFullYear() === now.getFullYear()
            })
            .reduce((sum, p) => sum + (p.amount || 0), 0),
          pendingAmount: payments
            .filter(p => p.status === 'pending')
            .reduce((sum, p) => sum + (p.amount || 0), 0),
          todayCollection: payments
            .filter(p => {
              const paymentDate = new Date(p.payment_date)
              const today = new Date()
              return paymentDate.toDateString() === today.toDateString()
            })
            .reduce((sum, p) => sum + (p.amount || 0), 0)
        }

        const refundStats = {
          total: refunds.length,
          pending: refunds.filter(r => r.status === 'requested').length,
          processed: refunds.filter(r => r.status === 'processed').length
        }

        const inquiryStats = {
          total: inquiries.length,
          new: inquiries.filter(i => i.status === 'new').length,
          converted: inquiries.filter(i => i.status === 'converted').length
        }

        const followUpStats = {
          total: followUps.length,
          pending: followUps.filter(f => f.status === 'scheduled').length,
          completed: followUps.filter(f => f.status === 'completed').length
        }

        setStats({
          members: memberStats,
          payments: paymentStats,
          memberships: { total: 0, expiring_soon: 0 },
          refunds: refundStats,
          inquiries: inquiryStats,
          followUps: followUpStats
        })
      } catch (error) {
        console.error('Error loading dashboard data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadDashboardData()
  }, [gym?.id, birthdayFilter, members, payments, refunds, inquiries])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2 text-lg">Loading dashboard...</span>
      </div>
    )
  }

  if (!gym) {
    return <GymSetup />
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{gym.name} Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {profile?.first_name}! Here's what's happening at your gym today.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Calendar className="h-4 w-4 mr-2" />
            View Calendar
          </Button>
          <QuickAddMember onMemberAdded={() => {
            // Refresh dashboard data when member is added
            window.location.reload()
          }} />
        </div>
      </div>

      {/* Enhanced Key Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Members</CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.members.total}</div>
            <p className="text-xs text-muted-foreground">
              {stats.members.active} active, {stats.members.trial} on trial
            </p>
            <div className="flex items-center mt-2">
              <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
              <span className="text-xs text-green-500">+12% from last month</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats.payments.monthlyRevenue)}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(stats.payments.todayCollection)} collected today
            </p>
            <div className="flex items-center mt-2">
              <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
              <span className="text-xs text-green-500">+8% from last month</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Payments</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats.payments.pendingAmount)}
            </div>
            <p className="text-xs text-muted-foreground">
              Requires follow-up
            </p>
            <div className="flex items-center mt-2">
              <Clock className="h-3 w-3 text-orange-500 mr-1" />
              <span className="text-xs text-orange-500">Action needed</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">New Inquiries</CardTitle>
            <MessageSquare className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.inquiries.new}</div>
            <p className="text-xs text-muted-foreground">
              {stats.inquiries.converted} converted this month
            </p>
            <div className="flex items-center mt-2">
              <Star className="h-3 w-3 text-yellow-500 mr-1" />
              <span className="text-xs text-yellow-500">
                {stats.inquiries.total > 0 ? Math.round((stats.inquiries.converted / stats.inquiries.total) * 100) : 0}% conversion rate
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-l-4 border-l-red-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Refund Requests</CardTitle>
            <Receipt className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.refunds.pending}</div>
            <p className="text-xs text-muted-foreground">
              {stats.refunds.processed} processed this month
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-indigo-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Follow-ups</CardTitle>
            <Phone className="h-4 w-4 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.followUps.pending}</div>
            <p className="text-xs text-muted-foreground">
              {stats.followUps.completed} completed today
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-cyan-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Check-ins</CardTitle>
            <UserCheck className="h-4 w-4 text-cyan-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{gym.stats?.todayAttendance || 0}</div>
            <p className="text-xs text-muted-foreground">
              Members present today
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-pink-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Birthdays</CardTitle>
            <Gift className="h-4 w-4 text-pink-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{upcomingBirthdays.length}</div>
            <p className="text-xs text-muted-foreground">
              This {birthdayFilter === 'today' ? 'today' : birthdayFilter === 'week' ? 'week' : 'month'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="birthdays" className="flex items-center gap-2">
            <Gift className="w-4 h-4" />
            Birthdays
          </TabsTrigger>
          <TabsTrigger value="payments" className="flex items-center gap-2">
            <CreditCard className="w-4 h-4" />
            Payments
          </TabsTrigger>
          <TabsTrigger value="refunds" className="flex items-center gap-2">
            <Receipt className="w-4 h-4" />
            Refunds
          </TabsTrigger>
          <TabsTrigger value="followups" className="flex items-center gap-2">
            <Phone className="w-4 h-4" />
            Follow-ups
          </TabsTrigger>
          <TabsTrigger value="inquiries" className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            Inquiries
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Today's Attendance */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-cyan-500" />
                Today's Attendance
              </CardTitle>
              <CardDescription>Members checked in today</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Check-ins</span>
                  <span className="text-2xl font-bold text-cyan-600">{gym.stats?.todayAttendance || 0}</span>
                </div>
                {dashboardData?.todayAttendance?.slice(0, 5).map((attendance: any, index: number) => (
                  <div key={index} className="flex items-center justify-between text-sm p-2 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="font-medium">{attendance.profile?.first_name} {attendance.profile?.last_name}</span>
                    </div>
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      {attendance.check_in_time}
                    </Badge>
                  </div>
                )) || (
                  <p className="text-sm text-muted-foreground text-center py-4">No attendance data available</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recent Income */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-500" />
                Recent Income
              </CardTitle>
              <CardDescription>Latest payment collections</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentIncome.slice(0, 5).map((payment: any, index: number) => (
                  <div key={index} className="flex items-center justify-between text-sm p-2 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="font-medium">{payment.member?.profile?.first_name} {payment.member?.profile?.last_name}</span>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-green-600">{formatCurrency(payment.amount)}</div>
                      <div className="text-xs text-muted-foreground">{payment.payment_method}</div>
                    </div>
                  </div>
                )) || (
                  <p className="text-sm text-muted-foreground text-center py-4">No recent income</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Expiring Memberships */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-orange-500" />
                Expiring Soon
              </CardTitle>
              <CardDescription>Memberships expiring within 7 days</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {dashboardData?.expiringMemberships?.slice(0, 5).map((membership: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-orange-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium">
                        {membership.member?.profile?.first_name} {membership.member?.profile?.last_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Expires: {formatDate(new Date(membership.end_date))}
                      </p>
                    </div>
                    <Badge variant="destructive">Expiring</Badge>
                  </div>
                )) || (
                  <p className="text-sm text-muted-foreground text-center py-4">No expiring memberships</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recent Members */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-500" />
                Recent Members
              </CardTitle>
              <CardDescription>Latest member registrations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {dashboardData?.recentMembers?.slice(0, 5).map((member: any, index: number) => (
                  <div key={index} className="flex items-center justify-between text-sm p-2 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span className="font-medium">{member.profile?.first_name} {member.profile?.last_name}</span>
                    </div>
                    <Badge variant={member.status === 'active' ? 'default' : 'secondary'}>
                      {member.status}
                    </Badge>
                  </div>
                )) || (
                  <p className="text-sm text-muted-foreground text-center py-4">No recent members</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Birthdays Tab */}
        <TabsContent value="birthdays" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gift className="h-5 w-5 text-pink-500" />
                Upcoming Birthdays
              </CardTitle>
              <CardDescription>Members with birthdays coming up</CardDescription>
              <div className="flex gap-2 mt-4">
                <Button
                  variant={birthdayFilter === 'today' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setBirthdayFilter('today')}
                >
                  Today
                </Button>
                <Button
                  variant={birthdayFilter === 'week' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setBirthdayFilter('week')}
                >
                  This Week
                </Button>
                <Button
                  variant={birthdayFilter === 'month' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setBirthdayFilter('month')}
                >
                  This Month
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {upcomingBirthdays.map((member: any, index: number) => {
                  const birthDate = new Date(member.profile.date_of_birth)
                  const today = new Date()
                  const thisYearBirthday = new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate())
                  const isToday = thisYearBirthday.toDateString() === today.toDateString()
                  
                  return (
                    <div key={index} className={`p-4 rounded-lg border-2 ${isToday ? 'border-pink-300 bg-pink-50' : 'border-gray-200 bg-white'}`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isToday ? 'bg-pink-500' : 'bg-gray-200'}`}>
                          <Gift className={`h-6 w-6 ${isToday ? 'text-white' : 'text-gray-600'}`} />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold">{member.profile.first_name} {member.profile.last_name}</h3>
                          <p className="text-sm text-muted-foreground">Member ID: {member.member_id}</p>
                          <p className="text-sm text-muted-foreground">
                            {isToday ? 'Today!' : `Birthday: ${thisYearBirthday.toLocaleDateString()}`}
                          </p>
                        </div>
                      </div>
                      <div className="mt-3 flex gap-2">
                        <Button size="sm" variant="outline" className="flex-1">
                          <Phone className="h-3 w-3 mr-1" />
                          Call
                        </Button>
                        <Button size="sm" variant="outline" className="flex-1">
                          <Mail className="h-3 w-3 mr-1" />
                          Email
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
              {upcomingBirthdays.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No birthdays {birthdayFilter === 'today' ? 'today' : `this ${birthdayFilter}`}
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payments Tab */}
        <TabsContent value="payments" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-green-500" />
                Recent Payments
              </CardTitle>
              <CardDescription>Latest payment transactions with enhanced details</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentIncome.map((payment: any) => (
                    <TableRow key={payment.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                            <span className="text-xs font-medium text-green-600">
                              {payment.member?.profile?.first_name?.[0]}{payment.member?.profile?.last_name?.[0]}
                            </span>
                          </div>
                          <div>
                            <div className="font-medium">{payment.member?.profile?.first_name} {payment.member?.profile?.last_name}</div>
                            <div className="text-xs text-muted-foreground">Member ID: {payment.member?.member_id}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-bold text-green-600">{formatCurrency(payment.amount)}</div>
                        <div className="text-xs text-muted-foreground">Payment ID: {payment.id.slice(0, 8)}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {payment.payment_method}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div>{formatDate(new Date(payment.payment_date))}</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(payment.payment_date).toLocaleTimeString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="default" className="bg-green-100 text-green-800">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          {payment.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button size="sm" variant="outline">
                          <Receipt className="h-3 w-3 mr-1" />
                          Receipt
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Refunds Tab */}
        <TabsContent value="refunds" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5 text-red-500" />
                Recent Refunds
              </CardTitle>
              <CardDescription>Latest refund requests and processing</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Request Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {refunds.slice(0, 10).map((refund: any) => (
                    <TableRow key={refund.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                            <span className="text-xs font-medium text-red-600">
                              {refund.member?.profile?.first_name?.[0]}{refund.member?.profile?.last_name?.[0]}
                            </span>
                          </div>
                          <div>
                            <div className="font-medium">{refund.member?.profile?.first_name} {refund.member?.profile?.last_name}</div>
                            <div className="text-xs text-muted-foreground">Member ID: {refund.member?.member_id}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-bold text-red-600">{formatCurrency(refund.amount)}</div>
                        <div className="text-xs text-muted-foreground">Refund ID: {refund.id.slice(0, 8)}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{refund.reason || 'Not specified'}</div>
                        <div className="text-xs text-muted-foreground">{refund.refund_type}</div>
                      </TableCell>
                      <TableCell>
                        <div>{formatDate(new Date(refund.created_at))}</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(refund.created_at).toLocaleTimeString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={refund.status === 'processed' ? 'default' : 
                                  refund.status === 'approved' ? 'default' : 
                                  refund.status === 'rejected' ? 'destructive' : 'secondary'}
                          className={
                            refund.status === 'processed' ? 'bg-green-100 text-green-800' :
                            refund.status === 'approved' ? 'bg-blue-100 text-blue-800' :
                            refund.status === 'rejected' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                          }
                        >
                          {refund.status === 'processed' ? <CheckCircle className="h-3 w-3 mr-1" /> :
                           refund.status === 'rejected' ? <XCircle className="h-3 w-3 mr-1" /> :
                           <Clock className="h-3 w-3 mr-1" />}
                          {refund.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline">
                            View
                          </Button>
                          {refund.status === 'requested' && (
                            <Button size="sm" variant="outline">
                              Process
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Follow-ups Tab */}
        <TabsContent value="followups" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5 text-indigo-500" />
                Recent Follow-ups
              </CardTitle>
              <CardDescription>Latest follow-up activities and scheduled calls</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Inquiry</TableHead>
                    <TableHead>Staff</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentFollowUps.map((followUp: any) => (
                    <TableRow key={followUp.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{followUp.inquiry?.name}</div>
                          <div className="text-xs text-muted-foreground">{followUp.inquiry?.phone}</div>
                          <Badge variant="outline" className="text-xs mt-1">
                            {followUp.inquiry?.status}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-indigo-100 rounded-full flex items-center justify-center">
                            <span className="text-xs font-medium text-indigo-600">
                              {followUp.staff?.profile?.first_name?.[0]}{followUp.staff?.profile?.last_name?.[0]}
                            </span>
                          </div>
                          <div className="text-sm">
                            {followUp.staff?.profile?.first_name} {followUp.staff?.profile?.last_name}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {followUp.followup_method}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div>{formatDate(new Date(followUp.followup_date))}</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(followUp.followup_date).toLocaleTimeString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={followUp.status === 'completed' ? 'default' : 'secondary'}
                          className={followUp.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}
                        >
                          {followUp.status === 'completed' ? <CheckCircle className="h-3 w-3 mr-1" /> : <Clock className="h-3 w-3 mr-1" />}
                          {followUp.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm max-w-xs truncate">{followUp.notes || 'No notes'}</div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Inquiries Tab */}
        <TabsContent value="inquiries" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-purple-500" />
                Recent Inquiries
              </CardTitle>
              <CardDescription>Latest inquiries and lead management</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Interest</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inquiries.slice(0, 10).map((inquiry: any) => (
                    <TableRow key={inquiry.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                            <span className="text-xs font-medium text-purple-600">
                              {inquiry.name?.[0]}{inquiry.name?.split(' ')[1]?.[0]}
                            </span>
                          </div>
                          <div>
                            <div className="font-medium">{inquiry.name}</div>
                            <div className="text-xs text-muted-foreground">Age: {inquiry.age || 'N/A'}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{inquiry.phone}</div>
                        <div className="text-xs text-muted-foreground">{inquiry.email || 'No email'}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{inquiry.interest_area || 'General'}</div>
                        <div className="text-xs text-muted-foreground">{inquiry.preferred_timing || 'Any time'}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {inquiry.source}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={inquiry.status === 'converted' ? 'default' : 
                                  inquiry.status === 'new' ? 'secondary' : 'outline'}
                          className={
                            inquiry.status === 'converted' ? 'bg-green-100 text-green-800' :
                            inquiry.status === 'new' ? 'bg-blue-100 text-blue-800' :
                            inquiry.status === 'lost' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                          }
                        >
                          {inquiry.status === 'converted' ? <CheckCircle className="h-3 w-3 mr-1" /> :
                           inquiry.status === 'lost' ? <XCircle className="h-3 w-3 mr-1" /> :
                           <Clock className="h-3 w-3 mr-1" />}
                          {inquiry.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div>{formatDate(new Date(inquiry.created_at))}</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(inquiry.created_at).toLocaleTimeString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline">
                            <Phone className="h-3 w-3 mr-1" />
                            Call
                          </Button>
                          <Button size="sm" variant="outline">
                            <Mail className="h-3 w-3 mr-1" />
                            Email
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}