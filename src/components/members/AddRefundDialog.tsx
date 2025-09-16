import React, { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, RotateCcw } from 'lucide-react'
import { useRefunds } from '@/hooks/useRefunds'
import { useAuth } from '@/context/AuthContext'
import { formatCurrency } from '@/lib/utils'

interface AddRefundDialogProps {
  member: any
  onRefundAdded?: (refund: any) => void
}

export const AddRefundDialog: React.FC<AddRefundDialogProps> = ({ member, onRefundAdded }) => {
  const { gymId } = useAuth()
  const { createRefundRequest } = useRefunds()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  
  const [formData, setFormData] = useState({
    refund_type: 'full_refund',
    requested_amount: '',
    eligible_amount: '',
    reason: '',
    member_comments: ''
  })

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      // Check if gymId is available, try to get it from member's membership
      let finalGymId = gymId
      if (!finalGymId && member.current_membership?.gym_id) {
        finalGymId = member.current_membership.gym_id
      }
      
      if (!finalGymId) {
        throw new Error('Gym ID not found. Please refresh the page and try again.')
      }

      const refundData = {
        gym_id: finalGymId,
        member_id: member.id,
        membership_id: member.current_membership?.id || null,
        refund_type: formData.refund_type,
        requested_amount: parseFloat(formData.requested_amount) || 0,
        eligible_amount: parseFloat(formData.eligible_amount) || parseFloat(formData.requested_amount) || 0,
        reason: formData.reason,
        member_comments: formData.member_comments || null
      }

      console.log('Creating refund request:', refundData)
      console.log('Current gymId:', finalGymId)
      console.log('Current user role:', useAuth().role)
      
      const newRefund = await createRefundRequest(refundData)
      console.log('Refund request created:', newRefund)

      if (onRefundAdded) {
        onRefundAdded(newRefund)
      }
      
      setOpen(false)
      resetForm()
    } catch (error) {
      console.error('Error creating refund request:', error)
      alert(`Error creating refund request: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      refund_type: 'full_refund',
      requested_amount: '',
      eligible_amount: '',
      reason: '',
      member_comments: ''
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <RotateCcw className="w-4 h-4 mr-2" />
          Request Refund
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Request Refund</DialogTitle>
          <DialogDescription>
            Create a refund request for {member.profile?.first_name} {member.profile?.last_name}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="refund_type">Refund Type</Label>
            <Select value={formData.refund_type} onValueChange={(value) => handleInputChange('refund_type', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select refund type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="full_refund">Full Refund</SelectItem>
                <SelectItem value="partial_refund">Partial Refund</SelectItem>
                <SelectItem value="credit_adjustment">Credit Adjustment</SelectItem>
                <SelectItem value="package_transfer">Package Transfer</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="requested_amount">Requested Amount *</Label>
              <Input
                id="requested_amount"
                type="number"
                step="0.01"
                value={formData.requested_amount}
                onChange={(e) => handleInputChange('requested_amount', e.target.value)}
                placeholder="0.00"
                required
              />
            </div>
            
            <div>
              <Label htmlFor="eligible_amount">Eligible Amount *</Label>
              <Input
                id="eligible_amount"
                type="number"
                step="0.01"
                value={formData.eligible_amount}
                onChange={(e) => handleInputChange('eligible_amount', e.target.value)}
                placeholder="0.00"
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="reason">Reason *</Label>
            <Textarea
              id="reason"
              value={formData.reason}
              onChange={(e) => handleInputChange('reason', e.target.value)}
              placeholder="Reason for refund request"
              required
            />
          </div>

          <div>
            <Label htmlFor="member_comments">Member Comments</Label>
            <Textarea
              id="member_comments"
              value={formData.member_comments}
              onChange={(e) => handleInputChange('member_comments', e.target.value)}
              placeholder="Additional comments from member"
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Refund Request'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
