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
  Activity,
  Clock,
  Target,
  TrendingUp,
  Loader2
} from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'

interface TrainerStats {
  totalClients: number
  activeClients: number
  todaySessions: number
  monthlyEarnings: number
  sessionCompletion: number
  averageRating: number
}

interface TrainingSession {
  id: string
  member_name: string
  session_date: string
  start_time: string
  end_time: string
  session_type: string
  status: string
  member_phone: string
}

export default function TrainerDashboard() {
  const { user, profile } = useAuth()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<TrainerStats>({
    totalClients: 0,
    activeClients: 0,
    todaySessions: 0,
    monthlyEarnings: 0,
    sessionCompletion: 0,
    averageRating: 0
  })
  const [todaySessions, setTodaySessions] = useState<TrainingSession[]>([])
  const [upcomingSessions, setUpcomingSessions] = useState<TrainingSession[]>([])
  const [myClients, setMyClients] = useState<any[]>([])

  useEffect(() => {
    if (user?.id) {
      loadTrainerData()
    }
  }, [user?.id])

  const loadTrainerData = async () => {
    try {
      setLoading(true)

      // Get trainer's staff record
      const { data: staffRecord } = await supabase
        .from('staff')
        .select('id, gym_id')
        .eq('user_id', user?.id)
        .single()

      if (!staffRecord) {
        setLoading(false)
        return
      }

      const trainerId = staffRecord.id
      const today = new Date().toISOString().split('T')[0]

      // Fetch trainer's assigned members
      const { data: members } = await supabase
        .from('members')
        .select(`
          id,
          member_id,
          status,
          user_id
        `)
        .eq('assigned_trainer_id', trainerId)

      let membersWithProfiles: any[] = []
      if (members) {
        // Get profiles for members
        membersWithProfiles = await Promise.all(
          members.map(async (member) => {
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
        setMyClients(membersWithProfiles)
      }

      // Fetch today's sessions
      const { data: sessions } = await supabase
        .from('training_sessions')
        .select('*')
        .eq('trainer_id', trainerId)
        .eq('session_date', today)
        .order('start_time', { ascending: true })

      if (sessions) {
        const sessionsWithMemberNames = await Promise.all(
          sessions.map(async (session) => {
            const member = membersWithProfiles?.find(m => m.id === session.member_id)
            const memberName = member?.profile 
              ? `${member.profile.first_name} ${member.profile.last_name}`
              : 'Unknown Member'
            
            return {
              ...session,
              member_name: memberName,
              member_phone: member?.profile?.phone || '',
              status: session.completed ? 'completed' : session.cancelled ? 'cancelled' : 'scheduled'
            }
          })
        )
        setTodaySessions(sessionsWithMemberNames)
      }

      // Fetch upcoming sessions (next 7 days)
      const nextWeek = new Date()
      nextWeek.setDate(nextWeek.getDate() + 7)
      
      const { data: upcomingSessionsData } = await supabase
        .from('training_sessions')
        .select('*')
        .eq('trainer_id', trainerId)
        .gte('session_date', today)
        .lte('session_date', nextWeek.toISOString().split('T')[0])
        .eq('completed', false)
        .eq('cancelled', false)
        .order('session_date', { ascending: true })
        .order('start_time', { ascending: true })
        .limit(10)

      if (upcomingSessionsData) {
        const upcomingWithNames = await Promise.all(
          upcomingSessionsData.map(async (session) => {
            const member = membersWithProfiles?.find(m => m.id === session.member_id)
            const memberName = member?.profile 
              ? `${member.profile.first_name} ${member.profile.last_name}`
              : 'Unknown Member'
            
            return {
              ...session,
              member_name: memberName,
              member_phone: member?.profile?.phone || '',
              status: 'scheduled'
            }
          })
        )
        setUpcomingSessions(upcomingWithNames)
      }

      // Calculate stats
      const activeClients = membersWithProfiles?.filter(m => m.status === 'active').length || 0
      const todaySessionsCount = sessions?.length || 0

      // Get monthly earnings
      const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
      const { data: earnings } = await supabase
        .from('trainer_earnings')
        .select('total_earning')
        .eq('trainer_id', trainerId)
        .gte('earning_date', monthStart)

      const monthlyEarnings = earnings?.reduce((sum, e) => sum + e.total_earning, 0) || 0

      // Get session completion rate (last 30 days)
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const { data: recentSessions } = await supabase
        .from('training_sessions')
        .select('completed, cancelled')
        .eq('trainer_id', trainerId)
        .gte('session_date', thirtyDaysAgo.toISOString().split('T')[0])

      const totalRecentSessions = recentSessions?.length || 0
      const completedSessions = recentSessions?.filter(s => s.completed).length || 0
      const sessionCompletion = totalRecentSessions > 0 ? (completedSessions / totalRecentSessions) * 100 : 0

      // Get average rating
      const { data: ratings } = await supabase
        .from('training_sessions')
        .select('session_rating')
        .eq('trainer_id', trainerId)
        .not('session_rating', 'is', null)

      const validRatings = ratings?.filter(r => r.session_rating > 0) || []
      const averageRating = validRatings.length > 0 
        ? validRatings.reduce((sum, r) => sum + r.session_rating, 0) / validRatings.length 
        : 0

      setStats({
        totalClients: membersWithProfiles?.length || 0,
        activeClients,
        todaySessions: todaySessionsCount,
        monthlyEarnings,
        sessionCompletion,
        averageRating
      })

    } catch (error) {
      console.error('Error loading trainer data:', error)
    } finally {
      setLoading(false)
    }
  }

  const markSessionComplete = async (sessionId: string) => {
    try {
      const { error } = await supabase
        .from('training_sessions')
        .update({ 
          completed: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId)

      if (error) throw error

      await loadTrainerData() // Refresh data
      alert('Session marked as completed!')
    } catch (error) {
      console.error('Error updating session:', error)
      alert('Failed to update session')
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
          <h1 className="text-3xl font-bold">Trainer Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {profile?.first_name}! Here's your training overview.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Calendar className="h-4 w-4 mr-2" />
            Schedule Session
          </Button>
          <Button>
            <Users className="h-4 w-4 mr-2" />
            View My Clients
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">My Clients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalClients}</div>
            <p className="text-xs text-muted-foreground">
              {stats.activeClients} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Sessions</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.todaySessions}</div>
            <p className="text-xs text-muted-foreground">
              Scheduled for today
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Earnings</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats.monthlyEarnings)}
            </div>
            <p className="text-xs text-muted-foreground">
              This month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.sessionCompletion.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              Last 30 days
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="today" className="space-y-4">
        <TabsList>
          <TabsTrigger value="today">Today's Sessions</TabsTrigger>
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="clients">My Clients</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="today">
          <Card>
            <CardHeader>
              <CardTitle>Today's Training Sessions</CardTitle>
              <CardDescription>
                {formatDate(new Date())} - {todaySessions.length} sessions scheduled
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Session Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {todaySessions.map((session) => (
                    <TableRow key={session.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          {session.start_time} - {session.end_time}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{session.member_name}</p>
                          <p className="text-sm text-muted-foreground">{session.member_phone}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {session.session_type || 'Personal Training'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={
                          session.status === 'completed' ? 'default' :
                          session.status === 'cancelled' ? 'destructive' : 'secondary'
                        }>
                          {session.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {session.status === 'scheduled' && (
                          <Button 
                            size="sm" 
                            onClick={() => markSessionComplete(session.id)}
                          >
                            Mark Complete
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {todaySessions.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No sessions scheduled for today. Take a well-deserved break! 🎉
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="upcoming">
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Sessions</CardTitle>
              <CardDescription>Next 7 days schedule</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Session Type</TableHead>
                    <TableHead>Contact</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {upcomingSessions.map((session) => (
                    <TableRow key={session.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{formatDate(new Date(session.session_date))}</p>
                          <p className="text-sm text-muted-foreground">
                            {session.start_time} - {session.end_time}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="font-medium">{session.member_name}</p>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {session.session_type || 'Personal Training'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm">{session.member_phone}</p>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {upcomingSessions.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No upcoming sessions scheduled. Time to book some sessions! 📅
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="clients">
          <Card>
            <CardHeader>
              <CardTitle>My Clients</CardTitle>
              <CardDescription>Members assigned to you</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Member ID</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {myClients.map((client) => (
                    <TableRow key={client.id}>
                      <TableCell>
                        <p className="font-medium">
                          {client.profile?.first_name} {client.profile?.last_name}
                        </p>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{client.member_id}</Badge>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm">{client.profile?.phone}</p>
                      </TableCell>
                      <TableCell>
                        <Badge variant={client.status === 'active' ? 'default' : 'secondary'}>
                          {client.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {myClients.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No clients assigned yet. Contact your manager for client assignments.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Performance Metrics</CardTitle>
                <CardDescription>Your training statistics</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Session Completion Rate</span>
                  <span className="text-2xl font-bold">{stats.sessionCompletion.toFixed(1)}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Average Rating</span>
                  <span className="text-2xl font-bold">
                    {stats.averageRating > 0 ? `${stats.averageRating.toFixed(1)}/5` : 'N/A'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Active Clients</span>
                  <span className="text-2xl font-bold">{stats.activeClients}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Monthly Earnings</CardTitle>
                <CardDescription>Your commission and earnings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">This Month</span>
                  <span className="text-2xl font-bold">{formatCurrency(stats.monthlyEarnings)}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <TrendingUp className="h-4 w-4" />
                  Track your progress monthly
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
