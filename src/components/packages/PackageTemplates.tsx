import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 


  Plus, 
  Star, 
  Clock, 
  Users, 
  Dumbbell,
  Check,
  ArrowRight,
  Info
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { MembershipPackageService } from '@/services/membershipPackageService'
import type { MembershipPackage } from '@/types'

interface PackageTemplatesProps {
  gymId: string
  onTemplateSelect: (template: Partial<MembershipPackage>) => void
  className?: string
}

export const PackageTemplates: React.FC<PackageTemplatesProps> = ({
  gymId,
  onTemplateSelect,
  className = ''
}) => {
  const [templates, setTemplates] = useState<Partial<MembershipPackage>[]>([])
  const [loading, setLoading] = useState(true)

  React.useEffect(() => {
    loadTemplates()
  }, [])

  const loadTemplates = async () => {
    try {
      setLoading(true)
      const templateData = await MembershipPackageService.getPackageTemplates()
      setTemplates(templateData)
    } catch (error) {
      console.error('Error loading templates:', error)
    } finally {
      setLoading(false)
    }
  }

  const getTemplateIcon = (type: string) => {
    switch (type) {
      case 'general': return <Dumbbell className="w-5 h-5" />
      case 'personal_training': return <Users className="w-5 h-5" />
      case 'trial': return <Clock className="w-5 h-5" />
      default: return <Clock className="w-5 h-5" />
    }
  }

  const getTemplateColor = (type: string) => {
    switch (type) {
      case 'general': return 'bg-blue-100 text-blue-800'
      case 'personal_training': return 'bg-purple-100 text-purple-800'
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

  const calculateTotalPrice = (template: Partial<MembershipPackage>) => {
    return (template.price || 0) + (template.setup_fee || 0) + (template.security_deposit || 0)
  }

  if (loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading templates...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Package Templates</h2>
        <p className="text-gray-600">Choose from pre-built package templates to get started quickly</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.map((template, index) => (
          <Card 
            key={index} 
            className="relative cursor-pointer transition-all duration-200 hover:shadow-lg"
          >
            {template.package_type === 'trial' && (
              <div className="absolute -top-2 -right-2">
                <Badge className="bg-orange-500 text-white">
                  <Clock className="w-3 h-3 mr-1" />
                  Trial
                </Badge>
              </div>
            )}

            <CardHeader className="text-center pb-4">
              <div className="space-y-2">
                <div className="flex items-center justify-center">
                  <div className={`p-2 rounded-full ${getTemplateColor(template.package_type || '')}`}>
                    {getTemplateIcon(template.package_type || '')}
                  </div>
                </div>
                <CardTitle className="text-xl">{template.name}</CardTitle>
                <CardDescription className="text-sm">
                  {template.description}
                </CardDescription>
                <Badge className={getTemplateColor(template.package_type || '')}>
                  {template.package_type?.replace('_', ' ')}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Pricing */}
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-900">
                  {formatCurrency(template.price || 0)}
                </div>
                <div className="text-sm text-gray-500">
                  for {getDurationText(template.duration_days || 0)}
                </div>
                {((template.setup_fee && template.setup_fee > 0) || (template.security_deposit && template.security_deposit > 0)) && (
                  <div className="text-xs text-gray-400 mt-1">
                    + {formatCurrency((template.setup_fee || 0) + (template.security_deposit || 0))} fees
                  </div>
                )}
                <div className="text-lg font-semibold text-gray-700 mt-2">
                  Total: {formatCurrency(calculateTotalPrice(template))}
                </div>
              </div>

              {/* Features */}
              <div className="space-y-2">
                <h4 className="font-semibold text-sm text-gray-700">What's Included:</h4>
                <ul className="space-y-1">
                  {template.features?.slice(0, 4).map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-center text-sm text-gray-600">
                      <Check className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                  {template.features && template.features.length > 4 && (
                    <li className="text-xs text-gray-500">
                      +{template.features.length - 4} more features
                    </li>
                  )}
                </ul>
              </div>

              {/* Special Features */}
              <div className="space-y-2">
                {template.pt_sessions_included && template.pt_sessions_included > 0 && (
                  <div className="flex items-center text-sm text-purple-600">
                    <Dumbbell className="w-4 h-4 mr-2" />
                    {template.pt_sessions_included} Personal Training Sessions
                  </div>
                )}
                {template.guest_passes && template.guest_passes > 0 && (
                  <div className="flex items-center text-sm text-blue-600">
                    <Users className="w-4 h-4 mr-2" />
                    {template.guest_passes} Guest Passes
                  </div>
                )}
                {template.freeze_allowance && template.freeze_allowance > 0 && (
                  <div className="flex items-center text-sm text-green-600">
                    <Clock className="w-4 h-4 mr-2" />
                    {template.freeze_allowance} Freeze Days
                  </div>
                )}
              </div>

              {/* Key Stats */}
              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="p-2 bg-gray-50 rounded">
                  <div className="text-sm font-semibold">{template.duration_days} days</div>
                  <div className="text-xs text-gray-500">Duration</div>
                </div>
                <div className="p-2 bg-gray-50 rounded">
                  <div className="text-sm font-semibold">
                    {template.max_sessions_per_day || 1}
                  </div>
                  <div className="text-xs text-gray-500">Max/Day</div>
                </div>
              </div>

              {/* Action Button */}
              <Button 
                className="w-full"
                onClick={() => onTemplateSelect(template)}
              >
                Use This Template
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Template Categories */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Info className="w-5 h-5 mr-2" />
            Template Categories
          </CardTitle>
          <CardDescription>
            Understanding different package types and their use cases
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 border rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <Dumbbell className="w-5 h-5 text-blue-600" />
                <h3 className="font-semibold">General</h3>
              </div>
              <p className="text-sm text-gray-600">
                Basic gym access packages for regular members
              </p>
            </div>

            <div className="p-4 border rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <Users className="w-5 h-5 text-purple-600" />
                <h3 className="font-semibold">Personal Training</h3>
              </div>
              <p className="text-sm text-gray-600">
                Packages with personal training sessions included
              </p>
            </div>

            <div className="p-4 border rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <Clock className="w-5 h-5 text-orange-600" />
                <h3 className="font-semibold">Trial</h3>
              </div>
              <p className="text-sm text-gray-600">
                Short-term packages to attract new members
              </p>
            </div>

            <div className="p-4 border rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <Star className="w-5 h-5 text-yellow-600" />
                <h3 className="font-semibold">Premium</h3>
              </div>
              <p className="text-sm text-gray-600">
                High-value packages with premium features
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
