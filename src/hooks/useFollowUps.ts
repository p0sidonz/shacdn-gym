import { useState, useEffect } from 'react'
import { FollowUpService, type FollowUp, type CreateFollowUpData, type UpdateFollowUpData } from '@/services/followupService'

interface UseFollowUpsOptions {
  member_id?: string
}

export const useFollowUps = (options: UseFollowUpsOptions) => {
  const [followUps, setFollowUps] = useState<FollowUp[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchFollowUps = async () => {
    if (!options.member_id) return

    setLoading(true)
    setError(null)
    try {
      const data = await FollowUpService.getFollowUps(options.member_id)
      setFollowUps(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch follow-ups')
    } finally {
      setLoading(false)
    }
  }

  const createFollowUp = async (data: CreateFollowUpData) => {
    try {
      const newFollowUp = await FollowUpService.createFollowUp(data)
      setFollowUps(prev => [newFollowUp, ...prev])
      return newFollowUp
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create follow-up')
      throw err
    }
  }

  const updateFollowUp = async (id: string, data: UpdateFollowUpData) => {
    try {
      const updatedFollowUp = await FollowUpService.updateFollowUp(id, data)
      setFollowUps(prev => prev.map(f => f.id === id ? updatedFollowUp : f))
      return updatedFollowUp
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update follow-up')
      throw err
    }
  }

  const deleteFollowUp = async (id: string) => {
    try {
      await FollowUpService.deleteFollowUp(id)
      setFollowUps(prev => prev.filter(f => f.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete follow-up')
      throw err
    }
  }

  useEffect(() => {
    fetchFollowUps()
  }, [options.member_id])

  return {
    followUps,
    loading,
    error,
    refreshFollowUps: fetchFollowUps,
    createFollowUp,
    updateFollowUp,
    deleteFollowUp
  }
}
