import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, CheckCircle, User, Search } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'

export const TrainerDebugger: React.FC = () => {
  const { gymId, user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [debugData, setDebugData] = useState<any>(null)

  const debugTrainers = async () => {
    setLoading(true)
    setDebugData(null)

    try {
      console.log('🔍 Debugging trainers for gym:', gymId)

      // 1. Check all staff in gym
      const { data: allStaff, error: staffError } = await supabase
        .from('staff')
        .select(`
          id,
          role,
          status,
          specializations,
          experience_years,
          gym_id,
          profiles!profile_id (
            first_name,
            last_name,
            phone
          )
        `)
        .eq('gym_id', gymId)

      if (staffError) throw staffError

      // 2. Check trainers specifically
      const { data: trainers, error: trainersError } = await supabase
        .from('staff')
        .select(`
          id,
          role,
          status,
          specializations,
          experience_years,
          profiles!profile_id (
            first_name,
            last_name,
            phone
          )
        `)
        .eq('gym_id', gymId)
        .in('role', ['trainer', 'nutritionist'])

      if (trainersError) throw trainersError

      // 3. Check active trainers only
      const { data: activeTrainers, error: activeError } = await supabase
        .from('staff')
        .select(`
          id,
          role,
          status,
          specializations,
          experience_years,
          profiles!profile_id (
            first_name,
            last_name,
            phone
          )
        `)
        .eq('gym_id', gymId)
        .in('role', ['trainer', 'nutritionist'])
        .eq('status', 'active')

      if (activeError) throw activeError

      // 4. Check profiles relationship
      const { data: staffWithProfiles, error: profileError } = await supabase
        .from('staff')
        .select(`
          id,
          role,
          status,
          profile_id,
          profiles:profiles!profile_id (
            id,
            first_name,
            last_name,
            phone
          )
        `)
        .eq('gym_id', gymId)

      if (profileError) throw profileError

      setDebugData({
        gymId,
        userId: user?.id,
        allStaff: allStaff || [],
        trainers: trainers || [],
        activeTrainers: activeTrainers || [],
        staffWithProfiles: staffWithProfiles || []
      })

    } catch (error) {
      console.error('Debug error:', error)
      setDebugData({
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (gymId) {
      debugTrainers()
    }
  }, [gymId])

  const getStatusBadge = (status: string) => {
    const colors = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-gray-100 text-gray-800',
      terminated: 'bg-red-100 text-red-800',
      on_leave: 'bg-yellow-100 text-yellow-800',
      probation: 'bg-blue-100 text-blue-800'
    }
    return colors[status as keyof typeof colors] || colors.inactive
  }

  const getRoleBadge = (role: string) => {
    const colors = {
      trainer: 'bg-purple-100 text-purple-800',
      nutritionist: 'bg-orange-100 text-orange-800',
      manager: 'bg-blue-100 text-blue-800',
      receptionist: 'bg-pink-100 text-pink-800'
    }
    return colors[role as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  return (
    <Card className="border-blue-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="w-5 h-5 text-blue-600" />
          Trainer Debug Information
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button onClick={debugTrainers} disabled={loading} size="sm">
            {loading ? 'Debugging...' : 'Refresh Debug Info'}
          </Button>
        </div>

        {debugData?.error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2 text-red-800">
              <AlertTriangle className="w-4 h-4" />
              <span className="font-medium">Error</span>
            </div>
            <p className="text-sm text-red-700 mt-1">{debugData.error}</p>
          </div>
        )}

        {debugData && !debugData.error && (
          <div className="space-y-4">
            {/* Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-600">Gym ID</p>
                <p className="font-medium text-blue-800">{debugData.gymId}</p>
              </div>
              <div className="p-3 bg-green-50 rounded-lg">
                <p className="text-sm text-green-600">Total Staff</p>
                <p className="font-medium text-green-800">{debugData.allStaff.length}</p>
              </div>
              <div className="p-3 bg-purple-50 rounded-lg">
                <p className="text-sm text-purple-600">Trainers/Nutritionists</p>
                <p className="font-medium text-purple-800">{debugData.trainers.length}</p>
              </div>
              <div className="p-3 bg-orange-50 rounded-lg">
                <p className="text-sm text-orange-600">Active Trainers</p>
                <p className="font-medium text-orange-800">{debugData.activeTrainers.length}</p>
              </div>
            </div>

            {/* All Staff */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">All Staff ({debugData.allStaff.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {debugData.allStaff.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No staff found in this gym</p>
                ) : (
                  <div className="space-y-2">
                    {debugData.allStaff.map((staff: any) => (
                      <div key={staff.id} className="flex items-center justify-between p-2 border rounded">
                        <div className="flex items-center gap-3">
                          <User className="w-4 h-4 text-gray-400" />
                          <div>
                            <p className="font-medium">
                              {staff.profiles?.first_name} {staff.profiles?.last_name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {staff.profiles?.phone || 'No phone'} • ID: {staff.id.slice(0, 8)}...
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Badge className={getRoleBadge(staff.role)}>
                            {staff.role}
                          </Badge>
                          <Badge className={getStatusBadge(staff.status)}>
                            {staff.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Active Trainers */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  Active Trainers/Nutritionists ({debugData.activeTrainers.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {debugData.activeTrainers.length === 0 ? (
                  <div className="text-center py-4">
                    <AlertTriangle className="w-6 h-6 text-yellow-500 mx-auto mb-2" />
                    <p className="text-gray-500">No active trainers found!</p>
                    <p className="text-xs text-gray-400 mt-1">
                      This is why trainer dropdown is empty. You need to add trainers or activate existing ones.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {debugData.activeTrainers.map((trainer: any) => (
                      <div key={trainer.id} className="flex items-center justify-between p-2 border rounded bg-green-50">
                        <div className="flex items-center gap-3">
                          <User className="w-4 h-4 text-green-600" />
                          <div>
                            <p className="font-medium">
                              {trainer.profiles?.first_name} {trainer.profiles?.last_name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {trainer.experience_years}+ years • {Array.isArray(trainer.specializations) ? trainer.specializations.join(', ') : trainer.specializations || 'No specialization'}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Badge className={getRoleBadge(trainer.role)}>
                            {trainer.role}
                          </Badge>
                          <Badge className="bg-green-100 text-green-800">
                            {trainer.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Profile Issues */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Profile Relationship Check</CardTitle>
              </CardHeader>
              <CardContent>
                {debugData.staffWithProfiles.filter((s: any) => !s.profiles).length > 0 && (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg mb-3">
                    <div className="flex items-center gap-2 text-yellow-800">
                      <AlertTriangle className="w-4 h-4" />
                      <span className="font-medium">Profile Issues Found</span>
                    </div>
                    <p className="text-sm text-yellow-700 mt-1">
                      Some staff members don't have linked profiles. This might cause display issues.
                    </p>
                  </div>
                )}
                
                <div className="text-xs text-gray-500">
                  <p>Staff with profiles: {debugData.staffWithProfiles.filter((s: any) => s.profiles).length}</p>
                  <p>Staff without profiles: {debugData.staffWithProfiles.filter((s: any) => !s.profiles).length}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
