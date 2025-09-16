import { supabase } from '@/lib/supabase'
import type { MembershipPackage } from '@/types'

export interface PackageFilters {
  isActive?: boolean
  packageType?: string
  isTrial?: boolean
  isFeatured?: boolean
  category?: string
  minPrice?: number
  maxPrice?: number
  searchTerm?: string
}

export interface PackageAnalytics {
  totalPackages: number
  activePackages: number
  trialPackages: number
  featuredPackages: number
  averagePrice: number
  priceRange: {
    min: number
    max: number
  }
  packagesByType: Record<string, number>
  packagesByCategory: Record<string, number>
  popularPackages: Array<{
    package: MembershipPackage
    memberCount: number
    revenue: number
  }>
}

export class MembershipPackageService {
  static async getPackages(gymId: string, filters?: PackageFilters): Promise<MembershipPackage[]> {
    try {
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

      if (filters?.category) {
        query = query.eq('package_category', filters.category)
      }

      if (filters?.minPrice !== undefined) {
        query = query.gte('price', filters.minPrice)
      }

      if (filters?.maxPrice !== undefined) {
        query = query.lte('price', filters.maxPrice)
      }

      if (filters?.searchTerm) {
        query = query.or(`name.ilike.%${filters.searchTerm}%,description.ilike.%${filters.searchTerm}%,package_type.ilike.%${filters.searchTerm}%`)
      }

      const { data, error } = await query

      if (error) throw error

      return data || []
    } catch (error) {
      console.error('Error fetching packages:', error)
      throw error
    }
  }

  static async getPackageById(id: string): Promise<MembershipPackage | null> {
    try {
      const { data, error } = await supabase
        .from('membership_packages')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error

      return data
    } catch (error) {
      console.error('Error fetching package:', error)
      throw error
    }
  }

  static async createPackage(packageData: Omit<MembershipPackage, 'id' | 'created_at' | 'updated_at'>): Promise<MembershipPackage> {
    try {
      const { data, error } = await supabase
        .from('membership_packages')
        .insert([packageData])
        .select()
        .single()

      if (error) throw error

      return data
    } catch (error) {
      console.error('Error creating package:', error)
      throw error
    }
  }

  static async updatePackage(id: string, updates: Partial<MembershipPackage>): Promise<MembershipPackage> {
    try {
      const { data, error } = await supabase
        .from('membership_packages')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      return data
    } catch (error) {
      console.error('Error updating package:', error)
      throw error
    }
  }

