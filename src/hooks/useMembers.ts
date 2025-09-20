import { useState, useEffect, useCallback } from 'react'
import { MemberService } from '@/services/memberService'
import type { MemberFilters, MemberStats } from '@/services/memberService'
import type { MemberWithDetails } from '@/types'
import { useAuth } from '@/context/AuthContext'

export const useMembers = (filters: MemberFilters = {}) => {
  const [members, setMembers] = useState<MemberWithDetails[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { gymId, user, profile } = useAuth()

  const loadMembers = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await MemberService.getMembers(filters)
      setMembers(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load members')
    } finally {
      setLoading(false)
    }
  }, [filters.gym_id, filters.status, filters.search, gymId, user?.id, profile?.id])

  useEffect(() => {
    loadMembers()
  }, [loadMembers])

  const refreshMembers = useCallback(() => {
    loadMembers()
  }, [loadMembers])

  const addMember = async (memberData: any) => {
    try {
      const newMember = await MemberService.createMember(memberData)
      setMembers(prev => [newMember, ...prev])
      return newMember
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add member')
      throw err
    }
  }

  const updateMember = async (id: string, updates: any) => {
    try {
      const updatedMember = await MemberService.updateMember(id, updates)
      setMembers(prev => prev.map(member => 
        member.id === id ? { ...member, ...updatedMember } : member
      ))
      return updatedMember
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update member')
      throw err
    }
  }

  const deleteMember = async (id: string) => {
    try {
      await MemberService.deleteMember(id)
      setMembers(prev => prev.filter(member => member.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete member')
      throw err
    }
  }

  const assignTrainer = useCallback(async (memberId: string, trainerId: string) => {
    try {
      await MemberService.updateMember(memberId, { assigned_trainer_id: trainerId })
      await refreshMembers()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assign trainer')
      throw err
    }
  }, [refreshMembers, gymId, user?.id, profile?.id, filters.gym_id])

  const assignNutritionist = useCallback(async (memberId: string, nutritionistId: string) => {
    try {
      await MemberService.updateMember(memberId, { assigned_nutritionist_id: nutritionistId })
      await refreshMembers()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assign nutritionist')
      throw err
    }
  }, [refreshMembers, gymId, user?.id, profile?.id, filters.gym_id])

  const updateMemberStatus = useCallback(async (memberId: string, status: string) => {
    try {
      await MemberService.updateMember(memberId, { status })
      await refreshMembers()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update member status')
      throw err
    }
  }, [refreshMembers, gymId, user?.id, profile?.id, filters.gym_id])

  return {
    members,
    loading,
    error,
    refreshMembers,
    addMember,
    updateMember,
    deleteMember,
    assignTrainer,
    assignNutritionist,
    updateMemberStatus
  }
}

export const useMemberStats = (gymId: string) => {
  const [stats, setStats] = useState<MemberStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadStats = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await MemberService.getMemberStats(gymId)
      setStats(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load member stats')
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

export const useMember = (id: string) => {
  const [member, setMember] = useState<MemberWithDetails | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { gymId, user, profile } = useAuth()

  const loadMember = async () => {
    if (!id) return
    
    setLoading(true)
    setError(null)
    try {
      const data = await MemberService.getMemberById(id)
      setMember(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load member')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadMember()
  }, [id])

  const refreshMember = () => {
    loadMember()
  }

  const updateMember = async (updates: any) => {
    if (!member) return
    
    try {
      const updatedMember = await MemberService.updateMember(member.id, updates)
      setMember(updatedMember)
      return updatedMember
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update member')
      throw err
    }
  }

  return {
    member,
    loading,
    error,
    refreshMember,
    updateMember,
  }
}