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
  Users,
  DollarSign,
  Calendar,
  Phone,
  Mail,
  Loader2
} from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import { useGym } from '@/hooks/useGym'
import type { Staff, UserRole, StaffStatus } from '@/types'

export default function StaffManagement() {
  const { gym, staff, fetchStaff, createStaff, updateStaff, loading } = useGym()
  
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<StaffStatus | 'all'>('all')
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all')
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showViewDialog, setShowViewDialog] = useState(false)

  // Add Staff Form State
  const [addStaffForm, setAddStaffForm] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    phone: '',
    role: '' as UserRole,
    employeeId: '',
    salaryAmount: '',
    salaryType: 'fixed',
    baseCommissionRate: '',
    hireDate: new Date().toISOString().split('T')[0],
    probationEndDate: '',
    contractEndDate: '',
    specializations: '',
    maxClients: '',
    hourlyRate: '',
    overtimeRate: '',
    experienceYears: '',
    languages: '',
    workSchedule: {
      monday: { start: '09:00', end: '17:00', enabled: true },
      tuesday: { start: '09:00', end: '17:00', enabled: true },
      wednesday: { start: '09:00', end: '17:00', enabled: true },
      thursday: { start: '09:00', end: '17:00', enabled: true },
      friday: { start: '09:00', end: '17:00', enabled: true },
      saturday: { start: '09:00', end: '13:00', enabled: false },
      sunday: { start: '09:00', end: '13:00', enabled: false }
    },
    certifications: [] as Array<{name: string, issuer: string, date: string}>,
    education: [] as Array<{degree: string, institution: string, year: string}>,
    bankAccountDetails: {
      accountNumber: '',
      bankName: '',
      ifsc: '',
      accountHolderName: ''
    },
    taxDetails: {
      pan: '',
      aadhar: '',
      address: ''
    },
    notes: ''
  })

  // Dynamic form states for arrays
  const [newCertification, setNewCertification] = useState({name: '', issuer: '', date: ''})
  const [newEducation, setNewEducation] = useState({degree: '', institution: '', year: ''})

  const [submitLoading, setSubmitLoading] = useState(false)

  // Helper functions for managing arrays
  const addCertification = () => {
    if (newCertification.name && newCertification.issuer && newCertification.date) {
      setAddStaffForm(prev => ({
        ...prev,
        certifications: [...prev.certifications, newCertification]
      }))
      setNewCertification({name: '', issuer: '', date: ''})
    }
  }

  const removeCertification = (index: number) => {
    setAddStaffForm(prev => ({
      ...prev,
      certifications: prev.certifications.filter((_, i) => i !== index)
    }))
  }

  const addEducation = () => {
    if (newEducation.degree && newEducation.institution && newEducation.year) {
      setAddStaffForm(prev => ({
        ...prev,
        education: [...prev.education, newEducation]
      }))
      setNewEducation({degree: '', institution: '', year: ''})
    }
  }

  const removeEducation = (index: number) => {
    setAddStaffForm(prev => ({
      ...prev,
      education: prev.education.filter((_, i) => i !== index)
    }))
  }

  const updateWorkSchedule = (day: string, field: string, value: any) => {
    setAddStaffForm(prev => ({
      ...prev,
      workSchedule: {
        ...prev.workSchedule,
        [day]: {
          ...prev.workSchedule[day as keyof typeof prev.workSchedule],
          [field]: value
        }
      }
    }))
  }

  useEffect(() => {
    if (gym?.id) {
      fetchStaff()
    }
  }, [gym?.id])

  const filteredStaff = staff.filter(member => {
    const matchesSearch = 
      member.profile?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.profile?.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.employee_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.profile?.phone?.includes(searchTerm)

    const matchesStatus = statusFilter === 'all' || member.status === statusFilter
    const matchesRole = roleFilter === 'all' || member.role === roleFilter

    return matchesSearch && matchesStatus && matchesRole
  })

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!gym?.id) return

    try {
      setSubmitLoading(true)
      
      const result = await createStaff({
        email: addStaffForm.email,
        password: addStaffForm.password,
        firstName: addStaffForm.firstName,
        lastName: addStaffForm.lastName,
        phone: addStaffForm.phone,
        role: addStaffForm.role,
        employeeId: addStaffForm.employeeId,
        salaryAmount: parseFloat(addStaffForm.salaryAmount),
        salaryType: addStaffForm.salaryType,
        baseCommissionRate: addStaffForm.baseCommissionRate ? parseFloat(addStaffForm.baseCommissionRate) : 0,
        hireDate: addStaffForm.hireDate,
        probationEndDate: addStaffForm.probationEndDate || undefined,
        contractEndDate: addStaffForm.contractEndDate || undefined,
        specializations: addStaffForm.specializations.split(',').map(s => s.trim()).filter(s => s),
        maxClients: addStaffForm.maxClients ? parseInt(addStaffForm.maxClients) : undefined,
        hourlyRate: addStaffForm.hourlyRate ? parseFloat(addStaffForm.hourlyRate) : undefined,
        overtimeRate: addStaffForm.overtimeRate ? parseFloat(addStaffForm.overtimeRate) : undefined,
        experienceYears: addStaffForm.experienceYears ? parseInt(addStaffForm.experienceYears) : 0,
        languages: addStaffForm.languages.split(',').map(s => s.trim()).filter(s => s),
        workSchedule: addStaffForm.workSchedule,
        certifications: addStaffForm.certifications,
        education: addStaffForm.education,
        bankAccountDetails: addStaffForm.bankAccountDetails,
        taxDetails: addStaffForm.taxDetails,
        notes: addStaffForm.notes || undefined
      })

      if (result.error) {
        throw new Error(result.error)
      }

      // Reset form
      setAddStaffForm({
        email: '',
        password: '',
        firstName: '',
        lastName: '',
        phone: '',
        role: '' as UserRole,
        employeeId: '',
        salaryAmount: '',
        salaryType: 'fixed',
        baseCommissionRate: '',
        hireDate: new Date().toISOString().split('T')[0],
        probationEndDate: '',
        contractEndDate: '',
        specializations: '',
        maxClients: '',
        hourlyRate: '',
        overtimeRate: '',
        experienceYears: '',
        languages: '',
        workSchedule: {
          monday: { start: '09:00', end: '17:00', enabled: true },
          tuesday: { start: '09:00', end: '17:00', enabled: true },
          wednesday: { start: '09:00', end: '17:00', enabled: true },
          thursday: { start: '09:00', end: '17:00', enabled: true },
          friday: { start: '09:00', end: '17:00', enabled: true },
          saturday: { start: '09:00', end: '13:00', enabled: false },
          sunday: { start: '09:00', end: '13:00', enabled: false }
        },
        certifications: [],
        education: [],
        bankAccountDetails: {
          accountNumber: '',
          bankName: '',
          ifsc: '',
          accountHolderName: ''
        },
        taxDetails: {
          pan: '',
          aadhar: '',
          address: ''
        },
        notes: ''
      })
      setNewCertification({name: '', issuer: '', date: ''})
      setNewEducation({degree: '', institution: '', year: ''})
      
      setShowAddDialog(false)
      // Show success message with credentials
      const successMessage = `Staff member account created successfully! 

${addStaffForm.firstName} can now log in immediately with:
• Email: ${addStaffForm.email}
• Password: ${addStaffForm.password}
• Role: ${addStaffForm.role}

The account is active and they can access their ${addStaffForm.role} dashboard right away!

Please save these credentials securely.`

      alert(successMessage)
      
      // Also log to console for debugging
      console.log('✅ Staff creation successful:', {
        email: addStaffForm.email,
        role: addStaffForm.role,
        staffId: result.data?.id
      })
    } catch (error) {
      console.error('❌ Error adding staff:', error)
      
      // More detailed error message
      let errorMessage = 'Failed to add staff member. Please try again.'
      
      if (error instanceof Error) {
        if (error.message.includes('CORS')) {
          errorMessage = 'CORS Error: Please check your Supabase configuration. Make sure localhost:5173 is added to allowed origins.'
        } else if (error.message.includes('403')) {
          errorMessage = 'Permission Error: Please check RLS policies. Run the database fix script.'
        } else if (error.message.includes('duplicate')) {
          errorMessage = 'Email already exists. Please use a different email address.'
        } else {
          errorMessage = `Error: ${error.message}`
        }
      }
      
      alert(errorMessage)
    } finally {
      setSubmitLoading(false)
    }
  }

  const handleUpdateStaffStatus = async (staffId: string, status: StaffStatus) => {
    try {
      const result = await updateStaff(staffId, { status })
      if (result.error) {
        throw new Error(result.error)
      }
      alert('Staff status updated successfully!')
    } catch (error) {
      console.error('Error updating staff status:', error)
      alert('Failed to update staff status.')
    }
  }

  const handleViewStaff = (staff: Staff) => {
    setSelectedStaff(staff)
    setShowViewDialog(true)
  }

  const handleEditStaff = (staff: Staff) => {
    setSelectedStaff(staff)
    setShowEditDialog(true)
  }

  const getStatusColor = (status: StaffStatus) => {
    switch (status) {
      case 'active': return 'default'
      case 'inactive': return 'secondary'
      case 'terminated': return 'destructive'
      case 'on_leave': return 'outline'
      case 'probation': return 'secondary'
      default: return 'secondary'
    }
  }

  const getStatusLabel = (status: StaffStatus) => {
    return status.replace('_', ' ')
  }

  const getRoleColor = (role: UserRole) => {
    switch (role) {
      case 'manager': return 'default'
      case 'trainer': return 'secondary'
      case 'nutritionist': return 'outline'
      case 'receptionist': return 'secondary'
      case 'housekeeping': return 'outline'
      default: return 'secondary'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2 text-lg">Loading staff...</span>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Staff Management</h1>
          <p className="text-muted-foreground">
            Manage all your gym staff - managers, trainers, nutritionists, receptionists, and support team
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            For detailed trainer management with specialized features, visit the Trainers section
          </p>
        </div>
        
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="h-4 w-4 mr-2" />
              Add Staff Member
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New Staff Member</DialogTitle>
              <DialogDescription>
                Create a new staff account with role-specific permissions
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleAddStaff} className="space-y-6">
              <Tabs defaultValue="personal" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="personal">Personal</TabsTrigger>
                  <TabsTrigger value="job">Job Details</TabsTrigger>
                  <TabsTrigger value="professional">Professional</TabsTrigger>
                  <TabsTrigger value="additional">Additional</TabsTrigger>
                </TabsList>

                {/* Personal Information Tab */}
                <TabsContent value="personal" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name *</Label>
                      <Input
                        id="firstName"
                        value={addStaffForm.firstName}
                        onChange={(e) => setAddStaffForm(prev => ({ ...prev, firstName: e.target.value }))}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name *</Label>
                      <Input
                        id="lastName"
                        value={addStaffForm.lastName}
                        onChange={(e) => setAddStaffForm(prev => ({ ...prev, lastName: e.target.value }))}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={addStaffForm.email}
                        onChange={(e) => setAddStaffForm(prev => ({ ...prev, email: e.target.value }))}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number *</Label>
                      <Input
                        id="phone"
                        value={addStaffForm.phone}
                        onChange={(e) => setAddStaffForm(prev => ({ ...prev, phone: e.target.value }))}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Password *</Label>
                    <Input
                      id="password"
                      type="password"
                      value={addStaffForm.password}
                      onChange={(e) => setAddStaffForm(prev => ({ ...prev, password: e.target.value }))}
                      required
                      placeholder="Minimum 6 characters"
                    />
                  </div>
                </TabsContent>

                {/* Job Details Tab */}
                <TabsContent value="job" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="role">Role *</Label>
                      <Select onValueChange={(value) => setAddStaffForm(prev => ({ ...prev, role: value as UserRole }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="manager">Manager</SelectItem>
                          <SelectItem value="trainer">Trainer</SelectItem>
                          <SelectItem value="nutritionist">Nutritionist</SelectItem>
                          <SelectItem value="receptionist">Receptionist</SelectItem>
                          <SelectItem value="housekeeping">Housekeeping</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="employeeId">Employee ID *</Label>
                      <Input
                        id="employeeId"
                        value={addStaffForm.employeeId}
                        onChange={(e) => setAddStaffForm(prev => ({ ...prev, employeeId: e.target.value }))}
                        placeholder="e.g., EMP001"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="salaryAmount">Salary Amount *</Label>
                      <Input
                        id="salaryAmount"
                        type="number"
                        value={addStaffForm.salaryAmount}
                        onChange={(e) => setAddStaffForm(prev => ({ ...prev, salaryAmount: e.target.value }))}
                        placeholder="25000"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="salaryType">Salary Type</Label>
                      <Select onValueChange={(value) => setAddStaffForm(prev => ({ ...prev, salaryType: value }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Fixed" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="fixed">Fixed Monthly</SelectItem>
                          <SelectItem value="hourly">Hourly</SelectItem>
                          <SelectItem value="commission">Commission</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="baseCommissionRate">Commission Rate (%)</Label>
                      <Input
                        id="baseCommissionRate"
                        type="number"
                        step="0.01"
                        value={addStaffForm.baseCommissionRate}
                        onChange={(e) => setAddStaffForm(prev => ({ ...prev, baseCommissionRate: e.target.value }))}
                        placeholder="5.0"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="hireDate">Hire Date *</Label>
                      <Input
                        id="hireDate"
                        type="date"
                        value={addStaffForm.hireDate}
                        onChange={(e) => setAddStaffForm(prev => ({ ...prev, hireDate: e.target.value }))}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="probationEndDate">Probation End Date</Label>
                      <Input
                        id="probationEndDate"
                        type="date"
                        value={addStaffForm.probationEndDate}
                        onChange={(e) => setAddStaffForm(prev => ({ ...prev, probationEndDate: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contractEndDate">Contract End Date</Label>
                      <Input
                        id="contractEndDate"
                        type="date"
                        value={addStaffForm.contractEndDate}
                        onChange={(e) => setAddStaffForm(prev => ({ ...prev, contractEndDate: e.target.value }))}
                      />
                    </div>
                  </div>
                </TabsContent>

                {/* Professional Details Tab */}
                <TabsContent value="professional" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="specializations">Specializations</Label>
                    <Textarea
                      id="specializations"
                      value={addStaffForm.specializations}
                      onChange={(e) => setAddStaffForm(prev => ({ ...prev, specializations: e.target.value }))}
                      placeholder="Weight Training, Cardio, Yoga (comma separated)"
                      rows={2}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="maxClients">Max Clients</Label>
                      <Input
                        id="maxClients"
                        type="number"
                        value={addStaffForm.maxClients}
                        onChange={(e) => setAddStaffForm(prev => ({ ...prev, maxClients: e.target.value }))}
                        placeholder="20"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="experienceYears">Experience (Years)</Label>
                      <Input
                        id="experienceYears"
                        type="number"
                        value={addStaffForm.experienceYears}
                        onChange={(e) => setAddStaffForm(prev => ({ ...prev, experienceYears: e.target.value }))}
                        placeholder="5"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="hourlyRate">Hourly Rate</Label>
                      <Input
                        id="hourlyRate"
                        type="number"
                        step="0.01"
                        value={addStaffForm.hourlyRate}
                        onChange={(e) => setAddStaffForm(prev => ({ ...prev, hourlyRate: e.target.value }))}
                        placeholder="500"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="overtimeRate">Overtime Rate</Label>
                      <Input
                        id="overtimeRate"
                        type="number"
                        step="0.01"
                        value={addStaffForm.overtimeRate}
                        onChange={(e) => setAddStaffForm(prev => ({ ...prev, overtimeRate: e.target.value }))}
                        placeholder="750"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="languages">Languages</Label>
                    <Input
                      id="languages"
                      value={addStaffForm.languages}
                      onChange={(e) => setAddStaffForm(prev => ({ ...prev, languages: e.target.value }))}
                      placeholder="English, Hindi, Spanish (comma separated)"
                    />
                  </div>

                  {/* Certifications */}
                  <div className="space-y-3">
                    <Label>Certifications</Label>
                    <div className="space-y-2">
                      {addStaffForm.certifications.map((cert, index) => (
                        <div key={index} className="flex items-center gap-2 p-2 border rounded">
                          <div className="flex-1">
                            <span className="font-medium">{cert.name}</span> - {cert.issuer} ({cert.date})
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeCertification(index)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                      <div className="grid grid-cols-3 gap-2">
                        <Input
                          placeholder="Certification Name"
                          value={newCertification.name}
                          onChange={(e) => setNewCertification(prev => ({ ...prev, name: e.target.value }))}
                        />
                        <Input
                          placeholder="Issuing Organization"
                          value={newCertification.issuer}
                          onChange={(e) => setNewCertification(prev => ({ ...prev, issuer: e.target.value }))}
                        />
                        <div className="flex gap-1">
                          <Input
                            type="date"
                            value={newCertification.date}
                            onChange={(e) => setNewCertification(prev => ({ ...prev, date: e.target.value }))}
                          />
                          <Button type="button" onClick={addCertification} size="sm">
                            <UserPlus className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Education */}
                  <div className="space-y-3">
                    <Label>Education</Label>
                    <div className="space-y-2">
                      {addStaffForm.education.map((edu, index) => (
                        <div key={index} className="flex items-center gap-2 p-2 border rounded">
                          <div className="flex-1">
                            <span className="font-medium">{edu.degree}</span> - {edu.institution} ({edu.year})
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeEducation(index)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                      <div className="grid grid-cols-3 gap-2">
                        <Input
                          placeholder="Degree/Qualification"
                          value={newEducation.degree}
                          onChange={(e) => setNewEducation(prev => ({ ...prev, degree: e.target.value }))}
                        />
                        <Input
                          placeholder="Institution Name"
                          value={newEducation.institution}
                          onChange={(e) => setNewEducation(prev => ({ ...prev, institution: e.target.value }))}
                        />
                        <div className="flex gap-1">
                          <Input
                            placeholder="Year"
                            value={newEducation.year}
                            onChange={(e) => setNewEducation(prev => ({ ...prev, year: e.target.value }))}
                          />
                          <Button type="button" onClick={addEducation} size="sm">
                            <UserPlus className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* Additional Details Tab */}
                <TabsContent value="additional" className="space-y-4">
                  {/* Work Schedule */}
                  <div className="space-y-3">
                    <Label>Work Schedule</Label>
                    <div className="space-y-2">
                      {Object.entries(addStaffForm.workSchedule).map(([day, schedule]) => (
                        <div key={day} className="flex items-center gap-4 p-3 border rounded">
                          <div className="w-20">
                            <Label className="capitalize">{day}</Label>
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={schedule.enabled}
                              onChange={(e) => updateWorkSchedule(day, 'enabled', e.target.checked)}
                              className="rounded"
                            />
                            <span className="text-sm text-muted-foreground">Working</span>
                          </div>
                          {schedule.enabled && (
                            <>
                              <div className="flex items-center gap-2">
                                <Label className="text-sm">Start:</Label>
                                <Input
                                  type="time"
                                  value={schedule.start}
                                  onChange={(e) => updateWorkSchedule(day, 'start', e.target.value)}
                                  className="w-24"
                                />
                              </div>
                              <div className="flex items-center gap-2">
                                <Label className="text-sm">End:</Label>
                                <Input
                                  type="time"
                                  value={schedule.end}
                                  onChange={(e) => updateWorkSchedule(day, 'end', e.target.value)}
                                  className="w-24"
                                />
                              </div>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Bank Account Details */}
                  <div className="space-y-3">
                    <Label>Bank Account Details</Label>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="accountNumber">Account Number</Label>
                        <Input
                          id="accountNumber"
                          value={addStaffForm.bankAccountDetails.accountNumber}
                          onChange={(e) => setAddStaffForm(prev => ({
                            ...prev,
                            bankAccountDetails: { ...prev.bankAccountDetails, accountNumber: e.target.value }
                          }))}
                          placeholder="1234567890"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="bankName">Bank Name</Label>
                        <Input
                          id="bankName"
                          value={addStaffForm.bankAccountDetails.bankName}
                          onChange={(e) => setAddStaffForm(prev => ({
                            ...prev,
                            bankAccountDetails: { ...prev.bankAccountDetails, bankName: e.target.value }
                          }))}
                          placeholder="HDFC Bank"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="ifsc">IFSC Code</Label>
                        <Input
                          id="ifsc"
                          value={addStaffForm.bankAccountDetails.ifsc}
                          onChange={(e) => setAddStaffForm(prev => ({
                            ...prev,
                            bankAccountDetails: { ...prev.bankAccountDetails, ifsc: e.target.value }
                          }))}
                          placeholder="HDFC0001234"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="accountHolderName">Account Holder Name</Label>
                        <Input
                          id="accountHolderName"
                          value={addStaffForm.bankAccountDetails.accountHolderName}
                          onChange={(e) => setAddStaffForm(prev => ({
                            ...prev,
                            bankAccountDetails: { ...prev.bankAccountDetails, accountHolderName: e.target.value }
                          }))}
                          placeholder="John Doe"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Tax Details */}
                  <div className="space-y-3">
                    <Label>Tax Details</Label>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="pan">PAN Number</Label>
                        <Input
                          id="pan"
                          value={addStaffForm.taxDetails.pan}
                          onChange={(e) => setAddStaffForm(prev => ({
                            ...prev,
                            taxDetails: { ...prev.taxDetails, pan: e.target.value }
                          }))}
                          placeholder="ABCDE1234F"
                          maxLength={10}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="aadhar">Aadhar Number</Label>
                        <Input
                          id="aadhar"
                          value={addStaffForm.taxDetails.aadhar}
                          onChange={(e) => setAddStaffForm(prev => ({
                            ...prev,
                            taxDetails: { ...prev.taxDetails, aadhar: e.target.value }
                          }))}
                          placeholder="123456789012"
                          maxLength={12}
                        />
                      </div>
                      <div className="space-y-2 col-span-2">
                        <Label htmlFor="address">Address</Label>
                        <Textarea
                          id="address"
                          value={addStaffForm.taxDetails.address}
                          onChange={(e) => setAddStaffForm(prev => ({
                            ...prev,
                            taxDetails: { ...prev.taxDetails, address: e.target.value }
                          }))}
                          placeholder="Complete address for tax purposes"
                          rows={2}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      value={addStaffForm.notes}
                      onChange={(e) => setAddStaffForm(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="Additional notes about the staff member..."
                      rows={3}
                    />
                  </div>
                </TabsContent>
              </Tabs>

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
                    'Add Staff Member'
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Staff</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{staff.length}</div>
            <p className="text-xs text-muted-foreground">
              {staff.filter(s => s.status === 'active').length} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Trainers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {staff.filter(s => s.role === 'trainer').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Professional trainers
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Payroll</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(staff.filter(s => s.status === 'active').reduce((sum, s) => sum + s.salary_amount, 0))}
            </div>
            <p className="text-xs text-muted-foreground">
              Total active salaries
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">On Leave</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {staff.filter(s => s.status === 'on_leave').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Currently on leave
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Staff Directory</CardTitle>
            <div className="flex items-center space-x-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search staff..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 w-64"
                />
              </div>
              
              <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as StaffStatus | 'all')}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="on_leave">On Leave</SelectItem>
                  <SelectItem value="terminated">Terminated</SelectItem>
                  <SelectItem value="probation">Probation</SelectItem>
                </SelectContent>
              </Select>

              <Select value={roleFilter} onValueChange={(value) => setRoleFilter(value as UserRole | 'all')}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="trainer">Trainer</SelectItem>
                  <SelectItem value="nutritionist">Nutritionist</SelectItem>
                  <SelectItem value="receptionist">Receptionist</SelectItem>
                  <SelectItem value="housekeeping">Housekeeping</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Employee ID</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Salary</TableHead>
                <TableHead>Hire Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStaff.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">
                        {member.profile?.first_name} {member.profile?.last_name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {member.specializations?.join(', ')}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{member.employee_id}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getRoleColor(member.role)}>
                      {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col space-y-1">
                      <div className="flex items-center text-sm">
                        <Phone className="h-3 w-3 mr-1" />
                        {member.profile?.phone}
                      </div>
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Mail className="h-3 w-3 mr-1" />
                        {member.profile?.user_id}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{formatCurrency(member.salary_amount)}</p>
                      <p className="text-xs text-muted-foreground">{member.salary_type}</p>
                    </div>
                  </TableCell>
                  <TableCell>{formatDate(new Date(member.hire_date))}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusColor(member.status)}>
                      {getStatusLabel(member.status)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleViewStaff(member)}
                        title="View Details"
                      >
                        <Eye className="h-3 w-3" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleEditStaff(member)}
                        title="Edit Staff"
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Select onValueChange={(value) => handleUpdateStaffStatus(member.id, value as StaffStatus)}>
                        <SelectTrigger className="w-32">
                          <Filter className="h-3 w-3 mr-1" />
                          <span>Status</span>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Mark Active</SelectItem>
                          <SelectItem value="inactive">Mark Inactive</SelectItem>
                          <SelectItem value="on_leave">Mark On Leave</SelectItem>
                          <SelectItem value="terminated">Mark Terminated</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {filteredStaff.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm || statusFilter !== 'all' || roleFilter !== 'all' 
                ? 'No staff members match your search criteria'
                : 'No staff members found. Add your first staff member to get started.'
              }
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Staff Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Staff Details</DialogTitle>
            <DialogDescription>
              View complete information for {selectedStaff?.profile?.first_name} {selectedStaff?.profile?.last_name}
            </DialogDescription>
          </DialogHeader>
          
          {selectedStaff && (
            <div className="space-y-6">
              {/* Personal Information */}
              <Card>
                <CardHeader>
                  <CardTitle>Personal Information</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Name</Label>
                    <p className="text-lg">{selectedStaff.profile?.first_name} {selectedStaff.profile?.last_name}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Email</Label>
                    <p>{selectedStaff.profile?.user_id}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Phone</Label>
                    <p>{selectedStaff.profile?.phone}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Employee ID</Label>
                    <p>{selectedStaff.employee_id}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Job Information */}
              <Card>
                <CardHeader>
                  <CardTitle>Job Information</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Role</Label>
                    <Badge variant={getRoleColor(selectedStaff.role)}>
                      {selectedStaff.role.charAt(0).toUpperCase() + selectedStaff.role.slice(1)}
                    </Badge>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                    <Badge variant={getStatusColor(selectedStaff.status)}>
                      {getStatusLabel(selectedStaff.status)}
                    </Badge>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Salary</Label>
                    <p>{formatCurrency(selectedStaff.salary_amount)} ({selectedStaff.salary_type})</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Commission Rate</Label>
                    <p>{selectedStaff.base_commission_rate}%</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Hire Date</Label>
                    <p>{formatDate(new Date(selectedStaff.hire_date))}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Experience</Label>
                    <p>{selectedStaff.experience_years} years</p>
                  </div>
                </CardContent>
              </Card>

              {/* Professional Details */}
              {(selectedStaff.specializations?.length > 0 || selectedStaff.max_clients || selectedStaff.hourly_rate) && (
                <Card>
                  <CardHeader>
                    <CardTitle>Professional Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {selectedStaff.specializations?.length > 0 && (
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Specializations</Label>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {selectedStaff.specializations.map((spec, index) => (
                            <Badge key={index} variant="outline">{spec}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {selectedStaff.max_clients && (
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Max Clients</Label>
                        <p>{selectedStaff.max_clients}</p>
                      </div>
                    )}
                    {selectedStaff.hourly_rate && (
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Hourly Rate</Label>
                        <p>{formatCurrency(selectedStaff.hourly_rate)}</p>
                      </div>
                    )}
                    {selectedStaff.languages?.length > 0 && (
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Languages</Label>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {selectedStaff.languages.map((lang, index) => (
                            <Badge key={index} variant="secondary">{lang}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Additional Information */}
              {selectedStaff.notes && (
                <Card>
                  <CardHeader>
                    <CardTitle>Notes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{selectedStaff.notes}</p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Staff Dialog - Placeholder for now */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Staff Member</DialogTitle>
            <DialogDescription>
              Update information for {selectedStaff?.profile?.first_name} {selectedStaff?.profile?.last_name}
            </DialogDescription>
          </DialogHeader>
          
          <div className="text-center py-8">
            <p className="text-muted-foreground">Edit functionality coming soon!</p>
            <p className="text-sm text-muted-foreground mt-2">
              This will allow you to update staff information, salary, and other details.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}