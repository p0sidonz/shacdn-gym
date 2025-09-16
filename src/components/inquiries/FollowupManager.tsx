import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  Calendar,
  Clock,
  Phone,
  Mail,
  MessageSquare,
  Plus,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2
} from 'lucide-react'
import { formatDate, formatCurrency } from '@/lib/utils'
import type { Inquiry, InquiryFollowup, FollowupType, FollowupMethod, FollowupStatus, Staff } from '@/types'

interface FollowupManagerProps {
  inquiry: Inquiry
  staff: Staff[]
  onCreateFollowup: (data: any) => Promise<void>
  onUpdateFollowup: (id: string, data: any) => Promise<void>
  onGetFollowupHistory: (inquiryId: string) => Promise<{ data: InquiryFollowup[] }>
}

export default function FollowupManager({ 
  inquiry, 
  staff, 
  onCreateFollowup, 
  onUpdateFollowup, 
  onGetFollowupHistory 
}: FollowupManagerProps) {
  const [followups, setFollowups] = useState<InquiryFollowup[]>([])
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [loading, setLoading] = useState(false)
  const [selectedFollowup, setSelectedFollowup] = useState<InquiryFollowup | null>(null)
  const [showUpdateDialog, setShowUpdateDialog] = useState(false)

  // Add Follow-up Form State
  const [addFollowupForm, setAddFollowupForm] = useState({
    followup_type: 'call' as FollowupType,
    followup_date: '',
    followup_time: '',
    followup_method: 'phone_call' as FollowupMethod,
    notes: '',
    next_followup_date: '',
    next_followup_time: ''
  })

  // Update Follow-up Form State
  const [updateFollowupForm, setUpdateFollowupForm] = useState({
    status: 'scheduled' as FollowupStatus,
    outcome: '',
    notes: ''
  })

  useEffect(() => {
    loadFollowupHistory()
  }, [inquiry.id])

  const loadFollowupHistory = async () => {
    try {
      setLoading(true)
      const result = await onGetFollowupHistory(inquiry.id)
      setFollowups(result.data)
    } catch (error) {
      console.error('Error loading follow-up history:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddFollowup = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const followupDateTime = new Date(`${addFollowupForm.followup_date}T${addFollowupForm.followup_time}`)
      const nextFollowupDateTime = addFollowupForm.next_followup_date ? 
        new Date(`${addFollowupForm.next_followup_date}T${addFollowupForm.next_followup_time}`) : null

      await onCreateFollowup({
        inquiry_id: inquiry.id,
        followup_type: addFollowupForm.followup_type,
        followup_date: followupDateTime.toISOString(),
        followup_method: addFollowupForm.followup_method,
        notes: addFollowupForm.notes,
        next_followup_date: nextFollowupDateTime?.toISOString()
      })

      // Reset form
      setAddFollowupForm({
        followup_type: 'call',
        followup_date: '',
        followup_time: '',
        followup_method: 'phone_call',
        notes: '',
        next_followup_date: '',
        next_followup_time: ''
      })
      
      setShowAddDialog(false)
      await loadFollowupHistory()
      alert('Follow-up scheduled successfully!')
    } catch (error) {
      console.error('Error adding follow-up:', error)
      alert('Failed to add follow-up. Please try again.')
    }
  }

  const handleUpdateFollowup = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedFollowup) return

    try {
      await onUpdateFollowup(selectedFollowup.id, {
        status: updateFollowupForm.status,
        outcome: updateFollowupForm.outcome,
        notes: updateFollowupForm.notes
      })

      setShowUpdateDialog(false)
      setSelectedFollowup(null)
      await loadFollowupHistory()
      alert('Follow-up updated successfully!')
    } catch (error) {
      console.error('Error updating follow-up:', error)
      alert('Failed to update follow-up. Please try again.')
    }
  }

  const getStatusColor = (status: FollowupStatus) => {
    switch (status) {
      case 'scheduled': return 'default'
      case 'completed': return 'default'
      case 'successful': return 'default'
      case 'cancelled': return 'destructive'
      case 'rescheduled': return 'secondary'
      case 'no_answer': return 'outline'
      case 'busy': return 'outline'
      case 'voicemail': return 'outline'
      default: return 'secondary'
    }
  }

  const getStatusIcon = (status: FollowupStatus) => {
    switch (status) {
      case 'scheduled': return <Clock className="h-4 w-4" />
      case 'completed': return <CheckCircle className="h-4 w-4" />
      case 'successful': return <CheckCircle className="h-4 w-4" />
      case 'cancelled': return <XCircle className="h-4 w-4" />
      case 'rescheduled': return <AlertCircle className="h-4 w-4" />
      default: return <Clock className="h-4 w-4" />
    }
  }

  const getMethodIcon = (method: FollowupMethod) => {
    switch (method) {
      case 'phone_call': return <Phone className="h-4 w-4" />
      case 'email': return <Mail className="h-4 w-4" />
      case 'sms': return <MessageSquare className="h-4 w-4" />
      case 'whatsapp': return <MessageSquare className="h-4 w-4" />
      case 'in_person': return <Calendar className="h-4 w-4" />
      case 'video_call': return <Phone className="h-4 w-4" />
      default: return <Phone className="h-4 w-4" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Follow-up History</h3>
          <p className="text-sm text-muted-foreground">
            Track all follow-up activities for {inquiry.name}
          </p>
        </div>
        
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Schedule Follow-up
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Schedule Follow-up</DialogTitle>
              <DialogDescription>
                Schedule a follow-up call, email, or visit for {inquiry.name}
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleAddFollowup} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="followup_type">Follow-up Type *</Label>
                  <Select onValueChange={(value) => setAddFollowupForm(prev => ({ ...prev, followup_type: value as FollowupType }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="call">Call</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="sms">SMS</SelectItem>
                      <SelectItem value="whatsapp">WhatsApp</SelectItem>
                      <SelectItem value="visit">Visit</SelectItem>
                      <SelectItem value="trial_scheduled">Trial Scheduled</SelectItem>
                      <SelectItem value="conversion_attempt">Conversion Attempt</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="followup_method">Method *</Label>
                  <Select onValueChange={(value) => setAddFollowupForm(prev => ({ ...prev, followup_method: value as FollowupMethod }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="phone_call">Phone Call</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="sms">SMS</SelectItem>
                      <SelectItem value="whatsapp">WhatsApp</SelectItem>
                      <SelectItem value="in_person">In Person</SelectItem>
                      <SelectItem value="video_call">Video Call</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="followup_date">Date *</Label>
                  <Input
                    id="followup_date"
                    type="date"
                    value={addFollowupForm.followup_date}
                    onChange={(e) => setAddFollowupForm(prev => ({ ...prev, followup_date: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="followup_time">Time *</Label>
                  <Input
                    id="followup_time"
                    type="time"
                    value={addFollowupForm.followup_time}
                    onChange={(e) => setAddFollowupForm(prev => ({ ...prev, followup_time: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={addFollowupForm.notes}
                  onChange={(e) => setAddFollowupForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Add notes about this follow-up..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="next_followup_date">Next Follow-up Date</Label>
                  <Input
                    id="next_followup_date"
                    type="date"
                    value={addFollowupForm.next_followup_date}
                    onChange={(e) => setAddFollowupForm(prev => ({ ...prev, next_followup_date: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="next_followup_time">Next Follow-up Time</Label>
                  <Input
                    id="next_followup_time"
                    type="time"
                    value={addFollowupForm.next_followup_time}
                    onChange={(e) => setAddFollowupForm(prev => ({ ...prev, next_followup_time: e.target.value }))}
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  Schedule Follow-up
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Follow-up History */}
      <Card>
        <CardHeader>
          <CardTitle>Follow-up History</CardTitle>
          <CardDescription>
            All follow-up activities for this inquiry
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="ml-2">Loading follow-up history...</span>
            </div>
          ) : followups.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No follow-ups scheduled yet. Schedule your first follow-up to get started.
            </div>
          ) : (
            <div className="space-y-4">
              {followups.map((followup) => (
                <div key={followup.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      {getMethodIcon(followup.followup_method)}
                      <span className="font-medium">{followup.followup_type}</span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {formatDate(new Date(followup.followup_date))} at {new Date(followup.followup_date).toLocaleTimeString()}
                    </div>
                    <Badge variant={getStatusColor(followup.status)}>
                      {getStatusIcon(followup.status)}
                      <span className="ml-1">{followup.status}</span>
                    </Badge>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {followup.notes && (
                      <span className="text-sm text-muted-foreground max-w-xs truncate">
                        {followup.notes}
                      </span>
                    )}
                    {followup.status === 'scheduled' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedFollowup(followup)
                          setUpdateFollowupForm({
                            status: followup.status,
                            outcome: followup.outcome || '',
                            notes: followup.notes || ''
                          })
                          setShowUpdateDialog(true)
                        }}
                      >
                        Update
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Update Follow-up Dialog */}
      <Dialog open={showUpdateDialog} onOpenChange={setShowUpdateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Follow-up</DialogTitle>
            <DialogDescription>
              Update the status and outcome of this follow-up
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleUpdateFollowup} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="status">Status *</Label>
              <Select onValueChange={(value) => setUpdateFollowupForm(prev => ({ ...prev, status: value as FollowupStatus }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="successful">Successful</SelectItem>
                  <SelectItem value="no_answer">No Answer</SelectItem>
                  <SelectItem value="busy">Busy</SelectItem>
                  <SelectItem value="voicemail">Voicemail</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="rescheduled">Rescheduled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="outcome">Outcome</Label>
              <Textarea
                id="outcome"
                value={updateFollowupForm.outcome}
                onChange={(e) => setUpdateFollowupForm(prev => ({ ...prev, outcome: e.target.value }))}
                placeholder="Describe the outcome of this follow-up..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Additional Notes</Label>
              <Textarea
                id="notes"
                value={updateFollowupForm.notes}
                onChange={(e) => setUpdateFollowupForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Add any additional notes..."
                rows={2}
              />
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setShowUpdateDialog(false)}>
                Cancel
              </Button>
              <Button type="submit">
                Update Follow-up
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

