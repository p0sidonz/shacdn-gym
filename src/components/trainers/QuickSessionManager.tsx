import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Calendar, 
  Clock, 
  CheckCircle, 
  Plus,
  Zap,
  Users,
  Target,
  AlertCircle,
  Play,
  Pause,
  RotateCcw
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { formatCurrency, formatDate } from '@/lib/utils'
import { BulkSessionScheduler } from './BulkSessionScheduler'

interface QuickSessionManagerProps {
  trainer: any
  onSessionUpdated?: () => void
}

export const QuickSessionManager: React.FC<QuickSessionManagerProps> = ({
  trainer,
  onSessionUpdated
}) => {
  const { gymId } = useAuth()
  const [loading, setLoading] = useState(false)
  const [assignedMembers, setAssignedMembers] = useState<any[]>([])
  const [todaySessions, setTodaySessions] = useState<any[]>([])
  const [upcomingSessions, setUpcomingSessions] = useState<any[]>([])
  const [showBulkScheduler, setShowBulkScheduler] = useState(false)

  useEffect(() => {
    if (trainer?.id) {
      loadQuickSessionData()
    }
  }, [trainer?.id])

  const loadQuickSessionData = async () => {
    setLoading(true)
    try {
      // Load assigned members
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
          )
        `)
        .eq('trainer_id', trainer.id)
        .eq('is_active', true)

      if (membersError) throw membersError

      // Get memberships for these members
      const memberIds = members?.map(m => m.member_id) || []
      let assignedMembersWithSessions = []

      if (memberIds.length > 0) {
        const { data: memberships, error: membershipsError } = await supabase
          .from('memberships')
          .select(`
            id,
            member_id,
            package_id,
            pt_sessions_remaining,
            pt_sessions_used,
            start_date,
            end_date,
            status,
            membership_packages (
              id,
              name,
              price
            )
          `)
          .in('member_id', memberIds)
          .gt('pt_sessions_remaining', 0)
          .eq('status', 'active')

        if (membershipsError) throw membershipsError

        assignedMembersWithSessions = members?.map(rule => {
          const membership = memberships?.find(m => m.member_id === rule.member_id)
          return {
            ...rule,
            memberships: membership
          }
        }).filter(rule => rule.memberships) || []
      }

      setAssignedMembers(assignedMembersWithSessions)

      // Load today's sessions
      const today = new Date().toISOString().split('T')[0]
      const { data: todayData, error: todayError } = await supabase
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
        .eq('session_date', today)
        .order('start_time', { ascending: true })

      if (todayError) throw todayError
      setTodaySessions(todayData || [])

      // Load upcoming sessions (next 3 days)
      const next3Days = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      const { data: upcomingData, error: upcomingError } = await supabase
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
        .gte('session_date', today)
        .lte('session_date', next3Days)
        .eq('completed', false)
        .eq('cancelled', false)
        .order('session_date', { ascending: true })
        .order('start_time', { ascending: true })

      if (upcomingError) throw upcomingError
      setUpcomingSessions(upcomingData || [])

    } catch (error) {
      console.error('Error loading quick session data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleQuickCreateSession = async (member: any) => {
    if (!member.memberships) return

    setLoading(true)
    try {
      const membership = member.memberships
      const totalSessions = (membership.pt_sessions_remaining || 0) + (membership.pt_sessions_used || 0)
      const currentSessionNumber = (membership.pt_sessions_used || 0) + 1
      
      // Calculate session fee
      const sessionFee = membership.total_amount_due / totalSessions
      
      // Calculate trainer fee
      let trainerFee = 0
      if (member.commission_type === 'per_session') {
        trainerFee = member.commission_value
      } else if (member.commission_type === 'percentage') {
        trainerFee = (sessionFee * member.commission_value) / 100
      } else if (member.commission_type === 'fixed_amount') {
        trainerFee = member.commission_value / totalSessions
      }

      // Set default time to next available slot
      const now = new Date()
      const nextHour = new Date(now.getTime() + 60 * 60 * 1000)
      const startTime = `${String(nextHour.getHours()).padStart(2, '0')}:00`
      const endTime = `${String(nextHour.getHours() + 1).padStart(2, '0')}:00`

      // Create session
      const sessionData = {
        member_id: member.members.id,
        trainer_id: member.trainer_id,
        membership_id: membership.id,
        session_date: new Date().toISOString().split('T')[0],
        start_time: startTime,
        end_time: endTime,
        duration_minutes: 60,
        session_type: 'personal_training',
        session_number: currentSessionNumber,
        total_sessions: totalSessions,
        session_fee: Math.round(sessionFee),
        trainer_fee: Math.round(trainerFee),
        completed: false,
        cancelled: false
      }

      const { data: newSession, error: sessionError } = await supabase
        .from('training_sessions')
        .insert([sessionData])
        .select()
        .single()

      if (sessionError) throw sessionError

      // Update membership
      await supabase
        .from('memberships')
        .update({
          pt_sessions_remaining: membership.pt_sessions_remaining - 1,
          pt_sessions_used: currentSessionNumber
        })
        .eq('id', membership.id)

      // Create earning record
      const earningData = {
        trainer_id: member.trainer_id,
        member_id: member.members.id,
        membership_id: membership.id,
        training_session_id: newSession.id,
        commission_rule_id: member.id,
        earning_type: 'session_conducted',
        base_amount: Math.round(sessionFee),
        commission_rate: member.commission_type === 'percentage' ? member.commission_value : null,
        commission_amount: Math.round(trainerFee),
        total_earning: Math.round(trainerFee),
        earning_date: new Date().toISOString().split('T')[0],
        earning_month: new Date().toISOString().slice(0, 7),
        payment_cycle: 'session',
        is_paid: false,
        notes: `Quick session ${currentSessionNumber}/${totalSessions}`,
        created_by: (await supabase.auth.getUser()).data.user?.id
      }

      await supabase
        .from('trainer_earnings')
        .insert([earningData])

      alert(`✅ Quick session created! Session ${currentSessionNumber}/${totalSessions} at ${startTime}`)
      loadQuickSessionData()
      if (onSessionUpdated) onSessionUpdated()

    } catch (error) {
      console.error('Error creating quick session:', error)
      alert(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  const handleCompleteSession = async (session: any) => {
    setLoading(true)
    try {
      await supabase
        .from('training_sessions')
        .update({ 
          completed: true,
          completed_at: new Date().toISOString()
        })
        .eq('id', session.id)

      alert('✅ Session marked as completed!')
      loadQuickSessionData()
      if (onSessionUpdated) onSessionUpdated()

    } catch (error) {
      console.error('Error completing session:', error)
      alert(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  const getSessionStatusBadge = (session: any) => {
    if (session.cancelled) {
      return <Badge className="bg-red-100 text-red-800">Cancelled</Badge>
    }
    if (session.completed) {
      return <Badge className="bg-green-100 text-green-800">Completed</Badge>
    }
    if (new Date(session.session_date) < new Date()) {
      return <Badge className="bg-yellow-100 text-yellow-800">Missed</Badge>
    }
    return <Badge className="bg-blue-100 text-blue-800">Scheduled</Badge>
  }

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">Active Clients</p>
                <p className="text-2xl font-bold">{assignedMembers.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p4">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">Today's Sessions</p>
                <p className="text-2xl font-bold">{todaySessions.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-purple-600" />
              <div>
                <p className="text-sm text-gray-600">Completed Today</p>
                <p className="text-2xl font-bold">{todaySessions.filter(s => s.completed).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-orange-600" />
              <div>
                <p className="text-sm text-gray-600">Upcoming</p>
                <p className="text-2xl font-bold">{upcomingSessions.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="quick" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="quick">Quick Actions</TabsTrigger>
          <TabsTrigger value="today">Today's Sessions</TabsTrigger>
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
        </TabsList>

        {/* Quick Actions Tab */}
        <TabsContent value="quick" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Quick Session Management</h3>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={() => setShowBulkScheduler(true)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Calendar className="w-4 h-4 mr-2" />
                Bulk Schedule
              </Button>
              <Badge className="bg-green-100 text-green-800">
                <Zap className="w-3 h-3 mr-1" />
                One-Click Actions
              </Badge>
            </div>
          </div>

          {assignedMembers.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-gray-500">No active clients found</p>
                <p className="text-sm text-gray-400 mt-1">Clients will appear here when assigned</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {assignedMembers.map((member) => (
                <Card key={member.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Users className="w-5 h-5 text-blue-600" />
                        <span>
                          {member.members?.profiles?.first_name} {member.members?.profiles?.last_name}
                        </span>
                      </div>
                      <Badge className="bg-blue-100 text-blue-800">
                        {member.members?.member_id}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Package:</span>
                          <p className="font-medium">{member.memberships?.membership_packages?.name}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Sessions Left:</span>
                          <p className="font-medium text-orange-600">
                            {member.memberships?.pt_sessions_remaining || 0}
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-600">Plan Period:</span>
                          <p className="font-medium text-xs">
                            {formatDate(member.memberships?.start_date)} - {formatDate(member.memberships?.end_date)}
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-600">Your Fee:</span>
                          <p className="font-medium text-green-600">
                            {member.commission_type === 'percentage' 
                              ? `${member.commission_value}%` 
                              : formatCurrency(member.commission_value)
                            }
                          </p>
                        </div>
                      </div>
                      
                      <div className="pt-3 border-t">
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            className="flex-1 bg-green-600 hover:bg-green-700"
                            onClick={() => handleQuickCreateSession(member)}
                            disabled={loading || (member.memberships?.pt_sessions_remaining || 0) === 0}
                          >
                            <Zap className="w-4 h-4 mr-2" />
                            Quick Create Session
                          </Button>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                          Creates session for today at next available time slot
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Today's Sessions Tab */}
        <TabsContent value="today" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Today's Sessions ({todaySessions.length})</h3>
            <div className="text-sm text-gray-500">
              {formatDate(new Date())}
            </div>
          </div>

          {todaySessions.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-gray-500">No sessions scheduled for today</p>
                <p className="text-sm text-gray-400 mt-1">Use Quick Actions to create sessions</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {todaySessions.map((session) => (
                <Card key={session.id} className="hover:shadow-md transition-shadow">
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
                          <p className="font-medium">{session.start_time} - {session.end_time}</p>
                          <p className="text-sm text-gray-500">
                            {session.duration_minutes} minutes
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
                        {!session.completed && (
                          <Button 
                            size="sm" 
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => handleCompleteSession(session)}
                            disabled={loading}
                          >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Complete
                          </Button>
                        )}
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
            <h3 className="text-lg font-semibold">Upcoming Sessions (Next 3 Days)</h3>
            <div className="text-sm text-gray-500">
              {upcomingSessions.length} sessions
            </div>
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
                <Card key={session.id} className="hover:shadow-md transition-shadow">
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
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Bulk Session Scheduler Dialog */}
      <BulkSessionScheduler
        open={showBulkScheduler}
        onOpenChange={setShowBulkScheduler}
        trainer={trainer}
        assignedMembers={assignedMembers}
        onSessionsScheduled={() => {
          loadQuickSessionData()
          if (onSessionUpdated) onSessionUpdated()
        }}
      />
    </div>
  )
}
