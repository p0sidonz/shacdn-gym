import { useState, useEffect, useCallback } from 'react'
import { MembershipService, type MembershipFilters } from '@/services/membershipService'
import { type Membership, type MembershipChange, type CreateMembershipData } from '@/types'

export const useMemberships = (filters: MembershipFilters = {}) => {
  const [memberships, setMemberships] = useState<Membership[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // UPDATED: Deps mein specific primitives daalo (object nahi)
  const loadMemberships = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await MembershipService.getMemberships(filters)
      setMemberships(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load memberships')
    } finally {
      setLoading(false)
    }
  }, [
    filters.gym_id,      // Add all relevant fields from MembershipFilters
    filters.status,      // e.g., if filters has member_id, package_id, etc., include them
    filters.search,
    filters.member_id,   // Example – adjust based on your MembershipFilters type
    filters.package_id
    // Agar koi field missing hai ya extra nahi chahiye, remove kar do
  ])

  useEffect(() => {
    loadMemberships()
  }, [loadMemberships])

  // Baaki code unchanged (refreshMemberships, createMembership, etc.)
  const refreshMemberships = useCallback(() => {
    loadMemberships()
  }, [loadMemberships])

  const createMembership = useCallback(async (membershipData: CreateMembershipData) => {
    try {
      const newMembership = await MembershipService.createMembership(membershipData)
      setMemberships(prev => [newMembership, ...prev])
      return newMembership
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create membership')
      throw err
    }
  }, [])  // Yeh already stable hai

  // ... (updateMembership, cancelMembership, etc. unchanged – unke useCallback deps bhi check kar lena, agar koi object dep hai to same fix)

  return {
    memberships,
    loading,
    error,
    refreshMemberships,
    createMembership,
    
    // ... rest
  }
}

export const useMembership = (id: string) => {
  const [membership, setMembership] = useState<Membership | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadMembership = useCallback(async () => {
    if (!id) return
    
    setLoading(true)
    setError(null)
    try {
      const data = await MembershipService.getMembershipById(id)
      setMembership(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load membership')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    loadMembership()
  }, [loadMembership])

  const refreshMembership = useCallback(() => {
    loadMembership()
  }, [loadMembership])

  const updateMembership = useCallback(async (updates: Partial<Membership>) => {
    if (!membership) return
    
    try {
      const updatedMembership = await MembershipService.updateMembership(membership.id, updates)
      setMembership(updatedMembership)
      return updatedMembership
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update membership')
      throw err
    }
  }, [membership])

  return {
    membership,
    loading,
    error,
    refreshMembership,
    updateMembership
  }
}

export const useMembershipChanges = (memberId: string) => {
  const [changes, setChanges] = useState<MembershipChange[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadChanges = useCallback(async () => {
    if (!memberId) return
    
    setLoading(true)
    setError(null)
    try {
      const data = await MembershipService.getMembershipChanges(memberId)
      setChanges(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load membership changes')
    } finally {
      setLoading(false)
    }
  }, [memberId])

  useEffect(() => {
    loadChanges()
  }, [loadChanges])

  const refreshChanges = useCallback(() => {
    loadChanges()
  }, [loadChanges])

  return {
    changes,
    loading,
    error,
    refreshChanges
  }
}

export const useExpiringMemberships = (days: number = 30) => {
  const [memberships, setMemberships] = useState<Membership[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadExpiringMemberships = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await MembershipService.getExpiringMemberships(days)
      setMemberships(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load expiring memberships')
    } finally {
      setLoading(false)
    }
  }, [days])

  useEffect(() => {
    loadExpiringMemberships()
  }, [loadExpiringMemberships])

  const refreshExpiringMemberships = useCallback(() => {
    loadExpiringMemberships()
  }, [loadExpiringMemberships])

  return {
    memberships,
    loading,
    error,
    refreshExpiringMemberships
  }
}

export const useTrialMemberships = () => {
  const [memberships, setMemberships] = useState<Membership[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadTrialMemberships = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await MembershipService.getTrialMemberships()
      setMemberships(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load trial memberships')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadTrialMemberships()
  }, [loadTrialMemberships])

  const refreshTrialMemberships = useCallback(() => {
    loadTrialMemberships()
  }, [loadTrialMemberships])

  return {
    memberships,
    loading,
    error,
    refreshTrialMemberships
  }
}