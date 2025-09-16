import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowRight, DollarSign, User, Search, AlertTriangle } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { formatCurrency, formatDate } from '@/lib/utils'

interface MembershipTransferDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  member: any
  membership: any
  onTransferComplete: () => void
}

export const MembershipTransferDialog: React.FC<MembershipTransferDialogProps> = ({
  open,
  onOpenChange,
  member,
  membership,
  onTransferComplete
}) => {
  const { gymId } = useAuth()
  const [loading, setLoading] = useState(false)
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchResults, setSearchResults] = useState<any[]>([])
  
  const [formData, setFormData] = useState({
    transfer_type: 'member_to_member', // 'member_to_member', 'create_new_member'
    search_query: '',
    target_member_id: '',
    target_member_details: null as any,
    transfer_date: new Date().toISOString().split('T')[0],
    transfer_fee: 0,
    payment_method: 'cash',
    reason: '',
    notes: '',
    // For new member creation
    new_member_name: '',
    new_member_phone: '',
    new_member_email: ''
  })

  const [transferCalculation, setTransferCalculation] = useState<any>(null)

  useEffect(() => {
    if (membership) {
      calculateTransferDetails()
    }
  }, [membership, formData.transfer_date])

  const calculateTransferDetails = () => {
    const transferDate = new Date(formData.transfer_date)
    const endDate = new Date(membership.end_date)
    const remainingDays = Math.max(0, Math.ceil((endDate.getTime() - transferDate.getTime()) / (1000 * 60 * 60 * 24)))
    
    // Calculate transfer fee (typically a percentage or fixed amount)
    const packagePrice = membership.membership_packages?.price || membership.total_amount_due
    const defaultTransferFee = packagePrice * 0.05 // 5% transfer fee
    
    setTransferCalculation({
      remainingDays,
      transferValue: membership.amount_paid - membership.amount_pending,
      transferFee: defaultTransferFee,
      packagePrice
    })

    setFormData(prev => ({
      ...prev,
      transfer_fee: defaultTransferFee
    }))
  }

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const searchMembers = async (query: string) => {
    if (!query || query.length < 2) {
      setSearchResults([])
      return
    }

    setSearchLoading(true)
    try {
      const { data, error } = await supabase
        .from('members')
        .select(`
          id,
          member_id,
          status,
          profiles!profile_id (
            first_name,
            last_name,
            phone
          )
        `)
        .eq('gym_id', gymId)
        .neq('id', member.id) // Exclude current member
        .or(`member_id.ilike.%${query}%, profiles.first_name.ilike.%${query}%, profiles.last_name.ilike.%${query}%, profiles.phone.ilike.%${query}%`)
        .limit(10)

      if (error) throw error
      setSearchResults(data || [])
    } catch (error) {
      console.error('Error searching members:', error)
    } finally {
      setSearchLoading(false)
    }
  }

  const handleMemberSelect = (selectedMember: any) => {
    setFormData(prev => ({
      ...prev,
      target_member_id: selectedMember.id,
      target_member_details: selectedMember,
      search_query: `${selectedMember.profiles?.first_name} ${selectedMember.profiles?.last_name} (${selectedMember.member_id})`
    }))
    setSearchResults([])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (formData.transfer_type === 'member_to_member' && !formData.target_member_id) {
      alert('Please select a target member')
      return
    }

    if (formData.transfer_type === 'create_new_member' && (!formData.new_member_name || !formData.new_member_phone)) {
      alert('Please provide new member details')
      return
    }

    if (!formData.reason) {
      alert('Please provide a reason for transfer')
      return
    }

    setLoading(true)

    try {
      let targetMemberId = formData.target_member_id

      // Create new member if transfer type is create_new_member
      if (formData.transfer_type === 'create_new_member') {
        // Create auth user for new member
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: formData.new_member_email || `temp_${Date.now()}@temp.com`,
          password: 'temp123!',
          options: {
            data: {
              first_name: formData.new_member_name.split(' ')[0],
              last_name: formData.new_member_name.split(' ').slice(1).join(' '),
              phone: formData.new_member_phone
            }
          }
        })

        if (authError) throw authError

        // Create profile
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .insert([{
            user_id: authData.user!.id,
            first_name: formData.new_member_name.split(' ')[0],
            last_name: formData.new_member_name.split(' ').slice(1).join(' '),
            phone: formData.new_member_phone
          }])
          .select()
          .single()

        if (profileError) throw profileError

        // Create member
        const { data: newMemberData, error: memberError } = await supabase
          .from('members')
          .insert([{
            gym_id: gymId,
            user_id: authData.user!.id,
            profile_id: profileData.id,
            member_id: `MEM${Date.now()}`,
            joining_date: formData.transfer_date,
            status: 'active'
          }])
          .select()
          .single()

        if (memberError) throw memberError

        targetMemberId = newMemberData.id
      }

      // 1. Update current membership status to 'transferred'
      await supabase
        .from('memberships')
        .update({
          status: 'transferred',
          actual_end_date: formData.transfer_date,
          transferred_to_member_id: targetMemberId,
          transfer_fee_paid: formData.transfer_fee
        })
        .eq('id', membership.id)

      // 2. Create new membership for target member
      const remainingDays = transferCalculation?.remainingDays || 0
      const newEndDate = new Date(formData.transfer_date)
      newEndDate.setDate(newEndDate.getDate() + remainingDays)

      const newMembershipData = {
        member_id: targetMemberId,
        package_id: membership.package_id,
        original_membership_id: membership.id,
        start_date: formData.transfer_date,
        end_date: newEndDate.toISOString().split('T')[0],
        status: 'active',
        original_amount: membership.original_amount,
        total_amount_due: Math.max(0, membership.amount_pending + formData.transfer_fee),
        amount_paid: 0,
        amount_pending: Math.max(0, membership.amount_pending + formData.transfer_fee),
        transferred_from_member_id: member.id,
        is_trial: false
      }

      const { data: newMembership, error: membershipError } = await supabase
        .from('memberships')
        .insert([newMembershipData])
        .select()
        .single()

      if (membershipError) throw membershipError

      // 3. Record membership change for original member
      const changeData = {
        member_id: member.id,
        from_membership_id: membership.id,
        to_membership_id: newMembership.id,
        change_type: 'transfer',
        change_date: formData.transfer_date,
        amount_difference: -formData.transfer_fee,
        remaining_days: remainingDays,
        reason: formData.reason,
        processed_by: (await supabase.auth.getUser()).data.user?.id
      }

      await supabase
        .from('membership_changes')
        .insert([changeData])

      // 4. Record transfer fee payment if applicable
      if (formData.transfer_fee > 0) {
        const paymentData = {
          gym_id: gymId,
          member_id: member.id,
          membership_id: membership.id,
          payment_type: 'transfer_fee',
          amount: formData.transfer_fee,
          original_amount: formData.transfer_fee,
          payment_method: formData.payment_method,
          payment_date: formData.transfer_date,
          status: 'paid',
          receipt_number: `TRF${Date.now()}`,
          description: `Transfer fee for membership transfer`,
          notes: formData.notes,
          processed_by: (await supabase.auth.getUser()).data.user?.id
        }

        await supabase
          .from('payments')
          .insert([paymentData])
      }

      // 5. Add credit to original member if there's remaining value after transfer fee
      const remainingCredit = Math.max(0, (membership.amount_paid || 0) - formData.transfer_fee)
      if (remainingCredit > 0) {
        await supabase
          .from('members')
          .update({
            credit_balance: (member.credit_balance || 0) + remainingCredit
          })
          .eq('id', member.id)

        // Record credit transaction
        await supabase
          .from('credit_transactions')
          .insert([{
            gym_id: gymId,
            member_id: member.id,
            membership_id: membership.id,
            transaction_type: 'credit_from_transfer',
            amount: remainingCredit,
            balance_before: member.credit_balance || 0,
            balance_after: (member.credit_balance || 0) + remainingCredit,
            description: `Credit from membership transfer`,
            processed_by: (await supabase.auth.getUser()).data.user?.id
          }])
      }

      const targetName = formData.transfer_type === 'create_new_member' 
        ? formData.new_member_name 
        : `${formData.target_member_details?.profiles?.first_name} ${formData.target_member_details?.profiles?.last_name}`

      alert(`Membership transferred successfully to ${targetName}!`)
      onTransferComplete()
      onOpenChange(false)

    } catch (error) {
      console.error('Error transferring membership:', error)
      alert(`Error transferring membership: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRight className="w-5 h-5 text-purple-600" />
            Transfer Membership
          </DialogTitle>
          <DialogDescription>
            Transfer {member.profile?.first_name} {member.profile?.last_name}'s membership to another member
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Transfer Type */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Transfer Type</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={formData.transfer_type} onValueChange={(value) => handleInputChange('transfer_type', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member_to_member">Transfer to Existing Member</SelectItem>
                  <SelectItem value="create_new_member">Transfer to New Member</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Target Member Selection */}
          {formData.transfer_type === 'member_to_member' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Select Target Member
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="search_query">Search Member *</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      id="search_query"
                      value={formData.search_query}
                      onChange={(e) => {
                        handleInputChange('search_query', e.target.value)
                        searchMembers(e.target.value)
                      }}
                      placeholder="Search by member ID, name, or phone"
                      className="pl-10"
                    />
                  </div>
                  
                  {searchLoading && (
                    <p className="text-sm text-gray-500 mt-1">Searching...</p>
                  )}
                  
                  {searchResults.length > 0 && (
                    <div className="mt-2 border rounded-md max-h-48 overflow-y-auto">
                      {searchResults.map((result) => (
                        <div
                          key={result.id}
                          className="p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                          onClick={() => handleMemberSelect(result)}
                        >
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="font-medium">
                                {result.profiles?.first_name} {result.profiles?.last_name}
                              </p>
                              <p className="text-sm text-gray-500">
                                {result.member_id} • {result.profiles?.phone}
                              </p>
                            </div>
                            <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">
                              {result.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {formData.target_member_details && (
                  <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                    <p className="font-medium text-green-800">Selected Member:</p>
                    <p className="text-sm text-green-700">
                      {formData.target_member_details.profiles?.first_name} {formData.target_member_details.profiles?.last_name}
                      ({formData.target_member_details.member_id})
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* New Member Details */}
          {formData.transfer_type === 'create_new_member' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">New Member Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="new_member_name">Full Name *</Label>
                    <Input
                      id="new_member_name"
                      value={formData.new_member_name}
                      onChange={(e) => handleInputChange('new_member_name', e.target.value)}
                      placeholder="Enter full name"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="new_member_phone">Phone Number *</Label>
                    <Input
                      id="new_member_phone"
                      value={formData.new_member_phone}
                      onChange={(e) => handleInputChange('new_member_phone', e.target.value)}
                      placeholder="Enter phone number"
                      required
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="new_member_email">Email (Optional)</Label>
                  <Input
                    id="new_member_email"
                    type="email"
                    value={formData.new_member_email}
                    onChange={(e) => handleInputChange('new_member_email', e.target.value)}
                    placeholder="Enter email address"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Current Membership Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Current Membership Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Package:</span>
                  <p className="font-medium">{membership.membership_packages?.name}</p>
                </div>
                <div>
                  <span className="text-gray-600">End Date:</span>
                  <p className="font-medium">{formatDate(membership.end_date)}</p>
                </div>
                <div>
                  <span className="text-gray-600">Amount Paid:</span>
                  <p className="font-medium">{formatCurrency(membership.amount_paid || 0)}</p>
                </div>
                <div>
                  <span className="text-gray-600">Pending:</span>
                  <p className="font-medium">{formatCurrency(membership.amount_pending || 0)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Transfer Calculation */}
          {transferCalculation && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Transfer Calculation
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Remaining Days:</span>
                    <p className="font-medium">{transferCalculation.remainingDays} days</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Transfer Value:</span>
                    <p className="font-medium">{formatCurrency(transferCalculation.transferValue)}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Transfer Fee:</span>
                    <p className="font-medium text-red-600">{formatCurrency(transferCalculation.transferFee)}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Credit to Original Member:</span>
                    <p className="font-medium text-green-600">
                      {formatCurrency(Math.max(0, transferCalculation.transferValue - transferCalculation.transferFee))}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Transfer Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Transfer Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="transfer_date">Transfer Date *</Label>
                  <Input
                    id="transfer_date"
                    type="date"
                    value={formData.transfer_date}
                    onChange={(e) => handleInputChange('transfer_date', e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="transfer_fee">Transfer Fee (₹)</Label>
                  <Input
                    id="transfer_fee"
                    type="number"
                    step="0.01"
                    value={formData.transfer_fee}
                    onChange={(e) => handleInputChange('transfer_fee', parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="payment_method">Payment Method for Fee</Label>
                <Select value={formData.payment_method} onValueChange={(value) => handleInputChange('payment_method', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                    <SelectItem value="upi">UPI</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="adjustment">Credit Adjustment</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="reason">Reason for Transfer *</Label>
                <Input
                  id="reason"
                  value={formData.reason}
                  onChange={(e) => handleInputChange('reason', e.target.value)}
                  placeholder="e.g., Family member taking over membership"
                  required
                />
              </div>

              <div>
                <Label htmlFor="notes">Additional Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  placeholder="Any additional notes about the transfer"
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          {/* Warning */}
          <Card className="border-yellow-200 bg-yellow-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-yellow-800">
                <AlertTriangle className="w-4 h-4" />
                <span className="font-medium">Transfer Notice</span>
              </div>
              <p className="text-sm text-yellow-700 mt-1">
                This action will permanently transfer the membership. The original member will lose access to the membership benefits.
              </p>
            </CardContent>
          </Card>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loading || (formData.transfer_type === 'member_to_member' && !formData.target_member_id)}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {loading ? 'Processing...' : 'Transfer Membership'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
