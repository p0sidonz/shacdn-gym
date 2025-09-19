import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Edit, Save } from 'lucide-react'
import { useMember } from '@/hooks/useMembers'
import { MemberService } from '@/services/memberService'

interface EditMemberDialogProps {
  member: any
  onMemberUpdated?: (member: any) => void
  trigger?: React.ReactNode
}

export const EditMemberDialog: React.FC<EditMemberDialogProps> = ({ member, onMemberUpdated, trigger }) => {
  const { updateMember } = useMember(member.id)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  
  const [formData, setFormData] = useState({
    status: member.status || '',
    source: member.source || '',
    credit_balance: member.credit_balance || 0,
    security_deposit: member.security_deposit || 0,
    notes: member.notes || '',
    tags: member.tags || [],
    first_name: member.profile?.first_name || '',
    last_name: member.profile?.last_name || '',
    phone: member.profile?.phone || '',
    date_of_birth: member.profile?.date_of_birth || '',
    gender: member.profile?.gender || '',
    address: member.profile?.address || '',
    emergency_contact_name: member.profile?.emergency_contact_name || '',
    emergency_contact_phone: member.profile?.emergency_contact_phone || '',
    profile_image_url: member.profile?.profile_image_url || ''
  })

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      const memberUpdates = {
        status: formData.status,
        source: formData.source,
        credit_balance: formData.credit_balance,
        security_deposit: formData.security_deposit,
        notes: formData.notes,
        tags: formData.tags
      }
      const profileUpdates = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        phone: formData.phone,
        date_of_birth: formData.date_of_birth,
        gender: formData.gender,
        address: formData.address,
        emergency_contact_name: formData.emergency_contact_name,
        emergency_contact_phone: formData.emergency_contact_phone,
        profile_image_url: formData.profile_image_url
      }

      const [updatedMember, updatedProfile] = await Promise.all([
        updateMember(memberUpdates),
        member.profile_id ? MemberService.updateProfile(member.profile_id, profileUpdates) : Promise.resolve(null)
      ])

      if (onMemberUpdated) {
        onMemberUpdated(updatedMember)
      }
      
      setOpen(false)
    } catch (error) {
      console.error('Error updating member:', error)
      alert(`Error updating member: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ? (
          <>{trigger}</>
        ) : (
          <Button variant="outline" size="sm">
            <Edit className="w-4 h-4 mr-2" />
            Edit Member
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Member</DialogTitle>
          <DialogDescription>
            Update details for {member.profile?.first_name} {member.profile?.last_name}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-3">
            <h3 className="font-medium">Profile Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="first_name">First Name</Label>
                <Input id="first_name" value={formData.first_name} onChange={(e) => handleInputChange('first_name', e.target.value)} className="mobile-input" />
              </div>
              <div>
                <Label htmlFor="last_name">Last Name</Label>
                <Input id="last_name" value={formData.last_name} onChange={(e) => handleInputChange('last_name', e.target.value)} className="mobile-input" />
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" value={formData.phone} onChange={(e) => handleInputChange('phone', e.target.value)} className="mobile-input" />
              </div>
              <div>
                <Label htmlFor="date_of_birth">Date of Birth</Label>
                <Input id="date_of_birth" type="date" value={formData.date_of_birth || ''} onChange={(e) => handleInputChange('date_of_birth', e.target.value)} className="mobile-input" />
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
                    <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="profile_image_url">Profile Image URL</Label>
                <Input id="profile_image_url" value={formData.profile_image_url} onChange={(e) => handleInputChange('profile_image_url', e.target.value)} className="mobile-input" />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="address">Address</Label>
                <Textarea id="address" value={formData.address} onChange={(e) => handleInputChange('address', e.target.value)} className="mobile-input" />
              </div>
              <div>
                <Label htmlFor="emergency_contact_name">Emergency Contact Name</Label>
                <Input id="emergency_contact_name" value={formData.emergency_contact_name} onChange={(e) => handleInputChange('emergency_contact_name', e.target.value)} className="mobile-input" />
              </div>
              <div>
                <Label htmlFor="emergency_contact_phone">Emergency Contact Phone</Label>
                <Input id="emergency_contact_phone" value={formData.emergency_contact_phone} onChange={(e) => handleInputChange('emergency_contact_phone', e.target.value)} className="mobile-input" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={formData.status} onValueChange={(value) => handleInputChange('status', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="trial">Trial</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                  <SelectItem value="pending_payment">Pending Payment</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="source">Source</Label>
              <Select value={formData.source} onValueChange={(value) => handleInputChange('source', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select source" />
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
              <Label htmlFor="credit_balance">Credit Balance</Label>
              <Input
                id="credit_balance"
                type="number"
                step="0.01"
                value={formData.credit_balance}
                onChange={(e) => handleInputChange('credit_balance', parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                className="mobile-input"
              />
            </div>
            
            <div>
              <Label htmlFor="security_deposit">Security Deposit</Label>
              <Input
                id="security_deposit"
                type="number"
                step="0.01"
                value={formData.security_deposit}
                onChange={(e) => handleInputChange('security_deposit', parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                className="mobile-input"
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
              className="mobile-input"
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
