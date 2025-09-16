import React, { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  CheckCircle, 
  X, 
  Edit, 
  Clock, 
  User, 
  Target,
  Star,
  Calendar
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { formatCurrency, formatDate } from '@/lib/utils'

interface SessionDetailsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  session: any
  member: any
  onSessionUpdated: () => void
}

export const SessionDetailsDialog: React.FC<SessionDetailsDialogProps> = ({
  open,
  onOpenChange,
  session,
  member,
  onSessionUpdated
}) => {
  const [loading, setLoading] = useState(false)
  const [editMode, setEditMode] = useState(false)
  
  const [formData, setFormData] = useState({
    session_rating: session.session_rating || 0,
    calories_burned: session.calories_burned || 0,
    member_feedback: session.member_feedback || '',
    trainer_notes: session.trainer_notes || '',
    homework_assigned: session.homework_assigned || '',
    next_session_plan: session.next_session_plan || '',
    exercises_performed: session.exercises_performed || [],
    cancellation_reason: '',
    no_show_reason: ''
  })

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleCompleteSession = async () => {
    if (!session.completed) {
      setLoading(true)
      try {
        await supabase
          .from('training_sessions')
          .update({
            completed: true,
            session_rating: formData.session_rating,
            calories_burned: formData.calories_burned,
            member_feedback: formData.member_feedback,
            trainer_notes: formData.trainer_notes,
            homework_assigned: formData.homework_assigned,
            next_session_plan: formData.next_session_plan
          })
          .eq('id', session.id)

        alert('Session marked as completed!')
        onSessionUpdated()
        onOpenChange(false)
      } catch (error) {
        console.error('Error completing session:', error)
        alert('Error completing session')
      } finally {
        setLoading(false)
      }
    }
  }

  const handleCancelSession = async () => {
    if (!formData.cancellation_reason) {
      alert('Please provide a cancellation reason')
      return
    }

    setLoading(true)
    try {
      await supabase
        .from('training_sessions')
        .update({
          cancelled: true,
          cancellation_reason: formData.cancellation_reason,
          cancelled_by: 'staff'
        })
        .eq('id', session.id)

      // Return session count to membership
      const { data: membership } = await supabase
        .from('memberships')
        .select('pt_sessions_remaining, pt_sessions_used')
        .eq('id', session.membership_id)
        .single()

      if (membership) {
        await supabase
          .from('memberships')
          .update({
            pt_sessions_remaining: (membership.pt_sessions_remaining || 0) + 1,
            pt_sessions_used: Math.max(0, (membership.pt_sessions_used || 0) - 1)
          })
          .eq('id', session.membership_id)
      }

      alert('Session cancelled successfully')
      onSessionUpdated()
      onOpenChange(false)
    } catch (error) {
      console.error('Error cancelling session:', error)
      alert('Error cancelling session')
    } finally {
      setLoading(false)
    }
  }

  const handleMarkNoShow = async () => {
    setLoading(true)
    try {
      await supabase
        .from('training_sessions')
        .update({
          no_show: true,
          notes: formData.no_show_reason
        })
        .eq('id', session.id)

      alert('Session marked as no-show')
      onSessionUpdated()
      onOpenChange(false)
    } catch (error) {
      console.error('Error marking no-show:', error)
      alert('Error marking no-show')
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = () => {
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

  const canEdit = !session.cancelled && !session.completed
  const isPastSession = new Date(session.session_date) < new Date()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              Session Details
            </div>
            <div className="flex items-center gap-2">
              {getStatusBadge()}
              {canEdit && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setEditMode(!editMode)}
                >
                  <Edit className="w-4 h-4 mr-1" />
                  {editMode ? 'View' : 'Edit'}
                </Button>
              )}
            </div>
          </DialogTitle>
          <DialogDescription>
            Training session for {member.profile?.first_name} {member.profile?.last_name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Session Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Session Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <div>
                    <span className="text-gray-600">Date:</span>
                    <p className="font-medium">{formatDate(session.session_date)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-500" />
                  <div>
                    <span className="text-gray-600">Time:</span>
                    <p className="font-medium">{session.start_time} - {session.end_time}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-gray-500" />
                  <div>
                    <span className="text-gray-600">Trainer:</span>
                    <p className="font-medium">
                      {session.staff?.profiles?.first_name} {session.staff?.profiles?.last_name}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-gray-500" />
                  <div>
                    <span className="text-gray-600">Session:</span>
                    <p className="font-medium">{session.session_number}/{session.total_sessions}</p>
                  </div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Type:</span>
                  <p className="font-medium capitalize">{session.session_type?.replace('_', ' ')}</p>
                </div>
                <div>
                  <span className="text-gray-600">Focus:</span>
                  <p className="font-medium">{session.session_focus || 'Not specified'}</p>
                </div>
                <div>
                  <span className="text-gray-600">Duration:</span>
                  <p className="font-medium">{session.duration_minutes} minutes</p>
                </div>
                <div>
                  <span className="text-gray-600">Fee:</span>
                  <p className="font-medium">{formatCurrency(session.session_fee || 0)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Session Details Form */}
          {editMode || session.completed ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Session Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="session_rating">Session Rating (1-5)</Label>
                    <Input
                      id="session_rating"
                      type="number"
                      min="1"
                      max="5"
                      value={formData.session_rating}
                      onChange={(e) => handleInputChange('session_rating', parseInt(e.target.value) || 0)}
                      disabled={!editMode}
                    />
                  </div>
                  <div>
                    <Label htmlFor="calories_burned">Calories Burned</Label>
                    <Input
                      id="calories_burned"
                      type="number"
                      value={formData.calories_burned}
                      onChange={(e) => handleInputChange('calories_burned', parseInt(e.target.value) || 0)}
                      disabled={!editMode}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="member_feedback">Member Feedback</Label>
                  <Textarea
                    id="member_feedback"
                    value={formData.member_feedback}
                    onChange={(e) => handleInputChange('member_feedback', e.target.value)}
                    placeholder="How did the member feel about the session?"
                    rows={2}
                    disabled={!editMode}
                  />
                </div>

                <div>
                  <Label htmlFor="trainer_notes">Trainer Notes</Label>
                  <Textarea
                    id="trainer_notes"
                    value={formData.trainer_notes}
                    onChange={(e) => handleInputChange('trainer_notes', e.target.value)}
                    placeholder="Trainer's observations and notes"
                    rows={2}
                    disabled={!editMode}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="homework_assigned">Homework Assigned</Label>
                    <Textarea
                      id="homework_assigned"
                      value={formData.homework_assigned}
                      onChange={(e) => handleInputChange('homework_assigned', e.target.value)}
                      placeholder="Exercises to practice"
                      rows={2}
                      disabled={!editMode}
                    />
                  </div>
                  <div>
                    <Label htmlFor="next_session_plan">Next Session Plan</Label>
                    <Textarea
                      id="next_session_plan"
                      value={formData.next_session_plan}
                      onChange={(e) => handleInputChange('next_session_plan', e.target.value)}
                      placeholder="Plan for next session"
                      rows={2}
                      disabled={!editMode}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            /* View Mode */
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Session Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Session Type:</span>
                    <p className="font-medium capitalize">{session.session_type?.replace('_', ' ')}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Focus Area:</span>
                    <p className="font-medium">{session.session_focus || 'Not specified'}</p>
                  </div>
                </div>
                {session.notes && (
                  <div className="mt-4">
                    <span className="text-gray-600">Notes:</span>
                    <p className="font-medium mt-1">{session.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          {canEdit && isPastSession && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Session Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {!session.completed && !session.no_show && (
                  <div className="space-y-4">
                    <Button
                      onClick={handleCompleteSession}
                      disabled={loading}
                      className="w-full bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Mark as Completed
                    </Button>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="cancellation_reason">Cancellation Reason</Label>
                        <Textarea
                          id="cancellation_reason"
                          value={formData.cancellation_reason}
                          onChange={(e) => handleInputChange('cancellation_reason', e.target.value)}
                          placeholder="Reason for cancellation"
                          rows={2}
                        />
                        <Button
                          onClick={handleCancelSession}
                          disabled={loading || !formData.cancellation_reason}
                          variant="outline"
                          className="w-full mt-2 text-red-600 hover:text-red-700"
                        >
                          <X className="w-4 h-4 mr-2" />
                          Cancel Session
                        </Button>
                      </div>

                      <div>
                        <Label htmlFor="no_show_reason">No-Show Reason</Label>
                        <Textarea
                          id="no_show_reason"
                          value={formData.no_show_reason}
                          onChange={(e) => handleInputChange('no_show_reason', e.target.value)}
                          placeholder="Reason for no-show"
                          rows={2}
                        />
                        <Button
                          onClick={handleMarkNoShow}
                          disabled={loading}
                          variant="outline"
                          className="w-full mt-2 text-orange-600 hover:text-orange-700"
                        >
                          Mark as No-Show
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Rating Display */}
          {session.session_rating && session.session_rating > 0 && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Star className="w-5 h-5 text-yellow-500" />
                  <span className="font-medium">Session Rating: </span>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-4 h-4 ${
                          star <= session.session_rating
                            ? 'text-yellow-400 fill-current'
                            : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-sm text-gray-500">
                    ({session.session_rating}/5)
                  </span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="flex justify-end space-x-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
