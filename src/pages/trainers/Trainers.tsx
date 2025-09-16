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
  Loader2,
  Dumbbell,
  Star,
  Clock,
  Target
} from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import { useAuth } from '@/context/AuthContext'
import { useGym } from '@/hooks/useGym'
import type { Staff, UserRole, StaffStatus } from '@/types'
import { TrainerPTDashboard } from '@/components/trainers/TrainerPTDashboard'
import { PTPackageQuickFix } from '@/components/admin/PTPackageQuickFix'
import { TrainerDebugger } from '@/components/debug/TrainerDebugger'
import { TrainerQuickAdd } from '@/components/admin/TrainerQuickAdd'

export default function TrainersManagement() {
  const { user } = useAuth()
  const { gym, staff, fetchStaff, createStaff, updateStaff, loading } = useGym(user?.id)
  
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<StaffStatus | 'all'>('all')
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [selectedTrainer, setSelectedTrainer] = useState<Staff | null>(null)
  const [showViewDialog, setShowViewDialog] = useState(false)

  // Filter only trainers
  const trainers = staff.filter(member => member.role === 'trainer')

  // Add Trainer Form State
  const [addTrainerForm, setAddTrainerForm] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    phone: '',
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

  useEffect(() => {
    if (gym?.id) {
      fetchStaff()
    }
  }, [gym?.id])

  const filteredTrainers = trainers.filter(trainer => {
    const matchesSearch = 
      trainer.profile?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      trainer.profile?.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      trainer.employee_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      trainer.profile?.phone?.includes(searchTerm)

    const matchesStatus = statusFilter === 'all' || trainer.status === statusFilter

    return matchesSearch && matchesStatus
  })

  // Helper functions for managing arrays
  const addCertification = () => {
    if (newCertification.name && newCertification.issuer && newCertification.date) {
      setAddTrainerForm(prev => ({
        ...prev,
        certifications: [...prev.certifications, newCertification]
      }))
      setNewCertification({name: '', issuer: '', date: ''})
    }
  }

  const removeCertification = (index: number) => {
    setAddTrainerForm(prev => ({
      ...prev,
      certifications: prev.certifications.filter((_, i) => i !== index)
    }))
  }

  const addEducation = () => {
    if (newEducation.degree && newEducation.institution && newEducation.year) {
      setAddTrainerForm(prev => ({
        ...prev,
        education: [...prev.education, newEducation]
      }))
      setNewEducation({degree: '', institution: '', year: ''})
    }
  }

  const removeEducation = (index: number) => {
    setAddTrainerForm(prev => ({
      ...prev,
      education: prev.education.filter((_, i) => i !== index)
    }))
  }

  const updateWorkSchedule = (day: string, field: string, value: any) => {
    setAddTrainerForm(prev => ({
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

  const handleAddTrainer = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!gym?.id) return

    try {
      setSubmitLoading(true)
      
      const result = await createStaff({
        email: addTrainerForm.email,
        password: addTrainerForm.password,
        firstName: addTrainerForm.firstName,
        lastName: addTrainerForm.lastName,
        phone: addTrainerForm.phone,
        role: 'trainer', // Always trainer
        employeeId: addTrainerForm.employeeId,
        salaryAmount: parseFloat(addTrainerForm.salaryAmount),
        salaryType: addTrainerForm.salaryType,
        baseCommissionRate: addTrainerForm.baseCommissionRate ? parseFloat(addTrainerForm.baseCommissionRate) : 0,
        hireDate: addTrainerForm.hireDate,
        probationEndDate: addTrainerForm.probationEndDate || undefined,
        contractEndDate: addTrainerForm.contractEndDate || undefined,
        specializations: addTrainerForm.specializations.split(',').map(s => s.trim()).filter(s => s),
        maxClients: addTrainerForm.maxClients ? parseInt(addTrainerForm.maxClients) : undefined,
        hourlyRate: addTrainerForm.hourlyRate ? parseFloat(addTrainerForm.hourlyRate) : undefined,
        overtimeRate: addTrainerForm.overtimeRate ? parseFloat(addTrainerForm.overtimeRate) : undefined,
        experienceYears: addTrainerForm.experienceYears ? parseInt(addTrainerForm.experienceYears) : 0,
        languages: addTrainerForm.languages.split(',').map(s => s.trim()).filter(s => s),
        workSchedule: addTrainerForm.workSchedule,
        certifications: addTrainerForm.certifications,
        education: addTrainerForm.education,
        bankAccountDetails: addTrainerForm.bankAccountDetails,
        taxDetails: addTrainerForm.taxDetails,
        notes: addTrainerForm.notes || undefined
      })

      if (result.error) {
        throw new Error(result.error)
      }

      // Reset form
      setAddTrainerForm({
        email: '',
        password: '',
        firstName: '',
        lastName: '',
        phone: '',
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
      alert(`Trainer account created successfully! 

${addTrainerForm.firstName} can now log in immediately with:
• Email: ${addTrainerForm.email}
• Password: ${addTrainerForm.password}
• Role: Trainer

The account is active and they can access their trainer dashboard right away!`)
    } catch (error) {
      console.error('❌ Error adding trainer:', error)
      
      let errorMessage = 'Failed to add trainer. Please try again.'
      
      if (error instanceof Error) {
        if (error.message.includes('CORS')) {
          errorMessage = 'CORS Error: Please check your Supabase configuration.'
        } else if (error.message.includes('403')) {
          errorMessage = 'Permission Error: Please check RLS policies.'
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

  const handleUpdateTrainerStatus = async (trainerId: string, status: StaffStatus) => {
    try {
      const result = await updateStaff(trainerId, { status })
      if (result.error) {
        throw new Error(result.error)
      }
      alert('Trainer status updated successfully!')
    } catch (error) {
      console.error('Error updating trainer status:', error)
      alert('Failed to update trainer status.')
    }
  }

  const handleViewTrainer = (trainer: Staff) => {
    setSelectedTrainer(trainer)
    setShowViewDialog(true)
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2 text-lg">Loading trainers...</span>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Dumbbell className="h-8 w-8 text-primary" />
            Trainers Management
          </h1>
          <p className="text-muted-foreground">
            Manage your gym trainers, their specializations, and client assignments
          </p>
        </div>
        
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="h-4 w-4 mr-2" />
              Add Trainer
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Trainer</DialogTitle>
              <DialogDescription>
                Create a new trainer account with specialized training features
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleAddTrainer} className="space-y-6">
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
                        value={addTrainerForm.firstName}
                        onChange={(e) => setAddTrainerForm(prev => ({ ...prev, firstName: e.target.value }))}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name *</Label>
                      <Input
                        id="lastName"
                        value={addTrainerForm.lastName}
                        onChange={(e) => setAddTrainerForm(prev => ({ ...prev, lastName: e.target.value }))}
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
                        value={addTrainerForm.email}
                        onChange={(e) => setAddTrainerForm(prev => ({ ...prev, email: e.target.value }))}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number *</Label>
                      <Input
                        id="phone"
                        value={addTrainerForm.phone}
                        onChange={(e) => setAddTrainerForm(prev => ({ ...prev, phone: e.target.value }))}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Password *</Label>
                    <Input
                      id="password"
                      type="password"
                      value={addTrainerForm.password}
                      onChange={(e) => setAddTrainerForm(prev => ({ ...prev, password: e.target.value }))}
                      required
                      placeholder="Minimum 6 characters"
                    />
                  </div>
                </TabsContent>

                {/* Job Details Tab */}
                <TabsContent value="job" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="employeeId">Employee ID *</Label>
                    <Input
                      id="employeeId"
                      value={addTrainerForm.employeeId}
                      onChange={(e) => setAddTrainerForm(prev => ({ ...prev, employeeId: e.target.value }))}
                      placeholder="e.g., TRN001"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="salaryAmount">Salary Amount *</Label>
                      <Input
                        id="salaryAmount"
                        type="number"
                        value={addTrainerForm.salaryAmount}
                        onChange={(e) => setAddTrainerForm(prev => ({ ...prev, salaryAmount: e.target.value }))}
                        placeholder="25000"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="salaryType">Salary Type</Label>
                      <Select onValueChange={(value) => setAddTrainerForm(prev => ({ ...prev, salaryType: value }))}>
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
                        value={addTrainerForm.baseCommissionRate}
                        onChange={(e) => setAddTrainerForm(prev => ({ ...prev, baseCommissionRate: e.target.value }))}
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
                        value={addTrainerForm.hireDate}
                        onChange={(e) => setAddTrainerForm(prev => ({ ...prev, hireDate: e.target.value }))}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="probationEndDate">Probation End Date</Label>
                      <Input
                        id="probationEndDate"
                        type="date"
                        value={addTrainerForm.probationEndDate}
                        onChange={(e) => setAddTrainerForm(prev => ({ ...prev, probationEndDate: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contractEndDate">Contract End Date</Label>
                      <Input
                        id="contractEndDate"
                        type="date"
                        value={addTrainerForm.contractEndDate}
                        onChange={(e) => setAddTrainerForm(prev => ({ ...prev, contractEndDate: e.target.value }))}
                      />
                    </div>
                  </div>
                </TabsContent>

                {/* Professional Details Tab */}
                <TabsContent value="professional" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="specializations">Specializations *</Label>
                    <Textarea
                      id="specializations"
                      value={addTrainerForm.specializations}
                      onChange={(e) => setAddTrainerForm(prev => ({ ...prev, specializations: e.target.value }))}
                      placeholder="Weight Training, Cardio, Yoga, CrossFit (comma separated)"
                      rows={2}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="maxClients">Max Clients *</Label>
                      <Input
                        id="maxClients"
                        type="number"
                        value={addTrainerForm.maxClients}
                        onChange={(e) => setAddTrainerForm(prev => ({ ...prev, maxClients: e.target.value }))}
                        placeholder="20"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="experienceYears">Experience (Years) *</Label>
                      <Input
                        id="experienceYears"
                        type="number"
                        value={addTrainerForm.experienceYears}
                        onChange={(e) => setAddTrainerForm(prev => ({ ...prev, experienceYears: e.target.value }))}
                        placeholder="5"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="hourlyRate">Hourly Rate *</Label>
                      <Input
                        id="hourlyRate"
                        type="number"
                        step="0.01"
                        value={addTrainerForm.hourlyRate}
                        onChange={(e) => setAddTrainerForm(prev => ({ ...prev, hourlyRate: e.target.value }))}
                        placeholder="500"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="overtimeRate">Overtime Rate</Label>
                      <Input
                        id="overtimeRate"
                        type="number"
                        step="0.01"
                        value={addTrainerForm.overtimeRate}
                        onChange={(e) => setAddTrainerForm(prev => ({ ...prev, overtimeRate: e.target.value }))}
                        placeholder="750"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="languages">Languages</Label>
                    <Input
                      id="languages"
                      value={addTrainerForm.languages}
                      onChange={(e) => setAddTrainerForm(prev => ({ ...prev, languages: e.target.value }))}
                      placeholder="English, Hindi, Spanish (comma separated)"
                    />
                  </div>

                  {/* Certifications */}
                  <div className="space-y-3">
                    <Label>Certifications</Label>
                    <div className="space-y-2">
                      {addTrainerForm.certifications.map((cert, index) => (
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
                      {addTrainerForm.education.map((edu, index) => (
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
                      {Object.entries(addTrainerForm.workSchedule).map(([day, schedule]) => (
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

                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      value={addTrainerForm.notes}
                      onChange={(e) => setAddTrainerForm(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="Additional notes about the trainer..."
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
                    'Add Trainer'
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
            <CardTitle className="text-sm font-medium">Total Trainers</CardTitle>
            <Dumbbell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{trainers.length}</div>
            <p className="text-xs text-muted-foreground">
              {trainers.filter(t => t.status === 'active').length} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {trainers.reduce((sum, t) => sum + (t.max_clients || 0), 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Max capacity across all trainers
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Hourly Rate</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(
                trainers.length > 0 
                  ? trainers.reduce((sum, t) => sum + (t.hourly_rate || 0), 0) / trainers.length 
                  : 0
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Average rate per hour
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Experience</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {trainers.length > 0 
                ? Math.round(trainers.reduce((sum, t) => sum + (t.experience_years || 0), 0) / trainers.length)
                : 0
              } years
            </div>
            <p className="text-xs text-muted-foreground">
              Average experience
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="directory" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="directory">Trainers Directory</TabsTrigger>
          <TabsTrigger value="pt-overview">PT Overview</TabsTrigger>
        </TabsList>

        <TabsContent value="directory" className="space-y-6">
          {/* Filters and Search */}
          <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Trainers Directory</CardTitle>
            <div className="flex items-center space-x-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search trainers..."
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
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Employee ID</TableHead>
                <TableHead>Specializations</TableHead>
                <TableHead>Experience</TableHead>
                <TableHead>Rate</TableHead>
                <TableHead>Max Clients</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTrainers.map((trainer) => (
                <TableRow key={trainer.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">
                        {trainer.profile?.first_name} {trainer.profile?.last_name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {trainer.profile?.phone}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{trainer.employee_id}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {trainer.specializations?.slice(0, 2).map((spec, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {spec}
                        </Badge>
                      ))}
                      {trainer.specializations && trainer.specializations.length > 2 && (
                        <Badge variant="outline" className="text-xs">
                          +{trainer.specializations.length - 2} more
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Star className="h-3 w-3 text-yellow-500" />
                      {trainer.experience_years} years
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{formatCurrency(trainer.hourly_rate || 0)}/hr</p>
                      <p className="text-xs text-muted-foreground">
                        {trainer.salary_type} • {formatCurrency(trainer.salary_amount)}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Users className="h-3 w-3 text-blue-500" />
                      {trainer.max_clients || 0}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusColor(trainer.status)}>
                      {getStatusLabel(trainer.status)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleViewTrainer(trainer)}
                        title="View Details"
                      >
                        <Eye className="h-3 w-3" />
                      </Button>
                      <Select onValueChange={(value) => handleUpdateTrainerStatus(trainer.id, value as StaffStatus)}>
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
          
          {filteredTrainers.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm || statusFilter !== 'all' 
                ? 'No trainers match your search criteria'
                : 'No trainers found. Add your first trainer to get started.'
              }
            </div>
          )}
        </CardContent>
      </Card>
        </TabsContent>

        <TabsContent value="pt-overview" className="space-y-6">
          {/* Debug Component */}
          <TrainerDebugger />
          
          {/* Quick Add Trainer */}
          <TrainerQuickAdd />
          
          {/* Quick Fix Component */}
          <PTPackageQuickFix />
          
          <div className="space-y-6">
            {trainers.filter(t => t.status === 'active').map((trainer) => (
              <Card key={trainer.id}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <Dumbbell className="w-5 h-5 text-blue-600" />
                    <span>{trainer.profile?.first_name} {trainer.profile?.last_name}</span>
                    <Badge variant="outline">{trainer.employee_id}</Badge>
                  </CardTitle>
                  <CardDescription>
                    {trainer.specializations?.join(', ')} • {trainer.experience_years} years experience
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <TrainerPTDashboard trainer={trainer} />
                </CardContent>
              </Card>
            ))}
            
            {trainers.filter(t => t.status === 'active').length === 0 && (
              <Card>
                <CardContent className="p-6 text-center">
                  <p className="text-gray-500">No active trainers found</p>
                  <p className="text-sm text-gray-400 mt-1">Add trainers to see their PT dashboard</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* View Trainer Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Trainer Details</DialogTitle>
            <DialogDescription>
              View complete information for {selectedTrainer?.profile?.first_name} {selectedTrainer?.profile?.last_name}
            </DialogDescription>
          </DialogHeader>
          
          {selectedTrainer && (
            <div className="space-y-6">
              {/* Personal Information */}
              <Card>
                <CardHeader>
                  <CardTitle>Personal Information</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Name</Label>
                    <p className="text-lg">{selectedTrainer.profile?.first_name} {selectedTrainer.profile?.last_name}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Email</Label>
                    <p>{selectedTrainer.profile?.user_id}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Phone</Label>
                    <p>{selectedTrainer.profile?.phone}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Employee ID</Label>
                    <p>{selectedTrainer.employee_id}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Professional Details */}
              <Card>
                <CardHeader>
                  <CardTitle>Professional Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Experience</Label>
                      <p className="text-lg">{selectedTrainer.experience_years} years</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Hourly Rate</Label>
                      <p className="text-lg">{formatCurrency(selectedTrainer.hourly_rate || 0)}/hr</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Max Clients</Label>
                      <p className="text-lg">{selectedTrainer.max_clients || 0}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                      <Badge variant={getStatusColor(selectedTrainer.status)}>
                        {getStatusLabel(selectedTrainer.status)}
                      </Badge>
                    </div>
                  </div>
                  
                  {selectedTrainer.specializations?.length > 0 && (
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Specializations</Label>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {selectedTrainer.specializations.map((spec, index) => (
                          <Badge key={index} variant="outline">{spec}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedTrainer.languages?.length > 0 && (
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Languages</Label>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {selectedTrainer.languages.map((lang, index) => (
                          <Badge key={index} variant="secondary">{lang}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Certifications */}
              {selectedTrainer.certifications && selectedTrainer.certifications.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Certifications</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {selectedTrainer.certifications.map((cert, index) => (
                        <div key={index} className="flex justify-between items-center p-2 border rounded">
                          <div>
                            <p className="font-medium">{cert.name}</p>
                            <p className="text-sm text-muted-foreground">{cert.issuer} • {cert.date}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Education */}
              {selectedTrainer.education && selectedTrainer.education.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Education</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {selectedTrainer.education.map((edu, index) => (
                        <div key={index} className="flex justify-between items-center p-2 border rounded">
                          <div>
                            <p className="font-medium">{edu.degree}</p>
                            <p className="text-sm text-muted-foreground">{edu.institution} • {edu.year}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
