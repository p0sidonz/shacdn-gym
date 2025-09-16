import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowDown, DollarSign, Package, AlertTriangle } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { useMembershipPackages } from '@/hooks/useMembershipPackages'
import { formatCurrency, formatDate } from '@/lib/utils'

interface MembershipDowngradeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  member: any
  currentMembership: any
  onDowngradeComplete: () => void
}

export const MembershipDowngradeDialog: React.FC<MembershipDowngradeDialogProps> = ({
  open,
  onOpenChange,
  member,
  currentMembership,
  onDowngradeComplete
}) => {
  const { gymId } = useAuth()
  const { packages } = useMembershipPackages(gymId || undefined)
  const [loading, setLoading] = useState(false)
  
  const [formData, setFormData] = useState({
    new_package_id: '',
    downgrade_date: new Date().toISOString().split('T')[0],
    refund_method: 'credit', // 'credit', 'cash', 'bank_transfer'
    refund_amount: 0,
    reason: '',
    notes: ''
  })

  // Calculate downgrade costs and refunds
  const [costCalculation, setCostCalculation] = useState<any>(null)

  useEffect(() => {
    if (formData.new_package_id && currentMembership) {
      calculateDowngradeCost()
    }
  }, [formData.new_package_id, formData.downgrade_date])

  const calculateDowngradeCost = () => {
    const newPackage = packages.find(p => p.id === formData.new_package_id)
    if (!newPackage) return

    const downgradeDate = new Date(formData.downgrade_date)
    const currentEndDate = new Date(currentMembership.end_date)
    const currentStartDate = new Date(currentMembership.start_date)
    
    const totalCurrentDays = Math.ceil((currentEndDate.getTime() - currentStartDate.getTime()) / (1000 * 60 * 60 * 24))
    const remainingDays = Math.max(0, Math.ceil((currentEndDate.getTime() - downgradeDate.getTime()) / (1000 * 60 * 60 * 24)))
    
    // Calculate remaining value of current membership
    const currentDailyRate = currentMembership.total_amount_due / totalCurrentDays
    const remainingValue = currentDailyRate * remainingDays
    
    // Calculate cost for new package for remaining period
    const newDailyRate = newPackage.price / newPackage.duration_days
    const newPackageCost = newDailyRate * remainingDays
    
    // Calculate refund amount
    const refundAmount = Math.max(0, remainingValue - newPackageCost)
    
    // New end date remains the same (using remaining period)
    const newEndDate = new Date(currentEndDate)

    setCostCalculation({
      newPackage,
      remainingDays,
      remainingValue,
      newPackageCost,
      refundAmount,
      newEndDate
    })

    // Update refund amount in form
    setFormData(prev => ({
      ...prev,
      refund_amount: refundAmount
    }))
  }

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.new_package_id) {
      alert('Please select a new package')
      return
    }

    if (!costCalculation) {
      alert('Cost calculation not available')
      return
    }

    if (!formData.reason) {
      alert('Please provide a reason for downgrade')
      return
    }

    setLoading(true)

    try {
      // 1. Update current membership status to 'downgraded'
      await supabase
        .from('memberships')
        .update({
          status: 'downgraded',
          actual_end_date: formData.downgrade_date
        })
        .eq('id', currentMembership.id)

      // 2. Create new membership with downgraded package
      const newMembershipData = {
        member_id: member.id,
        package_id: formData.new_package_id,
        original_membership_id: currentMembership.id,
        start_date: formData.downgrade_date,
        end_date: costCalculation.newEndDate.toISOString().split('T')[0],
        status: 'active',
        original_amount: costCalculation.newPackage.price,
        total_amount_due: costCalculation.newPackageCost,
        amount_paid: costCalculation.newPackageCost, // Paid from existing credit
        amount_pending: 0,
        is_trial: false
      }

      const { data: newMembership, error: membershipError } = await supabase
        .from('memberships')
        .insert([newMembershipData])
        .select()
        .single()

      if (membershipError) throw membershipError

      // 3. Record membership change
      const changeData = {
        member_id: member.id,
        from_membership_id: currentMembership.id,
        to_membership_id: newMembership.id,
        change_type: 'downgrade',
        change_date: formData.downgrade_date,
        amount_difference: -costCalculation.refundAmount, // Negative for refund
        refund_amount: costCalculation.refundAmount,
        remaining_days: costCalculation.remainingDays,
        prorated_amount: costCalculation.remainingValue,
        reason: formData.reason,
        processed_by: (await supabase.auth.getUser()).data.user?.id
      }

      await supabase
        .from('membership_changes')
        .insert([changeData])

      // 4. Handle refund based on method
      if (costCalculation.refundAmount > 0) {
        if (formData.refund_method === 'credit') {
          // Add to member's credit balance
          await supabase
            .from('members')
            .update({
              credit_balance: (member.credit_balance || 0) + costCalculation.refundAmount
            })
            .eq('id', member.id)

          // Record credit transaction
          await supabase
            .from('credit_transactions')
            .insert([{
              gym_id: gymId,
              member_id: member.id,
              membership_id: newMembership.id,
              transaction_type: 'credit_from_downgrade',
              amount: costCalculation.refundAmount,
              balance_before: member.credit_balance || 0,
              balance_after: (member.credit_balance || 0) + costCalculation.refundAmount,
              description: `Credit from downgrade to ${costCalculation.newPackage.name}`,
              reference_membership_change_id: changeData.id,
              processed_by: (await supabase.auth.getUser()).data.user?.id
            }])

        } else {
          // Create refund request for cash/bank transfer
          await supabase
            .from('refund_requests')
            .insert([{
              gym_id: gymId,
              member_id: member.id,
              membership_id: currentMembership.id,
              refund_type: 'partial_refund',
              requested_amount: costCalculation.refundAmount,
              eligible_amount: costCalculation.refundAmount,
              approved_amount: costCalculation.refundAmount,
              final_refund_amount: costCalculation.refundAmount,
              reason: `Downgrade refund: ${formData.reason}`,
              request_date: formData.downgrade_date,
              status: 'approved',
              refund_method: formData.refund_method,
              requested_by: (await supabase.auth.getUser()).data.user?.id,
              reviewed_by: (await supabase.auth.getUser()).data.user?.id
            }])
        }

        // Create payment record for refund tracking
        const paymentData = {
          gym_id: gymId,
          member_id: member.id,
          membership_id: newMembership.id,
          payment_type: 'refund',
          amount: -costCalculation.refundAmount, // Negative for refund
          original_amount: costCalculation.refundAmount,
          payment_method: formData.refund_method,
          payment_date: formData.downgrade_date,
          status: 'paid',
          receipt_number: `DWN${Date.now()}`,
          description: `Downgrade refund to ${costCalculation.newPackage.name}`,
          notes: formData.notes,
          processed_by: (await supabase.auth.getUser()).data.user?.id
        }

        await supabase
          .from('payments')
          .insert([paymentData])
      }

      const refundMessage = costCalculation.refundAmount > 0 
        ? ` with ${formatCurrency(costCalculation.refundAmount)} ${formData.refund_method === 'credit' ? 'added to credit balance' : 'refund processed'}`
        : ''

      alert(`Membership downgraded successfully to ${costCalculation.newPackage.name}${refundMessage}!`)
      onDowngradeComplete()
      onOpenChange(false)

    } catch (error) {
      console.error('Error downgrading membership:', error)
      alert(`Error downgrading membership: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  // Filter packages that are downgrades (lower price)
  const availableDowngrades = packages.filter(pkg => 
    pkg.id !== currentMembership.package_id && 
    pkg.price < (currentMembership.membership_packages?.price || 0) &&
    pkg.is_active
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowDown className="w-5 h-5 text-amber-600" />
            Downgrade Membership
          </DialogTitle>
          <DialogDescription>
            Downgrade {member.profile?.first_name} {member.profile?.last_name}'s membership to a lower tier
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Warning Notice */}
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-amber-800">
                <AlertTriangle className="w-4 h-4" />
                <span className="font-medium">Important Notice</span>
              </div>
              <p className="text-sm text-amber-700 mt-1">
                Downgrading will reduce access to facilities and services. Any refund will be calculated based on remaining membership period.
              </p>
            </CardContent>
          </Card>

          {/* Current Membership Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Current Membership</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Package:</span>
                  <p className="font-medium">{currentMembership.membership_packages?.name}</p>
                </div>
                <div>
                  <span className="text-gray-600">End Date:</span>
                  <p className="font-medium">{formatDate(currentMembership.end_date)}</p>
                </div>
                <div>
                  <span className="text-gray-600">Amount Paid:</span>
                  <p className="font-medium">{formatCurrency(currentMembership.amount_paid || 0)}</p>
                </div>
                <div>
                  <span className="text-gray-600">Days Remaining:</span>
                  <p className="font-medium">
                    {Math.max(0, Math.ceil((new Date(currentMembership.end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))} days
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Downgrade Options */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Package className="w-4 h-4" />
                New Package Selection
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="new_package_id">Select New Package *</Label>
                <Select value={formData.new_package_id} onValueChange={(value) => handleInputChange('new_package_id', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose downgrade package" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableDowngrades.map((pkg) => (
                      <SelectItem key={pkg.id} value={pkg.id}>
                        <div className="flex justify-between w-full">
                          <span>{pkg.name}</span>
                          <span className="text-amber-600 font-medium ml-4">
                            {formatCurrency(pkg.price)} • {pkg.duration_days} days
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {availableDowngrades.length === 0 && (
                  <p className="text-sm text-gray-500 mt-1">No downgrade packages available</p>
                )}
              </div>

              <div>
                <Label htmlFor="downgrade_date">Downgrade Date *</Label>
                <Input
                  id="downgrade_date"
                  type="date"
                  value={formData.downgrade_date}
                  onChange={(e) => handleInputChange('downgrade_date', e.target.value)}
                  required
                />
              </div>
            </CardContent>
          </Card>

          {/* Cost Calculation */}
          {costCalculation && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Refund Calculation
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">New Package:</span>
                    <p className="font-medium">{costCalculation.newPackage.name}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Period:</span>
                    <p className="font-medium">{costCalculation.remainingDays} days</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Remaining Value:</span>
                    <p className="font-medium">{formatCurrency(costCalculation.remainingValue)}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">New Package Cost:</span>
                    <p className="font-medium">{formatCurrency(costCalculation.newPackageCost)}</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-gray-600">Refund Amount:</span>
                    <p className="font-semibold text-green-600 text-lg">
                      {formatCurrency(costCalculation.refundAmount)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Refund Method */}
          {costCalculation && costCalculation.refundAmount > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Refund Method</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="refund_method">How to process refund? *</Label>
                  <Select value={formData.refund_method} onValueChange={(value) => handleInputChange('refund_method', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="credit">Credit Balance (Instant)</SelectItem>
                      <SelectItem value="cash">Cash Refund</SelectItem>
                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Reason & Notes */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Reason & Notes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="reason">Reason for Downgrade *</Label>
                <Input
                  id="reason"
                  value={formData.reason}
                  onChange={(e) => handleInputChange('reason', e.target.value)}
                  placeholder="e.g., Financial constraints, reduced usage"
                  required
                />
              </div>

              <div>
                <Label htmlFor="notes">Additional Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  placeholder="Any additional notes about the downgrade"
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loading || !formData.new_package_id || availableDowngrades.length === 0}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {loading ? 'Processing...' : `Downgrade Membership`}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
