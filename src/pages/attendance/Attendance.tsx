import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { 
  Users, 
  TrendingUp,
  Calendar,
  Clock,
  Filter,
  Download,
  Search,
  RefreshCw,
  LogIn,
  LogOut,
  AlertTriangle,
  CheckCircle,
  XCircle,
  QrCode,
  BarChart3,
  Activity,
  User,
  Package
} from 'lucide-react'
import { formatDate, formatTime, formatCurrency } from '@/lib/utils'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { QRCodeGenerator } from '@/components/attendance/QRCodeGenerator'

interface AttendanceRecord {
  id: string
  member_id: string
  membership_id: string
  date: string
  check_in_time: string
  check_out_time: string | null
  auto_checkout: boolean
  duration_minutes: number | null
  member: {
    member_id: string
    profiles: {
      first_name: string
      last_name: string
      phone: string
    }
  }
  membership: {
    status: string
    membership_packages: {
      name: string
      package_type: string
    }
  }
}

interface AttendanceStats {
  todayTotal: number
  todayCheckedIn: number
  yesterdayTotal: number
  weekTotal: number
  monthTotal: number
  averageDaily: number
  autoCheckouts: number
  peakHour: string
}

export default function AttendanceManagement() {
  const { gymId } = useAuth()
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([])
  const [stats, setStats] = useState<AttendanceStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  
  // Filters
  const [filters, setFilters] = useState({
    search: '',
    date_from: new Date().toISOString().split('T')[0], // Today
    date_to: new Date().toISOString().split('T')[0],
    status: 'all', // all, checked_in, checked_out, auto_checkout
    package_type: 'all',
    quick_filter: 'today' // today, yesterday, week, month, custom
  })

  const [packages, setPackages] = useState<any[]>([])

  useEffect(() => {
    if (gymId) {
      loadData()
      loadPackages()
    }
  }, [gymId, filters])

  useEffect(() => {
    // Set up auto-refresh every 30 seconds for real-time updates
    const interval = setInterval(() => {
      if (!refreshing) {
        refreshData()
      }
    }, 30000)

    return () => clearInterval(interval)
  }, [refreshing])

  const loadData = async () => {
    setLoading(true)
    try {
      await Promise.all([
        loadAttendance(),
        loadStats()
      ])
    } catch (error) {
      console.error('Error loading attendance data:', error)
    } finally {
      setLoading(false)
    }
  }

  const refreshData = async () => {
    setRefreshing(true)
    await loadData()
    setRefreshing(false)
  }

  const loadAttendance = async () => {
    try {
      let query = supabase
        .from('member_attendance')
        .select(`
          *,
          member:members!member_attendance_member_id_fkey (
            member_id,
            status,
            profiles!profile_id (
              first_name,
              last_name,
              phone
            )
          ),
          membership:memberships!member_attendance_membership_id_fkey (
            status,
            membership_packages!package_id (
              name,
              package_type
            )
          )
        `)
        .eq('member.gym_id', gymId)
        .gte('date', filters.date_from)
        .lte('date', filters.date_to)
        .order('check_in_time', { ascending: false })

      // Apply search filter
      if (filters.search) {
        // Note: This is a simplified search. In production, you might want to use full-text search
        query = query.or(`member.profiles.first_name.ilike.%${filters.search}%,member.profiles.last_name.ilike.%${filters.search}%,member.member_id.ilike.%${filters.search}%`)
      }

      const { data, error } = await query

      if (error) throw error

      let filteredData = data || []

      // Apply status filter
      if (filters.status !== 'all') {
        switch (filters.status) {
          case 'checked_in':
            filteredData = filteredData.filter(a => !a.check_out_time)
            break
          case 'checked_out':
            filteredData = filteredData.filter(a => a.check_out_time && !a.auto_checkout)
            break
          case 'auto_checkout':
            filteredData = filteredData.filter(a => a.auto_checkout)
            break
        }
      }

      // Apply package type filter
      if (filters.package_type !== 'all') {
        filteredData = filteredData.filter(a => 
          a.membership?.membership_packages?.package_type === filters.package_type
        )
      }

      setAttendance(filteredData)
    } catch (error) {
      console.error('Error loading attendance:', error)
    }
  }

  const loadStats = async () => {
    try {
      const today = new Date().toISOString().split('T')[0]
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    // Today's attendance
    const { data: todayAttendance } = await supabase
      .from('member_attendance')
      .select('*, member:members!member_attendance_member_id_fkey(gym_id)')
      .eq('member.gym_id', gymId)
      .eq('date', today)

    // Yesterday's attendance
    const { data: yesterdayAttendance } = await supabase
      .from('member_attendance')
      .select('*, member:members!member_attendance_member_id_fkey(gym_id)')
      .eq('member.gym_id', gymId)
      .eq('date', yesterday)

    // Week's attendance
    const { data: weekAttendance } = await supabase
      .from('member_attendance')
      .select('*, member:members!member_attendance_member_id_fkey(gym_id)')
      .eq('member.gym_id', gymId)
      .gte('date', weekAgo)

    // Month's attendance
    const { data: monthAttendance } = await supabase
      .from('member_attendance')
      .select('*, member:members!member_attendance_member_id_fkey(gym_id)')
      .eq('member.gym_id', gymId)
      .gte('date', monthAgo)

      const todayTotal = todayAttendance?.length || 0
      const todayCheckedIn = todayAttendance?.filter(a => !a.check_out_time).length || 0
      const yesterdayTotal = yesterdayAttendance?.length || 0
      const weekTotal = weekAttendance?.length || 0
      const monthTotal = monthAttendance?.length || 0
      const autoCheckouts = todayAttendance?.filter(a => a.auto_checkout).length || 0

      // Calculate peak hour (simplified)
      const peakHour = calculatePeakHour(todayAttendance || [])

      setStats({
        todayTotal,
        todayCheckedIn,
        yesterdayTotal,
        weekTotal,
        monthTotal,
        averageDaily: Math.round(weekTotal / 7),
        autoCheckouts,
        peakHour
      })
    } catch (error) {
      console.error('Error loading stats:', error)
    }
  }

  const loadPackages = async () => {
    try {
      const { data, error } = await supabase
        .from('membership_packages')
        .select('package_type')
        .eq('gym_id', gymId)
        .eq('is_active', true)

      if (error) throw error

      // Get unique package types
      const uniqueTypes = [...new Set(data?.map(p => p.package_type) || [])]
      setPackages(uniqueTypes)
    } catch (error) {
      console.error('Error loading packages:', error)
    }
  }

  const calculatePeakHour = (attendanceData: any[]) => {
    const hourCounts: { [key: string]: number } = {}
    
    attendanceData.forEach(record => {
      if (record.check_in_time) {
        const hour = new Date(record.check_in_time).getHours()
        const hourKey = `${hour}:00`
        hourCounts[hourKey] = (hourCounts[hourKey] || 0) + 1
      }
    })

    let peakHour = '9:00'
    let maxCount = 0
    
    Object.entries(hourCounts).forEach(([hour, count]) => {
      if (count > maxCount) {
        maxCount = count
        peakHour = hour
      }
    })

    return peakHour
  }

  const handleQuickFilter = (filter: string) => {
    const today = new Date()
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

    switch (filter) {
      case 'today':
        setFilters(prev => ({
          ...prev,
          quick_filter: filter,
          date_from: today.toISOString().split('T')[0],
          date_to: today.toISOString().split('T')[0]
        }))
        break
      case 'yesterday':
        setFilters(prev => ({
          ...prev,
          quick_filter: filter,
          date_from: yesterday.toISOString().split('T')[0],
          date_to: yesterday.toISOString().split('T')[0]
        }))
        break
      case 'week':
        setFilters(prev => ({
          ...prev,
          quick_filter: filter,
          date_from: weekAgo.toISOString().split('T')[0],
          date_to: today.toISOString().split('T')[0]
        }))
        break
      case 'month':
        setFilters(prev => ({
          ...prev,
          quick_filter: filter,
          date_from: monthAgo.toISOString().split('T')[0],
          date_to: today.toISOString().split('T')[0]
        }))
        break
    }
  }

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }))
  }

  const getStatusBadge = (record: AttendanceRecord) => {
    if (!record.check_out_time) {
      return <Badge className="bg-green-100 text-green-800 border-green-200">
        <LogIn className="w-3 h-3 mr-1" />
        Checked In
      </Badge>
    } else if (record.auto_checkout) {
      return <Badge className="bg-orange-100 text-orange-800 border-orange-200">
        <Clock className="w-3 h-3 mr-1" />
        Auto Checkout
      </Badge>
    } else {
      return <Badge className="bg-blue-100 text-blue-800 border-blue-200">
        <LogOut className="w-3 h-3 mr-1" />
        Checked Out
      </Badge>
    }
  }

  const calculateDuration = (checkIn: string, checkOut: string | null) => {
    if (!checkOut) return 'Still in gym'
    
    const inTime = new Date(checkIn)
    const outTime = new Date(checkOut)
    const diffMs = outTime.getTime() - inTime.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
    
    return `${diffHours}h ${diffMinutes}m`
  }

  const runAutoCheckout = async () => {
    try {
      setRefreshing(true)
      
      // Get all checked-in members from yesterday or earlier
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      yesterday.setHours(23, 59, 59, 999)
      
      const { data: pendingCheckouts, error } = await supabase
        .from('attendance')
        .select('*, member:members!attendance_member_id_fkey(gym_id)')
        .eq('member.gym_id', gymId)
        .is('check_out_time', null)
        .lt('check_in_time', yesterday.toISOString())

      if (error) throw error

      if (pendingCheckouts && pendingCheckouts.length > 0) {
        // Auto checkout all pending
        const checkoutTime = yesterday.toISOString()
        
        const { error: updateError } = await supabase
          .from('attendance')
          .update({
            check_out_time: checkoutTime,
            auto_checkout: true
          })
          .in('id', pendingCheckouts.map(p => p.id))

        if (updateError) throw updateError

        alert(`Auto-checkout completed for ${pendingCheckouts.length} members`)
        await refreshData()
      } else {
        alert('No pending checkouts found')
      }
    } catch (error) {
      console.error('Error running auto-checkout:', error)
      alert('Error running auto-checkout')
    } finally {
      setRefreshing(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Activity className="w-8 h-8 animate-pulse mx-auto mb-2" />
          <p>Loading attendance data...</p>
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
            <Activity className="h-8 w-8 text-primary" />
            Attendance Management
          </h1>
          <p className="text-muted-foreground">
            Track member check-ins, check-outs, and attendance analytics
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
          <Button
            variant="outline"
            size="sm"
            onClick={runAutoCheckout}
            disabled={refreshing}
          >
            <Clock className="h-4 w-4 mr-2" />
            Run Auto-Checkout
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button>
            <QrCode className="h-4 w-4 mr-2" />
            Generate QR Codes
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Visits</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats?.todayTotal || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.todayCheckedIn || 0} currently in gym
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Yesterday</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.yesterdayTotal || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.todayTotal && stats?.yesterdayTotal 
                ? `${stats.todayTotal > stats.yesterdayTotal ? '+' : ''}${stats.todayTotal - stats.yesterdayTotal} from yesterday`
                : 'No comparison available'
              }
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Week</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats?.weekTotal || 0}</div>
            <p className="text-xs text-muted-foreground">
              Avg {stats?.averageDaily || 0}/day
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Peak Hour</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{stats?.peakHour || '--'}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.autoCheckouts || 0} auto-checkouts today
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="list" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="list">Attendance List</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="members">Member Status</TabsTrigger>
          <TabsTrigger value="qr-codes">QR Codes</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-6">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="w-5 h-5" />
                Filters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Quick Filters */}
                <div>
                  <Label className="text-sm font-medium">Quick Filters</Label>
                  <div className="flex gap-2 mt-2">
                    {['today', 'yesterday', 'week', 'month'].map((filter) => (
                      <Button
                        key={filter}
                        variant={filters.quick_filter === filter ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handleQuickFilter(filter)}
                      >
                        {filter.charAt(0).toUpperCase() + filter.slice(1)}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Detailed Filters */}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  <div>
                    <Label htmlFor="search">Search Member</Label>
                    <div className="relative">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="search"
                        placeholder="Name, ID, phone..."
                        value={filters.search}
                        onChange={(e) => handleFilterChange('search', e.target.value)}
                        className="pl-8"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="date_from">From Date</Label>
                    <Input
                      id="date_from"
                      type="date"
                      value={filters.date_from}
                      onChange={(e) => handleFilterChange('date_from', e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="date_to">To Date</Label>
                    <Input
                      id="date_to"
                      type="date"
                      value={filters.date_to}
                      onChange={(e) => handleFilterChange('date_to', e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="status">Status</Label>
                    <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="checked_in">Currently In</SelectItem>
                        <SelectItem value="checked_out">Checked Out</SelectItem>
                        <SelectItem value="auto_checkout">Auto Checkout</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="package_type">Package Type</Label>
                    <Select value={filters.package_type} onValueChange={(value) => handleFilterChange('package_type', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Packages" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Packages</SelectItem>
                        {packages.map((pkg) => (
                          <SelectItem key={pkg} value={pkg}>
                            {pkg.charAt(0).toUpperCase() + pkg.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Attendance Table */}
          <Card>
            <CardHeader>
              <CardTitle>Attendance Records</CardTitle>
              <CardDescription>
                {attendance.length} attendance record(s) found
              </CardDescription>
            </CardHeader>
            <CardContent>
              {attendance.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Member</TableHead>
                      <TableHead>Package</TableHead>
                      <TableHead>Check In</TableHead>
                      <TableHead>Check Out</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {attendance.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {record.member?.profiles?.first_name} {record.member?.profiles?.last_name}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              ID: {record.member?.member_id} • {record.member?.profiles?.phone}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {record.membership?.membership_packages?.name}
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {record.membership?.membership_packages?.package_type}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {formatTime(new Date(record.check_in_time))}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {formatDate(new Date(record.check_in_time))}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {record.check_out_time ? (
                            <div>
                              <div className="font-medium">
                                {formatTime(new Date(record.check_out_time))}
                              </div>
                              {record.auto_checkout && (
                                <div className="text-xs text-orange-600">Auto checkout</div>
                              )}
                            </div>
                          ) : (
                            <div className="text-sm text-green-600 font-medium">Still in gym</div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">
                            {calculateDuration(record.check_in_time, record.check_out_time)}
                          </div>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(record)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Activity className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Attendance Records</h3>
                  <p>No attendance records found for the selected criteria</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Weekly Trend */}
            <Card>
              <CardHeader>
                <CardTitle>Weekly Attendance Trend</CardTitle>
                <CardDescription>Daily attendance for the last 7 days</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500">Chart implementation would go here</p>
                <div className="space-y-2 mt-4">
                  <div className="flex justify-between">
                    <span>Average Daily</span>
                    <span className="font-medium">{stats?.averageDaily || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Peak Hour</span>
                    <span className="font-medium">{stats?.peakHour || '--'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total This Week</span>
                    <span className="font-medium">{stats?.weekTotal || 0}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Package Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Package Distribution</CardTitle>
                <CardDescription>Attendance by membership type</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500">Package distribution chart would go here</p>
                <div className="space-y-2 mt-4">
                  {packages.map((pkg, index) => (
                    <div key={pkg} className="flex justify-between">
                      <span className="capitalize">{pkg}</span>
                      <span className="font-medium">
                        {attendance.filter(a => a.membership?.membership_packages?.package_type === pkg).length}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="members" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Currently in Gym</CardTitle>
              <CardDescription>
                Members who are currently checked in
              </CardDescription>
            </CardHeader>
            <CardContent>
              {attendance.filter(a => !a.check_out_time).length > 0 ? (
                <div className="space-y-3">
                  {attendance.filter(a => !a.check_out_time).map((record) => (
                    <div key={record.id} className="flex items-center justify-between p-3 border rounded-lg bg-green-50">
                      <div className="flex items-center gap-3">
                        <User className="w-8 h-8 text-green-600 bg-green-100 rounded-full p-2" />
                        <div>
                          <div className="font-medium">
                            {record.member?.profiles?.first_name} {record.member?.profiles?.last_name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {record.membership?.membership_packages?.name} • Checked in at {formatTime(new Date(record.check_in_time))}
                          </div>
                        </div>
                      </div>
                      <Badge className="bg-green-100 text-green-800 border-green-200">
                        <LogIn className="w-3 h-3 mr-1" />
                        In Gym
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Members Currently in Gym</h3>
                  <p>All members have checked out</p>
                </div>
              )}
            </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="qr-codes" className="space-y-6">
            <QRCodeGenerator />
          </TabsContent>
        </Tabs>
      </div>
    )
  }
