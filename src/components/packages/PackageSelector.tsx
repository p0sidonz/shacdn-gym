import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Check, 
  Star, 
  Clock, 
  Users, 
  Dumbbell, 
  Shield, 
  Gift,
  ArrowRight,
  Info
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import type { MembershipPackage } from '@/types'

interface PackageSelectorProps {
  packages: MembershipPackage[]
  onSelectPackage: (pkg: MembershipPackage) => void
  selectedPackageId?: string
  showTrialOnly?: boolean
  className?: string
}

export const PackageSelector: React.FC<PackageSelectorProps> = ({
  packages,
  onSelectPackage,
  selectedPackageId,
  showTrialOnly = false,
  className = ''
}) => {
  const [selectedTab, setSelectedTab] = useState('all')

  const filteredPackages = packages.filter(pkg => {
    if (showTrialOnly) return pkg.is_trial
    if (selectedTab === 'all') return pkg.is_active
    if (selectedTab === 'trial') return pkg.is_trial
    if (selectedTab === 'featured') return pkg.is_featured
    if (selectedTab === 'personal_training') return pkg.package_type === 'personal_training'
    return pkg.package_type === selectedTab
  })

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

  const getSavingsText = (pkg: MembershipPackage) => {
    if (pkg.package_type === 'trial') return 'Trial Offer'
    if (pkg.duration_days >= 365) return 'Best Value'
    if (pkg.is_featured) return 'Popular Choice'
    return null
  }

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Choose Your Plan</h2>
        <p className="text-gray-600">Select the membership package that best fits your fitness goals</p>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="all">All Plans</TabsTrigger>
          <TabsTrigger value="trial">Trial</TabsTrigger>
          <TabsTrigger value="featured">Featured</TabsTrigger>
          <TabsTrigger value="personal_training">Personal Training</TabsTrigger>
          <TabsTrigger value="general">General</TabsTrigger>
        </TabsList>

        <TabsContent value={selectedTab} className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPackages.map((pkg) => (
              <Card 
                key={pkg.id} 
                className={`relative cursor-pointer transition-all duration-200 hover:shadow-lg ${
                  selectedPackageId === pkg.id 
                    ? 'ring-2 ring-blue-500 shadow-lg' 
                    : 'hover:shadow-md'
                } ${pkg.is_featured ? 'border-yellow-300' : ''}`}
                onClick={() => onSelectPackage(pkg)}
              >
                {pkg.is_featured && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-yellow-500 text-white px-3 py-1">
                      <Star className="w-3 h-3 mr-1" />
                      Featured
                    </Badge>
                  </div>
                )}

                {getSavingsText(pkg) && (
                  <div className="absolute -top-2 -right-2">
                    <Badge variant="destructive" className="text-xs">
                      {getSavingsText(pkg)}
                    </Badge>
                  </div>
                )}

                <CardHeader className="text-center pb-4">
                  <div className="space-y-2">
                    <CardTitle className="text-xl">{pkg.name}</CardTitle>
                    <CardDescription className="text-sm">
                      {pkg.description}
                    </CardDescription>
                    <Badge className={getPackageTypeColor(pkg.package_type)}>
                      {pkg.package_type.replace('_', ' ')}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Pricing */}
                  <div className="text-center">
                    <div className="text-3xl font-bold text-gray-900">
                      {formatCurrency(pkg.price)}
                    </div>
                    <div className="text-sm text-gray-500">
                      for {getDurationText(pkg.duration_days)}
                    </div>
                    {((pkg.setup_fee && pkg.setup_fee > 0) || (pkg.security_deposit && pkg.security_deposit > 0)) && (
                      <div className="text-xs text-gray-400 mt-1">
                        + {formatCurrency((pkg.setup_fee || 0) + (pkg.security_deposit || 0))} fees
                      </div>
                    )}
                    <div className="text-lg font-semibold text-gray-700 mt-2">
                      Total: {formatCurrency(calculateTotalPrice(pkg))}
                    </div>
                  </div>

                  {/* Features */}
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm text-gray-700">What's Included:</h4>
                    <ul className="space-y-1">
                      {pkg.features.slice(0, 5).map((feature, index) => (
                        <li key={index} className="flex items-center text-sm text-gray-600">
                          <Check className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                          {feature}
                        </li>
                      ))}
                      {pkg.features.length > 5 && (
                        <li className="text-xs text-gray-500">
                          +{pkg.features.length - 5} more features
                        </li>
                      )}
                    </ul>
                  </div>

                  {/* Special Features */}
                  <div className="space-y-2">
                    {pkg.pt_sessions_included > 0 && (
                      <div className="flex items-center text-sm text-purple-600">
                        <Dumbbell className="w-4 h-4 mr-2" />
                        {pkg.pt_sessions_included} Personal Training Sessions
                      </div>
                    )}
                    {pkg.guest_passes > 0 && (
                      <div className="flex items-center text-sm text-blue-600">
                        <Users className="w-4 h-4 mr-2" />
                        {pkg.guest_passes} Guest Passes
                      </div>
                    )}
                    {pkg.freeze_allowance > 0 && (
                      <div className="flex items-center text-sm text-green-600">
                        <Clock className="w-4 h-4 mr-2" />
                        {pkg.freeze_allowance} Freeze Days
                      </div>
                    )}
                    {pkg.is_trial && (
                      <div className="flex items-center text-sm text-orange-600">
                        <Gift className="w-4 h-4 mr-2" />
                        Trial Package
                      </div>
                    )}
                  </div>

                  {/* Restrictions */}
                  {pkg.restrictions && pkg.restrictions.length > 0 && (
                    <div className="space-y-1">
                      <h4 className="font-semibold text-sm text-gray-700">Restrictions:</h4>
                      <ul className="space-y-1">
                        {pkg.restrictions.slice(0, 2).map((restriction, index) => (
                          <li key={index} className="flex items-center text-xs text-gray-500">
                            <Info className="w-3 h-3 mr-1 flex-shrink-0" />
                            {restriction}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Action Button */}
                  <Button 
                    className={`w-full ${
                      selectedPackageId === pkg.id 
                        ? 'bg-blue-600 hover:bg-blue-700' 
                        : 'bg-gray-900 hover:bg-gray-800'
                    }`}
                    onClick={(e) => {
                      e.stopPropagation()
                      onSelectPackage(pkg)
                    }}
                  >
                    {selectedPackageId === pkg.id ? (
                      <>
                        <Check className="w-4 h-4 mr-2" />
                        Selected
                      </>
                    ) : (
                      <>
                        Select Plan
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredPackages.length === 0 && (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <Shield className="w-12 h-12 mx-auto" />
              </div>
              <h3 className="text-lg font-semibold text-gray-600 mb-2">No packages available</h3>
              <p className="text-gray-500">
                {showTrialOnly 
                  ? 'No trial packages are currently available.'
                  : 'No packages match your selected criteria.'
                }
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
