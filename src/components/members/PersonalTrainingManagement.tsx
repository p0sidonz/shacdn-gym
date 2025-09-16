import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Plus, 
  Target, 
  Calendar, 
  Clock, 
  User, 
  CheckCircle2, 
  AlertCircle,
  Edit,
  Trash2,
  Play,
  Pause,
  Star,
  Activity,
  DollarSign
} from 'lucide-react'
import { formatDate, formatCurrency } from '@/lib/utils'
import type { MemberWithDetails } from '@/types'
import { usePTSessions } from '@/hooks/usePTSessions'
import { PTService } from '@/services/ptService'

interface PersonalTrainingManagementProps {
  member: MemberWithDetails
  onPTUpdated?: () => void
}

export const PersonalTrainingManagement: React.FC<PersonalTrainingManagementProps> = ({ 
  member, 
  onPTUpdated 
}) => {
  const [isAddPTOpen, setIsAddPTOpen] = useState(false)
  const [isEditPTOpen, setIsEditPTOpen] = useState(false)
  const [editingSession, setEditingSession] = useState<any>(null)
  const [trainers, setTrainers] = useState<Array<{id: string, name: string}>>([])

  // Use real data from Supabase
  const { 
    ptSessions, 
    loading, 
    error, 
    createPTSession, 
    updatePTSession, 
    deletePTSession,
    completeSession,
    cancelSession
  } = usePTSessions({ member_id: member.id })

  // Load trainers for assignment
  useEffect(() => {
    const loadTrainers = async () => {
      try {
        const gymId = member.gym_id
        if (gymId) {
          const trainerData = await PTService.getActiveTrainers(gymId)
          setTrainers(trainerData)
        }
      } catch (error) {
        console.error('Error loading trainers:', error)
      }
    }
    loadTrainers()
  }, [member.gym_id])

  const getStatusBadge = (session: any) => {
    if (session.cancelled) {
      return <Badge variant="destructive">Cancelled</Badge>
    }
    if (session.no_show) {
      return <Badge className="bg-red-100 text-red-800 border-red-200">No Show</Badge>
    }
    if (session.completed) {
      return <Badge className="bg-green-100 text-green-800 border-green-200">Completed</Badge>
    }
    return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Scheduled</Badge>
  }

  const handleAddPTSession = async (formData: FormData) => {
    try {
      await createPTSession({
        member_id: member.id,
        trainer_id: formData.get('trainerName') as string,
        membership_id: member.current_membership?.id,
        session_date: formData.get('sessionDate') as string,
        start_time: formData.get('sessionTime') as string,
        end_time: formData.get('endTime') as string,
        duration_minutes: parseInt(formData.get('duration') as string),
        session_type: formData.get('sessionType') as string || 'personal_training',
        session_focus: formData.get('sessionFocus') as string,
        session_fee: parseFloat(formData.get('sessionFee') as string),
        trainer_fee: parseFloat(formData.get('trainerFee') as string),
        notes: formData.get('notes') as string || undefined
      })
      setIsAddPTOpen(false)
      if (onPTUpdated) onPTUpdated()
    } catch (error) {
      console.error('Error adding PT session:', error)
    }
  }

  const handleEditSession = (session: any) => {
    setEditingSession(session)
    setIsEditPTOpen(true)
  }

  const handleDeleteSession = async (id: string) => {
    try {
      await deletePTSession(id)
      if (onPTUpdated) onPTUpdated()
    } catch (error) {
      console.error('Error deleting PT session:', error)
    }
  }

  const handleCompleteSession = async (id: string) => {
    try {
      await completeSession(id, {
        member_feedback: '',
        trainer_notes: '',
        session_rating: 5,
        calories_burned: 0,
        homework_assigned: '',
        next_session_plan: ''
      })
      if (onPTUpdated) onPTUpdated()
    } catch (error) {
      console.error('Error completing session:', error)
    }
  }

  const handleCancelSession = async (id: string) => {
    try {
      await cancelSession(id, {
        cancellation_reason: 'Cancelled by admin',
        cancelled_by: 'Admin',
        cancellation_fee: 0
      })
      if (onPTUpdated) onPTUpdated()
    } catch (error) {
      console.error('Error cancelling session:', error)
    }
  }

  const totalSessions = ptSessions.length
  const completedSessions = ptSessions.filter(s => s.completed).length
  const remainingSessions = totalSessions - completedSessions
  const totalRevenue = ptSessions.reduce((sum, s) => sum + s.session_fee, 0)

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Personal Training Sessions</h3>
          <p className="text-sm text-gray-500">Manage personal training sessions and trainer assignments</p>
        </div>
        <Dialog open={isAddPTOpen} onOpenChange={setIsAddPTOpen}>
          <DialogTrigger asChild>
            <Button className="bg-orange-500 hover:bg-orange-600 text-white">
              <Plus className="w-4 h-4 mr-2" />
              Add PT Session
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New PT Session</DialogTitle>
              <DialogDescription>
                Schedule a new personal training session for this member
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={(e) => {
              e.preventDefault()
              const formData = new FormData(e.currentTarget)
              handleAddPTSession(formData)
            }}>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="trainerName">Trainer</Label>
                  <Select name="trainerName" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select trainer" />
                    </SelectTrigger>
                    <SelectContent>
                      {trainers.map((trainer) => (
                        <SelectItem key={trainer.id} value={trainer.id}>
                          {trainer.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="sessionDate">Session Date</Label>
                    <Input type="date" name="sessionDate" required />
                  </div>
                  <div>
                    <Label htmlFor="sessionTime">Start Time</Label>
                    <Input type="time" name="sessionTime" required />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="endTime">End Time</Label>
                    <Input type="time" name="endTime" required />
                  </div>
                  <div>
                    <Label htmlFor="duration">Duration (minutes)</Label>
                    <Input 
                      type="number" 
                      name="duration" 
                      defaultValue="60"
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="sessionType">Session Type</Label>
                  <Select name="sessionType" defaultValue="personal_training">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="personal_training">Personal Training</SelectItem>
                      <SelectItem value="group_training">Group Training</SelectItem>
                      <SelectItem value="nutrition_consultation">Nutrition Consultation</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="sessionFocus">Session Focus</Label>
                  <Input 
                    name="sessionFocus" 
                    placeholder="e.g., Strength Training, Cardio, Flexibility"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="sessionFee">Session Fee</Label>
                    <Input 
                      type="number" 
                      name="sessionFee" 
                      step="0.01"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="trainerFee">Trainer Fee</Label>
                    <Input 
                      type="number" 
                      name="trainerFee" 
                      step="0.01"
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea 
                    name="notes" 
                    placeholder="Additional notes for this session"
                  />
                </div>

                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setIsAddPTOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    Add PT Session
                  </Button>
                </div>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Target className="w-5 h-5 text-blue-600" />
              <div>
                <div className="text-2xl font-bold">{totalSessions}</div>
                <div className="text-sm text-gray-500">Total Sessions</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <div>
                <div className="text-2xl font-bold">{completedSessions}</div>
                <div className="text-sm text-gray-500">Completed</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-orange-600" />
              <div>
                <div className="text-2xl font-bold">{remainingSessions}</div>
                <div className="text-sm text-gray-500">Remaining</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <DollarSign className="w-5 h-5 text-green-600" />
              <div>
                <div className="text-2xl font-bold">{formatCurrency(totalRevenue)}</div>
                <div className="text-sm text-gray-500">Total Revenue</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* PT Sessions Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Session #</TableHead>
                <TableHead>Trainer</TableHead>
                <TableHead>Date & Time</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Focus</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Fee</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                    Loading PT sessions...
                  </TableCell>
                </TableRow>
              ) : error ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-red-500">
                    Error loading PT sessions: {error}
                  </TableCell>
                </TableRow>
              ) : ptSessions.length > 0 ? (
                ptSessions.map((session) => (
                  <TableRow key={session.id}>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">{session.session_number}</span>
                        <span className="text-sm text-gray-500">/ {session.total_sessions}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <User className="w-4 h-4 text-gray-400" />
                        <span>
                          {session.trainer?.profile 
                            ? `${session.trainer.profile.first_name} ${session.trainer.profile.last_name}`
                            : session.trainer?.employee_id || 'Not assigned'
                          }
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <div>
                          <div>{formatDate(new Date(session.session_date))}</div>
                          <div className="text-sm text-gray-500">{session.start_time}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{session.duration_minutes} min</TableCell>
                    <TableCell>{session.session_focus}</TableCell>
                    <TableCell>{getStatusBadge(session)}</TableCell>
                    <TableCell>{formatCurrency(session.session_fee)}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {!session.completed && !session.cancelled && (
                          <>
                            <Button 
                              size="sm" 
                              variant="ghost"
                              onClick={() => handleCompleteSession(session.id)}
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost"
                              onClick={() => handleCancelSession(session.id)}
                            >
                              <Pause className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          onClick={() => handleEditSession(session)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          onClick={() => handleDeleteSession(session.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                    <Target className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No PT Sessions Found</h3>
                    <p>No personal training sessions scheduled for this member</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit PT Session Dialog */}
      <Dialog open={isEditPTOpen} onOpenChange={setIsEditPTOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit PT Session</DialogTitle>
            <DialogDescription>
              Update the personal training session details
            </DialogDescription>
          </DialogHeader>
          {editingSession && (
            <form onSubmit={(e) => {
              e.preventDefault()
              // Handle edit logic here
              setIsEditPTOpen(false)
              setEditingSession(null)
            }}>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="editTrainerName">Trainer</Label>
                    <Input 
                      name="editTrainerName" 
                      defaultValue={editingSession.trainerName}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="editSessionDate">Session Date</Label>
                    <Input 
                      type="date" 
                      name="editSessionDate" 
                      defaultValue={editingSession.sessionDate}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="editSessionTime">Session Time</Label>
                    <Input 
                      type="time" 
                      name="editSessionTime" 
                      defaultValue={editingSession.sessionTime}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="editDuration">Duration (minutes)</Label>
                    <Input 
                      type="number" 
                      name="editDuration" 
                      defaultValue={editingSession.duration}
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="editSessionFocus">Session Focus</Label>
                  <Input 
                    name="editSessionFocus" 
                    defaultValue={editingSession.sessionFocus}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="editSessionFee">Session Fee</Label>
                    <Input 
                      type="number" 
                      name="editSessionFee" 
                      defaultValue={editingSession.sessionFee}
                      step="0.01"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="editTrainerFee">Trainer Fee</Label>
                    <Input 
                      type="number" 
                      name="editTrainerFee" 
                      defaultValue={editingSession.trainerFee}
                      step="0.01"
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="editNotes">Notes</Label>
                  <Textarea 
                    name="editNotes" 
                    defaultValue={editingSession.notes}
                  />
                </div>

                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setIsEditPTOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    Update Session
                  </Button>
                </div>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
