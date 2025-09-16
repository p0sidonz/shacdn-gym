import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DollarSign, Calendar, CreditCard, AlertCircle } from 'lucide-react'

interface PaymentOverviewProps {
  membership: any
  onAddPayment: () => void
}

export const PaymentOverview: React.FC<PaymentOverviewProps> = ({ 
  membership, 
  onAddPayment 
}) => {
  if (!membership) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-gray-500">No active membership found</p>
        </CardContent>
      </Card>
    )
  }

  const totalAmount = membership.total_amount_due || 0
  const paidAmount = membership.amount_paid || 0
  const pendingAmount = membership.amount_pending || 0
  const paymentProgress = totalAmount > 0 ? (paidAmount / totalAmount) * 100 : 0

  const getPaymentStatusBadge = () => {
    if (pendingAmount <= 0) {
      return <Badge className="bg-green-100 text-green-800">Fully Paid</Badge>
    } else if (paidAmount > 0) {
      return <Badge className="bg-yellow-100 text-yellow-800">Partially Paid</Badge>
    } else {
      return <Badge className="bg-red-100 text-red-800">Payment Pending</Badge>
    }
  }

  return (
    <div className="space-y-4">
      {/* Payment Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Payment Status
            </div>
            {getPaymentStatusBadge()}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Amount Breakdown */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-sm text-gray-600">Total Package</p>
              <p className="text-lg font-semibold">₹{totalAmount.toFixed(2)}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600">Already Paid</p>
              <p className="text-lg font-semibold text-green-600">₹{paidAmount.toFixed(2)}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600">Remaining</p>
              <p className="text-lg font-semibold text-orange-600">₹{pendingAmount.toFixed(2)}</p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Payment Progress</span>
              <span>{paymentProgress.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-green-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${paymentProgress}%` }}
              />
            </div>
          </div>

          {/* Action Button */}
          {pendingAmount > 0 && (
            <div className="pt-2 border-t">
              <Button 
                onClick={onAddPayment}
                className="w-full bg-green-500 hover:bg-green-600"
              >
                <DollarSign className="w-4 h-4 mr-2" />
                Add Payment (₹{pendingAmount.toFixed(2)} remaining)
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Package Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Package:</span>
            <span className="font-medium">{membership.membership_packages?.name || 'N/A'}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Duration:</span>
            <span>{membership.membership_packages?.duration_days || 0} days</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Start Date:</span>
            <span>{new Date(membership.start_date).toLocaleDateString('hi-IN')}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>End Date:</span>
            <span>{new Date(membership.end_date).toLocaleDateString('hi-IN')}</span>
          </div>
          {membership.is_trial && (
            <div className="flex items-center gap-2 text-sm text-blue-600 mt-2">
              <AlertCircle className="w-4 h-4" />
              <span>This is a trial membership</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
