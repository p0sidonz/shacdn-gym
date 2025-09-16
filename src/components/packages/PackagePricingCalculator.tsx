import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { 
  Calculator, 
  DollarSign, 
  Calendar, 
  Percent, 
  Info,
  CheckCircle,
  AlertCircle
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import type { MembershipPackage } from '@/types'

interface PackagePricingCalculatorProps {
  packages: MembershipPackage[]
  onCalculate?: (result: PricingResult) => void
  className?: string
}

interface PricingResult {
  package: MembershipPackage
  basePrice: number
  setupFee: number
  securityDeposit: number
  discountAmount: number
  totalBeforeDiscount: number
  totalAfterDiscount: number
  monthlyEquivalent: number
  dailyRate: number
  savings: number
  breakdown: {
    item: string
    amount: number
    type: 'cost' | 'discount' | 'total'
  }[]
}

export const PackagePricingCalculator: React.FC<PackagePricingCalculatorProps> = ({
  packages,
  onCalculate,
  className = ''
}) => {
  const [selectedPackageId, setSelectedPackageId] = useState<string>('')
  const [discountPercentage, setDiscountPercentage] = useState<number>(0)
  const [discountAmount, setDiscountAmount] = useState<number>(0)
  const [customSetupFee, setCustomSetupFee] = useState<number | null>(null)
  const [customSecurityDeposit, setCustomSecurityDeposit] = useState<number | null>(null)
  const [discountType, setDiscountType] = useState<'percentage' | 'amount'>('percentage')

  const selectedPackage = packages.find(pkg => pkg.id === selectedPackageId)

  const calculatePricing = (): PricingResult | null => {
    if (!selectedPackage) return null

    const basePrice = selectedPackage.price
    const setupFee = customSetupFee !== null ? customSetupFee : (selectedPackage.setup_fee || 0)
    const securityDeposit = customSecurityDeposit !== null ? customSecurityDeposit : (selectedPackage.security_deposit || 0)
    
    const totalBeforeDiscount = basePrice + setupFee + securityDeposit
    
    const calculatedDiscount = discountType === 'percentage' 
      ? (totalBeforeDiscount * discountPercentage) / 100
      : discountAmount
    
    const totalAfterDiscount = Math.max(0, totalBeforeDiscount - calculatedDiscount)
    const monthlyEquivalent = totalAfterDiscount / (selectedPackage.duration_days / 30)
    const dailyRate = totalAfterDiscount / selectedPackage.duration_days
    const savings = calculatedDiscount

    const breakdown = [
      { item: 'Package Price', amount: basePrice, type: 'cost' as const },
      { item: 'Setup Fee', amount: setupFee, type: 'cost' as const },
      { item: 'Security Deposit', amount: securityDeposit, type: 'cost' as const },
      { item: 'Subtotal', amount: totalBeforeDiscount, type: 'total' as const },
    ]

    if (calculatedDiscount > 0) {
      breakdown.push(
        { item: 'Discount', amount: -calculatedDiscount, type: 'discount' as const },
        { item: 'Total After Discount', amount: totalAfterDiscount, type: 'total' as const }
      )
    }

    return {
      package: selectedPackage,
      basePrice,
      setupFee,
      securityDeposit,
      discountAmount: calculatedDiscount,
      totalBeforeDiscount,
      totalAfterDiscount,
      monthlyEquivalent,
      dailyRate,
      savings,
      breakdown
    }
  }

  const result = calculatePricing()

  useEffect(() => {
    if (result && onCalculate) {
      onCalculate(result)
    }
  }, [result, onCalculate])

  const resetCalculator = () => {
    setSelectedPackageId('')
    setDiscountPercentage(0)
    setDiscountAmount(0)
    setCustomSetupFee(null)
    setCustomSecurityDeposit(null)
    setDiscountType('percentage')
  }

  const applyCommonDiscounts = (discount: number) => {
    if (discountType === 'percentage') {
      setDiscountPercentage(discount)
    } else {
      if (result) {
        setDiscountAmount((result.totalBeforeDiscount * discount) / 100)
      }
    }
  }

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Package Pricing Calculator</h2>
        <p className="text-gray-600">Calculate the total cost of membership packages with discounts and fees</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Calculator Inputs */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calculator className="w-5 h-5 mr-2" />
              Calculator Settings
            </CardTitle>
            <CardDescription>
              Configure package, fees, and discounts to see pricing breakdown
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Package Selection */}
            <div className="space-y-2">
              <Label htmlFor="package">Select Package</Label>
              <Select value={selectedPackageId} onValueChange={setSelectedPackageId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a package" />
                </SelectTrigger>
                <SelectContent>
                  {packages.filter(pkg => pkg.is_active).map((pkg) => (
                    <SelectItem key={pkg.id} value={pkg.id}>
                      <div className="flex items-center justify-between w-full">
                        <span>{pkg.name}</span>
                        <Badge variant="outline" className="ml-2">
                          {formatCurrency(pkg.price)}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedPackage && (
              <>
                {/* Custom Fees */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-sm">Custom Fees (Optional)</h4>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="setup-fee">Setup Fee Override</Label>
                      <Input
                        id="setup-fee"
                        type="number"
                        step="0.01"
                        placeholder={selectedPackage.setup_fee?.toString() || '0'}
                        value={customSetupFee?.toString() || ''}
                        onChange={(e) => setCustomSetupFee(e.target.value ? parseFloat(e.target.value) : null)}
                      />
                      <p className="text-xs text-gray-500">
                        Default: {formatCurrency(selectedPackage.setup_fee || 0)}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="security-deposit">Security Deposit Override</Label>
                      <Input
                        id="security-deposit"
                        type="number"
                        step="0.01"
                        placeholder={selectedPackage.security_deposit?.toString() || '0'}
                        value={customSecurityDeposit?.toString() || ''}
                        onChange={(e) => setCustomSecurityDeposit(e.target.value ? parseFloat(e.target.value) : null)}
                      />
                      <p className="text-xs text-gray-500">
                        Default: {formatCurrency(selectedPackage.security_deposit || 0)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Discount Settings */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-sm">Discount Settings</h4>
                  
                  <div className="space-y-2">
                    <Label>Discount Type</Label>
                    <Select value={discountType} onValueChange={(value: 'percentage' | 'amount') => setDiscountType(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage">Percentage</SelectItem>
                        <SelectItem value="amount">Fixed Amount</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {discountType === 'percentage' ? (
                    <div className="space-y-2">
                      <Label htmlFor="discount-percentage">Discount Percentage</Label>
                      <Input
                        id="discount-percentage"
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={discountPercentage}
                        onChange={(e) => setDiscountPercentage(parseFloat(e.target.value) || 0)}
                      />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Label htmlFor="discount-amount">Discount Amount</Label>
                      <Input
                        id="discount-amount"
                        type="number"
                        step="0.01"
                        min="0"
                        value={discountAmount}
                        onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)}
                      />
                    </div>
                  )}

                  {/* Quick Discount Buttons */}
                  <div className="space-y-2">
                    <Label>Quick Discounts</Label>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => applyCommonDiscounts(5)}
                      >
                        5%
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => applyCommonDiscounts(10)}
                      >
                        10%
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => applyCommonDiscounts(15)}
                      >
                        15%
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => applyCommonDiscounts(20)}
                      >
                        20%
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-2">
                  <Button onClick={resetCalculator} variant="outline" className="flex-1">
                    Reset
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Results */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <DollarSign className="w-5 h-5 mr-2" />
              Pricing Breakdown
            </CardTitle>
            <CardDescription>
              Detailed cost analysis and pricing information
            </CardDescription>
          </CardHeader>
          <CardContent>
            {result ? (
              <div className="space-y-6">
                {/* Package Info */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-lg">{result.package.name}</h3>
                  <p className="text-sm text-gray-600 mb-2">{result.package.description}</p>
                  <div className="flex items-center space-x-4 text-sm">
                    <span className="flex items-center">
                      <Calendar className="w-4 h-4 mr-1" />
                      {result.package.duration_days} days
                    </span>
                    <Badge variant="outline">
                      {result.package.package_type.replace('_', ' ')}
                    </Badge>
                  </div>
                </div>

                {/* Cost Breakdown */}
                <div className="space-y-3">
                  <h4 className="font-semibold">Cost Breakdown</h4>
                  <div className="space-y-2">
                    {result.breakdown.map((item, index) => (
                      <div
                        key={index}
                        className={`flex justify-between items-center py-2 px-3 rounded ${
                          item.type === 'total' 
                            ? 'bg-blue-50 font-semibold' 
                            : item.type === 'discount'
                            ? 'bg-green-50 text-green-700'
                            : 'bg-gray-50'
                        }`}
                      >
                        <span className="text-sm">{item.item}</span>
                        <span className="text-sm font-medium">
                          {item.amount < 0 ? '-' : ''}{formatCurrency(Math.abs(item.amount))}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Summary Stats */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {formatCurrency(result.totalAfterDiscount)}
                    </div>
                    <div className="text-xs text-blue-600">Total Cost</div>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {formatCurrency(result.monthlyEquivalent)}
                    </div>
                    <div className="text-xs text-green-600">Monthly Equivalent</div>
                  </div>
                </div>

                {/* Additional Info */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Daily Rate:</span>
                    <span className="font-medium">{formatCurrency(result.dailyRate)}</span>
                  </div>
                  {result.savings > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>You Save:</span>
                      <span className="font-medium">{formatCurrency(result.savings)}</span>
                    </div>
                  )}
                </div>

                {/* Package Features */}
                {result.package.features.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm">Package Features</h4>
                    <div className="flex flex-wrap gap-1">
                      {result.package.features.slice(0, 6).map((feature, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {feature}
                        </Badge>
                      ))}
                      {result.package.features.length > 6 && (
                        <Badge variant="outline" className="text-xs">
                          +{result.package.features.length - 6} more
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Calculator className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>Select a package to see pricing breakdown</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
