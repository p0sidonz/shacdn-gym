import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  MoreHorizontal, 
  Pause, 
  Play, 
  RotateCcw, 
  ArrowUp, 
  ArrowDown, 
  DollarSign,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react'
import { useMemberships } from '@/hooks/useMemberships'
import { useMembers } from '@/hooks/useMembers'
import { useAuth } from '@/context/AuthContext'
import { formatCurrency, formatDate } from '@/lib/utils'

interface MembershipActionsProps {
  member: any
  onMembershipUpdated?: () => void
}

export const MembershipActions: React.FC<MembershipActionsProps> = ({ 
  member, 
  onMembershipUpdated 
}) => {
  const { gymId } = useAuth()
  const { updateMembership } = useMemberships()
  const { refreshMembers } = useMembers({ gym_id: gymId || undefined })
  const [loading, setLoading] = useState(false)
  const [action, setAction] = useState<string | null>(null)

  const handleAction = async (actionType: string, data: any) => {
    if (!member.current_membership) return

    setLoading(true)
    try {
      switch (actionType) {
        case 'freeze':
          await updateMembership(member.current_membership.id, {
            status: 'frozen',
            freeze_start_date: data.freeze_start_date,
            freeze_end_date: data.freeze_end_date,
            freeze_reason: data.freeze_reason
          })
          break

        case 'unfreeze':
          await updateMembership(member.current_membership.id, {
            status: 'active',
            freeze_start_date: null,
            freeze_end_date: null,
            freeze_reason: null
          })
          break

        case 'cancel':
          await updateMembership(member.current_membership.id, {
            status: 'cancelled',
            cancellation_date: data.cancellation_date,
            cancellation_reason: data.cancellation_reason
          })
          break

        case 'extend':
          await updateMembership(member.current_membership.id, {
            end_date: data.new_end_date
          })
          break
      }

      await refreshMembers()
      if (onMembershipUpdated) onMembershipUpdated()
      setAction(null)
    } catch (error) {
      console.error('Error updating membership:', error)
      alert(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  const FreezeDialog = () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full">
          <Pause className="w-4 h-4 mr-2" />
          Freeze
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Freeze Membership</DialogTitle>
          <DialogDescription>
            Temporarily pause this membership
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={(e) => {
          e.preventDefault()
          const formData = new FormData(e.currentTarget)
          handleAction('freeze', {
            freeze_start_date: formData.get('freeze_start_date'),
            freeze_end_date: formData.get('freeze_end_date'),
            freeze_reason: formData.get('freeze_reason')
          })
        }}>
          <div className="space-y-4">
            <div>
              <Label htmlFor="freeze_start_date">Freeze Start Date</Label>
              <Input
                id="freeze_start_date"
                name="freeze_start_date"
                type="date"
                defaultValue={new Date().toISOString().split('T')[0]}
                required
              />
            </div>
            <div>
              <Label htmlFor="freeze_end_date">Freeze End Date</Label>
              <Input
                id="freeze_end_date"
                name="freeze_end_date"
                type="date"
                required
              />
            </div>
            <div>
              <Label htmlFor="freeze_reason">Reason</Label>
              <Textarea
                id="freeze_reason"
                name="freeze_reason"
                placeholder="Reason for freezing membership"
                required
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline">Cancel</Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Freezing...' : 'Freeze Membership'}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )

  const CancelDialog = () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="destructive" size="sm" className="w-full">
          <AlertTriangle className="w-4 h-4 mr-2" />
          Cancel
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancel Membership</DialogTitle>
          <DialogDescription>
            Permanently cancel this membership
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={(e) => {
          e.preventDefault()
          const formData = new FormData(e.currentTarget)
          handleAction('cancel', {
            cancellation_date: formData.get('cancellation_date'),
            cancellation_reason: formData.get('cancellation_reason')
          })
        }}>
          <div className="space-y-4">
            <div>
              <Label htmlFor="cancellation_date">Cancellation Date</Label>
              <Input
                id="cancellation_date"
                name="cancellation_date"
                type="date"
                defaultValue={new Date().toISOString().split('T')[0]}
                required
              />
            </div>
            <div>
              <Label htmlFor="cancellation_reason">Reason</Label>
              <Textarea
                id="cancellation_reason"
                name="cancellation_reason"
                placeholder="Reason for cancelling membership"
                required
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline">Cancel</Button>
              <Button type="submit" variant="destructive" disabled={loading}>
                {loading ? 'Cancelling...' : 'Cancel Membership'}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )

  const ExtendDialog = () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full">
          <RotateCcw className="w-4 h-4 mr-2" />
          Extend
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Extend Membership</DialogTitle>
          <DialogDescription>
            Extend the membership end date
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={(e) => {
          e.preventDefault()
          const formData = new FormData(e.currentTarget)
          handleAction('extend', {
            new_end_date: formData.get('new_end_date')
          })
        }}>
          <div className="space-y-4">
            <div>
              <Label htmlFor="new_end_date">New End Date</Label>
              <Input
                id="new_end_date"
                name="new_end_date"
                type="date"
                required
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline">Cancel</Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Extending...' : 'Extend Membership'}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )

  if (!member.current_membership) {
    return (
      <div className="text-center text-gray-500 text-sm">
        No active membership
      </div>
    )
  }

  const membership = member.current_membership
  const isFrozen = membership.status === 'frozen'
  const isCancelled = membership.status === 'cancelled'

  return (
    <div className="space-y-2">
      {!isFrozen && !isCancelled && (
        <>
          <FreezeDialog />
          <ExtendDialog />
          <CancelDialog />
        </>
      )}
      
      {isFrozen && (
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full"
          onClick={() => handleAction('unfreeze', {})}
          disabled={loading}
        >
          <Play className="w-4 h-4 mr-2" />
          {loading ? 'Unfreezing...' : 'Unfreeze'}
        </Button>
      )}

      {isCancelled && (
        <div className="text-center text-red-500 text-sm">
          Membership Cancelled
        </div>
      )}
    </div>
  )
}
