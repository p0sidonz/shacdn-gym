import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { 
  Check, 
  X, 
  Star, 
  Shield,
  ArrowRight,
  Plus,
  Minus
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import type { MembershipPackage } from '@/types'

interface PackageComparisonProps {
  packages: MembershipPackage[]
  onSelectPackage: (pkg: MembershipPackage) => void
  maxPackages?: number
  className?: string
}

export const PackageComparison: React.FC<PackageComparisonProps> = ({
  packages,
  onSelectPackage,
  maxPackages = 4,
  className = ''
}) => {
  const [selectedPackages, setSelectedPackages] = useState<MembershipPackage[]>([])

  const addPackage = (pkg: MembershipPackage) => {
    if (selectedPackages.length < maxPackages && !selectedPackages.find(p => p.id === pkg.id)) {
      setSelectedPackages([...selectedPackages, pkg])
    }
  }

  const removePackage = (pkgId: string) => {
    setSelectedPackages(selectedPackages.filter(p => p.id !== pkgId))
  }

  const clearAll = () => {
    setSelectedPackages([])
  }

  const getPackageTypeColor = (type: string) => {
    switch (type) {
      case 'general': return 'bg-blue-100 text-blue-800'
      case 'personal_training': return 'bg-purple-100 text-purple-800'
      case 'group_class': return 'bg-green-100 text-green-800'
      case 'trial': return 'bg-orange-100 text-orange-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getDurationText = (days: number) => {
    if (days === 1) return '1 day'
    if (days < 30) return `${days} days`
    if (days === 30) return '1 month'
    if (days < 365) return `${Math.round(days / 30)} months`
    if (days === 365) return '1 year'
    return `${Math.round(days / 365)} years`
  }

  const calculateTotalPrice = (pkg: MembershipPackage) => {
    return pkg.price + (pkg.setup_fee || 0) + (pkg.security_deposit || 0)
  }

  const getFeatureValue = (pkg: MembershipPackage, feature: string) => {
    switch (feature) {
      case 'Duration':
        return getDurationText(pkg.duration_days)
      case 'Price':
        return formatCurrency(pkg.price)
      case 'Total Cost':
        return formatCurrency(calculateTotalPrice(pkg))
      case 'Setup Fee':
        return formatCurrency(pkg.setup_fee || 0)
      case 'Security Deposit':
        return formatCurrency(pkg.security_deposit || 0)
      case 'Personal Training Sessions':
        return pkg.pt_sessions_included.toString()
      case 'Guest Passes':
        return pkg.guest_passes.toString()
      case 'Freeze Days':
        return pkg.freeze_allowance.toString()
      case 'Max Sessions/Day':
        return pkg.max_sessions_per_day.toString()
      case 'Cancellation Period':
        return `${pkg.cancellation_period} days`
      case 'Refund Percentage':
        return `${pkg.refund_percentage}%`
      case 'Transfer Fee':
        return formatCurrency(pkg.transfer_fee)
      case 'Upgrade Allowed':
        return pkg.upgrade_allowed ? 'Yes' : 'No'
      case 'Downgrade Allowed':
        return pkg.downgrade_allowed ? 'Yes' : 'No'
      case 'Trial Package':
        return pkg.is_trial ? 'Yes' : 'No'
      case 'Featured':
        return pkg.is_featured ? 'Yes' : 'No'
      case 'Trainer Required':
        return pkg.trainer_required ? 'Yes' : 'No'
      default:
        return 'N/A'
    }
  }

  const comparisonFeatures = [
    'Duration',
    'Price',
    'Total Cost',
    'Setup Fee',
    'Security Deposit',
    'Personal Training Sessions',
    'Guest Passes',
    'Freeze Days',
    'Max Sessions/Day',
    'Cancellation Period',
    'Refund Percentage',
    'Transfer Fee',
    'Upgrade Allowed',
    'Downgrade Allowed',
    'Trial Package',
    'Featured',
    'Trainer Required'
  ]

  const availablePackages = packages.filter(pkg => pkg.is_active)

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Compare Packages</h2>
        <p className="text-gray-600">Select up to {maxPackages} packages to compare their features side by side</p>
      </div>

      {/* Package Selection */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Select Packages to Compare</CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                {selectedPackages.length} of {maxPackages} packages selected
              </p>
            </div>
            {selectedPackages.length > 0 && (
              <Button variant="outline" onClick={clearAll}>
                Clear All
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {availablePackages.map((pkg) => {
              const isSelected = selectedPackages.find(p => p.id === pkg.id)
              const canAdd = selectedPackages.length < maxPackages && !isSelected

              return (
                <div
                  key={pkg.id}
                  className={`p-4 border rounded-lg transition-all duration-200 ${
                    isSelected 
                      ? 'border-blue-500 bg-blue-50' 
                      : canAdd 
                        ? 'border-gray-200 hover:border-gray-300 cursor-pointer' 
                        : 'border-gray-200 opacity-50 cursor-not-allowed'
                  }`}
                  onClick={() => canAdd && addPackage(pkg)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-sm">{pkg.name}</h3>
                      <p className="text-xs text-gray-500">{formatCurrency(pkg.price)}</p>
                      <Badge className={`text-xs mt-1 ${getPackageTypeColor(pkg.package_type)}`}>
                        {pkg.package_type.replace('_', ' ')}
                      </Badge>
                    </div>
                    <div className="ml-2">
                      {isSelected ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation()
                            removePackage(pkg.id)
                          }}
                        >
                          <Minus className="w-4 h-4" />
                        </Button>
                      ) : canAdd ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation()
                            addPackage(pkg)
                          }}
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      ) : (
                        <div className="w-8 h-8 flex items-center justify-center text-gray-400">
                          <X className="w-4 h-4" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Comparison Table */}
      {selectedPackages.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Feature Comparison</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-48">Feature</TableHead>
                    {selectedPackages.map((pkg) => (
                      <TableHead key={pkg.id} className="text-center min-w-32">
                        <div className="space-y-2">
                          <div className="font-semibold">{pkg.name}</div>
                          <Badge className={getPackageTypeColor(pkg.package_type)}>
                            {pkg.package_type.replace('_', ' ')}
                          </Badge>
                          {pkg.is_featured && (
                            <Badge className="bg-yellow-100 text-yellow-800">
                              <Star className="w-3 h-3 mr-1" />
                              Featured
                            </Badge>
                          )}
                        </div>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {comparisonFeatures.map((feature) => (
                    <TableRow key={feature}>
                      <TableCell className="font-medium">{feature}</TableCell>
                      {selectedPackages.map((pkg) => (
                        <TableCell key={pkg.id} className="text-center">
                          <div className="flex items-center justify-center">
                            {getFeatureValue(pkg, feature) === 'Yes' ? (
                              <Check className="w-4 h-4 text-green-500" />
                            ) : getFeatureValue(pkg, feature) === 'No' ? (
                              <X className="w-4 h-4 text-red-500" />
                            ) : (
                              <span className="text-sm">
                                {getFeatureValue(pkg, feature)}
                              </span>
                            )}
                          </div>
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-center space-x-4 mt-6">
              {selectedPackages.map((pkg) => (
                <Button
                  key={pkg.id}
                  onClick={() => onSelectPackage(pkg)}
                  className="min-w-32"
                >
                  Select {pkg.name}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {selectedPackages.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <Shield className="w-12 h-12 mx-auto" />
            </div>
            <h3 className="text-lg font-semibold text-gray-600 mb-2">No packages selected</h3>
            <p className="text-gray-500">
              Select packages from the list above to compare their features
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
