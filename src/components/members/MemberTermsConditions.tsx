import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  FileText, 
  Plus, 
  Edit, 
  Trash2, 
  CheckCircle2, 
  AlertCircle,
  Calendar,
  User,
  Download,
  Eye,
  Clock
} from 'lucide-react'
import { formatDate } from '@/lib/utils'
import type { MemberWithDetails } from '@/types'

interface MemberTermsConditionsProps {
  member: MemberWithDetails
  onTermsUpdated?: () => void
}

interface TermsCondition {
  id: string
  title: string
  content: string
  category: 'membership' | 'payment' | 'cancellation' | 'refund' | 'general'
  status: 'active' | 'inactive' | 'draft'
  effectiveDate: string
  expiryDate?: string
  version: string
  createdBy: string
  lastModified: string
  isSigned: boolean
  signedDate?: string
  signedBy?: string
}

export const MemberTermsConditions: React.FC<MemberTermsConditionsProps> = ({ 
  member, 
  onTermsUpdated 
}) => {
  const [isAddTermsOpen, setIsAddTermsOpen] = useState(false)
  const [isEditTermsOpen, setIsEditTermsOpen] = useState(false)
  const [editingTerms, setEditingTerms] = useState<TermsCondition | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  // Mock data - in real app, this would come from API
  const [termsConditions, setTermsConditions] = useState<TermsCondition[]>([
    {
      id: '1',
      title: 'Membership Agreement',
      content: 'This membership agreement outlines the terms and conditions for your gym membership...',
      category: 'membership',
      status: 'active',
      effectiveDate: '2025-01-01',
      version: '1.0',
      createdBy: 'Admin',
      lastModified: '2025-01-01',
      isSigned: true,
      signedDate: '2025-01-15',
      signedBy: member.profile ? `${member.profile.first_name} ${member.profile.last_name}` : 'Member'
    },
    {
      id: '2',
      title: 'Payment Terms',
      content: 'Payment terms and conditions for membership fees and additional services...',
      category: 'payment',
      status: 'active',
      effectiveDate: '2025-01-01',
      version: '1.0',
      createdBy: 'Admin',
      lastModified: '2025-01-01',
      isSigned: true,
      signedDate: '2025-01-15',
      signedBy: member.profile ? `${member.profile.first_name} ${member.profile.last_name}` : 'Member'
    },
    {
      id: '3',
      title: 'Cancellation Policy',
      content: 'Terms and conditions for membership cancellation and refunds...',
      category: 'cancellation',
      status: 'active',
      effectiveDate: '2025-01-01',
      version: '1.0',
      createdBy: 'Admin',
      lastModified: '2025-01-01',
      isSigned: false
    }
  ])

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case 'membership':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Membership</Badge>
      case 'payment':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Payment</Badge>
      case 'cancellation':
        return <Badge className="bg-red-100 text-red-800 border-red-200">Cancellation</Badge>
      case 'refund':
        return <Badge className="bg-orange-100 text-orange-800 border-orange-200">Refund</Badge>
      case 'general':
        return <Badge className="bg-gray-100 text-gray-800 border-gray-200">General</Badge>
      default:
        return <Badge variant="secondary">{category}</Badge>
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Active</Badge>
      case 'inactive':
        return <Badge className="bg-gray-100 text-gray-800 border-gray-200">Inactive</Badge>
      case 'draft':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Draft</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const filteredTerms = selectedCategory === 'all' 
    ? termsConditions 
    : termsConditions.filter(t => t.category === selectedCategory)

  const handleAddTerms = (formData: FormData) => {
    const newTerms: TermsCondition = {
      id: Date.now().toString(),
      title: formData.get('title') as string,
      content: formData.get('content') as string,
      category: formData.get('category') as any,
      status: 'draft',
      effectiveDate: formData.get('effectiveDate') as string,
      version: '1.0',
      createdBy: 'Current User',
      lastModified: new Date().toISOString().split('T')[0],
      isSigned: false
    }

    setTermsConditions([...termsConditions, newTerms])
    setIsAddTermsOpen(false)
    if (onTermsUpdated) onTermsUpdated()
  }

  const handleEditTerms = (terms: TermsCondition) => {
    setEditingTerms(terms)
    setIsEditTermsOpen(true)
  }

  const handleDeleteTerms = (id: string) => {
    setTermsConditions(termsConditions.filter(t => t.id !== id))
    if (onTermsUpdated) onTermsUpdated()
  }

  const handleSignTerms = (id: string) => {
    setTermsConditions(termsConditions.map(t => 
      t.id === id ? { 
        ...t, 
        isSigned: true, 
        signedDate: new Date().toISOString().split('T')[0],
        signedBy: member.profile ? `${member.profile.first_name} ${member.profile.last_name}` : 'Member'
      } : t
    ))
    if (onTermsUpdated) onTermsUpdated()
  }

  const signedCount = termsConditions.filter(t => t.isSigned).length
  const totalCount = termsConditions.length

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Member Terms & Conditions</h3>
          <p className="text-sm text-gray-500">Manage terms and conditions for this member</p>
        </div>
        <Dialog open={isAddTermsOpen} onOpenChange={setIsAddTermsOpen}>
          <DialogTrigger asChild>
            <Button className="bg-orange-500 hover:bg-orange-600 text-white">
              <Plus className="w-4 h-4 mr-2" />
              Add Terms
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New Terms & Conditions</DialogTitle>
              <DialogDescription>
                Create new terms and conditions for this member
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={(e) => {
              e.preventDefault()
              const formData = new FormData(e.currentTarget)
              handleAddTerms(formData)
            }}>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">Title</Label>
                  <Input name="title" placeholder="Enter terms title" required />
                </div>

                <div>
                  <Label htmlFor="category">Category</Label>
                  <Select name="category" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="membership">Membership</SelectItem>
                      <SelectItem value="payment">Payment</SelectItem>
                      <SelectItem value="cancellation">Cancellation</SelectItem>
                      <SelectItem value="refund">Refund</SelectItem>
                      <SelectItem value="general">General</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="effectiveDate">Effective Date</Label>
                  <Input type="date" name="effectiveDate" required />
                </div>

                <div>
                  <Label htmlFor="content">Content</Label>
                  <Textarea 
                    name="content" 
                    placeholder="Enter terms and conditions content"
                    rows={8}
                    required
                  />
                </div>

                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setIsAddTermsOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    Add Terms
                  </Button>
                </div>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <FileText className="w-5 h-5 text-blue-600" />
              <div>
                <div className="text-2xl font-bold">{totalCount}</div>
                <div className="text-sm text-gray-500">Total Terms</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <div>
                <div className="text-2xl font-bold">{signedCount}</div>
                <div className="text-sm text-gray-500">Signed</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-orange-600" />
              <div>
                <div className="text-2xl font-bold">{totalCount - signedCount}</div>
                <div className="text-sm text-gray-500">Pending</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <div className="flex items-center space-x-4">
        <Label htmlFor="categoryFilter">Filter by Category:</Label>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="membership">Membership</SelectItem>
            <SelectItem value="payment">Payment</SelectItem>
            <SelectItem value="cancellation">Cancellation</SelectItem>
            <SelectItem value="refund">Refund</SelectItem>
            <SelectItem value="general">General</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Terms List */}
      <div className="space-y-4">
        {filteredTerms.length > 0 ? (
          filteredTerms.map((terms) => (
            <Card key={terms.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center space-x-2">
                      <span>{terms.title}</span>
                      {terms.isSigned && (
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                      )}
                    </CardTitle>
                    <CardDescription>
                      Version {terms.version} • Effective from {formatDate(new Date(terms.effectiveDate))}
                    </CardDescription>
                  </div>
                  <div className="flex items-center space-x-2">
                    {getCategoryBadge(terms.category)}
                    {getStatusBadge(terms.status)}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="text-sm text-gray-600 whitespace-pre-wrap">
                      {terms.content}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <div className="text-gray-500">Created By</div>
                      <div className="font-medium">{terms.createdBy}</div>
                    </div>
                    <div>
                      <div className="text-gray-500">Last Modified</div>
                      <div className="font-medium">{formatDate(new Date(terms.lastModified))}</div>
                    </div>
                    <div>
                      <div className="text-gray-500">Status</div>
                      <div className="font-medium">
                        {terms.isSigned ? (
                          <span className="text-green-600">Signed</span>
                        ) : (
                          <span className="text-orange-600">Pending</span>
                        )}
                      </div>
                    </div>
                    {terms.isSigned && (
                      <div>
                        <div className="text-gray-500">Signed Date</div>
                        <div className="font-medium">{formatDate(new Date(terms.signedDate!))}</div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleSignTerms(terms.id)}
                        disabled={terms.isSigned}
                      >
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        {terms.isSigned ? 'Signed' : 'Sign Terms'}
                      </Button>
                      <Button size="sm" variant="outline">
                        <Eye className="w-4 h-4 mr-2" />
                        View
                      </Button>
                      <Button size="sm" variant="outline">
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </Button>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => handleEditTerms(terms)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => handleDeleteTerms(terms.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="text-center py-8">
              <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No Terms & Conditions Found</h3>
              <p className="text-gray-500">No terms and conditions available for this member</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Edit Terms Dialog */}
      <Dialog open={isEditTermsOpen} onOpenChange={setIsEditTermsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Terms & Conditions</DialogTitle>
            <DialogDescription>
              Update the terms and conditions details
            </DialogDescription>
          </DialogHeader>
          {editingTerms && (
            <form onSubmit={(e) => {
              e.preventDefault()
              // Handle edit logic here
              setIsEditTermsOpen(false)
              setEditingTerms(null)
            }}>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="editTitle">Title</Label>
                  <Input 
                    name="editTitle" 
                    defaultValue={editingTerms.title}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="editCategory">Category</Label>
                  <Select name="editCategory" defaultValue={editingTerms.category}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="membership">Membership</SelectItem>
                      <SelectItem value="payment">Payment</SelectItem>
                      <SelectItem value="cancellation">Cancellation</SelectItem>
                      <SelectItem value="refund">Refund</SelectItem>
                      <SelectItem value="general">General</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="editContent">Content</Label>
                  <Textarea 
                    name="editContent" 
                    defaultValue={editingTerms.content}
                    rows={8}
                    required
                  />
                </div>

                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setIsEditTermsOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    Update Terms
                  </Button>
                </div>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
