import React, { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  QrCode, 
  CheckCircle, 
  XCircle, 
  Scan,
  User,
  Clock,
  Calendar,
  Dumbbell,
  LogIn,
  LogOut,
  AlertTriangle,
  Loader2
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { formatDate, formatTime } from '@/lib/utils'

interface AttendanceResult {
  success: boolean
  member?: any
  membership?: any
  action?: 'check_in' | 'check_out'
  message: string
  attendance?: any
}

export default function AttendanceScan() {
  const [scanning, setScanning] = useState(false)
  const [manualCode, setManualCode] = useState('')
  const [result, setResult] = useState<AttendanceResult | null>(null)
  const [loading, setLoading] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // QR Code Scanner (simplified - in production, use a proper QR scanner library)
  const startCamera = async () => {
    try {
      setScanning(true)
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
    } catch (error) {
      console.error('Error accessing camera:', error)
      setResult({
        success: false,
        message: 'Unable to access camera. Please enter your member ID manually.'
      })
    }
  }

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks()
      tracks.forEach(track => track.stop())
    }
    setScanning(false)
  }

  const processAttendance = async (memberCode: string) => {
    setLoading(true)
    setResult(null)

    try {
      // Parse QR code JSON if it looks like JSON, otherwise use as direct member ID
      let actualMemberId = memberCode.trim()
      let expectedGymId: string | null = null
      
      try {
        // Check if the input is JSON (QR code data)
        const qrData = JSON.parse(memberCode)
        if (qrData.type === 'gym_attendance' && qrData.member_id) {
          actualMemberId = qrData.member_id
          expectedGymId = qrData.gym_id
          console.log('Parsed QR code:', qrData)
        }
      } catch (e) {
        // Not JSON, treat as direct member ID
        console.log('Using direct member ID:', actualMemberId)
      }

      // First, check if member exists at all (without status filter)
      const { data: allMembers, error: searchError } = await supabase
        .from('members')
        .select('member_id, status, gym_id')
        .eq('member_id', actualMemberId)

      console.log('Member search results:', { 
        actualMemberId, 
        foundMembers: allMembers,
        searchError: searchError?.message 
      })

      if (searchError) {
        setResult({
          success: false,
          message: `Database error: ${searchError.message}`
        })
        return
      }

      if (!allMembers || allMembers.length === 0) {
        setResult({
          success: false,
          message: `Member ID "${actualMemberId}" not found in database. Please check your member ID.`
        })
        return
      }

      const foundMember = allMembers[0]
      
      if (foundMember.status !== 'active') {
        setResult({
          success: false,
          message: `Member "${actualMemberId}" exists but is ${foundMember.status}. Please contact reception.`
        })
        return
      }

      // Validate gym ID if QR code provided one
      if (expectedGymId && foundMember.gym_id !== expectedGymId) {
        setResult({
          success: false,
          message: `QR code is for a different gym. This member belongs to gym ${foundMember.gym_id} but QR code is for gym ${expectedGymId}.`
        })
        return
      }

      // Now get the full member details with memberships
      const { data: member, error: memberError } = await supabase
        .from('members')
        .select(`
          id,
          member_id,
          status,
          profiles!profile_id (
            first_name,
            last_name,
            phone
          ),
          memberships!memberships_member_id_fkey (
            id,
            status,
            start_date,
            end_date,
            membership_packages (
              name,
              package_type
            )
          )
        `)
        .eq('member_id', actualMemberId)
        .eq('status', 'active')
        .single()

      if (memberError || !member) {
        console.log('Member details lookup failed:', { 
          actualMemberId, 
          error: memberError?.message,
          originalInput: memberCode 
        })
        setResult({
          success: false,
          message: `Error loading member details: ${memberError?.message || 'Unknown error'}`
        })
        return
      }

      // Check if member has active membership
      const activeMembership = member.memberships.find((m: any) => 
        m.status === 'active' && 
        new Date(m.end_date) >= new Date()
      )
      
      console.log('Membership check:', {
        memberships: member.memberships,
        activeMembership,
        today: new Date().toISOString(),
        dateChecks: member.memberships.map(m => ({
          id: m.id,
          status: m.status,
          end_date: m.end_date,
          isActive: m.status === 'active',
          isNotExpired: new Date(m.end_date) >= new Date(),
          endDateObj: new Date(m.end_date),
          today: new Date()
        }))
      })

      if (!activeMembership) {
        setResult({
          success: false,
          message: 'No active membership found. Please contact reception.',
          member
        })
        return
      }

      // Check if already checked in today
      const today = new Date().toISOString().split('T')[0]
      const { data: todayAttendance, error: attendanceError } = await supabase
        .from('member_attendance')
        .select('*')
        .eq('member_id', member.id)
        .eq('date', today)
        .order('check_in_time', { ascending: false })
        .limit(1)

      if (attendanceError) {
        console.error('Error checking attendance:', attendanceError)
      }

      const lastAttendance = todayAttendance?.[0]
      let action: 'check_in' | 'check_out' = 'check_in'
      let attendanceData: any

      if (lastAttendance && !lastAttendance.check_out_time) {
        // Member is checked in, perform checkout
        action = 'check_out'
        const { data: updatedAttendance, error: updateError } = await supabase
          .from('member_attendance')
          .update({
            check_out_time: new Date().toISOString(),
            auto_checkout: false
          })
          .eq('id', lastAttendance.id)
          .select()
          .single()

        if (updateError) {
          throw updateError
        }
        attendanceData = updatedAttendance
      } else {
        // Perform check in
        action = 'check_in'
        const { data: newAttendance, error: insertError } = await supabase
          .from('member_attendance')
          .insert([{
            gym_id: member.gym_id,
            member_id: member.id,
            membership_id: activeMembership.id,
            check_in_time: new Date().toISOString(),
            date: today,
            auto_checkout: false
          }])
          .select()
          .single()

        if (insertError) {
          console.error('Attendance insertion failed:', {
            error: insertError,
            memberData: {
              gym_id: member.gym_id,
              member_id: member.id,
              membership_id: activeMembership.id,
              actualMemberId: actualMemberId
            }
          })
          throw insertError
        }
        attendanceData = newAttendance
      }

      setResult({
        success: true,
        member,
        membership: activeMembership,
        action,
        message: action === 'check_in' 
          ? `Welcome ${member.profiles.first_name}! Check-in successful.`
          : `Goodbye ${member.profiles.first_name}! Check-out successful.`,
        attendance: attendanceData
      })

    } catch (error: any) {
      console.error('Error processing attendance:', error)
      setResult({
        success: false,
        message: `Error processing attendance: ${error.message || 'Unknown error'}. Please try again or contact reception.`
      })
    } finally {
      setLoading(false)
    }
  }

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (manualCode.trim()) {
      processAttendance(manualCode)
    }
  }

  useEffect(() => {
    return () => {
      stopCamera()
    }
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Dumbbell className="w-12 h-12 text-blue-600 mr-3" />
            <h1 className="text-4xl font-bold text-gray-900">Gym Attendance</h1>
          </div>
          <p className="text-xl text-gray-600">Scan QR code or enter your member ID</p>
        </div>

        <div className="max-w-2xl mx-auto">
          {/* Scanning Interface */}
          {!result && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <QrCode className="w-6 h-6 text-blue-600" />
                  Attendance Check-in/Check-out
                </CardTitle>
                <CardDescription>
                  Use camera to scan QR code or enter member ID manually
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Camera Scanner */}
                <div className="text-center">
                  {!scanning ? (
                    <Button
                      onClick={startCamera}
                      size="lg"
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Scan className="w-5 h-5 mr-2" />
                      Start Camera Scanner
                    </Button>
                  ) : (
                    <div className="space-y-4">
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        className="w-full max-w-md mx-auto border-2 border-blue-300 rounded-lg"
                      />
                      <Button
                        onClick={stopCamera}
                        variant="outline"
                      >
                        Stop Scanner
                      </Button>
                    </div>
                  )}
                  <canvas ref={canvasRef} className="hidden" />
                </div>

                {/* Manual Entry */}
                <div className="border-t pt-6">
                  <form onSubmit={handleManualSubmit} className="space-y-4">
                    <div>
                      <label htmlFor="memberCode" className="block text-sm font-medium text-gray-700 mb-2">
                        Enter Member ID
                      </label>
                      <Input
                        id="memberCode"
                        type="text"
                        placeholder="e.g., GYM001, 12345"
                        value={manualCode}
                        onChange={(e) => setManualCode(e.target.value)}
                        className="text-center text-lg"
                        disabled={loading}
                      />
                    </div>
                    <Button
                      type="submit"
                      disabled={!manualCode.trim() || loading}
                      className="w-full"
                      size="lg"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <User className="w-5 h-5 mr-2" />
                          Process Attendance
                        </>
                      )}
                    </Button>
                  </form>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Result Display */}
          {result && (
            <Card className={`border-2 ${
              result.success 
                ? 'border-green-500 bg-green-50' 
                : 'border-red-500 bg-red-50'
            }`}>
              <CardHeader>
                <CardTitle className={`flex items-center gap-2 ${
                  result.success ? 'text-green-700' : 'text-red-700'
                }`}>
                  {result.success ? (
                    <CheckCircle className="w-6 h-6" />
                  ) : (
                    <XCircle className="w-6 h-6" />
                  )}
                  {result.success ? 'Success!' : 'Error'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className={`text-lg font-medium ${
                    result.success ? 'text-green-800' : 'text-red-800'
                  }`}>
                    {result.message}
                  </p>

                  {result.success && result.member && (
                    <div className="bg-white p-4 rounded-lg border">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-600">Member</p>
                          <p className="font-medium">
                            {result.member.profiles.first_name} {result.member.profiles.last_name}
                          </p>
                          <p className="text-sm text-gray-500">
                            ID: {result.member.member_id}
                          </p>
                        </div>
                        
                        <div>
                          <p className="text-sm text-gray-600">Membership</p>
                          <p className="font-medium">
                            {result.membership?.membership_packages?.name}
                          </p>
                          <Badge variant="outline" className="mt-1">
                            {result.membership?.membership_packages?.package_type}
                          </Badge>
                        </div>

                        <div>
                          <p className="text-sm text-gray-600">Action</p>
                          <div className="flex items-center gap-2">
                            {result.action === 'check_in' ? (
                              <LogIn className="w-4 h-4 text-green-600" />
                            ) : (
                              <LogOut className="w-4 h-4 text-blue-600" />
                            )}
                            <span className="font-medium capitalize">
                              {result.action?.replace('_', ' ')}
                            </span>
                          </div>
                        </div>

                        <div>
                          <p className="text-sm text-gray-600">Time</p>
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-gray-500" />
                            <span className="font-medium">
                              {formatTime(new Date())}
                            </span>
                          </div>
                          <p className="text-sm text-gray-500">
                            {formatDate(new Date())}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="pt-4">
                    <Button
                      onClick={() => {
                        setResult(null)
                        setManualCode('')
                      }}
                      className="w-full"
                      variant="outline"
                    >
                      Scan Another Member
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Instructions */}
          <Card className="mt-6 bg-blue-50 border-blue-200">
            <CardHeader>
              <CardTitle className="text-blue-800 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Instructions
              </CardTitle>
            </CardHeader>
            <CardContent className="text-blue-700">
              <ul className="space-y-2 text-sm">
                <li>• <strong>First visit today:</strong> System will check you in</li>
                <li>• <strong>Already checked in:</strong> System will check you out</li>
                <li>• <strong>Auto checkout:</strong> If you forget to check out, system will auto-checkout at 11:59 PM</li>
                <li>• <strong>QR Code:</strong> Use your member QR code for fastest scanning</li>
                <li>• <strong>Member ID:</strong> Enter your member ID if QR code is not available</li>
                <li>• <strong>Issues?</strong> Contact reception for assistance</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
