import React, { useState } from 'react'
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
  Calendar, 
  Clock, 
  User, 
  CheckCircle2, 
  AlertCircle,
  Plus,
  Edit,
  Trash2,
  TrendingUp,
  Activity,
  BarChart3,
  Filter,
  Download
} from 'lucide-react'
import { formatDate } from '@/lib/utils'
import type { MemberWithDetails } from '@/types'

interface AttendanceHistoryProps {
  member: MemberWithDetails
  onAttendanceUpdated?: () => void
}

interface AttendanceRecord {
  id: string
  date: string
  checkInTime: string
  checkOutTime?: string
  status: 'present' | 'absent' | 'late' | 'holiday' | 'sick_leave' | 'half_day'
  duration?: number // in minutes
  notes?: string
  markedBy: string
  location: string
  activity?: string
}

export const AttendanceHistory: React.FC<AttendanceHistoryProps> = ({ 
  member, 
  onAttendanceUpdated 
}) => {
  const [isAddAttendanceOpen, setIsAddAttendanceOpen] = useState(false)
  const [isEditAttendanceOpen, setIsEditAttendanceOpen] = useState(false)
  const [editingAttendance, setEditingAttendance] = useState<AttendanceRecord | null>(null)
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [dateRange, setDateRange] = useState<{ from: string; to: string }>({
    from: '',
    to: ''
  })

  // Mock data - in real app, this would come from API
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([
    {
      id: '1',
      date: '2025-09-15',
      checkInTime: '09:00',
      checkOutTime: '11:30',
      status: 'present',
      duration: 150,
      notes: 'Regular workout session',
      markedBy: 'Reception Staff',
      location: 'Main Gym',
      activity: 'Weight Training'
    },
    {
      id: '2',
      date: '2025-09-14',
      checkInTime: '08:30',
      checkOutTime: '10:00',
      status: 'present',
      duration: 90,
      notes: 'Cardio session',
      markedBy: 'Reception Staff',
      location: 'Cardio Zone',
      activity: 'Running'
    },
    {
      id: '3',
      date: '2025-09-13',
      checkInTime: '10:15',
      status: 'late',
      notes: 'Arrived 15 minutes late',
      markedBy: 'Reception Staff',
      location: 'Main Gym',
      activity: 'Personal Training'
    },
    {
      id: '4',
      date: '2025-09-12',
      status: 'absent',
      notes: 'No show',
      markedBy: 'System',
      location: 'N/A'
    }
  ])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'present':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Present</Badge>
      case 'absent':
        return <Badge variant="destructive">Absent</Badge>
      case 'late':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Late</Badge>
      case 'holiday':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Holiday</Badge>
      case 'sick_leave':
        return <Badge className="bg-orange-100 text-orange-800 border-orange-200">Sick Leave</Badge>
      case 'half_day':
        return <Badge className="bg-purple-100 text-purple-800 border-purple-200">Half Day</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const filteredRecords = attendanceRecords.filter(record => {
    if (selectedStatus !== 'all' && record.status !== selectedStatus) return false
    if (dateRange.from && record.date < dateRange.from) return false
    if (dateRange.to && record.date > dateRange.to) return false
    return true
  })

  const totalDays = attendanceRecords.length
  const presentDays = attendanceRecords.filter(r => r.status === 'present').length
  const absentDays = attendanceRecords.filter(r => r.status === 'absent').length
  const lateDays = attendanceRecords.filter(r => r.status === 'late').length
  const attendanceRate = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0

  const handleAddAttendance = (formData: FormData) => {
    const newRecord: AttendanceRecord = {
      id: Date.now().toString(),
      date: formData.get('date') as string,
      checkInTime: formData.get('checkInTime') as string,
      checkOutTime: formData.get('checkOutTime') as string || undefined,
      status: formData.get('status') as any,
      duration: formData.get('duration') ? parseInt(formData.get('duration') as string) : undefined,
      notes: formData.get('notes') as string,
      markedBy: 'Current User',
      location: formData.get('location') as string,
      activity: formData.get('activity') as string
    }

    setAttendanceRecords([...attendanceRecords, newRecord])
    setIsAddAttendanceOpen(false)
    if (onAttendanceUpdated) onAttendanceUpdated()
  }

  const handleEditAttendance = (record: AttendanceRecord) => {
    setEditingAttendance(record)
    setIsEditAttendanceOpen(true)
  }

  const handleDeleteAttendance = (id: string) => {
    setAttendanceRecords(attendanceRecords.filter(r => r.id !== id))
    if (onAttendanceUpdated) onAttendanceUpdated()
  }

  const formatDuration = (minutes?: number) => {
    if (!minutes) return 'N/A'
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`
  }

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Attendance History</h3>
          <p className="text-sm text-gray-500">Track member attendance and visits</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Dialog open={isAddAttendanceOpen} onOpenChange={setIsAddAttendanceOpen}>
            <DialogTrigger asChild>
              <Button className="bg-orange-500 hover:bg-orange-600 text-white">
                <Plus className="w-4 h-4 mr-2" />
                Add Record
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add Attendance Record</DialogTitle>
                <DialogDescription>
                  Record a new attendance entry for this member
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={(e) => {
                e.preventDefault()
                const formData = new FormData(e.currentTarget)
                handleAddAttendance(formData)
              }}>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="date">Date</Label>
                      <Input type="date" name="date" required />
                    </div>
                    <div>
                      <Label htmlFor="status">Status</Label>
                      <Select name="status" required>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="present">Present</SelectItem>
                          <SelectItem value="absent">Absent</SelectItem>
                          <SelectItem value="late">Late</SelectItem>
                          <SelectItem value="holiday">Holiday</SelectItem>
                          <SelectItem value="sick_leave">Sick Leave</SelectItem>
                          <SelectItem value="half_day">Half Day</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="checkInTime">Check-in Time</Label>
                      <Input type="time" name="checkInTime" />
                    </div>
                    <div>
                      <Label htmlFor="checkOutTime">Check-out Time</Label>
                      <Input type="time" name="checkOutTime" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="location">Location</Label>
                      <Input name="location" placeholder="e.g., Main Gym, Cardio Zone" />
                    </div>
                    <div>
                      <Label htmlFor="activity">Activity</Label>
                      <Input name="activity" placeholder="e.g., Weight Training, Cardio" />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="duration">Duration (minutes)</Label>
                    <Input type="number" name="duration" placeholder="Enter duration in minutes" />
                  </div>

                  <div>
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea name="notes" placeholder="Additional notes about the attendance" />
                  </div>

                  <div className="flex justify-end space-x-2">
                    <Button type="button" variant="outline" onClick={() => setIsAddAttendanceOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit">
                      Add Record
                    </Button>
                  </div>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              <div>
                <div className="text-2xl font-bold">{totalDays}</div>
                <div className="text-sm text-gray-500">Total Days</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <div>
                <div className="text-2xl font-bold">{presentDays}</div>
                <div className="text-sm text-gray-500">Present</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <div>
                <div className="text-2xl font-bold">{absentDays}</div>
                <div className="text-sm text-gray-500">Absent</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-5 h-5 text-orange-600" />
              <div>
                <div className="text-2xl font-bold">{attendanceRate}%</div>
                <div className="text-sm text-gray-500">Attendance Rate</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <Filter className="w-4 h-4 text-gray-500" />
          <Label htmlFor="statusFilter">Filter by Status:</Label>
          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="present">Present</SelectItem>
              <SelectItem value="absent">Absent</SelectItem>
              <SelectItem value="late">Late</SelectItem>
              <SelectItem value="holiday">Holiday</SelectItem>
              <SelectItem value="sick_leave">Sick Leave</SelectItem>
              <SelectItem value="half_day">Half Day</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center space-x-2">
          <Label htmlFor="dateFrom">From:</Label>
          <Input 
            type="date" 
            value={dateRange.from}
            onChange={(e) => setDateRange({...dateRange, from: e.target.value})}
            className="w-40"
          />
        </div>
        <div className="flex items-center space-x-2">
          <Label htmlFor="dateTo">To:</Label>
          <Input 
            type="date" 
            value={dateRange.to}
            onChange={(e) => setDateRange({...dateRange, to: e.target.value})}
            className="w-40"
          />
        </div>
      </div>

      {/* Attendance Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[120px]">Date</TableHead>
                <TableHead className="min-w-[100px]">Check-in</TableHead>
                <TableHead className="min-w-[100px]">Check-out</TableHead>
                <TableHead className="min-w-[100px]">Duration</TableHead>
                <TableHead className="min-w-[100px]">Status</TableHead>
                <TableHead className="min-w-[120px]">Location</TableHead>
                <TableHead className="min-w-[120px]">Activity</TableHead>
                <TableHead className="min-w-[150px]">Notes</TableHead>
                <TableHead className="min-w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRecords.length > 0 ? (
                filteredRecords.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span>{formatDate(new Date(record.date))}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {record.checkInTime ? (
                        <div className="flex items-center space-x-2">
                          <Clock className="w-4 h-4 text-gray-400" />
                          <span>{record.checkInTime}</span>
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {record.checkOutTime ? (
                        <div className="flex items-center space-x-2">
                          <Clock className="w-4 h-4 text-gray-400" />
                          <span>{record.checkOutTime}</span>
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>{formatDuration(record.duration)}</TableCell>
                    <TableCell>{getStatusBadge(record.status)}</TableCell>
                    <TableCell>{record.location}</TableCell>
                    <TableCell>{record.activity || '-'}</TableCell>
                    <TableCell>
                      <div className="max-w-xs truncate" title={record.notes}>
                        {record.notes || '-'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          onClick={() => handleEditAttendance(record)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          onClick={() => handleDeleteAttendance(record.id)}
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
                    <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No Attendance Records Found</h3>
                    <p>No attendance history available for this member</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Attendance Dialog */}
      <Dialog open={isEditAttendanceOpen} onOpenChange={setIsEditAttendanceOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Attendance Record</DialogTitle>
            <DialogDescription>
              Update the attendance record details
            </DialogDescription>
          </DialogHeader>
          {editingAttendance && (
            <form onSubmit={(e) => {
              e.preventDefault()
              // Handle edit logic here
              setIsEditAttendanceOpen(false)
              setEditingAttendance(null)
            }}>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="editDate">Date</Label>
                    <Input 
                      type="date" 
                      name="editDate" 
                      defaultValue={editingAttendance.date}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="editStatus">Status</Label>
                    <Select name="editStatus" defaultValue={editingAttendance.status}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="present">Present</SelectItem>
                        <SelectItem value="absent">Absent</SelectItem>
                        <SelectItem value="late">Late</SelectItem>
                        <SelectItem value="holiday">Holiday</SelectItem>
                        <SelectItem value="sick_leave">Sick Leave</SelectItem>
                        <SelectItem value="half_day">Half Day</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="editCheckInTime">Check-in Time</Label>
                    <Input 
                      type="time" 
                      name="editCheckInTime" 
                      defaultValue={editingAttendance.checkInTime}
                    />
                  </div>
                  <div>
                    <Label htmlFor="editCheckOutTime">Check-out Time</Label>
                    <Input 
                      type="time" 
                      name="editCheckOutTime" 
                      defaultValue={editingAttendance.checkOutTime}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="editLocation">Location</Label>
                    <Input 
                      name="editLocation" 
                      defaultValue={editingAttendance.location}
                    />
                  </div>
                  <div>
                    <Label htmlFor="editActivity">Activity</Label>
                    <Input 
                      name="editActivity" 
                      defaultValue={editingAttendance.activity}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="editNotes">Notes</Label>
                  <Textarea 
                    name="editNotes" 
                    defaultValue={editingAttendance.notes}
                  />
                </div>

                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setIsEditAttendanceOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    Update Record
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
