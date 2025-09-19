import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
  UserPlus, 
  Search, 
  Filter, 
  Edit, 
  Trash2, 
  Eye,
  Phone,
  Mail,
  Calendar,
  Users,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  Plus
} from 'lucide-react'
import { formatDate, formatCurrency } from '@/lib/utils'
import { useInquiries } from '@/hooks/useInquiries'
import FollowupManager from '@/components/inquiries/FollowupManager'
import type { Inquiry, InquiryStatus } from '@/types'

export default function InquiriesManagement() {
  const { 
    inquiries, 
    staff, 
    loading, 
    createInquiry, 
    updateInquiry, 
    deleteInquiry,
    getInquiryStats,
    createFollowup,
    updateFollowup,
    getFollowupHistory
  } = useInquiries()

  // Get staff name by user_id
  const getStaffName = (user_id: string) => {
    const staffMember = staff.find(s => s.user_id === user_id)
    return staffMember ? `${staffMember.profile.first_name} ${staffMember.profile.last_name}` : 'Unknown'
  }
  
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<InquiryStatus | 'all'>('all')
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'tomorrow' | 'this_week' | 'this_month' | 'last_month' | 'custom'>('all')
  const [customStartDate, setCustomStartDate] = useState<string>('')
  const [customEndDate, setCustomEndDate] = useState<string>('')
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [selectedInquiry, setSelectedInquiry] = useState<Inquiry | null>(null)
  const [showViewDialog, setShowViewDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showFollowupDialog, setShowFollowupDialog] = useState(false)

  // Add Inquiry Form State
  const [addInquiryForm, setAddInquiryForm] = useState({
    name: '',
    phone: '',
    email: '',
    age: '',
    gender: '',
    interest_area: '',
    preferred_timing: '',
    source: '',
    notes: ''
  })

  // Edit Inquiry Form State
  const [editInquiryForm, setEditInquiryForm] = useState({
    name: '',
    phone: '',
    email: '',
    age: '',
    gender: '',
    interest_area: '',
    preferred_timing: '',
    source: '',
    notes: ''
  })

  const [submitLoading, setSubmitLoading] = useState(false)

  // Date helper functions
  const isSameDay = (d1: Date, d2: Date) => d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate()
  const startOfWeek = (d: Date) => {
    const date = new Date(d)
    const day = date.getDay() // 0 Sun - 6 Sat
    const diff = (day === 0 ? -6 : 1) - day // start week on Monday
    date.setDate(date.getDate() + diff)
    date.setHours(0,0,0,0)
    return date
  }
  const endOfWeek = (d: Date) => {
    const start = startOfWeek(d)
    const end = new Date(start)
    end.setDate(start.getDate() + 6)
    end.setHours(23,59,59,999)
    return end
  }
  const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1)
  const endOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 0, 23,59,59,999)

  const withinDateFilter = (createdAt: string) => {
    if (dateFilter === 'all') return true
    const created = new Date(createdAt)
    const now = new Date()
    if (dateFilter === 'today') return isSameDay(created, now)
    if (dateFilter === 'tomorrow') {
      const tomorrow = new Date(now)
      tomorrow.setDate(now.getDate() + 1)
      return isSameDay(created, tomorrow)
    }
    if (dateFilter === 'this_week') {
      const s = startOfWeek(now)
      const e = endOfWeek(now)
      return created >= s && created <= e
    }
    if (dateFilter === 'this_month') {
      const s = startOfMonth(now)
      const e = endOfMonth(now)
      return created >= s && created <= e
    }
    if (dateFilter === 'last_month') {
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const s = startOfMonth(lastMonth)
      const e = endOfMonth(lastMonth)
      return created >= s && created <= e
    }
    if (dateFilter === 'custom') {
      if (!customStartDate || !customEndDate) return true
      const s = new Date(customStartDate)
      const e = new Date(customEndDate)
      e.setHours(23,59,59,999)
      return created >= s && created <= e
    }
    return true
  }

  const filteredInquiries = inquiries.filter(inquiry => {
    const matchesSearch = 
      inquiry.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inquiry.phone.includes(searchTerm) ||
      inquiry.email?.toLowerCase().includes(searchTerm.toLowerCase())

    // Exclude lost by default unless explicitly filtered to 'lost'
    const baseStatusMatch = statusFilter === 'all' || inquiry.status === statusFilter
    const excludeLostByDefault = statusFilter === 'all' ? inquiry.status !== 'lost' : true
    const matchesStatus = baseStatusMatch && excludeLostByDefault

    const matchesDate = withinDateFilter(inquiry.created_at as unknown as string)

    return matchesSearch && matchesStatus && matchesDate
  })

  const handleAddInquiry = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      setSubmitLoading(true)
      
      const result = await createInquiry({
        name: addInquiryForm.name,
        phone: addInquiryForm.phone,
        email: addInquiryForm.email || undefined,
        age: addInquiryForm.age ? parseInt(addInquiryForm.age) : undefined,
        gender: addInquiryForm.gender || undefined,
        interest_area: addInquiryForm.interest_area || undefined,
        preferred_timing: addInquiryForm.preferred_timing || undefined,
        source: addInquiryForm.source,
        notes: addInquiryForm.notes || undefined
      })

      if (result.error) {
        throw new Error(result.error)
      }

      // Reset form
      setAddInquiryForm({
        name: '',
        phone: '',
        email: '',
        age: '',
        gender: '',
        interest_area: '',
        preferred_timing: '',
        source: '',
        notes: ''
      })
      
      setShowAddDialog(false)
      alert('Inquiry added successfully!')
    } catch (error) {
      console.error('Error adding inquiry:', error)
      alert('Failed to add inquiry. Please try again.')
    } finally {
      setSubmitLoading(false)
    }
  }

  const handleEditInquiry = (inquiry: Inquiry) => {
    setSelectedInquiry(inquiry)
    setShowEditDialog(true)
    setEditInquiryForm({
      name: inquiry.name || '',
      phone: inquiry.phone || '',
      email: inquiry.email || '',
      age: inquiry.age ? String(inquiry.age) : '',
      gender: inquiry.gender || '',
      interest_area: inquiry.interest_area || '',
      preferred_timing: inquiry.preferred_timing || '',
      source: inquiry.source || '',
      notes: inquiry.notes || ''
    })
  }

  const handleUpdateInquiryStatus = async (inquiryId: string, status: InquiryStatus) => {
    try {
      const result = await updateInquiry(inquiryId, { status })
      if (result.error) {
        throw new Error(result.error)
      }
    } catch (error) {
      console.error('Error updating inquiry status:', error)
      alert('Failed to update inquiry status.')
    }
  }

  const getStatusColor = (status: InquiryStatus) => {
    switch (status) {
      case 'new': return 'default'
      case 'contacted': return 'secondary'
      case 'interested': return 'outline'
      case 'trial_scheduled': return 'secondary'
      case 'trial_completed': return 'outline'
      case 'converted': return 'default'
      case 'follow_up': return 'secondary'
      case 'not_interested': return 'destructive'
      case 'lost': return 'destructive'
      default: return 'secondary'
    }
  }

  const getStatusLabel = (status: InquiryStatus) => {
    return status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
  }

  const stats = getInquiryStats()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2 text-lg">Loading inquiries...</span>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Inquiries & Trial Management</h1>
          <p className="text-muted-foreground">
            Track and manage gym inquiries, trials, and conversions
          </p>
        </div>
        
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Inquiry
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New Inquiry</DialogTitle>
              <DialogDescription>
                Record a new gym inquiry or trial request
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleAddInquiry} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={addInquiryForm.name}
                    onChange={(e) => setAddInquiryForm(prev => ({ ...prev, name: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone *</Label>
                  <Input
                    id="phone"
                    value={addInquiryForm.phone}
                    onChange={(e) => setAddInquiryForm(prev => ({ ...prev, phone: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={addInquiryForm.email}
                    onChange={(e) => setAddInquiryForm(prev => ({ ...prev, email: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="age">Age</Label>
                  <Input
                    id="age"
                    type="number"
                    value={addInquiryForm.age}
                    onChange={(e) => setAddInquiryForm(prev => ({ ...prev, age: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="gender">Gender</Label>
                  <Select onValueChange={(value) => setAddInquiryForm(prev => ({ ...prev, gender: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="source">Source *</Label>
                  <Select onValueChange={(value) => setAddInquiryForm(prev => ({ ...prev, source: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select source" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="walk_in">Walk-in</SelectItem>
                      <SelectItem value="phone">Phone</SelectItem>
                      <SelectItem value="website">Website</SelectItem>
                      <SelectItem value="social_media">Social Media</SelectItem>
                      <SelectItem value="referral">Referral</SelectItem>
                      <SelectItem value="advertisement">Advertisement</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="interest_area">Interest Area</Label>
                <Input
                  id="interest_area"
                  value={addInquiryForm.interest_area}
                  onChange={(e) => setAddInquiryForm(prev => ({ ...prev, interest_area: e.target.value }))}
                  placeholder="e.g., Weight Training, Cardio, Yoga"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="preferred_timing">Preferred Timing</Label>
                <Input
                  id="preferred_timing"
                  value={addInquiryForm.preferred_timing}
                  onChange={(e) => setAddInquiryForm(prev => ({ ...prev, preferred_timing: e.target.value }))}
                  placeholder="e.g., Morning 6-8 AM, Evening 6-8 PM"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={addInquiryForm.notes}
                  onChange={(e) => setAddInquiryForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Additional notes about the inquiry..."
                  rows={3}
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitLoading}>
                  {submitLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    'Add Inquiry'
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">New</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.new}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Contacted</CardTitle>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.contacted}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Trial Scheduled</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.trialScheduled}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Converted</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.converted}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.conversionRate}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Inquiries</CardTitle>
            <div className="flex items-center space-x-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search inquiries..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 w-64"
                />
              </div>
              
              <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as InquiryStatus | 'all')}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="contacted">Contacted</SelectItem>
                  <SelectItem value="interested">Interested</SelectItem>
                  <SelectItem value="trial_scheduled">Trial Scheduled</SelectItem>
                  <SelectItem value="trial_completed">Trial Completed</SelectItem>
                  <SelectItem value="converted">Converted</SelectItem>
                  <SelectItem value="follow_up">Follow Up</SelectItem>
                  <SelectItem value="not_interested">Not Interested</SelectItem>
                  <SelectItem value="lost">Lost</SelectItem>
                </SelectContent>
              </Select>

              <Select value={dateFilter} onValueChange={(value) => setDateFilter(value as any)}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Date Range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Dates</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="tomorrow">Tomorrow</SelectItem>
                  <SelectItem value="this_week">This Week</SelectItem>
                  <SelectItem value="this_month">This Month</SelectItem>
                  <SelectItem value="last_month">Last Month</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>

              {dateFilter === 'custom' && (
                <div className="flex items-center space-x-2">
                  <Input type="date" value={customStartDate} onChange={(e) => setCustomStartDate(e.target.value)} />
                  <span className="text-muted-foreground">to</span>
                  <Input type="date" value={customEndDate} onChange={(e) => setCustomEndDate(e.target.value)} />
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Interest</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead>Follow Up</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInquiries.map((inquiry) => (
                <TableRow key={inquiry.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{inquiry.name}</p>
                      {inquiry.age && (
                        <p className="text-sm text-muted-foreground">
                          Age: {inquiry.age} {inquiry.gender && `• ${inquiry.gender}`}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col space-y-1">
                      <div className="flex items-center text-sm">
                        <Phone className="h-3 w-3 mr-1" />
                        {inquiry.phone}
                      </div>
                      {inquiry.email && (
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Mail className="h-3 w-3 mr-1" />
                          {inquiry.email}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {inquiry.source.replace('_', ' ').toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div>
                      {inquiry.interest_area && (
                        <p className="text-sm">{inquiry.interest_area}</p>
                      )}
                      {inquiry.preferred_timing && (
                        <p className="text-xs text-muted-foreground">
                          {inquiry.preferred_timing}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusColor(inquiry.status)}>
                      {getStatusLabel(inquiry.status)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {inquiry.assigned_staff ? (
                      <div className="text-sm">
                        {getStaffName(inquiry.assigned_staff.user_id)}
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">Unassigned</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {inquiry.follow_up_date ? (
                      <div className="text-sm">
                        {formatDate(new Date(inquiry.follow_up_date))}
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleViewInquiry(inquiry)}
                        title="View Details"
                      >
                        <Eye className="h-3 w-3" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleManageFollowups(inquiry)}
                        title="Manage Follow-ups"
                      >
                        <Calendar className="h-3 w-3" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleEditInquiry(inquiry)}
                        title="Edit Inquiry"
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Select onValueChange={(value) => handleUpdateInquiryStatus(inquiry.id, value as InquiryStatus)}>
                        <SelectTrigger className="w-32">
                          <Filter className="h-3 w-3 mr-1" />
                          <span>Status</span>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="contacted">Contacted</SelectItem>
                          <SelectItem value="interested">Interested</SelectItem>
                          <SelectItem value="trial_scheduled">Trial Scheduled</SelectItem>
                          <SelectItem value="trial_completed">Trial Completed</SelectItem>
                          <SelectItem value="converted">Converted</SelectItem>
                          <SelectItem value="follow_up">Follow Up</SelectItem>
                          <SelectItem value="not_interested">Not Interested</SelectItem>
                          <SelectItem value="lost">Lost</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {filteredInquiries.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm || statusFilter !== 'all' 
                ? 'No inquiries match your search criteria'
                : 'No inquiries found. Add your first inquiry to get started.'
              }
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Inquiry Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Inquiry Details</DialogTitle>
            <DialogDescription>
              Complete information for {selectedInquiry?.name}
            </DialogDescription>
          </DialogHeader>
          
          {selectedInquiry && (
            <div className="space-y-6">
              {/* Personal Information */}
              <Card>
                <CardHeader>
                  <CardTitle>Personal Information</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Name</Label>
                    <p className="text-lg">{selectedInquiry.name}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Phone</Label>
                    <p>{selectedInquiry.phone}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Email</Label>
                    <p>{selectedInquiry.email || 'Not provided'}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Age & Gender</Label>
                    <p>{selectedInquiry.age ? `${selectedInquiry.age} years` : 'Not provided'} {selectedInquiry.gender && `• ${selectedInquiry.gender}`}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Inquiry Details */}
              <Card>
                <CardHeader>
                  <CardTitle>Inquiry Details</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Source</Label>
                    <Badge variant="outline">
                      {selectedInquiry.source.replace('_', ' ').toUpperCase()}
                    </Badge>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                    <Badge variant={getStatusColor(selectedInquiry.status)}>
                      {getStatusLabel(selectedInquiry.status)}
                    </Badge>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Interest Area</Label>
                    <p>{selectedInquiry.interest_area || 'Not specified'}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Preferred Timing</Label>
                    <p>{selectedInquiry.preferred_timing || 'Not specified'}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Assigned To</Label>
                    <p>{selectedInquiry.assigned_staff ? 
                      getStaffName(selectedInquiry.assigned_staff.user_id) : 
                      'Unassigned'
                    }</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Follow Up Date</Label>
                    <p>{selectedInquiry.follow_up_date ? 
                      formatDate(new Date(selectedInquiry.follow_up_date)) : 
                      'Not scheduled'
                    }</p>
                  </div>
                </CardContent>
              </Card>

              {/* Notes */}
              {selectedInquiry.notes && (
                <Card>
                  <CardHeader>
                    <CardTitle>Notes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{selectedInquiry.notes}</p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Inquiry Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Inquiry</DialogTitle>
            <DialogDescription>
              Update information for {selectedInquiry?.name}
            </DialogDescription>
          </DialogHeader>
          
          {selectedInquiry && (
            <form
              onSubmit={async (e) => {
                e.preventDefault()
                const payload: any = {
                  name: editInquiryForm.name,
                  phone: editInquiryForm.phone,
                  email: editInquiryForm.email || null,
                  age: editInquiryForm.age ? parseInt(editInquiryForm.age) : null,
                  gender: editInquiryForm.gender || null,
                  interest_area: editInquiryForm.interest_area || null,
                  preferred_timing: editInquiryForm.preferred_timing || null,
                  source: editInquiryForm.source,
                  notes: editInquiryForm.notes || null
                }
                const result = await updateInquiry(selectedInquiry.id, payload)
                if (result.error) {
                  alert('Failed to update inquiry')
                } else {
                  setShowEditDialog(false)
                }
              }}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="e_name">Name *</Label>
                  <Input id="e_name" value={editInquiryForm.name} onChange={(e) => setEditInquiryForm(prev => ({ ...prev, name: e.target.value }))} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="e_phone">Phone *</Label>
                  <Input id="e_phone" value={editInquiryForm.phone} onChange={(e) => setEditInquiryForm(prev => ({ ...prev, phone: e.target.value }))} required />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="e_email">Email</Label>
                  <Input id="e_email" type="email" value={editInquiryForm.email} onChange={(e) => setEditInquiryForm(prev => ({ ...prev, email: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="e_age">Age</Label>
                  <Input id="e_age" type="number" value={editInquiryForm.age} onChange={(e) => setEditInquiryForm(prev => ({ ...prev, age: e.target.value }))} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="e_gender">Gender</Label>
                  <Select value={editInquiryForm.gender} onValueChange={(value) => setEditInquiryForm(prev => ({ ...prev, gender: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="e_source">Source *</Label>
                  <Select value={editInquiryForm.source} onValueChange={(value) => setEditInquiryForm(prev => ({ ...prev, source: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select source" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="walk_in">Walk-in</SelectItem>
                      <SelectItem value="phone">Phone</SelectItem>
                      <SelectItem value="website">Website</SelectItem>
                      <SelectItem value="social_media">Social Media</SelectItem>
                      <SelectItem value="referral">Referral</SelectItem>
                      <SelectItem value="advertisement">Advertisement</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="e_interest_area">Interest Area</Label>
                <Input id="e_interest_area" value={editInquiryForm.interest_area} onChange={(e) => setEditInquiryForm(prev => ({ ...prev, interest_area: e.target.value }))} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="e_preferred_timing">Preferred Timing</Label>
                <Input id="e_preferred_timing" value={editInquiryForm.preferred_timing} onChange={(e) => setEditInquiryForm(prev => ({ ...prev, preferred_timing: e.target.value }))} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="e_notes">Notes</Label>
                <Textarea id="e_notes" rows={3} value={editInquiryForm.notes} onChange={(e) => setEditInquiryForm(prev => ({ ...prev, notes: e.target.value }))} />
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setShowEditDialog(false)}>Cancel</Button>
                <Button type="submit">Save Changes</Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Follow-up Management Dialog */}
      <Dialog open={showFollowupDialog} onOpenChange={setShowFollowupDialog}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Follow-up Management</DialogTitle>
            <DialogDescription>
              Manage follow-ups and call history for {selectedInquiry?.name}
            </DialogDescription>
          </DialogHeader>
          
          {selectedInquiry && (
            <FollowupManager
              inquiry={selectedInquiry}
              staff={staff}
              onCreateFollowup={createFollowup}
              onUpdateFollowup={updateFollowup}
              onGetFollowupHistory={getFollowupHistory}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
