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
  Edit,
  CheckCircle,
  AlertCircle,
  Repeat,
  Target,
  TrendingUp
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { formatCurrency, formatDate } from '@/lib/utils'
import { AssignTrainerDialog } from './AssignTrainerDialog'
import { ScheduleSessionDialog } from './ScheduleSessionDialog'
import { SessionDetailsDialog } from './SessionDetailsDialog'
import { ChangeTrainerDialog } from './ChangeTrainerDialog'

interface PTManagementProps {
  member: any
  onPTUpdated: () => void
}

export const PTManagement: React.FC<PTManagementProps> = ({
  member,
  onPTUpdated
}) => {
  const { gymId } = useAuth()
  const [loading, setLoading] = useState(false)
  const [activeDialog, setActiveDialog] = useState<string | null>(null)
  const [selectedSession, setSelectedSession] = useState<any>(null)
  
  // PT Data
  const [ptMemberships, setPTMemberships] = useState<any[]>([])
  const [trainingSessions, setTrainingSessions] = useState<any[]>([])
  const [assignedTrainers, setAssignedTrainers] = useState<any[]>([])
  const [trainerEarnings, setTrainerEarnings] = useState<any[]>([])

  useEffect(() => {
    if (member?.id) {
      loadPTData()
    }
  }, [member?.id])

  const loadPTData = async () => {
    setLoading(true)
    try {
      // Load PT memberships (packages with PT sessions)
      const { data: memberships, error: membershipError } = await supabase
        .from('memberships')
        .select(`
          *,
          membership_packages (
            id,
            name,
            price,
            description,
            features
          )
        `)
        .eq('member_id', member.id)
        .gt('pt_sessions_remaining', 0)

      if (membershipError) throw membershipError
      setPTMemberships(memberships || [])

      // Load training sessions
      const { data: sessions, error: sessionsError } = await supabase
        .from('training_sessions')
        .select(`
          *,
          staff:trainer_id (
            id,
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
        .eq('member_id', member.id)
        .order('session_date', { ascending: false })

      if (sessionsError) throw sessionsError
      setTrainingSessions(sessions || [])

      // Load trainer assignments
      const { data: trainers, error: trainersError } = await supabase
        .from('trainer_commission_rules')
        .select(`
          *,
          staff:trainer_id (
            id,
            role,
            profiles (
              first_name,
              last_name,
              phone
            )
          ),
          membership_packages (
            name,
            price
          )
        `)
        .eq('member_id', member.id)
        .eq('is_active', true)

      if (trainersError) throw trainersError
      setAssignedTrainers(trainers || [])

      // Load trainer earnings
      const { data: earnings, error: earningsError } = await supabase
        .from('trainer_earnings')
        .select(`
          *,
          staff:trainer_id (
            profiles (
              first_name,
              last_name
            )
          )
        `)
        .eq('member_id', member.id)
        .order('earning_date', { ascending: false })

      if (earningsError) throw earningsError
      setTrainerEarnings(earnings || [])

    } catch (error) {
      console.error('Error loading PT data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDialogClose = () => {
    setActiveDialog(null)
    setSelectedSession(null)
    loadPTData()
    onPTUpdated()
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

  const totalPTSessions = ptMemberships.reduce((sum, m) => sum + (m.pt_sessions_remaining || 0) + (m.pt_sessions_used || 0), 0)
  const remainingPTSessions = ptMemberships.reduce((sum, m) => sum + (m.pt_sessions_remaining || 0), 0)
  const completedSessions = trainingSessions.filter(s => s.completed).length
  const totalEarnings = trainerEarnings.reduce((sum, e) => sum + parseFloat(e.total_earning || 0), 0)

  return (
    <div className="space-y-6">
      {/* PT Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">Total Sessions</p>
                <p className="text-2xl font-bold">{totalPTSessions}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-orange-600" />
              <div>
                <p className="text-sm text-gray-600">Remaining</p>
                <p className="text-2xl font-bold text-orange-600">{remainingPTSessions}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-green-600">{completedSessions}</p>
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
      </div>

      <Tabs defaultValue="packages" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="packages">PT Packages</TabsTrigger>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
          <TabsTrigger value="trainers">Trainers</TabsTrigger>
          <TabsTrigger value="earnings">Earnings</TabsTrigger>
        </TabsList>

        {/* PT Packages Tab */}
        <TabsContent value="packages" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Active PT Packages</h3>
            <div className="space-x-2">
              <Button 
                size="sm" 
                onClick={() => setActiveDialog('assign-trainer')}
                disabled={ptMemberships.length === 0}
              >
                <User className="w-4 h-4 mr-2" />
                Assign Trainer
              </Button>
              <Button 
                size="sm" 
                onClick={() => setActiveDialog('schedule-session')}
                disabled={remainingPTSessions === 0}
              >
                <Plus className="w-4 h-4 mr-2" />
                Schedule Session
              </Button>
            </div>
          </div>

          {ptMemberships.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-gray-500">No active PT packages found</p>
                <p className="text-sm text-gray-400 mt-1">Member needs to purchase a package with PT sessions</p>
              </CardContent>
            </Card>
          ) : (
            ptMemberships.map((membership) => (
              <Card key={membership.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span>{membership.membership_packages?.name || 'PT Package'}</span>
                      <Badge className="bg-blue-100 text-blue-800">
                        {membership.pt_sessions_remaining || 0} sessions left
                      </Badge>
                    </div>
                    <div className="text-sm text-gray-500">
                      {formatDate(membership.start_date)} - {formatDate(membership.end_date)}
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Total Sessions:</span>
                      <p className="font-medium">{(membership.pt_sessions_remaining || 0) + (membership.pt_sessions_used || 0)}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Used:</span>
                      <p className="font-medium">{membership.pt_sessions_used || 0}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Remaining:</span>
                      <p className="font-medium text-orange-600">{membership.pt_sessions_remaining || 0}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Progress:</span>
                      <p className="font-medium">
                        {Math.round(((membership.pt_sessions_used || 0) / ((membership.pt_sessions_remaining || 0) + (membership.pt_sessions_used || 0))) * 100) || 0}%
                      </p>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-4">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ 
                          width: `${Math.round(((membership.pt_sessions_used || 0) / ((membership.pt_sessions_remaining || 0) + (membership.pt_sessions_used || 0))) * 100) || 0}%` 
                        }}
                      ></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Sessions Tab */}
        <TabsContent value="sessions" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Training Sessions</h3>
            <Button 
              size="sm" 
              onClick={() => setActiveDialog('schedule-session')}
              disabled={remainingPTSessions === 0}
            >
              <Plus className="w-4 h-4 mr-2" />
              Schedule New Session
            </Button>
          </div>

          {trainingSessions.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-gray-500">No training sessions scheduled</p>
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
                          <p className="font-medium">{formatDate(session.session_date)}</p>
                          <p className="text-sm text-gray-500">
                            {session.start_time} - {session.end_time} ({session.duration_minutes} min)
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Trainer:</p>
                          <p className="font-medium">
                            {session.staff?.profiles?.first_name} {session.staff?.profiles?.last_name}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Package:</p>
                          <p className="font-medium">{session.memberships?.membership_packages?.name}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Session:</p>
                          <p className="font-medium">{session.session_number}/{session.total_sessions}</p>
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

        {/* Trainers Tab */}
        <TabsContent value="trainers" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Assigned Trainers</h3>
            <Button 
              size="sm" 
              onClick={() => setActiveDialog('change-trainer')}
              disabled={assignedTrainers.length === 0}
            >
              <Repeat className="w-4 h-4 mr-2" />
              Change Trainer
            </Button>
          </div>

          {assignedTrainers.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-gray-500">No trainers assigned</p>
                <Button 
                  className="mt-2" 
                  onClick={() => setActiveDialog('assign-trainer')}
                  disabled={ptMemberships.length === 0}
                >
                  Assign Trainer
                </Button>
              </CardContent>
            </Card>
          ) : (
            assignedTrainers.map((assignment) => (
              <Card key={assignment.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <User className="w-5 h-5" />
                      <span>
                        {assignment.staff?.profiles?.first_name} {assignment.staff?.profiles?.last_name}
                      </span>
                      <Badge className="bg-green-100 text-green-800">
                        {assignment.staff?.role}
                      </Badge>
                    </div>
                    <div className="text-sm text-gray-500">
                      {assignment.commission_type === 'percentage' ? `${assignment.commission_value}%` : formatCurrency(assignment.commission_value)}
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Package:</span>
                      <p className="font-medium">{assignment.membership_packages?.name}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Commission Type:</span>
                      <p className="font-medium capitalize">{assignment.commission_type}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Rate:</span>
                      <p className="font-medium">
                        {assignment.commission_type === 'percentage' 
                          ? `${assignment.commission_value}%` 
                          : formatCurrency(assignment.commission_value)
                        }
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-600">Valid Until:</span>
                      <p className="font-medium">
                        {assignment.valid_until ? formatDate(assignment.valid_until) : 'Ongoing'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Earnings Tab */}
        <TabsContent value="earnings" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Trainer Earnings</h3>
            <div className="text-sm text-gray-500">
              Total: {formatCurrency(totalEarnings)}
            </div>
          </div>

          {trainerEarnings.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-gray-500">No earnings recorded</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {trainerEarnings.map((earning) => (
                <Card key={earning.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div>
                          <p className="font-medium">
                            {earning.staff?.profiles?.first_name} {earning.staff?.profiles?.last_name}
                          </p>
                          <p className="text-sm text-gray-500">{earning.earning_type}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Base Amount:</p>
                          <p className="font-medium">{formatCurrency(earning.base_amount)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Commission Rate:</p>
                          <p className="font-medium">{earning.commission_rate}%</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Date:</p>
                          <p className="font-medium">{formatDate(earning.earning_date)}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600">Total Earning</p>
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
      {activeDialog === 'assign-trainer' && (
        <AssignTrainerDialog
          open={true}
          onOpenChange={() => setActiveDialog(null)}
          member={member}
          ptMemberships={ptMemberships}
          onAssignmentComplete={handleDialogClose}
        />
      )}

      {activeDialog === 'schedule-session' && (
        <ScheduleSessionDialog
          open={true}
          onOpenChange={() => setActiveDialog(null)}
          member={member}
          ptMemberships={ptMemberships}
          assignedTrainers={assignedTrainers}
          onSessionScheduled={handleDialogClose}
        />
      )}

      {activeDialog === 'session-details' && selectedSession && (
        <SessionDetailsDialog
          open={true}
          onOpenChange={() => setActiveDialog(null)}
          session={selectedSession}
          member={member}
          onSessionUpdated={handleDialogClose}
        />
      )}

      {activeDialog === 'change-trainer' && (
        <ChangeTrainerDialog
          open={true}
          onOpenChange={() => setActiveDialog(null)}
          member={member}
          currentTrainers={assignedTrainers}
          ptMemberships={ptMemberships}
          onTrainerChanged={handleDialogClose}
        />
      )}
    </div>
  )
}
