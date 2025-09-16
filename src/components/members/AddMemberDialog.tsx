import React, { useState } from 'react'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { DollarSign } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Plus, User, CreditCard, Calendar, Target } from 'lucide-react'
import { useMembers } from '@/hooks/useMembers'
import { useMembershipPackages } from '@/hooks/useMembershipPackages'
import { useMemberships } from '@/hooks/useMemberships'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'

interface AddMemberDialogProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onMemberAdded?: (member: any) => void
  existingMember?: any
}

export const AddMemberDialog: React.FC<AddMemberDialogProps> = ({ 
  open: externalOpen, 
  onOpenChange, 
  onMemberAdded, 
  existingMember 
}) => {
  const { gymId } = useAuth()
  const { addMember } = useMembers({ gym_id: gymId || undefined })
  const { createMembership } = useMemberships()
  const { packages, loading: packagesLoading } = useMembershipPackages(gymId || undefined)
  const [internalOpen, setInternalOpen] = useState(false)
  
  // Use external open state if provided, otherwise use internal state
  const open = externalOpen !== undefined ? externalOpen : internalOpen
  const setOpen = onOpenChange || setInternalOpen
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('personal')
  
  // Form state
  const [formData, setFormData] = useState({
    // Personal Information
    first_name: existingMember?.profile?.first_name || '',
    last_name: existingMember?.profile?.last_name || '',
    phone: existingMember?.profile?.phone || '',
    email: existingMember?.profile?.email || '',
    date_of_birth: existingMember?.profile?.date_of_birth || '',
    gender: existingMember?.profile?.gender || '',
    address: existingMember?.profile?.address || '',
    city: existingMember?.profile?.city || '',
    state: existingMember?.profile?.state || '',
    postal_code: existingMember?.profile?.postal_code || '',
    emergency_contact_name: existingMember?.profile?.emergency_contact_name || '',
    emergency_contact_phone: existingMember?.profile?.emergency_contact_phone || '',
    emergency_contact_relation: existingMember?.profile?.emergency_contact_relation || '',
    
    // Medical Information
    blood_group: '',
    medical_conditions: [] as string[],
    medications: [] as string[],
    
    // Fitness Information
    fitness_goals: [] as string[],
    workout_preferences: [] as string[],
    preferred_workout_time: '',
    training_level: '',
    fitness_experience: '',
    
    // Membership Information
    package_id: '',
    joining_date: new Date().toISOString().split('T')[0],
    source: '',
    referrer_member_id: '',
    notes: '',
    
    // Financial Information
    security_deposit: 0,
    credit_balance: 0,
    
    // Payment Information
    payment_type: 'full', // 'full', 'partial', 'none'
    down_payment: 0,
    first_installment_date: new Date().toISOString().split('T')[0]
  })

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleArrayChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: [...prev[field as keyof typeof prev] as string[], value]
    }))
  }

  const removeFromArray = (field: string, index: number) => {
    setFormData(prev => ({
      ...prev,
      [field]: (prev[field as keyof typeof prev] as string[]).filter((_, i) => i !== index)
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log('Form submitted with data:', formData)
    console.log('Existing member:', existingMember)
    
    // Basic validation
    if (!formData.package_id) {
      alert('Please select a membership package')
      return
    }
    
    if (formData.payment_type === 'partial' && formData.down_payment <= 0) {
      alert('Please enter the amount being paid today')
      return
    }
    
    setLoading(true)
    
    try {
      let userId: string
      
      if (existingMember) {
        // For existing member, use their existing user_id
        userId = existingMember.user_id
        console.log('Using existing member user_id:', userId)
      } else {
        // Step 1: Auth user (for new members)
        console.log('Creating auth user...')
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: formData.email,
          password: 'temp123!',
          options: {
            data: {
              first_name: formData.first_name,
              last_name: formData.last_name,
              phone: formData.phone
            }
          }
        })
    
        if (authError) throw new Error(`Auth error: ${authError.message}`)
        if (!authData.user) throw new Error('Failed to create user')
    
        userId = authData.user.id
        console.log('Auth user created:', userId)
      }
  
      // Step 2: Profile - Create or update profile using RPC function
      console.log('Creating/updating profile...')
      const { data: profileData_result, error: profileError } = await supabase
        .rpc('create_or_update_profile', {
          p_user_id: userId,
          p_first_name: formData.first_name,
          p_last_name: formData.last_name,
          p_phone: formData.phone,
          p_date_of_birth: formData.date_of_birth || null,
          p_gender: formData.gender || null,
          p_address: formData.address || null,
          p_city: formData.city || null,
          p_state: formData.state || null,
          p_postal_code: formData.postal_code || null,
          p_emergency_contact_name: formData.emergency_contact_name || null,
          p_emergency_contact_phone: formData.emergency_contact_phone || null,
          p_emergency_contact_relation: formData.emergency_contact_relation || null,
          p_blood_group: formData.blood_group || null,
          p_medical_conditions: formData.medical_conditions.length > 0 ? formData.medical_conditions : null,
          p_medications: formData.medications.length > 0 ? formData.medications : null,
          p_fitness_goals: formData.fitness_goals.length > 0 ? formData.fitness_goals : null,
          p_preferences: {
            workout_preferences: formData.workout_preferences,
            preferred_workout_time: formData.preferred_workout_time,
            training_level: formData.training_level,
            fitness_experience: formData.fitness_experience
          }
        })

      if (profileError) throw new Error(`Profile error: ${profileError.message}`)
      if (!profileData_result?.success) throw new Error(`Profile error: ${profileData_result?.error || 'Unknown error'}`)

      console.log('Profile created/updated:', profileData_result.profile_id)
  
      let newMember = existingMember
      let memberStatus = 'active' // Default status
      
      if (!existingMember) {
        // Step 3: Member (only for new members)
        // Determine member status based on selected package
        const selectedPackage = packages.find(pkg => pkg.id === formData.package_id)
        memberStatus = selectedPackage?.is_trial ? 'trial' : 'active'
        
        console.log('Package details:', {
          package_id: formData.package_id,
          selectedPackage: selectedPackage,
          is_trial: selectedPackage?.is_trial,
          memberStatus: memberStatus
        })
        
        const memberData = {
          gym_id: gymId || '',
          user_id: userId,
          profile_id: profileData_result.profile_id,
          member_id: `MEM${Date.now()}`, // Unique per submission
          joining_date: formData.joining_date,
          status: memberStatus,
          source: formData.source,
          referrer_member_id: formData.referrer_member_id || null,
          credit_balance: formData.credit_balance,
          security_deposit: formData.security_deposit,
          fitness_goals: formData.fitness_goals,
          workout_preferences: formData.workout_preferences,
          preferred_workout_time: formData.preferred_workout_time,
          training_level: formData.training_level,
          notes: formData.notes,
          tags: []
        }
    
        console.log('Creating member...')
        newMember = await addMember(memberData)
        console.log('Member created:', newMember.id)
      }
      
      // YAHAN SUCCESS ACTIONS: Core member add ho gaya, dialog close kar do
      if (onMemberAdded) {
        onMemberAdded(newMember)  // Parent list refresh ke liye
      }
      setOpen(false)
      resetForm()
  
      // Step 4: Membership - OPTIONAL/NON-BLOCKING (separate try-catch)
      console.log('Checking membership creation:', {
        package_id: formData.package_id,
        newMember: !!newMember,
        packages_available: packages.length,
        existingMember: !!existingMember,
        memberStatus: memberStatus,
        payment_type: formData.payment_type
      })
      
      if (formData.package_id && newMember) {
        try {
          const selectedPackage = packages.find(pkg => pkg.id === formData.package_id)
          console.log('Selected package:', selectedPackage)
          console.log('Creating membership for member:', newMember.id)
          
          if (selectedPackage) {
            // Determine membership status based on selected package
            const membershipStatus = selectedPackage.is_trial ? 'trial' : 'active'
            console.log('Membership status determined:', membershipStatus)
            
            const startDate = new Date(formData.joining_date)
            const endDate = new Date(startDate)
            endDate.setDate(endDate.getDate() + selectedPackage.duration_days)
  
            const membershipData = {
              member_id: newMember.id,
              package_id: formData.package_id,
              start_date: startDate.toISOString().split('T')[0],
              end_date: endDate.toISOString().split('T')[0],
              status: membershipStatus,
              original_amount: selectedPackage.price,
              total_amount_due: selectedPackage.price,
              amount_pending: selectedPackage.price,
              is_trial: selectedPackage.is_trial || false,
              auto_renew: false,
              pt_sessions_remaining: selectedPackage.pt_sessions_included || 0
            }
  
            console.log('Creating membership with data:', membershipData)
            const membershipResult = await createMembership(membershipData)
            console.log('Membership created successfully:', membershipResult)
            
            // Handle initial payment if any
            if (formData.payment_type !== 'none') {
              console.log('Processing initial payment')
              try {
                let paymentAmount = 0
                
                if (formData.payment_type === 'full') {
                  paymentAmount = selectedPackage.price
                } else if (formData.payment_type === 'partial') {
                  paymentAmount = formData.down_payment
                }
                
                if (paymentAmount > 0) {
                  // Create initial payment record
                  const receiptNumber = `RCP${Date.now()}`
                  const paymentData = {
                    gym_id: gymId || '',
                    member_id: newMember.id,
                    membership_id: membershipResult.id,
                    payment_type: 'membership_fee',
                    amount: paymentAmount,
                    original_amount: paymentAmount,
                    payment_method: 'cash', // Default method
                    payment_date: formData.joining_date,
                    status: 'paid',
                    receipt_number: receiptNumber,
                    description: `Initial payment for ${selectedPackage.name}`,
                    processed_by: (await supabase.auth.getUser()).data.user?.id
                  }
                  
                  const { error: paymentError } = await supabase
                    .from('payments')
                    .insert([paymentData])
                  
                  if (paymentError) {
                    console.error('Payment creation failed:', paymentError)
                    throw paymentError
                  }
                  
                  // Update membership amounts
                  const newAmountPaid = paymentAmount
                  const newAmountPending = selectedPackage.price - paymentAmount
                  
                  await supabase
                    .from('memberships')
                    .update({
                      amount_paid: newAmountPaid,
                      amount_pending: newAmountPending
                    })
                    .eq('id', membershipResult.id)
                  
                  console.log('Initial payment processed successfully')
                }
                
                // Create follow-up reminder for next payment if partial payment
                if (formData.payment_type === 'partial' && formData.first_installment_date) {
                  const remainingAmount = selectedPackage.price - paymentAmount
                  if (remainingAmount > 0) {
                    const followUpData = {
                      gym_id: gymId || '',
                      member_id: newMember.id,
                      follow_up_date: new Date(formData.first_installment_date).toISOString(),
                      response: `Next payment due: ₹${remainingAmount}`,
                      remark: `Payment reminder for remaining amount`,
                      status: 'pending',
                      created_by: (await supabase.auth.getUser()).data.user?.id
                    }
                    
                    await supabase
                      .from('follow_ups')
                      .insert([followUpData])
                    
                    console.log('Follow-up reminder created for next payment')
                  }
                }
                
              } catch (paymentError) {
                console.error('Payment processing failed (non-critical):', paymentError)
                // Don't throw error, just log it
              }
            } else {
              console.log('No initial payment - member will pay later')
            }
            
            // Show success message
            let paymentMessage = ''
            if (formData.payment_type === 'full') {
              paymentMessage = ' with full payment'
            } else if (formData.payment_type === 'partial') {
              paymentMessage = ` with ₹${formData.down_payment} paid today`
            } else {
              paymentMessage = ' - payment pending'
            }
            alert(`Membership added successfully for ${newMember.profile?.first_name} ${newMember.profile?.last_name}${paymentMessage}`)
          }
        } catch (membershipError) {
          console.error('Membership creation failed (non-critical, member still added):', membershipError)
          console.error('Membership error details:', JSON.stringify(membershipError, null, 2))
          // Show alert for debugging
          alert(`Member added successfully, but membership creation failed: ${membershipError instanceof Error ? membershipError.message : JSON.stringify(membershipError)}`)
        }
      } else {
        console.log('No package selected or no member available for membership creation')
      }
  
    } catch (error) {
      console.error('Core error adding member:', error)
      console.error('Error details:', JSON.stringify(error, null, 2))
      alert(`Error adding member: ${error instanceof Error ? error.message : JSON.stringify(error)}`)
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      first_name: '',
      last_name: '',
      phone: '',
      email: '',
      date_of_birth: '',
      gender: '',
      address: '',
      city: '',
      state: '',
      postal_code: '',
      emergency_contact_name: '',
      emergency_contact_phone: '',
      emergency_contact_relation: '',
      blood_group: '',
      medical_conditions: [],
      medications: [],
      fitness_goals: [],
      workout_preferences: [],
      preferred_workout_time: '',
      training_level: '',
      fitness_experience: '',
      package_id: '',
      joining_date: new Date().toISOString().split('T')[0],
      source: '',
      referrer_member_id: '',
      notes: '',
      security_deposit: 0,
      credit_balance: 0,
      
      // Payment Information
      payment_type: 'full',
      down_payment: 0,
      first_installment_date: new Date().toISOString().split('T')[0]
    })
  }

  console.log('AddMemberDialog rendering with open:', open, 'existingMember:', existingMember)
  
  return (
    <Sheet open={open} onOpenChange={setOpen} >
      <SheetTrigger asChild>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          {existingMember ? 'Add Membership' : 'Add Member'}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[800px] sm:w-[900px] max-w-none overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            {existingMember ? 'Add New Membership' : 'Add New Member'}
          </SheetTitle>
          <SheetDescription>
            {existingMember 
              ? 'Add a new membership package for this existing member'
              : 'Create a new member profile and membership'
            }
          </SheetDescription>
        </SheetHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6 mt-6">
          <div className="text-sm text-gray-600 mb-4">
            {existingMember ? 
              `Adding new membership for ${existingMember.profile?.first_name} ${existingMember.profile?.last_name}` : 
              'Creating new member account'
            }
          </div>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="personal">
                <User className="w-4 h-4 mr-2" />
                Personal
              </TabsTrigger>
              <TabsTrigger value="medical">
                <Target className="w-4 h-4 mr-2" />
                Medical
              </TabsTrigger>
              <TabsTrigger value="fitness">
                <Calendar className="w-4 h-4 mr-2" />
                Fitness
              </TabsTrigger>
              <TabsTrigger value="membership">
                <CreditCard className="w-4 h-4 mr-2" />
                Membership
              </TabsTrigger>
              <TabsTrigger value="payment">
                <DollarSign className="w-4 h-4 mr-2" />
                Payment
              </TabsTrigger>
            </TabsList>

            <TabsContent value="personal" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Personal Information</CardTitle>
                  <CardDescription>Basic member details</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="first_name">First Name *</Label>
                      <Input
                        id="first_name"
                        value={formData.first_name}
                        onChange={(e) => handleInputChange('first_name', e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="last_name">Last Name *</Label>
                      <Input
                        id="last_name"
                        value={formData.last_name}
                        onChange={(e) => handleInputChange('last_name', e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="phone">Phone *</Label>
                      <Input
                        id="phone"
                        value={formData.phone}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="email">Email *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="date_of_birth">Date of Birth</Label>
                      <Input
                        id="date_of_birth"
                        type="date"
                        value={formData.date_of_birth}
                        onChange={(e) => handleInputChange('date_of_birth', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="gender">Gender</Label>
                      <Select value={formData.gender} onValueChange={(value) => handleInputChange('gender', value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select gender" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="address">Address</Label>
                    <Textarea
                      id="address"
                      value={formData.address}
                      onChange={(e) => handleInputChange('address', e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="city">City</Label>
                      <Input
                        id="city"
                        value={formData.city}
                        onChange={(e) => handleInputChange('city', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="state">State</Label>
                      <Input
                        id="state"
                        value={formData.state}
                        onChange={(e) => handleInputChange('state', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="postal_code">Postal Code</Label>
                      <Input
                        id="postal_code"
                        value={formData.postal_code}
                        onChange={(e) => handleInputChange('postal_code', e.target.value)}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Emergency Contact</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="emergency_contact_name">Name</Label>
                      <Input
                        id="emergency_contact_name"
                        value={formData.emergency_contact_name}
                        onChange={(e) => handleInputChange('emergency_contact_name', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="emergency_contact_phone">Phone</Label>
                      <Input
                        id="emergency_contact_phone"
                        value={formData.emergency_contact_phone}
                        onChange={(e) => handleInputChange('emergency_contact_phone', e.target.value)}
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="emergency_contact_relation">Relation</Label>
                    <Input
                      id="emergency_contact_relation"
                      value={formData.emergency_contact_relation}
                      onChange={(e) => handleInputChange('emergency_contact_relation', e.target.value)}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="medical" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Medical Information</CardTitle>
                  <CardDescription>Health and medical details</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="blood_group">Blood Group</Label>
                    <Select value={formData.blood_group} onValueChange={(value) => handleInputChange('blood_group', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select blood group" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="A+">A+</SelectItem>
                        <SelectItem value="A-">A-</SelectItem>
                        <SelectItem value="B+">B+</SelectItem>
                        <SelectItem value="B-">B-</SelectItem>
                        <SelectItem value="AB+">AB+</SelectItem>
                        <SelectItem value="AB-">AB-</SelectItem>
                        <SelectItem value="O+">O+</SelectItem>
                        <SelectItem value="O-">O-</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Medical Conditions</Label>
                    <div className="space-y-2">
                      {formData.medical_conditions.map((condition, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <Input value={condition} readOnly />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeFromArray('medical_conditions', index)}
                          >
                            Remove
                          </Button>
                        </div>
                      ))}
                      <div className="flex space-x-2">
                        <Input
                          placeholder="Add medical condition"
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              const value = e.currentTarget.value
                              if (value) {
                                handleArrayChange('medical_conditions', value)
                                e.currentTarget.value = ''
                              }
                            }
                          }}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={(e) => {
                            const input = e.currentTarget.previousElementSibling as HTMLInputElement
                            const value = input.value
                            if (value) {
                              handleArrayChange('medical_conditions', value)
                              input.value = ''
                            }
                          }}
                        >
                          Add
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label>Current Medications</Label>
                    <div className="space-y-2">
                      {formData.medications.map((medication, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <Input value={medication} readOnly />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeFromArray('medications', index)}
                          >
                            Remove
                          </Button>
                        </div>
                      ))}
                      <div className="flex space-x-2">
                        <Input
                          placeholder="Add medication"
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              const value = e.currentTarget.value
                              if (value) {
                                handleArrayChange('medications', value)
                                e.currentTarget.value = ''
                              }
                            }
                          }}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={(e) => {
                            const input = e.currentTarget.previousElementSibling as HTMLInputElement
                            const value = input.value
                            if (value) {
                              handleArrayChange('medications', value)
                              input.value = ''
                            }
                          }}
                        >
                          Add
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="fitness" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Fitness Information</CardTitle>
                  <CardDescription>Fitness goals and preferences</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Fitness Goals</Label>
                    <div className="space-y-2">
                      {formData.fitness_goals.map((goal, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <Input value={goal} readOnly />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeFromArray('fitness_goals', index)}
                          >
                            Remove
                          </Button>
                        </div>
                      ))}
                      <div className="flex space-x-2">
                        <Input
                          placeholder="Add fitness goal"
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              const value = e.currentTarget.value
                              if (value) {
                                handleArrayChange('fitness_goals', value)
                                e.currentTarget.value = ''
                              }
                            }
                          }}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={(e) => {
                            const input = e.currentTarget.previousElementSibling as HTMLInputElement
                            const value = input.value
                            if (value) {
                              handleArrayChange('fitness_goals', value)
                              input.value = ''
                            }
                          }}
                        >
                          Add
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="preferred_workout_time">Preferred Workout Time</Label>
                      <Select value={formData.preferred_workout_time} onValueChange={(value) => handleInputChange('preferred_workout_time', value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select time" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="morning">Morning (6-9 AM)</SelectItem>
                          <SelectItem value="afternoon">Afternoon (12-3 PM)</SelectItem>
                          <SelectItem value="evening">Evening (6-9 PM)</SelectItem>
                          <SelectItem value="night">Night (9-11 PM)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="training_level">Training Level</Label>
                      <Select value={formData.training_level} onValueChange={(value) => handleInputChange('training_level', value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select level" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="beginner">Beginner</SelectItem>
                          <SelectItem value="intermediate">Intermediate</SelectItem>
                          <SelectItem value="advanced">Advanced</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="fitness_experience">Fitness Experience</Label>
                    <Textarea
                      id="fitness_experience"
                      value={formData.fitness_experience}
                      onChange={(e) => handleInputChange('fitness_experience', e.target.value)}
                      placeholder="Describe your fitness background and experience"
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="membership" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Membership Information</CardTitle>
                  <CardDescription>Package and membership details</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="package_id">Membership Package *</Label>
                    <Select value={formData.package_id} onValueChange={(value) => handleInputChange('package_id', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select package" />
                      </SelectTrigger>
                      <SelectContent>
                        {packagesLoading ? (
                          <SelectItem value="" disabled>
                            Loading packages...
                          </SelectItem>
                        ) : packages.length === 0 ? (
                          <SelectItem value="" disabled>
                            No packages available
                          </SelectItem>
                        ) : (
                          packages.map((pkg) => (
                            <SelectItem key={pkg.id} value={pkg.id}>
                              {pkg.name} - ₹{pkg.price} ({pkg.duration_days} days)
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="joining_date">Joining Date *</Label>
                      <Input
                        id="joining_date"
                        type="date"
                        value={formData.joining_date}
                        onChange={(e) => handleInputChange('joining_date', e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="source">Source</Label>
                      <Select value={formData.source} onValueChange={(value) => handleInputChange('source', value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="How did they hear about us?" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="walk_in">Walk-in</SelectItem>
                          <SelectItem value="referral">Referral</SelectItem>
                          <SelectItem value="social_media">Social Media</SelectItem>
                          <SelectItem value="advertisement">Advertisement</SelectItem>
                          <SelectItem value="website">Website</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="security_deposit">Security Deposit</Label>
                      <Input
                        id="security_deposit"
                        type="number"
                        value={formData.security_deposit}
                        onChange={(e) => handleInputChange('security_deposit', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="credit_balance">Credit Balance</Label>
                      <Input
                        id="credit_balance"
                        type="number"
                        value={formData.credit_balance}
                        onChange={(e) => handleInputChange('credit_balance', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => handleInputChange('notes', e.target.value)}
                      placeholder="Additional notes about the member"
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="payment" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Payment Information</CardTitle>
                  <CardDescription>How much is the member paying today?</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="payment_type">Payment Status *</Label>
                    <Select value={formData.payment_type} onValueChange={(value) => handleInputChange('payment_type', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select payment status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="full">Paying Full Amount Today</SelectItem>
                        <SelectItem value="partial">Paying Partial Amount Today</SelectItem>
                        <SelectItem value="none">Will Pay Later</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {formData.payment_type === 'partial' && (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="down_payment">Amount Paying Today (₹)</Label>
                          <Input
                            id="down_payment"
                            type="number"
                            value={formData.down_payment}
                            onChange={(e) => handleInputChange('down_payment', parseFloat(e.target.value) || 0)}
                            placeholder="Amount member is paying now"
                          />
                        </div>
                        <div>
                          <Label htmlFor="first_installment_date">Next Payment Expected Date</Label>
                          <Input
                            id="first_installment_date"
                            type="date"
                            value={formData.first_installment_date}
                            onChange={(e) => handleInputChange('first_installment_date', e.target.value)}
                            min={new Date().toISOString().split('T')[0]}
                          />
                        </div>
                      </div>

                      {/* Payment Summary */}
                      {formData.package_id && formData.down_payment > 0 && (
                        <div className="bg-blue-50 p-4 rounded-lg">
                          <h4 className="font-medium mb-2 text-blue-800">Payment Summary</h4>
                          {(() => {
                            const selectedPackage = packages.find(pkg => pkg.id === formData.package_id)
                            if (!selectedPackage) return null
                            
                            const totalAmount = selectedPackage.price
                            const paidToday = formData.down_payment || 0
                            const remainingAmount = totalAmount - paidToday
                            
                            return (
                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-gray-700">Package Price:</span>
                                  <span className="font-semibold">₹{totalAmount.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-700">Paying Today:</span>
                                  <span className="font-semibold text-green-600">₹{paidToday.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between border-t pt-2">
                                  <span className="text-gray-700">Remaining Amount:</span>
                                  <span className="font-semibold text-orange-600">₹{remainingAmount.toFixed(2)}</span>
                                </div>
                                {formData.first_installment_date && (
                                  <div className="flex justify-between text-xs text-gray-600">
                                    <span>Next Payment Expected:</span>
                                    <span>{new Date(formData.first_installment_date).toLocaleDateString('hi-IN')}</span>
                                  </div>
                                )}
                              </div>
                            )
                          })()}
                        </div>
                      )}
                    </>
                  )}

                  {formData.payment_type === 'none' && (
                    <div className="bg-yellow-50 p-4 rounded-lg">
                      <p className="text-sm text-yellow-700">
                        Member will pay later. You can add payments anytime from the member's profile.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end space-x-2 pt-6 border-t">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Adding...' : (existingMember ? 'Add Membership' : 'Add Member')}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
