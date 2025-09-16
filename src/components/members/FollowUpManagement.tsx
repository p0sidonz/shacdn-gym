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
  MessageSquare, 
  Calendar, 
  User, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Edit,
  Trash2,
  Phone,
  Mail,
  Star
} from 'lucide-react'
import { formatDate } from '@/lib/utils'
import type { MemberWithDetails } from '@/types'
import { useFollowUps } from '@/hooks/useFollowUps'
import { FollowUpService } from '@/services/followupService'

interface FollowUpManagementProps {
  member: MemberWithDetails
  onFollowUpUpdated?: () => void
}

export const FollowUpManagement: React.FC<FollowUpManagementProps> = ({ 
  member, 
  onFollowUpUpdated 
}) => {
  const [isAddFollowUpOpen, setIsAddFollowUpOpen] = useState(false)
  const [isEditFollowUpOpen, setIsEditFollowUpOpen] = useState(false)
  const [editingFollowUp, setEditingFollowUp] = useState<any>(null)
  const [trainers, setTrainers] = useState<Array<{id: string, name: string}>>([])

  // Use real data from Supabase
  const { 
    followUps, 
    loading, 
    error, 
    createFollowUp, 
    updateFollowUp, 
    deleteFollowUp 
  } = useFollowUps({ member_id: member.id })

  // Load trainers for assignment
  useEffect(() => {
    const loadTrainers = async () => {
      try {
        const gymId = member.gym_id
        if (gymId) {
          const trainerData = await FollowUpService.getActiveTrainers(gymId)
          setTrainers(trainerData)
        }
      } catch (error) {
        console.error('Error loading trainers:', error)
      }
    }
    loadTrainers()
  }, [member.gym_id])

  const getConvertibilityBadge = (convertibility: string) => {
    switch (convertibility) {
      case 'high':
        return <Badge className="bg-green-100 text-green-800 border-green-200">High</Badge>
      case 'medium':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Medium</Badge>
      case 'low':
        return <Badge className="bg-red-100 text-red-800 border-red-200">Low</Badge>
      default:
        return <Badge variant="secondary">{convertibility}</Badge>
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Pending</Badge>
      case 'completed':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Completed</Badge>
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const handleAddFollowUp = async (formData: FormData) => {
    try {
      await createFollowUp({
        member_id: member.id,
        assigned_to: formData.get('assignedTo') as string || undefined,
        follow_up_date: formData.get('followUpDate') as string,
        response: formData.get('response') as string || undefined,
        convertibility: formData.get('convertibility') as 'high' | 'medium' | 'low',
        next_follow_up_date: formData.get('nextFollowUpDate') as string || undefined,
        next_follow_up_time: formData.get('nextFollowUpTime') as string || undefined,
        remark: formData.get('remark') as string || undefined
      })
      setIsAddFollowUpOpen(false)
      if (onFollowUpUpdated) onFollowUpUpdated()
    } catch (error) {
      console.error('Error adding follow-up:', error)
    }
  }

  const handleEditFollowUp = (followUp: any) => {
    setEditingFollowUp(followUp)
    setIsEditFollowUpOpen(true)
  }

  const handleDeleteFollowUp = async (id: string) => {
    try {
      await deleteFollowUp(id)
      if (onFollowUpUpdated) onFollowUpUpdated()
    } catch (error) {
      console.error('Error deleting follow-up:', error)
    }
  }

  const handleUpdateFollowUp = async (formData: FormData) => {
    if (!editingFollowUp) return
    
    try {
      await updateFollowUp(editingFollowUp.id, {
        assigned_to: formData.get('editAssignedTo') as string || undefined,
        follow_up_date: formData.get('editFollowUpDate') as string || undefined,
        response: formData.get('editResponse') as string || undefined,
        convertibility: formData.get('editConvertibility') as 'high' | 'medium' | 'low' || undefined,
        next_follow_up_date: formData.get('editNextFollowUpDate') as string || undefined,
        next_follow_up_time: formData.get('editNextFollowUpTime') as string || undefined,
        remark: formData.get('editRemark') as string || undefined
      })
      setIsEditFollowUpOpen(false)
      setEditingFollowUp(null)
      if (onFollowUpUpdated) onFollowUpUpdated()
    } catch (error) {
      console.error('Error updating follow-up:', error)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header with Add Button */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Follow-up History</h3>
          <p className="text-sm text-gray-500">Track follow-up interactions with this member</p>
        </div>
        <Dialog open={isAddFollowUpOpen} onOpenChange={setIsAddFollowUpOpen}>
          <DialogTrigger asChild>
            <Button className="bg-orange-500 hover:bg-orange-600 text-white">
              <Plus className="w-4 h-4 mr-2" />
              Add Follow Up
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New Follow Up</DialogTitle>
              <DialogDescription>
                Record a new follow-up interaction with this member
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={(e) => {
              e.preventDefault()
              const formData = new FormData(e.currentTarget)
              handleAddFollowUp(formData)
            }}>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="assignedTo">Assigned To</Label>
                    <Select name="assignedTo">
                      <SelectTrigger>
                        <SelectValue placeholder="Select staff member" />
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
                  <div>
                    <Label htmlFor="convertibility">Convertibility</Label>
                    <Select name="convertibility" required>
                      <SelectTrigger>
                        <SelectValue placeholder="Select convertibility" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="followUpDate">Follow-up Date</Label>
                  <Input type="datetime-local" name="followUpDate" required />
                </div>

                <div>
                  <Label htmlFor="response">Response</Label>
                  <Textarea 
                    name="response" 
                    placeholder="Describe the member's response or feedback"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="nextFollowUpDate">Next Follow-up Date</Label>
                    <Input type="date" name="nextFollowUpDate" required />
                  </div>
                  <div>
                    <Label htmlFor="nextFollowUpTime">Next Follow-up Time</Label>
                    <Input type="time" name="nextFollowUpTime" required />
                  </div>
                </div>

                <div>
                  <Label htmlFor="remark">Remark</Label>
                  <Textarea 
                    name="remark" 
                    placeholder="Additional notes or remarks"
                  />
                </div>

                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setIsAddFollowUpOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    Add Follow Up
                  </Button>
                </div>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Follow-up Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead>Response</TableHead>
                <TableHead>Convertibility</TableHead>
                <TableHead>Next FollowUp Date & Time</TableHead>
                <TableHead>Remark</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                    Loading follow-ups...
                  </TableCell>
                </TableRow>
              ) : error ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-red-500">
                    Error loading follow-ups: {error}
                  </TableCell>
                </TableRow>
              ) : followUps.length > 0 ? (
                followUps.map((followUp, index) => (
                  <TableRow key={followUp.id}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>{formatDate(new Date(followUp.follow_up_date))}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <User className="w-4 h-4 text-gray-400" />
                        <span>
                          {followUp.assigned_staff?.profile 
                            ? `${followUp.assigned_staff.profile.first_name} ${followUp.assigned_staff.profile.last_name}`
                            : followUp.assigned_staff?.employee_id || 'Not assigned'
                          }
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-xs truncate" title={followUp.response}>
                        {followUp.response || '-'}
                      </div>
                    </TableCell>
                    <TableCell>{getConvertibilityBadge(followUp.convertibility)}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span>
                          {followUp.next_follow_up_date 
                            ? `${formatDate(new Date(followUp.next_follow_up_date))} ${followUp.next_follow_up_time || ''}`
                            : '-'
                          }
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-xs truncate" title={followUp.remark}>
                        {followUp.remark || '-'}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(followUp.status)}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          onClick={() => handleEditFollowUp(followUp)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          onClick={() => handleDeleteFollowUp(followUp.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                    <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No Follow-ups Found</h3>
                    <p>No follow-up interactions recorded for this member</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Follow-up Dialog */}
      <Dialog open={isEditFollowUpOpen} onOpenChange={setIsEditFollowUpOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Follow Up</DialogTitle>
            <DialogDescription>
              Update the follow-up interaction details
            </DialogDescription>
          </DialogHeader>
          {editingFollowUp && (
            <form onSubmit={(e) => {
              e.preventDefault()
              const formData = new FormData(e.currentTarget)
              handleUpdateFollowUp(formData)
            }}>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="editAssignedTo">Assigned To</Label>
                    <Select name="editAssignedTo" defaultValue={editingFollowUp.assigned_to}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select staff member" />
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
                  <div>
                    <Label htmlFor="editConvertibility">Convertibility</Label>
                    <Select name="editConvertibility" defaultValue={editingFollowUp.convertibility}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="editFollowUpDate">Follow-up Date</Label>
                  <Input 
                    type="datetime-local" 
                    name="editFollowUpDate" 
                    defaultValue={editingFollowUp.follow_up_date ? new Date(editingFollowUp.follow_up_date).toISOString().slice(0, 16) : ''}
                  />
                </div>

                <div>
                  <Label htmlFor="editResponse">Response</Label>
                  <Textarea 
                    name="editResponse" 
                    defaultValue={editingFollowUp.response || ''}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="editNextFollowUpDate">Next Follow-up Date</Label>
                    <Input 
                      type="date" 
                      name="editNextFollowUpDate" 
                      defaultValue={editingFollowUp.next_follow_up_date ? new Date(editingFollowUp.next_follow_up_date).toISOString().split('T')[0] : ''}
                    />
                  </div>
                  <div>
                    <Label htmlFor="editNextFollowUpTime">Next Follow-up Time</Label>
                    <Input 
                      type="time" 
                      name="editNextFollowUpTime" 
                      defaultValue={editingFollowUp.next_follow_up_time || ''}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="editRemark">Remark</Label>
                  <Textarea 
                    name="editRemark" 
                    defaultValue={editingFollowUp.remark || ''}
                  />
                </div>

                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setIsEditFollowUpOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    Update Follow Up
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
