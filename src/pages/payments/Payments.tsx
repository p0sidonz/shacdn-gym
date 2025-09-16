import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { DollarSign, Plus, Search, Filter, Download, RotateCcw } from 'lucide-react'
import { PaymentService } from '@/services/paymentService'
import { RefundService } from '@/services/refundService'
import { useAuth } from '@/context/AuthContext'
import { formatCurrency } from '@/lib/utils'

interface TransactionItem {
  id: string
  type: 'payment' | 'refund'
  amount: number
  date: string
  status: string
  method: string
  description: string
  member_name: string
  member_phone: string
  membership_name?: string
  receipt_number?: string
  transaction_id?: string
}

const Payments = () => {
  const { gymId } = useAuth()
  const [transactions, setTransactions] = useState<TransactionItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    search: '',
    type: 'all',
    status: 'all',
    date_from: '',
    date_to: ''
  })

  useEffect(() => {
    if (gymId) {
      loadTransactions()
    }
  }, [gymId, filters])

  const loadTransactions = async () => {
    try {
      setLoading(true)
      
      // Load both payments and refunds
      const [payments, refunds] = await Promise.all([
        PaymentService.getPayments({ 
          gym_id: gymId,
          ...filters 
        }),
        RefundService.getRefundRequests({ 
          gym_id: gymId,
          ...filters 
        })
      ])

      // Transform payments
      const paymentTransactions: TransactionItem[] = payments.map(payment => ({
        id: payment.id,
        type: 'payment' as const,
        amount: payment.amount,
        date: payment.payment_date,
        status: payment.status,
        method: payment.payment_method,
        description: payment.description || `${payment.payment_type} payment`,
        member_name: `${payment.members?.profiles?.first_name || ''} ${payment.members?.profiles?.last_name || ''}`.trim(),
        member_phone: payment.members?.profiles?.phone || '',
        membership_name: payment.memberships?.membership_packages?.name,
        receipt_number: payment.receipt_number,
        transaction_id: payment.transaction_id
      }))

      // Transform refunds
      const refundTransactions: TransactionItem[] = refunds.map(refund => ({
        id: refund.id,
        type: 'refund' as const,
        amount: -(refund.final_refund_amount || refund.requested_amount), // Negative amount for refunds
        date: refund.processed_date || refund.request_date,
        status: refund.status,
        method: refund.refund_method || 'refund',
        description: `Refund: ${refund.reason}`,
        member_name: `${refund.members?.profiles?.first_name || ''} ${refund.members?.profiles?.last_name || ''}`.trim(),
        member_phone: refund.members?.profiles?.phone || '',
        membership_name: refund.memberships?.membership_packages?.name,
        transaction_id: refund.transaction_reference
      }))

      // Combine and sort by date
      const allTransactions = [...paymentTransactions, ...refundTransactions]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

      // Apply client-side filters
      let filteredTransactions = allTransactions

      if (filters.search) {
        const searchLower = filters.search.toLowerCase()
        filteredTransactions = filteredTransactions.filter(t => 
          t.member_name.toLowerCase().includes(searchLower) ||
          t.member_phone.includes(searchLower) ||
          t.description.toLowerCase().includes(searchLower) ||
          t.receipt_number?.toLowerCase().includes(searchLower) ||
          t.transaction_id?.toLowerCase().includes(searchLower)
        )
      }

      if (filters.type !== 'all') {
        filteredTransactions = filteredTransactions.filter(t => t.type === filters.type)
      }

      if (filters.status !== 'all') {
        filteredTransactions = filteredTransactions.filter(t => t.status === filters.status)
      }

      setTransactions(filteredTransactions)
    } catch (error) {
      console.error('Error loading transactions:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string, type: string) => {
    const statusConfig = {
      paid: { variant: 'default', label: 'Paid' },
      pending: { variant: 'secondary', label: 'Pending' },
      overdue: { variant: 'destructive', label: 'Overdue' },
      refunded: { variant: 'outline', label: 'Refunded' },
      requested: { variant: 'secondary', label: 'Requested' },
      approved: { variant: 'default', label: 'Approved' },
      processed: { variant: 'default', label: 'Processed' },
      rejected: { variant: 'destructive', label: 'Rejected' }
    }

    const config = statusConfig[status as keyof typeof statusConfig] || { variant: 'outline', label: status }
    
    return (
      <Badge variant={config.variant as any}>
        {config.label}
      </Badge>
    )
  }

  const getMethodIcon = (method: string) => {
    switch (method.toLowerCase()) {
      case 'cash': return '💵'
      case 'card': return '💳'
      case 'upi': return '📱'
      case 'bank_transfer': return '🏦'
      case 'cheque': return '📄'
      case 'refund': return '↩️'
      default: return '💰'
    }
  }

  const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0)
  const paymentCount = transactions.filter(t => t.type === 'payment').length
  const refundCount = transactions.filter(t => t.type === 'refund').length

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Payments & Refunds</h1>
          <p className="text-gray-600">Manage all financial transactions including payments and refunds</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Record Payment
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(totalAmount)}
            </div>
            <p className="text-xs text-muted-foreground">
              {totalAmount >= 0 ? 'Net positive' : 'Net negative'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Payments</CardTitle>
            <Plus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {paymentCount}
            </div>
            <p className="text-xs text-muted-foreground">
              Total payments received
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Refunds</CardTitle>
            <RotateCcw className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {refundCount}
            </div>
            <p className="text-xs text-muted-foreground">
              Total refunds processed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalAmount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(Math.abs(totalAmount))}
            </div>
            <p className="text-xs text-muted-foreground">
              {totalAmount >= 0 ? 'Profit' : 'Loss'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="w-5 h-5 mr-2" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="text-sm font-medium">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search transactions..."
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Type</label>
              <Select value={filters.type} onValueChange={(value) => setFilters(prev => ({ ...prev, type: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="payment">Payments</SelectItem>
                  <SelectItem value="refund">Refunds</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Status</label>
              <Select value={filters.status} onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="processed">Processed</SelectItem>
                  <SelectItem value="requested">Requested</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">From Date</label>
              <Input
                type="date"
                value={filters.date_from}
                onChange={(e) => setFilters(prev => ({ ...prev, date_from: e.target.value }))}
              />
            </div>

            <div>
              <label className="text-sm font-medium">To Date</label>
              <Input
                type="date"
                value={filters.date_to}
                onChange={(e) => setFilters(prev => ({ ...prev, date_to: e.target.value }))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transactions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
          <CardDescription>
            All payments and refunds with their current status
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading transactions...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Member</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Reference</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <span className="text-lg">{getMethodIcon(transaction.method)}</span>
                        <Badge variant={transaction.type === 'payment' ? 'default' : 'secondary'}>
                          {transaction.type === 'payment' ? 'Payment' : 'Refund'}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{transaction.member_name || 'Unknown'}</div>
                        <div className="text-sm text-muted-foreground">{transaction.member_phone}</div>
                        {transaction.membership_name && (
                          <div className="text-xs text-muted-foreground">{transaction.membership_name}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className={`font-medium ${transaction.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {transaction.amount >= 0 ? '+' : ''}{formatCurrency(transaction.amount)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <span>{getMethodIcon(transaction.method)}</span>
                        <span className="capitalize">{transaction.method.replace('_', ' ')}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(transaction.status, transaction.type)}
                    </TableCell>
                    <TableCell>
                      {new Date(transaction.date).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="max-w-xs truncate" title={transaction.description}>
                        {transaction.description}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {transaction.receipt_number && (
                          <div>Receipt: {transaction.receipt_number}</div>
                        )}
                        {transaction.transaction_id && (
                          <div>Txn: {transaction.transaction_id}</div>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default Payments
