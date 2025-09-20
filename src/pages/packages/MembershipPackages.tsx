import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  Plus, 
  Search, 
  Edit, 
  Eye,
  Package,
  DollarSign,
  Calendar,
  Star,
  Loader2,
  Copy,
  ToggleLeft,
  ToggleRight,
  BarChart3,
  Calculator,
  FileText,
  GitCompare
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { useAuth } from '@/context/AuthContext'
import { useMembershipPackages } from '@/hooks/useMembershipPackages'
import { supabase } from '@/lib/supabase'
import { PackageComparison } from '@/components/packages/PackageComparison'
import { PackagePricingCalculator } from '@/components/packages/PackagePricingCalculator'
import { PackageAnalytics } from '@/components/packages/PackageAnalytics'
import { PackageTemplates } from '@/components/packages/PackageTemplates'
import type { MembershipPackage } from '@/types'

export default function MembershipPackages() {
  const { user } = useAuth()
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showViewDialog, setShowViewDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [selectedPackage, setSelectedPackage] = useState<MembershipPackage | null>(null)
  const [activeTab, setActiveTab] = useState('manage')

  // Add Package Form State
  const [packageForm, setPackageForm] = useState({
    name: '',
    description: '',
    package_type: 'general',
    duration_days: '',
    price: '',
    setup_fee: '',
    security_deposit: '',
    features: '',
    restrictions: '',
    is_trial: false,
    is_featured: false,
    trainer_required: false,
    pt_sessions_included: '',
    max_sessions_per_day: '1',
    max_sessions_per_week: '',
    max_sessions_per_month: '',
    guest_passes: '0',
    freeze_allowance: '0',
    cancellation_period: '30',
    minimum_commitment_days: '0',
    refund_percentage: '0',
    transfer_fee: '0',
    upgrade_allowed: true,
    downgrade_allowed: false,
    package_category: '',
    terms_and_conditions: ''
  })

  const [submitLoading, setSubmitLoading] = useState(false)

  // Get gym_id from the user's gym
  const [gymId, setGymId] = useState<string | null>(null)

  // Use the new hook for package management
  const {
    packages,
    loading,
    createPackage,
    updatePackage,
    duplicatePackage,
    togglePackageStatus,
    searchPackages
  } = useMembershipPackages(gymId || undefined)

  useEffect(() => {
    const fetchGymId = async () => {
      if (!user?.id) return

      const { data: gym } = await supabase
        .from('gyms')
        .select('id')
        .eq('owner_id', user.id)
        .maybeSingle()

      if (gym) {
        setGymId(gym.id)
      }
    }

    fetchGymId()
  }, [user?.id])

  // Get filtered packages based on search and type filter
  const filteredPackages = searchPackages(searchTerm).filter(pkg => {
    if (typeFilter === 'all') return true
    return pkg.package_type === typeFilter
  })

  // Check if package has active memberships
  const checkPackageHasActiveMemberships = async (packageId: string) => {
    if (!gymId) return false
    
    try {
      const { data, error } = await supabase
        .from('memberships')
        .select('id')
        .eq('package_id', packageId)
        .in('status', ['active', 'trial', 'suspended', 'frozen', 'pending_payment'])
        .limit(1)

      if (error) throw error
      return data && data.length > 0
    } catch (error) {
      console.error('Error checking active memberships:', error)
      return false
    }
  }

  // View package handler
  const handleViewPackage = (pkg: MembershipPackage) => {
    setSelectedPackage(pkg)
    setShowViewDialog(true)
  }

  // Edit package handler
  const handleEditPackage = async (pkg: MembershipPackage) => {
    const hasActiveMemberships = await checkPackageHasActiveMemberships(pkg.id)
    
    if (hasActiveMemberships) {
      alert('This package has active memberships. You can only edit basic information like name, description, and features. Pricing and duration changes are not allowed.')
    }
    
    setSelectedPackage(pkg)
    setPackageForm({
      name: pkg.name,
      description: pkg.description || '',
      package_type: pkg.package_type,
      duration_days: pkg.duration_days.toString(),
      price: pkg.price.toString(),
      setup_fee: pkg.setup_fee?.toString() || '',
      security_deposit: pkg.security_deposit?.toString() || '',
      features: pkg.features.join(', '),
      restrictions: pkg.restrictions?.join(', ') || '',
      is_trial: pkg.is_trial,
      is_featured: pkg.is_featured,
      trainer_required: pkg.trainer_required,
      pt_sessions_included: pkg.pt_sessions_included.toString(),
      max_sessions_per_day: pkg.max_sessions_per_day.toString(),
      max_sessions_per_week: pkg.max_sessions_per_week?.toString() || '',
      max_sessions_per_month: pkg.max_sessions_per_month?.toString() || '',
      guest_passes: pkg.guest_passes.toString(),
      freeze_allowance: pkg.freeze_allowance.toString(),
      cancellation_period: pkg.cancellation_period.toString(),
      minimum_commitment_days: pkg.minimum_commitment_days.toString(),
      refund_percentage: pkg.refund_percentage.toString(),
      transfer_fee: pkg.transfer_fee.toString(),
      upgrade_allowed: pkg.upgrade_allowed,
      downgrade_allowed: pkg.downgrade_allowed,
      package_category: pkg.package_category || '',
      terms_and_conditions: pkg.terms_and_conditions || ''
    })
    setShowEditDialog(true)
  }

  // Update package handler
  const handleUpdatePackage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPackage) return

    try {
      setSubmitLoading(true)
      
      const packageData = {
        name: packageForm.name,
        description: packageForm.description,
        package_type: packageForm.package_type,
        duration_days: parseInt(packageForm.duration_days),
        price: parseFloat(packageForm.price),
        setup_fee: parseFloat(packageForm.setup_fee) || 0,
        security_deposit: parseFloat(packageForm.security_deposit) || 0,
        features: packageForm.features.split(',').map(f => f.trim()).filter(f => f),
        restrictions: packageForm.restrictions.split(',').map(r => r.trim()).filter(r => r),
        is_trial: packageForm.is_trial,
        is_featured: packageForm.is_featured,
        trainer_required: packageForm.trainer_required,
        pt_sessions_included: parseInt(packageForm.pt_sessions_included) || 0,
        max_sessions_per_day: parseInt(packageForm.max_sessions_per_day) || 1,
        max_sessions_per_week: packageForm.max_sessions_per_week ? parseInt(packageForm.max_sessions_per_week) : undefined,
        max_sessions_per_month: packageForm.max_sessions_per_month ? parseInt(packageForm.max_sessions_per_month) : undefined,
        guest_passes: parseInt(packageForm.guest_passes) || 0,
        freeze_allowance: parseInt(packageForm.freeze_allowance) || 0,
        cancellation_period: parseInt(packageForm.cancellation_period) || 30,
        minimum_commitment_days: parseInt(packageForm.minimum_commitment_days) || 0,
        refund_percentage: parseFloat(packageForm.refund_percentage) || 0,
        transfer_fee: parseFloat(packageForm.transfer_fee) || 0,
        upgrade_allowed: packageForm.upgrade_allowed,
        downgrade_allowed: packageForm.downgrade_allowed,
        package_category: packageForm.package_category,
        terms_and_conditions: packageForm.terms_and_conditions
      }

      await updatePackage(selectedPackage.id, packageData)
      
      setShowEditDialog(false)
      setSelectedPackage(null)
      alert('Package updated successfully!')
    } catch (error) {
      console.error('Error updating package:', error)
      alert('Failed to update package. Please try again.')
    } finally {
      setSubmitLoading(false)
    }
  }

  const handleAddPackage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!gymId) return

    try {
      setSubmitLoading(true)
      
      const packageData = {
        gym_id: gymId,
        name: packageForm.name,
        description: packageForm.description,
        package_type: packageForm.package_type,
        duration_days: parseInt(packageForm.duration_days),
        price: parseFloat(packageForm.price),
        setup_fee: parseFloat(packageForm.setup_fee) || 0,
        security_deposit: parseFloat(packageForm.security_deposit) || 0,
        features: packageForm.features.split(',').map(f => f.trim()).filter(f => f),
        restrictions: packageForm.restrictions.split(',').map(r => r.trim()).filter(r => r),
        is_trial: packageForm.is_trial,
        is_featured: packageForm.is_featured,
        trainer_required: packageForm.trainer_required,
        pt_sessions_included: parseInt(packageForm.pt_sessions_included) || 0,
        max_sessions_per_day: parseInt(packageForm.max_sessions_per_day) || 1,
        max_sessions_per_week: packageForm.max_sessions_per_week ? parseInt(packageForm.max_sessions_per_week) : undefined,
        max_sessions_per_month: packageForm.max_sessions_per_month ? parseInt(packageForm.max_sessions_per_month) : undefined,
        guest_passes: parseInt(packageForm.guest_passes) || 0,
        freeze_allowance: parseInt(packageForm.freeze_allowance) || 0,
        cancellation_period: parseInt(packageForm.cancellation_period) || 30,
        minimum_commitment_days: parseInt(packageForm.minimum_commitment_days) || 0,
        refund_percentage: parseFloat(packageForm.refund_percentage) || 0,
        transfer_fee: parseFloat(packageForm.transfer_fee) || 0,
        upgrade_allowed: packageForm.upgrade_allowed,
        downgrade_allowed: packageForm.downgrade_allowed,
        package_category: packageForm.package_category,
        terms_and_conditions: packageForm.terms_and_conditions,
        is_active: true,
        display_order: packages.length + 1
      }

      await createPackage(packageData)

      // Reset form
      setPackageForm({
        name: '',
        description: '',
        package_type: 'general',
        duration_days: '',
        price: '',
        setup_fee: '',
        security_deposit: '',
        features: '',
        restrictions: '',
        is_trial: false,
        is_featured: false,
        trainer_required: false,
        pt_sessions_included: '',
        max_sessions_per_day: '1',
        max_sessions_per_week: '',
        max_sessions_per_month: '',
        guest_passes: '0',
        freeze_allowance: '0',
        cancellation_period: '30',
        minimum_commitment_days: '0',
        refund_percentage: '0',
        transfer_fee: '0',
        upgrade_allowed: true,
        downgrade_allowed: false,
        package_category: '',
        terms_and_conditions: ''
      })
      
      setShowAddDialog(false)
      alert('Package created successfully!')
    } catch (error) {
      console.error('Error creating package:', error)
      alert('Failed to create package. Please try again.')
    } finally {
      setSubmitLoading(false)
    }
  }

  const handleTogglePackageStatus = async (packageId: string, isActive: boolean) => {
    try {
      await togglePackageStatus(packageId, isActive)
      alert(`Package ${!isActive ? 'activated' : 'deactivated'} successfully!`)
    } catch (error) {
      console.error('Error updating package status:', error)
      alert('Failed to update package status.')
    }
  }

  const handleDuplicatePackage = async (originalPackage: MembershipPackage) => {
    try {
      await duplicatePackage(originalPackage)
      alert('Package duplicated successfully!')
    } catch (error) {
      console.error('Error duplicating package:', error)
      alert('Failed to duplicate package.')
    }
  }

  const getPackageTypeColor = (type: string) => {
    switch (type) {
      case 'general': return 'default'
      case 'personal_training': return 'secondary'
      case 'group_class': return 'outline'
      case 'trial': return 'destructive'
      default: return 'secondary'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2 text-lg">Loading packages...</span>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Membership Packages</h1>
          <p className="text-muted-foreground">
            Create and manage membership plans for your gym
          </p>
        </div>
        
        <div className="flex space-x-2">
          <Button
            variant={activeTab === 'manage' ? 'default' : 'outline'}
            onClick={() => setActiveTab('manage')}
          >
            <Package className="h-4 w-4 mr-2" />
            Manage
          </Button>
          <Button
            variant={activeTab === 'templates' ? 'default' : 'outline'}
            onClick={() => setActiveTab('templates')}
          >
            <FileText className="h-4 w-4 mr-2" />
            Templates
          </Button>
          <Button
            variant={activeTab === 'compare' ? 'default' : 'outline'}
            onClick={() => setActiveTab('compare')}
          >
            <GitCompare className="h-4 w-4 mr-2" />
            Compare
          </Button>
          <Button
            variant={activeTab === 'calculator' ? 'default' : 'outline'}
            onClick={() => setActiveTab('calculator')}
          >
            <Calculator className="h-4 w-4 mr-2" />
            Calculator
          </Button>
          <Button
            variant={activeTab === 'analytics' ? 'default' : 'outline'}
            onClick={() => setActiveTab('analytics')}
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            Analytics
          </Button>
        </div>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsContent value="manage" className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex space-x-2">
              <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Package
                  </Button>
                </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-screen overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Membership Package</DialogTitle>
              <DialogDescription>
                Define a new membership plan with pricing, features, and terms
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleAddPackage} className="space-y-6">
              <Tabs defaultValue="basic" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="basic">Basic Info</TabsTrigger>
                  <TabsTrigger value="pricing">Pricing</TabsTrigger>
                  <TabsTrigger value="features">Features</TabsTrigger>
                  <TabsTrigger value="policies">Policies</TabsTrigger>
                </TabsList>

                <TabsContent value="basic" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Package Name *</Label>
                      <Input
                        id="name"
                        value={packageForm.name}
                        onChange={(e) => setPackageForm(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="e.g., Premium Monthly"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="package_type">Package Type</Label>
                      <Select onValueChange={(value) => setPackageForm(prev => ({ ...prev, package_type: value }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="General" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="general">General</SelectItem>
                          <SelectItem value="personal_training">Personal Training</SelectItem>
                          <SelectItem value="group_class">Group Classes</SelectItem>
                          <SelectItem value="trial">Trial</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={packageForm.description}
                      onChange={(e) => setPackageForm(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Describe what this package includes..."
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="duration_days">Duration (Days) *</Label>
                      <Input
                        id="duration_days"
                        type="number"
                        value={packageForm.duration_days}
                        onChange={(e) => setPackageForm(prev => ({ ...prev, duration_days: e.target.value }))}
                        placeholder="30"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="package_category">Category</Label>
                      <Input
                        id="package_category"
                        value={packageForm.package_category}
                        onChange={(e) => setPackageForm(prev => ({ ...prev, package_category: e.target.value }))}
                        placeholder="e.g., Fitness, Yoga"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Package Options</Label>
                      <div className="flex flex-col space-y-2">
                        <label className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={packageForm.is_trial}
                            onChange={(e) => setPackageForm(prev => ({ ...prev, is_trial: e.target.checked }))}
                          />
                          <span className="text-sm">Trial Package</span>
                        </label>
                        <label className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={packageForm.is_featured}
                            onChange={(e) => setPackageForm(prev => ({ ...prev, is_featured: e.target.checked }))}
                          />
                          <span className="text-sm">Featured Package</span>
                        </label>
                        <label className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={packageForm.trainer_required}
                            onChange={(e) => setPackageForm(prev => ({ ...prev, trainer_required: e.target.checked }))}
                          />
                          <span className="text-sm">Requires Trainer</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="pricing" className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="price">Package Price *</Label>
                      <Input
                        id="price"
                        type="number"
                        step="0.01"
                        value={packageForm.price}
                        onChange={(e) => setPackageForm(prev => ({ ...prev, price: e.target.value }))}
                        placeholder="2500.00"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="setup_fee">Setup Fee</Label>
                      <Input
                        id="setup_fee"
                        type="number"
                        step="0.01"
                        value={packageForm.setup_fee}
                        onChange={(e) => setPackageForm(prev => ({ ...prev, setup_fee: e.target.value }))}
                        placeholder="500.00"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="security_deposit">Security Deposit</Label>
                      <Input
                        id="security_deposit"
                        type="number"
                        step="0.01"
                        value={packageForm.security_deposit}
                        onChange={(e) => setPackageForm(prev => ({ ...prev, security_deposit: e.target.value }))}
                        placeholder="1000.00"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="refund_percentage">Refund Percentage</Label>
                      <Input
                        id="refund_percentage"
                        type="number"
                        step="0.01"
                        value={packageForm.refund_percentage}
                        onChange={(e) => setPackageForm(prev => ({ ...prev, refund_percentage: e.target.value }))}
                        placeholder="80.00"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="transfer_fee">Transfer Fee</Label>
                      <Input
                        id="transfer_fee"
                        type="number"
                        step="0.01"
                        value={packageForm.transfer_fee}
                        onChange={(e) => setPackageForm(prev => ({ ...prev, transfer_fee: e.target.value }))}
                        placeholder="200.00"
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="features" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="features">Package Features</Label>
                    <Textarea
                      id="features"
                      value={packageForm.features}
                      onChange={(e) => setPackageForm(prev => ({ ...prev, features: e.target.value }))}
                      placeholder="Gym Access, Group Classes, Locker, Towel Service (comma separated)"
                      rows={3}
                    />
                    <p className="text-xs text-muted-foreground">Separate each feature with a comma</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="restrictions">Restrictions</Label>
                    <Textarea
                      id="restrictions"
                      value={packageForm.restrictions}
                      onChange={(e) => setPackageForm(prev => ({ ...prev, restrictions: e.target.value }))}
                      placeholder="Peak hours only, No guest access (comma separated)"
                      rows={2}
                    />
                  </div>

                  <div className="grid grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="pt_sessions_included">PT Sessions</Label>
                      <Input
                        id="pt_sessions_included"
                        type="number"
                        value={packageForm.pt_sessions_included}
                        onChange={(e) => setPackageForm(prev => ({ ...prev, pt_sessions_included: e.target.value }))}
                        placeholder="4"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="guest_passes">Guest Passes</Label>
                      <Input
                        id="guest_passes"
                        type="number"
                        value={packageForm.guest_passes}
                        onChange={(e) => setPackageForm(prev => ({ ...prev, guest_passes: e.target.value }))}
                        placeholder="2"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="max_sessions_per_day">Max Sessions/Day</Label>
                      <Input
                        id="max_sessions_per_day"
                        type="number"
                        value={packageForm.max_sessions_per_day}
                        onChange={(e) => setPackageForm(prev => ({ ...prev, max_sessions_per_day: e.target.value }))}
                        placeholder="1"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="freeze_allowance">Freeze Days</Label>
                      <Input
                        id="freeze_allowance"
                        type="number"
                        value={packageForm.freeze_allowance}
                        onChange={(e) => setPackageForm(prev => ({ ...prev, freeze_allowance: e.target.value }))}
                        placeholder="7"
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="policies" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="cancellation_period">Cancellation Period (Days)</Label>
                      <Input
                        id="cancellation_period"
                        type="number"
                        value={packageForm.cancellation_period}
                        onChange={(e) => setPackageForm(prev => ({ ...prev, cancellation_period: e.target.value }))}
                        placeholder="30"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="minimum_commitment_days">Minimum Commitment (Days)</Label>
                      <Input
                        id="minimum_commitment_days"
                        type="number"
                        value={packageForm.minimum_commitment_days}
                        onChange={(e) => setPackageForm(prev => ({ ...prev, minimum_commitment_days: e.target.value }))}
                        placeholder="0"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Upgrade/Downgrade Options</Label>
                      <div className="flex flex-col space-y-2">
                        <label className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={packageForm.upgrade_allowed}
                            onChange={(e) => setPackageForm(prev => ({ ...prev, upgrade_allowed: e.target.checked }))}
                          />
                          <span className="text-sm">Allow Upgrades</span>
                        </label>
                        <label className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={packageForm.downgrade_allowed}
                            onChange={(e) => setPackageForm(prev => ({ ...prev, downgrade_allowed: e.target.checked }))}
                          />
                          <span className="text-sm">Allow Downgrades</span>
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="terms_and_conditions">Terms and Conditions</Label>
                    <Textarea
                      id="terms_and_conditions"
                      value={packageForm.terms_and_conditions}
                      onChange={(e) => setPackageForm(prev => ({ ...prev, terms_and_conditions: e.target.value }))}
                      placeholder="Package-specific terms and conditions..."
                      rows={4}
                    />
                  </div>
                </TabsContent>
              </Tabs>

              <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitLoading}>
                  {submitLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Package'
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* View Package Dialog */}
        <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
          <DialogContent className="max-w-4xl max-h-screen overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Package Details</DialogTitle>
              <DialogDescription>
                View complete package information and settings
              </DialogDescription>
            </DialogHeader>
            
            {selectedPackage && (
              <div className="space-y-6">
                <Tabs defaultValue="basic" className="w-full">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="basic">Basic Info</TabsTrigger>
                    <TabsTrigger value="pricing">Pricing</TabsTrigger>
                    <TabsTrigger value="features">Features</TabsTrigger>
                    <TabsTrigger value="policies">Policies</TabsTrigger>
                  </TabsList>

                  <TabsContent value="basic" className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium">Package Name</Label>
                        <p className="text-sm text-muted-foreground">{selectedPackage.name}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Package Type</Label>
                        <p className="text-sm text-muted-foreground">
                          <Badge variant={getPackageTypeColor(selectedPackage.package_type)}>
                            {selectedPackage.package_type.replace('_', ' ')}
                          </Badge>
                        </p>
                      </div>
                    </div>

                    <div>
                      <Label className="text-sm font-medium">Description</Label>
                      <p className="text-sm text-muted-foreground">{selectedPackage.description || 'No description'}</p>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label className="text-sm font-medium">Duration</Label>
                        <p className="text-sm text-muted-foreground">{selectedPackage.duration_days} days</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Category</Label>
                        <p className="text-sm text-muted-foreground">{selectedPackage.package_category || 'No category'}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Status</Label>
                        <p className="text-sm text-muted-foreground">
                          <Badge variant={selectedPackage.is_active ? 'default' : 'secondary'}>
                            {selectedPackage.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </p>
                      </div>
                    </div>

                    <div>
                      <Label className="text-sm font-medium">Package Options</Label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {selectedPackage.is_trial && <Badge variant="outline">Trial Package</Badge>}
                        {selectedPackage.is_featured && <Badge variant="outline">Featured Package</Badge>}
                        {selectedPackage.trainer_required && <Badge variant="outline">Requires Trainer</Badge>}
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="pricing" className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label className="text-sm font-medium">Package Price</Label>
                        <p className="text-sm text-muted-foreground">{formatCurrency(selectedPackage.price)}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Setup Fee</Label>
                        <p className="text-sm text-muted-foreground">{formatCurrency(selectedPackage.setup_fee || 0)}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Security Deposit</Label>
                        <p className="text-sm text-muted-foreground">{formatCurrency(selectedPackage.security_deposit || 0)}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium">Refund Percentage</Label>
                        <p className="text-sm text-muted-foreground">{selectedPackage.refund_percentage}%</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Transfer Fee</Label>
                        <p className="text-sm text-muted-foreground">{formatCurrency(selectedPackage.transfer_fee)}</p>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="features" className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium">Package Features</Label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {selectedPackage.features.map((feature, index) => (
                          <Badge key={index} variant="outline">{feature}</Badge>
                        ))}
                      </div>
                    </div>

                    <div>
                      <Label className="text-sm font-medium">Restrictions</Label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {selectedPackage.restrictions?.map((restriction, index) => (
                          <Badge key={index} variant="destructive">{restriction}</Badge>
                        )) || <span className="text-sm text-muted-foreground">No restrictions</span>}
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-4">
                      <div>
                        <Label className="text-sm font-medium">PT Sessions</Label>
                        <p className="text-sm text-muted-foreground">{selectedPackage.pt_sessions_included}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Guest Passes</Label>
                        <p className="text-sm text-muted-foreground">{selectedPackage.guest_passes}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Max Sessions/Day</Label>
                        <p className="text-sm text-muted-foreground">{selectedPackage.max_sessions_per_day}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Freeze Days</Label>
                        <p className="text-sm text-muted-foreground">{selectedPackage.freeze_allowance}</p>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="policies" className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium">Cancellation Period</Label>
                        <p className="text-sm text-muted-foreground">{selectedPackage.cancellation_period} days</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Minimum Commitment</Label>
                        <p className="text-sm text-muted-foreground">{selectedPackage.minimum_commitment_days} days</p>
                      </div>
                    </div>

                    <div>
                      <Label className="text-sm font-medium">Upgrade/Downgrade Options</Label>
                      <div className="flex gap-4 mt-2">
                        <div className="flex items-center space-x-2">
                          <input type="checkbox" checked={selectedPackage.upgrade_allowed} disabled />
                          <span className="text-sm">Allow Upgrades</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input type="checkbox" checked={selectedPackage.downgrade_allowed} disabled />
                          <span className="text-sm">Allow Downgrades</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <Label className="text-sm font-medium">Terms and Conditions</Label>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {selectedPackage.terms_and_conditions || 'No terms specified'}
                      </p>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            )}

            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={() => setShowViewDialog(false)}>
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Package Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="max-w-4xl max-h-screen overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Package</DialogTitle>
              <DialogDescription>
                Update package information and settings
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleUpdatePackage} className="space-y-6">
              <Tabs defaultValue="basic" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="basic">Basic Info</TabsTrigger>
                  <TabsTrigger value="pricing">Pricing</TabsTrigger>
                  <TabsTrigger value="features">Features</TabsTrigger>
                  <TabsTrigger value="policies">Policies</TabsTrigger>
                </TabsList>

                <TabsContent value="basic" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit_name">Package Name *</Label>
                      <Input
                        id="edit_name"
                        value={packageForm.name}
                        onChange={(e) => setPackageForm(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="e.g., Premium Monthly"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit_package_type">Package Type</Label>
                      <Select 
                        value={packageForm.package_type}
                        onValueChange={(value) => setPackageForm(prev => ({ ...prev, package_type: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="General" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="general">General</SelectItem>
                          <SelectItem value="personal_training">Personal Training</SelectItem>
                          <SelectItem value="group_class">Group Classes</SelectItem>
                          <SelectItem value="trial">Trial</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit_description">Description</Label>
                    <Textarea
                      id="edit_description"
                      value={packageForm.description}
                      onChange={(e) => setPackageForm(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Describe what this package includes..."
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit_duration_days">Duration (Days) *</Label>
                      <Input
                        id="edit_duration_days"
                        type="number"
                        value={packageForm.duration_days}
                        onChange={(e) => setPackageForm(prev => ({ ...prev, duration_days: e.target.value }))}
                        placeholder="30"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit_package_category">Category</Label>
                      <Input
                        id="edit_package_category"
                        value={packageForm.package_category}
                        onChange={(e) => setPackageForm(prev => ({ ...prev, package_category: e.target.value }))}
                        placeholder="e.g., Fitness, Yoga"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Package Options</Label>
                      <div className="flex flex-col space-y-2">
                        <label className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={packageForm.is_trial}
                            onChange={(e) => setPackageForm(prev => ({ ...prev, is_trial: e.target.checked }))}
                          />
                          <span className="text-sm">Trial Package</span>
                        </label>
                        <label className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={packageForm.is_featured}
                            onChange={(e) => setPackageForm(prev => ({ ...prev, is_featured: e.target.checked }))}
                          />
                          <span className="text-sm">Featured Package</span>
                        </label>
                        <label className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={packageForm.trainer_required}
                            onChange={(e) => setPackageForm(prev => ({ ...prev, trainer_required: e.target.checked }))}
                          />
                          <span className="text-sm">Requires Trainer</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="pricing" className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit_price">Package Price *</Label>
                      <Input
                        id="edit_price"
                        type="number"
                        step="0.01"
                        value={packageForm.price}
                        onChange={(e) => setPackageForm(prev => ({ ...prev, price: e.target.value }))}
                        placeholder="2500.00"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit_setup_fee">Setup Fee</Label>
                      <Input
                        id="edit_setup_fee"
                        type="number"
                        step="0.01"
                        value={packageForm.setup_fee}
                        onChange={(e) => setPackageForm(prev => ({ ...prev, setup_fee: e.target.value }))}
                        placeholder="500.00"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit_security_deposit">Security Deposit</Label>
                      <Input
                        id="edit_security_deposit"
                        type="number"
                        step="0.01"
                        value={packageForm.security_deposit}
                        onChange={(e) => setPackageForm(prev => ({ ...prev, security_deposit: e.target.value }))}
                        placeholder="1000.00"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit_refund_percentage">Refund Percentage</Label>
                      <Input
                        id="edit_refund_percentage"
                        type="number"
                        step="0.01"
                        value={packageForm.refund_percentage}
                        onChange={(e) => setPackageForm(prev => ({ ...prev, refund_percentage: e.target.value }))}
                        placeholder="80.00"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit_transfer_fee">Transfer Fee</Label>
                      <Input
                        id="edit_transfer_fee"
                        type="number"
                        step="0.01"
                        value={packageForm.transfer_fee}
                        onChange={(e) => setPackageForm(prev => ({ ...prev, transfer_fee: e.target.value }))}
                        placeholder="200.00"
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="features" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit_features">Package Features</Label>
                    <Textarea
                      id="edit_features"
                      value={packageForm.features}
                      onChange={(e) => setPackageForm(prev => ({ ...prev, features: e.target.value }))}
                      placeholder="Gym Access, Group Classes, Locker, Towel Service (comma separated)"
                      rows={3}
                    />
                    <p className="text-xs text-muted-foreground">Separate each feature with a comma</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit_restrictions">Restrictions</Label>
                    <Textarea
                      id="edit_restrictions"
                      value={packageForm.restrictions}
                      onChange={(e) => setPackageForm(prev => ({ ...prev, restrictions: e.target.value }))}
                      placeholder="Peak hours only, No guest access (comma separated)"
                      rows={2}
                    />
                  </div>

                  <div className="grid grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit_pt_sessions_included">PT Sessions</Label>
                      <Input
                        id="edit_pt_sessions_included"
                        type="number"
                        value={packageForm.pt_sessions_included}
                        onChange={(e) => setPackageForm(prev => ({ ...prev, pt_sessions_included: e.target.value }))}
                        placeholder="4"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit_guest_passes">Guest Passes</Label>
                      <Input
                        id="edit_guest_passes"
                        type="number"
                        value={packageForm.guest_passes}
                        onChange={(e) => setPackageForm(prev => ({ ...prev, guest_passes: e.target.value }))}
                        placeholder="2"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit_max_sessions_per_day">Max Sessions/Day</Label>
                      <Input
                        id="edit_max_sessions_per_day"
                        type="number"
                        value={packageForm.max_sessions_per_day}
                        onChange={(e) => setPackageForm(prev => ({ ...prev, max_sessions_per_day: e.target.value }))}
                        placeholder="1"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit_freeze_allowance">Freeze Days</Label>
                      <Input
                        id="edit_freeze_allowance"
                        type="number"
                        value={packageForm.freeze_allowance}
                        onChange={(e) => setPackageForm(prev => ({ ...prev, freeze_allowance: e.target.value }))}
                        placeholder="7"
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="policies" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit_cancellation_period">Cancellation Period (Days)</Label>
                      <Input
                        id="edit_cancellation_period"
                        type="number"
                        value={packageForm.cancellation_period}
                        onChange={(e) => setPackageForm(prev => ({ ...prev, cancellation_period: e.target.value }))}
                        placeholder="30"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit_minimum_commitment_days">Minimum Commitment (Days)</Label>
                      <Input
                        id="edit_minimum_commitment_days"
                        type="number"
                        value={packageForm.minimum_commitment_days}
                        onChange={(e) => setPackageForm(prev => ({ ...prev, minimum_commitment_days: e.target.value }))}
                        placeholder="0"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Upgrade/Downgrade Options</Label>
                      <div className="flex flex-col space-y-2">
                        <label className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={packageForm.upgrade_allowed}
                            onChange={(e) => setPackageForm(prev => ({ ...prev, upgrade_allowed: e.target.checked }))}
                          />
                          <span className="text-sm">Allow Upgrades</span>
                        </label>
                        <label className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={packageForm.downgrade_allowed}
                            onChange={(e) => setPackageForm(prev => ({ ...prev, downgrade_allowed: e.target.checked }))}
                          />
                          <span className="text-sm">Allow Downgrades</span>
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit_terms_and_conditions">Terms and Conditions</Label>
                    <Textarea
                      id="edit_terms_and_conditions"
                      value={packageForm.terms_and_conditions}
                      onChange={(e) => setPackageForm(prev => ({ ...prev, terms_and_conditions: e.target.value }))}
                      placeholder="Package-specific terms and conditions..."
                      rows={4}
                    />
                  </div>
                </TabsContent>
              </Tabs>

              <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setShowEditDialog(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitLoading}>
                  {submitLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    'Update Package'
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
            </div>
          </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Packages</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{packages.length}</div>
            <p className="text-xs text-muted-foreground">
              {packages.filter(p => p.is_active).length} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Featured Packages</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {packages.filter(p => p.is_featured).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Highlighted packages
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Price</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {packages.length > 0 
                ? formatCurrency(packages.reduce((sum, p) => sum + p.price, 0) / packages.length)
                : formatCurrency(0)
              }
            </div>
            <p className="text-xs text-muted-foreground">
              Across all packages
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Trial Packages</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {packages.filter(p => p.is_trial).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Free trial offers
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Package Library</CardTitle>
            <div className="flex items-center space-x-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search packages..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 w-64"
                />
              </div>
              
              <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value)}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="personal_training">Personal Training</SelectItem>
                  <SelectItem value="group_class">Group Classes</SelectItem>
                  <SelectItem value="trial">Trial</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Package Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Features</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPackages.map((pkg) => (
                <TableRow key={pkg.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium flex items-center gap-2">
                        {pkg.name}
                        {pkg.is_featured && <Star className="h-4 w-4 text-yellow-500" />}
                        {pkg.is_trial && <Badge variant="outline" className="text-xs">Trial</Badge>}
                      </p>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {pkg.description}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getPackageTypeColor(pkg.package_type)}>
                      {pkg.package_type.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{pkg.duration_days} days</p>
                      {pkg.minimum_commitment_days > 0 && (
                        <p className="text-xs text-muted-foreground">
                          Min: {pkg.minimum_commitment_days} days
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{formatCurrency(pkg.price)}</p>
                      {((pkg.setup_fee && pkg.setup_fee > 0) || (pkg.security_deposit && pkg.security_deposit > 0)) && (
                        <p className="text-xs text-muted-foreground">
                          +{formatCurrency((pkg.setup_fee || 0) + (pkg.security_deposit || 0))} fees
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {pkg.pt_sessions_included > 0 && (
                        <Badge variant="outline" className="text-xs">
                          {pkg.pt_sessions_included} PT
                        </Badge>
                      )}
                      {pkg.guest_passes > 0 && (
                        <Badge variant="outline" className="text-xs">
                          {pkg.guest_passes} Guest
                        </Badge>
                      )}
                      {pkg.trainer_required && (
                        <Badge variant="outline" className="text-xs">
                          Trainer Req.
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Badge variant={pkg.is_active ? 'default' : 'secondary'}>
                        {pkg.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleViewPackage(pkg)}
                        title="View Package Details"
                      >
                        <Eye className="h-3 w-3" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleEditPackage(pkg)}
                        title="Edit Package"
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleDuplicatePackage(pkg)}
                        title="Duplicate Package"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleTogglePackageStatus(pkg.id, pkg.is_active)}
                        title={pkg.is_active ? "Deactivate Package" : "Activate Package"}
                      >
                        {pkg.is_active ? (
                          <ToggleRight className="h-3 w-3" />
                        ) : (
                          <ToggleLeft className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {filteredPackages.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm || typeFilter !== 'all' 
                ? 'No packages match your search criteria'
                : 'No packages created yet. Create your first membership package to get started.'
              }
            </div>
          )}
        </CardContent>
      </Card>
        </TabsContent>

        <TabsContent value="templates">
          {gymId && (
            <PackageTemplates
              gymId={gymId}
              onTemplateSelect={(template) => {
                // Pre-fill the form with template data
                setPackageForm({
                  name: template.name || '',
                  description: template.description || '',
                  package_type: template.package_type || 'general',
                  duration_days: template.duration_days?.toString() || '',
                  price: template.price?.toString() || '',
                  setup_fee: template.setup_fee?.toString() || '',
                  security_deposit: template.security_deposit?.toString() || '',
                  features: template.features?.join(', ') || '',
                  restrictions: template.restrictions?.join(', ') || '',
                  is_trial: template.is_trial || false,
                  is_featured: template.is_featured || false,
                  trainer_required: template.trainer_required || false,
                  pt_sessions_included: template.pt_sessions_included?.toString() || '',
                  max_sessions_per_day: template.max_sessions_per_day?.toString() || '1',
                  max_sessions_per_week: template.max_sessions_per_week?.toString() || '',
                  max_sessions_per_month: template.max_sessions_per_month?.toString() || '',
                  guest_passes: template.guest_passes?.toString() || '0',
                  freeze_allowance: template.freeze_allowance?.toString() || '0',
                  cancellation_period: template.cancellation_period?.toString() || '30',
                  minimum_commitment_days: template.minimum_commitment_days?.toString() || '0',
                  refund_percentage: template.refund_percentage?.toString() || '0',
                  transfer_fee: template.transfer_fee?.toString() || '0',
                  upgrade_allowed: template.upgrade_allowed || true,
                  downgrade_allowed: template.downgrade_allowed || false,
                  package_category: template.package_category || '',
                  terms_and_conditions: template.terms_and_conditions || ''
                })
                setShowAddDialog(true)
                setActiveTab('manage')
              }}
            />
          )}
        </TabsContent>

        <TabsContent value="compare">
          <PackageComparison
            packages={packages.filter(pkg => pkg.is_active)}
            onSelectPackage={(pkg) => {
              setSelectedPackage(pkg)
              setActiveTab('manage')
            }}
          />
        </TabsContent>

        <TabsContent value="calculator">
          <PackagePricingCalculator
            packages={packages.filter(pkg => pkg.is_active)}
            onCalculate={(result) => {
              console.log('Pricing calculation:', result)
            }}
          />
        </TabsContent>

        <TabsContent value="analytics">
          {gymId && <PackageAnalytics gymId={gymId} />}
        </TabsContent>
      </Tabs>
    </div>
  )
}
