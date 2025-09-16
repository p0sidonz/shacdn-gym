import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowUp, DollarSign, Package, Calendar } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { useMembershipPackages } from '@/hooks/useMembershipPackages'
import { formatCurrency, formatDate } from '@/lib/utils'

interface MembershipUpgradeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  member: any
  currentMembership: any
  onUpgradeComplete: () => void
}

export const MembershipUpgradeDialog: React.FC<MembershipUpgradeDialogProps> = ({
  open,
  onOpenChange,
  member,
  currentMembership,
  onUpgradeComplete
}) => {
  const { gymId } = useAuth()
  const { packages } = useMembershipPackages(gymId || undefined)
  const [loading, setLoading] = useState(false)
  
  const [formData, setFormData] = useState({
    new_package_id: '',
    upgrade_date: new Date().toISOString().split('T')[0],
    prorated_calculation: 'proportional', // 'proportional' or 'full'
    payment_method: 'cash',
    additional_payment: 0,
    reason: '',
    notes: ''
  })

  // Calculate upgrade costs when package is selected
  const [costCalculation, setCostCalculation] = useState<any>(null)

  useEffect(() => {
    if (formData.new_package_id && currentMembership) {
      calculateUpgradeCost()
    }
  }, [formData.new_package_id, formData.prorated_calculation, formData.upgrade_date])

  const calculateUpgradeCost = () => {
    const newPackage = packages.find(p => p.id === formData.new_package_id)
    if (!newPackage) return

    const upgradeDate = new Date(formData.upgrade_date)
    const currentEndDate = new Date(currentMembership.end_date)
    const currentStartDate = new Date(currentMembership.start_date)
    
    const totalCurrentDays = Math.ceil((currentEndDate.getTime() - currentStartDate.getTime()) / (1000 * 60 * 60 * 24))
    const remainingDays = Math.max(0, Math.ceil((currentEndDate.getTime() - upgradeDate.getTime()) / (1000 * 60 * 60 * 24)))
    
    let remainingValue = 0
    let additionalCost = 0
    let newEndDate = new Date(upgradeDate)

    if (formData.prorated_calculation === 'proportional') {
      // Calculate remaining value of current membership
      const dailyRate = currentMembership.total_amount_due / totalCurrentDays
      remainingValue = dailyRate * remainingDays
      
      // Calculate proportional cost for new package
      const newDailyRate = newPackage.price / newPackage.duration_days
      const upgradeCost = newDailyRate * remainingDays
      
      additionalCost = Math.max(0, upgradeCost - remainingValue)
      newEndDate = new Date(currentEndDate) // Keep same end date
    } else {
      // Full package cost
      additionalCost = newPackage.price
      newEndDate.setDate(newEndDate.getDate() + newPackage.duration_days)
    }

    setCostCalculation({
      newPackage,
      remainingDays,
      remainingValue,
      additionalCost,
      newEndDate,
      totalDays: formData.prorated_calculation === 'proportional' ? remainingDays : newPackage.duration_days
    })

    // Update additional payment in form
    setFormData(prev => ({
      ...prev,
      additional_payment: additionalCost
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

    setLoading(true)

    try {
      // 1. Update current membership status to 'upgraded'
      await supabase
        .from('memberships')
        .update({
          status: 'upgraded',
          actual_end_date: formData.upgrade_date
        })
        .eq('id', currentMembership.id)

      // 2. Create new membership
      const newMembershipData = {
        member_id: member.id,
        package_id: formData.new_package_id,
        original_membership_id: currentMembership.id,
        start_date: formData.upgrade_date,
        end_date: costCalculation.newEndDate.toISOString().split('T')[0],
        status: 'active',
        original_amount: costCalculation.newPackage.price,
        total_amount_due: costCalculation.additionalCost,
        amount_paid: costCalculation.additionalCost, // Assume immediate payment
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
        change_type: 'upgrade',
        change_date: formData.upgrade_date,
        amount_difference: costCalculation.additionalCost,
        additional_payment: costCalculation.additionalCost,
        remaining_days: costCalculation.remainingDays,
        prorated_amount: costCalculation.remainingValue,
        reason: formData.reason,
        processed_by: (await supabase.auth.getUser()).data.user?.id
      }

      await supabase
        .from('membership_changes')
        .insert([changeData])

      // 4. Create payment record if additional payment
      if (costCalculation.additionalCost > 0) {
        const paymentData = {
          gym_id: gymId,
          member_id: member.id,
          membership_id: newMembership.id,
          payment_type: 'upgrade_fee',
          amount: costCalculation.additionalCost,
          original_amount: costCalculation.additionalCost,
          payment_method: formData.payment_method,
          payment_date: formData.upgrade_date,
          status: 'paid',
          receipt_number: `UPG${Date.now()}`,
          description: `Upgrade to ${costCalculation.newPackage.name}`,
          notes: formData.notes,
          processed_by: (await supabase.auth.getUser()).data.user?.id
        }

        await supabase
          .from('payments')
          .insert([paymentData])
      }

      alert(`Membership upgraded successfully to ${costCalculation.newPackage.name}!`)
      onUpgradeComplete()
      onOpenChange(false)

    } catch (error) {
      console.error('Error upgrading membership:', error)
      alert(`Error upgrading membership: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  // Filter packages that are upgrades (higher price or better features)
  const availableUpgrades = packages.filter(pkg => 
    pkg.id !== currentMembership.package_id && 
    pkg.price > (currentMembership.membership_packages?.price || 0) &&
    pkg.is_active
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowUp className="w-5 h-5 text-green-600" />
            Upgrade Membership
          </DialogTitle>
          <DialogDescription>
            Upgrade {member.profile?.first_name} {member.profile?.last_name}'s membership to a higher tier
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
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

          {/* Upgrade Options */}
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
                    <SelectValue placeholder="Choose upgrade package" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableUpgrades.map((pkg) => (
                      <SelectItem key={pkg.id} value={pkg.id}>
                        <div className="flex justify-between w-full">
                          <span>{pkg.name}</span>
                          <span className="text-green-600 font-medium ml-4">
                            {formatCurrency(pkg.price)} • {pkg.duration_days} days
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {availableUpgrades.length === 0 && (
                  <p className="text-sm text-gray-500 mt-1">No upgrade packages available</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="upgrade_date">Upgrade Date *</Label>
                  <Input
                    id="upgrade_date"
                    type="date"
                    value={formData.upgrade_date}
                    onChange={(e) => handleInputChange('upgrade_date', e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="prorated_calculation">Calculation Method</Label>
                  <Select value={formData.prorated_calculation} onValueChange={(value) => handleInputChange('prorated_calculation', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="proportional">Proportional (Remaining Period)</SelectItem>
                      <SelectItem value="full">Full Package Duration</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Cost Calculation */}
          {costCalculation && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Cost Calculation
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">New Package:</span>
                    <p className="font-medium">{costCalculation.newPackage.name}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">New End Date:</span>
                    <p className="font-medium">{formatDate(costCalculation.newEndDate)}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Remaining Value:</span>
                    <p className="font-medium text-blue-600">-{formatCurrency(costCalculation.remainingValue)}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Additional Cost:</span>
                    <p className="font-medium text-green-600">{formatCurrency(costCalculation.additionalCost)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Payment Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Payment & Notes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="payment_method">Payment Method</Label>
                  <Select value={formData.payment_method} onValueChange={(value) => handleInputChange('payment_method', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="card">Card</SelectItem>
                      <SelectItem value="upi">UPI</SelectItem>
                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                      <SelectItem value="adjustment">Credit Adjustment</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="additional_payment">Additional Payment</Label>
                  <Input
                    id="additional_payment"
                    type="number"
                    step="0.01"
                    value={formData.additional_payment}
                    onChange={(e) => handleInputChange('additional_payment', parseFloat(e.target.value) || 0)}
                    readOnly
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="reason">Reason for Upgrade</Label>
                <Input
                  id="reason"
                  value={formData.reason}
                  onChange={(e) => handleInputChange('reason', e.target.value)}
                  placeholder="e.g., Member requested better facilities"
                />
              </div>

              <div>
                <Label htmlFor="notes">Additional Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  placeholder="Any additional notes about the upgrade"
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
              disabled={loading || !formData.new_package_id || availableUpgrades.length === 0}
              className="bg-green-600 hover:bg-green-700"
            >
              {loading ? 'Processing...' : `Upgrade Membership`}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
