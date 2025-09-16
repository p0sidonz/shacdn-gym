import { useState, useEffect, useCallback } from 'react'
import { RefundService, type RefundFilters } from '@/services/refundService'

export const useRefunds = (filters: RefundFilters = {}) => {
  const [refunds, setRefunds] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadRefunds = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await RefundService.getRefundRequests(filters)
      setRefunds(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load refund requests')
    } finally {
      setLoading(false)
    }
  }, [
    filters.member_id,
    filters.membership_id,
    filters.status,
    filters.date_from,
    filters.date_to
  ])

  useEffect(() => {
    loadRefunds()
  }, [loadRefunds])

  const refreshRefunds = useCallback(() => {
    loadRefunds()
  }, [loadRefunds])

  const createRefundRequest = useCallback(async (refundData: any) => {
    try {
      const newRefund = await RefundService.createRefundRequest(refundData)
      setRefunds(prev => [newRefund, ...prev])
      return newRefund
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create refund request')
      throw err
    }
  }, [])

  const updateRefundRequest = useCallback(async (id: string, updates: any) => {
    try {
      const updatedRefund = await RefundService.updateRefundRequest(id, updates)
      setRefunds(prev => prev.map(refund => 
        refund.id === id ? { ...refund, ...updatedRefund } : refund
      ))
      return updatedRefund
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update refund request')
      throw err
    }
  }, [])

  const processRefundRequest = useCallback(async (id: string, processData: any) => {
    try {
      const processedRefund = await RefundService.processRefundRequest(id, processData)
      setRefunds(prev => prev.map(refund => 
        refund.id === id ? { ...refund, ...processedRefund } : refund
      ))
      return processedRefund
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process refund request')
      throw err
    }
  }, [])

  return {
    refunds,
    loading,
    error,
    refreshRefunds,
    createRefundRequest,
    updateRefundRequest,
    processRefundRequest
  }
}

export const useRefundStats = (gymId: string) => {
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadStats = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await RefundService.getRefundStats(gymId)
      setStats(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load refund stats')
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
