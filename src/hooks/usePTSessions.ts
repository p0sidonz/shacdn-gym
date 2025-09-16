import { useState, useEffect } from 'react'
import { PTService, type PTSession, type CreatePTSessionData, type UpdatePTSessionData } from '@/services/ptService'

interface UsePTSessionsOptions {
  member_id?: string
}

export const usePTSessions = (options: UsePTSessionsOptions) => {
  const [ptSessions, setPTSessions] = useState<PTSession[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchPTSessions = async () => {
    if (!options.member_id) return

    setLoading(true)
    setError(null)
    try {
      const data = await PTService.getPTSessions(options.member_id)
      setPTSessions(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch PT sessions')
    } finally {
      setLoading(false)
    }
  }

  const createPTSession = async (data: CreatePTSessionData) => {
    try {
      const newSession = await PTService.createPTSession(data)
      setPTSessions(prev => [newSession, ...prev])
      return newSession
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create PT session')
      throw err
    }
  }

  const updatePTSession = async (id: string, data: UpdatePTSessionData) => {
    try {
      const updatedSession = await PTService.updatePTSession(id, data)
      setPTSessions(prev => prev.map(s => s.id === id ? updatedSession : s))
      return updatedSession
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update PT session')
      throw err
    }
  }

  const deletePTSession = async (id: string) => {
    try {
      await PTService.deletePTSession(id)
      setPTSessions(prev => prev.filter(s => s.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete PT session')
      throw err
    }
  }

  const completeSession = async (id: string, data: {
    member_feedback?: string
    trainer_notes?: string
    session_rating?: number
    calories_burned?: number
    homework_assigned?: string
    next_session_plan?: string
  }) => {
    try {
      const updatedSession = await PTService.completeSession(id, data)
      setPTSessions(prev => prev.map(s => s.id === id ? updatedSession : s))
      return updatedSession
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete session')
      throw err
    }
  }

  const cancelSession = async (id: string, data: {
    cancellation_reason: string
    cancelled_by: string
    cancellation_fee?: number
  }) => {
    try {
      const updatedSession = await PTService.cancelSession(id, data)
      setPTSessions(prev => prev.map(s => s.id === id ? updatedSession : s))
      return updatedSession
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel session')
      throw err
    }
  }

  useEffect(() => {
    fetchPTSessions()
  }, [options.member_id])

  return {
    ptSessions,
    loading,
    error,
    refreshPTSessions: fetchPTSessions,
    createPTSession,
    updatePTSession,
    deletePTSession,
    completeSession,
    cancelSession
  }
}
