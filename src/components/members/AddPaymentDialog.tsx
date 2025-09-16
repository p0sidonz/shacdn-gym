import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CalendarDays, CreditCard, DollarSign, User, Package } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { MembershipService } from '@/services/membershipService'

interface AddPaymentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  member: any
  membership?: any
  onPaymentAdded?: () => void
}

export const AddPaymentDialog: React.FC<AddPaymentDialogProps> = ({ 
  open, 
  onOpenChange, 
  member, 
  membership,
  onPaymentAdded 
}) => {
  const { gymId } = useAuth()
  const [loading, setLoading] = useState(false)
  const [loadingMemberships, setLoadingMemberships] = useState(false)
  const [memberships, setMemberships] = useState<any[]>([])
  const [selectedMembershipId, setSelectedMembershipId] = useState('')
  
  const [formData, setFormData] = useState({
    amount: '',
    payment_method: 'cash',
    payment_date: new Date().toISOString().split('T')[0],
    description: '',
    notes: '',
    next_payment_date: '',
    next_payment_amount: ''
  })

  // Load member's memberships
  useEffect(() => {
    const loadMemberships = async () => {
      if (!member?.id || !open) return
      
      setLoadingMemberships(true)
      try {
        const memberMemberships = await MembershipService.getMemberships({
          member_id: member.id
        })
        
        // Filter for active/pending memberships only
        const activeMemberships = memberMemberships.filter(m => 
          ['active', 'trial', 'pending_payment'].includes(m.status)
        )
        
        setMemberships(activeMemberships)
        
        // Auto-select the first membership or the passed membership
        if (membership) {
          setSelectedMembershipId(membership.id)
        } else if (activeMemberships.length > 0) {
          setSelectedMembershipId(activeMemberships[0].id)
        }
        
      } catch (error) {
        console.error('Error loading memberships:', error)
      } finally {
        setLoadingMemberships(false)
      }
    }

    loadMemberships()
  }, [member?.id, open, membership])

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      alert('कृपया वैध राशि डालें')
      return
    }
    
    if (!selectedMembershipId) {
      alert('कृपया membership select करें')
      return
    }
    
    setLoading(true)
    
    try {
      const amount = parseFloat(formData.amount)
      const selectedMembership = memberships.find(m => m.id === selectedMembershipId)
      
      // Generate receipt number
      const receiptNumber = `RCP${Date.now()}`
      
      // Create payment record
      const paymentData = {
        gym_id: gymId || '',
        member_id: member.id,
        membership_id: selectedMembershipId,
        payment_type: 'membership_fee',
        amount: amount,
        original_amount: amount,
        payment_method: formData.payment_method,
        payment_date: formData.payment_date,
        status: 'paid',
        receipt_number: receiptNumber,
        description: formData.description || `Payment for ${selectedMembership?.membership_packages?.name || 'membership'} by ${member.profile?.first_name} ${member.profile?.last_name}`,
        notes: formData.notes,
        processed_by: (await supabase.auth.getUser()).data.user?.id
      }

      console.log('Creating payment with data:', paymentData)

      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .insert([paymentData])
        .select()
        .single()

      if (paymentError) {
        console.error('Payment creation failed:', paymentError)
        throw paymentError
      }

      console.log('Payment created successfully:', payment)

      // Update membership amounts for selected membership
      if (selectedMembership) {
        const newAmountPaid = (selectedMembership.amount_paid || 0) + amount
        const newAmountPending = Math.max(0, (selectedMembership.amount_pending || 0) - amount)

        await supabase
          .from('memberships')
          .update({
            amount_paid: newAmountPaid,
            amount_pending: newAmountPending,
            status: newAmountPending <= 0 ? 'active' : selectedMembership.status
          })
          .eq('id', selectedMembershipId)

        console.log('Membership amounts updated')
      }

      // Add follow-up reminder for next payment if specified
      if (formData.next_payment_date && formData.next_payment_amount) {
        const followUpData = {
          gym_id: gymId || '',
          member_id: member.id,
          follow_up_date: new Date(formData.next_payment_date).toISOString(),
          response: `Next payment due: ₹${formData.next_payment_amount}`,
          remark: `Payment reminder - Amount: ₹${formData.next_payment_amount}`,
          status: 'pending',
          created_by: (await supabase.auth.getUser()).data.user?.id
        }

        await supabase
          .from('follow_ups')
          .insert([followUpData])

        console.log('Follow-up reminder created for next payment')
      }

      alert(`Payment of ₹${amount} added successfully!\nReceipt: ${receiptNumber}`)
      
      if (onPaymentAdded) {
        onPaymentAdded()
      }
      
      onOpenChange(false)
      resetForm()
      
    } catch (error) {
      console.error('Error adding payment:', error)
      alert(`Error adding payment: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      amount: '',
      payment_method: 'cash',
      payment_date: new Date().toISOString().split('T')[0],
      description: '',
      notes: '',
      next_payment_date: '',
      next_payment_amount: ''
    })
    setSelectedMembershipId('')
  }

  // Get selected membership details
  const selectedMembership = memberships.find(m => m.id === selectedMembershipId)
  const remainingAmount = selectedMembership ? (selectedMembership.amount_pending || 0) : 0
  const totalPackageAmount = selectedMembership ? (selectedMembership.total_amount_due || 0) : 0
  const paidAmount = selectedMembership ? (selectedMembership.amount_paid || 0) : 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Add Payment
          </DialogTitle>
          <DialogDescription>
            Add payment for {member?.profile?.first_name} {member?.profile?.last_name}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Membership Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Package className="w-4 h-4" />
                Select Membership
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {loadingMemberships ? (
                <div className="text-center py-4">
                  <p className="text-gray-500">Loading memberships...</p>
                </div>
              ) : memberships.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-gray-500">No active memberships found</p>
                </div>
              ) : (
                <>
                  <div>
                    <Label htmlFor="membership_select">Choose Package *</Label>
                    <Select value={selectedMembershipId} onValueChange={setSelectedMembershipId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select membership to add payment for" />
                      </SelectTrigger>
                      <SelectContent>
                        {memberships.map((membership) => (
                          <SelectItem key={membership.id} value={membership.id}>
                            <div className="flex flex-col">
                              <span className="font-medium">
                                {membership.membership_packages?.name || 'Unknown Package'}
                              </span>
                              <span className="text-xs text-gray-500">
                                ₹{membership.total_amount_due} total • ₹{membership.amount_pending || 0} pending
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedMembership && (
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Package Amount:</span>
                          <p className="font-semibold">₹{totalPackageAmount}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Already Paid:</span>
                          <p className="font-semibold text-green-600">₹{paidAmount}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Remaining:</span>
                          <p className="font-semibold text-orange-600">₹{remainingAmount}</p>
                        </div>
                      </div>
                      <div className="mt-3 pt-3 border-t">
                        <div className="flex justify-between text-xs text-gray-600">
                          <span>Package:</span>
                          <span>{selectedMembership.membership_packages?.name}</span>
                        </div>
                        <div className="flex justify-between text-xs text-gray-600">
                          <span>Period:</span>
                          <span>
                            {new Date(selectedMembership.start_date).toLocaleDateString('hi-IN')} to{' '}
                            {new Date(selectedMembership.end_date).toLocaleDateString('hi-IN')}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Payment Details */}
          {selectedMembership && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Payment Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="amount">Amount (₹) *</Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      value={formData.amount}
                      onChange={(e) => handleInputChange('amount', e.target.value)}
                      placeholder="Enter amount"
                      required
                    />
                    {remainingAmount > 0 && (
                      <p className="text-xs text-gray-500 mt-1">
                        Suggested: ₹{remainingAmount} (full remaining)
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="payment_method">Payment Method *</Label>
                    <Select value={formData.payment_method} onValueChange={(value) => handleInputChange('payment_method', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="card">Card</SelectItem>
                        <SelectItem value="upi">UPI</SelectItem>
                        <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                        <SelectItem value="cheque">Cheque</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

              <div>
                <Label htmlFor="payment_date">Payment Date *</Label>
                <Input
                  id="payment_date"
                  type="date"
                  value={formData.payment_date}
                  onChange={(e) => handleInputChange('payment_date', e.target.value)}
                  required
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Payment description (optional)"
                />
              </div>

              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  placeholder="Any additional notes"
                  rows={2}
                />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Next Payment Reminder */}
          {selectedMembership && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <CalendarDays className="w-4 h-4" />
                Next Payment Reminder (Optional)
              </CardTitle>
              <CardDescription>
                Set a reminder for the next payment if member will pay remaining amount later
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="next_payment_date">Next Payment Date</Label>
                  <Input
                    id="next_payment_date"
                    type="date"
                    value={formData.next_payment_date}
                    onChange={(e) => handleInputChange('next_payment_date', e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="next_payment_amount">Expected Amount (₹)</Label>
                  <Input
                    id="next_payment_amount"
                    type="number"
                    step="0.01"
                    value={formData.next_payment_amount}
                    onChange={(e) => handleInputChange('next_payment_amount', e.target.value)}
                    placeholder="Expected amount"
                  />
                  {remainingAmount > 0 && formData.amount && (
                    <p className="text-xs text-gray-500 mt-1">
                      Remaining after this payment: ₹{Math.max(0, remainingAmount - parseFloat(formData.amount || '0'))}
                    </p>
                  )}
                </div>
            </div>
          </CardContent>
        </Card>
          )}

        <div className="flex justify-end space-x-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading || !selectedMembershipId}>
            {loading ? 'Adding Payment...' : 'Add Payment'}
          </Button>
        </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}