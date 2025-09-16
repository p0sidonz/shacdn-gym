import React, { useState } from 'react'
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  User, 
  CreditCard, 
  Calendar, 
  Target, 
  Phone, 
  Mail, 
  MapPin,
  Heart,
  Activity,
  Clock,
  AlertCircle,
  CheckCircle2,
  Edit,
  RotateCcw
} from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { MemberWithDetails } from '@/types'
import { usePayments } from '@/hooks/usePayments'
import { useRefunds } from '@/hooks/useRefunds'
import { useMember } from '@/hooks/useMembers'
import { PaymentPlanService } from '@/services/paymentPlanService'
import { MembershipActions } from './MembershipActions'
import { AddPaymentDialog } from './AddPaymentDialog'
import { AddRefundDialog } from './AddRefundDialog'
import { EditMemberDialog } from './EditMemberDialog'

interface MemberDetailsDialogProps {
  member: MemberWithDetails
  children: React.ReactNode
  onMemberUpdated?: () => void
}

export const MemberDetailsDialog: React.FC<MemberDetailsDialogProps> = ({ member, children, onMemberUpdated }) => {
  const [open, setOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  const [installmentSummary, setInstallmentSummary] = useState<any>(null)
  const [installments, setInstallments] = useState<any[]>([])
  const [loadingInstallments, setLoadingInstallments] = useState(false)
  
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
  React.useEffect(() => {
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

    if (open) {
      loadInstallmentData()
    }
  }, [currentMember.id, open])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default" className="bg-green-100 text-green-800">Active</Badge>
      case 'trial':
        return <Badge variant="default" className="bg-blue-100 text-blue-800">Trial</Badge>
      case 'expired':
        return <Badge variant="destructive">Expired</Badge>
      case 'pending_payment':
        return <Badge variant="default" className="bg-yellow-100 text-yellow-800">Payment Due</Badge>
      case 'suspended':
        return <Badge variant="secondary">Suspended</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const getAttendanceColor = (percentage: number) => {
    if (percentage >= 80) return 'text-green-600'
    if (percentage >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getAttendanceDot = (percentage: number) => {
    if (percentage >= 80) return 'bg-green-500'
    if (percentage >= 60) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        {children}
      </DrawerTrigger>
      <DrawerContent className="max-h-[95vh]">
        <DrawerHeader className="border-b">
          <DrawerTitle className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
              <User className="w-6 h-6 text-gray-600" />
            </div>
            <div>
              <div className="text-xl font-semibold">
                {currentMember.profile ? `${currentMember.profile.first_name} ${currentMember.profile.last_name}` : 'N/A'}
              </div>
              <div className="text-sm text-gray-500">{currentMember.member_id}</div>
            </div>
            <div className="ml-auto">
              {getStatusBadge(currentMember.status)}
            </div>
          </DrawerTitle>
          <DrawerDescription>
            Member since {formatDate(new Date(currentMember.joining_date))}
          </DrawerDescription>
        </DrawerHeader>
        
        <div className="overflow-y-auto flex-1">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-6 sticky top-0 bg-white z-10">
            <TabsTrigger value="overview">
              <User className="w-4 h-4 mr-2" />
              Overview
            </TabsTrigger>
              <TabsTrigger value="installments">
                <Clock className="w-4 h-4 mr-2" />
                Payments & Installments
              </TabsTrigger>
            <TabsTrigger value="membership">
              <CreditCard className="w-4 h-4 mr-2" />
              Membership
            </TabsTrigger>
            <TabsTrigger value="refunds">
              <RotateCcw className="w-4 h-4 mr-2" />
              Refunds
            </TabsTrigger>
            <TabsTrigger value="fitness">
              <Target className="w-4 h-4 mr-2" />
              Fitness
            </TabsTrigger>
            <TabsTrigger value="attendance">
              <Calendar className="w-4 h-4 mr-2" />
              Attendance
            </TabsTrigger>
          </TabsList>

            <TabsContent value="overview" className="space-y-4 p-6">
            <div className="flex justify-end">
              <EditMemberDialog 
                member={currentMember} 
                onMemberUpdated={() => {
                  // Refresh member data when updated
                  refreshMember()
                  if (onMemberUpdated) {
                    onMemberUpdated()
                  }
                }} 
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <User className="w-5 h-5 mr-2" />
                    Personal Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <span className="text-sm">{currentMember.profile?.phone || 'N/A'}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <span className="text-sm">{currentMember.profile?.email || 'N/A'}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <span className="text-sm">{currentMember.profile?.address || 'N/A'}</span>
                  </div>
                  {currentMember.profile?.date_of_birth && (
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span className="text-sm">
                        Born {formatDate(new Date(currentMember.profile.date_of_birth))}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Heart className="w-5 h-5 mr-2" />
                    Emergency Contact
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-sm">
                    <strong>{member.profile?.emergency_contact_name || 'N/A'}</strong>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <span className="text-sm">{member.profile?.emergency_contact_phone || 'N/A'}</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Activity className="w-5 h-5 mr-2" />
                  Quick Stats
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">
                      {currentMember.attendance_stats?.total_visits || 0}
                    </div>
                    <div className="text-sm text-gray-500">Total Visits</div>
                  </div>
                  <div className="text-center">
                    <div className={`text-2xl font-bold ${getAttendanceColor(currentMember.attendance_stats?.attendance_percentage || 0)}`}>
                      {currentMember.attendance_stats?.attendance_percentage || 0}%
                    </div>
                    <div className="text-sm text-gray-500">Attendance</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {formatCurrency(currentMember.payment_stats?.total_paid || 0)}
                    </div>
                    <div className="text-sm text-gray-500">Total Paid</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">
                      {formatCurrency(currentMember.payment_stats?.total_pending || 0)}
                    </div>
                    <div className="text-sm text-gray-500">Pending</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

            <TabsContent value="membership" className="space-y-4 p-6">
            <Card>
              <CardHeader>
                <CardTitle>Current Membership</CardTitle>
                <CardDescription>Active membership details</CardDescription>
              </CardHeader>
              <CardContent>
                {currentMember.current_membership ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm text-gray-500">Package</div>
                        <div className="font-medium">{currentMember.membership_package?.name || 'N/A'}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500">Status</div>
                        <div>{getStatusBadge(currentMember.current_membership.status)}</div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm text-gray-500">Start Date</div>
                        <div className="font-medium">
                          {formatDate(new Date(currentMember.current_membership.start_date))}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500">End Date</div>
                        <div className="font-medium">
                          {formatDate(new Date(currentMember.current_membership.end_date))}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm text-gray-500">Total Amount</div>
                        <div className="font-medium">
                          {formatCurrency(currentMember.current_membership.total_amount_due)}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500">Amount Paid</div>
                        <div className="font-medium text-green-600">
                          {formatCurrency(currentMember.current_membership.amount_paid)}
                        </div>
                      </div>
                    </div>

                    {/* Installment Summary */}
                    {installmentSummary && installmentSummary.totalAmount > 0 && (
                      <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                        <h4 className="font-medium text-blue-900 mb-3">Installment Plan</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <div className="text-blue-700 font-medium">Total Amount</div>
                            <div className="text-blue-900">{formatCurrency(installmentSummary.totalAmount)}</div>
                          </div>
                          <div>
                            <div className="text-blue-700 font-medium">Paid Amount</div>
                            <div className="text-blue-900">{formatCurrency(installmentSummary.paidAmount)}</div>
                          </div>
                          <div>
                            <div className="text-blue-700 font-medium">Remaining</div>
                            <div className="text-blue-900">{formatCurrency(installmentSummary.remainingAmount)}</div>
                          </div>
                          <div>
                            <div className="text-blue-700 font-medium">Next Due</div>
                            <div className="text-blue-900">
                              {installmentSummary.nextDueDate ? 
                                formatDate(new Date(installmentSummary.nextDueDate)) : 
                                'No pending installments'
                              }
                            </div>
                          </div>
                        </div>
                        {installmentSummary.nextDueAmount && (
                          <div className="mt-2 text-sm">
                            <span className="text-blue-700">Next Installment: </span>
                            <span className="font-medium text-blue-900">{formatCurrency(installmentSummary.nextDueAmount)}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {currentMember.current_membership.amount_pending > 0 && (
                      <div className="bg-red-50 p-3 rounded-lg">
                        <div className="flex items-center space-x-2">
                          <AlertCircle className="w-4 h-4 text-red-600" />
                          <span className="text-sm text-red-600">
                            {formatCurrency(currentMember.current_membership.amount_pending)} pending payment
                          </span>
                        </div>
                      </div>
                    )}

                    {currentMember.current_membership.is_trial && (
                      <div className="bg-blue-50 p-3 rounded-lg">
                        <div className="flex items-center space-x-2">
                          <Clock className="w-4 h-4 text-blue-600" />
                          <span className="text-sm text-blue-600">
                            Trial membership - {currentMember.current_membership.trial_converted_date ? 'Converted' : 'Active'}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No active membership
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Membership Actions */}
            {currentMember.current_membership && (
              <Card>
                <CardHeader>
                  <CardTitle>Membership Actions</CardTitle>
                  <CardDescription>Manage this membership</CardDescription>
                </CardHeader>
                <CardContent>
                  <MembershipActions 
                    member={currentMember} 
                    onMembershipUpdated={() => {
                      // Refresh member data when membership is updated
                      refreshMember()
                      if (onMemberUpdated) {
                        onMemberUpdated()
                      }
                    }} 
                  />
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Assigned Staff</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-gray-500">Trainer</div>
                    <div className="font-medium">
                      {currentMember.assigned_trainer ? (
                        currentMember.assigned_trainer.profile ? 
                          `${currentMember.assigned_trainer.profile.first_name} ${currentMember.assigned_trainer.profile.last_name}` : 
                          currentMember.assigned_trainer.employee_id
                      ) : (
                        <span className="text-gray-400">Not assigned</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Nutritionist</div>
                    <div className="font-medium">
                      {currentMember.assigned_nutritionist ? (
                        currentMember.assigned_nutritionist.profile ? 
                          `${currentMember.assigned_nutritionist.profile.first_name} ${currentMember.assigned_nutritionist.profile.last_name}` : 
                          currentMember.assigned_nutritionist.employee_id
                      ) : (
                        <span className="text-gray-400">Not assigned</span>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

            <TabsContent value="installments" className="space-y-4 p-6">
            <Card>
              <CardHeader>
                <CardTitle>Installment Plan</CardTitle>
                <CardDescription>Payment schedule and installment details</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingInstallments ? (
                  <div className="text-center py-4 text-gray-500">Loading installments...</div>
                ) : installmentSummary ? (
                  <div className="space-y-6">
                    {/* Summary */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center p-4 bg-gray-50 rounded-lg">
                        <div className="text-2xl font-bold text-gray-900">
                          {formatCurrency(installmentSummary.totalAmount)}
                        </div>
                        <div className="text-sm text-gray-500">Total Amount</div>
                      </div>
                      <div className="text-center p-4 bg-green-50 rounded-lg">
                        <div className="text-2xl font-bold text-green-600">
                          {formatCurrency(installmentSummary.paidAmount)}
                        </div>
                        <div className="text-sm text-gray-500">Paid Amount</div>
                      </div>
                      <div className="text-center p-4 bg-blue-50 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">
                          {formatCurrency(installmentSummary.remainingAmount)}
                        </div>
                        <div className="text-sm text-gray-500">Remaining</div>
                      </div>
                      <div className="text-center p-4 bg-orange-50 rounded-lg">
                        <div className="text-2xl font-bold text-orange-600">
                          {installmentSummary.pendingInstallments}
                        </div>
                        <div className="text-sm text-gray-500">Pending</div>
                      </div>
                    </div>

                    {/* Next Due */}
                    {installmentSummary.nextDueDate && (
                      <div className="p-4 bg-yellow-50 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium text-yellow-800">Next Due Date</div>
                            <div className="text-yellow-600">
                              {formatDate(new Date(installmentSummary.nextDueDate))}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-medium text-yellow-800">Amount Due</div>
                            <div className="text-yellow-600">
                              {formatCurrency(installmentSummary.nextDueAmount || 0)}
                            </div>
                          </div>
                        </div>
                        <div className="mt-3">
                          <AddPaymentDialog 
                            member={currentMember} 
                            onPaymentAdded={async () => {
                              // Refresh installment data
                              try {
                                const summary = await PaymentPlanService.getMemberPaymentSummary(currentMember.id)
                                setInstallmentSummary(summary)
                                
                                const installmentData = await PaymentPlanService.getMemberInstallments(currentMember.id)
                                setInstallments(installmentData)
                                
                                // Also refresh member data
                                refreshMember()
                                if (onMemberUpdated) {
                                  onMemberUpdated()
                                }
                              } catch (error) {
                                console.error('Error refreshing installment data:', error)
                              }
                            }} 
                          />
                        </div>
                      </div>
                    )}

                    {/* Installment List */}
                    <div>
                      <h4 className="font-medium mb-3">Installment Schedule</h4>
                      <div className="space-y-2">
                        {installments.map((installment) => {
                          const isOverdue = new Date(installment.due_date) < new Date() && installment.status === 'pending'
                          const isPaid = installment.status === 'paid'
                          
                          return (
                            <div key={installment.id} className={`flex items-center justify-between p-3 rounded-lg ${
                              isPaid ? 'bg-green-50' : isOverdue ? 'bg-red-50' : 'bg-gray-50'
                            }`}>
                              <div className="flex items-center space-x-3">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                                  isPaid ? 'bg-green-500 text-white' : 
                                  isOverdue ? 'bg-red-500 text-white' : 
                                  'bg-gray-300 text-gray-700'
                                }`}>
                                  {installment.installment_number}
                                </div>
                                <div>
                                  <div className="font-medium">
                                    Installment {installment.installment_number}
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    Due: {formatDate(new Date(installment.due_date))}
                                    {installment.paid_date && (
                                      <span className="ml-2 text-green-600">
                                        • Paid: {formatDate(new Date(installment.paid_date))}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="font-medium">
                                  {formatCurrency(installment.amount)}
                                </div>
                                <div className={`text-sm ${
                                  isPaid ? 'text-green-600' : 
                                  isOverdue ? 'text-red-600' : 
                                  'text-gray-500'
                                }`}>
                                  {isPaid ? 'Paid' : isOverdue ? 'Overdue' : 'Pending'}
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>

                      <div className="flex justify-center">
                        <AddPaymentDialog 
                          member={currentMember} 
                          onPaymentAdded={async () => {
                            // Refresh installment data
                            try {
                              const summary = await PaymentPlanService.getMemberPaymentSummary(currentMember.id)
                              setInstallmentSummary(summary)
                              
                              const installmentData = await PaymentPlanService.getMemberInstallments(currentMember.id)
                              setInstallments(installmentData)
                              
                              // Also refresh member data
                              refreshMember()
                              if (onMemberUpdated) {
                                onMemberUpdated()
                              }
                            } catch (error) {
                              console.error('Error refreshing installment data:', error)
                            }
                          }} 
                        />
                     
                    </div>

                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <div className="mb-4">No installment plan found</div>
                    <div className="text-sm text-gray-400 mb-4">
                      You can still add payments manually
                    </div>
                    <div className="flex justify-center">
                      <div className="bg-blue-100 p-4 rounded-lg">
                        <AddPaymentDialog 
                          member={currentMember} 
                          onPaymentAdded={async () => {
                            // Refresh installment data
                            try {
                              const summary = await PaymentPlanService.getMemberPaymentSummary(currentMember.id)
                              setInstallmentSummary(summary)
                              
                              const installmentData = await PaymentPlanService.getMemberInstallments(currentMember.id)
                              setInstallments(installmentData)
                              
                              // Also refresh member data
                              refreshMember()
                              if (onMemberUpdated) {
                                onMemberUpdated()
                              }
                            } catch (error) {
                              console.error('Error refreshing installment data:', error)
                            }
                          }} 
                        />
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Payment History */}
            <Card>
              <CardHeader>
                <CardTitle>Payment History</CardTitle>
                <CardDescription>All payments made for this member</CardDescription>
              </CardHeader>
              <CardContent>
                {paymentsLoading ? (
                  <div className="text-center py-4 text-gray-500">Loading payments...</div>
                ) : payments.length > 0 ? (
                  <div className="space-y-3">
                    {payments.map((payment) => {
                      console.log('Rendering payment:', payment)
                      return (
                      <div key={payment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <div className="font-medium">{payment.description || 'Membership Payment'}</div>
                          <div className="text-sm text-gray-500">
                            {formatDate(new Date(payment.payment_date))} • {payment.payment_type}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium text-green-600">
                            {formatCurrency(payment.amount)}
                          </div>
                          <div className="text-sm text-gray-500">
                            {payment.payment_method}
                          </div>
                        </div>
                      </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No payments found
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

            <TabsContent value="fitness" className="space-y-4 p-6">
            <Card>
              <CardHeader>
                <CardTitle>Fitness Goals</CardTitle>
              </CardHeader>
              <CardContent>
                {currentMember.fitness_goals && currentMember.fitness_goals.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {currentMember.fitness_goals.map((goal, index) => (
                      <Badge key={index} variant="outline">{goal}</Badge>
                    ))}
                  </div>
                ) : (
                  <div className="text-gray-500">No fitness goals set</div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Workout Preferences</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <div className="text-sm text-gray-500">Preferred Time</div>
                    <div className="font-medium">{currentMember.preferred_workout_time || 'Not specified'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Training Level</div>
                    <div className="font-medium">{currentMember.training_level || 'Not specified'}</div>
                  </div>
                  {currentMember.workout_preferences && currentMember.workout_preferences.length > 0 && (
                    <div>
                      <div className="text-sm text-gray-500">Preferences</div>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {currentMember.workout_preferences.map((pref, index) => (
                          <Badge key={index} variant="secondary">{pref}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

            <TabsContent value="attendance" className="space-y-4 p-6">
            <Card>
              <CardHeader>
                <CardTitle>Attendance Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">
                      {currentMember.attendance_stats?.total_visits || 0}
                    </div>
                    <div className="text-sm text-gray-500">Total Visits</div>
                  </div>
                  <div className="text-center">
                    <div className={`text-2xl font-bold ${getAttendanceColor(currentMember.attendance_stats?.attendance_percentage || 0)}`}>
                      {currentMember.attendance_stats?.attendance_percentage || 0}%
                    </div>
                    <div className="text-sm text-gray-500">Attendance Rate</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">
                      {currentMember.attendance_stats?.last_visit ? 
                        formatDate(new Date(currentMember.attendance_stats.last_visit)) : 
                        'Never'
                      }
                    </div>
                    <div className="text-sm text-gray-500">Last Visit</div>
                  </div>
                  <div className="text-center">
                    <div className={`w-8 h-8 mx-auto rounded-full flex items-center justify-center ${getAttendanceDot(currentMember.attendance_stats?.attendance_percentage || 0)}`}>
                      <CheckCircle2 className="w-4 h-4 text-white" />
                    </div>
                    <div className="text-sm text-gray-500">Status</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>


            <TabsContent value="refunds" className="space-y-4 p-6">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Refund Requests</CardTitle>
                    <CardDescription>Manage refund requests for this member</CardDescription>
                  </div>
                  <AddRefundDialog 
                    member={currentMember} 
                    onRefundAdded={() => {
                      // Refresh refunds when new refund is added
                      refreshRefunds()
                      // Also refresh member data to update membership amounts
                      refreshMember()
                      if (onMemberUpdated) {
                        onMemberUpdated()
                      }
                    }} 
                  />
                </div>
              </CardHeader>
              <CardContent>
                {refundsLoading ? (
                  <div className="text-center py-4 text-gray-500">Loading refund requests...</div>
                ) : refunds.length > 0 ? (
                  <div className="space-y-3">
                    {refunds.map((refund) => (
                      <div key={refund.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <div className="font-medium">
                            {refund.refund_type.replace('_', ' ').toUpperCase()}
                          </div>
                          <div className="text-sm text-gray-500">
                            {formatDate(new Date(refund.request_date))} • {refund.status}
                          </div>
                          <div className="text-sm text-gray-600 mt-1">
                            {refund.reason}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium text-red-600">
                            {formatCurrency(refund.requested_amount)}
                          </div>
                          <div className="text-sm text-gray-500">
                            {refund.status === 'processed' ? 
                              `Refunded: ${formatCurrency(refund.final_refund_amount || 0)}` : 
                              `Eligible: ${formatCurrency(refund.eligible_amount)}`
                            }
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No refund requests found
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        </div>

        <div className="flex justify-end space-x-2 p-6 border-t bg-gray-50">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Close
          </Button>
          <Button>
            <Edit className="w-4 h-4 mr-2" />
            Edit Member
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  )
}
