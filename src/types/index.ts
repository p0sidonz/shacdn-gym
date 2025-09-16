export type UserRole = 'gym_owner' | 'manager' | 'trainer' | 'nutritionist' | 'housekeeping' | 'receptionist' | 'member'

export type MembershipStatus = 'active' | 'expired' | 'suspended' | 'trial' | 'frozen' | 'cancelled' | 'pending_payment' | 'transferred' | 'upgraded' | 'downgraded'
export type MembershipChangeType = 'upgrade' | 'downgrade' | 'transfer' | 'extension' | 'freeze' | 'cancellation'
export type RefundStatus = 'requested' | 'approved' | 'rejected' | 'processed' | 'cancelled'
export type RefundType = 'full_refund' | 'partial_refund' | 'credit_adjustment' | 'package_transfer'
export type InstallmentStatus = 'pending' | 'paid' | 'overdue' | 'cancelled' | 'adjusted'

export type PaymentStatus = 'paid' | 'partial' | 'pending' | 'overdue' | 'refunded' | 'cancelled' | 'adjusted' | 'credited'

export type PaymentMethod = 'cash' | 'card' | 'bank_transfer' | 'upi' | 'cheque' | 'emi' | 'wallet' | 'adjustment' | 'refund'

export type PaymentType = 'membership_fee' | 'personal_training' | 'addon_service' | 'penalty' | 'refund' | 'adjustment' | 'upgrade_fee' | 'transfer_fee'

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'holiday' | 'sick_leave' | 'half_day'

export type InquiryStatus = 'new' | 'contacted' | 'interested' | 'trial_scheduled' | 'trial_completed' | 'converted' | 'follow_up' | 'not_interested' | 'lost'

export type FollowupType = 'call' | 'email' | 'sms' | 'whatsapp' | 'visit' | 'trial_scheduled' | 'trial_completed' | 'conversion_attempt' | 'follow_up_reminder'

export type FollowupMethod = 'phone_call' | 'email' | 'sms' | 'whatsapp' | 'in_person' | 'video_call' | 'text_message'

export type FollowupStatus = 'scheduled' | 'completed' | 'cancelled' | 'rescheduled' | 'no_answer' | 'busy' | 'voicemail' | 'successful'

export type StaffStatus = 'active' | 'inactive' | 'terminated' | 'on_leave' | 'probation' | 'holiday'

export interface UserProfile {
  id: string
  user_id: string
  first_name: string
  last_name: string
  phone: string
  email?: string
  address?: string
  date_of_birth?: string
  emergency_contact_name?: string
  emergency_contact_phone?: string
  profile_image_url?: string
  created_at: string
  updated_at: string
}

export interface User {
  id: string
  email: string
  role: UserRole
  profile: UserProfile
  created_at: string
  updated_at: string
}

export interface Gym {
  id: string
  owner_id: string
  name: string
  address: string
  phone: string
  email: string
  license_number?: string
  established_date?: string
  website?: string
  logo_url?: string
  operating_hours: OperatingHours
  facilities: string[]
  created_at: string
  updated_at: string
}

export interface OperatingHours {
  monday: { open: string; close: string; closed?: boolean }
  tuesday: { open: string; close: string; closed?: boolean }
  wednesday: { open: string; close: string; closed?: boolean }
  thursday: { open: string; close: string; closed?: boolean }
  friday: { open: string; close: string; closed?: boolean }
  saturday: { open: string; close: string; closed?: boolean }
  sunday: { open: string; close: string; closed?: boolean }
  [key: string]: { open: string; close: string; closed?: boolean }
}

export interface Member {
  id: string
  gym_id: string
  user_id: string
  member_id: string
  profile?: UserProfile
  assigned_trainer_id?: string
  assigned_nutritionist_id?: string
  joining_date: string
  status: MembershipStatus
  source?: string
  referrer_member_id?: string
  credit_balance: number
  security_deposit: number
  fitness_goals: string[]
  workout_preferences: string[]
  preferred_workout_time?: string
  training_level?: string
  medical_clearance: boolean
  waiver_signed: boolean
  waiver_signed_date?: string
  parent_guardian_name?: string
  parent_guardian_phone?: string
  notes?: string
  tags: string[]
  created_at: string
  updated_at: string
}

