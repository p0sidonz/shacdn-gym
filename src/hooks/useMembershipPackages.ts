import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { MembershipPackage } from '@/types'

export const useMembershipPackages = (gymId?: string) => {
  const [packages, setPackages] = useState<MembershipPackage[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchPackages = async (filters?: {
    isActive?: boolean
    packageType?: string
    isTrial?: boolean
    isFeatured?: boolean
  }) => {
    if (!gymId) return

    try {
      setLoading(true)
      setError(null)

      let query = supabase
        .from('membership_packages')
        .select('*')
        .eq('gym_id', gymId)
        .order('display_order', { ascending: true })

      if (filters?.isActive !== undefined) {
        query = query.eq('is_active', filters.isActive)
      }

      if (filters?.packageType) {
        query = query.eq('package_type', filters.packageType)
      }

      if (filters?.isTrial !== undefined) {
        query = query.eq('is_trial', filters.isTrial)
      }

      if (filters?.isFeatured !== undefined) {
        query = query.eq('is_featured', filters.isFeatured)
      }

      const { data, error } = await query

      if (error) throw error

      setPackages(data || [])
    } catch (err) {
      console.error('Error fetching packages:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch packages')
    } finally {
      setLoading(false)
    }
  }

  const createPackage = async (packageData: Omit<MembershipPackage, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      setLoading(true)
      setError(null)

      const { data, error } = await supabase
        .from('membership_packages')
        .insert([packageData])
        .select()

      if (error) throw error

      if (data?.[0]) {
        setPackages(prev => [...prev, data[0]])
      }

      return data?.[0]
    } catch (err) {
      console.error('Error creating package:', err)
      setError(err instanceof Error ? err.message : 'Failed to create package')
      throw err
    } finally {
      setLoading(false)
    }
  }

  const updatePackage = async (id: string, updates: Partial<MembershipPackage>) => {
    try {
      setLoading(true)
      setError(null)

      const { data, error } = await supabase
        .from('membership_packages')
        .update(updates)
        .eq('id', id)
        .select()

      if (error) throw error

      if (data?.[0]) {
        setPackages(prev => 
          prev.map(pkg => pkg.id === id ? { ...pkg, ...data[0] } : pkg)
        )
      }

      return data?.[0]
    } catch (err) {
      console.error('Error updating package:', err)
      setError(err instanceof Error ? err.message : 'Failed to update package')
      throw err
    } finally {
      setLoading(false)
    }
  }

  const deletePackage = async (id: string) => {
    try {
      setLoading(true)
      setError(null)

      const { error } = await supabase
        .from('membership_packages')
        .delete()
        .eq('id', id)

      if (error) throw error

      setPackages(prev => prev.filter(pkg => pkg.id !== id))
    } catch (err) {
      console.error('Error deleting package:', err)
      setError(err instanceof Error ? err.message : 'Failed to delete package')
      throw err
    } finally {
      setLoading(false)
    }
  }

  const duplicatePackage = async (originalPackage: MembershipPackage) => {
    try {
      const duplicatedPackage = {
        ...originalPackage,
        id: undefined,
        name: `${originalPackage.name} (Copy)`,
        display_order: packages.length + 1,
        created_at: undefined,
        updated_at: undefined
      }

      return await createPackage(duplicatedPackage)
    } catch (err) {
      console.error('Error duplicating package:', err)
      throw err
    }
  }

  const togglePackageStatus = async (id: string, isActive: boolean) => {
    return await updatePackage(id, { is_active: !isActive })
  }

  const getPackageStats = () => {
    const total = packages.length
    const active = packages.filter(p => p.is_active).length
    const trial = packages.filter(p => p.is_trial).length
    const featured = packages.filter(p => p.is_featured).length
    const averagePrice = total > 0 
      ? packages.reduce((sum, p) => sum + p.price, 0) / total 
      : 0

    return {
      total,
      active,
      inactive: total - active,
      trial,
      featured,
      averagePrice
    }
  }

  const getPackagesByType = () => {
    const types = packages.reduce((acc, pkg) => {
      const type = pkg.package_type
      if (!acc[type]) {
        acc[type] = []
      }
      acc[type].push(pkg)
      return acc
    }, {} as Record<string, MembershipPackage[]>)

    return types
  }

  const searchPackages = (searchTerm: string) => {
    if (!searchTerm) return packages

    return packages.filter(pkg =>
      pkg.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pkg.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pkg.package_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pkg.package_category?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }

  useEffect(() => {
    if (gymId) {
      fetchPackages()
    }
  }, [gymId])

  return {
    packages,
    loading,
    error,
    fetchPackages,
    createPackage,
    updatePackage,
    deletePackage,
    duplicatePackage,
    togglePackageStatus,
    getPackageStats,
    getPackagesByType,
    searchPackages
  }
}
