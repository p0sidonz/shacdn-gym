import { supabase } from '@/lib/supabase'

export interface ExpenseFilters {
  gym_id?: string
  category?: string
  date_from?: string
  date_to?: string
  search?: string
}

export interface CreateExpenseData {
  gym_id: string
  category: string
  subcategory?: string
  description: string
  amount: number
  expense_date: string
  vendor_name?: string
  receipt_url?: string
  is_recurring?: boolean
  recurrence_pattern?: any
}

export class ExpenseService {
  // Get expenses with filters
  static async getExpenses(filters: ExpenseFilters = {}) {
    try {
      let query = supabase
        .from('expenses')
        .select(`
          id,
          category,
          subcategory,
          description,
          amount,
          expense_date,
          vendor_name,
          receipt_url,
          is_recurring,
          recurrence_pattern,
          approved_by,
          created_by,
          created_at,
          updated_at
        `)

      // Apply gym filter
      if (filters.gym_id) {
        query = query.eq('gym_id', filters.gym_id)
      }

      // Apply category filter
      if (filters.category) {
        query = query.eq('category', filters.category)
      }

      // Apply date filters
      if (filters.date_from) {
        query = query.gte('expense_date', filters.date_from)
      }
      if (filters.date_to) {
        query = query.lte('expense_date', filters.date_to)
      }

      // Apply search filter
      if (filters.search) {
        query = query.or(`description.ilike.%${filters.search}%,vendor_name.ilike.%${filters.search}%`)
      }

      // Order by date (latest first)
      query = query.order('expense_date', { ascending: false })

      const { data, error } = await query

      if (error) throw error

      return data || []
    } catch (error) {
      console.error('Error fetching expenses:', error)
      throw error
    }
  }

  // Create new expense
  static async createExpense(expenseData: CreateExpenseData) {
    try {
      const { data, error } = await supabase
        .from('expenses')
        .insert([{
          ...expenseData,
          created_by: (await supabase.auth.getUser()).data.user?.id
        }])
        .select()
        .single()

      if (error) throw error

      return data
    } catch (error) {
      console.error('Error creating expense:', error)
      throw error
    }
  }

  // Update expense
  static async updateExpense(id: string, updates: Partial<CreateExpenseData>) {
    try {
      const { data, error } = await supabase
        .from('expenses')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      return data
    } catch (error) {
      console.error('Error updating expense:', error)
      throw error
    }
  }

  // Delete expense
  static async deleteExpense(id: string) {
    try {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', id)

      if (error) throw error

      return true
    } catch (error) {
      console.error('Error deleting expense:', error)
      throw error
    }
  }

  // Get expense summary by category
  static async getExpenseSummary(gymId: string, dateFrom?: string, dateTo?: string) {
    try {
      let query = supabase
        .from('expenses')
        .select('category, amount')
        .eq('gym_id', gymId)

      if (dateFrom) {
        query = query.gte('expense_date', dateFrom)
      }
      if (dateTo) {
        query = query.lte('expense_date', dateTo)
      }

      const { data, error } = await query

      if (error) throw error

      // Group by category and sum amounts
      const summary = (data || []).reduce((acc, expense) => {
        const category = expense.category
        if (!acc[category]) {
          acc[category] = 0
        }
        acc[category] += parseFloat(expense.amount)
        return acc
      }, {} as Record<string, number>)

      return summary
    } catch (error) {
      console.error('Error getting expense summary:', error)
      throw error
    }
  }

  // Get total expenses for a period
  static async getTotalExpenses(gymId: string, dateFrom?: string, dateTo?: string) {
    try {
      let query = supabase
        .from('expenses')
        .select('amount')
        .eq('gym_id', gymId)

      if (dateFrom) {
        query = query.gte('expense_date', dateFrom)
      }
      if (dateTo) {
        query = query.lte('expense_date', dateTo)
      }

      const { data, error } = await query

      if (error) throw error

      const total = (data || []).reduce((sum, expense) => {
        return sum + parseFloat(expense.amount)
      }, 0)

      return total
    } catch (error) {
      console.error('Error getting total expenses:', error)
      throw error
    }
  }
}

