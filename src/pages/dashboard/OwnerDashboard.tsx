import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Calendar,
  AlertCircle,
  Loader2,
  Gift,
  TrendingUp,
  Phone,
  MessageSquare,
  CreditCard,
  Receipt
} from 'lucide-react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js'
import { Line, Bar, Doughnut } from 'react-chartjs-2'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
)
import { formatCurrency, formatDate } from '@/lib/utils'
import { useAuth } from '@/context/AuthContext'
import { useGym } from '@/hooks/useGym'
import { useMembers } from '@/hooks/useMembers'
import { usePayments } from '@/hooks/usePayments'
import { useRefunds } from '@/hooks/useRefunds'
import { useInquiries } from '@/hooks/useInquiries'
import { useExpenses } from '@/hooks/useExpenses'
import GymSetup from '@/components/gym/GymSetup'
import { QuickAddMember } from '@/components/members/QuickAddMember'
import { supabase } from '@/lib/supabase'

export default function OwnerDashboard() {
  const { profile } = useAuth()
  const { gym } = useGym()
  
  // Hooks for different data
  const { members } = useMembers({ gym_id: gym?.id })
  const { payments } = usePayments({ gym_id: gym?.id })
  const { refunds } = useRefunds({ gym_id: gym?.id })
  const { inquiries } = useInquiries()
  const { expenses } = useExpenses({ gym_id: gym?.id })
  
  const [loading, setLoading] = useState(true)
  const [upcomingBirthdays, setUpcomingBirthdays] = useState<any[]>([])
  const [recentFollowUps, setRecentFollowUps] = useState<any[]>([])
  const [recentIncome, setRecentIncome] = useState<any[]>([])
  const [expiringMemberships, setExpiringMemberships] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState('overview')
  const [stats, setStats] = useState<any>({
    members: { total: 0, active: 0, trial: 0 },
    payments: { totalRevenue: 0, monthlyRevenue: 0, pendingAmount: 0, todayCollection: 0 },
    memberships: { total: 0, expiring_soon: 0 },
    refunds: { total: 0, pending: 0, processed: 0 },
    inquiries: { total: 0, new: 0, converted: 0 },
    followUps: { total: 0, pending: 0, completed: 0 },
    expenses: { total: 0, monthly: 0, today: 0 }
  })

  // Debug: Log all birthday data
  console.log('🎂 All birthday data:', upcomingBirthdays.map(member => ({
    name: `${member.profile?.first_name} ${member.profile?.last_name}`,
    birthDate: member.profile?.date_of_birth,
    profileKeys: Object.keys(member.profile || {}),
    today: new Date().toDateString()
  })))
  
  // Debug: Check if any members have date_of_birth
  const membersWithBirthdays = upcomingBirthdays.filter(member => member.profile?.date_of_birth)
  console.log('🎂 Members with birthdays:', membersWithBirthdays.length, 'out of', upcomingBirthdays.length)
  
  // Debug: Show today's date info
  const today = new Date()
  console.log('🎂 Today\'s date info:', {
    today: today.toDateString(),
    month: today.getMonth(),
    date: today.getDate(),
    year: today.getFullYear()
  })
  
  // Debug: Show specific member with 1993-09-22 birthday
  const testMember = upcomingBirthdays.find(member => 
    member.profile?.date_of_birth === '1993-09-22' || 
    member.profile?.date_of_birth?.includes('1993-09-22')
  )
  if (testMember) {
    console.log('🎂 Found test member with 1993-09-22:', testMember)
  } else {
    console.log('🎂 Test member with 1993-09-22 not found')
    // Show all date formats we have
    console.log('🎂 All date formats found:', upcomingBirthdays.map(member => ({
      name: `${member.profile?.first_name} ${member.profile?.last_name}`,
      dateOfBirth: member.profile?.date_of_birth,
      dateType: typeof member.profile?.date_of_birth
    })))
  }

  // Helper functions for birthday filtering
  const isBirthdayToday = (member: any) => {
    const profile = member.profile as any
    if (!profile?.date_of_birth) return false
    const birthDate = new Date(profile.date_of_birth)
    const today = new Date()
    
    // Create this year's birthday date
    const thisYearBirthday = new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate())
    
    // If birthday has already passed this year, check next year
    if (thisYearBirthday < today) {
      thisYearBirthday.setFullYear(today.getFullYear() + 1)
    }
    
    // Check if birthday is today
    const isToday = thisYearBirthday.getMonth() === today.getMonth() && thisYearBirthday.getDate() === today.getDate()
    
    // Debug logging
    if (isToday) {
      console.log('🎂 Birthday today found:', {
        name: `${profile.first_name} ${profile.last_name}`,
        birthDate: profile.date_of_birth,
        thisYearBirthday: thisYearBirthday.toDateString(),
        today: today.toDateString()
      })
    }
    
    return isToday
  }

  const isBirthdayThisWeek = (member: any) => {
    const profile = member.profile as any
    if (!profile?.date_of_birth) return false
    const birthDate = new Date(profile.date_of_birth)
    const today = new Date()
    
    // Create this year's birthday date
    const thisYearBirthday = new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate())
    
    // If birthday has already passed this year, check next year
    if (thisYearBirthday < today) {
      thisYearBirthday.setFullYear(today.getFullYear() + 1)
    }
    
    // Check if birthday is within the next 7 days
    const weekEnd = new Date(today)
    weekEnd.setDate(today.getDate() + 7)
    
    const isThisWeek = thisYearBirthday >= today && thisYearBirthday <= weekEnd
    
    // Debug logging
    if (isThisWeek) {
      console.log('🎂 Birthday this week found:', {
        name: `${profile.first_name} ${profile.last_name}`,
        birthDate: profile.date_of_birth,
        thisYearBirthday: thisYearBirthday.toDateString(),
        today: today.toDateString(),
        weekEnd: weekEnd.toDateString()
      })
    }
    
    return isThisWeek
  }

  // Debug: Check today's birthdays specifically (after function declarations)
  const todayBirthdays = upcomingBirthdays.filter(isBirthdayToday)
  console.log('🎂 Today\'s birthdays count:', todayBirthdays.length)
  
  // Debug: Test the 1993-09-22 birthday specifically
  const testMemberWithBirthday = upcomingBirthdays.find(member => 
    member.profile?.date_of_birth === '1993-09-22' || 
    member.profile?.date_of_birth?.includes('1993-09-22')
  )
  if (testMemberWithBirthday) {
    const profile = testMemberWithBirthday.profile as any
    const birthDate = new Date(profile.date_of_birth)
    const thisYearBirthday = new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate())
    console.log('🎂 Test member birthday analysis:', {
      name: `${profile.first_name} ${profile.last_name}`,
      originalBirthDate: profile.date_of_birth,
      thisYearBirthday: thisYearBirthday.toDateString(),
      today: today.toDateString(),
      isToday: thisYearBirthday.getMonth() === today.getMonth() && thisYearBirthday.getDate() === today.getDate(),
      monthMatch: thisYearBirthday.getMonth() === today.getMonth(),
      dateMatch: thisYearBirthday.getDate() === today.getDate()
    })
  }

  // Chart data for Last 30 Days - using real payment data
  const last30DaysData = {
    labels: Array.from({ length: 30 }, (_, i) => {
      const date = new Date()
      date.setDate(date.getDate() - (29 - i))
      return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' })
    }),
    datasets: [
      {
        label: 'Income',
        data: Array.from({ length: 30 }, (_, i) => {
          const date = new Date()
          date.setDate(date.getDate() - (29 - i))
          const dayPayments = payments.filter(p => {
            const paymentDate = new Date(p.payment_date)
            return paymentDate.toDateString() === date.toDateString() && p.status === 'paid'
          })
          return dayPayments.reduce((sum, p) => sum + (p.amount || 0), 0)
        }),
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        tension: 0.4,
        fill: true,
      },
      {
        label: 'Expense',
        data: Array.from({ length: 30 }, (_, i) => {
          const date = new Date()
          date.setDate(date.getDate() - (29 - i))
          const dayExpenses = expenses.filter(e => {
            const expenseDate = new Date(e.expense_date)
            return expenseDate.toDateString() === date.toDateString()
          })
          return dayExpenses.reduce((sum, e) => sum + (e.amount || 0), 0)
        }),
        borderColor: 'rgb(249, 115, 22)',
        backgroundColor: 'rgba(249, 115, 22, 0.1)',
        tension: 0.4,
        fill: true,
      }
    ]
  }

  // Chart data for Income Comparison - using real payment data
  const incomeComparisonData = {
    labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
    datasets: [
      {
        label: 'Last Month',
        data: (() => {
          const lastMonth = new Date()
          lastMonth.setMonth(lastMonth.getMonth() - 1)
          const weeks = []
          for (let i = 0; i < 4; i++) {
            const weekStart = new Date(lastMonth)
            weekStart.setDate(lastMonth.getDate() - (lastMonth.getDate() % 7) + (i * 7))
            const weekEnd = new Date(weekStart)
            weekEnd.setDate(weekStart.getDate() + 6)
            
            const weekPayments = payments.filter(p => {
              const paymentDate = new Date(p.payment_date)
              return paymentDate >= weekStart && paymentDate <= weekEnd && p.status === 'paid'
            })
            weeks.push(weekPayments.reduce((sum, p) => sum + (p.amount || 0), 0))
          }
          return weeks
        })(),
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
        borderColor: 'rgb(59, 130, 246)',
        borderWidth: 1,
      },
      {
        label: 'Current Month',
        data: (() => {
          const currentMonth = new Date()
          const weeks = []
          for (let i = 0; i < 4; i++) {
            const weekStart = new Date(currentMonth)
            weekStart.setDate(currentMonth.getDate() - (currentMonth.getDate() % 7) + (i * 7))
            const weekEnd = new Date(weekStart)
            weekEnd.setDate(weekStart.getDate() + 6)
            
            const weekPayments = payments.filter(p => {
              const paymentDate = new Date(p.payment_date)
              return paymentDate >= weekStart && paymentDate <= weekEnd && p.status === 'paid'
            })
            weeks.push(weekPayments.reduce((sum, p) => sum + (p.amount || 0), 0))
          }
          return weeks
        })(),
        backgroundColor: 'rgba(249, 115, 22, 0.8)',
        borderColor: 'rgb(249, 115, 22)',
        borderWidth: 1,
      }
    ]
  }

  // Chart options
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          padding: 20,
        },
      },
      title: {
        display: false,
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: 'white',
        bodyColor: 'white',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
        },
        ticks: {
          callback: function(value: any) {
            return '₹' + value.toLocaleString()
          }
        }
      },
      x: {
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
        },
      },
    },
    interaction: {
      mode: 'nearest' as const,
      axis: 'x' as const,
      intersect: false,
    },
  }

  const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          padding: 20,
        },
      },
      title: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: 'white',
        bodyColor: 'white',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
        },
        ticks: {
          callback: function(value: any) {
            return '₹' + value.toLocaleString()
          }
        }
      },
      x: {
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
        },
      },
    },
  }

  // Function to get upcoming birthdays
  const getUpcomingBirthdays = async (filter: 'today' | 'week' | 'month') => {
    if (!gym?.id) return []

    try {
      const today = new Date()
      const startDate = new Date(today)
      let endDate = new Date(today)

      switch (filter) {
        case 'today':
          endDate = new Date(today)
          break
        case 'week':
          endDate.setDate(today.getDate() + 7)
          break
        case 'month':
          endDate.setMonth(today.getMonth() + 1)
          break
      }

      const { data, error } = await supabase
        .from('members')
        .select(`
          id,
          member_id,
          status,
          profile:profiles!inner(
            first_name,
            last_name,
            date_of_birth,
            phone
          )
        `)
        .eq('gym_id', gym.id)
        .not('profile.date_of_birth', 'is', null)

      if (error) throw error

      console.log('🎂 Raw birthday data from DB:', data?.map((member: any) => ({
        name: `${member.profile?.first_name} ${member.profile?.last_name}`,
        birthDate: member.profile?.date_of_birth,
        hasDateOfBirth: !!member.profile?.date_of_birth
      })))

      // Filter birthdays based on the selected period
      const birthdays = data?.filter(member => {
        const profile = member.profile as any
        if (!profile || !profile.date_of_birth) return false
        
        const birthDate = new Date(profile.date_of_birth)
        
        // For week filter, check if birthday falls within the week based on month and day
        if (filter === 'week') {
          // Check each day in the week range
          for (let i = 0; i <= 7; i++) {
            const checkDate = new Date(today)
            checkDate.setDate(today.getDate() + i)
            
            if (checkDate.getMonth() === birthDate.getMonth() && checkDate.getDate() === birthDate.getDate()) {
              return true
            }
          }
          return false
        }
        
        // For today filter, check if today matches the birthday month and day
        if (filter === 'today') {
          return today.getMonth() === birthDate.getMonth() && today.getDate() === birthDate.getDate()
        }
        
        // For month filter, check if birthday is in the current month
        if (filter === 'month') {
          return today.getMonth() === birthDate.getMonth()
        }
        
        return false
      }) || []

      console.log('🎂 Filtered birthdays for', filter, ':', birthdays.map((member: any) => ({
        name: `${member.profile?.first_name} ${member.profile?.last_name}`,
        birthDate: member.profile?.date_of_birth,
        birthMonth: new Date(member.profile?.date_of_birth).getMonth(),
        birthDay: new Date(member.profile?.date_of_birth).getDate()
      })))
      
      // Debug: Show date range and sample calculations
      console.log('🎂 Date range for', filter, ':', {
        startDate: startDate.toDateString(),
        endDate: endDate.toDateString(),
        today: today.toDateString()
      })
      
      // Debug: Show sample birthday calculations
      if (data && data.length > 0) {
        const sampleMember = data[0]
        const profile = sampleMember.profile as any
        if (profile?.date_of_birth) {
          const birthDate = new Date(profile.date_of_birth)
          const birthMonth = birthDate.getMonth()
          const birthDay = birthDate.getDate()
          
          console.log('🎂 Sample birthday calculation:', {
            name: `${profile.first_name} ${profile.last_name}`,
            originalBirthDate: profile.date_of_birth,
            birthMonth: birthMonth,
            birthDay: birthDay,
            todayMonth: today.getMonth(),
            todayDay: today.getDate(),
            isToday: today.getMonth() === birthMonth && today.getDate() === birthDay,
            filter: filter
          })
        }
      }

      // Sort by birthday date
      birthdays.sort((a, b) => {
        const profileA = a.profile as any
        const profileB = b.profile as any
        const dateA = new Date(profileA.date_of_birth)
        const dateB = new Date(profileB.date_of_birth)
        const currentYear = today.getFullYear()
        
        const birthdayA = new Date(currentYear, dateA.getMonth(), dateA.getDate())
        const birthdayB = new Date(currentYear, dateB.getMonth(), dateB.getDate())
        
        if (birthdayA < today) birthdayA.setFullYear(currentYear + 1)
        if (birthdayB < today) birthdayB.setFullYear(currentYear + 1)
        
        return birthdayA.getTime() - birthdayB.getTime()
      })

      return birthdays
    } catch (error) {
      console.error('Error fetching birthdays:', error)
      return []
    }
  }

  // Function to get recent income data
  const getRecentIncome = async () => {
    if (!gym?.id) return []

    try {
      const { data, error } = await supabase
        .from('payments')
        .select(`
          id,
          amount,
          payment_date,
          payment_method,
          status,
          member:members!inner(
            profile:profiles!inner(
              first_name,
              last_name
            )
          )
        `)
        .eq('gym_id', gym.id)
        .eq('status', 'paid')
        .order('payment_date', { ascending: false })
        .limit(10)

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching recent income:', error)
      return []
    }
  }

  // Function to get recent follow-ups
  const getRecentFollowUps = async () => {
    if (!gym?.id) return []

    try {
      const { data, error } = await supabase
        .from('inquiry_followups')
        .select(`
          id,
          followup_date,
          followup_method,
          status,
          notes,
          inquiry:inquiries!inner(
            name,
            phone,
            status
          ),
          staff:staff!inner(
            profile:profiles!inner(
              first_name,
              last_name
            )
          )
        `)
        .eq('inquiry.gym_id', gym.id)
        .order('followup_date', { ascending: false })
        .limit(10)

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching follow-ups:', error)
      return []
    }
  }

  // Function to get expiring memberships
  const getExpiringMemberships = async () => {
    if (!gym?.id) return []

    try {
      const today = new Date()
      const weekEnd = new Date(today)
      weekEnd.setDate(today.getDate() + 7)

      const { data, error } = await supabase
        .from('memberships')
        .select(`
          id,
          end_date,
          status,
          member:members!inner(
            profile:profiles!inner(
              first_name,
              last_name,
              phone
            )
          )
        `)
        .eq('member.gym_id', gym.id)
        .gte('end_date', today.toISOString().split('T')[0])
        .lte('end_date', weekEnd.toISOString().split('T')[0])
        .order('end_date', { ascending: true })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching expiring memberships:', error)
      return []
    }
  }

  // Quick Actions Functions
  const handleExpiredAttendance = () => {
    setActiveTab('attendance')
    // You can add more logic here to filter expired attendance
  }

  const handleTodayFollowUp = () => {
    setActiveTab('followups')
    // You can add more logic here to filter today's follow-ups
  }

  const handleTodayExpiry = () => {
    setActiveTab('expiries')
    // You can add more logic here to filter today's expiries
  }

  const handleFeedbackUser = () => {
    setActiveTab('feedback')
    // You can add more logic here for feedback
  }

  const handleBirthday = () => {
    setActiveTab('birthdays')
    // You can add more logic here for birthdays
  }

  useEffect(() => {
    const loadDashboardData = async () => {
      if (!gym?.id) return

      try {
        setLoading(true)
        
        const [
          birthdays,
          income,
          followUps,
          expiries
        ] = await Promise.all([
          getUpcomingBirthdays('week'), // Get all birthdays for the week, then filter in UI
          getRecentIncome(),
          getRecentFollowUps(),
          getExpiringMemberships()
        ])

        setUpcomingBirthdays(birthdays)
        setRecentIncome(income)
        setRecentFollowUps(followUps)
        setExpiringMemberships(expiries)

        // Calculate comprehensive stats
        const memberStats = {
          total: members.length,
          active: members.filter(m => m.status === 'active').length,
          trial: members.filter(m => m.status === 'trial').length
        }

        const paymentStats = {
          totalRevenue: payments.reduce((sum, p) => sum + (p.amount || 0), 0),
          monthlyRevenue: payments
            .filter(p => {
              const paymentDate = new Date(p.payment_date)
              const now = new Date()
              return paymentDate.getMonth() === now.getMonth() && 
                     paymentDate.getFullYear() === now.getFullYear()
            })
            .reduce((sum, p) => sum + (p.amount || 0), 0),
          pendingAmount: payments
            .filter(p => p.status === 'pending')
            .reduce((sum, p) => sum + (p.amount || 0), 0),
          todayCollection: payments
            .filter(p => {
              const paymentDate = new Date(p.payment_date)
              const today = new Date()
              return paymentDate.toDateString() === today.toDateString()
            })
            .reduce((sum, p) => sum + (p.amount || 0), 0)
        }

        const refundStats = {
          total: refunds.length,
          pending: refunds.filter(r => r.status === 'requested').length,
          processed: refunds.filter(r => r.status === 'processed').length
        }

        const inquiryStats = {
          total: inquiries.length,
          new: inquiries.filter(i => i.status === 'new').length,
          converted: inquiries.filter(i => i.status === 'converted').length
        }

        const followUpStats = {
          total: followUps.length,
          pending: followUps.filter(f => f.status === 'scheduled').length,
          completed: followUps.filter(f => f.status === 'completed').length
        }

        const expenseStats = {
          total: expenses.reduce((sum, e) => sum + (e.amount || 0), 0),
          monthly: expenses
            .filter(e => {
              const expenseDate = new Date(e.expense_date)
              const now = new Date()
              return expenseDate.getMonth() === now.getMonth() && 
                     expenseDate.getFullYear() === now.getFullYear()
            })
            .reduce((sum, e) => sum + (e.amount || 0), 0),
          today: expenses
            .filter(e => {
              const expenseDate = new Date(e.expense_date)
              const today = new Date()
              return expenseDate.toDateString() === today.toDateString()
            })
            .reduce((sum, e) => sum + (e.amount || 0), 0)
        }

        setStats({
          members: memberStats,
          payments: paymentStats,
          memberships: { total: 0, expiring_soon: 0 },
          refunds: refundStats,
          inquiries: inquiryStats,
          followUps: followUpStats,
          expenses: expenseStats
        })
      } catch (error) {
        console.error('Error loading dashboard data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadDashboardData()
  }, [gym?.id, members, payments, refunds, inquiries, expenses])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2 text-lg">Loading dashboard...</span>
      </div>
    )
  }

  if (!gym) {
    return <GymSetup />
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{gym.name} Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {profile?.first_name}! Here's what's happening at your gym today.
          </p>
        </div>
        <div className="flex gap-2">
          {/* <Button variant="outline">
            <Calendar className="h-4 w-4 mr-2" />
            View Calendar
          </Button> */}
          <QuickAddMember onMemberAdded={() => {
            // Refresh dashboard data when member is added
            window.location.reload()
          }} />
        </div>
      </div>

      {/* Main Dashboard Layout */}
      <div className="space-y-6">
        {/* Last 30 Days Data Graph */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Last 30 Days Data</CardTitle>
            <CardDescription>Income vs Expense trends over the last 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <Line data={last30DaysData} options={chartOptions} />
            </div>
          </CardContent>
        </Card>

        {/* Key Metrics Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2 md:gap-4">
          <Card className="text-center p-2 md:p-4 hover:shadow-md transition-shadow">
            <div className="text-lg md:text-2xl font-bold text-blue-600">{stats.members.active}/{stats.members.total}</div>
            <div className="text-xs md:text-sm text-gray-600">Active Member</div>
          </Card>
          
          <Card className="text-center p-2 md:p-4 hover:shadow-md transition-shadow">
            <div className="text-lg md:text-2xl font-bold text-purple-600">{stats.inquiries.new}</div>
            <div className="text-xs md:text-sm text-gray-600">Prospects</div>
          </Card>
          
          <Card className="text-center p-2 md:p-4 hover:shadow-md transition-shadow">
            <div className="text-lg md:text-2xl font-bold text-red-600">{stats.members.total - stats.members.active}</div>
            <div className="text-xs md:text-sm text-gray-600">Expired</div>
          </Card>
          
          <Card className="text-center p-2 md:p-4 hover:shadow-md transition-shadow">
            <div className="text-lg md:text-2xl font-bold text-orange-600">{stats.followUps.pending}</div>
            <div className="text-xs md:text-sm text-gray-600">Follow up</div>
          </Card>
          
          <Card className="text-center p-2 md:p-4 hover:shadow-md transition-shadow">
            <div className="text-lg md:text-2xl font-bold text-green-600 flex items-center justify-center gap-1">
              <TrendingUp className="h-3 w-3 md:h-4 md:w-4" />
              <span className="text-xs md:text-sm">₹{stats.payments.todayCollection || 0}</span>
            </div>
            <div className="text-xs md:text-sm text-gray-600">Today Income</div>
          </Card>
          
          <Card className="text-center p-2 md:p-4 hover:shadow-md transition-shadow">
            <div className="text-lg md:text-2xl font-bold text-yellow-600">₹{stats.payments.pendingAmount || 0}</div>
            <div className="text-xs md:text-sm text-gray-600">Mem. Due</div>
          </Card>
          
          <Card className="text-center p-2 md:p-4 hover:shadow-md transition-shadow">
            <div className="text-lg md:text-2xl font-bold text-indigo-600">₹0</div>
            <div className="text-xs md:text-sm text-gray-600">PT Due</div>
        </Card>

          <Card className="text-center p-2 md:p-4 hover:shadow-md transition-shadow">
            <div className="text-lg md:text-2xl font-bold text-gray-600">₹{stats.expenses?.monthly || 0}</div>
            <div className="text-xs md:text-sm text-gray-600">Expense</div>
          </Card>
        </div>

        {/* Charts and Demographics Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Income Comparison With Last Month</CardTitle>
              <CardDescription>Weekly income comparison between last month and current month</CardDescription>
          </CardHeader>
          <CardContent>
              <div className="h-48">
                <Bar data={incomeComparisonData} options={barChartOptions} />
            </div>
          </CardContent>
        </Card>

        <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Member Demographics</CardTitle>
              <CardDescription>Gender distribution and inquiry statistics</CardDescription>
          </CardHeader>
          <CardContent>
              <div className="space-y-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">Enquiry: {stats.inquiries.total}</div>
                </div>
                <div className="h-32">
                  <Doughnut 
                    data={{
                      labels: ['Male', 'Female'],
                      datasets: [{
                        data: [Math.floor(stats.members.total * 0.7), Math.floor(stats.members.total * 0.3)],
                        backgroundColor: ['rgba(59, 130, 246, 0.8)', 'rgba(236, 72, 153, 0.8)'],
                        borderColor: ['rgb(59, 130, 246)', 'rgb(236, 72, 153)'],
                        borderWidth: 2,
                      }]
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          position: 'bottom' as const,
                        },
                      },
                    }}
                  />
                </div>
                <div className="text-center">
                  <div className="text-sm text-gray-600">
                    Total Male: {Math.floor(stats.members.total * 0.7)} & Female: {Math.floor(stats.members.total * 0.3)} | Ratio 7:3
                  </div>
                </div>
              </div>
          </CardContent>
        </Card>
      </div>

        {/* Today Birthday and Quick Actions */}
      

       
      </div>

      {/* Additional Data Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-6 gap-1">
          <TabsTrigger value="payments" className="flex items-center gap-1 md:gap-2 text-xs md:text-sm">
            <CreditCard className="w-3 h-3 md:w-4 md:h-4" />
            <span className="hidden sm:inline">Recent Payments</span>
            <span className="sm:hidden">Payments</span>
          </TabsTrigger>
          <TabsTrigger value="refunds" className="flex items-center gap-1 md:gap-2 text-xs md:text-sm">
            <Receipt className="w-3 h-3 md:w-4 md:h-4" />
            <span className="hidden sm:inline">Refunds</span>
            <span className="sm:hidden">Refunds</span>
          </TabsTrigger>
          <TabsTrigger value="followups" className="flex items-center gap-1 md:gap-2 text-xs md:text-sm">
            <Phone className="w-3 h-3 md:w-4 md:h-4" />
            <span className="hidden sm:inline">Follow-ups</span>
            <span className="sm:hidden">Follow-ups</span>
          </TabsTrigger>
          <TabsTrigger value="inquiries" className="flex items-center gap-1 md:gap-2 text-xs md:text-sm">
            <MessageSquare className="w-3 h-3 md:w-4 md:h-4" />
            <span className="hidden sm:inline">Inquiries</span>
            <span className="sm:hidden">Inquiries</span>
          </TabsTrigger>
          <TabsTrigger value="expiries" className="flex items-center gap-1 md:gap-2 text-xs md:text-sm">
            <AlertCircle className="w-3 h-3 md:w-4 md:h-4" />
            <span className="hidden sm:inline">Today's Expiry</span>
            <span className="sm:hidden">Expiry</span>
          </TabsTrigger>
          <TabsTrigger value="birthdays" className="flex items-center gap-1 md:gap-2 text-xs md:text-sm">
            <Gift className="w-3 h-3 md:w-4 md:h-4" />
            <span className="hidden sm:inline">Birthdays</span>
            <span className="sm:hidden">Birthdays</span>
          </TabsTrigger>
        </TabsList>


        {/* Payments Tab */}
        <TabsContent value="payments" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-green-500" />
                Recent Payments
              </CardTitle>
              <CardDescription>Latest payment transactions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentIncome.slice(0, 5).map((payment: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-green-600">
                          {payment.member?.profile?.first_name?.[0]}{payment.member?.profile?.last_name?.[0]}
                        </span>
                      </div>
                    <div>
                        <div className="font-semibold">{payment.member?.profile?.first_name} {payment.member?.profile?.last_name}</div>
                        <div className="text-sm text-gray-600">{payment.payment_method}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-green-600">{formatCurrency(payment.amount)}</div>
                      <div className="text-xs text-gray-500">{formatDate(new Date(payment.payment_date))}</div>
                    </div>
                  </div>
                ))}
                {recentIncome.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <CreditCard className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>No recent payments</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Refunds Tab */}
        <TabsContent value="refunds" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5 text-red-500" />
                Recent Refunds
              </CardTitle>
              <CardDescription>Latest refund requests</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {refunds.slice(0, 5).map((refund: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-gradient-to-r from-red-50 to-orange-50 rounded-lg hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-red-600">
                          {refund.member?.profile?.first_name?.[0]}{refund.member?.profile?.last_name?.[0]}
                        </span>
                      </div>
                      <div>
                        <div className="font-semibold">{refund.member?.profile?.first_name} {refund.member?.profile?.last_name}</div>
                        <div className="text-sm text-gray-600">{refund.reason || 'Not specified'}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-red-600">{formatCurrency(refund.amount)}</div>
                      <Badge 
                        variant={refund.status === 'processed' ? 'default' : 'secondary'}
                        className={refund.status === 'processed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}
                      >
                        {refund.status}
                        </Badge>
                    </div>
                  </div>
                ))}
                {refunds.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Receipt className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>No refund requests</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Follow-ups Tab */}
        <TabsContent value="followups" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5 text-indigo-500" />
                Recent Follow-ups
              </CardTitle>
              <CardDescription>Latest follow-up activities</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentFollowUps.slice(0, 5).map((followUp: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-indigo-600">
                          {followUp.staff?.profile?.first_name?.[0]}{followUp.staff?.profile?.last_name?.[0]}
                        </span>
                      </div>
                      <div>
                        <div className="font-semibold">{followUp.inquiry?.name}</div>
                        <div className="text-sm text-gray-600">{followUp.followup_method}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-500">{formatDate(new Date(followUp.followup_date))}</div>
                      <Badge 
                        variant={followUp.status === 'completed' ? 'default' : 'secondary'}
                        className={followUp.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}
                      >
                        {followUp.status}
                        </Badge>
                    </div>
                  </div>
                ))}
                {recentFollowUps.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Phone className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>No follow-ups</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Inquiries Tab */}
        <TabsContent value="inquiries" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-purple-500" />
                Recent Inquiries
                  </CardTitle>
              <CardDescription>Latest inquiries and leads</CardDescription>
                </CardHeader>
                <CardContent>
              <div className="space-y-4">
                {inquiries.slice(0, 5).map((inquiry: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-purple-600">
                          {inquiry.name?.[0]}{inquiry.name?.split(' ')[1]?.[0]}
                        </span>
                      </div>
                      <div>
                        <div className="font-semibold">{inquiry.name}</div>
                        <div className="text-sm text-gray-600">{inquiry.phone}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-500">{formatDate(new Date(inquiry.created_at))}</div>
                      <Badge 
                        variant={inquiry.status === 'converted' ? 'default' : 'secondary'}
                        className={
                          inquiry.status === 'converted' ? 'bg-green-100 text-green-800' :
                          inquiry.status === 'new' ? 'bg-blue-100 text-blue-800' :
                          'bg-yellow-100 text-yellow-800'
                        }
                      >
                        {inquiry.status}
                      </Badge>
                    </div>
                  </div>
                ))}
                {inquiries.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>No inquiries</p>
                  </div>
                )}
              </div>
                </CardContent>
              </Card>
        </TabsContent>

        {/* Today's Expiry Tab */}
        <TabsContent value="expiries" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-orange-500" />
                Today's Expiring Memberships
              </CardTitle>
              <CardDescription>Memberships expiring today and this week</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Today's Expiries */}
                <div>
                  <h3 className="text-lg font-semibold mb-4 text-orange-600">Expiring Today</h3>
                  <div className="space-y-3">
                    {expiringMemberships.filter(membership => {
                      const today = new Date()
                      const expiryDate = new Date(membership.end_date)
                      return expiryDate.toDateString() === today.toDateString()
                    }).map((membership, index) => {
                      const profile = membership.member?.profile as any
                      return (
                        <div key={index} className="flex items-center gap-4 p-4 bg-gradient-to-r from-orange-50 to-red-50 rounded-lg hover:shadow-md transition-shadow">
                          <div className="w-12 h-12 bg-gradient-to-r from-orange-400 to-red-400 rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium text-white">
                              {profile?.first_name?.[0]}{profile?.last_name?.[0]}
                            </span>
                          </div>
                          <div className="flex-1">
                            <div className="font-semibold text-gray-800">{profile?.first_name} {profile?.last_name}</div>
                            <div className="text-sm text-gray-600">{profile?.phone}</div>
                            <div className="text-sm text-gray-500">
                              Expires: {new Date(membership.end_date).toLocaleDateString('en-GB')}
                            </div>
                          </div>
                          <Badge variant="destructive" className="bg-red-100 text-red-800">Expires Today</Badge>
                        </div>
                      )
                    })}
                    {expiringMemberships.filter(membership => {
                      const today = new Date()
                      const expiryDate = new Date(membership.end_date)
                      return expiryDate.toDateString() === today.toDateString()
                    }).length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        <AlertCircle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                        <p>No memberships expiring today</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* This Week's Expiries */}
                <div>
                  <h3 className="text-lg font-semibold mb-4 text-yellow-600">Expiring This Week</h3>
                  <div className="space-y-3">
                    {expiringMemberships.filter(membership => {
                      const today = new Date()
                      const weekEnd = new Date(today)
                      weekEnd.setDate(today.getDate() + 7)
                      const expiryDate = new Date(membership.end_date)
                      return expiryDate > today && expiryDate <= weekEnd
                    }).map((membership, index) => {
                      const profile = membership.member?.profile as any
                      const expiryDate = new Date(membership.end_date)
                      const today = new Date()
                      const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
                      
                      return (
                        <div key={index} className="flex items-center gap-4 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg hover:shadow-md transition-shadow">
                          <div className="w-12 h-12 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium text-white">
                              {profile?.first_name?.[0]}{profile?.last_name?.[0]}
                            </span>
                          </div>
                          <div className="flex-1">
                            <div className="font-semibold text-gray-800">{profile?.first_name} {profile?.last_name}</div>
                            <div className="text-sm text-gray-600">{profile?.phone}</div>
                            <div className="text-sm text-gray-500">
                              Expires: {expiryDate.toLocaleDateString('en-GB')} ({daysUntilExpiry} days)
                            </div>
                          </div>
                          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                            {daysUntilExpiry} days
                          </Badge>
                        </div>
                      )
                    })}
                    {expiringMemberships.filter(membership => {
                      const today = new Date()
                      const weekEnd = new Date(today)
                      weekEnd.setDate(today.getDate() + 7)
                      const expiryDate = new Date(membership.end_date)
                      return expiryDate > today && expiryDate <= weekEnd
                    }).length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        <AlertCircle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                        <p>No memberships expiring this week</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Birthdays Tab */}
        <TabsContent value="birthdays" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                <Gift className="h-5 w-5 text-pink-500" />
                Upcoming Birthdays
                  </CardTitle>
              <CardDescription>Today, this week, and this month birthdays</CardDescription>
                </CardHeader>
                <CardContent>
              <div className="space-y-6">
                {/* Today's Birthdays */}
                <div>
                  <h3 className="text-lg font-semibold mb-4 text-pink-600">Today's Birthdays</h3>
                  <div className="space-y-3">
                    {upcomingBirthdays.filter(isBirthdayToday).map((member, index) => {
                      const profile = member.profile as any
                      return (
                        <div key={index} className="flex items-center gap-4 p-4 bg-gradient-to-r from-pink-50 to-purple-50 rounded-lg hover:shadow-md transition-shadow">
                          <div className="w-12 h-12 bg-gradient-to-r from-pink-400 to-purple-400 rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium text-white">
                              {profile?.first_name?.[0]}{profile?.last_name?.[0]}
                            </span>
                          </div>
                          <div className="flex-1">
                            <div className="font-semibold text-gray-800">{profile?.first_name} {profile?.last_name}</div>
                            <div className="text-sm text-gray-600">{profile?.phone}</div>
                            <div className="text-sm text-gray-500">
                              Born: {profile?.date_of_birth ? new Date(profile.date_of_birth).toLocaleDateString('en-GB') : 'N/A'}
                            </div>
                          </div>
                          <Badge variant="default" className="bg-pink-100 text-pink-800">Today</Badge>
                        </div>
                      )
                    })}
                    {upcomingBirthdays.filter(isBirthdayToday).length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        <Gift className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                        <p>No birthdays today</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* This Week's Birthdays */}
                <div>
                  <h3 className="text-lg font-semibold mb-4 text-blue-600">This Week's Birthdays</h3>
                  <div className="space-y-3">
                    {upcomingBirthdays.filter(isBirthdayThisWeek).map((member, index) => {
                      const profile = member.profile as any
                      return (
                        <div key={index} className="flex items-center gap-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg hover:shadow-md transition-shadow">
                          <div className="w-12 h-12 bg-gradient-to-r from-blue-400 to-indigo-400 rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium text-white">
                              {profile?.first_name?.[0]}{profile?.last_name?.[0]}
                            </span>
                          </div>
                          <div className="flex-1">
                            <div className="font-semibold text-gray-800">{profile?.first_name} {profile?.last_name}</div>
                            <div className="text-sm text-gray-600">{profile?.phone}</div>
                            <div className="text-sm text-gray-500">
                              Born: {profile?.date_of_birth ? new Date(profile.date_of_birth).toLocaleDateString('en-GB') : 'N/A'}
                            </div>
                          </div>
                          <Badge variant="default" className="bg-blue-100 text-blue-800">This Week</Badge>
                        </div>
                      )
                    })}
                    {upcomingBirthdays.filter(isBirthdayThisWeek).length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        <Gift className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                        <p>No birthdays this week</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
                </CardContent>
              </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}