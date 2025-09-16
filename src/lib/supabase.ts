import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://dfdocvffizyfqamkngam.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key'

// For development without actual Supabase setup
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database types for better TypeScript support
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          user_id: string
          first_name: string
          last_name: string
          phone: string
          address: string | null
          date_of_birth: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          profile_image_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          first_name: string
          last_name: string
          phone: string
          address?: string | null
          date_of_birth?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          profile_image_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          first_name?: string
          last_name?: string
          phone?: string
          address?: string | null
          date_of_birth?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          profile_image_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      gyms: {
        Row: {
          id: string
          owner_id: string
          name: string
          address: string
          phone: string
          email: string
          license_number: string | null
          established_date: string | null
          website: string | null
          logo_url: string | null
          operating_hours: Record<string, any>
          facilities: string[]
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          owner_id: string
          name: string
          address: string
          phone: string
          email: string
          license_number?: string | null
          established_date?: string | null
          website?: string | null
          logo_url?: string | null
          operating_hours: Record<string, any>
          facilities?: string[]
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          owner_id?: string
          name?: string
          address?: string
          phone?: string
          email?: string
          license_number?: string | null
          established_date?: string | null
          website?: string | null
          logo_url?: string | null
          operating_hours?: Record<string, any>
          facilities?: string[]
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      user_role: 'gym_owner' | 'manager' | 'trainer' | 'housekeeping' | 'member'
      membership_status: 'active' | 'expired' | 'suspended' | 'trial'
      payment_status: 'paid' | 'partial' | 'pending' | 'overdue'
      attendance_status: 'present' | 'absent' | 'late' | 'holiday'
    }
  }
}
