import React, { useState, useEffect } from 'react'
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from '@/components/ui/drawer'
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
    prorated_calculation: 'proportional', // 'proportional', 'full', or 'custom'
    payment_method: 'cash',
    additional_payment: 0,
    custom_amount: 0, // For custom calculation method
    ignore_previous_pending: false, // For custom method - whether to ignore previous pending
    reason: '',
    notes: ''
  })

  // Calculate upgrade costs when package is selected
  const [costCalculation, setCostCalculation] = useState<any>(null)

  useEffect(() => {
    if (formData.new_package_id && currentMembership) {
      calculateUpgradeCost()
    }
  }, [formData.new_package_id, formData.prorated_calculation, formData.upgrade_date, formData.custom_amount, formData.ignore_previous_pending])

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
      // For proportional: Calculate remaining value based on what was actually paid
      const dailyRate = (currentMembership.amount_paid || 0) / totalCurrentDays
      remainingValue = dailyRate * remainingDays
      
      // Calculate proportional cost for new package for remaining days
      const newDailyRate = newPackage.price / newPackage.duration_days
      const upgradeCost = newDailyRate * remainingDays
      
      // Additional cost = new package cost for remaining days - remaining value from old package
      additionalCost = Math.max(0, upgradeCost - remainingValue)
      newEndDate = new Date(currentEndDate) // Keep same end date
    } else if (formData.prorated_calculation === 'full') {
      // For full package: Pay full new package price, but get credit for remaining value from old package
      const dailyRate = (currentMembership.amount_paid || 0) / totalCurrentDays
      remainingValue = dailyRate * remainingDays
      
      // Full package cost minus any remaining value from current membership
      additionalCost = Math.max(0, newPackage.price - remainingValue)
      newEndDate.setDate(newEndDate.getDate() + newPackage.duration_days)
    } else if (formData.prorated_calculation === 'custom') {
      // For custom: Use manually entered amount + existing pending amount (if not ignored)
      const existingPending = formData.ignore_previous_pending ? 0 : (currentMembership.amount_pending || 0)
      additionalCost = (formData.custom_amount || 0) + existingPending
      remainingValue = 0 // No automatic calculation for custom
      newEndDate = new Date(currentEndDate) // Keep same end date
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

    if (formData.prorated_calculation === 'custom' && (!formData.custom_amount || formData.custom_amount <= 0)) {
      alert('Please enter a valid custom amount')
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
        total_amount_due: formData.prorated_calculation === 'custom' ? 
          costCalculation.additionalCost : // For custom: use total amount (custom + pending)
          costCalculation.newPackage.price, // For other methods: use full package price
        amount_paid: 0, // Will be updated when payment is added
        amount_pending: formData.prorated_calculation === 'custom' ? 
          costCalculation.additionalCost : // For custom: use total amount (custom + pending)
          costCalculation.newPackage.price, // For other methods: use full package price
        is_trial: false,
        pt_sessions_remaining: costCalculation.newPackage.pt_sessions_included || 0
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
        additional_payment: 0, // No payment made during upgrade - will be handled separately
        remaining_days: costCalculation.remainingDays,
        prorated_amount: costCalculation.remainingValue,
        reason: formData.reason,
        notes: `Package changed to ${costCalculation.newPackage.name}. Payment to be added separately.`,
        processed_by: (await supabase.auth.getUser()).data.user?.id
      }

      await supabase
        .from('membership_changes')
        .insert([changeData])

      // 4. Payment will be handled separately via Add Payment functionality
      // No automatic payment creation - user will add payment manually

      // 5. Handle trainer assignment for PT packages
      if ((costCalculation.newPackage.package_type === 'personal_training' || 
           costCalculation.newPackage.pt_sessions_included > 0) && 
          member.assigned_trainer_id) {
        // Create trainer commission rule for the new package
        const commissionData = {
          trainer_id: member.assigned_trainer_id,
          package_id: formData.new_package_id,
          member_id: member.id,
          commission_type: 'percentage',
          commission_value: 10, // Default 10% commission
          valid_from: formData.upgrade_date,
          is_active: true,
          notes: `Package change to ${costCalculation.newPackage.name}`,
          created_by: (await supabase.auth.getUser()).data.user?.id
        }

        await supabase
          .from('trainer_commission_rules')
          .insert([commissionData])
      }

      alert(`Package changed successfully to ${costCalculation.newPackage.name}! Please add payment separately using the "Add Payment" feature.`)
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
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[95vh]">
        <DrawerHeader className="border-b">
          <DrawerTitle className="flex items-center gap-2 text-xl">
            <ArrowUp className="w-6 h-6 text-green-600" />
            Change Package
          </DrawerTitle>
          <DrawerDescription className="text-base">
            Change {member.profile?.first_name} {member.profile?.last_name}'s membership package
          </DrawerDescription>
        </DrawerHeader>
        
        <div className="overflow-y-auto flex-1 p-6">

          <form onSubmit={handleSubmit} className="space-y-6">
          {/* Current Membership Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Current Membership</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-sm">
                <div className="space-y-1">
                  <span className="text-gray-600 font-medium">Package:</span>
                  <p className="font-semibold text-lg">{currentMembership.membership_packages?.name}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-gray-600 font-medium">End Date:</span>
                  <p className="font-semibold text-lg">{formatDate(currentMembership.end_date)}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-gray-600 font-medium">Amount Paid:</span>
                  <p className="font-semibold text-lg text-green-600">{formatCurrency(currentMembership.amount_paid || 0)}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-gray-600 font-medium">Days Remaining:</span>
                  <p className="font-semibold text-lg text-blue-600">
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
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="new_package_id" className="text-base font-medium">Select New Package *</Label>
                <Select value={formData.new_package_id} onValueChange={(value) => handleInputChange('new_package_id', value)}>
                  <SelectTrigger className="h-12 text-base">
                    <SelectValue placeholder="Choose upgrade package" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableUpgrades.map((pkg) => (
                      <SelectItem key={pkg.id} value={pkg.id}>
                        <div className="flex justify-between w-full items-center">
                          <span className="font-medium">{pkg.name}</span>
                          <span className="text-green-600 font-semibold ml-4">
                            {formatCurrency(pkg.price)} • {pkg.duration_days} days
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {availableUpgrades.length === 0 && (
                  <p className="text-sm text-gray-500 mt-2">No upgrade packages available</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="upgrade_date" className="text-base font-medium">Upgrade Date *</Label>
                  <Input
                    id="upgrade_date"
                    type="date"
                    value={formData.upgrade_date}
                    onChange={(e) => handleInputChange('upgrade_date', e.target.value)}
                    className="h-12 text-base"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="prorated_calculation" className="text-base font-medium">Calculation Method</Label>
                  <Select value={formData.prorated_calculation} onValueChange={(value) => handleInputChange('prorated_calculation', value)}>
                    <SelectTrigger className="h-12 text-base">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="proportional">Proportional (Remaining Period)</SelectItem>
                      <SelectItem value="full">Full Package Duration</SelectItem>
                      <SelectItem value="custom">Custom Amount</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Custom Amount Input - Only show when custom method is selected */}
              {formData.prorated_calculation === 'custom' && (
                <div className="mt-6 p-4 bg-blue-50 rounded-lg space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="custom_amount" className="text-base font-medium">Custom Amount (₹)</Label>
                    <Input
                      id="custom_amount"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.custom_amount}
                      onChange={(e) => handleInputChange('custom_amount', parseFloat(e.target.value) || 0)}
                      placeholder="Enter custom amount"
                      className="h-12 text-base"
                      required
                    />
                  </div>
                  
                  {/* Ignore Previous Pending Option */}
                  {currentMembership.amount_pending > 0 && (
                    <div className="flex items-center space-x-3 p-3 bg-white rounded-lg border">
                      <input
                        type="checkbox"
                        id="ignore_previous_pending"
                        checked={formData.ignore_previous_pending}
                        onChange={(e) => handleInputChange('ignore_previous_pending', e.target.checked)}
                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <Label htmlFor="ignore_previous_pending" className="text-base font-medium cursor-pointer">
                        Ignore previous pending amount ({formatCurrency(currentMembership.amount_pending)})
                      </Label>
                    </div>
                  )}
                  
                  <div className="text-sm text-gray-600 space-y-2">
                    <p className="font-medium">Enter the amount for this package change</p>
                    {currentMembership.amount_pending > 0 && !formData.ignore_previous_pending && (
                      <p className="text-orange-600 font-semibold text-base">
                        Current pending amount: {formatCurrency(currentMembership.amount_pending)}
                      </p>
                    )}
                    <p className="text-blue-600 font-semibold text-lg">
                      Total will be: {formatCurrency((formData.custom_amount || 0) + (formData.ignore_previous_pending ? 0 : (currentMembership.amount_pending || 0)))}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Cost Calculation */}
          {costCalculation && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Cost Calculation
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="space-y-1">
                    <span className="text-gray-600 font-medium">New Package:</span>
                    <p className="font-semibold text-lg">{costCalculation.newPackage.name}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-gray-600 font-medium">New End Date:</span>
                    <p className="font-semibold text-lg">{formatDate(costCalculation.newEndDate)}</p>
                  </div>
                  {formData.prorated_calculation !== 'custom' && (
                    <div className="space-y-1">
                      <span className="text-gray-600 font-medium">Remaining Value:</span>
                      <p className="font-semibold text-lg text-blue-600">-{formatCurrency(costCalculation.remainingValue)}</p>
                    </div>
                  )}
                  <div className="space-y-1">
                    <span className="text-gray-600 font-medium">
                      {formData.prorated_calculation === 'custom' ? 'Total Amount:' : 'Additional Cost:'}
                    </span>
                    <p className="font-semibold text-xl text-green-600">{formatCurrency(costCalculation.additionalCost)}</p>
                    {formData.prorated_calculation === 'custom' && currentMembership.amount_pending > 0 && !formData.ignore_previous_pending && (
                      <p className="text-sm text-gray-500">
                        (Custom: {formatCurrency(formData.custom_amount || 0)} + Pending: {formatCurrency(currentMembership.amount_pending || 0)})
                      </p>
                    )}
                    {formData.prorated_calculation === 'custom' && formData.ignore_previous_pending && (
                      <p className="text-sm text-gray-500">
                        (Custom: {formatCurrency(formData.custom_amount || 0)} - Previous pending ignored)
                      </p>
                    )}
                  </div>
                </div>
                <div className="mt-4 p-4 bg-blue-50 rounded-lg border-l-4 border-blue-400">
                  <p className="text-base text-blue-800 font-medium">
                    <strong>Note:</strong> Payment will be handled separately using the "Add Payment" feature after package change.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Payment Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Payment & Notes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="payment_method" className="text-base font-medium">Payment Method</Label>
                  <Select value={formData.payment_method} onValueChange={(value) => handleInputChange('payment_method', value)}>
                    <SelectTrigger className="h-12 text-base">
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
                {/* Additional Payment field hidden - will be handled via Add Payment */}
              </div>

              <div className="space-y-2">
                <Label htmlFor="reason" className="text-base font-medium">Reason for Package Change</Label>
                <Input
                  id="reason"
                  value={formData.reason}
                  onChange={(e) => handleInputChange('reason', e.target.value)}
                  placeholder="e.g., Member requested better facilities"
                  className="h-12 text-base"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes" className="text-base font-medium">Additional Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  placeholder="Any additional notes about the package change"
                  rows={3}
                  className="text-base"
                />
              </div>
            </CardContent>
          </Card>

          </form>
        </div>

        {/* Footer with action buttons */}
        <div className="flex justify-end space-x-3 p-6 border-t bg-gray-50">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} size="lg">
            Cancel
          </Button>
          <Button 
            type="submit" 
            disabled={loading || !formData.new_package_id || availableUpgrades.length === 0 || (formData.prorated_calculation === 'custom' && (!formData.custom_amount || formData.custom_amount <= 0))}
            className="bg-green-600 hover:bg-green-700"
            size="lg"
            onClick={handleSubmit}
          >
            {loading ? 'Processing...' : `Change Package`}
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  )
}
