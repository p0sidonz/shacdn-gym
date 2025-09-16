import React, { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle, Play, X } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { formatDate } from '@/lib/utils'

interface MembershipSuspendDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  membership: any
  action: 'suspend' | 'reactivate' | 'unfreeze' | 'cancel'
  onActionComplete: () => void
}

export const MembershipSuspendDialog: React.FC<MembershipSuspendDialogProps> = ({
  open,
  onOpenChange,
  membership,
  action,
  onActionComplete
}) => {
  const [loading, setLoading] = useState(false)
  
  const [formData, setFormData] = useState({
    action_date: new Date().toISOString().split('T')[0],
    reason: '',
    notes: ''
  })

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const getActionConfig = () => {
    switch (action) {
      case 'suspend':
        return {
          title: 'Suspend Membership',
          description: 'Temporarily suspend membership access due to policy violations or payment issues',
          icon: <AlertTriangle className="w-5 h-5 text-red-600" />,
          newStatus: 'suspended',
          buttonClass: 'bg-red-600 hover:bg-red-700',
          buttonText: 'Suspend Membership',
          warningText: 'Member will immediately lose access to all gym facilities and services.'
        }
      case 'reactivate':
        return {
          title: 'Reactivate Membership',
          description: 'Restore full access to previously suspended membership',
          icon: <Play className="w-5 h-5 text-green-600" />,
          newStatus: 'active',
          buttonClass: 'bg-green-600 hover:bg-green-700',
          buttonText: 'Reactivate Membership',
          warningText: 'Member will regain full access to gym facilities and services.'
        }
      case 'unfreeze':
        return {
          title: 'Unfreeze Membership',
          description: 'Resume membership after freeze period',
          icon: <Play className="w-5 h-5 text-blue-600" />,
          newStatus: 'active',
          buttonClass: 'bg-blue-600 hover:bg-blue-700',
          buttonText: 'Unfreeze Membership',
          warningText: 'Member will regain access and membership timeline will resume.'
        }
      case 'cancel':
        return {
          title: 'Cancel Membership',
          description: 'Permanently cancel the membership',
          icon: <X className="w-5 h-5 text-red-600" />,
          newStatus: 'cancelled',
          buttonClass: 'bg-red-600 hover:bg-red-700',
          buttonText: 'Cancel Membership',
          warningText: 'This action cannot be undone. Member will lose all access and benefits.'
        }
      default:
        return {
          title: 'Update Membership',
          description: 'Update membership status',
          icon: <AlertTriangle className="w-5 h-5" />,
          newStatus: 'active',
          buttonClass: 'bg-gray-600 hover:bg-gray-700',
          buttonText: 'Update',
          warningText: 'Membership status will be updated.'
        }
    }
  }

  const actionConfig = getActionConfig()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.reason) {
      alert('Please provide a reason for this action')
      return
    }

    setLoading(true)

    try {
      const updateData: any = {
        status: actionConfig.newStatus
      }

      // Handle specific actions
      if (action === 'cancel') {
        updateData.cancellation_date = formData.action_date
        updateData.cancellation_reason = formData.reason
        updateData.actual_end_date = formData.action_date
      } else if (action === 'unfreeze') {
        updateData.freeze_end_date = formData.action_date
        updateData.freeze_reason = null // Clear freeze reason
      }

      // Update membership status
      await supabase
        .from('memberships')
        .update(updateData)
        .eq('id', membership.id)

      // Record membership change
      await supabase
        .from('membership_changes')
        .insert([{
          member_id: membership.member_id,
          from_membership_id: membership.id,
          to_membership_id: membership.id,
          change_type: action === 'reactivate' ? 'extension' : action, // Map reactivate to extension
          change_date: formData.action_date,
          remaining_days: Math.max(0, Math.ceil((new Date(membership.end_date).getTime() - new Date(formData.action_date).getTime()) / (1000 * 60 * 60 * 24))),
          reason: formData.reason,
          processed_by: (await supabase.auth.getUser()).data.user?.id
        }])

      // Update member status if cancelling
      if (action === 'cancel') {
        await supabase
          .from('members')
          .update({ status: 'cancelled' })
          .eq('id', membership.member_id)
      } else if (action === 'reactivate' || action === 'unfreeze') {
        await supabase
          .from('members')
          .update({ status: 'active' })
          .eq('id', membership.member_id)
      }

      alert(`Membership ${action}${action.endsWith('e') ? 'd' : action === 'cancel' ? 'led' : 'ed'} successfully!`)
      onActionComplete()
      onOpenChange(false)

    } catch (error) {
      console.error(`Error ${action}ing membership:`, error)
      alert(`Error ${action}ing membership: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {actionConfig.icon}
            {actionConfig.title}
          </DialogTitle>
          <DialogDescription>
            {actionConfig.description}
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
                  <span className="text-gray-600">Current Status:</span>
                  <p className="font-medium capitalize">{membership.status}</p>
                </div>
                <div>
                  <span className="text-gray-600">End Date:</span>
                  <p className="font-medium">{formatDate(membership.end_date)}</p>
                </div>
                <div>
                  <span className="text-gray-600">Days Remaining:</span>
                  <p className="font-medium">
                    {Math.max(0, Math.ceil((new Date(membership.end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))} days
                  </p>
                </div>
              </div>

              {/* Show freeze details if unfreezing */}
              {action === 'unfreeze' && membership.freeze_start_date && (
                <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm font-medium text-blue-800">Current Freeze Details:</p>
                  <div className="grid grid-cols-2 gap-2 text-xs text-blue-700 mt-1">
                    <div>Start: {formatDate(membership.freeze_start_date)}</div>
                    <div>End: {formatDate(membership.freeze_end_date)}</div>
                    <div>Reason: {membership.freeze_reason}</div>
                    <div>Days Used: {membership.freeze_days_used || 0}</div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Action Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Action Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="action_date">
                  {action === 'cancel' ? 'Cancellation' : action === 'suspend' ? 'Suspension' : 'Effective'} Date *
                </Label>
                <Input
                  id="action_date"
                  type="date"
                  value={formData.action_date}
                  onChange={(e) => handleInputChange('action_date', e.target.value)}
                  required
                />
              </div>

              <div>
                <Label htmlFor="reason">
                  Reason for {action === 'reactivate' ? 'Reactivation' : action === 'unfreeze' ? 'Unfreezing' : actionConfig.title} *
                </Label>
                <Input
                  id="reason"
                  value={formData.reason}
                  onChange={(e) => handleInputChange('reason', e.target.value)}
                  placeholder={
                    action === 'suspend' ? 'e.g., Payment overdue, Policy violation' :
                    action === 'cancel' ? 'e.g., Member request, Non-payment' :
                    action === 'reactivate' ? 'e.g., Payment received, Issue resolved' :
                    action === 'unfreeze' ? 'e.g., Member returned, Freeze period complete' :
                    'Enter reason'
                  }
                  required
                />
              </div>

              <div>
                <Label htmlFor="notes">Additional Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  placeholder="Any additional notes or comments"
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          {/* Warning */}
          <Card className={`border-2 ${
            action === 'cancel' || action === 'suspend' ? 'border-red-200 bg-red-50' : 
            'border-yellow-200 bg-yellow-50'
          }`}>
            <CardContent className="p-4">
              <div className={`flex items-center gap-2 ${
                action === 'cancel' || action === 'suspend' ? 'text-red-800' : 'text-yellow-800'
              }`}>
                <AlertTriangle className="w-4 h-4" />
                <span className="font-medium">Important Notice</span>
              </div>
              <p className={`text-sm mt-1 ${
                action === 'cancel' || action === 'suspend' ? 'text-red-700' : 'text-yellow-700'
              }`}>
                {actionConfig.warningText}
              </p>
              {action === 'cancel' && (
                <p className="text-sm text-red-700 mt-1 font-medium">
                  Consider offering a refund if applicable based on gym policy.
                </p>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loading}
              className={actionConfig.buttonClass}
            >
              {loading ? 'Processing...' : actionConfig.buttonText}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
