import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  User, 
  Calendar, 
  Clock, 
  DollarSign, 
  Plus,
  CheckCircle,
  AlertCircle,
  Target,
  TrendingUp,
  Users,
  Star
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { formatCurrency, formatDate } from '@/lib/utils'
import { SessionDetailsDialog } from '../members/SessionDetailsDialog'
import { TrainerScheduleSessionDialog } from './TrainerScheduleSessionDialog'

interface TrainerPTDashboardProps {
  trainer: any
  onSessionUpdated?: () => void
}

export const TrainerPTDashboard: React.FC<TrainerPTDashboardProps> = ({
  trainer,
  onSessionUpdated
}) => {
  const { gymId } = useAuth()
  const [loading, setLoading] = useState(false)
  const [activeDialog, setActiveDialog] = useState<string | null>(null)
  const [selectedSession, setSelectedSession] = useState<any>(null)
  
  // PT Data
  const [assignedMembers, setAssignedMembers] = useState<any[]>([])
  const [trainingSessions, setTrainingSessions] = useState<any[]>([])
  const [earnings, setEarnings] = useState<any[]>([])
  const [upcomingSessions, setUpcomingSessions] = useState<any[]>([])

  useEffect(() => {
    if (trainer?.id) {
      loadTrainerPTData()
    }
  }, [trainer?.id])

  const loadTrainerPTData = async () => {
    setLoading(true)
    try {
      // Load assigned members with PT packages
      const { data: members, error: membersError } = await supabase
        .from('trainer_commission_rules')
        .select(`
          *,
          members (
            id,
            member_id,
            profiles (
              first_name,
              last_name,
              phone
            )
          ),
          membership_packages (
            id,
            name,
            price
          ),
          memberships!memberships_member_id_fkey (
            id,
            pt_sessions_remaining,
            pt_sessions_used,
            start_date,
            end_date,
            status
          )
        `)
        .eq('trainer_id', trainer.id)
        .eq('is_active', true)
        .gt('memberships.pt_sessions_remaining', 0)

      if (membersError) throw membersError
      setAssignedMembers(members || [])

      // Load training sessions for this trainer
      const { data: sessions, error: sessionsError } = await supabase
        .from('training_sessions')
        .select(`
          *,
          members (
            id,
            member_id,
            profiles (
              first_name,
              last_name,
              phone
            )
          ),
          memberships (
            id,
            membership_packages (
              name
            )
          )
        `)
        .eq('trainer_id', trainer.id)
        .order('session_date', { ascending: false })
        .limit(50)

      if (sessionsError) throw sessionsError
      setTrainingSessions(sessions || [])

      // Load trainer earnings
      const { data: earningsData, error: earningsError } = await supabase
        .from('trainer_earnings')
        .select(`
          *,
          members (
            member_id,
            profiles (
              first_name,
              last_name
            )
          )
        `)
        .eq('trainer_id', trainer.id)
        .order('earning_date', { ascending: false })
        .limit(20)

      if (earningsError) throw earningsError
      setEarnings(earningsData || [])

      // Load upcoming sessions (next 7 days)
      const today = new Date().toISOString().split('T')[0]
      const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      
      const { data: upcoming, error: upcomingError } = await supabase
        .from('training_sessions')
        .select(`
          *,
          members (
            member_id,
            profiles (
              first_name,
              last_name,
              phone
            )
          )
        `)
        .eq('trainer_id', trainer.id)
        .eq('completed', false)
        .eq('cancelled', false)
        .gte('session_date', today)
        .lte('session_date', nextWeek)
        .order('session_date', { ascending: true })
        .order('start_time', { ascending: true })

      if (upcomingError) throw upcomingError
      setUpcomingSessions(upcoming || [])

    } catch (error) {
      console.error('Error loading trainer PT data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDialogClose = () => {
    setActiveDialog(null)
    setSelectedSession(null)
    loadTrainerPTData()
    if (onSessionUpdated) onSessionUpdated()
  }

  const getSessionStatusBadge = (session: any) => {
    if (session.cancelled) {
      return <Badge className="bg-red-100 text-red-800">Cancelled</Badge>
    }
    if (session.no_show) {
      return <Badge className="bg-orange-100 text-orange-800">No Show</Badge>
    }
    if (session.completed) {
      return <Badge className="bg-green-100 text-green-800">Completed</Badge>
    }
    if (new Date(session.session_date) < new Date()) {
      return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>
    }
    return <Badge className="bg-blue-100 text-blue-800">Scheduled</Badge>
  }

  // Calculate stats
  const totalActiveClients = assignedMembers.length
  const totalSessions = trainingSessions.length
  const completedSessions = trainingSessions.filter(s => s.completed).length
  const totalEarnings = earnings.reduce((sum, e) => sum + parseFloat(e.total_earning || 0), 0)
  const pendingEarnings = earnings.filter(e => !e.is_paid).reduce((sum, e) => sum + parseFloat(e.total_earning || 0), 0)
  const avgRating = trainingSessions.filter(s => s.session_rating > 0).reduce((sum, s, _, arr) => 
    arr.length > 0 ? sum + s.session_rating / arr.length : 0, 0
  )

  return (
    <div className="space-y-6">
      {/* PT Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">Active Clients</p>
                <p className="text-2xl font-bold">{totalActiveClients}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">Total Sessions</p>
                <p className="text-2xl font-bold">{totalSessions}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-purple-600" />
              <div>
                <p className="text-sm text-gray-600">Total Earnings</p>
                <p className="text-2xl font-bold text-purple-600">{formatCurrency(totalEarnings)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-yellow-600" />
              <div>
                <p className="text-sm text-gray-600">Avg Rating</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {avgRating > 0 ? avgRating.toFixed(1) : '—'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="clients" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="clients">My Clients ({totalActiveClients})</TabsTrigger>
          <TabsTrigger value="upcoming">Upcoming ({upcomingSessions.length})</TabsTrigger>
          <TabsTrigger value="sessions">All Sessions</TabsTrigger>
          <TabsTrigger value="earnings">Earnings</TabsTrigger>
        </TabsList>

        {/* Assigned Clients Tab */}
        <TabsContent value="clients" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">My PT Clients</h3>
          </div>

          {assignedMembers.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-gray-500">No PT clients assigned</p>
                <p className="text-sm text-gray-400 mt-1">You'll see your assigned PT clients here</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {assignedMembers.map((assignment) => (
                <Card key={assignment.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <User className="w-5 h-5" />
                        <span>
                          {assignment.members?.profiles?.first_name} {assignment.members?.profiles?.last_name}
                        </span>
                      </div>
                      <Badge className="bg-blue-100 text-blue-800">
                        {assignment.members?.member_id}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Package:</span>
                          <p className="font-medium">{assignment.membership_packages?.name}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Phone:</span>
                          <p className="font-medium">{assignment.members?.profiles?.phone}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Sessions Left:</span>
                          <p className="font-medium text-orange-600">
                            {assignment.memberships?.pt_sessions_remaining || 0}
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-600">Commission:</span>
                          <p className="font-medium text-green-600">
                            {assignment.commission_type === 'percentage' 
                              ? `${assignment.commission_value}%` 
                              : formatCurrency(assignment.commission_value)
                            }
                          </p>
                        </div>
                      </div>
                      
                      <div className="pt-3 border-t">
                        <Button 
                          size="sm" 
                          className="w-full"
                          onClick={() => {
                            // Set selected member and open dialog
                            setSelectedSession({ 
                              member: assignment.members,
                              membership: assignment.memberships,
                              trainer: assignment 
                            })
                            setActiveDialog('schedule-session')
                          }}
                        >
                          <Calendar className="w-4 h-4 mr-2" />
                          Schedule Session
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Upcoming Sessions Tab */}
        <TabsContent value="upcoming" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Upcoming Sessions (Next 7 Days)</h3>
          </div>

          {upcomingSessions.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-gray-500">No upcoming sessions</p>
                <p className="text-sm text-gray-400 mt-1">Schedule sessions with your clients</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {upcomingSessions.map((session) => (
                <Card key={session.id} className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div>
                          <p className="font-medium">
                            {session.members?.profiles?.first_name} {session.members?.profiles?.last_name}
                          </p>
                          <p className="text-sm text-gray-500">
                            {session.members?.member_id}
                          </p>
                        </div>
                        <div>
                          <p className="font-medium">{formatDate(session.session_date)}</p>
                          <p className="text-sm text-gray-500">
                            {session.start_time} - {session.end_time}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Session:</p>
                          <p className="font-medium">{session.session_number}/{session.total_sessions}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Fee:</p>
                          <p className="font-medium text-green-600">{formatCurrency(session.trainer_fee || 0)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getSessionStatusBadge(session)}
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => {
                            setSelectedSession(session)
                            setActiveDialog('session-details')
                          }}
                        >
                          View Details
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* All Sessions Tab */}
        <TabsContent value="sessions" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">All Training Sessions</h3>
            <div className="text-sm text-gray-500">
              Total: {totalSessions} • Completed: {completedSessions}
            </div>
          </div>

          {trainingSessions.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-gray-500">No training sessions</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {trainingSessions.map((session) => (
                <Card key={session.id} className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div>
                          <p className="font-medium">
                            {session.members?.profiles?.first_name} {session.members?.profiles?.last_name}
                          </p>
                          <p className="text-sm text-gray-500">
                            {session.members?.member_id}
                          </p>
                        </div>
                        <div>
                          <p className="font-medium">{formatDate(session.session_date)}</p>
                          <p className="text-sm text-gray-500">
                            {session.start_time} - {session.end_time}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Session:</p>
                          <p className="font-medium">{session.session_number}/{session.total_sessions}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Fee:</p>
                          <p className="font-medium text-green-600">{formatCurrency(session.trainer_fee || 0)}</p>
                        </div>
                        {session.session_rating > 0 && (
                          <div className="flex items-center gap-1">
                            <Star className="w-4 h-4 text-yellow-500 fill-current" />
                            <span className="text-sm font-medium">{session.session_rating}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {getSessionStatusBadge(session)}
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => {
                            setSelectedSession(session)
                            setActiveDialog('session-details')
                          }}
                        >
                          View Details
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Earnings Tab */}
        <TabsContent value="earnings" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">My Earnings</h3>
            <div className="text-sm text-gray-500">
              Total: {formatCurrency(totalEarnings)} • Pending: {formatCurrency(pendingEarnings)}
            </div>
          </div>

          {earnings.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-gray-500">No earnings recorded</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {earnings.map((earning) => (
                <Card key={earning.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div>
                          <p className="font-medium">
                            {earning.members?.profiles?.first_name} {earning.members?.profiles?.last_name}
                          </p>
                          <p className="text-sm text-gray-500">
                            {earning.members?.member_id} • {earning.earning_type}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Date:</p>
                          <p className="font-medium">{formatDate(earning.earning_date)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Base Amount:</p>
                          <p className="font-medium">{formatCurrency(earning.base_amount)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Commission:</p>
                          <p className="font-medium">{earning.commission_rate}%</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-green-600">
                          {formatCurrency(earning.total_earning)}
                        </p>
                        <Badge className={earning.is_paid ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}>
                          {earning.is_paid ? 'Paid' : 'Pending'}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      {activeDialog === 'schedule-session' && selectedSession && (
        <TrainerScheduleSessionDialog
          open={true}
          onOpenChange={() => setActiveDialog(null)}
          sessionData={selectedSession}
          onSessionScheduled={handleDialogClose}
        />
      )}

      {activeDialog === 'session-details' && selectedSession && (
        <SessionDetailsDialog
          open={true}
          onOpenChange={() => setActiveDialog(null)}
          session={selectedSession}
          member={selectedSession.members}
          onSessionUpdated={handleDialogClose}
        />
      )}
    </div>
  )
}
