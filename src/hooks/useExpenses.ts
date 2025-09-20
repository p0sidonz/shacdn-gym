import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface Expense {
  id: string
  gym_id: string
  category: string
  subcategory?: string
  description: string
  amount: number
  expense_date: string
  vendor_name?: string
  receipt_url?: string
  is_recurring: boolean
  recurrence_pattern?: any
  approved_by?: string
  created_by?: string
  created_at: string
  updated_at: string
}

interface UseExpensesProps {
  gym_id?: string
}

export function useExpenses({ gym_id }: UseExpensesProps) {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!gym_id) {
      setExpenses([])
      setLoading(false)
      return
    }

    const fetchExpenses = async () => {
      try {
        setLoading(true)
        setError(null)

        const { data, error } = await supabase
          .from('expenses')
          .select('*')
          .eq('gym_id', gym_id)
          .order('expense_date', { ascending: false })

        if (error) throw error

        setExpenses(data || [])
      } catch (err) {
        console.error('Error fetching expenses:', err)
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchExpenses()
  }, [gym_id])

  return {
    expenses,
    loading,
    error,
    refetch: () => {
      if (gym_id) {
        setLoading(true)
        // Re-fetch logic here if needed
      }
    }
  }
}
