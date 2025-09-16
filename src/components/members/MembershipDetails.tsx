import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { 
  Receipt, 
  RefreshCw, 
  ArrowUp, 
  RotateCcw, 
  Pause, 
  Trash2, 
  CreditCard, 
  Edit,
  Activity,
  DollarSign,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Clock,
  Plus,
  Minus
} from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { MemberWithDetails } from '@/types'
import { useMemberships } from '@/hooks/useMemberships'
import { usePayments } from '@/hooks/usePayments'

interface MembershipDetailsProps {
  member: MemberWithDetails
  onMembershipUpdated?: () => void
}

export const MembershipDetails: React.FC<MembershipDetailsProps> = ({ 
  member, 
  onMembershipUpdated 
}) => {
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false)
  const [isRenewalOpen, setIsRenewalOpen] = useState(false)
  const [isUpgradeOpen, setIsUpgradeOpen] = useState(false)
  const [isTransferOpen, setIsTransferOpen] = useState(false)
  const [isSuspendOpen, setIsSuspendOpen] = useState(false)
  const [isPauseOpen, setIsPauseOpen] = useState(false)
  const [isRemoveOpen, setIsRemoveOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [selectedMembershipId, setSelectedMembershipId] = useState<string | null>(null)
  const [isPaymentPlanOpen, setIsPaymentPlanOpen] = useState(false)
  const [selectedMembershipForPayment, setSelectedMembershipForPayment] = useState<any>(null)

  // Fetch all memberships for this member
  const { memberships, loading: membershipsLoading, refreshMemberships } = useMemberships({ 
    member_id: member.id 
  })

  // Fetch payments for this member
  const { payments, loading: paymentsLoading } = usePayments({ 
    member_id: member.id 
  })

  // Listen for membership added event
  React.useEffect(() => {
    const handleMembershipAdded = () => {
      console.log('Membership added event received, refreshing...')
      refreshMemberships()
    }

    window.addEventListener('membershipAdded', handleMembershipAdded)
    return () => window.removeEventListener('membershipAdded', handleMembershipAdded)
  }, [refreshMemberships])

  // Filter payments for selected membership
  const membershipPayments = selectedMembershipForPayment 
    ? payments.filter(payment => payment.membership_id === selectedMembershipForPayment.id)
    : []

  const currentMembership = member.current_membership
  const membershipPackage = member.membership_package
  
  // Get selected membership or current membership
  const selectedMembership = selectedMembershipId 
    ? memberships.find(m => m.id === selectedMembershipId)
    : currentMembership

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

  const getDaysLeft = (membership: any) => {
    if (!membership) return 0
    const endDate = new Date(membership.end_date)
    const today = new Date()
    const diffTime = endDate.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const daysLeft = getDaysLeft(selectedMembership)

  if (membershipsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading memberships...</p>
        </div>
      </div>
    )
  }

  if (!selectedMembership) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <CreditCard className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No Membership Found</h3>
          <p className="text-gray-500">This member doesn't have any memberships yet</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* All Memberships List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Activity className="w-5 h-5" />
              <span>All Memberships ({memberships.length})</span>
            </div>
            <Button 
              size="sm" 
              className="bg-orange-500 hover:bg-orange-600"
              onClick={() => {
                // Trigger the add membership dialog from parent
                window.dispatchEvent(new CustomEvent('openAddMembership'))
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add New Membership
            </Button>
          </div>
          <CardDescription>
            Select a membership to view details
          </CardDescription>
        </CardHeader>
        <CardContent>
          {memberships.length === 0 ? (
            <div className="text-center py-8">
              <CreditCard className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No Memberships Yet</h3>
              <p className="text-gray-500 mb-4">This member doesn't have any memberships yet</p>
              <Button 
                className="bg-orange-500 hover:bg-orange-600"
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('openAddMembership'))
                }}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add First Membership
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {memberships.map((membership) => (
                <div
                  key={membership.id}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedMembershipId === membership.id || 
                    (!selectedMembershipId && membership.id === currentMembership?.id)
                      ? 'border-orange-500 bg-orange-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedMembershipId(membership.id)}
                >
                  <div className="flex items-center justify-between">
                    {/* {JSON.stringify(membership)} */}
                    <div>
                      <div className="font-medium">
                        {membership.membership_packages?.name || 'Unknown Package'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {formatDate(new Date(membership.start_date))} - {formatDate(new Date(membership.end_date))}
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge 
                        className={
                          membership.status === 'active' 
                            ? 'bg-green-100 text-green-800 border-green-200'
                            : membership.status === 'expired'
                            ? 'bg-red-100 text-red-800 border-red-200'
                            : 'bg-yellow-100 text-yellow-800 border-yellow-200'
                        }
                      >
                        {membership.status}
                      </Badge>
                      {membership.id === currentMembership?.id && (
                        <div className="text-xs text-orange-600 mt-1">Current</div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Selected Membership Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <CreditCard className="w-5 h-5" />
            <span>
              {selectedMembershipId ? 'Selected Membership Details' : 'Current Membership Details'}
            </span>
          </CardTitle>
          <CardDescription>
            {selectedMembershipId ? 'Details for selected membership' : 'Current membership information and status'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Package Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Package Information</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Package Name:</span>
                    <span className="font-medium">{selectedMembership.package?.name || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Duration:</span>
                    <span className="font-medium">{selectedMembership.package?.duration_days || 0} days</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Status:</span>
                    {getStatusBadge(selectedMembership.status)}
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Period</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Start Date:</span>
                    <span className="font-medium">{formatDate(new Date(selectedMembership.start_date))}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">End Date:</span>
                    <span className="font-medium">{formatDate(new Date(selectedMembership.end_date))}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Days Left:</span>
                    <span className={`font-medium ${daysLeft < 7 ? 'text-red-600' : daysLeft < 30 ? 'text-orange-600' : 'text-green-600'}`}>
                      {daysLeft} days
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Financial Information */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-medium text-gray-900 mb-3">Financial Details</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {formatCurrency(selectedMembership.amount_paid)}
                  </div>
                  <div className="text-sm text-gray-500">Paid Amount</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {formatCurrency(selectedMembership.amount_pending)}
                  </div>
                  <div className="text-sm text-gray-500">Due Amount</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {formatCurrency(selectedMembership.total_amount_due)}
                  </div>
                  <div className="text-sm text-gray-500">Total Amount</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {formatCurrency(selectedMembership.original_amount)}
                  </div>
                  <div className="text-sm text-gray-500">Original Amount</div>
                </div>
              </div>
            </div>

            {/* Status and Alerts */}
            {selectedMembership.amount_pending > 0 && (
              <div className="bg-red-50 p-3 rounded-lg">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 text-red-600" />
                  <span className="text-red-800 font-medium">Payment Due</span>
                </div>
                <p className="text-red-700 text-sm mt-1">
                  This membership has a pending payment of {formatCurrency(selectedMembership.amount_pending)}
                </p>
              </div>
            )}

            {daysLeft < 7 && daysLeft > 0 && (
              <div className="bg-orange-50 p-3 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-orange-600" />
                  <span className="text-orange-800 font-medium">Expiring Soon</span>
                </div>
                <p className="text-orange-700 text-sm mt-1">
                  This membership expires in {daysLeft} days. Consider renewal.
                </p>
              </div>
            )}

            {selectedMembership.status === 'expired' && (
              <div className="bg-red-50 p-3 rounded-lg">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 text-red-600" />
                  <span className="text-red-800 font-medium">Expired</span>
                </div>
                <p className="text-red-700 text-sm mt-1">
                  This membership has expired. Member needs to renew or purchase a new membership.
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setIsInvoiceOpen(true)}
              >
                <Receipt className="w-4 h-4 mr-2" />
                Invoice
              </Button>
              
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setIsRenewalOpen(true)}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Renewal
              </Button>
              
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setIsUpgradeOpen(true)}
              >
                <ArrowUp className="w-4 h-4 mr-2" />
                Upgrade
              </Button>
              
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setIsTransferOpen(true)}
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Transfer
              </Button>
              
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setIsSuspendOpen(true)}
              >
                <Pause className="w-4 h-4 mr-2" />
                Suspend
              </Button>
              
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setIsPauseOpen(true)}
              >
                <Pause className="w-4 h-4 mr-2" />
                Pause
              </Button>
              
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setIsEditOpen(true)}
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </Button>

              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  setSelectedMembershipForPayment(selectedMembership)
                  setIsPaymentPlanOpen(true)
                }}
                className="text-blue-600 hover:text-blue-700"
              >
                <DollarSign className="w-4 h-4 mr-2" />
                Payment Plan
              </Button>
              
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setIsRemoveOpen(true)}
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Remove
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Plan Dialog */}
      <Dialog open={isPaymentPlanOpen} onOpenChange={setIsPaymentPlanOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Payment Plan Management</DialogTitle>
            <DialogDescription>
              Manage payment plans for this membership
            </DialogDescription>
          </DialogHeader>
          <div className="p-4">
            {selectedMembershipForPayment && (
              <div className="space-y-6">
                {/* Current Membership Info */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-medium mb-2">Current Membership</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Package:</span>
                      <span className="ml-2 font-medium">{selectedMembershipForPayment.package?.name || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Amount:</span>
                      <span className="ml-2 font-medium">₹{selectedMembershipForPayment.original_amount || 0}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Status:</span>
                      <span className="ml-2">{getStatusBadge(selectedMembershipForPayment.status)}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Payment Plan:</span>
                      <span className="ml-2 font-medium">
                        {selectedMembershipForPayment.payment_plan_id ? 'Active' : 'None'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Payment Plan Actions */}
                <div className="space-y-4">
                  <h3 className="font-medium">Payment Plan Actions</h3>
                  
                  {!selectedMembershipForPayment.payment_plan_id ? (
                    <div className="space-y-3">
                      <p className="text-sm text-gray-600">
                        This membership doesn't have a payment plan. You can create one to allow installment payments.
                      </p>
                      <Button 
                        className="bg-blue-500 hover:bg-blue-600"
                        onClick={() => {
                          // Open payment plan creation
                          window.dispatchEvent(new CustomEvent('openPaymentPlanCreation', {
                            detail: { membership: selectedMembershipForPayment }
                          }))
                        }}
                      >
                        <DollarSign className="w-4 h-4 mr-2" />
                        Create Payment Plan
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-sm text-gray-600">
                        This membership has an active payment plan. You can manage installments or modify the plan.
                      </p>
                      <div className="flex space-x-2">
                        <Button 
                          variant="outline"
                          onClick={() => {
                            // View payment plan details
                            window.dispatchEvent(new CustomEvent('openPaymentPlanDetails', {
                              detail: { membership: selectedMembershipForPayment }
                            }))
                          }}
                        >
                          <Activity className="w-4 h-4 mr-2" />
                          View Details
                        </Button>
                        <Button 
                          variant="outline"
                          onClick={() => {
                            // Edit payment plan
                            window.dispatchEvent(new CustomEvent('openPaymentPlanEdit', {
                              detail: { membership: selectedMembershipForPayment }
                            }))
                          }}
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          Edit Plan
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Payment History Section */}
                <div className="space-y-4">
                  <h3 className="font-medium">Payment History</h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="space-y-3">
                      {/* Payment Summary */}
                      <div className="grid grid-cols-4 gap-4 text-sm">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-600">
                            ₹{selectedMembershipForPayment.original_amount || 0}
                          </div>
                          <div className="text-gray-600">Total Amount</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-600">
                            ₹{selectedMembershipForPayment.amount_paid || 0}
                          </div>
                          <div className="text-gray-600">Paid Amount</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-red-600">
                            ₹{(selectedMembershipForPayment.original_amount || 0) - (selectedMembershipForPayment.amount_paid || 0)}
                          </div>
                          <div className="text-gray-600">Remaining</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-orange-600">
                            {selectedMembershipForPayment.payment_plan_id ? 'Active' : 'None'}
                          </div>
                          <div className="text-gray-600">Payment Plan</div>
                        </div>
                      </div>

                      {/* Payment Plan Details */}
                      {selectedMembershipForPayment.payment_plan_id && (
                        <div className="mt-4">
                          <h4 className="font-medium mb-2">Payment Plan Details</h4>
                          <div className="bg-blue-50 p-3 rounded border">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <span className="text-gray-600">Plan Status:</span>
                                <span className="ml-2 font-medium text-green-600">Active</span>
                              </div>
                              <div>
                                <span className="text-gray-600">Installments:</span>
                                <span className="ml-2 font-medium">Monthly</span>
                              </div>
                              <div>
                                <span className="text-gray-600">Next Due:</span>
                                <span className="ml-2 font-medium">15 Jan 2024</span>
                              </div>
                              <div>
                                <span className="text-gray-600">Amount:</span>
                                <span className="ml-2 font-medium">₹2,500</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Recent Payments */}
                      <div className="mt-4">
                        <h4 className="font-medium mb-2">Recent Payments</h4>
                        <div className="space-y-2">
                          {paymentsLoading ? (
                            <div className="text-center py-4 text-gray-500">
                              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-500 mx-auto mb-2"></div>
                              <p>Loading payments...</p>
                            </div>
                          ) : membershipPayments.length > 0 ? (
                            membershipPayments.slice(0, 5).map((payment, index) => (
                              <div key={payment.id} className="flex justify-between items-center p-2 bg-white rounded border">
                                <div className="flex items-center space-x-2">
                                  <CreditCard className="w-4 h-4 text-green-600" />
                                  <div>
                                    <span className="text-sm font-medium">{payment.payment_type || 'Payment'}</span>
                                    <div className="text-xs text-gray-500">
                                      {payment.payment_method || 'N/A'} • {payment.receipt_number || 'N/A'}
                                    </div>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="font-medium text-green-600">₹{payment.amount || 0}</div>
                                  <div className="text-xs text-gray-500">
                                    {payment.payment_date ? new Date(payment.payment_date).toLocaleDateString() : 'N/A'}
                                  </div>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="text-center py-4 text-gray-500">
                              <CreditCard className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                              <p>No payments recorded yet</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Quick Actions */}
                      <div className="flex space-x-2 pt-2">
                        <Button 
                          size="sm"
                          className="bg-green-500 hover:bg-green-600"
                          onClick={() => {
                            // Record payment
                            window.dispatchEvent(new CustomEvent('openRecordPayment', {
                              detail: { membership: selectedMembershipForPayment }
                            }))
                          }}
                        >
                          <CreditCard className="w-4 h-4 mr-2" />
                          Record Payment
                        </Button>
                        <Button 
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            // View full payment history
                            window.dispatchEvent(new CustomEvent('openPaymentHistory', {
                              detail: { membership: selectedMembershipForPayment }
                            }))
                          }}
                        >
                          <Receipt className="w-4 h-4 mr-2" />
                          View All Payments
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialogs */}
      <Dialog open={isInvoiceOpen} onOpenChange={setIsInvoiceOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate Invoice</DialogTitle>
            <DialogDescription>
              Generate an invoice for this membership
            </DialogDescription>
          </DialogHeader>
          <div className="p-4">
            <p className="text-center text-gray-500">
              Invoice generation functionality will be implemented here
            </p>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isRenewalOpen} onOpenChange={setIsRenewalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renew Membership</DialogTitle>
            <DialogDescription>
              Renew this membership for another period
            </DialogDescription>
          </DialogHeader>
          <div className="p-4">
            <p className="text-center text-gray-500">
              Membership renewal functionality will be implemented here
            </p>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isUpgradeOpen} onOpenChange={setIsUpgradeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upgrade Membership</DialogTitle>
            <DialogDescription>
              Upgrade this membership to a higher package
            </DialogDescription>
          </DialogHeader>
          <div className="p-4">
            <p className="text-center text-gray-500">
              Membership upgrade functionality will be implemented here
            </p>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isTransferOpen} onOpenChange={setIsTransferOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transfer Membership</DialogTitle>
            <DialogDescription>
              Transfer this membership to another member
            </DialogDescription>
          </DialogHeader>
          <div className="p-4">
            <p className="text-center text-gray-500">
              Membership transfer functionality will be implemented here
            </p>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isSuspendOpen} onOpenChange={setIsSuspendOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Suspend Membership</DialogTitle>
            <DialogDescription>
              Suspend this membership temporarily
            </DialogDescription>
          </DialogHeader>
          <div className="p-4">
            <p className="text-center text-gray-500">
              Membership suspension functionality will be implemented here
            </p>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isPauseOpen} onOpenChange={setIsPauseOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pause Membership</DialogTitle>
            <DialogDescription>
              Pause this membership temporarily
            </DialogDescription>
          </DialogHeader>
          <div className="p-4">
            <p className="text-center text-gray-500">
              Membership pause functionality will be implemented here
            </p>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isRemoveOpen} onOpenChange={setIsRemoveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Membership</DialogTitle>
            <DialogDescription>
              Remove this membership permanently
            </DialogDescription>
          </DialogHeader>
          <div className="p-4">
            <p className="text-center text-gray-500">
              Membership removal functionality will be implemented here
            </p>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Membership</DialogTitle>
            <DialogDescription>
              Edit this membership details
            </DialogDescription>
          </DialogHeader>
          <div className="p-4">
            <p className="text-center text-gray-500">
              Membership editing functionality will be implemented here
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}