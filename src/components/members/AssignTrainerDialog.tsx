import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { User, DollarSign, Package, Calculator } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { formatCurrency, formatDate } from '@/lib/utils'

interface AssignTrainerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  member: any
  ptMemberships: any[]
  onAssignmentComplete: () => void
}

export const AssignTrainerDialog: React.FC<AssignTrainerDialogProps> = ({
  open,
  onOpenChange,
  member,
  ptMemberships,
  onAssignmentComplete
}) => {
  const { gymId } = useAuth()
  const [loading, setLoading] = useState(false)
  const [trainers, setTrainers] = useState<any[]>([])
  
  const [formData, setFormData] = useState({
    membership_id: '',
    trainer_id: '',
    commission_type: 'percentage', // 'percentage', 'fixed_amount', 'per_session'
    commission_value: 0,
    min_amount: 0,
    max_amount: 0,
    valid_from: new Date().toISOString().split('T')[0],
    valid_until: '',
    conditions: '',
    notes: ''
  })

  const [commissionCalculation, setCommissionCalculation] = useState<any>(null)

  useEffect(() => {
    if (open) {
      loadTrainers()
    }
  }, [open, gymId])

  useEffect(() => {
    if (formData.membership_id && formData.trainer_id && formData.commission_value > 0) {
      calculateCommission()
    }
  }, [formData.membership_id, formData.trainer_id, formData.commission_type, formData.commission_value])

  const loadTrainers = async () => {
    try {
      const { data, error } = await supabase
        .from('staff')
        .select(`
          id,
          role,
          specializations,
          experience_years,
          certifications,
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
      setTrainers(data || [])
    } catch (error) {
      console.error('Error loading trainers:', error)
    }
  }

  const calculateCommission = () => {
    const selectedMembership = ptMemberships.find(m => m.id === formData.membership_id)
    const selectedTrainer = trainers.find(t => t.id === formData.trainer_id)
    
    if (!selectedMembership || !selectedTrainer) return

    const packageAmount = selectedMembership.total_amount_due || 0
    const totalSessions = (selectedMembership.pt_sessions_remaining || 0) + (selectedMembership.pt_sessions_used || 0)
    
    let commissionAmount = 0
    let perSessionRate = 0

    switch (formData.commission_type) {
      case 'percentage':
        commissionAmount = (packageAmount * formData.commission_value) / 100
        perSessionRate = commissionAmount / totalSessions
        break
      case 'fixed_amount':
        commissionAmount = formData.commission_value
        perSessionRate = commissionAmount / totalSessions
        break
      case 'per_session':
        perSessionRate = formData.commission_value
        commissionAmount = perSessionRate * totalSessions
        break
    }

    setCommissionCalculation({
      selectedMembership,
      selectedTrainer,
      packageAmount,
      totalSessions,
      commissionAmount,
      perSessionRate,
      packageName: selectedMembership.membership_packages?.name
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
    
    if (!formData.membership_id || !formData.trainer_id) {
      alert('Please select both membership and trainer')
      return
    }

    if (formData.commission_value <= 0) {
      alert('Please enter a valid commission value')
      return
    }

    setLoading(true)

    try {
      // Check if trainer is already assigned to this membership
      const { data: existingAssignment } = await supabase
        .from('trainer_commission_rules')
        .select('id')
        .eq('member_id', member.id)
        .eq('trainer_id', formData.trainer_id)
        .eq('package_id', ptMemberships.find(m => m.id === formData.membership_id)?.package_id)
        .eq('is_active', true)
        .single()

      if (existingAssignment) {
        alert('This trainer is already assigned to this package for this member')
        setLoading(false)
        return
      }

      // Create trainer commission rule
      const commissionRuleData = {
        trainer_id: formData.trainer_id,
        package_id: ptMemberships.find(m => m.id === formData.membership_id)?.package_id,
        member_id: member.id,
        commission_type: formData.commission_type,
        commission_value: formData.commission_value,
        min_amount: formData.min_amount || null,
        max_amount: formData.max_amount || null,
        conditions: formData.conditions ? { note: formData.conditions } : {},
        valid_from: formData.valid_from,
        valid_until: formData.valid_until || null,
        is_active: true,
        notes: formData.notes,
        created_by: (await supabase.auth.getUser()).data.user?.id
      }

      const { data: commissionRule, error: commissionError } = await supabase
        .from('trainer_commission_rules')
        .insert([commissionRuleData])
        .select()
        .single()

      if (commissionError) throw commissionError

      // Update member's assigned trainer if not already set
      if (!member.assigned_trainer_id) {
        await supabase
          .from('members')
          .update({ assigned_trainer_id: formData.trainer_id })
          .eq('id', member.id)
      }

      // Create initial trainer earning record for the assignment
      if (commissionCalculation) {
        const earningData = {
          trainer_id: formData.trainer_id,
          member_id: member.id,
          membership_id: formData.membership_id,
          commission_rule_id: commissionRule.id,
          earning_type: 'membership_assignment',
          base_amount: commissionCalculation.packageAmount,
          commission_rate: formData.commission_type === 'percentage' ? formData.commission_value : null,
          commission_amount: commissionCalculation.commissionAmount,
          total_earning: commissionCalculation.commissionAmount,
          earning_date: formData.valid_from,
          earning_month: new Date(formData.valid_from).toISOString().slice(0, 7),
          payment_cycle: 'monthly',
          is_paid: false,
          notes: `Assignment to ${commissionCalculation.packageName} package`,
          created_by: (await supabase.auth.getUser()).data.user?.id
        }

        await supabase
          .from('trainer_earnings')
          .insert([earningData])
      }

      alert(`Trainer assigned successfully! Commission: ${formatCurrency(commissionCalculation?.commissionAmount || 0)}`)
      onAssignmentComplete()
      onOpenChange(false)

    } catch (error) {
      console.error('Error assigning trainer:', error)
      alert(`Error assigning trainer: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-5 h-5 text-blue-600" />
            Assign Trainer
          </DialogTitle>
          <DialogDescription>
            Assign a trainer to {member.profile?.first_name} {member.profile?.last_name}'s PT sessions with commission setup
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Member & Package Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Package className="w-4 h-4" />
                PT Package Selection
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="membership_id">Select PT Package *</Label>
                <Select value={formData.membership_id} onValueChange={(value) => handleInputChange('membership_id', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose PT package" />
                  </SelectTrigger>
                  <SelectContent>
                    {ptMemberships.map((membership) => (
                      <SelectItem key={membership.id} value={membership.id}>
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {membership.membership_packages?.name || 'PT Package'}
                          </span>
                          <span className="text-xs text-gray-500">
                            {membership.pt_sessions_remaining || 0} sessions remaining • {formatCurrency(membership.total_amount_due)}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Trainer Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <User className="w-4 h-4" />
                Trainer Selection
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="trainer_id">Select Trainer *</Label>
                <Select value={formData.trainer_id} onValueChange={(value) => handleInputChange('trainer_id', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose trainer" />
                  </SelectTrigger>
                  <SelectContent>
                    {trainers.map((trainer) => (
                      <SelectItem key={trainer.id} value={trainer.id}>
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {trainer.profiles?.first_name} {trainer.profiles?.last_name}
                          </span>
                          <span className="text-xs text-gray-500">
                            {trainer.role} • {trainer.experience_years}+ years • {Array.isArray(trainer.specializations) ? trainer.specializations.join(', ') : trainer.specializations || 'No specialization'}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Commission Setup */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Commission Setup
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="commission_type">Commission Type *</Label>
                  <Select value={formData.commission_type} onValueChange={(value) => handleInputChange('commission_type', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Percentage of Package Amount</SelectItem>
                      <SelectItem value="fixed_amount">Fixed Amount</SelectItem>
                      <SelectItem value="per_session">Per Session Rate</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="commission_value">
                    {formData.commission_type === 'percentage' ? 'Percentage (%)' : 
                     formData.commission_type === 'fixed_amount' ? 'Fixed Amount (₹)' : 
                     'Per Session Rate (₹)'} *
                  </Label>
                  <Input
                    id="commission_value"
                    type="number"
                    step={formData.commission_type === 'percentage' ? '0.1' : '1'}
                    value={formData.commission_value}
                    onChange={(e) => handleInputChange('commission_value', parseFloat(e.target.value) || 0)}
                    placeholder={formData.commission_type === 'percentage' ? '10' : '500'}
                    required
                  />
                </div>
              </div>

              {formData.commission_type === 'percentage' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="min_amount">Minimum Amount (₹)</Label>
                    <Input
                      id="min_amount"
                      type="number"
                      value={formData.min_amount}
                      onChange={(e) => handleInputChange('min_amount', parseFloat(e.target.value) || 0)}
                      placeholder="Optional minimum"
                    />
                  </div>
                  <div>
                    <Label htmlFor="max_amount">Maximum Amount (₹)</Label>
                    <Input
                      id="max_amount"
                      type="number"
                      value={formData.max_amount}
                      onChange={(e) => handleInputChange('max_amount', parseFloat(e.target.value) || 0)}
                      placeholder="Optional maximum"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="valid_from">Valid From *</Label>
                  <Input
                    id="valid_from"
                    type="date"
                    value={formData.valid_from}
                    onChange={(e) => handleInputChange('valid_from', e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="valid_until">Valid Until</Label>
                  <Input
                    id="valid_until"
                    type="date"
                    value={formData.valid_until}
                    onChange={(e) => handleInputChange('valid_until', e.target.value)}
                    placeholder="Optional end date"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Commission Calculation */}
          {commissionCalculation && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Calculator className="w-4 h-4" />
                  Commission Calculation
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Package:</span>
                    <p className="font-medium">{commissionCalculation.packageName}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Package Amount:</span>
                    <p className="font-medium">{formatCurrency(commissionCalculation.packageAmount)}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Total Sessions:</span>
                    <p className="font-medium">{commissionCalculation.totalSessions}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Per Session Rate:</span>
                    <p className="font-medium">{formatCurrency(commissionCalculation.perSessionRate)}</p>
                  </div>
                </div>
                <div className="pt-3 border-t">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Total Commission:</span>
                    <p className="text-xl font-bold text-green-600">
                      {formatCurrency(commissionCalculation.commissionAmount)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Additional Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Additional Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="conditions">Special Conditions</Label>
                <Input
                  id="conditions"
                  value={formData.conditions}
                  onChange={(e) => handleInputChange('conditions', e.target.value)}
                  placeholder="e.g., Bonus for completion rate > 80%"
                />
              </div>

              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  placeholder="Any additional notes about the trainer assignment"
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loading || !formData.membership_id || !formData.trainer_id}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {loading ? 'Assigning...' : 'Assign Trainer'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
