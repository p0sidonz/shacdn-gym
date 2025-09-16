import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { 
  RotateCcw, 
  DollarSign, 
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Clock,
  XCircle,
  RefreshCw,
  FileText,
  Eye,
  Edit,
  Trash2,
  Plus
} from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { MemberWithDetails } from '@/types'
import { useRefunds } from '@/hooks/useRefunds'
import { AddRefundDialog } from './AddRefundDialog'

interface RefundManagementProps {
  member: MemberWithDetails
  onRefundUpdated?: () => void
}

export const RefundManagement: React.FC<RefundManagementProps> = ({ 
  member, 
  onRefundUpdated 
}) => {
  const { refunds, loading, refreshRefunds, updateRefundRequest } = useRefunds({ 
    member_id: member.id 
  })
  
  const [statusFilter, setStatusFilter] = useState('all')
  const [editingRefund, setEditingRefund] = useState<any>(null)
  const [updating, setUpdating] = useState<string | null>(null)

  const getRefundStatusBadge = (status: string) => {
    switch (status) {
      case 'requested':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
          <Clock className="w-3 h-3 mr-1" />
          Requested
        </Badge>
      case 'approved':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          Approved
        </Badge>
      case 'processed':
        return <Badge className="bg-green-100 text-green-800 border-green-200">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          Processed
        </Badge>
      case 'rejected':
        return <Badge variant="destructive">
          <XCircle className="w-3 h-3 mr-1" />
          Rejected
        </Badge>
      case 'cancelled':
        return <Badge className="bg-gray-100 text-gray-800 border-gray-200">
          <XCircle className="w-3 h-3 mr-1" />
          Cancelled
        </Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const getRefundTypeLabel = (type: string) => {
    switch (type) {
      case 'full_refund':
        return 'Full Refund'
      case 'partial_refund':
        return 'Partial Refund'
      case 'pro_rated_refund':
        return 'Pro-rated Refund'
      case 'cancellation_refund':
        return 'Cancellation Refund'
      default:
        return type.replace('_', ' ').toUpperCase()
    }
  }

  const handleStatusUpdate = async (refundId: string, newStatus: string, comments?: string) => {
    setUpdating(refundId)
    try {
      const updates: any = { status: newStatus }
      
      if (comments) {
        updates.admin_comments = comments
      }
      
      if (newStatus === 'approved') {
        updates.reviewed_date = new Date().toISOString().split('T')[0]
      }
      
      if (newStatus === 'processed') {
        updates.processed_date = new Date().toISOString().split('T')[0]
      }

      await updateRefundRequest(refundId, updates)
      
      if (onRefundUpdated) {
        onRefundUpdated()
      }
    } catch (error) {
      console.error('Error updating refund:', error)
    } finally {
      setUpdating(null)
    }
  }

  const filteredRefunds = statusFilter === 'all' 
    ? refunds 
    : refunds.filter(refund => refund.status === statusFilter)

  const refundStats = {
    total: refunds.length,
    requested: refunds.filter(r => r.status === 'requested').length,
    approved: refunds.filter(r => r.status === 'approved').length,
    processed: refunds.filter(r => r.status === 'processed').length,
    rejected: refunds.filter(r => r.status === 'rejected').length,
    totalAmount: refunds.reduce((sum, r) => sum + (r.final_refund_amount || r.requested_amount), 0),
    processedAmount: refunds.filter(r => r.status === 'processed').reduce((sum, r) => sum + (r.final_refund_amount || 0), 0)
  }

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <RotateCcw className="w-6 h-6 text-red-600" />
            Refund Management
          </h2>
          <p className="text-gray-600">Manage refund requests for {member.profiles?.first_name} {member.profiles?.last_name}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={refreshRefunds} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <AddRefundDialog 
            member={member} 
            onRefundAdded={() => {
              refreshRefunds()
              if (onRefundUpdated) {
                onRefundUpdated()
              }
            }} 
          />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <RotateCcw className="w-5 h-5 text-gray-600" />
              <div>
                <div className="text-2xl font-bold">{refundStats.total}</div>
                <div className="text-sm text-gray-500">Total Requests</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-yellow-600" />
              <div>
                <div className="text-2xl font-bold text-yellow-600">{refundStats.requested}</div>
                <div className="text-sm text-gray-500">Pending</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <div>
                <div className="text-2xl font-bold text-green-600">{refundStats.processed}</div>
                <div className="text-sm text-gray-500">Processed</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <DollarSign className="w-5 h-5 text-red-600" />
              <div>
                <div className="text-2xl font-bold text-red-600">
                  {formatCurrency(refundStats.processedAmount)}
                </div>
                <div className="text-sm text-gray-500">Refunded</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="list" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="list">Refund List</TabsTrigger>
          <TabsTrigger value="summary">Summary</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Filter Refunds</CardTitle>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="requested">Requested</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="processed">Processed</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
          </Card>

          {/* Refund List */}
          <Card>
            <CardHeader>
              <CardTitle>Refund Requests</CardTitle>
              <CardDescription>
                {filteredRefunds.length} refund request(s) found
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-gray-500">
                  <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2" />
                  Loading refund requests...
                </div>
              ) : filteredRefunds.length > 0 ? (
                <div className="space-y-4">
                  {filteredRefunds.map((refund) => (
                    <Card key={refund.id} className="border-l-4 border-l-red-500">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="space-y-2">
                            <div className="flex items-center gap-3">
                              <h3 className="font-medium text-lg">
                                {getRefundTypeLabel(refund.refund_type)}
                              </h3>
                              {getRefundStatusBadge(refund.status)}
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <span className="text-gray-500">Requested:</span>
                                <span className="ml-2 font-medium text-red-600">
                                  {formatCurrency(refund.requested_amount)}
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-500">Eligible:</span>
                                <span className="ml-2 font-medium">
                                  {formatCurrency(refund.eligible_amount)}
                                </span>
                              </div>
                              {refund.final_refund_amount && (
                                <div>
                                  <span className="text-gray-500">Final:</span>
                                  <span className="ml-2 font-medium text-green-600">
                                    {formatCurrency(refund.final_refund_amount)}
                                  </span>
                                </div>
                              )}
                              <div>
                                <span className="text-gray-500">Date:</span>
                                <span className="ml-2">
                                  {formatDate(new Date(refund.request_date))}
                                </span>
                              </div>
                            </div>

                            <div className="space-y-2">
                              <div>
                                <span className="text-gray-500 text-sm">Reason:</span>
                                <p className="text-sm mt-1 p-2 bg-gray-50 rounded">
                                  {refund.reason}
                                </p>
                              </div>
                              
                              {refund.member_comments && (
                                <div>
                                  <span className="text-gray-500 text-sm">Member Comments:</span>
                                  <p className="text-sm mt-1 p-2 bg-blue-50 rounded">
                                    {refund.member_comments}
                                  </p>
                                </div>
                              )}
                              
                              {refund.admin_comments && (
                                <div>
                                  <span className="text-gray-500 text-sm">Admin Comments:</span>
                                  <p className="text-sm mt-1 p-2 bg-orange-50 rounded">
                                    {refund.admin_comments}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex flex-col gap-2 ml-4">
                            {refund.status === 'requested' && (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => handleStatusUpdate(refund.id, 'approved', 'Refund approved by admin')}
                                  disabled={updating === refund.id}
                                  className="bg-blue-600 hover:bg-blue-700"
                                >
                                  {updating === refund.id ? (
                                    <RefreshCw className="w-3 h-3 animate-spin mr-1" />
                                  ) : (
                                    <CheckCircle2 className="w-3 h-3 mr-1" />
                                  )}
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleStatusUpdate(refund.id, 'rejected', 'Refund rejected by admin')}
                                  disabled={updating === refund.id}
                                >
                                  <XCircle className="w-3 h-3 mr-1" />
                                  Reject
                                </Button>
                              </>
                            )}
                            
                            {refund.status === 'approved' && (
                              <Button
                                size="sm"
                                onClick={() => handleStatusUpdate(refund.id, 'processed', 'Refund processed successfully')}
                                disabled={updating === refund.id}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                {updating === refund.id ? (
                                  <RefreshCw className="w-3 h-3 animate-spin mr-1" />
                                ) : (
                                  <CheckCircle2 className="w-3 h-3 mr-1" />
                                )}
                                Process
                              </Button>
                            )}

                            <Button size="sm" variant="outline">
                              <Eye className="w-3 h-3 mr-1" />
                              Details
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <RotateCcw className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Refund Requests</h3>
                  <p>No refund requests found for the selected criteria</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="summary" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Status Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Status Breakdown</CardTitle>
                <CardDescription>Refund requests by status</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-yellow-600" />
                    Requested
                  </span>
                  <span className="font-medium">{refundStats.requested}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-blue-600" />
                    Approved
                  </span>
                  <span className="font-medium">{refundStats.approved}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                    Processed
                  </span>
                  <span className="font-medium">{refundStats.processed}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-2">
                    <XCircle className="w-4 h-4 text-red-600" />
                    Rejected
                  </span>
                  <span className="font-medium">{refundStats.rejected}</span>
                </div>
              </CardContent>
            </Card>

            {/* Financial Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Financial Summary</CardTitle>
                <CardDescription>Refund amounts overview</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span>Total Requested</span>
                  <span className="font-medium text-red-600">
                    {formatCurrency(refunds.reduce((sum, r) => sum + r.requested_amount, 0))}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Total Eligible</span>
                  <span className="font-medium">
                    {formatCurrency(refunds.reduce((sum, r) => sum + r.eligible_amount, 0))}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Total Processed</span>
                  <span className="font-medium text-green-600">
                    {formatCurrency(refundStats.processedAmount)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Pending Amount</span>
                  <span className="font-medium text-yellow-600">
                    {formatCurrency(
                      refunds
                        .filter(r => r.status === 'requested' || r.status === 'approved')
                        .reduce((sum, r) => sum + r.eligible_amount, 0)
                    )}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
