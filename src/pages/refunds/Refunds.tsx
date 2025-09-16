import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
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
  Filter,
  Download,
  Search,
  Eye,
  Edit,
  TrendingDown,
  Users
} from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import { useAuth } from '@/context/AuthContext'
import { useRefunds } from '@/hooks/useRefunds'

export default function RefundsManagement() {
  const { gymId } = useAuth()
  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
    refund_type: 'all',
    date_from: '',
    date_to: ''
  })

  const { refunds, loading, refreshRefunds, updateRefundRequest } = useRefunds({ 
    gym_id: gymId,
    ...filters 
  })

  const [updating, setUpdating] = useState<string | null>(null)

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }))
  }

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

  const handleStatusUpdate = async (refundId: string, newStatus: string) => {
    setUpdating(refundId)
    try {
      const updates: any = { status: newStatus }
      
      if (newStatus === 'approved') {
        updates.reviewed_date = new Date().toISOString().split('T')[0]
      }
      
      if (newStatus === 'processed') {
        updates.processed_date = new Date().toISOString().split('T')[0]
      }

      await updateRefundRequest(refundId, updates)
    } catch (error) {
      console.error('Error updating refund:', error)
    } finally {
      setUpdating(null)
    }
  }

  // Calculate statistics
  const stats = {
    total: refunds.length,
    requested: refunds.filter(r => r.status === 'requested').length,
    approved: refunds.filter(r => r.status === 'approved').length,
    processed: refunds.filter(r => r.status === 'processed').length,
    rejected: refunds.filter(r => r.status === 'rejected').length,
    totalAmount: refunds.reduce((sum, r) => sum + r.requested_amount, 0),
    processedAmount: refunds.filter(r => r.status === 'processed').reduce((sum, r) => sum + (r.final_refund_amount || 0), 0),
    pendingAmount: refunds.filter(r => r.status === 'requested' || r.status === 'approved').reduce((sum, r) => sum + r.eligible_amount, 0)
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <RotateCcw className="h-8 w-8 text-red-600" />
            Refund Management
          </h1>
          <p className="text-muted-foreground">
            Manage and process member refund requests
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={refreshRefunds} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
            <RotateCcw className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              {stats.requested} pending review
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Amount</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{formatCurrency(stats.pendingAmount)}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting processing
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Processed Amount</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(stats.processedAmount)}</div>
            <p className="text-xs text-muted-foreground">
              {stats.processed} completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stats.total > 0 ? Math.round((stats.processed / stats.total) * 100) : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              Processing efficiency
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="list" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="list">Refund List</TabsTrigger>
          <TabsTrigger value="pending">Pending Review</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-6">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="w-5 h-5" />
                Filters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="search">Search Member</Label>
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="search"
                      placeholder="Search by name, phone..."
                      value={filters.search}
                      onChange={(e) => handleFilterChange('search', e.target.value)}
                      className="pl-8"
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Status" />
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
                
                <div>
                  <Label htmlFor="refund_type">Refund Type</Label>
                  <Select value={filters.refund_type} onValueChange={(value) => handleFilterChange('refund_type', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="full_refund">Full Refund</SelectItem>
                      <SelectItem value="partial_refund">Partial Refund</SelectItem>
                      <SelectItem value="pro_rated_refund">Pro-rated Refund</SelectItem>
                      <SelectItem value="cancellation_refund">Cancellation Refund</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="date_from">Date From</Label>
                  <Input
                    id="date_from"
                    type="date"
                    value={filters.date_from}
                    onChange={(e) => handleFilterChange('date_from', e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Refund Table */}
          <Card>
            <CardHeader>
              <CardTitle>Refund Requests</CardTitle>
              <CardDescription>
                {refunds.length} refund request(s) found
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">
                  <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2" />
                  <p>Loading refund requests...</p>
                </div>
              ) : refunds.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Member</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {refunds.map((refund) => (
                      <TableRow key={refund.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {refund.members?.profiles?.first_name} {refund.members?.profiles?.last_name}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {refund.members?.profiles?.phone}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {getRefundTypeLabel(refund.refund_type)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium text-red-600">
                              {formatCurrency(refund.requested_amount)}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Eligible: {formatCurrency(refund.eligible_amount)}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {getRefundStatusBadge(refund.status)}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>{formatDate(new Date(refund.request_date))}</div>
                            {refund.processed_date && (
                              <div className="text-muted-foreground">
                                Processed: {formatDate(new Date(refund.processed_date))}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {refund.status === 'requested' && (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => handleStatusUpdate(refund.id, 'approved')}
                                  disabled={updating === refund.id}
                                  className="bg-blue-600 hover:bg-blue-700"
                                >
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleStatusUpdate(refund.id, 'rejected')}
                                  disabled={updating === refund.id}
                                >
                                  Reject
                                </Button>
                              </>
                            )}
                            
                            {refund.status === 'approved' && (
                              <Button
                                size="sm"
                                onClick={() => handleStatusUpdate(refund.id, 'processed')}
                                disabled={updating === refund.id}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                Process
                              </Button>
                            )}

                            <Button size="sm" variant="outline">
                              <Eye className="w-3 h-3 mr-1" />
                              View
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
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

        <TabsContent value="pending" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl text-yellow-600">
                Pending Review ({stats.requested})
              </CardTitle>
              <CardDescription>
                Refund requests requiring immediate attention
              </CardDescription>
            </CardHeader>
            <CardContent>
              {refunds.filter(r => r.status === 'requested').length > 0 ? (
                <div className="space-y-4">
                  {refunds.filter(r => r.status === 'requested').map((refund) => (
                    <Card key={refund.id} className="border-l-4 border-l-yellow-500">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-medium text-lg">
                              {refund.members?.profiles?.first_name} {refund.members?.profiles?.last_name}
                            </h3>
                            <p className="text-sm text-gray-600">
                              {getRefundTypeLabel(refund.refund_type)} • {formatCurrency(refund.requested_amount)}
                            </p>
                            <p className="text-sm text-gray-500 mt-2">
                              Reason: {refund.reason}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleStatusUpdate(refund.id, 'approved')}
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
                              onClick={() => handleStatusUpdate(refund.id, 'rejected')}
                              disabled={updating === refund.id}
                            >
                              <XCircle className="w-3 h-3 mr-1" />
                              Reject
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <CheckCircle2 className="w-16 h-16 text-green-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">All Caught Up!</h3>
                  <p>No pending refund requests to review</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Status Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Status Distribution</CardTitle>
                <CardDescription>Breakdown of refund statuses</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-yellow-600" />
                    Requested
                  </span>
                  <span className="font-medium">{stats.requested}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-blue-600" />
                    Approved
                  </span>
                  <span className="font-medium">{stats.approved}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                    Processed
                  </span>
                  <span className="font-medium">{stats.processed}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-2">
                    <XCircle className="w-4 h-4 text-red-600" />
                    Rejected
                  </span>
                  <span className="font-medium">{stats.rejected}</span>
                </div>
              </CardContent>
            </Card>

            {/* Financial Overview */}
            <Card>
              <CardHeader>
                <CardTitle>Financial Overview</CardTitle>
                <CardDescription>Refund amounts summary</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span>Total Requested</span>
                  <span className="font-medium text-red-600">
                    {formatCurrency(stats.totalAmount)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Total Processed</span>
                  <span className="font-medium text-green-600">
                    {formatCurrency(stats.processedAmount)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Pending Amount</span>
                  <span className="font-medium text-yellow-600">
                    {formatCurrency(stats.pendingAmount)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Processing Rate</span>
                  <span className="font-medium">
                    {stats.total > 0 ? Math.round((stats.processed / stats.total) * 100) : 0}%
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
