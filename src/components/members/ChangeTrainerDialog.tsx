import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Repeat, User, DollarSign, AlertTriangle } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { formatCurrency, formatDate } from '@/lib/utils'

interface ChangeTrainerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  member: any
  currentTrainers: any[]
  ptMemberships: any[]
  onTrainerChanged: () => void
}

export const ChangeTrainerDialog: React.FC<ChangeTrainerDialogProps> = ({
  open,
  onOpenChange,
  member,
  currentTrainers,
  ptMemberships,
  onTrainerChanged
}) => {
  const { gymId } = useAuth()
  const [loading, setLoading] = useState(false)
  const [availableTrainers, setAvailableTrainers] = useState<any[]>([])
  
  const [formData, setFormData] = useState({
    current_trainer_assignment_id: '',
    new_trainer_id: '',
    change_date: new Date().toISOString().split('T')[0],
    reason: '',
    commission_adjustment: 0,
    transfer_remaining_sessions: true,
    notes: ''
  })

  const [changeCalculation, setChangeCalculation] = useState<any>(null)

  useEffect(() => {
    if (open) {
      loadAvailableTrainers()
    }
  }, [open, gymId])

  useEffect(() => {
    if (formData.current_trainer_assignment_id && formData.new_trainer_id) {
      calculateTrainerChange()
    }
  }, [formData.current_trainer_assignment_id, formData.new_trainer_id])

  const loadAvailableTrainers = async () => {
    try {
      const { data, error } = await supabase
        .from('staff')
        .select(`
          id,
          role,
          specializations,
          experience_years,
          profiles!profile_id (
            first_name,
            last_name,
            phone
          )
        `)
        .eq('gym_id', gymId)
        .in('role', ['trainer', 'nutritionist'])
        .eq('status', 'active')

      if (error) throw error
      setAvailableTrainers(data || [])
    } catch (error) {
      console.error('Error loading trainers:', error)
    }
  }

  const calculateTrainerChange = () => {
    const currentAssignment = currentTrainers.find(t => t.id === formData.current_trainer_assignment_id)
    const newTrainer = availableTrainers.find(t => t.id === formData.new_trainer_id)
    
    if (!currentAssignment || !newTrainer) return

    const membership = ptMemberships.find(m => m.package_id === currentAssignment.package_id)
    if (!membership) return

    const remainingSessions = membership.pt_sessions_remaining || 0
    const completedSessions = membership.pt_sessions_used || 0
    const totalSessions = remainingSessions + completedSessions

    // Calculate current trainer's earning adjustment
    const packageAmount = membership.total_amount_due || 0
    const currentEarning = currentAssignment.commission_type === 'percentage' 
      ? (packageAmount * currentAssignment.commission_value) / 100
      : currentAssignment.commission_value

    const remainingValue = currentAssignment.commission_type === 'per_session'
      ? currentAssignment.commission_value * remainingSessions
      : (currentEarning * remainingSessions) / totalSessions

    setChangeCalculation({
      currentAssignment,
      newTrainer,
      membership,
      remainingSessions,
      completedSessions,
      totalSessions,
      packageAmount,
      currentEarning,
      remainingValue
    })
  }

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.current_trainer_assignment_id || !formData.new_trainer_id) {
      alert('Please select both current and new trainer')
      return
    }

    if (!formData.reason) {
      alert('Please provide a reason for trainer change')
      return
    }

    if (!changeCalculation) {
      alert('Change calculation not available')
      return
    }

    setLoading(true)

    try {
      // 1. Deactivate current trainer assignment
      await supabase
        .from('trainer_commission_rules')
        .update({
          is_active: false,
          valid_until: formData.change_date
        })
        .eq('id', formData.current_trainer_assignment_id)

      // 2. Create new trainer assignment
      const newAssignmentData = {
        trainer_id: formData.new_trainer_id,
        package_id: changeCalculation.currentAssignment.package_id,
        member_id: member.id,
        commission_type: changeCalculation.currentAssignment.commission_type, // Keep same commission structure
        commission_value: changeCalculation.currentAssignment.commission_value,
        valid_from: formData.change_date,
        is_active: true,
        notes: `Transferred from ${changeCalculation.currentAssignment.staff?.profiles?.first_name} ${changeCalculation.currentAssignment.staff?.profiles?.last_name}. ${formData.notes}`,
        created_by: (await supabase.auth.getUser()).data.user?.id
      }

      const { data: newAssignment, error: assignmentError } = await supabase
        .from('trainer_commission_rules')
        .insert([newAssignmentData])
        .select()
        .single()

      if (assignmentError) throw assignmentError

      // 3. Update member's assigned trainer
      await supabase
        .from('members')
        .update({ assigned_trainer_id: formData.new_trainer_id })
        .eq('id', member.id)

      // 4. Record membership change
      await supabase
        .from('membership_changes')
        .insert([{
          member_id: member.id,
          from_membership_id: changeCalculation.membership.id,
          to_membership_id: changeCalculation.membership.id,
          change_type: 'trainer_change',
          change_date: formData.change_date,
          old_trainer_id: changeCalculation.currentAssignment.trainer_id,
          new_trainer_id: formData.new_trainer_id,
          remaining_days: Math.max(0, Math.ceil((new Date(changeCalculation.membership.end_date).getTime() - new Date(formData.change_date).getTime()) / (1000 * 60 * 60 * 24))),
          reason: formData.reason,
          processed_by: (await supabase.auth.getUser()).data.user?.id
        }])

      // 5. Adjust current trainer's earnings
      if (changeCalculation.remainingValue > 0) {
        await supabase
          .from('trainer_earnings')
          .insert([{
            trainer_id: changeCalculation.currentAssignment.trainer_id,
            member_id: member.id,
            membership_id: changeCalculation.membership.id,
            commission_rule_id: formData.current_trainer_assignment_id,
            earning_type: 'trainer_change_adjustment',
            base_amount: changeCalculation.remainingValue,
            commission_rate: null,
            commission_amount: -changeCalculation.remainingValue, // Negative adjustment
            total_earning: -changeCalculation.remainingValue,
            earning_date: formData.change_date,
            earning_month: new Date(formData.change_date).toISOString().slice(0, 7),
            payment_cycle: 'adjustment',
            is_paid: false,
            original_trainer_id: changeCalculation.currentAssignment.trainer_id,
            transfer_adjustment: changeCalculation.remainingValue,
            notes: `Trainer change - transferred to ${changeCalculation.newTrainer.profiles?.first_name} ${changeCalculation.newTrainer.profiles?.last_name}`,
            created_by: (await supabase.auth.getUser()).data.user?.id
          }])
      }

      // 6. Create earning record for new trainer
      if (changeCalculation.remainingValue > 0) {
        await supabase
          .from('trainer_earnings')
          .insert([{
            trainer_id: formData.new_trainer_id,
            member_id: member.id,
            membership_id: changeCalculation.membership.id,
            commission_rule_id: newAssignment.id,
            earning_type: 'trainer_change_transfer',
            base_amount: changeCalculation.remainingValue,
            commission_rate: null,
            commission_amount: changeCalculation.remainingValue,
            total_earning: changeCalculation.remainingValue,
            earning_date: formData.change_date,
            earning_month: new Date(formData.change_date).toISOString().slice(0, 7),
            payment_cycle: 'transfer',
            is_paid: false,
            original_trainer_id: changeCalculation.currentAssignment.trainer_id,
            transfer_adjustment: changeCalculation.remainingValue,
            notes: `Trainer change - received from ${changeCalculation.currentAssignment.staff?.profiles?.first_name} ${changeCalculation.currentAssignment.staff?.profiles?.last_name}`,
            created_by: (await supabase.auth.getUser()).data.user?.id
          }])
      }

      // 7. Update pending training sessions
      if (formData.transfer_remaining_sessions) {
        await supabase
          .from('training_sessions')
          .update({ trainer_id: formData.new_trainer_id })
          .eq('member_id', member.id)
          .eq('trainer_id', changeCalculation.currentAssignment.trainer_id)
          .eq('completed', false)
          .eq('cancelled', false)
          .gte('session_date', formData.change_date)
      }

      alert(`Trainer changed successfully! ${changeCalculation.remainingSessions} remaining sessions transferred.`)
      onTrainerChanged()
      onOpenChange(false)

    } catch (error) {
      console.error('Error changing trainer:', error)
      alert(`Error changing trainer: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Repeat className="w-5 h-5 text-orange-600" />
            Change Trainer
          </DialogTitle>
          <DialogDescription>
            Change trainer assignment for {member.profile?.first_name} {member.profile?.last_name}'s PT sessions
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Current Trainer Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Current Trainer Assignment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="current_trainer_assignment_id">Select Current Assignment *</Label>
                <Select value={formData.current_trainer_assignment_id} onValueChange={(value) => handleInputChange('current_trainer_assignment_id', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose current trainer assignment" />
                  </SelectTrigger>
                  <SelectContent>
                    {currentTrainers.map((assignment) => (
                      <SelectItem key={assignment.id} value={assignment.id}>
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {assignment.staff?.profiles?.first_name} {assignment.staff?.profiles?.last_name}
                          </span>
                          <span className="text-xs text-gray-500">
                            {assignment.membership_packages?.name} • 
                            {assignment.commission_type === 'percentage' 
                              ? ` ${assignment.commission_value}%` 
                              : ` ${formatCurrency(assignment.commission_value)}`
                            }
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* New Trainer Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <User className="w-4 h-4" />
                New Trainer Selection
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="new_trainer_id">Select New Trainer *</Label>
                <Select value={formData.new_trainer_id} onValueChange={(value) => handleInputChange('new_trainer_id', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose new trainer" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableTrainers
                      .filter(trainer => !currentTrainers.some(ct => ct.trainer_id === trainer.id))
                      .map((trainer) => (
                        <SelectItem key={trainer.id} value={trainer.id}>
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {trainer.profiles?.first_name} {trainer.profiles?.last_name}
                            </span>
                            <span className="text-xs text-gray-500">
                              {trainer.role} • {trainer.specialization} • {trainer.experience_years}+ years
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Change Calculation */}
          {changeCalculation && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Transfer Calculation
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Package:</span>
                    <p className="font-medium">{changeCalculation.currentAssignment.membership_packages?.name}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Remaining Sessions:</span>
                    <p className="font-medium">{changeCalculation.remainingSessions}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Completed Sessions:</span>
                    <p className="font-medium">{changeCalculation.completedSessions}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Transfer Value:</span>
                    <p className="font-medium text-green-600">{formatCurrency(changeCalculation.remainingValue)}</p>
                  </div>
                </div>
                <div className="pt-3 border-t">
                  <p className="text-sm text-gray-600">
                    The new trainer will receive commission for {changeCalculation.remainingSessions} remaining sessions 
                    valued at {formatCurrency(changeCalculation.remainingValue)}.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Change Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Change Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="change_date">Change Date *</Label>
                <Input
                  id="change_date"
                  type="date"
                  value={formData.change_date}
                  onChange={(e) => handleInputChange('change_date', e.target.value)}
                  required
                />
              </div>

              <div>
                <Label htmlFor="reason">Reason for Change *</Label>
                <Input
                  id="reason"
                  value={formData.reason}
                  onChange={(e) => handleInputChange('reason', e.target.value)}
                  placeholder="e.g., Member request, Trainer specialization match, Scheduling conflict"
                  required
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="transfer_remaining_sessions"
                  checked={formData.transfer_remaining_sessions}
                  onChange={(e) => handleInputChange('transfer_remaining_sessions', e.target.checked)}
                  className="rounded"
                />
                <Label htmlFor="transfer_remaining_sessions" className="text-sm">
                  Transfer all pending/scheduled sessions to new trainer
                </Label>
              </div>

              <div>
                <Label htmlFor="notes">Additional Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  placeholder="Any additional notes about the trainer change"
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          {/* Warning */}
          <Card className="border-yellow-200 bg-yellow-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-yellow-800">
                <AlertTriangle className="w-4 h-4" />
                <span className="font-medium">Important Notice</span>
              </div>
              <ul className="text-sm text-yellow-700 mt-1 list-disc list-inside space-y-1">
                <li>The current trainer's assignment will be deactivated</li>
                <li>Commission for remaining sessions will be transferred to the new trainer</li>
                <li>Scheduled sessions will be reassigned if selected</li>
                <li>Both trainers will see adjusted earnings in their records</li>
              </ul>
            </CardContent>
          </Card>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loading || !formData.current_trainer_assignment_id || !formData.new_trainer_id}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {loading ? 'Processing...' : 'Change Trainer'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
