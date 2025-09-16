import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CheckCircle } from 'lucide-react'
import { 
  TrendingUp, 
  TrendingDown,
  DollarSign, 
  Users, 
  Calendar,
  Gift,
  AlertTriangle,
  Clock,
  Target,
  BarChart3,
  PieChart,
  Activity,
  RefreshCw,
  Filter,
  Download,
  Eye,
  CreditCard,
  UserCheck,
  UserX,
  Cake,
  Bell
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { QuickAddMember } from '@/components/members/QuickAddMember'
import { formatCurrency, formatDate } from '@/lib/utils'

interface DashboardStats {
  todayIncome: number
  weekIncome: number
  monthIncome: number
  yearIncome: number
  totalMembers: number
  activeMembers: number
  expiringMembers: number
  overduePayments: number
  birthdaysToday: number
  birthdaysThisWeek: number
  newMembersToday: number
  newMembersThisWeek: number
}

interface IncomeData {
  date: string
  amount: number
  payments: number
}

interface MemberAlert {
  id: string
  name: string
  type: 'birthday' | 'expiry' | 'payment_due' | 'new_member'
  date: string
  amount?: number
  daysLeft?: number
}

export default function AnalyticsDashboard() {
  const { gymId } = useAuth()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [incomeChart, setIncomeChart] = useState<IncomeData[]>([])
  const [alerts, setAlerts] = useState<MemberAlert[]>([])
  
  // Filters
  const [dateRange, setDateRange] = useState('7') // days
  const [incomeFilter, setIncomeFilter] = useState('daily')
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])

  useEffect(() => {
    if (gymId) {
      loadDashboardData()
    }
  }, [gymId, dateRange, incomeFilter])

  const loadDashboardData = async () => {
    setLoading(true)
    try {
      await Promise.all([
        loadStats(),
        loadIncomeChart(),
        loadAlerts()
      ])
    } catch (error) {
      console.error('Error loading dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  const refreshData = async () => {
    setRefreshing(true)
    await loadDashboardData()
    setRefreshing(false)
  }

  const loadStats = async () => {
    const today = new Date()
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const startOfWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    const startOfYear = new Date(today.getFullYear(), 0, 1)

    // Today's income
    const { data: todayPayments } = await supabase
      .from('payments')
      .select('amount')
      .eq('gym_id', gymId)
      .gte('payment_date', startOfToday.toISOString())
      .eq('status', 'completed')

    // Week income
    const { data: weekPayments } = await supabase
      .from('payments')
      .select('amount')
      .eq('gym_id', gymId)
      .gte('payment_date', startOfWeek.toISOString())
      .eq('status', 'completed')

    // Month income
    const { data: monthPayments } = await supabase
      .from('payments')
      .select('amount')
      .eq('gym_id', gymId)
      .gte('payment_date', startOfMonth.toISOString())
      .eq('status', 'completed')

    // Year income
    const { data: yearPayments } = await supabase
      .from('payments')
      .select('amount')
      .eq('gym_id', gymId)
      .gte('payment_date', startOfYear.toISOString())
      .eq('status', 'completed')

    // Member stats
    const { data: members } = await supabase
      .from('members')
      .select('id, status, created_at')
      .eq('gym_id', gymId)

    const { data: memberships } = await supabase
      .from('memberships')
      .select('id, status, end_date')
      .eq('gym_id', gymId)

    // Birthdays
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, date_of_birth')
      .not('date_of_birth', 'is', null)

    const todayIncome = todayPayments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0
    const weekIncome = weekPayments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0
    const monthIncome = monthPayments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0
    const yearIncome = yearPayments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0

    const totalMembers = members?.length || 0
    const activeMembers = members?.filter(m => m.status === 'active').length || 0
    
    // Check expiring memberships (next 7 days)
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
    const expiringMembers = memberships?.filter(m => 
      m.status === 'active' && 
      new Date(m.end_date) <= nextWeek
    ).length || 0

    // Birthdays today and this week
    const birthdaysToday = profiles?.filter(p => {
      if (!p.date_of_birth) return false
      const birthDate = new Date(p.date_of_birth)
      return birthDate.getMonth() === today.getMonth() && 
             birthDate.getDate() === today.getDate()
    }).length || 0

    const birthdaysThisWeek = profiles?.filter(p => {
      if (!p.date_of_birth) return false
      const birthDate = new Date(p.date_of_birth)
      const thisWeekStart = new Date(today.getTime() - today.getDay() * 24 * 60 * 60 * 1000)
      const thisWeekEnd = new Date(thisWeekStart.getTime() + 7 * 24 * 60 * 60 * 1000)
      
      // Create this year's birthday
      const thisYearBirthday = new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate())
      
      return thisYearBirthday >= thisWeekStart && thisYearBirthday <= thisWeekEnd
    }).length || 0

    // New members
    const newMembersToday = members?.filter(m => 
      new Date(m.created_at) >= startOfToday
    ).length || 0

    const newMembersThisWeek = members?.filter(m => 
      new Date(m.created_at) >= startOfWeek
    ).length || 0

    setStats({
      todayIncome,
      weekIncome,
      monthIncome,
      yearIncome,
      totalMembers,
      activeMembers,
      expiringMembers,
      overduePayments: 0, // TODO: Calculate overdue
      birthdaysToday,
      birthdaysThisWeek,
      newMembersToday,
      newMembersThisWeek
    })
  }

  const loadIncomeChart = async () => {
    const days = parseInt(dateRange)
    const chartData: IncomeData[] = []
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      
      const { data: payments } = await supabase
        .from('payments')
        .select('amount')
        .eq('gym_id', gymId)
        .gte('payment_date', dateStr)
        .lt('payment_date', new Date(date.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0])
        .eq('status', 'completed')

      const amount = payments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0
      
      chartData.push({
        date: dateStr,
        amount,
        payments: payments?.length || 0
      })
    }
    
    setIncomeChart(chartData)
  }

  const loadAlerts = async () => {
    const today = new Date()
    const alertsData: MemberAlert[] = []

    // Birthdays today
    const { data: birthdayProfiles } = await supabase
      .from('profiles')
      .select(`
        id,
        first_name,
        last_name,
        date_of_birth,
        members!inner(
          id,
          gym_id
        )
      `)
      .eq('members.gym_id', gymId)
      .not('date_of_birth', 'is', null)

    birthdayProfiles?.forEach(profile => {
      if (profile.date_of_birth) {
        const birthDate = new Date(profile.date_of_birth)
        if (birthDate.getMonth() === today.getMonth() && 
            birthDate.getDate() === today.getDate()) {
          alertsData.push({
            id: profile.id,
            name: `${profile.first_name} ${profile.last_name}`,
            type: 'birthday',
            date: today.toISOString().split('T')[0]
          })
        }
      }
    })

    // Expiring memberships (next 7 days)
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
    const { data: expiringMemberships } = await supabase
      .from('memberships')
      .select(`
        id,
        end_date,
        members!inner(
          id,
          gym_id,
          profiles!inner(
            first_name,
            last_name
          )
        )
      `)
      .eq('members.gym_id', gymId)
      .eq('status', 'active')
      .lte('end_date', nextWeek.toISOString().split('T')[0])

    expiringMemberships?.forEach(membership => {
      const daysLeft = Math.ceil((new Date(membership.end_date).getTime() - today.getTime()) / (24 * 60 * 60 * 1000))
      alertsData.push({
        id: membership.id,
        name: `${membership.members?.profiles?.first_name} ${membership.members?.profiles?.last_name}`,
        type: 'expiry',
        date: membership.end_date,
        daysLeft
      })
    })

    // New members today
    const { data: newMembers } = await supabase
      .from('members')
      .select(`
        id,
        created_at,
        profiles!inner(
          first_name,
          last_name
        )
      `)
      .eq('gym_id', gymId)
      .gte('created_at', today.toISOString().split('T')[0])

    newMembers?.forEach(member => {
      alertsData.push({
        id: member.id,
        name: `${member.profiles?.first_name} ${member.profiles?.last_name}`,
        type: 'new_member',
        date: member.created_at.split('T')[0]
      })
    })

    setAlerts(alertsData)
  }

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'birthday': return <Cake className="w-4 h-4 text-pink-500" />
      case 'expiry': return <Clock className="w-4 h-4 text-orange-500" />
      case 'payment_due': return <CreditCard className="w-4 h-4 text-red-500" />
      case 'new_member': return <UserCheck className="w-4 h-4 text-green-500" />
      default: return <Bell className="w-4 h-4" />
    }
  }

  const getAlertColor = (type: string) => {
    switch (type) {
      case 'birthday': return 'bg-pink-50 border-pink-200 text-pink-800'
      case 'expiry': return 'bg-orange-50 border-orange-200 text-orange-800'
      case 'payment_due': return 'bg-red-50 border-red-200 text-red-800'
      case 'new_member': return 'bg-green-50 border-green-200 text-green-800'
      default: return 'bg-gray-50 border-gray-200 text-gray-800'
    }
  }

  const maxIncome = Math.max(...incomeChart.map(d => d.amount))

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Activity className="w-8 h-8 animate-pulse mx-auto mb-2" />
          <p>Loading analytics...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <BarChart3 className="h-8 w-8 text-primary" />
            Analytics Dashboard
          </h1>
          <p className="text-muted-foreground">
            Complete overview of your gym's performance and key metrics
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={refreshData}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <QuickAddMember onMemberAdded={() => {
            refreshData()
          }} />
        </div>
      </div>

      {/* Quick Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Today's Income */}
        <Card className="border-green-200 bg-gradient-to-br from-green-50 to-green-100">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-800">Today's Income</CardTitle>
            <DollarSign className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-900">{formatCurrency(stats?.todayIncome || 0)}</div>
            <p className="text-xs text-green-700 flex items-center gap-1 mt-1">
              <TrendingUp className="w-3 h-3" />
              From {incomeChart.find(d => d.date === selectedDate)?.payments || 0} payments
            </p>
          </CardContent>
        </Card>

        {/* Active Members */}
        <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-800">Active Members</CardTitle>
            <Users className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-900">{stats?.activeMembers || 0}</div>
            <p className="text-xs text-blue-700 flex items-center gap-1 mt-1">
              <UserCheck className="w-3 h-3" />
              {stats?.newMembersToday || 0} joined today
            </p>
          </CardContent>
        </Card>

        {/* Birthdays */}
        <Card className="border-pink-200 bg-gradient-to-br from-pink-50 to-pink-100">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-pink-800">Birthdays</CardTitle>
            <Cake className="h-5 w-5 text-pink-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-pink-900">{stats?.birthdaysToday || 0}</div>
            <p className="text-xs text-pink-700 flex items-center gap-1 mt-1">
              <Gift className="w-3 h-3" />
              {stats?.birthdaysThisWeek || 0} this week
            </p>
          </CardContent>
        </Card>

        {/* Expiring Soon */}
        <Card className="border-orange-200 bg-gradient-to-br from-orange-50 to-orange-100">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-orange-800">Expiring Soon</CardTitle>
            <AlertTriangle className="h-5 w-5 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-900">{stats?.expiringMembers || 0}</div>
            <p className="text-xs text-orange-700 flex items-center gap-1 mt-1">
              <Clock className="w-3 h-3" />
              Next 7 days
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Dashboard */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="income">Income</TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Income Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                  Income Overview
                </CardTitle>
                <CardDescription>Revenue breakdown by time period</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600">This Week</p>
                    <p className="text-xl font-bold text-green-600">{formatCurrency(stats?.weekIncome || 0)}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600">This Month</p>
                    <p className="text-xl font-bold text-blue-600">{formatCurrency(stats?.monthIncome || 0)}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600">This Year</p>
                    <p className="text-xl font-bold text-purple-600">{formatCurrency(stats?.yearIncome || 0)}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600">Average/Day</p>
                    <p className="text-xl font-bold text-orange-600">
                      {formatCurrency((stats?.monthIncome || 0) / 30)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Member Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-600" />
                  Member Statistics
                </CardTitle>
                <CardDescription>Member growth and activity</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Total Members</span>
                    <span className="font-medium">{stats?.totalMembers || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Active Members</span>
                    <span className="font-medium text-green-600">{stats?.activeMembers || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">New This Week</span>
                    <span className="font-medium text-blue-600">{stats?.newMembersThisWeek || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Expiring Soon</span>
                    <span className="font-medium text-orange-600">{stats?.expiringMembers || 0}</span>
                  </div>
                </div>
                
                {/* Activity Rate */}
                <div className="pt-2 border-t">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-600">Activity Rate</span>
                    <span className="font-medium">
                      {stats?.totalMembers ? Math.round((stats.activeMembers / stats.totalMembers) * 100) : 0}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all" 
                      style={{ 
                        width: `${stats?.totalMembers ? (stats.activeMembers / stats.totalMembers) * 100 : 0}%` 
                      }}
                    ></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Income Tab */}
        <TabsContent value="income" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-green-600" />
                    Income Chart
                  </CardTitle>
                  <CardDescription>Daily income trend over selected period</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="range-select" className="text-sm">Period:</Label>
                  <Select value={dateRange} onValueChange={setDateRange}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7">Last 7 days</SelectItem>
                      <SelectItem value="14">Last 14 days</SelectItem>
                      <SelectItem value="30">Last 30 days</SelectItem>
                      <SelectItem value="90">Last 3 months</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Simple Bar Chart */}
                <div className="space-y-2">
                  {incomeChart.map((data, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <div className="w-20 text-xs text-gray-600">
                        {formatDate(data.date)}
                      </div>
                      <div className="flex-1 flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-4 relative">
                          <div 
                            className="bg-gradient-to-r from-green-500 to-green-600 h-4 rounded-full transition-all duration-500"
                            style={{ 
                              width: maxIncome > 0 ? `${(data.amount / maxIncome) * 100}%` : '0%' 
                            }}
                          ></div>
                        </div>
                        <div className="w-20 text-sm font-medium text-right">
                          {formatCurrency(data.amount)}
                        </div>
                        <div className="w-16 text-xs text-gray-500 text-right">
                          {data.payments} pay
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Summary */}
                <div className="border-t pt-4">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-sm text-gray-600">Total Income</p>
                      <p className="text-lg font-bold text-green-600">
                        {formatCurrency(incomeChart.reduce((sum, d) => sum + d.amount, 0))}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Total Payments</p>
                      <p className="text-lg font-bold text-blue-600">
                        {incomeChart.reduce((sum, d) => sum + d.payments, 0)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Average/Day</p>
                      <p className="text-lg font-bold text-purple-600">
                        {formatCurrency(incomeChart.length > 0 ? incomeChart.reduce((sum, d) => sum + d.amount, 0) / incomeChart.length : 0)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Members Tab */}
        <TabsContent value="members" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-green-600" />
                  New Members
                </CardTitle>
                <CardDescription>Recent member registrations</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span>Today</span>
                    <Badge variant="outline">{stats?.newMembersToday || 0}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>This Week</span>
                    <Badge variant="outline">{stats?.newMembersThisWeek || 0}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Growth Rate</span>
                    <Badge variant="secondary">
                      {stats?.totalMembers && stats?.newMembersThisWeek 
                        ? `+${Math.round((stats.newMembersThisWeek / stats.totalMembers) * 100)}%`
                        : '0%'
                      }
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-orange-600" />
                  Membership Status
                </CardTitle>
                <CardDescription>Membership distribution</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span>Active</span>
                    <Badge className="bg-green-100 text-green-800">{stats?.activeMembers || 0}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Expiring Soon</span>
                    <Badge className="bg-orange-100 text-orange-800">{stats?.expiringMembers || 0}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Total</span>
                    <Badge variant="outline">{stats?.totalMembers || 0}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Alerts Tab */}
        <TabsContent value="alerts" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-red-600" />
                Today's Alerts & Notifications
              </CardTitle>
              <CardDescription>Important events and reminders for today</CardDescription>
            </CardHeader>
            <CardContent>
              {alerts.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-500" />
                  <p className="text-lg font-medium">All caught up!</p>
                  <p className="text-sm">No alerts or notifications for today</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {alerts.map((alert, index) => (
                    <div key={index} className={`p-3 rounded-lg border ${getAlertColor(alert.type)}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {getAlertIcon(alert.type)}
                          <div>
                            <p className="font-medium">{alert.name}</p>
                            <p className="text-sm opacity-75">
                              {alert.type === 'birthday' && 'Birthday today! 🎉'}
                              {alert.type === 'expiry' && `Membership expires in ${alert.daysLeft} days`}
                              {alert.type === 'payment_due' && `Payment due: ${formatCurrency(alert.amount || 0)}`}
                              {alert.type === 'new_member' && 'New member joined today!'}
                            </p>
                          </div>
                        </div>
                        <div className="text-xs opacity-75">
                          {formatDate(alert.date)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