export interface Membership {
  id: string
  member_id: string
  package_id: string
  payment_plan_id?: string
  discount_code_id?: string
  original_membership_id?: string
  start_date: string
  end_date: string
  actual_end_date?: string
  status: MembershipStatus
  
  // Financial Details
  original_amount: number
  discount_applied: number
  setup_fee_paid: number
  security_deposit_paid: number
  total_amount_due: number
  amount_paid: number
  amount_pending: number
  credit_used: number
  
  // Trial and Conversion
  is_trial: boolean
  trial_converted_date?: string
  trial_conversion_discount: number
  
  // Membership Management
  auto_renew: boolean
  freeze_days_used: number
  freeze_start_date?: string
  freeze_end_date?: string
  freeze_reason?: string
  
  // Cancellation and Refunds
  cancellation_date?: string
  cancellation_reason?: string
  cancellation_notice_period?: number
  refund_eligible_amount: number
  refund_processed_amount: number
  
  // Transfers and Changes
  transferred_from_member_id?: string
  transferred_to_member_id?: string
  transfer_fee_paid: number
  
  // Add-on Services
  addon_services: any[]
  pt_sessions_remaining: number
  pt_sessions_used: number
  
  created_at: string
  updated_at: string
}

export interface MembershipPackage {
  id: string
  gym_id: string
  name: string
  description?: string
  package_type: string
  duration_days: number
  price: number
  setup_fee?: number
  security_deposit?: number
  features: string[]
  restrictions?: string[]
  is_trial: boolean
  is_active: boolean
  is_featured: boolean
  trainer_required: boolean
  pt_sessions_included: number
  max_sessions_per_day: number
  max_sessions_per_week?: number
  max_sessions_per_month?: number
  guest_passes: number
  freeze_allowance: number
  cancellation_period: number
  minimum_commitment_days: number
  refund_percentage: number
  transfer_fee: number
  upgrade_allowed: boolean
  downgrade_allowed: boolean
  package_category?: string
  age_restrictions?: any
  gender_restrictions?: string
  display_order: number
  terms_and_conditions?: string
  created_at: string
  updated_at: string
}

export interface Staff {
  id: string
  gym_id: string
  user_id: string
  employee_id: string
  profile?: UserProfile
  role: UserRole
  salary_amount: number
  salary_type: string
  base_commission_rate: number
  hire_date: string
  status: StaffStatus
  specializations: string[]
  certifications: any[]
  max_clients?: number
  hourly_rate?: number
  created_at: string
  updated_at: string
}

export interface Payment {
  id: string
  gym_id: string
  member_id: string
  membership_id?: string
  installment_id?: string
  payment_type: PaymentType
  amount: number
  original_amount: number
  payment_method: PaymentMethod
  payment_date: string
  due_date?: string
  status: PaymentStatus
  receipt_number: string
  description?: string
  installment_number: number
  total_installments: number
  refunded_amount: number
  processed_by?: string
  created_at: string
  updated_at: string
}

export interface Attendance {
  id: string
  gym_id: string
  user_id: string
  user_type: 'member' | 'staff'
  date: string
  check_in_time?: string
  check_out_time?: string
  status: AttendanceStatus
  notes?: string
  created_at: string
  updated_at: string
}

export interface Inquiry {
  id: string
  gym_id: string
  name: string
  phone: string
  email?: string
  age?: number
  gender?: string
  interest_area?: string
  preferred_timing?: string
  source: string
  status: InquiryStatus
  assigned_to?: string
  assigned_staff?: {
    id: string
    user_id: string
    role: string
  }
  follow_up_date?: string
  trial_date?: string
  conversion_date?: string
  package_interested?: string
  package_details?: {
    id: string
    name: string
    price: number
  }
  notes?: string
  created_at: string
  updated_at: string
}

