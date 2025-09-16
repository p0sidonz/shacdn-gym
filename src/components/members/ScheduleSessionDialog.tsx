import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar, Clock, User, Target } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { formatCurrency, formatDate } from '@/lib/utils'

interface ScheduleSessionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  member: any
  ptMemberships: any[]
  assignedTrainers: any[]
  onSessionScheduled: () => void
}

export const ScheduleSessionDialog: React.FC<ScheduleSessionDialogProps> = ({
  open,
  onOpenChange,
  member,
  ptMemberships,
  assignedTrainers,
  onSessionScheduled
}) => {
  const { gymId } = useAuth()
  const [loading, setLoading] = useState(false)
  
  const [formData, setFormData] = useState({
    membership_id: '',
    trainer_id: '',
    session_date: '',
    start_time: '',
    end_time: '',
    duration_minutes: 60,
    session_type: 'personal_training',
    session_focus: '',
    session_fee: 0,
    trainer_fee: 0,
    notes: '',
    homework_assigned: '',
    next_session_plan: ''
  })

  const [sessionCalculation, setSessionCalculation] = useState<any>(null)

  useEffect(() => {
    // Set default date to tomorrow
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    setFormData(prev => ({
      ...prev,
      session_date: tomorrow.toISOString().split('T')[0]
    }))
  }, [])

  useEffect(() => {
    if (formData.membership_id && formData.trainer_id) {
      calculateSessionDetails()
    }
  }, [formData.membership_id, formData.trainer_id])

  useEffect(() => {
    if (formData.start_time) {
      calculateEndTime()
    }
  }, [formData.start_time, formData.duration_minutes])

  const calculateEndTime = () => {
    if (!formData.start_time || !formData.duration_minutes) return

    const [hours, minutes] = formData.start_time.split(':').map(Number)
    const startMinutes = hours * 60 + minutes
    const endMinutes = startMinutes + formData.duration_minutes
    
    const endHours = Math.floor(endMinutes / 60)
    const endMins = endMinutes % 60
    
    const endTime = `${String(endHours).padStart(2, '0')}:${String(endMins).padStart(2, '0')}`
    setFormData(prev => ({ ...prev, end_time: endTime }))
  }

  const calculateSessionDetails = () => {
    const selectedMembership = ptMemberships.find(m => m.id === formData.membership_id)
    const selectedTrainer = assignedTrainers.find(t => t.trainer_id === formData.trainer_id)
    
    if (!selectedMembership || !selectedTrainer) return

    const totalSessions = (selectedMembership.pt_sessions_remaining || 0) + (selectedMembership.pt_sessions_used || 0)
    const currentSessionNumber = (selectedMembership.pt_sessions_used || 0) + 1
    
    // Calculate session fee based on package
    const sessionFee = selectedMembership.total_amount_due / totalSessions
    
    // Calculate trainer fee based on commission rule
    let trainerFee = 0
    if (selectedTrainer.commission_type === 'per_session') {
      trainerFee = selectedTrainer.commission_value
    } else if (selectedTrainer.commission_type === 'percentage') {
      trainerFee = (sessionFee * selectedTrainer.commission_value) / 100
    } else if (selectedTrainer.commission_type === 'fixed_amount') {
      trainerFee = selectedTrainer.commission_value / totalSessions
    }

    setSessionCalculation({
      selectedMembership,
      selectedTrainer,
      totalSessions,
      currentSessionNumber,
      sessionFee,
      trainerFee,
      remainingSessions: selectedMembership.pt_sessions_remaining || 0
    })

    setFormData(prev => ({
      ...prev,
      session_fee: Math.round(sessionFee),
      trainer_fee: Math.round(trainerFee)
    }))
  }

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.membership_id || !formData.trainer_id) {
      alert('Please select membership and trainer')
      return
    }

    if (!formData.session_date || !formData.start_time) {
      alert('Please select date and time')
      return
    }

    if (!sessionCalculation) {
      alert('Session calculation not available')
      return
    }

    setLoading(true)

    try {
      // Check for trainer availability
      const { data: conflictingSessions } = await supabase
        .from('training_sessions')
        .select('id')
        .eq('trainer_id', formData.trainer_id)
        .eq('session_date', formData.session_date)
        .or(`start_time.lte.${formData.start_time},end_time.gte.${formData.end_time}`)
        .eq('cancelled', false)

      if (conflictingSessions && conflictingSessions.length > 0) {
        alert('Trainer is not available at this time. Please choose a different time slot.')
        setLoading(false)
        return
      }

      // Create training session
      const sessionData = {
        member_id: member.id,
        trainer_id: formData.trainer_id,
        membership_id: formData.membership_id,
        session_date: formData.session_date,
        start_time: formData.start_time,
        end_time: formData.end_time,
        duration_minutes: formData.duration_minutes,
        session_type: formData.session_type,
        session_focus: formData.session_focus,
        session_number: sessionCalculation.currentSessionNumber,
        total_sessions: sessionCalculation.totalSessions,
        session_fee: formData.session_fee,
        trainer_fee: formData.trainer_fee,
        notes: formData.notes,
        homework_assigned: formData.homework_assigned,
        next_session_plan: formData.next_session_plan,
        completed: false,
        cancelled: false
      }

      const { data: newSession, error: sessionError } = await supabase
        .from('training_sessions')
        .insert([sessionData])
        .select()
        .single()

      if (sessionError) throw sessionError

      // Update membership PT session count
      await supabase
        .from('memberships')
        .update({
          pt_sessions_remaining: sessionCalculation.remainingSessions - 1,
          pt_sessions_used: sessionCalculation.currentSessionNumber
        })
        .eq('id', formData.membership_id)

      // Create trainer earning record for this session
      const earningData = {
        trainer_id: formData.trainer_id,
        member_id: member.id,
        membership_id: formData.membership_id,
        training_session_id: newSession.id,
        commission_rule_id: sessionCalculation.selectedTrainer.id,
        earning_type: 'session_conducted',
        base_amount: formData.session_fee,
        commission_rate: sessionCalculation.selectedTrainer.commission_type === 'percentage' ? sessionCalculation.selectedTrainer.commission_value : null,
        commission_amount: formData.trainer_fee,
        total_earning: formData.trainer_fee,
        earning_date: formData.session_date,
        earning_month: new Date(formData.session_date).toISOString().slice(0, 7),
        payment_cycle: 'session',
        is_paid: false,
        notes: `Session ${sessionCalculation.currentSessionNumber}/${sessionCalculation.totalSessions}`,
        created_by: (await supabase.auth.getUser()).data.user?.id
      }

      await supabase
        .from('trainer_earnings')
        .insert([earningData])

      alert(`Session scheduled successfully! Session ${sessionCalculation.currentSessionNumber}/${sessionCalculation.totalSessions}`)
      onSessionScheduled()
      onOpenChange(false)

    } catch (error) {
      console.error('Error scheduling session:', error)
      alert(`Error scheduling session: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  // Get available trainers for selected membership
  const availableTrainers = assignedTrainers.filter(trainer => {
    const selectedMembership = ptMemberships.find(m => m.id === formData.membership_id)
    return selectedMembership && trainer.package_id === selectedMembership.package_id
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-green-600" />
            Schedule PT Session
          </DialogTitle>
          <DialogDescription>
            Schedule a personal training session for {member.profile?.first_name} {member.profile?.last_name}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Package & Trainer Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Session Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="membership_id">PT Package *</Label>
                  <Select value={formData.membership_id} onValueChange={(value) => handleInputChange('membership_id', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select package" />
                    </SelectTrigger>
                    <SelectContent>
                      {ptMemberships.map((membership) => (
                        <SelectItem key={membership.id} value={membership.id}>
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {membership.membership_packages?.name}
                            </span>
                            <span className="text-xs text-gray-500">
                              {membership.pt_sessions_remaining || 0} sessions remaining
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="trainer_id">Trainer *</Label>
                  <Select 
                    value={formData.trainer_id} 
                    onValueChange={(value) => handleInputChange('trainer_id', value)}
                    disabled={!formData.membership_id}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select trainer" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableTrainers.map((trainer) => (
                        <SelectItem key={trainer.trainer_id} value={trainer.trainer_id}>
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {trainer.staff?.profiles?.first_name} {trainer.staff?.profiles?.last_name}
                            </span>
                            <span className="text-xs text-gray-500">
                              Commission: {trainer.commission_type === 'percentage' 
                                ? `${trainer.commission_value}%` 
                                : formatCurrency(trainer.commission_value)
                              }
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {sessionCalculation && (
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-blue-700">Session Number:</span>
                      <p className="font-medium text-blue-800">
                        {sessionCalculation.currentSessionNumber}/{sessionCalculation.totalSessions}
                      </p>
                    </div>
                    <div>
                      <span className="text-blue-700">Session Fee:</span>
                      <p className="font-medium text-blue-800">{formatCurrency(sessionCalculation.sessionFee)}</p>
                    </div>
                    <div>
                      <span className="text-blue-700">Trainer Fee:</span>
                      <p className="font-medium text-blue-800">{formatCurrency(sessionCalculation.trainerFee)}</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Date & Time */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Schedule
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="session_date">Session Date *</Label>
                  <Input
                    id="session_date"
                    type="date"
                    value={formData.session_date}
                    onChange={(e) => handleInputChange('session_date', e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="start_time">Start Time *</Label>
                  <Input
                    id="start_time"
                    type="time"
                    value={formData.start_time}
                    onChange={(e) => handleInputChange('start_time', e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="duration_minutes">Duration (minutes)</Label>
                  <Select value={String(formData.duration_minutes)} onValueChange={(value) => handleInputChange('duration_minutes', parseInt(value))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30">30 minutes</SelectItem>
                      <SelectItem value="45">45 minutes</SelectItem>
                      <SelectItem value="60">60 minutes</SelectItem>
                      <SelectItem value="90">90 minutes</SelectItem>
                      <SelectItem value="120">120 minutes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {formData.end_time && (
                <div className="text-sm text-gray-600">
                  End Time: <span className="font-medium">{formData.end_time}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Session Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Target className="w-4 h-4" />
                Session Focus
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="session_type">Session Type</Label>
                  <Select value={formData.session_type} onValueChange={(value) => handleInputChange('session_type', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="personal_training">Personal Training</SelectItem>
                      <SelectItem value="strength_training">Strength Training</SelectItem>
                      <SelectItem value="cardio_training">Cardio Training</SelectItem>
                      <SelectItem value="functional_training">Functional Training</SelectItem>
                      <SelectItem value="flexibility_training">Flexibility Training</SelectItem>
                      <SelectItem value="nutrition_consultation">Nutrition Consultation</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="session_focus">Session Focus</Label>
                  <Input
                    id="session_focus"
                    value={formData.session_focus}
                    onChange={(e) => handleInputChange('session_focus', e.target.value)}
                    placeholder="e.g., Upper body strength, Weight loss"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="notes">Session Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  placeholder="Any specific notes for this session"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="homework_assigned">Homework/Exercise Plan</Label>
                  <Textarea
                    id="homework_assigned"
                    value={formData.homework_assigned}
                    onChange={(e) => handleInputChange('homework_assigned', e.target.value)}
                    placeholder="Exercises to practice before next session"
                    rows={2}
                  />
                </div>
                <div>
                  <Label htmlFor="next_session_plan">Next Session Plan</Label>
                  <Textarea
                    id="next_session_plan"
                    value={formData.next_session_plan}
                    onChange={(e) => handleInputChange('next_session_plan', e.target.value)}
                    placeholder="Plan for the next session"
                    rows={2}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loading || !formData.membership_id || !formData.trainer_id || availableTrainers.length === 0}
              className="bg-green-600 hover:bg-green-700"
            >
              {loading ? 'Scheduling...' : 'Schedule Session'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
