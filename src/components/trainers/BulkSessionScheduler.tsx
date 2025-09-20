import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
// import { Checkbox } from '@/components/ui/checkbox' // Using HTML checkbox for now
import { 
  Calendar, 
  Clock, 
  Users, 
  Zap
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { formatDate } from '@/lib/utils'

interface BulkSessionSchedulerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  trainer: any
  assignedMembers: any[]
  onSessionsScheduled: () => void
}

export const BulkSessionScheduler: React.FC<BulkSessionSchedulerProps> = ({
  open,
  onOpenChange,
  assignedMembers,
  onSessionsScheduled
}) => {
  const [loading, setLoading] = useState(false)
  const [selectedMembers, setSelectedMembers] = useState<string[]>([])
  const [scheduleConfig, setScheduleConfig] = useState({
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    frequency: 'daily', // daily, weekly, bi-weekly
    sessionTime: '09:00',
    duration: 60,
    daysOfWeek: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] // for weekly/bi-weekly
  })
  const [generatedSessions, setGeneratedSessions] = useState<any[]>([])
  const [previewMode, setPreviewMode] = useState(false)

  useEffect(() => {
    if (open) {
      // Set default end date to 30 days from start
      const endDate = new Date(scheduleConfig.startDate)
      endDate.setDate(endDate.getDate() + 30)
      setScheduleConfig(prev => ({
        ...prev,
        endDate: endDate.toISOString().split('T')[0]
      }))
    }
  }, [open])

  useEffect(() => {
    if (previewMode && selectedMembers.length > 0) {
      generateSessionPreview()
    }
  }, [previewMode, selectedMembers, scheduleConfig])

  const generateSessionPreview = () => {
    const sessions: any[] = []
    const startDate = new Date(scheduleConfig.startDate)
    const endDate = new Date(scheduleConfig.endDate)
    
    selectedMembers.forEach(memberId => {
      const member = assignedMembers.find(m => m.id === memberId)
      if (!member || !member.memberships) return

      const membership = member.memberships
      const totalSessions = (membership.pt_sessions_remaining || 0) + (membership.pt_sessions_used || 0)
      let sessionNumber = (membership.pt_sessions_used || 0) + 1

      // Generate sessions based on frequency
      let currentDate = new Date(startDate)
      
      while (currentDate <= endDate && sessionNumber <= totalSessions) {
        const dayOfWeek = currentDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase()
        
        // Check if this day should have a session
        let shouldSchedule = false
        if (scheduleConfig.frequency === 'daily') {
          shouldSchedule = true
        } else if (scheduleConfig.frequency === 'weekly') {
          shouldSchedule = scheduleConfig.daysOfWeek.includes(dayOfWeek)
        } else if (scheduleConfig.frequency === 'bi-weekly') {
          const weekNumber = Math.floor((currentDate.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000))
          shouldSchedule = scheduleConfig.daysOfWeek.includes(dayOfWeek) && weekNumber % 2 === 0
        }

        if (shouldSchedule) {
          const endTime = new Date()
          endTime.setHours(
            parseInt(scheduleConfig.sessionTime.split(':')[0]),
            parseInt(scheduleConfig.sessionTime.split(':')[1]) + scheduleConfig.duration,
            0
          )
          
          sessions.push({
            member_id: member.members.id,
            member_name: `${member.members.profiles.first_name} ${member.members.profiles.last_name}`,
            member_id_display: member.members.member_id,
            session_date: currentDate.toISOString().split('T')[0],
            start_time: scheduleConfig.sessionTime,
            end_time: endTime.toTimeString().slice(0, 5),
            session_number: sessionNumber,
            total_sessions: totalSessions,
            package_name: membership.membership_packages.name,
            sessions_remaining: membership.pt_sessions_remaining
          })
          
          sessionNumber++
        }
        
        currentDate.setDate(currentDate.getDate() + 1)
      }
    })

    setGeneratedSessions(sessions)
  }

  const handleMemberToggle = (memberId: string) => {
    setSelectedMembers(prev => 
      prev.includes(memberId) 
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    )
  }

  const handleSelectAll = () => {
    if (selectedMembers.length === assignedMembers.length) {
      setSelectedMembers([])
    } else {
      setSelectedMembers(assignedMembers.map(m => m.id))
    }
  }

  const handleScheduleSessions = async () => {
    if (generatedSessions.length === 0) return

    setLoading(true)
    try {
      const sessionPromises = generatedSessions.map(async (sessionData) => {
        const member = assignedMembers.find(m => m.members.id === sessionData.member_id)
        if (!member) return

        const membership = member.memberships
        const totalSessions = (membership.pt_sessions_remaining || 0) + (membership.pt_sessions_used || 0)
        
        // Calculate fees
        const sessionFee = membership.total_amount_due / totalSessions
        let trainerFee = 0
        if (member.commission_type === 'per_session') {
          trainerFee = member.commission_value
        } else if (member.commission_type === 'percentage') {
          trainerFee = (sessionFee * member.commission_value) / 100
        } else if (member.commission_type === 'fixed_amount') {
          trainerFee = member.commission_value / totalSessions
        }

        // Create session
        const session = {
          member_id: sessionData.member_id,
          trainer_id: member.trainer_id,
          membership_id: membership.id,
          session_date: sessionData.session_date,
          start_time: sessionData.start_time,
          end_time: sessionData.end_time,
          duration_minutes: scheduleConfig.duration,
          session_type: 'personal_training',
          session_number: sessionData.session_number,
          total_sessions: sessionData.total_sessions,
          session_fee: Math.round(sessionFee),
          trainer_fee: Math.round(trainerFee),
          completed: false,
          cancelled: false
        }

        const { data: newSession, error: sessionError } = await supabase
          .from('training_sessions')
          .insert([session])
          .select()
          .single()

        if (sessionError) throw sessionError

        // Update membership session count
        await supabase
          .from('memberships')
          .update({
            pt_sessions_remaining: membership.pt_sessions_remaining - 1,
            pt_sessions_used: sessionData.session_number
          })
          .eq('id', membership.id)

        // Create earning record
        const earningData = {
          trainer_id: member.trainer_id,
          member_id: sessionData.member_id,
          membership_id: membership.id,
          training_session_id: newSession.id,
          commission_rule_id: member.id,
          earning_type: 'session_conducted',
          base_amount: Math.round(sessionFee),
          commission_rate: member.commission_type === 'percentage' ? member.commission_value : null,
          commission_amount: Math.round(trainerFee),
          total_earning: Math.round(trainerFee),
          earning_date: sessionData.session_date,
          earning_month: new Date(sessionData.session_date).toISOString().slice(0, 7),
          payment_cycle: 'session',
          is_paid: false,
          notes: `Bulk scheduled session ${sessionData.session_number}/${sessionData.total_sessions}`,
          created_by: (await supabase.auth.getUser()).data.user?.id
        }

        await supabase
          .from('trainer_earnings')
          .insert([earningData])

        return newSession
      })

      await Promise.all(sessionPromises)

      alert(`✅ Successfully scheduled ${generatedSessions.length} sessions!`)
      onSessionsScheduled()
      onOpenChange(false)

    } catch (error) {
      console.error('Error scheduling bulk sessions:', error)
      alert(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  const getDaysOfWeek = () => [
    { key: 'monday', label: 'Mon' },
    { key: 'tuesday', label: 'Tue' },
    { key: 'wednesday', label: 'Wed' },
    { key: 'thursday', label: 'Thu' },
    { key: 'friday', label: 'Fri' },
    { key: 'saturday', label: 'Sat' },
    { key: 'sunday', label: 'Sun' }
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            Bulk Session Scheduler
          </DialogTitle>
          <DialogDescription>
            Schedule multiple PT sessions for your clients at once
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Step 1: Select Members */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Users className="w-4 h-4" />
                Step 1: Select Clients
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="select-all"
                    checked={selectedMembers.length === assignedMembers.length}
                    onChange={handleSelectAll}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <Label htmlFor="select-all" className="font-medium">
                    Select All ({assignedMembers.length} clients)
                  </Label>
                </div>
                <Badge variant="outline">
                  {selectedMembers.length} selected
                </Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-60 overflow-y-auto">
                {assignedMembers.map((member) => (
                  <div key={member.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                    <input
                      type="checkbox"
                      id={member.id}
                      checked={selectedMembers.includes(member.id)}
                      onChange={() => handleMemberToggle(member.id)}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <Label htmlFor={member.id} className="font-medium">
                          {member.members?.profiles?.first_name} {member.members?.profiles?.last_name}
                        </Label>
                        <Badge variant="outline" className="text-xs">
                          {member.members?.member_id}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-500">
                        {member.memberships?.membership_packages?.name} • {member.memberships?.pt_sessions_remaining || 0} sessions left
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Step 2: Schedule Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Step 2: Schedule Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={scheduleConfig.startDate}
                    onChange={(e) => setScheduleConfig(prev => ({ ...prev, startDate: e.target.value }))}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
                <div>
                  <Label htmlFor="endDate">End Date</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={scheduleConfig.endDate}
                    onChange={(e) => setScheduleConfig(prev => ({ ...prev, endDate: e.target.value }))}
                    min={scheduleConfig.startDate}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="frequency">Frequency</Label>
                  <select
                    id="frequency"
                    className="w-full p-2 border rounded-md"
                    value={scheduleConfig.frequency}
                    onChange={(e) => setScheduleConfig(prev => ({ ...prev, frequency: e.target.value }))}
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="bi-weekly">Bi-weekly</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="sessionTime">Session Time</Label>
                  <Input
                    id="sessionTime"
                    type="time"
                    value={scheduleConfig.sessionTime}
                    onChange={(e) => setScheduleConfig(prev => ({ ...prev, sessionTime: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="duration">Duration (min)</Label>
                  <select
                    id="duration"
                    className="w-full p-2 border rounded-md"
                    value={scheduleConfig.duration}
                    onChange={(e) => setScheduleConfig(prev => ({ ...prev, duration: parseInt(e.target.value) }))}
                  >
                    <option value="30">30 minutes</option>
                    <option value="45">45 minutes</option>
                    <option value="60">60 minutes</option>
                    <option value="90">90 minutes</option>
                    <option value="120">120 minutes</option>
                  </select>
                </div>
              </div>

              {(scheduleConfig.frequency === 'weekly' || scheduleConfig.frequency === 'bi-weekly') && (
                <div>
                  <Label>Days of Week</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {getDaysOfWeek().map((day) => (
                      <div key={day.key} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={day.key}
                          checked={scheduleConfig.daysOfWeek.includes(day.key)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setScheduleConfig(prev => ({
                                ...prev,
                                daysOfWeek: [...prev.daysOfWeek, day.key]
                              }))
                            } else {
                              setScheduleConfig(prev => ({
                                ...prev,
                                daysOfWeek: prev.daysOfWeek.filter(d => d !== day.key)
                              }))
                            }
                          }}
                          className="h-4 w-4 rounded border-gray-300"
                        />
                        <Label htmlFor={day.key} className="text-sm">{day.label}</Label>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Step 3: Preview & Schedule */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Zap className="w-4 h-4" />
                Step 3: Preview & Schedule
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Button
                  onClick={() => setPreviewMode(!previewMode)}
                  disabled={selectedMembers.length === 0}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {previewMode ? 'Hide Preview' : 'Preview Sessions'}
                </Button>
                {previewMode && (
                  <Badge variant="outline">
                    {generatedSessions.length} sessions will be created
                  </Badge>
                )}
              </div>

              {previewMode && (
                <div className="max-h-60 overflow-y-auto border rounded-lg">
                  {generatedSessions.length === 0 ? (
                    <div className="p-4 text-center text-gray-500">
                      No sessions to preview. Check your configuration.
                    </div>
                  ) : (
                    <div className="space-y-2 p-4">
                      {generatedSessions.slice(0, 20).map((session, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <div className="flex items-center gap-4">
                            <span className="font-medium">{session.member_name}</span>
                            <span className="text-sm text-gray-500">({session.member_id_display})</span>
                            <span className="text-sm">{formatDate(session.session_date)}</span>
                            <span className="text-sm">{session.start_time} - {session.end_time}</span>
                          </div>
                          <Badge variant="outline">
                            Session {session.session_number}/{session.total_sessions}
                          </Badge>
                        </div>
                      ))}
                      {generatedSessions.length > 20 && (
                        <div className="text-center text-sm text-gray-500">
                          ... and {generatedSessions.length - 20} more sessions
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleScheduleSessions}
                  disabled={loading || generatedSessions.length === 0}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {loading ? 'Scheduling...' : `Schedule ${generatedSessions.length} Sessions`}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  )
}
