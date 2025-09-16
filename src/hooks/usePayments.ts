import { useState, useEffect, useCallback } from 'react'
import { PaymentService, type PaymentFilters } from '@/services/paymentService'

export const usePayments = (filters: PaymentFilters = {}) => {
  const [payments, setPayments] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadPayments = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      console.log('Loading payments with filters:', filters)
      const data = await PaymentService.getPayments(filters)
      console.log('Loaded payments:', data)
      setPayments(data)
    } catch (err) {
      console.error('Error loading payments:', err)
      setError(err instanceof Error ? err.message : 'Failed to load payments')
    } finally {
      setLoading(false)
    }
  }, [
    filters.member_id,
    filters.membership_id,
    filters.status,
    filters.payment_type,
    filters.payment_method,
    filters.date_from,
    filters.date_to
  ])

  useEffect(() => {
    loadPayments()
  }, [loadPayments])

  const refreshPayments = useCallback(() => {
    console.log('Refreshing payments...')
    loadPayments()
  }, [loadPayments])

  const createPayment = useCallback(async (paymentData: any) => {
    try {
      console.log('usePayments: Creating payment with data:', paymentData)
      const newPayment = await PaymentService.createPayment(paymentData)
      console.log('usePayments: Payment created, adding to local state:', newPayment)
      setPayments(prev => {
        const updated = [newPayment, ...prev]
        console.log('usePayments: Updated payments array:', updated)
        return updated
      })
      return newPayment
    } catch (err) {
      console.error('usePayments: Error creating payment:', err)
      setError(err instanceof Error ? err.message : 'Failed to create payment')
      throw err
    }
  }, [])

  const updatePayment = useCallback(async (id: string, updates: any) => {
    try {
      const updatedPayment = await PaymentService.updatePayment(id, updates)
      setPayments(prev => prev.map(payment => 
        payment.id === id ? { ...payment, ...updatedPayment } : payment
      ))
      return updatedPayment
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update payment')
      throw err
    }
  }, [])

  return {
    payments,
    loading,
    error,
    refreshPayments,
    createPayment,
    updatePayment
  }
}

export const usePaymentStats = (gymId: string) => {
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadStats = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await PaymentService.getPaymentStats(gymId)
      setStats(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load payment stats')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (gymId) {
      loadStats()
    }
  }, [gymId])

  const refreshStats = () => {
    loadStats()
  }

  return {
    stats,
    loading,
    error,
    refreshStats
  }
}