  static async deletePackage(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('membership_packages')
        .delete()
        .eq('id', id)

      if (error) throw error
    } catch (error) {
      console.error('Error deleting package:', error)
      throw error
    }
  }

  static async duplicatePackage(originalPackage: MembershipPackage): Promise<MembershipPackage> {
    try {
      const duplicatedPackage = {
        ...originalPackage,
        id: undefined,
        name: `${originalPackage.name} (Copy)`,
        display_order: 0, // Will be set by the database
        created_at: undefined,
        updated_at: undefined
      }

      return await this.createPackage(duplicatedPackage)
    } catch (error) {
      console.error('Error duplicating package:', error)
      throw error
    }
  }

  static async togglePackageStatus(id: string, isActive: boolean): Promise<MembershipPackage> {
    return await this.updatePackage(id, { is_active: !isActive })
  }

  static async reorderPackages(packageIds: string[]): Promise<void> {
    try {
      const updates = packageIds.map((id, index) => ({
        id,
        display_order: index + 1
      }))

      for (const update of updates) {
        await supabase
          .from('membership_packages')
          .update({ display_order: update.display_order })
          .eq('id', update.id)
      }
    } catch (error) {
      console.error('Error reordering packages:', error)
      throw error
    }
  }

  static async getPackageAnalytics(gymId: string): Promise<PackageAnalytics> {
    try {
      const packages = await this.getPackages(gymId)

      const totalPackages = packages.length
      const activePackages = packages.filter(p => p.is_active).length
      const trialPackages = packages.filter(p => p.is_trial).length
      const featuredPackages = packages.filter(p => p.is_featured).length

      const prices = packages.map(p => p.price)
      const averagePrice = prices.length > 0 ? prices.reduce((sum, price) => sum + price, 0) / prices.length : 0
      const priceRange = {
        min: prices.length > 0 ? Math.min(...prices) : 0,
        max: prices.length > 0 ? Math.max(...prices) : 0
      }

      const packagesByType = packages.reduce((acc, pkg) => {
        acc[pkg.package_type] = (acc[pkg.package_type] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      const packagesByCategory = packages.reduce((acc, pkg) => {
        const category = pkg.package_category || 'Uncategorized'
        acc[category] = (acc[category] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      // Get member counts and revenue for each package
      const popularPackages = await Promise.all(
        packages.map(async (pkg) => {
          const { data: memberships } = await supabase
            .from('memberships')
            .select('id, total_amount_due, amount_paid')
            .eq('package_id', pkg.id)

          const memberCount = memberships?.length || 0
          const revenue = memberships?.reduce((sum, m) => sum + (m.amount_paid || 0), 0) || 0

          return {
            package: pkg,
            memberCount,
            revenue
          }
        })
      )

      return {
        totalPackages,
        activePackages,
        trialPackages,
        featuredPackages,
        averagePrice,
        priceRange,
        packagesByType,
        packagesByCategory,
        popularPackages: popularPackages.sort((a, b) => b.memberCount - a.memberCount)
      }
    } catch (error) {
      console.error('Error getting package analytics:', error)
      throw error
    }
  }

  static async getPackageTemplates(): Promise<Partial<MembershipPackage>[]> {
    return [
      {
        name: 'Basic Monthly',
        description: 'Essential gym access with basic amenities',
        package_type: 'general',
        duration_days: 30,
        price: 2500,
        setup_fee: 500,
        security_deposit: 1000,
        features: ['Gym Access', 'Locker', 'Towel Service'],
        restrictions: ['Peak hours only'],
        is_trial: false,
        is_featured: false,
        trainer_required: false,
        pt_sessions_included: 0,
        max_sessions_per_day: 1,
        guest_passes: 0,
        freeze_allowance: 7,
        cancellation_period: 30,
        minimum_commitment_days: 0,
        refund_percentage: 80,
        transfer_fee: 200,
        upgrade_allowed: true,
        downgrade_allowed: false,
        package_category: 'Fitness'
      },
      {
        name: 'Premium Monthly',
        description: 'Full gym access with premium amenities and personal training',
        package_type: 'personal_training',
        duration_days: 30,
        price: 5000,
        setup_fee: 1000,
        security_deposit: 2000,
        features: ['Gym Access', 'Personal Training', 'Nutrition Consultation', 'Locker', 'Towel Service', 'Sauna Access'],
        restrictions: [],
        is_trial: false,
        is_featured: true,
        trainer_required: true,
        pt_sessions_included: 8,
        max_sessions_per_day: 2,
        guest_passes: 2,
        freeze_allowance: 14,
        cancellation_period: 30,
        minimum_commitment_days: 0,
        refund_percentage: 90,
        transfer_fee: 500,
        upgrade_allowed: true,
        downgrade_allowed: true,
        package_category: 'Premium'
      },
      {
        name: '7-Day Trial',
        description: 'Try our gym for a week with full access',
        package_type: 'trial',
        duration_days: 7,
        price: 1000,
        setup_fee: 0,
        security_deposit: 0,
        features: ['Gym Access', 'Locker', 'Towel Service'],
        restrictions: ['One-time use only'],
        is_trial: true,
        is_featured: false,
        trainer_required: false,
        pt_sessions_included: 1,
        max_sessions_per_day: 1,
        guest_passes: 0,
        freeze_allowance: 0,
        cancellation_period: 0,
        minimum_commitment_days: 0,
        refund_percentage: 100,
        transfer_fee: 0,
        upgrade_allowed: true,
        downgrade_allowed: false,
        package_category: 'Trial'
      },
      {
        name: 'Annual Premium',
        description: 'Best value with 12 months of premium access',
        package_type: 'general',
        duration_days: 365,
        price: 50000,
        setup_fee: 0,
        security_deposit: 2000,
        features: ['Gym Access', 'Personal Training', 'Group Classes', 'Locker', 'Towel Service', 'Sauna Access', 'Guest Passes'],
        restrictions: [],
        is_trial: false,
        is_featured: true,
        trainer_required: false,
        pt_sessions_included: 12,
        max_sessions_per_day: 2,
        guest_passes: 12,
        freeze_allowance: 30,
        cancellation_period: 60,
        minimum_commitment_days: 90,
        refund_percentage: 85,
        transfer_fee: 1000,
        upgrade_allowed: true,
        downgrade_allowed: false,
        package_category: 'Premium'
      }
    ]
  }
}
