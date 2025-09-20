import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AlertTriangle, CheckCircle, Wrench } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'

interface PTPackageQuickFixProps {
  onPackageFixed?: () => void
}

export const PTPackageQuickFix: React.FC<PTPackageQuickFixProps> = ({ onPackageFixed }) => {
  const { gymId } = useAuth()
  const [loading, setLoading] = useState(false)
  const [sessionsCount, setSessionsCount] = useState(10)
  const [result, setResult] = useState<string | null>(null)

  const handleFixPTPackage = async () => {
    setLoading(true)
    setResult(null)

    try {
      // 1. Update PT package to include sessions
      const { error: packageError } = await supabase
        .from('membership_packages')
        .update({ 
          pt_sessions_included: sessionsCount 
        })
        .eq('name', 'PT-TEST-30')
        .eq('package_type', 'personal_training')
        .eq('gym_id', gymId)

      if (packageError) throw packageError

      // 2. Update existing memberships with this package
      const { error: membershipError } = await supabase
        .from('memberships')
        .update({
          pt_sessions_remaining: sessionsCount,
          pt_sessions_used: 0
        })
        .eq('package_id', (
          await supabase
            .from('membership_packages')
            .select('id')
            .eq('name', 'PT-TEST-30')
            .eq('package_type', 'personal_training')
            .eq('gym_id', gymId)
            .single()
        ).data?.id)
        .eq('pt_sessions_remaining', 0)

      if (membershipError) throw membershipError

      setResult(`✅ Successfully updated PT package with ${sessionsCount} sessions!`)
      
      // Trigger refresh
      if (onPackageFixed) {
        onPackageFixed()
      }

    } catch (error) {
      console.error('Error fixing PT package:', error)
      setResult(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateSampleMember = async () => {
    setLoading(true)
    setResult(null)

    try {
      // Get PT package
      const { data: ptPackage, error: packageError } = await supabase
        .from('membership_packages')
        .select('*')
        .eq('name', 'PT-TEST-30')
        .eq('package_type', 'personal_training')
        .eq('gym_id', gymId)
        .single()

      if (packageError || !ptPackage) {
        throw new Error('PT package not found. Please fix package first.')
      }

      // Create test profile
      const { data: testProfile, error: profileError } = await supabase
        .from('profiles')
        .insert([{
          first_name: 'Test',
          last_name: 'PTMember',
          phone: '9999999999'
        }])
        .select()
        .single()

      if (profileError) throw profileError

      // Create test member
      const { data: testMember, error: memberError } = await supabase
        .from('members')
        .insert([{
          gym_id: gymId,
          profile_id: testProfile.id,
          member_id: `PTTEST${Date.now()}`,
          joining_date: new Date().toISOString().split('T')[0],
          status: 'active'
        }])
        .select()
        .single()

      if (memberError) throw memberError

      // Create PT membership
      const startDate = new Date()
      const endDate = new Date()
      endDate.setDate(endDate.getDate() + ptPackage.duration_days)

      const { error: membershipError } = await supabase
        .from('memberships')
        .insert([{
          member_id: testMember.id,
          package_id: ptPackage.id,
          start_date: startDate.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0],
          status: 'active',
          original_amount: ptPackage.price,
          total_amount_due: ptPackage.price,
          amount_paid: ptPackage.price,
          amount_pending: 0,
          pt_sessions_remaining: ptPackage.pt_sessions_included || sessionsCount,
          pt_sessions_used: 0
        }])

      if (membershipError) throw membershipError

      setResult(`✅ Created test member "${testMember.member_id}" with PT package!`)

    } catch (error) {
      console.error('Error creating sample member:', error)
      setResult(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="border-blue-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wrench className="w-5 h-5 text-blue-600" />
          PT Package Quick Fix
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center gap-2 text-yellow-800">
            <AlertTriangle className="w-4 h-4" />
            <span className="font-medium">Issue Detected</span>
          </div>
          <p className="text-sm text-yellow-700 mt-1">
            Your PT package "PT-TEST-30" has 0 sessions included. Members can't assign trainers without sessions.
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <Label htmlFor="sessions">Number of PT Sessions</Label>
            <Input
              id="sessions"
              type="number"
              min="1"
              max="50"
              value={sessionsCount}
              onChange={(e) => setSessionsCount(parseInt(e.target.value) || 10)}
              className="w-32"
            />
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleFixPTPackage}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {loading ? 'Fixing...' : `Fix PT Package (${sessionsCount} sessions)`}
            </Button>

            <Button
              onClick={handleCreateSampleMember}
              disabled={loading}
              variant="outline"
            >
              {loading ? 'Creating...' : 'Create Sample PT Member'}
            </Button>
          </div>

          {result && (
            <div className={`p-3 rounded-lg border ${
              result.startsWith('✅') 
                ? 'bg-green-50 border-green-200 text-green-800' 
                : 'bg-red-50 border-red-200 text-red-800'
            }`}>
              <div className="flex items-center gap-2">
                {result.startsWith('✅') ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  <AlertTriangle className="w-4 h-4" />
                )}
                <span className="font-medium">{result}</span>
              </div>
            </div>
          )}
        </div>

        <div className="text-sm text-gray-600 space-y-1">
          <p><strong>What this does:</strong></p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Updates your PT package to include {sessionsCount} sessions</li>
            <li>Updates existing memberships with this package</li>
            <li>Creates a test member with PT sessions (optional)</li>
            <li>Enables trainer assignment and session scheduling</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
