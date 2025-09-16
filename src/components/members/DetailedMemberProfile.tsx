import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { 
  User, 
  Phone, 
  Mail, 
  Calendar, 
  Heart, 
  Edit, 
  Plus,
  FileText,
  CreditCard,
  Target,
  Clock,
  CheckCircle2,
  AlertCircle,
  DollarSign,
  Activity,
  MapPin,
  MessageSquare,
  UserCheck,
  Calendar as CalendarIcon,
  TrendingUp,
  Pause,
  Play,
  RotateCcw,
  ArrowUp,
  ArrowDown,
  Trash2,
  Receipt,
  RefreshCw,
  Settings,
  ArrowLeft
} from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { MemberWithDetails } from '@/types'
import { usePayments } from '@/hooks/usePayments'
import { useRefunds } from '@/hooks/useRefunds'
import { useMember } from '@/hooks/useMembers'
import { PaymentPlanService } from '@/services/paymentPlanService'
import { AddPaymentDialog } from './AddPaymentDialog'
import { AddRefundDialog } from './AddRefundDialog'
import { EditMemberDialog } from './EditMemberDialog'
import { AddMemberDialog } from './AddMemberSheet'
import { MembershipDetails } from './MembershipDetails'
import { MembershipManagement } from './MembershipManagement'
import { FollowUpManagement } from './FollowUpManagement'
import { PersonalTrainingManagement } from './PersonalTrainingManagement'
import { PTManagement } from './PTManagement'
import { MemberTermsConditions } from './MemberTermsConditions'
import { AttendanceHistory } from './AttendanceHistory'
import { PaymentHistory } from './PaymentHistory'
import { RefundManagement } from './RefundManagement'

interface DetailedMemberProfileProps {
  member: MemberWithDetails
  onMemberUpdated?: () => void
  onBack?: () => void
}