export interface InquiryFollowup {
  id: string
  inquiry_id: string
  staff_id?: string
  followup_type: FollowupType
  followup_date: string
  followup_method: FollowupMethod
  status: FollowupStatus
  notes?: string
  outcome?: string
  next_followup_date?: string
  staff_name?: string
  created_at: string
  updated_at: string
}

export interface Expense {
  id: string
  gym_id: string
  category: string
  description: string
  amount: number
  date: string
  receipt_url?: string
  approved_by?: string
  created_by: string
  created_at: string
  updated_at: string
}

export interface TrainingSession {
  id: string
  member_id: string
  trainer_id: string
  session_date: string
  duration_minutes: number
  notes?: string
  completed: boolean
  created_at: string
  updated_at: string
}

export interface Invoice {
  id: string
  gym_id: string
  member_id: string
  invoice_number: string
  amount: number
  tax_amount?: number
  discount_amount?: number
  total_amount: number
  status: 'draft' | 'sent' | 'paid' | 'overdue'
  due_date: string
  created_at: string
  updated_at: string
}

export interface Notification {
  id: string
  user_id: string
  title: string
  message: string
  type: 'info' | 'warning' | 'success' | 'error'
  read: boolean
  action_url?: string
  created_at: string
}

export interface DashboardStats {
  total_members: number
  active_members: number
  trial_members: number
  total_revenue: number
  monthly_revenue: number
  pending_payments: number
  new_inquiries: number
  staff_count: number
  today_attendance: number
}

export interface GymHoliday {
  id: string
  gym_id: string
  name: string
  date: string
  description?: string
  created_at: string
}

// Additional interfaces for comprehensive member management
export interface MembershipChange {
  id: string
  member_id: string
  from_membership_id?: string
  to_membership_id?: string
  change_type: MembershipChangeType
  change_date: string
  amount_difference: number
  adjustment_amount: number
  refund_amount: number
  additional_payment: number
  reason?: string
  remaining_days?: number
  prorated_amount: number
  old_trainer_id?: string
  new_trainer_id?: string
  processed_by?: string
  approved_by?: string
  notes?: string
  created_at: string
}

export interface RefundRequest {
  id: string
  gym_id: string
  member_id: string
  membership_id: string
  original_payment_id?: string
  refund_type: RefundType
  requested_amount: number
  eligible_amount: number
  approved_amount?: number
  processing_fee: number
  final_refund_amount?: number
  reason: string
  member_comments?: string
  admin_comments?: string
  request_date: string
  reviewed_date?: string
  processed_date?: string
  status: RefundStatus
  refund_method?: PaymentMethod
  transaction_reference?: string
  requested_by?: string
  reviewed_by?: string
  processed_by?: string
  created_at: string
  updated_at: string
}

export interface Installment {
  id: string
  membership_id: string
  payment_plan_id: string
  installment_number: number
  total_installments: number
  amount: number
  due_date: string
  paid_date?: string
  status: InstallmentStatus
  late_fee: number
  notes?: string
  created_at: string
  updated_at: string
}

export interface PaymentPlan {
  id: string
  gym_id: string
  name: string
  description?: string
  total_installments: number
  installment_frequency: string
  down_payment_percentage: number
  late_fee_percentage: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface DiscountCode {
  id: string
  gym_id: string
  code: string
  description?: string
  discount_type: 'percentage' | 'fixed_amount' | 'buy_one_get_one' | 'family_discount'
  discount_value: number
  min_amount?: number
  max_discount?: number
  valid_from: string
  valid_until: string
  usage_limit?: number
  used_count: number
  is_active: boolean
  applicable_packages?: string[]
  created_at: string
  updated_at: string
}

// Extended member interface with related data
export interface MemberWithDetails extends Member {
  current_membership?: Membership
  membership_package?: MembershipPackage
  assigned_trainer?: Staff
  assigned_nutritionist?: Staff
  recent_payments?: Payment[]
  attendance_stats?: {
    total_visits: number
    last_visit: string
    attendance_percentage: number
  }
  payment_stats?: {
    total_paid: number
    total_pending: number
    last_payment_date?: string
  }
}
