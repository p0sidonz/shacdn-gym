import React, { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Calendar, 
  Clock, 
  DollarSign, 
  User,
  Activity,
  Target,
  TrendingUp,
  CheckCircle2,
  AlertCircle
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { formatCurrency, formatDate } from '@/lib/utils'

// Mock data - replace with real API calls
const mockMemberData = {
  member_id: 'MEM001',
  membership: {
    package_name: 'Annual Premium',
    start_date: '2024-01-12',
    end_date: '2025-01-12',
    status: 'active',
    days_remaining: 95,
    amount_paid: 35000,
    amount_pending: 0
  },
  trainer: {
    name: 'Raj Kumar',
    specialization: 'Weight Training',
    phone: '+91-9876543210'
  },
  stats: {
    total_sessions: 45,
    sessions_this_month: 12,
    calories_burned: 15420,
    attendance_percentage: 85
  },
  recent_sessions: [
    {
      id: 1,
      date: '2024-01-20',
      trainer: 'Raj Kumar',
      type: 'Personal Training',
      duration: 60,
      rating: 5,
      notes: 'Great progress on deadlifts'
    },
    {
      id: 2,
      date: '2024-01-18',
      trainer: 'Raj Kumar',
      type: 'Strength Training',
      duration: 45,
      rating: 4,
      notes: 'Focus on form improvement'
    }
  ],
  upcoming_sessions: [
    {
      id: 1,
      date: '2024-01-25',
      time: '10:00 AM',
      trainer: 'Raj Kumar',
      type: 'Personal Training'
    },
    {
      id: 2,
      date: '2024-01-27',
      time: '10:00 AM',
      trainer: 'Raj Kumar',
      type: 'Cardio Focus'
    }
  ],
  payments: [
    {
      id: 1,
      date: '2024-01-12',
      amount: 35000,
      description: 'Annual Premium Membership',
      status: 'paid'
    }
  ]
}

const MemberDashboard = () => {
  const { profile } = useAuth()
  const [memberData, setMemberData] = useState(mockMemberData)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Load member dashboard data
    loadMemberData()
  }, [])

  const loadMemberData = async () => {
    setLoading(true)
    try {
      // TODO: Replace with actual API calls
      // const data = await memberService.getDashboardData()
      // setMemberData(data)
    } catch (error) {
      console.error('Error loading member data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="success">Active</Badge>
      case 'expired':
        return <Badge variant="destructive">Expired</Badge>
      case 'trial':
        return <Badge variant="warning">Trial</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome back, {profile?.first_name}!
          </h1>
          <p className="text-gray-600">Here's your fitness journey overview</p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline">
            <Calendar className="w-4 h-4 mr-2" />
            Book Session
          </Button>
          <Button>
            <Activity className="w-4 h-4 mr-2" />
            View Workout Plan
          </Button>
        </div>
      </div>

      {/* Membership Status Card */}
      <Card className="bg-gradient-to-r from-blue-500 to-purple-600 text-white">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl text-white">
                {memberData.membership.package_name}
              </CardTitle>
              <CardDescription className="text-blue-100">
                Member ID: {memberData.member_id}
              </CardDescription>
            </div>
            {getStatusBadge(memberData.membership.status)}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-blue-100 text-sm">Valid Until</p>
              <p className="text-xl font-semibold">
                {formatDate(new Date(memberData.membership.end_date))}
              </p>
              <p className="text-blue-200 text-sm">
                {memberData.membership.days_remaining} days remaining
              </p>
            </div>
            <div>
              <p className="text-blue-100 text-sm">Amount Paid</p>
              <p className="text-xl font-semibold">
                {formatCurrency(memberData.membership.amount_paid)}
              </p>
              {memberData.membership.amount_pending > 0 && (
                <p className="text-yellow-200 text-sm">
                  {formatCurrency(memberData.membership.amount_pending)} pending
                </p>
              )}
            </div>
            <div>
              <p className="text-blue-100 text-sm">Personal Trainer</p>
              <p className="text-xl font-semibold">{memberData.trainer.name}</p>
              <p className="text-blue-200 text-sm">{memberData.trainer.specialization}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Sessions
            </CardTitle>
            <Activity className="w-5 h-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {memberData.stats.total_sessions}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {memberData.stats.sessions_this_month} this month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Calories Burned
            </CardTitle>
            <TrendingUp className="w-5 h-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {memberData.stats.calories_burned.toLocaleString()}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Total calories burned
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Attendance
            </CardTitle>
            <CheckCircle2 className="w-5 h-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {memberData.stats.attendance_percentage}%
            </div>
            <p className="text-xs text-gray-500 mt-1">
              This month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Payment Status
            </CardTitle>
            <DollarSign className="w-5 h-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              Paid
            </div>
            <p className="text-xs text-gray-500 mt-1">
              No pending dues
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity and Upcoming Sessions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Sessions */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Sessions</CardTitle>
            <CardDescription>Your latest training sessions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {memberData.recent_sessions.map((session) => (
                <div key={session.id} className="flex items-start space-x-3 p-3 rounded-lg bg-gray-50">
                  <div className="flex-shrink-0">
                    <Activity className="w-5 h-5 text-blue-600 mt-1" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {session.type}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatDate(new Date(session.date))} • {session.duration} min
                        </p>
                        <p className="text-xs text-gray-600 mt-1">
                          with {session.trainer}
                        </p>
                      </div>
                      <div className="flex items-center space-x-1">
                        {[...Array(5)].map((_, i) => (
                          <span
                            key={i}
                            className={`text-xs ${
                              i < session.rating ? 'text-yellow-400' : 'text-gray-300'
                            }`}
                          >
                            ★
                          </span>
                        ))}
                      </div>
                    </div>
                    {session.notes && (
                      <p className="text-xs text-gray-600 mt-2 italic">
                        "{session.notes}"
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <Button variant="ghost" className="w-full mt-4">
              View All Sessions
            </Button>
          </CardContent>
        </Card>

        {/* Upcoming Sessions */}
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Sessions</CardTitle>
            <CardDescription>Your scheduled training sessions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {memberData.upcoming_sessions.map((session) => (
                <div key={session.id} className="flex items-start space-x-3 p-3 rounded-lg border border-blue-200 bg-blue-50">
                  <div className="flex-shrink-0">
                    <Clock className="w-5 h-5 text-blue-600 mt-1" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {session.type}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatDate(new Date(session.date))} at {session.time}
                        </p>
                        <p className="text-xs text-gray-600 mt-1">
                          with {session.trainer}
                        </p>
                      </div>
                      <Button size="sm" variant="outline">
                        Reschedule
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <Button variant="ghost" className="w-full mt-4">
              <Calendar className="w-4 h-4 mr-2" />
              Book New Session
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common tasks and shortcuts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button variant="outline" className="h-auto p-4 flex flex-col items-center space-y-2">
              <User className="w-6 h-6" />
              <span className="text-sm">Update Profile</span>
            </Button>
            <Button variant="outline" className="h-auto p-4 flex flex-col items-center space-y-2">
              <DollarSign className="w-6 h-6" />
              <span className="text-sm">Payment History</span>
            </Button>
            <Button variant="outline" className="h-auto p-4 flex flex-col items-center space-y-2">
              <Target className="w-6 h-6" />
              <span className="text-sm">Set Goals</span>
            </Button>
            <Button variant="outline" className="h-auto p-4 flex flex-col items-center space-y-2">
              <Activity className="w-6 h-6" />
              <span className="text-sm">Progress Report</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Alerts/Notifications */}
      {memberData.membership.days_remaining <= 30 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="text-orange-800 flex items-center">
              <AlertCircle className="w-5 h-5 mr-2" />
              Membership Renewal Reminder
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-orange-700">
              Your membership expires in {memberData.membership.days_remaining} days. 
              Renew now to continue your fitness journey without interruption.
            </p>
            <Button variant="outline" className="mt-3 border-orange-300 text-orange-700 hover:bg-orange-100">
              Renew Membership
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default MemberDashboard
