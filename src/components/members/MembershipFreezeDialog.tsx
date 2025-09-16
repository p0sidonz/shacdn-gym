import React, { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Pause, Calendar, AlertTriangle } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { formatDate } from '@/lib/utils'

interface MembershipFreezeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  membership: any
  onFreezeComplete: () => void
}

export const MembershipFreezeDialog: React.FC<MembershipFreezeDialogProps> = ({
  open,
  onOpenChange,
  membership,
  onFreezeComplete
}) => {
  const [loading, setLoading] = useState(false)
  
  const [formData, setFormData] = useState({
    freeze_start_date: new Date().toISOString().split('T')[0],
    freeze_duration: 30, // days
    freeze_reason: '',
    notes: ''
  })

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const calculateFreezeEnd = () => {
    const startDate = new Date(formData.freeze_start_date)
    const endDate = new Date(startDate)
    endDate.setDate(startDate.getDate() + formData.freeze_duration)
    return endDate
  }

  const calculateNewEndDate = () => {
    const originalEndDate = new Date(membership.end_date)
    const newEndDate = new Date(originalEndDate)
    newEndDate.setDate(originalEndDate.getDate() + formData.freeze_duration)
    return newEndDate
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.freeze_reason) {
      alert('Please provide a reason for freezing')
      return
    }

    if (formData.freeze_duration < 1 || formData.freeze_duration > 365) {
      alert('Freeze duration must be between 1 and 365 days')
      return
    }

    setLoading(true)

    try {
      const freezeEndDate = calculateFreezeEnd()
      const newMembershipEndDate = calculateNewEndDate()

      // Update membership with freeze details
      await supabase
        .from('memberships')
        .update({
          status: 'frozen',
          freeze_start_date: formData.freeze_start_date,
          freeze_end_date: freezeEndDate.toISOString().split('T')[0],
          freeze_reason: formData.freeze_reason,
          end_date: newMembershipEndDate.toISOString().split('T')[0], // Extend end date
          freeze_days_used: (membership.freeze_days_used || 0) + formData.freeze_duration
        })
        .eq('id', membership.id)

      // Record membership change
      await supabase
        .from('membership_changes')
        .insert([{
          member_id: membership.member_id,
          from_membership_id: membership.id,
          to_membership_id: membership.id,
          change_type: 'freeze',
          change_date: formData.freeze_start_date,
          remaining_days: Math.ceil((new Date(membership.end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)),
          reason: formData.freeze_reason,
          processed_by: (await supabase.auth.getUser()).data.user?.id
        }])

      alert(`Membership frozen successfully for ${formData.freeze_duration} days!`)
      onFreezeComplete()
      onOpenChange(false)

    } catch (error) {
      console.error('Error freezing membership:', error)
      alert(`Error freezing membership: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pause className="w-5 h-5 text-orange-600" />
            Freeze Membership
          </DialogTitle>
          <DialogDescription>
            Temporarily pause the membership. The end date will be extended by the freeze duration.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Current Membership Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Current Membership</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Package:</span>
                  <p className="font-medium">{membership.membership_packages?.name}</p>
                </div>
                <div>
                  <span className="text-gray-600">Current End Date:</span>
                  <p className="font-medium">{formatDate(membership.end_date)}</p>
                </div>
                <div>
                  <span className="text-gray-600">Previous Freeze Days:</span>
                  <p className="font-medium">{membership.freeze_days_used || 0} days</p>
                </div>
                <div>
                  <span className="text-gray-600">Status:</span>
                  <p className="font-medium">{membership.status}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Freeze Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Freeze Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="freeze_start_date">Freeze Start Date *</Label>
                  <Input
                    id="freeze_start_date"
                    type="date"
                    value={formData.freeze_start_date}
                    onChange={(e) => handleInputChange('freeze_start_date', e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="freeze_duration">Freeze Duration (Days) *</Label>
                  <Input
                    id="freeze_duration"
                    type="number"
                    min="1"
                    max="365"
                    value={formData.freeze_duration}
                    onChange={(e) => handleInputChange('freeze_duration', parseInt(e.target.value) || 30)}
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="freeze_reason">Reason for Freeze *</Label>
                <Input
                  id="freeze_reason"
                  value={formData.freeze_reason}
                  onChange={(e) => handleInputChange('freeze_reason', e.target.value)}
                  placeholder="e.g., Medical emergency, Travel, Temporary relocation"
                  required
                />
              </div>

              <div>
                <Label htmlFor="notes">Additional Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  placeholder="Any additional notes about the freeze"
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          {/* Freeze Impact */}
          <Card className="border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle className="text-sm text-blue-800">Freeze Impact</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-blue-700">Freeze End Date:</span>
                  <p className="font-medium text-blue-800">{formatDate(calculateFreezeEnd())}</p>
                </div>
                <div>
                  <span className="text-blue-700">New Membership End Date:</span>
                  <p className="font-medium text-blue-800">{formatDate(calculateNewEndDate())}</p>
                </div>
                <div className="col-span-2">
                  <span className="text-blue-700">Extended by:</span>
                  <p className="font-medium text-blue-800">{formData.freeze_duration} days</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Warning */}
          <Card className="border-yellow-200 bg-yellow-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-yellow-800">
                <AlertTriangle className="w-4 h-4" />
                <span className="font-medium">Important</span>
              </div>
              <ul className="text-sm text-yellow-700 mt-1 list-disc list-inside space-y-1">
                <li>Member will lose access to gym facilities during freeze period</li>
                <li>Membership end date will be automatically extended</li>
                <li>Member can be unfrozen early if needed</li>
                <li>PT sessions and other services will also be paused</li>
              </ul>
            </CardContent>
          </Card>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loading}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {loading ? 'Processing...' : 'Freeze Membership'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
