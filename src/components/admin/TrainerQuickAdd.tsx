import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { UserPlus, CheckCircle, AlertTriangle } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'

export const TrainerQuickAdd: React.FC = () => {
  const { gymId } = useAuth()
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  
  const [formData, setFormData] = useState({
    firstName: 'Test',
    lastName: 'Trainer',
    email: `trainer${Date.now()}@test.com`,
    phone: '9999999999',
    role: 'trainer',
    specialization: 'Weight Training, Cardio',
    experienceYears: 5
  })

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const createQuickTrainer = async () => {
    setLoading(true)
    setResult(null)

    try {
      // 1. Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: 'temp123!',
        options: {
          data: {
            first_name: formData.firstName,
            last_name: formData.lastName,
            phone: formData.phone
          }
        }
      })

      if (authError) throw authError

      if (!authData.user) {
        throw new Error('Failed to create user account')
      }

      // 2. Create profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .insert([{
          user_id: authData.user.id,
          first_name: formData.firstName,
          last_name: formData.lastName,
          phone: formData.phone
        }])
        .select()
        .single()

      if (profileError) throw profileError

      // 3. Create staff record
      const { data: staffData, error: staffError } = await supabase
        .from('staff')
        .insert([{
          gym_id: gymId,
          user_id: authData.user.id,
          profile_id: profileData.id,
          employee_id: `TRN${Date.now()}`,
          role: formData.role,
          status: 'active',
          specializations: formData.specialization.split(',').map(s => s.trim()),
          experience_years: formData.experienceYears,
          salary_amount: 25000,
          salary_type: 'fixed',
          hourly_rate: 500,
          hire_date: new Date().toISOString().split('T')[0],
          max_clients: 20
        }])
        .select()
        .single()

      if (staffError) throw staffError

      setResult(`✅ Trainer created successfully! 
      
Login Details:
• Email: ${formData.email}
• Password: temp123!
• Role: ${formData.role}
• Employee ID: ${staffData.employee_id}

The trainer is now active and available for PT assignments!`)

    } catch (error) {
      console.error('Error creating trainer:', error)
      setResult(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="border-green-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlus className="w-5 h-5 text-green-600" />
          Quick Add Trainer
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-2 text-blue-800">
            <AlertTriangle className="w-4 h-4" />
            <span className="font-medium">No Active Trainers?</span>
          </div>
          <p className="text-sm text-blue-700 mt-1">
            If trainer dropdown is empty, you need active trainers. Use this to quickly add a test trainer.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="firstName">First Name</Label>
            <Input
              id="firstName"
              value={formData.firstName}
              onChange={(e) => handleInputChange('firstName', e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="lastName">Last Name</Label>
            <Input
              id="lastName"
              value={formData.lastName}
              onChange={(e) => handleInputChange('lastName', e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="role">Role</Label>
            <Select value={formData.role} onValueChange={(value) => handleInputChange('role', value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="trainer">Trainer</SelectItem>
                <SelectItem value="nutritionist">Nutritionist</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="experienceYears">Experience (Years)</Label>
            <Input
              id="experienceYears"
              type="number"
              value={formData.experienceYears}
              onChange={(e) => handleInputChange('experienceYears', parseInt(e.target.value) || 0)}
            />
          </div>
        </div>

        <div>
          <Label htmlFor="specialization">Specialization</Label>
          <Input
            id="specialization"
            value={formData.specialization}
            onChange={(e) => handleInputChange('specialization', e.target.value)}
            placeholder="Weight Training, Cardio, Yoga (comma separated)"
          />
        </div>

        <Button
          onClick={createQuickTrainer}
          disabled={loading}
          className="w-full bg-green-600 hover:bg-green-700"
        >
          {loading ? 'Creating Trainer...' : 'Create Quick Trainer'}
        </Button>

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
              <div className="whitespace-pre-line text-sm">{result}</div>
            </div>
          </div>
        )}

        <div className="text-sm text-gray-600 space-y-1">
          <p><strong>What this creates:</strong></p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Complete trainer account with login credentials</li>
            <li>Profile with contact information</li>
            <li>Staff record with specializations</li>
            <li>Active status for immediate PT assignment</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
