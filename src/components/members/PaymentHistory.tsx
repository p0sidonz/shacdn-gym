import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  CreditCard, 
  DollarSign, 
  Calendar, 
  Receipt,
  RotateCcw,
  AlertCircle,
  CheckCircle2
} from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { MemberWithDetails } from '@/types'
import { usePayments } from '@/hooks/usePayments'
import { useRefunds } from '@/hooks/useRefunds'
import { AddRefundDialog } from './AddRefundDialog'

interface PaymentHistoryProps {
  member: MemberWithDetails
  onPaymentUpdated?: () => void
}

export const PaymentHistory: React.FC<PaymentHistoryProps> = ({ 
  member, 
  onPaymentUpdated 
}) => {
  const { payments, loading: paymentsLoading } = usePayments({ 
    member_id: member.id 
  })
  
  const { refunds, loading: refundsLoading } = useRefunds({ 
    member_id: member.id 
  })

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Paid</Badge>
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Pending</Badge>
      case 'overdue':
        return <Badge variant="destructive">Overdue</Badge>
      case 'refunded':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Refunded</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const getRefundStatusBadge = (status: string) => {
    switch (status) {
      case 'requested':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Requested</Badge>
      case 'approved':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Approved</Badge>
      case 'processed':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Processed</Badge>
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>
      case 'cancelled':
        return <Badge className="bg-gray-100 text-gray-800 border-gray-200">Cancelled</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const getPaymentMethodIcon = (method: string) => {
    switch (method.toLowerCase()) {
      case 'cash':
        return <DollarSign className="w-4 h-4" />
      case 'card':
        return <CreditCard className="w-4 h-4" />
      case 'upi':
        return <Receipt className="w-4 h-4" />
      case 'bank_transfer':
        return <CreditCard className="w-4 h-4" />
      default:
        return <CreditCard className="w-4 h-4" />
    }
  }

  // Combine payments and refunds and sort by date
  const allTransactions = [
    ...payments.map(payment => ({
      ...payment,
      type: 'payment' as const,
      transaction_date: payment.payment_date
    })),
    ...refunds.map(refund => ({
      ...refund,
      type: 'refund' as const,
      transaction_date: refund.request_date
    }))
  ].sort((a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime())

  if (paymentsLoading || refundsLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
          <CardDescription>All payments and refunds for this member</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            Loading payment history...
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Payment History */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Payment History</CardTitle>
              <CardDescription>All payments and refunds for this member</CardDescription>
            </div>
            <AddRefundDialog 
              member={member} 
              onRefundAdded={() => {
                if (onPaymentUpdated) {
                  onPaymentUpdated()
                }
              }} 
            />
          </div>
        </CardHeader>
        <CardContent>
          {allTransactions.length > 0 ? (
            <div className="space-y-4">
              {allTransactions.map((transaction, index) => (
                <div key={`${transaction.type}-${transaction.id}`} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-full ${
                        transaction.type === 'payment' 
                          ? 'bg-green-100 text-green-600' 
                          : 'bg-red-100 text-red-600'
                      }`}>
                        {transaction.type === 'payment' ? (
                          <CreditCard className="w-5 h-5" />
                        ) : (
                          <RotateCcw className="w-5 h-5" />
                        )}
                      </div>
                      <div>
                        <div className="font-medium">
                          {transaction.type === 'payment' 
                            ? (transaction as any).description || 'Membership Payment'
                            : `Refund Request - ${(transaction as any).refund_type?.replace('_', ' ').toUpperCase()}`
                          }
                        </div>
                        <div className="text-sm text-gray-500 flex items-center space-x-2">
                          <Calendar className="w-4 h-4" />
                          <span>{formatDate(new Date(transaction.transaction_date))}</span>
                          {transaction.type === 'payment' && (
                            <>
                              <span>•</span>
                              <span>{(transaction as any).payment_type}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`font-medium ${
                        transaction.type === 'payment' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {transaction.type === 'payment' 
                          ? `+${formatCurrency((transaction as any).amount)}`
                          : `-${formatCurrency((transaction as any).requested_amount)}`
                        }
                      </div>
                      <div className="text-sm text-gray-500">
                        {transaction.type === 'payment' ? (
                          <div className="flex items-center space-x-2">
                            {getPaymentMethodIcon((transaction as any).payment_method)}
                            <span>{(transaction as any).payment_method}</span>
                          </div>
                        ) : (
                          <span>Refund</span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {transaction.type === 'payment' ? (
                        getPaymentStatusBadge((transaction as any).status)
                      ) : (
                        getRefundStatusBadge((transaction as any).status)
                      )}
                    </div>
                    
                    {transaction.type === 'refund' && (transaction as any).status === 'processed' && (
                      <div className="text-sm text-gray-500">
                        Final Amount: {formatCurrency((transaction as any).final_refund_amount || 0)}
                      </div>
                    )}
                  </div>

                  {/* Refund Details */}
                  {transaction.type === 'refund' && (transaction as any).reason && (
                    <div className="mt-2 p-2 bg-gray-50 rounded text-sm">
                      <strong>Reason:</strong> {(transaction as any).reason}
                    </div>
                  )}

                  {/* Payment Details */}
                  {transaction.type === 'payment' && (transaction as any).notes && (
                    <div className="mt-2 p-2 bg-gray-50 rounded text-sm">
                      <strong>Notes:</strong> {(transaction as any).notes}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <CreditCard className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No Payment History Found</h3>
              <p>No payment or refund records available for this member</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(payments.reduce((sum, p) => sum + p.amount, 0))}
                </div>
                <div className="text-sm text-gray-500">Total Paid</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <RotateCcw className="w-5 h-5 text-red-600" />
              <div>
                <div className="text-2xl font-bold text-red-600">
                  {formatCurrency(refunds.reduce((sum, r) => sum + (r.final_refund_amount || r.requested_amount), 0))}
                </div>
                <div className="text-sm text-gray-500">Total Refunded</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-orange-600" />
              <div>
                <div className="text-2xl font-bold text-orange-600">
                  {refunds.filter(r => r.status === 'requested' || r.status === 'approved').length}
                </div>
                <div className="text-sm text-gray-500">Pending Refunds</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
