import { useState, useEffect } from 'react'
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
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  UserCheck,
  Activity,
  Loader2
} from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'

interface ManagerStats {
  totalMembers: number
  activeMembers: number
  totalStaff: number
  monthlyRevenue: number
  todayAttendance: number
  pendingInquiries: number
  expiringMemberships: number
}

export default function ManagerDashboard() {
  const { user, profile } = useAuth()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<ManagerStats>({
    totalMembers: 0,
    activeMembers: 0,
    totalStaff: 0,
    monthlyRevenue: 0,
    todayAttendance: 0,
    pendingInquiries: 0,
    expiringMemberships: 0
  })
  const [recentMembers, setRecentMembers] = useState<any[]>([])
  const [pendingTasks, setPendingTasks] = useState<any[]>([])
  const [staffPerformance, setStaffPerformance] = useState<any[]>([])
  const [gymId, setGymId] = useState<string | null>(null)

  useEffect(() => {
    if (user?.id) {
      loadManagerData()
    }
  }, [user?.id])

  const loadManagerData = async () => {
    try {
      setLoading(true)

      // Get manager's staff record to find gym
      const { data: staffRecord } = await supabase
        .from('staff')
        .select('gym_id')
        .eq('user_id', user?.id)
        .single()

      if (!staffRecord) {
        setLoading(false)
        return
      }

      const currentGymId = staffRecord.gym_id
      setGymId(currentGymId)

      const today = new Date().toISOString().split('T')[0]
      const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]

      // Fetch gym statistics
      const [
        membersResult,
        staffResult,
        paymentsResult,
        attendanceResult,
        inquiriesResult,
        membershipsResult
      ] = await Promise.all([
        // Members
        supabase
          .from('members')
          .select('id, status, created_at, user_id')
          .eq('gym_id', currentGymId),

        // Staff
        supabase
          .from('staff')
          .select('id, role, status, user_id')
          .eq('gym_id', currentGymId),

        // Monthly payments
        supabase
          .from('payments')
          .select('amount')
          .eq('gym_id', currentGymId)
          .eq('status', 'paid')
          .gte('payment_date', monthStart),

        // Today's attendance
        supabase
          .from('attendance')
          .select('id')
          .eq('gym_id', currentGymId)
          .eq('attendance_date', today)
          .eq('status', 'present'),

        // Pending inquiries
        supabase
          .from('inquiries')
          .select('id, status')
          .eq('gym_id', currentGymId)
          .in('status', ['new', 'contacted', 'follow_up']),

        // Expiring memberships (next 7 days)
        supabase
          .from('memberships')
          .select('id, members!inner(gym_id)')
          .eq('members.gym_id', currentGymId)
          .lte('end_date', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
          .eq('status', 'active')
      ])

      // Calculate stats
      const totalMembers = membersResult.data?.length || 0
      const activeMembers = membersResult.data?.filter(m => m.status === 'active').length || 0
      const totalStaff = staffResult.data?.length || 0
      const monthlyRevenue = paymentsResult.data?.reduce((sum, p) => sum + p.amount, 0) || 0
      const todayAttendance = attendanceResult.data?.length || 0
      const pendingInquiries = inquiriesResult.data?.length || 0
      const expiringMemberships = membershipsResult.data?.length || 0

      setStats({
        totalMembers,
        activeMembers,
        totalStaff,
        monthlyRevenue,
        todayAttendance,
        pendingInquiries,
        expiringMemberships
      })

      // Get recent members (last 10)
      if (membersResult.data) {
        const recentMembersData = membersResult.data
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 10)

        const membersWithProfiles = await Promise.all(
          recentMembersData.map(async (member) => {
            const { data: profile } = await supabase
              .from('profiles')
              .select('first_name, last_name, phone')
              .eq('user_id', member.user_id)
              .single()

            return {
              ...member,
              profile
            }
          })
        )
        setRecentMembers(membersWithProfiles)
      }

      // Get staff performance data
      if (staffResult.data) {
        const staffWithProfiles = await Promise.all(
          staffResult.data.map(async (staff) => {
            const { data: profile } = await supabase
              .from('profiles')
              .select('first_name, last_name')
              .eq('user_id', staff.user_id)
              .single()

            // Get staff performance metrics (for trainers)
            if (staff.role === 'trainer') {
              const { data: sessions } = await supabase
                .from('training_sessions')
                .select('completed, cancelled')
                .eq('trainer_id', staff.id)
                .gte('session_date', monthStart)

              const totalSessions = sessions?.length || 0
              const completedSessions = sessions?.filter(s => s.completed).length || 0
              const completionRate = totalSessions > 0 ? (completedSessions / totalSessions) * 100 : 0

              return {
                ...staff,
                profile,
                totalSessions,
                completionRate
              }
            }

            return {
              ...staff,
              profile,
              totalSessions: 0,
              completionRate: 0
            }
          })
        )
        setStaffPerformance(staffWithProfiles)
      }

      // Create pending tasks
      const tasks = []
      if (pendingInquiries > 0) {
        tasks.push({
          id: 'inquiries',
          title: 'Follow up on inquiries',
          description: `${pendingInquiries} pending inquiries need attention`,
          priority: 'high',
          count: pendingInquiries
        })
      }
      if (expiringMemberships > 0) {
        tasks.push({
          id: 'renewals',
          title: 'Membership renewals',
          description: `${expiringMemberships} memberships expiring soon`,
          priority: 'medium',
          count: expiringMemberships
        })
      }
      if (activeMembers < totalMembers * 0.8) {
        tasks.push({
          id: 'retention',
          title: 'Member retention',
          description: 'Focus on inactive member reactivation',
          priority: 'medium',
          count: totalMembers - activeMembers
        })
      }
      setPendingTasks(tasks)

    } catch (error) {
      console.error('Error loading manager data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2 text-lg">Loading dashboard...</span>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Manager Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {profile?.first_name}! Here's your gym overview.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Activity className="h-4 w-4 mr-2" />
            View Reports
          </Button>
          <Button>
            <Users className="h-4 w-4 mr-2" />
            Manage Staff
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalMembers}</div>
            <p className="text-xs text-muted-foreground">
              {stats.activeMembers} active
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
              {formatCurrency(stats.monthlyRevenue)}
            </div>
            <p className="text-xs text-muted-foreground">
              This month's collection
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Staff Members</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalStaff}</div>
            <p className="text-xs text-muted-foreground">
              Team members
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Attendance</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.todayAttendance}</div>
            <p className="text-xs text-muted-foreground">
              Members checked in
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {(stats.pendingInquiries > 0 || stats.expiringMemberships > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {stats.pendingInquiries > 0 && (
            <Card className="border-orange-200 bg-orange-50">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-orange-800">
                  <AlertCircle className="h-4 w-4" />
                  Pending Inquiries
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm text-orange-700">
                  {stats.pendingInquiries} inquiries need follow-up
                </p>
                <Button variant="outline" size="sm" className="mt-2">
                  Review Inquiries
                </Button>
              </CardContent>
            </Card>
          )}

          {stats.expiringMemberships > 0 && (
            <Card className="border-blue-200 bg-blue-50">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-blue-800">
                  <Calendar className="h-4 w-4" />
                  Expiring Memberships
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm text-blue-700">
                  {stats.expiringMemberships} memberships expire within 7 days
                </p>
                <Button variant="outline" size="sm" className="mt-2">
                  Schedule Renewals
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Main Content */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="members">Recent Members</TabsTrigger>
          <TabsTrigger value="staff">Staff Performance</TabsTrigger>
          <TabsTrigger value="tasks">Pending Tasks</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Quick Stats</CardTitle>
              <CardDescription>Key performance indicators</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Member Retention Rate</span>
                <span className="text-2xl font-bold">
                  {stats.totalMembers > 0 ? ((stats.activeMembers / stats.totalMembers) * 100).toFixed(1) : 0}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Daily Attendance Rate</span>
                <span className="text-2xl font-bold">
                  {stats.activeMembers > 0 ? ((stats.todayAttendance / stats.activeMembers) * 100).toFixed(1) : 0}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Staff-to-Member Ratio</span>
                <span className="text-2xl font-bold">
                  1:{stats.totalStaff > 0 ? Math.round(stats.totalMembers / stats.totalStaff) : 0}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>This Month's Performance</CardTitle>
              <CardDescription>Revenue and growth metrics</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Total Revenue</span>
                <span className="text-2xl font-bold">{formatCurrency(stats.monthlyRevenue)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">New Members</span>
                <span className="text-2xl font-bold">{recentMembers.length}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <TrendingUp className="h-4 w-4" />
                Keep tracking monthly progress
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
                    <TableHead>Phone</TableHead>
                    <TableHead>Join Date</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentMembers.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell>
                        <p className="font-medium">
                          {member.profile?.first_name} {member.profile?.last_name}
                        </p>
                      </TableCell>
                      <TableCell>{member.profile?.phone}</TableCell>
                      <TableCell>{formatDate(new Date(member.created_at))}</TableCell>
                      <TableCell>
                        <Badge variant={member.status === 'active' ? 'default' : 'secondary'}>
                          {member.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {recentMembers.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No recent members to display
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="staff">
          <Card>
            <CardHeader>
              <CardTitle>Staff Performance</CardTitle>
              <CardDescription>Team productivity overview</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Performance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {staffPerformance.map((staff) => (
                    <TableRow key={staff.id}>
                      <TableCell>
                        <p className="font-medium">
                          {staff.profile?.first_name} {staff.profile?.last_name}
                        </p>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {staff.role.charAt(0).toUpperCase() + staff.role.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={staff.status === 'active' ? 'default' : 'secondary'}>
                          {staff.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {staff.role === 'trainer' ? (
                          <div>
                            <p className="text-sm font-medium">
                              {staff.completionRate.toFixed(1)}% completion
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {staff.totalSessions} sessions this month
                            </p>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {staffPerformance.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No staff data available
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tasks">
          <div className="space-y-4">
            {pendingTasks.map((task) => (
              <Card key={task.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      {task.priority === 'high' ? (
                        <AlertCircle className="h-4 w-4 text-red-500" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4 text-blue-500" />
                      )}
                      {task.title}
                    </CardTitle>
                    <Badge variant={task.priority === 'high' ? 'destructive' : 'secondary'}>
                      {task.count}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-sm text-muted-foreground mb-3">
                    {task.description}
                  </p>
                  <Button variant="outline" size="sm">
                    Take Action
                  </Button>
                </CardContent>
              </Card>
            ))}

            {pendingTasks.length === 0 && (
              <Card>
                <CardContent className="py-8">
                  <div className="text-center">
                    <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
                    <h3 className="text-lg font-medium">All caught up!</h3>
                    <p className="text-muted-foreground">No pending tasks at the moment.</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
