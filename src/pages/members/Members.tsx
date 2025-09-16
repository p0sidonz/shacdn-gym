import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Search, 
  Filter, 
  MoreHorizontal,
  Phone,
  Mail,
  Calendar,
  DollarSign,
  User,
  AlertCircle,
  CheckCircle2,
  Clock,
  TrendingUp,
  QrCode,
  Grid3X3,
  List
} from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import { useMembers, useMemberStats } from '@/hooks/useMembers'
import { useAuth } from '@/context/AuthContext'
import { PaymentService } from '@/services/paymentService'
import { MembershipService } from '@/services/membershipService'
import type { MemberWithDetails } from '@/types'
import { AddMemberDialog } from '@/components/members/AddMemberSheet'
import { MemberDetailsDialog } from '@/components/members/MemberDetailsDialog'
import { DetailedMemberProfile } from '@/components/members/DetailedMemberProfile'
import { MemberQRGenerator } from '@/components/members/MemberQRGenerator'

const Members = () => {
  const { gymId } = useAuth()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTab, setSelectedTab] = useState('all')
  const [selectedMember, setSelectedMember] = useState<MemberWithDetails | null>(null)
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table')

  // Auto-switch to cards on mobile
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) { // mobile breakpoint
        setViewMode('cards')
      }
    }
    
    handleResize() // Check on mount
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])
  
  // Debounced search term for the hook
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('')
  
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
    }, 500) // Debounce search

    return () => clearTimeout(timeoutId)
  }, [searchTerm])
  
  // Use hooks for data management (skip when on QR codes tab since it has its own data loading)
  const { 
    members, 
    loading, 
    error, 
    refreshMembers
  } = useMembers({ 
    gym_id: selectedTab === 'qr-codes' ? undefined : (gymId || undefined),
    status: selectedTab === 'all' || selectedTab === 'qr-codes' ? undefined : selectedTab,
    search: selectedTab === 'qr-codes' ? undefined : (debouncedSearchTerm || undefined)
  })
  
  const { 
    stats, 
    loading: statsLoading
  } = useMemberStats(gymId || '')

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800">Active</Badge>
      case 'trial':
        return <Badge className="bg-blue-100 text-blue-800">Trial</Badge>
      case 'expired':
        return <Badge variant="destructive">Expired</Badge>
      case 'pending_payment':
        return <Badge className="bg-yellow-100 text-yellow-800">Payment Due</Badge>
      case 'suspended':
        return <Badge variant="secondary">Suspended</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  // Filter members based on search term (already handled by the hook)
  const filteredMembers = members

  const getTabCount = (status: string) => {
    if (!stats) return 0
    
    switch (status) {
      case 'all':
        return stats.total_members || 0
      case 'active':
        return stats.active_members || 0
      case 'trial':
        return stats.trial_members || 0
      case 'pending_payment':
        return stats.pending_payment_members || 0
      case 'expired':
        return stats.expired_members || 0
      case 'suspended':
        return stats.suspended_members || 0
      default:
        return 0
    }
  }

  const handleRecalculateAmounts = async () => {
    if (!gymId) return
    
    try {
      console.log('Recalculating membership amounts...')
      await PaymentService.recalculateAllMembershipAmounts(gymId)
      console.log('Membership amounts recalculated successfully')
      // Refresh members data to show updated amounts
      refreshMembers()
      alert('Membership amounts have been recalculated successfully!')
    } catch (error) {
      console.error('Error recalculating amounts:', error)
      alert('Error recalculating amounts. Check console for details.')
    }
  }

  const handleCreatePaymentPlans = async () => {
    if (!gymId) return
    
    try {
      console.log('Creating payment plans for existing memberships...')
      
      // Get all active memberships without payment plans
      const memberships = await MembershipService.getMemberships({
        status: 'active'
      })
      
      let created = 0
      for (const membership of memberships || []) {
        if (!membership.payment_plan_id && !membership.is_trial && membership.total_amount_due > 0) {
          await MembershipService.createPaymentPlanForMembership(membership.id)
          created++
        }
      }
      
      console.log(`Created ${created} payment plans`)
      refreshMembers()
      alert(`Created ${created} payment plans for existing memberships!`)
    } catch (error) {
      console.error('Error creating payment plans:', error)
      alert('Error creating payment plans. Check console for details.')
    }
  }

  // Show detailed member profile if a member is selected
  if (selectedMember) {
    return (
      <DetailedMemberProfile 
        member={selectedMember} 
        onMemberUpdated={() => {
          refreshMembers()
          setSelectedMember(null)
        }}
        onBack={() => setSelectedMember(null)}
      />
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Members</h1>
          <p className="text-gray-600">Manage your gym members and memberships</p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline">
            <Filter className="w-4 h-4 mr-2" />
            Filter
          </Button>
          <AddMemberDialog onMemberAdded={() => {
            refreshMembers()
          }} />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Members
            </CardTitle>
            <User className="w-5 h-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {statsLoading ? '...' : stats?.total_members || 0}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {stats?.active_members || 0} active members
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              New This Month
            </CardTitle>
            <TrendingUp className="w-5 h-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {statsLoading ? '...' : stats?.new_this_month || 0}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {stats?.trial_members || 0} trial members
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Monthly Revenue
            </CardTitle>
            <DollarSign className="w-5 h-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {statsLoading ? '...' : formatCurrency(stats?.revenue_this_month || 0)}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {stats?.pending_payments || 0} pending payments
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Avg. Attendance
            </CardTitle>
            <CheckCircle2 className="w-5 h-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {statsLoading ? '...' : stats?.average_attendance || 0}%
            </div>
            <p className="text-xs text-gray-500 mt-1">
              This month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Members Table */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Members List</CardTitle>
              <CardDescription>Manage and track all your gym members</CardDescription>
            </div>
            <div className="flex space-x-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search members..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
              
              {/* View Toggle - Hidden on mobile */}
              <div className="hidden md:flex border rounded-lg">
                <Button
                  variant={viewMode === 'table' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('table')}
                  className="rounded-r-none"
                >
                  <List className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === 'cards' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('cards')}
                  className="rounded-l-none"
                >
                  <Grid3X3 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedTab} onValueChange={setSelectedTab}>
            <div className="relative">
              <TabsList className="flex w-full overflow-x-auto scrollbar-hide space-x-1 p-1">
                <TabsTrigger value="all" className="flex-shrink-0 whitespace-nowrap text-sm">
                  All <span className="ml-1">({getTabCount('all')})</span>
                </TabsTrigger>
                <TabsTrigger value="active" className="flex-shrink-0 whitespace-nowrap text-sm">
                  Active <span className="ml-1">({getTabCount('active')})</span>
                </TabsTrigger>
                <TabsTrigger value="trial" className="flex-shrink-0 whitespace-nowrap text-sm">
                  Trial <span className="ml-1">({getTabCount('trial')})</span>
                </TabsTrigger>
                <TabsTrigger value="pending_payment" className="flex-shrink-0 whitespace-nowrap text-sm">
                  Due <span className="ml-1">({getTabCount('pending_payment')})</span>
                </TabsTrigger>
                <TabsTrigger value="expired" className="flex-shrink-0 whitespace-nowrap text-sm">
                  Expired <span className="ml-1">({getTabCount('expired')})</span>
                </TabsTrigger>
                <TabsTrigger value="suspended" className="flex-shrink-0 whitespace-nowrap text-sm">
                  Suspended <span className="ml-1">({getTabCount('suspended')})</span>
                </TabsTrigger>
                <TabsTrigger value="qr-codes" className="flex-shrink-0 whitespace-nowrap flex items-center gap-1 text-sm">
                  <QrCode className="w-3 h-3" />
                  <span className="hidden sm:inline">QR </span>Codes
                </TabsTrigger>
              </TabsList>
              
              {/* Scroll indicators */}
              <div className="absolute left-0 top-0 bottom-0 w-4 bg-gradient-to-r from-background to-transparent pointer-events-none md:hidden"></div>
              <div className="absolute right-0 top-0 bottom-0 w-4 bg-gradient-to-l from-background to-transparent pointer-events-none md:hidden"></div>
            </div>
            
            {selectedTab !== 'qr-codes' && (
              <TabsContent value={selectedTab} className="mt-6">
                {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-gray-500">Loading members...</div>
                </div>
              ) : error ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-red-500">Error loading members: {error}</div>
                </div>
              ) : viewMode === 'table' ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[180px]">Member</TableHead>
                        <TableHead className="min-w-[200px]">Contact</TableHead>
                        <TableHead className="min-w-[100px]">Status</TableHead>
                        <TableHead className="min-w-[150px]">Package</TableHead>
                        <TableHead className="min-w-[120px]">Trainer</TableHead>
                        <TableHead className="min-w-[200px]">Membership</TableHead>
                        <TableHead className="min-w-[120px]">Payment</TableHead>
                        <TableHead className="min-w-[100px]">Attendance</TableHead>
                        <TableHead className="min-w-[120px]">Last Visit</TableHead>
                        <TableHead className="min-w-[80px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                    {filteredMembers.map((member: MemberWithDetails) => (
                      <TableRow 
                        key={member.id} 
                        className="cursor-pointer hover:bg-gray-50"
                        onClick={() => setSelectedMember(member)}
                      >
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {member.profile ? `${member.profile.first_name} ${member.profile.last_name}` : 'N/A'}
                            </div>
                            <div className="text-sm text-gray-500">{member.member_id}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center text-sm">
                              <Phone className="w-3 h-3 mr-1 text-gray-400" />
                              {member.profile?.phone || 'N/A'}
                            </div>
                            <div className="flex items-center text-sm text-gray-500">
                              <Mail className="w-3 h-3 mr-1 text-gray-400" />
                              {member.profile?.email || 'N/A'}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(member.status)}
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {member.membership_package?.name || 'No Package'}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {member.assigned_trainer ? (
                            <div className="text-sm">
                              {member.assigned_trainer.profile ? 
                                `${member.assigned_trainer.profile.first_name} ${member.assigned_trainer.profile.last_name}` : 
                                member.assigned_trainer.employee_id
                              }
                            </div>
                          ) : (
                            <span className="text-gray-400 text-sm">Not assigned</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="text-sm">
                              {member.current_membership ? (
                                <>
                                  {formatDate(member.current_membership.start_date)} - {formatDate(member.current_membership.end_date)}
                                </>
                              ) : (
                                'No active membership'
                              )}
                            </div>
                            <div className="flex items-center text-xs text-gray-500">
                              <Calendar className="w-3 h-3 mr-1" />
                              {member.current_membership ? (
                                member.status === 'active' ? 
                                  (() => {
                                    const endDate = new Date(member.current_membership.end_date)
                                    if (isNaN(endDate.getTime())) return 'Invalid date'
                                    const daysLeft = Math.ceil((endDate.getTime() - new Date().getTime()) / (1000 * 3600 * 24))
                                    return `${daysLeft} days left`
                                  })() :
                                  member.status === 'expired' ? 'Expired' : 'Active'
                              ) : 'N/A'
                              }
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="text-sm font-medium text-green-600">
                              {member.current_membership ? formatCurrency(member.current_membership.amount_paid) : 'N/A'}
                            </div>
                            {member.current_membership && member.current_membership.amount_pending > 0 && (
                              <div className="text-xs text-red-600 flex items-center">
                                <AlertCircle className="w-3 h-3 mr-1" />
                                {formatCurrency(member.current_membership.amount_pending)} due
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <div className="text-sm font-medium">
                              {member.attendance_stats?.attendance_percentage || 0}%
                            </div>
                            <div className={`w-2 h-2 rounded-full ${
                              (member.attendance_stats?.attendance_percentage || 0) >= 80 ? 'bg-green-500' :
                              (member.attendance_stats?.attendance_percentage || 0) >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                            }`}></div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-gray-500">
                            {member.attendance_stats?.last_visit ? 
                              formatDate(new Date(member.attendance_stats.last_visit)) : 
                              'Never'
                            }
                          </div>
                        </TableCell>
                        <TableCell>
                          <MemberDetailsDialog 
                            member={member}
                            onMemberUpdated={() => {
                              refreshMembers()
                            }}
                          >
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </MemberDetailsDialog>
                        </TableCell>
                      </TableRow>
                    ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                // Card View
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredMembers.map((member: MemberWithDetails) => (
                    <Card 
                      key={member.id} 
                      className="cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => setSelectedMember(member)}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-lg">
                              {member.profile ? `${member.profile.first_name} ${member.profile.last_name}` : 'N/A'}
                            </CardTitle>
                            <p className="text-sm text-gray-500">{member.member_id}</p>
                          </div>
                          {getStatusBadge(member.status)}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {/* Contact Info */}
                        <div className="space-y-1">
                          <div className="flex items-center text-sm">
                            <Phone className="w-3 h-3 mr-2 text-gray-400" />
                            {member.profile?.phone || 'N/A'}
                          </div>
                          <div className="flex items-center text-sm text-gray-500">
                            <Mail className="w-3 h-3 mr-2 text-gray-400" />
                            {member.profile?.email || 'N/A'}
                          </div>
                        </div>

                        {/* Package Info */}
                        <div>
                          <p className="text-sm font-medium text-gray-700">Package</p>
                          <p className="text-sm text-gray-600">
                            {member.membership_package?.name || 'No Package'}
                          </p>
                        </div>

                        {/* Trainer Info */}
                        <div>
                          <p className="text-sm font-medium text-gray-700">Trainer</p>
                          <p className="text-sm text-gray-600">
                            {member.assigned_trainer ? (
                              member.assigned_trainer.profile ? 
                                `${member.assigned_trainer.profile.first_name} ${member.assigned_trainer.profile.last_name}` : 
                                member.assigned_trainer.employee_id
                            ) : (
                              'Not assigned'
                            )}
                          </p>
                        </div>

                        {/* Payment Info */}
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="text-sm font-medium text-green-600">
                              {member.current_membership ? formatCurrency(member.current_membership.amount_paid) : 'N/A'}
                            </p>
                            {member.current_membership && member.current_membership.amount_pending > 0 && (
                              <p className="text-xs text-red-600 flex items-center">
                                <AlertCircle className="w-3 h-3 mr-1" />
                                {formatCurrency(member.current_membership.amount_pending)} due
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium">
                              {member.attendance_stats?.attendance_percentage || 0}%
                            </p>
                            <p className="text-xs text-gray-500">Attendance</p>
                          </div>
                        </div>

                        {/* Membership Dates */}
                        {member.current_membership && (
                          <div className="text-xs text-gray-500 border-t pt-2">
                            <div className="flex items-center">
                              <Calendar className="w-3 h-3 mr-1" />
                              {formatDate(member.current_membership.start_date)} - {formatDate(member.current_membership.end_date)}
                            </div>
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex justify-end pt-2 border-t">
                          <MemberDetailsDialog 
                            member={member}
                            onMemberUpdated={() => {
                              refreshMembers()
                            }}
                          >
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </MemberDetailsDialog>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
              </TabsContent>
            )}

            <TabsContent value="qr-codes" className="mt-6">
              <MemberQRGenerator />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <AlertCircle className="w-5 h-5 mr-2 text-orange-600" />
              Payment Reminders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              {stats?.pending_payments || 0} members have pending payments
            </p>
            <Button variant="outline" className="w-full">
              Send Reminders
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Clock className="w-5 h-5 mr-2 text-blue-600" />
              Membership Renewals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              {stats?.expired_members || 0} memberships expiring this month
            </p>
            <Button variant="outline" className="w-full">
              View Renewals
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="w-5 h-5 mr-2 text-green-600" />
              Trial Conversions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              {stats?.trial_members || 0} trial members need follow-up
            </p>
            <Button variant="outline" className="w-full">
              Follow Up
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default Members
