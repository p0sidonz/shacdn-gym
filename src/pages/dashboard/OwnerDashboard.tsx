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
  UserPlus,
  AlertCircle,
  Clock,
  Loader2,
  BarChart3,
  Activity
} from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import { useAuth } from '@/context/AuthContext'
import { useGym } from '@/hooks/useGym'
import { useMembers } from '@/hooks/useMembers'
import { usePayments } from '@/hooks/usePayments'
import { useMemberships } from '@/hooks/useMemberships'
import GymSetup from '@/components/gym/GymSetup'
import AnalyticsDashboard from './AnalyticsDashboard'
import { QuickAddMember } from '@/components/members/QuickAddMember'

export default function OwnerDashboard() {
  const { user, profile } = useAuth()
  const { gym, getDashboardData } = useGym(user?.id)
  
  // Temporarily disable hooks to prevent loops
  // const memberStats = useMembers({ gym_id: gym?.id })
  // const paymentStats = usePayments({ gym_id: gym?.id })
  // const membershipStats = useMemberships({ gym_id: gym?.id })
  
  const [loading, setLoading] = useState(true)
  const [dashboardData, setDashboardData] = useState<any>(null)
  const [stats, setStats] = useState<any>({
    members: { total: 0, active: 0, trial: 0 },
    payments: { totalRevenue: 0, monthlyRevenue: 0, pendingAmount: 0, todayCollection: 0 },
    memberships: { total: 0, expiring_soon: 0 }
  })

  useEffect(() => {
    const loadDashboardData = async () => {
      // if (!gym?.id) return

      try {
        setLoading(true)
        
        const dashboardResult = await getDashboardData()

        if (dashboardResult.data) {
          setDashboardData(dashboardResult.data)
        }

        // Use default stats for now
        setStats({
          members: { total: 0, active: 0, trial: 0 },
          payments: { totalRevenue: 0, monthlyRevenue: 0, pendingAmount: 0, todayCollection: 0 },
          memberships: { total: 0, expiring_soon: 0 }
        })
      } catch (error) {
        console.error('Error loading dashboard data:', error)
        setLoading(false)
      } finally {
        setLoading(false)
      }
    }

    loadDashboardData()
  }, [gym?.id])

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

      {/* Key Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.members.total}</div>
            <p className="text-xs text-muted-foreground">
              {stats.members.active} active, {stats.members.trial} on trial
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats.payments.monthlyRevenue)}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(stats.payments.todayCollection)} collected today
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Payments</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats.payments.pendingAmount)}
            </div>
            <p className="text-xs text-muted-foreground">
              Requires follow-up
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Staff Count</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{gym.stats?.totalStaff || 0}</div>
            <p className="text-xs text-muted-foreground">
              Active team members
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="analytics" className="space-y-4">
        <TabsList>
          {/* <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Analytics
          </TabsTrigger> */}
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="members">Recent Members</TabsTrigger>
          <TabsTrigger value="payments">Recent Payments</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
        </TabsList>

        {/* <TabsContent value="analytics" className="space-y-6">
          <AnalyticsDashboard />
        </TabsContent> */}

        <TabsContent value="overview" className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Today's Attendance */}
          <Card>
            <CardHeader>
              <CardTitle>Today's Attendance</CardTitle>
              <CardDescription>Members checked in today</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Check-ins</span>
                  <span className="text-2xl font-bold">{gym.stats?.todayAttendance || 0}</span>
                </div>
                {dashboardData?.todayAttendance?.slice(0, 5).map((attendance: any, index: number) => (
                  <div key={index} className="flex items-center justify-between text-sm">
                    <span>{attendance.profile?.first_name} {attendance.profile?.last_name}</span>
                    <Badge variant="secondary">
                      {attendance.check_in_time}
                    </Badge>
                  </div>
                )) || (
                  <p className="text-sm text-muted-foreground">No attendance data available</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Expiring Memberships */}
          <Card>
            <CardHeader>
              <CardTitle>Expiring Soon</CardTitle>
              <CardDescription>Memberships expiring within 7 days</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {dashboardData?.expiringMemberships?.slice(0, 5).map((membership: any, index: number) => (
                  <div key={index} className="flex items-center justify-between">
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
                  <p className="text-sm text-muted-foreground">No expiring memberships</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="members">
          <Card>
            <CardHeader>
              <CardTitle>Recent Members</CardTitle>
              <CardDescription>Latest member registrations</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Member ID</TableHead>
                    <TableHead>Join Date</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dashboardData?.recentMembers?.map((member: any) => (
                    <TableRow key={member.id}>
                      <TableCell>
                        {member.profile?.first_name} {member.profile?.last_name}
                      </TableCell>
                      <TableCell>{member.member_id}</TableCell>
                      <TableCell>{formatDate(new Date(member.joining_date))}</TableCell>
                      <TableCell>
                        <Badge variant={member.status === 'active' ? 'default' : 'secondary'}>
                          {member.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  )) || (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">
                        No recent members
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments">
          <Card>
            <CardHeader>
              <CardTitle>Recent Payments</CardTitle>
              <CardDescription>Latest payment transactions</CardDescription>
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
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dashboardData?.recentPayments?.map((payment: any) => (
                    <TableRow key={payment.id}>
                      <TableCell>
                        {payment.member?.profile?.first_name} {payment.member?.profile?.last_name}
                      </TableCell>
                      <TableCell>{formatCurrency(payment.amount)}</TableCell>
                      <TableCell>{payment.payment_method}</TableCell>
                      <TableCell>{formatDate(new Date(payment.payment_date))}</TableCell>
                      <TableCell>
                        <Badge variant={payment.status === 'paid' ? 'default' : 'secondary'}>
                          {payment.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  )) || (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        No recent payments
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts">
          <div className="grid gap-4">
            {stats.memberships.expiring_soon > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-orange-500" />
                    Memberships Expiring Soon
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">
                    {stats.memberships.expiring_soon} memberships will expire within the next 7 days.
                  </p>
                  <Button variant="outline" size="sm" className="mt-2">
                    View Details
                  </Button>
                </CardContent>
              </Card>
            )}

            {stats.payments.pendingAmount > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-red-500" />
                    Pending Payments
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">
                    {formatCurrency(stats.payments.pendingAmount)} in pending payments requires follow-up.
                  </p>
                  <Button variant="outline" size="sm" className="mt-2">
                    Send Reminders
                  </Button>
                </CardContent>
              </Card>
            )}

            {gym.stats?.totalStaff === 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <UserPlus className="h-4 w-4 text-blue-500" />
                    Add Staff Members
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">
                    Consider adding trainers and staff to help manage your gym operations.
                  </p>
                  <Button variant="outline" size="sm" className="mt-2">
                    Add Staff
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}