export const DetailedMemberProfile: React.FC<DetailedMemberProfileProps> = ({ 
  member, 
  onMemberUpdated,
  onBack
}) => {
  const [activeTab, setActiveTab] = useState('membership')
  const [installmentSummary, setInstallmentSummary] = useState<any>(null)
  const [installments, setInstallments] = useState<any[]>([])
  const [loadingInstallments, setLoadingInstallments] = useState(false)
  const [isAddMembershipOpen, setIsAddMembershipOpen] = useState(false)
  const [isAddPTOpen, setIsAddPTOpen] = useState(false)
  const [isAddFollowUpOpen, setIsAddFollowUpOpen] = useState(false)
  const [isAddPaymentOpen, setIsAddPaymentOpen] = useState(false)
  const [isPaymentPlanCreationOpen, setIsPaymentPlanCreationOpen] = useState(false)
  const [selectedMembershipForPaymentPlan, setSelectedMembershipForPaymentPlan] = useState<any>(null)
  const [paymentPlanForm, setPaymentPlanForm] = useState({
    down_payment: 0,
    number_of_installments: 1,
    installment_frequency: 'monthly',
    first_installment_date: new Date().toISOString().split('T')[0],
    custom_dates: false,
    installment_dates: [] as string[]
  })
  const [creatingPaymentPlan, setCreatingPaymentPlan] = useState(false)

  // Payment plan form handlers
  const handlePaymentPlanInputChange = (field: string, value: any) => {
    setPaymentPlanForm(prev => {
      const newForm = { ...prev, [field]: value }
      
      // If number of installments changed, update custom dates array
      if (field === 'number_of_installments') {
        const numInstallments = parseInt(value) || 1
        const currentDates = prev.installment_dates || []
        const newDates = []
        
        for (let i = 0; i < numInstallments; i++) {
          if (i < currentDates.length) {
            newDates.push(currentDates[i])
          } else {
            // Generate default dates based on frequency
            const firstDate = new Date(prev.first_installment_date)
            let dueDate = new Date(firstDate)
            
            if (prev.installment_frequency === 'weekly') {
              dueDate.setDate(dueDate.getDate() + i * 7)
            } else if (prev.installment_frequency === 'monthly') {
              dueDate.setMonth(dueDate.getMonth() + i)
            } else if (prev.installment_frequency === 'quarterly') {
              dueDate.setMonth(dueDate.getMonth() + i * 3)
            }
            
            newDates.push(dueDate.toISOString().split('T')[0])
          }
        }
        
        newForm.installment_dates = newDates
      }
      
      return newForm
    })
  }

  // Handle custom date change
  const handleCustomDateChange = (index: number, date: string) => {
    setPaymentPlanForm(prev => ({
      ...prev,
      installment_dates: prev.installment_dates.map((d, i) => i === index ? date : d)
    }))
  }

  // Create payment plan function
  const createPaymentPlan = async () => {
    if (!selectedMembershipForPaymentPlan) return

    setCreatingPaymentPlan(true)
    try {
      const totalAmount = selectedMembershipForPaymentPlan.original_amount || 0
      const downPayment = paymentPlanForm.down_payment || 0
      const remainingAmount = totalAmount - downPayment
      const installmentAmount = remainingAmount / paymentPlanForm.number_of_installments

      // Calculate last installment date
      let lastDate: Date
      if (paymentPlanForm.custom_dates && paymentPlanForm.installment_dates.length > 0) {
        // Use custom dates
        lastDate = new Date(paymentPlanForm.installment_dates[paymentPlanForm.installment_dates.length - 1])
      } else {
        // Use frequency-based calculation
        const firstDate = new Date(paymentPlanForm.first_installment_date)
        lastDate = new Date(firstDate)
        
        if (paymentPlanForm.installment_frequency === 'weekly') {
          lastDate.setDate(lastDate.getDate() + (paymentPlanForm.number_of_installments - 1) * 7)
        } else if (paymentPlanForm.installment_frequency === 'monthly') {
          lastDate.setMonth(lastDate.getMonth() + (paymentPlanForm.number_of_installments - 1))
        } else if (paymentPlanForm.installment_frequency === 'quarterly') {
          lastDate.setMonth(lastDate.getMonth() + (paymentPlanForm.number_of_installments - 1) * 3)
        }
      }

      const paymentPlanData = {
        gym_id: currentMember.gym_id,
        member_id: currentMember.id,
        total_amount: totalAmount,
        down_payment: downPayment,
        remaining_amount: remainingAmount,
        number_of_installments: paymentPlanForm.number_of_installments,
        installment_amount: installmentAmount,
        installment_frequency: paymentPlanForm.installment_frequency,
        first_installment_date: paymentPlanForm.first_installment_date,
        last_installment_date: lastDate.toISOString().split('T')[0],
        status: 'active'
      }

      console.log('Creating payment plan with data:', paymentPlanData)

      // Import supabase
      const { createClient } = await import('@/lib/supabase')
      const supabase = createClient()

      // Create payment plan
      const { data: paymentPlan, error: paymentPlanError } = await supabase
        .from('payment_plans')
        .insert(paymentPlanData)
        .select()
        .single()

      if (paymentPlanError) {
        console.error('Payment plan creation failed:', paymentPlanError)
        alert(`Payment plan creation failed: ${paymentPlanError.message}`)
        return
      }

      console.log('Payment plan created successfully:', paymentPlan)

      // Update membership with payment plan ID
      const { error: membershipError } = await supabase
        .from('memberships')
        .update({ payment_plan_id: paymentPlan.id })
        .eq('id', selectedMembershipForPaymentPlan.id)

      if (membershipError) {
        console.error('Failed to update membership with payment plan ID:', membershipError)
        alert('Payment plan created but failed to link to membership')
        return
      }

      console.log('Membership updated with payment plan ID')

      // Show success message
      alert(`Payment plan created successfully!\n\nPlan Details:\n- Total Amount: ₹${totalAmount}\n- Down Payment: ₹${downPayment}\n- Installments: ${paymentPlanForm.number_of_installments} × ₹${installmentAmount.toFixed(2)}\n- Frequency: ${paymentPlanForm.installment_frequency}`)

      // Close dialog and reset form
      setIsPaymentPlanCreationOpen(false)
      setPaymentPlanForm({
        down_payment: 0,
        number_of_installments: 1,
        installment_frequency: 'monthly',
        first_installment_date: new Date().toISOString().split('T')[0],
        custom_dates: false,
        installment_dates: []
      })

      // Refresh member data
      refreshMember()
      if (onMemberUpdated) {
        onMemberUpdated()
      }

    } catch (error) {
      console.error('Error creating payment plan:', error)
      alert(`Error creating payment plan: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setCreatingPaymentPlan(false)
    }
  }

  // Initialize custom dates when form opens
  React.useEffect(() => {
    if (isPaymentPlanCreationOpen && selectedMembershipForPaymentPlan) {
      // Initialize installment dates based on current form values
      const numInstallments = paymentPlanForm.number_of_installments
      const firstDate = new Date(paymentPlanForm.first_installment_date)
      const dates = []
      
      for (let i = 0; i < numInstallments; i++) {
        let dueDate = new Date(firstDate)
        
        if (paymentPlanForm.installment_frequency === 'weekly') {
          dueDate.setDate(dueDate.getDate() + i * 7)
        } else if (paymentPlanForm.installment_frequency === 'monthly') {
          dueDate.setMonth(dueDate.getMonth() + i)
        } else if (paymentPlanForm.installment_frequency === 'quarterly') {
          dueDate.setMonth(dueDate.getMonth() + i * 3)
        }
        
        dates.push(dueDate.toISOString().split('T')[0])
      }
      
      setPaymentPlanForm(prev => ({
        ...prev,
        installment_dates: dates
      }))
    }
  }, [isPaymentPlanCreationOpen, selectedMembershipForPaymentPlan])

  // Listen for open add membership event
  React.useEffect(() => {
    const handleOpenAddMembership = () => {
      console.log('Opening add membership dialog...')
      setIsAddMembershipOpen(true)
    }

    const handleOpenPaymentPlanCreation = (event: any) => {
      console.log('Opening payment plan creation dialog...', event.detail)
      setSelectedMembershipForPaymentPlan(event.detail.membership)
      setIsPaymentPlanCreationOpen(true)
    }

    window.addEventListener('openAddMembership', handleOpenAddMembership)
    window.addEventListener('openPaymentPlanCreation', handleOpenPaymentPlanCreation)
    
    return () => {
      window.removeEventListener('openAddMembership', handleOpenAddMembership)
      window.removeEventListener('openPaymentPlanCreation', handleOpenPaymentPlanCreation)
    }
  }, [])
  
  // Fetch fresh member data to ensure we have the latest membership amounts
  const { member: freshMember, refreshMember } = useMember(member.id)
  
  // Use fresh member data if available, otherwise fall back to props
  const currentMember = freshMember || member
  
  // Load payments and refunds for this member
  const { payments, loading: paymentsLoading } = usePayments({ 
    member_id: currentMember.id 
  })
  
  const { refunds, loading: refundsLoading, refreshRefunds } = useRefunds({ 
    member_id: currentMember.id 
  })

  // Load installment data
  useEffect(() => {
    const loadInstallmentData = async () => {
      if (!currentMember.id) return
      
      setLoadingInstallments(true)
      try {
        // Get payment summary
        const summary = await PaymentPlanService.getMemberPaymentSummary(currentMember.id)
        setInstallmentSummary(summary)
        
        // Get installments
        const installmentData = await PaymentPlanService.getMemberInstallments(currentMember.id)
        setInstallments(installmentData)
      } catch (error) {
        console.error('Error loading installment data:', error)
      } finally {
        setLoadingInstallments(false)
      }
    }

    loadInstallmentData()
  }, [currentMember.id])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Active</Badge>
      case 'trial':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Trial</Badge>
      case 'expired':
        return <Badge variant="destructive">Expired</Badge>
      case 'pending_payment':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Payment Due</Badge>
      case 'suspended':
        return <Badge variant="secondary">Suspended</Badge>
      case 'frozen':
        return <Badge className="bg-orange-100 text-orange-800 border-orange-200">Frozen</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }


  return (
    <div className="min-h-screen bg-gray-50 max-w-full overflow-x-hidden">
      {/* Header */}
      <div className="bg-white border-b px-4 lg:px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 lg:space-x-4">
            {onBack && (
              <Button variant="ghost" size="sm" onClick={onBack}>
                <ArrowLeft className="w-4 h-4 lg:mr-2" />
                <span className="hidden lg:inline">Back</span>
              </Button>
            )}
            <h1 className="text-lg lg:text-2xl font-bold text-gray-900">Member Profile</h1>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500 hidden sm:inline">Emperor Fitness</span>
            <Button variant="ghost" size="sm">
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row lg:h-[calc(100vh-80px)] overflow-hidden">
        {/* Left Sidebar - Member Info */}
        <div className="w-full lg:w-80 lg:flex-shrink-0 bg-white border-r-0 lg:border-r border-gray-200 p-4 lg:p-6 overflow-y-auto">
          {/* Profile Picture */}
          <div className="flex flex-col lg:flex-col items-center lg:items-center mb-6">
            <div className="flex flex-row lg:flex-col items-center lg:items-center space-x-4 lg:space-x-0 w-full">
              <div className="relative flex-shrink-0">
                <div className="w-16 h-16 lg:w-24 lg:h-24 bg-gray-200 rounded-full flex items-center justify-center mb-0 lg:mb-2">
                  {currentMember.profile?.profile_image_url ? (
                    <img 
                      src={currentMember.profile.profile_image_url} 
                      alt="Profile" 
                      className="w-16 h-16 lg:w-24 lg:h-24 rounded-full object-cover"
                    />
                  ) : (
                    <User className="w-8 h-8 lg:w-12 lg:h-12 text-gray-400" />
                  )}
                </div>
                <Button size="sm" className="absolute -bottom-1 -right-1 h-6 w-6 lg:h-8 lg:w-8 rounded-full p-0">
                  <Edit className="w-3 h-3 lg:w-4 lg:h-4" />
                </Button>
              </div>
              
              {/* Member Name and Contact */}
              <div className="text-left lg:text-center flex-1 lg:flex-none">
                <h2 className="text-base lg:text-lg font-semibold text-gray-900">
                  {currentMember.profile ? `${currentMember.profile.first_name} ${currentMember.profile.last_name}` : 'N/A'}
                </h2>
                <div className="flex items-center justify-start lg:justify-center space-x-2 mt-1">
                  <Phone className="w-3 h-3 lg:w-4 lg:h-4 text-gray-400" />
                  <span className="text-xs lg:text-sm text-gray-600">{currentMember.profile?.phone || 'N/A'}</span>
                  <MessageSquare className="w-3 h-3 lg:w-4 lg:h-4 text-green-500" />
                </div>
                <div className="mt-2 lg:hidden">
                  {getStatusBadge(currentMember.status)}
                </div>
              </div>
            </div>
          </div>

          {/* Member Details */}
          <div className="space-y-4">
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="text-xs lg:text-sm text-gray-500 mb-1">Member ID</div>
              <div className="font-medium text-sm lg:text-base">{currentMember.member_id}</div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-1 gap-3 lg:space-y-2 lg:block">
              <div className="flex items-center space-x-2">
                <Mail className="w-3 h-3 lg:w-4 lg:h-4 text-gray-400 flex-shrink-0" />
                <span className="text-xs lg:text-sm truncate">{currentMember.profile?.email || 'N/A'}</span>
              </div>
              
              <div className="flex items-center space-x-2">
                <User className="w-3 h-3 lg:w-4 lg:h-4 text-gray-400 flex-shrink-0" />
                <span className="text-xs lg:text-sm">{currentMember.profile?.gender || 'N/A'}</span>
              </div>
              
              <div className="flex items-center space-x-2">
                <Calendar className="w-3 h-3 lg:w-4 lg:h-4 text-gray-400 flex-shrink-0" />
                <span className="text-xs lg:text-sm">
                  {currentMember.profile?.date_of_birth ? 
                    formatDate(new Date(currentMember.profile.date_of_birth)) : 'N/A'
                  }
                </span>
              </div>
              
              <div className="flex items-center space-x-2">
                <Heart className="w-3 h-3 lg:w-4 lg:h-4 text-gray-400 flex-shrink-0" />
                <span className="text-xs lg:text-sm">{currentMember.profile?.blood_group || 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-6 lg:mt-8 space-y-2 lg:space-y-3">
            <div className="grid grid-cols-2 lg:grid-cols-1 gap-2 lg:gap-0 lg:space-y-3">
              <Button 
                className="w-full bg-orange-500 hover:bg-orange-600 text-white text-xs lg:text-sm"
                size="sm"
                onClick={() => {
                  console.log('Add Membership button clicked, opening dialog...')
                  setIsAddMembershipOpen(true)
                }}
              >
                <Plus className="w-3 h-3 lg:w-4 lg:h-4 lg:mr-2" />
                <span className="hidden lg:inline">Add New</span> Membership
              </Button>
              <Button 
                className="w-full bg-orange-500 hover:bg-orange-600 text-white text-xs lg:text-sm"
                size="sm"
                onClick={() => setIsAddPTOpen(true)}
              >
                <Plus className="w-3 h-3 lg:w-4 lg:h-4 lg:mr-2" />
                <span className="hidden lg:inline">Add New</span> PT
              </Button>
              <Button 
                className="w-full bg-orange-500 hover:bg-orange-600 text-white text-xs lg:text-sm"
                size="sm"
                onClick={() => setIsAddFollowUpOpen(true)}
              >
                <Plus className="w-3 h-3 lg:w-4 lg:h-4 lg:mr-2" />
                <span className="hidden lg:inline">Add</span> Follow Up
              </Button>
              <Button 
                className="w-full bg-green-500 hover:bg-green-600 text-white text-xs lg:text-sm"
                size="sm"
                onClick={() => setIsAddPaymentOpen(true)}
              >
                <DollarSign className="w-3 h-3 lg:w-4 lg:h-4 lg:mr-2" />
                <span className="hidden lg:inline">Add</span> Payment
              </Button>
            </div>
          </div>
        </div>

        {/* Right Panel - Tabs */}
        <div className="flex-1 lg:min-w-0 bg-white overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            <div className="relative border-b">
              <TabsList className="flex w-full overflow-x-auto scrollbar-hide space-x-1 p-1">
                <TabsTrigger value="membership" className="flex-shrink-0 whitespace-nowrap flex items-center space-x-1 lg:space-x-2 text-xs lg:text-sm">
                  <CreditCard className="w-3 h-3 lg:w-4 lg:h-4" />
                  <span>Membership</span>
                </TabsTrigger>
                <TabsTrigger value="pt" className="flex-shrink-0 whitespace-nowrap flex items-center space-x-1 lg:space-x-2 text-xs lg:text-sm">
                  <Target className="w-3 h-3 lg:w-4 lg:h-4" />
                  <span>PT</span>
                </TabsTrigger>
                <TabsTrigger value="payment" className="flex-shrink-0 whitespace-nowrap flex items-center space-x-1 lg:space-x-2 text-xs lg:text-sm">
                  <DollarSign className="w-3 h-3 lg:w-4 lg:h-4" />
                  <span>Payment Log</span>
                </TabsTrigger>
                <TabsTrigger value="refund" className="flex-shrink-0 whitespace-nowrap flex items-center space-x-1 lg:space-x-2 text-xs lg:text-sm">
                  <RotateCcw className="w-3 h-3 lg:w-4 lg:h-4" />
                  <span>Refunds</span>
                </TabsTrigger>
                <TabsTrigger value="followup" className="flex-shrink-0 whitespace-nowrap flex items-center space-x-1 lg:space-x-2 text-xs lg:text-sm">
                  <MessageSquare className="w-3 h-3 lg:w-4 lg:h-4" />
                  <span>FollowUp</span>
                </TabsTrigger>
                {/* <TabsTrigger value="terms" className="flex-shrink-0 whitespace-nowrap flex items-center space-x-1 lg:space-x-2 text-xs lg:text-sm">
                  <FileText className="w-3 h-3 lg:w-4 lg:h-4" />
                  <span className="hidden sm:inline">Member </span>T&C
                </TabsTrigger> */}
                {/* <TabsTrigger value="attendance" className="flex-shrink-0 whitespace-nowrap flex items-center space-x-1 lg:space-x-2 text-xs lg:text-sm">
                  <CalendarIcon className="w-3 h-3 lg:w-4 lg:h-4" />
                  <span>Attendance</span>
                </TabsTrigger> */}
              </TabsList>
              
              {/* Scroll indicators */}
              <div className="absolute left-0 top-0 bottom-0 w-4 bg-gradient-to-r from-background to-transparent pointer-events-none lg:hidden"></div>
              <div className="absolute right-0 top-0 bottom-0 w-4 bg-gradient-to-l from-background to-transparent pointer-events-none lg:hidden"></div>
            </div>

            <TabsContent value="membership" className="flex-1 p-4 lg:p-6 overflow-y-auto">
              <MembershipManagement 
                member={currentMember} 
                memberships={currentMember.memberships || []}
                onMembershipChanged={() => {
                  refreshMember()
                  if (onMemberUpdated) {
                    onMemberUpdated()
                  }
                }} 
              />
            </TabsContent>

            <TabsContent value="pt" className="flex-1 p-4 lg:p-6 overflow-y-auto">
              <PTManagement 
                member={currentMember} 
                onPTUpdated={() => {
                  refreshMember()
                  if (onMemberUpdated) {
                    onMemberUpdated()
                  }
                }} 
              />
            </TabsContent>

            <TabsContent value="payment" className="flex-1 p-4 lg:p-6 overflow-y-auto">
              <PaymentHistory 
                member={currentMember} 
                onPaymentUpdated={() => {
                  if (onMemberUpdated) {
                    onMemberUpdated()
                  }
                }} 
              />
            </TabsContent>

            <TabsContent value="refund" className="flex-1 p-4 lg:p-6 overflow-y-auto">
              <RefundManagement 
                member={currentMember} 
                onRefundUpdated={() => {
                  refreshMember()
                  if (onMemberUpdated) {
                    onMemberUpdated()
                  }
                }} 
              />
            </TabsContent>

            <TabsContent value="followup" className="flex-1 p-4 lg:p-6 overflow-y-auto">
              <FollowUpManagement 
                member={currentMember} 
                onFollowUpUpdated={() => {
                  if (onMemberUpdated) {
                    onMemberUpdated()
                  }
                }} 
              />
            </TabsContent>

            <TabsContent value="terms" className="flex-1 p-4 lg:p-6 overflow-y-auto">
              <MemberTermsConditions 
                member={currentMember} 
                onTermsUpdated={() => {
                  if (onMemberUpdated) {
                    onMemberUpdated()
                  }
                }} 
              />
            </TabsContent>

            <TabsContent value="attendance" className="flex-1 p-4 lg:p-6 overflow-y-auto">
              <AttendanceHistory 
                member={currentMember} 
                onAttendanceUpdated={() => {
                  if (onMemberUpdated) {
                    onMemberUpdated()
                  }
                }} 
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Add Membership Dialog */}
      {isAddMembershipOpen && (
        <AddMemberDialog
          open={isAddMembershipOpen}
          onOpenChange={setIsAddMembershipOpen}
          onMemberAdded={() => {
            console.log('Member added, refreshing...')
            refreshMember()
            if (onMemberUpdated) {
              onMemberUpdated()
            }
            // Force refresh of membership details
            setTimeout(() => {
              // Trigger a custom event to refresh membership details
              window.dispatchEvent(new CustomEvent('membershipAdded'))
              // Show success message
              alert('New membership added successfully! It will appear in the membership list.')
            }, 500)
          }}
          existingMember={currentMember}
        />
      )}

      {/* Payment Plan Creation Dialog */}
      <Dialog open={isPaymentPlanCreationOpen} onOpenChange={setIsPaymentPlanCreationOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Payment Plan</DialogTitle>
            <DialogDescription>
              Create a payment plan for this existing membership
            </DialogDescription>
          </DialogHeader>
          <div className="p-4">
            {selectedMembershipForPaymentPlan && (
              <div className="space-y-6">
                {/* Membership Info */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-medium mb-2">Membership Details</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Package:</span>
                      <span className="ml-2 font-medium">{selectedMembershipForPaymentPlan.package?.name || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Total Amount:</span>
                      <span className="ml-2 font-medium">₹{selectedMembershipForPaymentPlan.original_amount || 0}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Paid Amount:</span>
                      <span className="ml-2 font-medium">₹{selectedMembershipForPaymentPlan.amount_paid || 0}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Remaining:</span>
                      <span className="ml-2 font-medium text-red-600">
                        ₹{(selectedMembershipForPaymentPlan.original_amount || 0) - (selectedMembershipForPaymentPlan.amount_paid || 0)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Payment Plan Form */}
                <div className="space-y-4">
                  <h3 className="font-medium">Payment Plan Configuration</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Down Payment (₹)</label>
                      <input
                        type="number"
                        className="w-full p-2 border border-gray-300 rounded-md"
                        placeholder="Enter down payment amount"
                        value={paymentPlanForm.down_payment}
                        onChange={(e) => handlePaymentPlanInputChange('down_payment', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Number of Installments</label>
                      <input
                        type="number"
                        min="1"
                        max="24"
                        className="w-full p-2 border border-gray-300 rounded-md"
                        placeholder="Enter number of installments"
                        value={paymentPlanForm.number_of_installments}
                        onChange={(e) => handlePaymentPlanInputChange('number_of_installments', parseInt(e.target.value) || 1)}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Installment Frequency</label>
                      <select 
                        className="w-full p-2 border border-gray-300 rounded-md"
                        value={paymentPlanForm.installment_frequency}
                        onChange={(e) => handlePaymentPlanInputChange('installment_frequency', e.target.value)}
                      >
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                        <option value="quarterly">Quarterly</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">First Installment Date</label>
                      <input
                        type="date"
                        className="w-full p-2 border border-gray-300 rounded-md"
                        value={paymentPlanForm.first_installment_date}
                        onChange={(e) => handlePaymentPlanInputChange('first_installment_date', e.target.value)}
                        disabled={paymentPlanForm.custom_dates}
                      />
                    </div>
                  </div>

                  {/* Custom Dates Option */}
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="custom_dates"
                        checked={paymentPlanForm.custom_dates}
                        onChange={(e) => handlePaymentPlanInputChange('custom_dates', e.target.checked)}
                        className="rounded"
                      />
                      <label htmlFor="custom_dates" className="text-sm font-medium">
                        Set custom installment dates
                      </label>
                    </div>

                    {paymentPlanForm.custom_dates && (
                      <div className="space-y-2">
                        <label className="block text-sm font-medium">Installment Dates</label>
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                          {Array.from({ length: paymentPlanForm.number_of_installments }, (_, index) => (
                            <div key={index} className="flex items-center space-x-2">
                              <span className="text-sm text-gray-600 w-20">
                                Installment {index + 1}:
                              </span>
                              <input
                                type="date"
                                className="flex-1 p-2 border border-gray-300 rounded-md text-sm"
                                value={paymentPlanForm.installment_dates[index] || ''}
                                onChange={(e) => handleCustomDateChange(index, e.target.value)}
                                min={paymentPlanForm.first_installment_date}
                              />
                            </div>
                          ))}
                        </div>
                        <p className="text-xs text-gray-500">
                          Set specific dates for each installment. Dates should be in chronological order.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Payment Plan Summary */}
                  {paymentPlanForm.number_of_installments > 1 && (
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h4 className="font-medium mb-2">Payment Plan Summary</h4>
                      {(() => {
                        const totalAmount = selectedMembershipForPaymentPlan.original_amount || 0
                        const downPayment = paymentPlanForm.down_payment || 0
                        const remainingAmount = totalAmount - downPayment
                        const installmentAmount = remainingAmount / paymentPlanForm.number_of_installments
                        
                        return (
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                              <span>Total Amount:</span>
                              <span className="font-medium">₹{totalAmount.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Down Payment:</span>
                              <span className="font-medium">₹{downPayment.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Remaining Amount:</span>
                              <span className="font-medium">₹{remainingAmount.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between font-medium">
                              <span>Per Installment:</span>
                              <span>₹{installmentAmount.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-xs text-gray-600">
                              <span>Frequency:</span>
                              <span>{paymentPlanForm.custom_dates ? 'Custom Dates' : paymentPlanForm.installment_frequency}</span>
                            </div>
                            {paymentPlanForm.custom_dates && paymentPlanForm.installment_dates.length > 0 && (
                              <div className="mt-2">
                                <div className="text-xs text-gray-600 mb-1">Installment Schedule:</div>
                                <div className="space-y-1">
                                  {paymentPlanForm.installment_dates.map((date, index) => (
                                    <div key={index} className="flex justify-between text-xs">
                                      <span>Installment {index + 1}:</span>
                                      <span>{date ? new Date(date).toLocaleDateString() : 'Not set'}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })()}
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end space-x-2">
                  <Button 
                    variant="outline" 
                    onClick={() => setIsPaymentPlanCreationOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    className="bg-blue-500 hover:bg-blue-600"
                    onClick={createPaymentPlan}
                    disabled={creatingPaymentPlan}
                  >
                    {creatingPaymentPlan ? 'Creating...' : 'Create Payment Plan'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Add PT Dialog - We'll create this */}
      <Dialog open={isAddPTOpen} onOpenChange={setIsAddPTOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add New PT Session</DialogTitle>
            <DialogDescription>
              Schedule a new personal training session for this member
            </DialogDescription>
          </DialogHeader>
          <div className="p-4">
            <p className="text-center text-gray-500">
              PT session management is handled in the PT tab. 
              Please use the "Add New PT" button in the PT tab to schedule sessions.
            </p>
            <div className="flex justify-end mt-4">
              <Button onClick={() => {
                setIsAddPTOpen(false)
                setActiveTab('pt')
              }}>
                Go to PT Tab
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Follow Up Dialog - We'll create this */}
      <Dialog open={isAddFollowUpOpen} onOpenChange={setIsAddFollowUpOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add New Follow Up</DialogTitle>
            <DialogDescription>
              Schedule a new follow-up interaction for this member
            </DialogDescription>
          </DialogHeader>
          <div className="p-4">
            <p className="text-center text-gray-500">
              Follow-up management is handled in the FollowUp tab. 
              Please use the "Add New Follow Up" button in the FollowUp tab to schedule interactions.
            </p>
            <div className="flex justify-end mt-4">
              <Button onClick={() => {
                setIsAddFollowUpOpen(false)
                setActiveTab('followup')
              }}>
                Go to FollowUp Tab
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Payment Dialog */}
      <AddPaymentDialog 
        open={isAddPaymentOpen}
        onOpenChange={setIsAddPaymentOpen}
        member={currentMember}
        onPaymentAdded={() => {
          refreshMember()
          if (onMemberUpdated) {
            onMemberUpdated()
          }
        }}
      />
    </div>
  )
}
