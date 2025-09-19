-- ============================================================================
-- FINAL GYM MANAGEMENT CRM DATABASE SCHEMA
-- Complete Real-world Business Scenarios Implementation
-- ============================================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- COMPREHENSIVE ENUMS
-- ============================================================================

CREATE TYPE user_role AS ENUM ('gym_owner', 'manager', 'trainer', 'nutritionist', 'housekeeping', 'receptionist', 'member');
CREATE TYPE membership_status AS ENUM ('active', 'expired', 'suspended', 'trial', 'frozen', 'cancelled', 'pending_payment', 'transferred', 'upgraded', 'downgraded');
CREATE TYPE payment_status AS ENUM ('paid', 'partial', 'pending', 'overdue', 'refunded', 'cancelled', 'adjusted', 'credited');
CREATE TYPE payment_method AS ENUM ('cash', 'card', 'bank_transfer', 'upi', 'cheque', 'emi', 'wallet', 'adjustment', 'refund');
CREATE TYPE payment_type AS ENUM ('membership_fee', 'personal_training', 'addon_service', 'penalty', 'refund', 'adjustment', 'upgrade_fee', 'transfer_fee');
CREATE TYPE refund_status AS ENUM ('requested', 'approved', 'rejected', 'processed', 'cancelled');
CREATE TYPE refund_type AS ENUM ('full_refund', 'partial_refund', 'credit_adjustment', 'package_transfer');
CREATE TYPE trainer_commission_type AS ENUM ('percentage', 'fixed_amount', 'per_session', 'tier_based');
CREATE TYPE membership_change_type AS ENUM ('upgrade', 'downgrade', 'transfer', 'extension', 'freeze', 'cancellation');
CREATE TYPE installment_status AS ENUM ('pending', 'paid', 'overdue', 'cancelled', 'adjusted');
CREATE TYPE attendance_status AS ENUM ('present', 'absent', 'late', 'holiday', 'sick_leave', 'half_day');
CREATE TYPE inquiry_status AS ENUM ('new', 'contacted', 'interested', 'trial_scheduled', 'trial_completed', 'converted', 'follow_up', 'not_interested', 'lost');
CREATE TYPE invoice_status AS ENUM ('draft', 'sent', 'paid', 'overdue', 'cancelled', 'refunded');
CREATE TYPE notification_type AS ENUM ('info', 'warning', 'success', 'error', 'reminder', 'promotion');
CREATE TYPE staff_status AS ENUM ('active', 'inactive', 'terminated', 'on_leave', 'probation');
CREATE TYPE expense_category AS ENUM ('equipment', 'maintenance', 'utilities', 'staff', 'marketing', 'supplies', 'rent', 'insurance', 'taxes', 'supplements', 'other');
CREATE TYPE discount_type AS ENUM ('percentage', 'fixed_amount', 'buy_one_get_one', 'family_discount');

-- Audit actions
DO $$ BEGIN
  CREATE TYPE activity_action AS ENUM (
    'create', 'update', 'delete', 'status_change', 'assign', 'unassign',
    'login', 'logout', 'payment', 'refund'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- CORE TABLES
-- ============================================================================

-- User Profiles
CREATE TABLE profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    alternate_phone VARCHAR(20),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(100) DEFAULT 'India',
    date_of_birth DATE,
    gender VARCHAR(20),
    blood_group VARCHAR(10),
    emergency_contact_name VARCHAR(100),
    emergency_contact_phone VARCHAR(20),
    emergency_contact_relation VARCHAR(50),
    profile_image_url TEXT,
    id_proof_type VARCHAR(50),
    id_proof_number VARCHAR(100),
    occupation VARCHAR(100),
    how_did_you_hear VARCHAR(100),
    fitness_experience VARCHAR(50),
    medical_conditions TEXT[],
    medications TEXT[],
    fitness_goals TEXT[],
    preferences JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Gym Information
CREATE TABLE gyms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    postal_code VARCHAR(20),
    country VARCHAR(100) DEFAULT 'India',
    phone VARCHAR(20) NOT NULL,
    alternate_phone VARCHAR(20),
    email VARCHAR(100) NOT NULL,
    website VARCHAR(200),
    social_media JSONB DEFAULT '{}',
    license_number VARCHAR(100),
    gst_number VARCHAR(50),
    established_date DATE,
    logo_url TEXT,
    cover_image_url TEXT,
    operating_hours JSONB NOT NULL DEFAULT '{}',
    facilities TEXT[] DEFAULT '{}',
    amenities TEXT[] DEFAULT '{}',
    policies JSONB DEFAULT '{}',
    refund_policy JSONB DEFAULT '{}',
    transfer_policy JSONB DEFAULT '{}',
    cancellation_policy JSONB DEFAULT '{}',
    default_currency VARCHAR(10) DEFAULT 'INR',
    subscription_plan VARCHAR(50) DEFAULT 'basic',
    subscription_expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(owner_id)
);

-- Staff Management
CREATE TABLE staff (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    gym_id UUID REFERENCES gyms(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    role user_role NOT NULL CHECK (role IN ('manager', 'trainer', 'nutritionist', 'housekeeping', 'receptionist')),
    employee_id VARCHAR(50) NOT NULL,
    salary_amount DECIMAL(10,2) NOT NULL,
    salary_type VARCHAR(50) NOT NULL DEFAULT 'fixed',
    base_commission_rate DECIMAL(5,2) DEFAULT 0.00,
    hire_date DATE NOT NULL,
    probation_end_date DATE,
    contract_end_date DATE,
    status staff_status DEFAULT 'active',
    specializations TEXT[] DEFAULT '{}',
    certifications JSONB DEFAULT '[]',
    education JSONB DEFAULT '[]',
    experience_years INTEGER DEFAULT 0,
    languages TEXT[] DEFAULT '{}',
    work_schedule JSONB DEFAULT '{}',
    max_clients INTEGER,
    hourly_rate DECIMAL(8,2),
    overtime_rate DECIMAL(8,2),
    bank_account_details JSONB DEFAULT '{}',
    tax_details JSONB DEFAULT '{}',
    performance_metrics JSONB DEFAULT '{}',
    is_available_for_transfer BOOLEAN DEFAULT TRUE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(gym_id, employee_id),
    UNIQUE(gym_id, user_id)
);

-- Membership Packages
CREATE TABLE membership_packages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    gym_id UUID REFERENCES gyms(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    package_type VARCHAR(50) DEFAULT 'general',
    duration_days INTEGER NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    setup_fee DECIMAL(10,2) DEFAULT 0.00,
    security_deposit DECIMAL(10,2) DEFAULT 0.00,
    features TEXT[] DEFAULT '{}',
    restrictions TEXT[] DEFAULT '{}',
    is_trial BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    is_featured BOOLEAN DEFAULT FALSE,
    trainer_required BOOLEAN DEFAULT FALSE,
    pt_sessions_included INTEGER DEFAULT 0,
    max_sessions_per_day INTEGER DEFAULT 1,
    max_sessions_per_week INTEGER,
    max_sessions_per_month INTEGER,
    guest_passes INTEGER DEFAULT 0,
    freeze_allowance INTEGER DEFAULT 0,
    cancellation_period INTEGER DEFAULT 30,
    minimum_commitment_days INTEGER DEFAULT 0,
    refund_percentage DECIMAL(5,2) DEFAULT 0.00,
    transfer_fee DECIMAL(10,2) DEFAULT 0.00,
    upgrade_allowed BOOLEAN DEFAULT TRUE,
    downgrade_allowed BOOLEAN DEFAULT FALSE,
    package_category VARCHAR(50),
    age_restrictions JSONB,
    gender_restrictions VARCHAR(20),
    display_order INTEGER DEFAULT 0,
    terms_and_conditions TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Members
CREATE TABLE members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    gym_id UUID REFERENCES gyms(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    member_id VARCHAR(50) NOT NULL,
    assigned_trainer_id UUID REFERENCES staff(id) ON DELETE SET NULL,
    assigned_nutritionist_id UUID REFERENCES staff(id) ON DELETE SET NULL,
    joining_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status membership_status DEFAULT 'trial',
    source VARCHAR(100),
    referrer_member_id UUID REFERENCES members(id) ON DELETE SET NULL,
    credit_balance DECIMAL(10,2) DEFAULT 0.00,
    security_deposit DECIMAL(10,2) DEFAULT 0.00,
    fitness_goals TEXT[],
    workout_preferences TEXT[],
    preferred_workout_time VARCHAR(50),
    training_level VARCHAR(50),
    medical_clearance BOOLEAN DEFAULT FALSE,
    waiver_signed BOOLEAN DEFAULT FALSE,
    waiver_signed_date DATE,
    parent_guardian_name VARCHAR(200),
    parent_guardian_phone VARCHAR(20),
    notes TEXT,
    tags TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(gym_id, member_id),
    UNIQUE(gym_id, user_id),
    UNIQUE(profile_id)
);

-- Trainer Commission Rules
CREATE TABLE trainer_commission_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trainer_id UUID REFERENCES staff(id) ON DELETE CASCADE,
    package_id UUID REFERENCES membership_packages(id) ON DELETE CASCADE,
    member_id UUID REFERENCES members(id) ON DELETE CASCADE,
    commission_type trainer_commission_type NOT NULL,
    commission_value DECIMAL(10,2) NOT NULL,
    min_amount DECIMAL(10,2),
    max_amount DECIMAL(10,2),
    conditions JSONB DEFAULT '{}',
    valid_from DATE NOT NULL DEFAULT CURRENT_DATE,
    valid_until DATE,
    is_active BOOLEAN DEFAULT TRUE,
    notes TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Discount Codes
CREATE TABLE discount_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    gym_id UUID REFERENCES gyms(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    discount_type discount_type NOT NULL,
    discount_value DECIMAL(10,2) NOT NULL,
    minimum_purchase DECIMAL(10,2) DEFAULT 0.00,
    maximum_discount DECIMAL(10,2),
    applicable_packages UUID[],
    usage_limit INTEGER,
    usage_count INTEGER DEFAULT 0,
    per_user_limit INTEGER DEFAULT 1,
    valid_from DATE NOT NULL,
    valid_until DATE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(gym_id, code)
);

-- Payment Plans (EMI System)
CREATE TABLE payment_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    gym_id UUID REFERENCES gyms(id) ON DELETE CASCADE,
    member_id UUID REFERENCES members(id) ON DELETE CASCADE,
    total_amount DECIMAL(10,2) NOT NULL,
    down_payment DECIMAL(10,2) NOT NULL,
    remaining_amount DECIMAL(10,2) NOT NULL,
    number_of_installments INTEGER NOT NULL,
    installment_amount DECIMAL(10,2) NOT NULL,
    installment_frequency VARCHAR(20) NOT NULL,
    first_installment_date DATE NOT NULL,
    last_installment_date DATE NOT NULL,
    late_fee_percentage DECIMAL(5,2) DEFAULT 0.00,
    grace_period_days INTEGER DEFAULT 7,
    status VARCHAR(50) DEFAULT 'active',
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Installments
CREATE TABLE installments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_plan_id UUID REFERENCES payment_plans(id) ON DELETE CASCADE,
    installment_number INTEGER NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    due_date DATE NOT NULL,
    paid_date DATE,
    paid_amount DECIMAL(10,2) DEFAULT 0.00,
    late_fee DECIMAL(10,2) DEFAULT 0.00,
    status installment_status DEFAULT 'pending',
    payment_method payment_method,
    transaction_reference VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Memberships
CREATE TABLE memberships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    member_id UUID REFERENCES members(id) ON DELETE CASCADE,
    package_id UUID REFERENCES membership_packages(id) ON DELETE CASCADE,
    payment_plan_id UUID REFERENCES payment_plans(id) ON DELETE SET NULL,
    discount_code_id UUID REFERENCES discount_codes(id) ON DELETE SET NULL,
    original_membership_id UUID REFERENCES memberships(id) ON DELETE SET NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    actual_end_date DATE,
    status membership_status DEFAULT 'active',
    
    -- Financial Details
    original_amount DECIMAL(10,2) NOT NULL,
    discount_applied DECIMAL(10,2) DEFAULT 0.00,
    setup_fee_paid DECIMAL(10,2) DEFAULT 0.00,
    security_deposit_paid DECIMAL(10,2) DEFAULT 0.00,
    total_amount_due DECIMAL(10,2) NOT NULL,
    amount_paid DECIMAL(10,2) DEFAULT 0.00,
    amount_pending DECIMAL(10,2) NOT NULL,
    credit_used DECIMAL(10,2) DEFAULT 0.00,
    
    -- Trial and Conversion
    is_trial BOOLEAN DEFAULT FALSE,
    trial_converted_date DATE,
    trial_conversion_discount DECIMAL(10,2) DEFAULT 0.00,
    
    -- Membership Management
    auto_renew BOOLEAN DEFAULT FALSE,
    freeze_days_used INTEGER DEFAULT 0,
    freeze_start_date DATE,
    freeze_end_date DATE,
    freeze_reason TEXT,
    
    -- Cancellation and Refunds
    cancellation_date DATE,
    cancellation_reason TEXT,
    cancellation_notice_period INTEGER,
    refund_eligible_amount DECIMAL(10,2) DEFAULT 0.00,
    refund_processed_amount DECIMAL(10,2) DEFAULT 0.00,
    
    -- Transfers and Changes
    transferred_from_member_id UUID REFERENCES members(id) ON DELETE SET NULL,
    transferred_to_member_id UUID REFERENCES members(id) ON DELETE SET NULL,
    transfer_fee_paid DECIMAL(10,2) DEFAULT 0.00,
    
    -- Add-on Services
    addon_services JSONB DEFAULT '[]',
    pt_sessions_remaining INTEGER DEFAULT 0,
    pt_sessions_used INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Membership Changes History
CREATE TABLE membership_changes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    member_id UUID REFERENCES members(id) ON DELETE CASCADE,
    from_membership_id UUID REFERENCES memberships(id) ON DELETE SET NULL,
    to_membership_id UUID REFERENCES memberships(id) ON DELETE SET NULL,
    change_type membership_change_type NOT NULL,
    change_date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- Financial Impact
    amount_difference DECIMAL(10,2) DEFAULT 0.00,
    adjustment_amount DECIMAL(10,2) DEFAULT 0.00,
    refund_amount DECIMAL(10,2) DEFAULT 0.00,
    additional_payment DECIMAL(10,2) DEFAULT 0.00,
    
    -- Details
    reason TEXT,
    remaining_days INTEGER,
    prorated_amount DECIMAL(10,2) DEFAULT 0.00,
    
    -- Trainer Changes
    old_trainer_id UUID REFERENCES staff(id) ON DELETE SET NULL,
    new_trainer_id UUID REFERENCES staff(id) ON DELETE SET NULL,
    
    processed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payments
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    gym_id UUID REFERENCES gyms(id) ON DELETE CASCADE,
    member_id UUID REFERENCES members(id) ON DELETE CASCADE,
    membership_id UUID REFERENCES memberships(id) ON DELETE SET NULL,
    installment_id UUID REFERENCES installments(id) ON DELETE SET NULL,
    invoice_id UUID,
    discount_code_id UUID REFERENCES discount_codes(id) ON DELETE SET NULL,
    payment_plan_id UUID REFERENCES payment_plans(id) ON DELETE SET NULL,
    
    -- Payment Details
    payment_type payment_type NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    original_amount DECIMAL(10,2) NOT NULL,
    discount_amount DECIMAL(10,2) DEFAULT 0.00,
    tax_amount DECIMAL(10,2) DEFAULT 0.00,
    late_fee DECIMAL(10,2) DEFAULT 0.00,
    adjustment_amount DECIMAL(10,2) DEFAULT 0.00,
    
    -- Payment Processing
    payment_method payment_method NOT NULL,
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE,
    status payment_status DEFAULT 'paid',
    transaction_id VARCHAR(100),
    transaction_reference VARCHAR(100),
    receipt_number VARCHAR(100) NOT NULL,
    gateway_response JSONB,
    
    -- Installment Details
    installment_number INTEGER DEFAULT 1,
    total_installments INTEGER DEFAULT 1,
    recurring_payment_id UUID,
    
    -- References
    reference_payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
    parent_payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
    
    -- Refund Information
    refunded_amount DECIMAL(10,2) DEFAULT 0.00,
    refund_reason TEXT,
    refunded_date DATE,
    refund_method payment_method,
    refund_transaction_id VARCHAR(100),
    
    -- Additional Info
    description TEXT,
    notes TEXT,
    processed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(gym_id, receipt_number)
);

-- Refund Requests
CREATE TABLE refund_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    gym_id UUID REFERENCES gyms(id) ON DELETE CASCADE,
    member_id UUID REFERENCES members(id) ON DELETE CASCADE,
    membership_id UUID REFERENCES memberships(id) ON DELETE CASCADE,
    original_payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
    
    refund_type refund_type NOT NULL,
    requested_amount DECIMAL(10,2) NOT NULL,
    eligible_amount DECIMAL(10,2) NOT NULL,
    approved_amount DECIMAL(10,2),
    processing_fee DECIMAL(10,2) DEFAULT 0.00,
    final_refund_amount DECIMAL(10,2),
    
    reason TEXT NOT NULL,
    member_comments TEXT,
    admin_comments TEXT,
    
    request_date DATE NOT NULL DEFAULT CURRENT_DATE,
    reviewed_date DATE,
    processed_date DATE,
    status refund_status DEFAULT 'requested',
    
    refund_method payment_method,
    transaction_reference VARCHAR(100),
    
    requested_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    processed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Training Sessions
CREATE TABLE training_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    member_id UUID REFERENCES members(id) ON DELETE CASCADE,
    trainer_id UUID REFERENCES staff(id) ON DELETE CASCADE,
    membership_id UUID REFERENCES memberships(id) ON DELETE SET NULL,
    
    session_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    duration_minutes INTEGER NOT NULL,
    
    session_type VARCHAR(100) DEFAULT 'personal_training',
    session_focus VARCHAR(100),
    session_number INTEGER,
    total_sessions INTEGER,
    
    session_fee DECIMAL(8,2),
    trainer_fee DECIMAL(8,2),
    
    exercises_performed JSONB DEFAULT '[]',
    member_fitness_level VARCHAR(50),
    session_rating INTEGER CHECK (session_rating >= 1 AND session_rating <= 5),
    calories_burned INTEGER,
    
    notes TEXT,
    member_feedback TEXT,
    trainer_notes TEXT,
    homework_assigned TEXT,
    next_session_plan TEXT,
    
    completed BOOLEAN DEFAULT FALSE,
    cancelled BOOLEAN DEFAULT FALSE,
    cancellation_reason TEXT,
    cancelled_by VARCHAR(50),
    cancellation_fee DECIMAL(8,2) DEFAULT 0.00,
    
    rescheduled_from UUID REFERENCES training_sessions(id),
    reschedule_fee DECIMAL(8,2) DEFAULT 0.00,
    
    no_show BOOLEAN DEFAULT FALSE,
    no_show_fee DECIMAL(8,2) DEFAULT 0.00,
    late_arrival_minutes INTEGER DEFAULT 0,
    
    progress_photos TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trainer Earnings
CREATE TABLE trainer_earnings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trainer_id UUID REFERENCES staff(id) ON DELETE CASCADE,
    member_id UUID REFERENCES members(id) ON DELETE CASCADE,
    membership_id UUID REFERENCES memberships(id) ON DELETE SET NULL,
    training_session_id UUID REFERENCES training_sessions(id) ON DELETE SET NULL,
    commission_rule_id UUID REFERENCES trainer_commission_rules(id) ON DELETE SET NULL,
    
    earning_type VARCHAR(50) NOT NULL,
    base_amount DECIMAL(10,2) NOT NULL,
    commission_rate DECIMAL(5,2),
    commission_amount DECIMAL(10,2) NOT NULL,
    bonus_amount DECIMAL(10,2) DEFAULT 0.00,
    penalty_amount DECIMAL(10,2) DEFAULT 0.00,
    adjustment_amount DECIMAL(10,2) DEFAULT 0.00,
    total_earning DECIMAL(10,2) NOT NULL,
    
    earning_date DATE NOT NULL DEFAULT CURRENT_DATE,
    earning_month VARCHAR(7),
    payment_cycle VARCHAR(50),
    
    is_paid BOOLEAN DEFAULT FALSE,
    paid_date DATE,
    payroll_id UUID,
    payment_reference VARCHAR(100),
    
    -- For transferred members
    original_trainer_id UUID REFERENCES staff(id) ON DELETE SET NULL,
    transfer_adjustment DECIMAL(10,2) DEFAULT 0.00,
    
    notes TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Credit Transactions
CREATE TABLE credit_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    gym_id UUID REFERENCES gyms(id) ON DELETE CASCADE,
    member_id UUID REFERENCES members(id) ON DELETE CASCADE,
    membership_id UUID REFERENCES memberships(id) ON DELETE SET NULL,
    
    transaction_type VARCHAR(50) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    balance_before DECIMAL(10,2) NOT NULL,
    balance_after DECIMAL(10,2) NOT NULL,
    
    source VARCHAR(100),
    reference_payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
    reference_refund_id UUID REFERENCES refund_requests(id) ON DELETE SET NULL,
    reference_membership_change_id UUID REFERENCES membership_changes(id) ON DELETE SET NULL,
    
    description TEXT NOT NULL,
    notes TEXT,
    expiry_date DATE,
    
    processed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- ACTIVITY LOGS (AUDIT TRAIL)
-- Tracks who changed what and when across the app
-- ============================================================================
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gym_id UUID NOT NULL,
  actor_user_id UUID,                 -- who performed the action (auth.uid)
  actor_profile_id UUID,              -- optional link to profiles.id
  resource_type TEXT NOT NULL,        -- e.g. 'inquiry', 'member', 'membership', 'payment', 'trainer', 'finance'
  resource_id TEXT NOT NULL,          -- UUID or composite key as string
  action activity_action NOT NULL,
  description TEXT,
  before_data JSONB,
  after_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_activity_logs_gym_id ON activity_logs (gym_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_actor_user ON activity_logs (actor_user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_resource ON activity_logs (resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs (created_at DESC);

-- Enable Row Level Security
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Select policy: gym owner sees all logs for their gym; staff sees only logs for their gym OR restricted to self if desired
DO $$ BEGIN
  CREATE POLICY activity_logs_select_policy ON activity_logs
  FOR SELECT
  USING (
    -- gym owner
    EXISTS (
      SELECT 1 FROM gyms g WHERE g.id = activity_logs.gym_id AND g.owner_id = auth.uid()
    )
    OR
    -- active staff of the same gym
    EXISTS (
      SELECT 1 FROM staff s WHERE s.gym_id = activity_logs.gym_id AND s.user_id = auth.uid() AND s.status = 'active'
    )
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Insert policy: only authenticated users associated with the gym can insert
DO $$ BEGIN
  CREATE POLICY activity_logs_insert_policy ON activity_logs
  FOR INSERT
  WITH CHECK (
    -- gym owner check
    EXISTS (SELECT 1 FROM gyms g WHERE g.id = gym_id AND g.owner_id = auth.uid())
    OR
    -- staff of the gym
    EXISTS (SELECT 1 FROM staff s WHERE s.gym_id = gym_id AND s.user_id = auth.uid() AND s.status = 'active')
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Optionally forbid updates/deletes to preserve immutability
DO $$ BEGIN
  CREATE POLICY activity_logs_block_update ON activity_logs FOR UPDATE USING (false);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY activity_logs_block_delete ON activity_logs FOR DELETE USING (false);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Attendance
CREATE TABLE attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    gym_id UUID REFERENCES gyms(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    user_type user_role NOT NULL,
    attendance_date DATE NOT NULL DEFAULT CURRENT_DATE,
    check_in_time TIME,
    check_out_time TIME,
    status attendance_status DEFAULT 'present',
    notes TEXT,
    marked_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(gym_id, user_id, attendance_date)
);

-- Inquiries
CREATE TABLE inquiries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    gym_id UUID REFERENCES gyms(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(100),
    age INTEGER,
    gender VARCHAR(10),
    interest_area TEXT,
    preferred_timing VARCHAR(100),
    source VARCHAR(100),
    status inquiry_status DEFAULT 'new',
    assigned_to UUID REFERENCES staff(id) ON DELETE SET NULL,
    follow_up_date DATE,
    trial_date DATE,
    conversion_date DATE,
    package_interested UUID REFERENCES membership_packages(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Follow-ups
CREATE TABLE follow_ups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    gym_id UUID REFERENCES gyms(id) ON DELETE CASCADE,
    member_id UUID REFERENCES members(id) ON DELETE CASCADE,
    assigned_to UUID REFERENCES staff(id) ON DELETE SET NULL,
    follow_up_date TIMESTAMP WITH TIME ZONE NOT NULL,
    response TEXT,
    convertibility VARCHAR(20) DEFAULT 'medium' CHECK (convertibility IN ('high', 'medium', 'low')),
    next_follow_up_date TIMESTAMP WITH TIME ZONE,
    next_follow_up_time TIME,
    remark TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Expenses
CREATE TABLE expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    gym_id UUID REFERENCES gyms(id) ON DELETE CASCADE,
    category expense_category NOT NULL,
    subcategory VARCHAR(100),
    description TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
    vendor_name VARCHAR(200),
    receipt_url TEXT,
    is_recurring BOOLEAN DEFAULT FALSE,
    recurrence_pattern JSONB,
    approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notifications
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    type notification_type DEFAULT 'info',
    read BOOLEAN DEFAULT FALSE,
    action_url TEXT,
    scheduled_for TIMESTAMP WITH TIME ZONE,
    sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX idx_profiles_user_id ON profiles(user_id);
CREATE INDEX idx_gyms_owner_id ON gyms(owner_id);
CREATE INDEX idx_members_gym_id ON members(gym_id);
CREATE INDEX idx_members_user_id ON members(user_id);
CREATE INDEX idx_memberships_member_status ON memberships(member_id, status);
CREATE INDEX idx_memberships_dates_status ON memberships(start_date, end_date, status);
CREATE INDEX idx_payments_gym_id ON payments(gym_id);
CREATE INDEX idx_payments_member_date ON payments(member_id, payment_date);
CREATE INDEX idx_payments_membership_type ON payments(membership_id, payment_type);
CREATE INDEX idx_trainer_earnings_trainer_month ON trainer_earnings(trainer_id, earning_month, is_paid);
CREATE INDEX idx_trainer_commission_rules_trainer ON trainer_commission_rules(trainer_id, package_id, member_id);
CREATE INDEX idx_installments_plan_status ON installments(payment_plan_id, status, due_date);
CREATE INDEX idx_refund_requests_member_status ON refund_requests(member_id, status);
CREATE INDEX idx_membership_changes_member_date ON membership_changes(member_id, change_date);
CREATE INDEX idx_credit_transactions_member ON credit_transactions(member_id, transaction_type);
CREATE INDEX idx_training_sessions_trainer_date ON training_sessions(trainer_id, session_date);
CREATE INDEX idx_attendance_gym_user_date ON attendance(gym_id, user_id, attendance_date);
CREATE INDEX idx_inquiries_gym_status ON inquiries(gym_id, status);
CREATE INDEX idx_expenses_gym_date ON expenses(gym_id, expense_date);
CREATE INDEX idx_discount_codes_gym_code ON discount_codes(gym_id, code);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE gyms ENABLE ROW LEVEL SECURITY;
ALTER TABLE membership_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE refund_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE trainer_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE follow_ups ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Basic RLS Policies
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Gym owners can manage their gym" ON gyms FOR ALL USING (auth.uid() = owner_id);

-- Staff RLS Policies
CREATE POLICY "Gym owners can access staff" ON staff FOR ALL USING (
  gym_id IN (SELECT id FROM gyms WHERE owner_id = auth.uid())
);
CREATE POLICY "Staff can view own data" ON staff FOR SELECT USING (auth.uid() = user_id);

-- Members RLS Policies  
CREATE POLICY "Gym owners can access members" ON members FOR ALL USING (
  gym_id IN (SELECT id FROM gyms WHERE owner_id = auth.uid())
);
CREATE POLICY "Staff can view gym members" ON members FOR SELECT USING (
  gym_id = (SELECT gym_id FROM staff WHERE user_id = auth.uid() LIMIT 1)
);

-- Memberships RLS Policies
CREATE POLICY "Gym owners can access memberships" ON memberships FOR ALL USING (
  member_id IN (
    SELECT id FROM members WHERE gym_id IN (
      SELECT id FROM gyms WHERE owner_id = auth.uid()
    )
  )
);
CREATE POLICY "Staff can view gym memberships" ON memberships FOR SELECT USING (
  member_id IN (
    SELECT id FROM members WHERE gym_id = (
      SELECT gym_id FROM staff WHERE user_id = auth.uid() LIMIT 1
    )
  )
);

-- Payments RLS Policies
CREATE POLICY "Gym owners can access payments" ON payments FOR ALL USING (
  gym_id IN (SELECT id FROM gyms WHERE owner_id = auth.uid())
);
CREATE POLICY "Staff can view gym payments" ON payments FOR SELECT USING (
  gym_id = (SELECT gym_id FROM staff WHERE user_id = auth.uid() LIMIT 1)
);

-- Refund Requests RLS Policies
CREATE POLICY "Gym owners can access refunds" ON refund_requests FOR ALL USING (
  gym_id IN (SELECT id FROM gyms WHERE owner_id = auth.uid())
);
CREATE POLICY "Staff can view gym refunds" ON refund_requests FOR SELECT USING (
  gym_id = (SELECT gym_id FROM staff WHERE user_id = auth.uid() LIMIT 1)
);

-- Follow-ups RLS Policies
CREATE POLICY "Gym owners can access follow-ups" ON follow_ups FOR ALL USING (
  gym_id IN (SELECT id FROM gyms WHERE owner_id = auth.uid())
);
CREATE POLICY "Staff can view gym follow-ups" ON follow_ups FOR SELECT USING (
  gym_id = (SELECT gym_id FROM staff WHERE user_id = auth.uid() LIMIT 1)
);
CREATE POLICY "Staff can manage gym follow-ups" ON follow_ups FOR ALL USING (
  gym_id = (SELECT gym_id FROM staff WHERE user_id = auth.uid() LIMIT 1)
);

-- Training Sessions RLS Policies
CREATE POLICY "Gym owners can access training sessions" ON training_sessions FOR ALL USING (
  member_id IN (
    SELECT id FROM members WHERE gym_id IN (
      SELECT id FROM gyms WHERE owner_id = auth.uid()
    )
  )
);
CREATE POLICY "Staff can view gym training sessions" ON training_sessions FOR SELECT USING (
  member_id IN (
    SELECT id FROM members WHERE gym_id = (
      SELECT gym_id FROM staff WHERE user_id = auth.uid() LIMIT 1
    )
  )
);
CREATE POLICY "Staff can manage gym training sessions" ON training_sessions FOR ALL USING (
  member_id IN (
    SELECT id FROM members WHERE gym_id = (
      SELECT gym_id FROM staff WHERE user_id = auth.uid() LIMIT 1
    )
  )
);

-- Attendance RLS Policies
CREATE POLICY "Gym owners can access attendance" ON attendance FOR ALL USING (
  gym_id IN (SELECT id FROM gyms WHERE owner_id = auth.uid())
);
CREATE POLICY "Staff can view gym attendance" ON attendance FOR SELECT USING (
  gym_id = (SELECT gym_id FROM staff WHERE user_id = auth.uid() LIMIT 1)
);

-- Inquiries RLS Policies
CREATE POLICY "Gym owners can access inquiries" ON inquiries FOR ALL USING (
  gym_id IN (SELECT id FROM gyms WHERE owner_id = auth.uid())
);
CREATE POLICY "Staff can view gym inquiries" ON inquiries FOR SELECT USING (
  gym_id = (SELECT gym_id FROM staff WHERE user_id = auth.uid() LIMIT 1)
);

-- Expenses RLS Policies
CREATE POLICY "Gym owners can access expenses" ON expenses FOR ALL USING (
  gym_id IN (SELECT id FROM gyms WHERE owner_id = auth.uid())
);
CREATE POLICY "Staff can view gym expenses" ON expenses FOR SELECT USING (
  gym_id = (SELECT gym_id FROM staff WHERE user_id = auth.uid() LIMIT 1)
);

-- Notifications RLS Policies
CREATE POLICY "Users can view own notifications" ON notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON notifications FOR UPDATE USING (auth.uid() = user_id);

-- Staff RLS Policies (Non-recursive)
CREATE POLICY "Staff can view own data" ON staff FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Gym owners can view gym staff" ON staff FOR SELECT USING (
  gym_id IN (
    SELECT id FROM gyms WHERE owner_id = auth.uid()
  )
);
CREATE POLICY "Gym owners can manage gym staff" ON staff FOR ALL USING (
  gym_id IN (
    SELECT id FROM gyms WHERE owner_id = auth.uid()
  )
);
CREATE POLICY "Staff can view same gym staff" ON staff FOR SELECT USING (
  gym_id = (
    SELECT gym_id FROM staff WHERE user_id = auth.uid() LIMIT 1
  )
);
CREATE POLICY "Staff can update own data" ON staff FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Staff can insert own data" ON staff FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Follow-ups RLS Policies (Non-recursive)
CREATE POLICY "Gym staff can view follow-ups" ON follow_ups FOR SELECT USING (
  gym_id IN (
    SELECT id FROM gyms WHERE owner_id = auth.uid()
  ) OR
  gym_id = (
    SELECT gym_id FROM staff WHERE user_id = auth.uid() LIMIT 1
  )
);
CREATE POLICY "Gym staff can manage follow-ups" ON follow_ups FOR ALL USING (
  gym_id IN (
    SELECT id FROM gyms WHERE owner_id = auth.uid()
  ) OR
  gym_id = (
    SELECT gym_id FROM staff WHERE user_id = auth.uid() LIMIT 1
  )
);

-- Training Sessions RLS Policies (Non-recursive)
CREATE POLICY "Gym staff can view training sessions" ON training_sessions FOR SELECT USING (
  member_id IN (
    SELECT m.id FROM members m 
    WHERE m.gym_id IN (
      SELECT id FROM gyms WHERE owner_id = auth.uid()
    ) OR m.gym_id = (
      SELECT gym_id FROM staff WHERE user_id = auth.uid() LIMIT 1
    )
  )
);
CREATE POLICY "Gym staff can manage training sessions" ON training_sessions FOR ALL USING (
  member_id IN (
    SELECT m.id FROM members m 
    WHERE m.gym_id IN (
      SELECT id FROM gyms WHERE owner_id = auth.uid()
    ) OR m.gym_id = (
      SELECT gym_id FROM staff WHERE user_id = auth.uid() LIMIT 1
    )
  )
);

-- ============================================================================
-- FUNCTIONS AND TRIGGERS
-- ============================================================================

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_gyms_updated_at BEFORE UPDATE ON gyms FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_membership_packages_updated_at BEFORE UPDATE ON membership_packages FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_staff_updated_at BEFORE UPDATE ON staff FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_members_updated_at BEFORE UPDATE ON members FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_memberships_updated_at BEFORE UPDATE ON memberships FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_training_sessions_updated_at BEFORE UPDATE ON training_sessions FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_attendance_updated_at BEFORE UPDATE ON attendance FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_inquiries_updated_at BEFORE UPDATE ON inquiries FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON expenses FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (user_id, first_name, last_name, phone)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'phone', '')
    );
    RETURN NEW;
END;
$$ language 'plpgsql' security definer;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Function to calculate refund amount
CREATE OR REPLACE FUNCTION calculate_refund_amount(
    membership_uuid UUID,
    cancellation_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
    eligible_amount DECIMAL,
    processing_fee DECIMAL,
    final_amount DECIMAL,
    calculation_details JSONB
) AS $$
DECLARE
    membership_record RECORD;
    package_record RECORD;
    days_used INTEGER;
    total_days INTEGER;
    unused_percentage DECIMAL;
    base_refund DECIMAL;
    policy_refund_rate DECIMAL;
    calculated_fee DECIMAL;
BEGIN
    SELECT * INTO membership_record FROM memberships m WHERE m.id = membership_uuid;
    SELECT * INTO package_record FROM membership_packages mp WHERE mp.id = membership_record.package_id;
    
    days_used := cancellation_date - membership_record.start_date;
    total_days := membership_record.end_date - membership_record.start_date;
    
    IF total_days > 0 THEN
        unused_percentage := (total_days - days_used)::DECIMAL / total_days;
    ELSE
        unused_percentage := 0;
    END IF;
    
    policy_refund_rate := COALESCE(package_record.refund_percentage, 0) / 100;
    base_refund := membership_record.amount_paid * unused_percentage * policy_refund_rate;
    calculated_fee := base_refund * 0.05;
    
    RETURN QUERY SELECT 
        base_refund,
        calculated_fee,
        base_refund - calculated_fee,
        jsonb_build_object(
            'days_used', days_used,
            'total_days', total_days,
            'unused_percentage', unused_percentage,
            'policy_refund_rate', policy_refund_rate,
            'amount_paid', membership_record.amount_paid
        );
END;
$$ LANGUAGE plpgsql;

-- Function to calculate trainer commission
CREATE OR REPLACE FUNCTION calculate_trainer_commission(
    trainer_uuid UUID,
    member_uuid UUID,
    membership_uuid UUID,
    payment_amount DECIMAL
)
RETURNS DECIMAL AS $$
DECLARE
    commission_rule RECORD;
    commission_amount DECIMAL := 0;
    package_uuid UUID;
BEGIN
    SELECT package_id INTO package_uuid FROM memberships WHERE id = membership_uuid;
    
    SELECT * INTO commission_rule
    FROM trainer_commission_rules tcr
    WHERE tcr.trainer_id = trainer_uuid
    AND (tcr.member_id = member_uuid OR tcr.member_id IS NULL)
    AND (tcr.package_id = package_uuid OR tcr.package_id IS NULL)
    AND tcr.is_active = TRUE
    AND (tcr.valid_until IS NULL OR tcr.valid_until >= CURRENT_DATE)
    ORDER BY 
        CASE WHEN tcr.member_id IS NOT NULL THEN 1 ELSE 2 END,
        CASE WHEN tcr.package_id IS NOT NULL THEN 1 ELSE 2 END
    LIMIT 1;
    
    IF NOT FOUND THEN
        SELECT s.base_commission_rate INTO commission_rule.commission_value
        FROM staff s WHERE s.id = trainer_uuid;
        commission_rule.commission_type := 'percentage';
    END IF;
    
    IF commission_rule.commission_type = 'percentage' THEN
        commission_amount := payment_amount * (commission_rule.commission_value / 100);
    ELSIF commission_rule.commission_type = 'fixed_amount' THEN
        commission_amount := commission_rule.commission_value;
    END IF;
    
    IF commission_rule.min_amount IS NOT NULL AND commission_amount < commission_rule.min_amount THEN
        commission_amount := commission_rule.min_amount;
    END IF;
    
    IF commission_rule.max_amount IS NOT NULL AND commission_amount > commission_rule.max_amount THEN
        commission_amount := commission_rule.max_amount;
    END IF;
    
    INSERT INTO trainer_earnings (
        trainer_id, member_id, membership_id, commission_rule_id,
        earning_type, base_amount, commission_rate, commission_amount,
        total_earning, earning_month
    ) VALUES (
        trainer_uuid, member_uuid, membership_uuid, commission_rule.id,
        'signup_commission', payment_amount, commission_rule.commission_value,
        commission_amount, commission_amount, TO_CHAR(CURRENT_DATE, 'YYYY-MM')
    );
    
    RETURN commission_amount;
END;
$$ LANGUAGE plpgsql;

-- Auto-generate installment schedule
CREATE OR REPLACE FUNCTION generate_installment_schedule()
RETURNS TRIGGER AS $$
DECLARE
    i INTEGER;
    due_date DATE;
BEGIN
    FOR i IN 1..NEW.number_of_installments LOOP
        CASE NEW.installment_frequency
            WHEN 'weekly' THEN
                due_date := NEW.first_installment_date + INTERVAL '7 days' * (i - 1);
            WHEN 'monthly' THEN
                due_date := NEW.first_installment_date + INTERVAL '1 month' * (i - 1);
            WHEN 'quarterly' THEN
                due_date := NEW.first_installment_date + INTERVAL '3 months' * (i - 1);
        END CASE;
        
        INSERT INTO installments (payment_plan_id, installment_number, amount, due_date)
        VALUES (NEW.id, i, NEW.installment_amount, due_date);
    END LOOP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_generate_installment_schedule
    AFTER INSERT ON payment_plans
    FOR EACH ROW
    EXECUTE FUNCTION generate_installment_schedule();

-- Update discount code usage
CREATE OR REPLACE FUNCTION update_discount_usage()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.discount_code_id IS NOT NULL AND NEW.status = 'paid' THEN
        UPDATE discount_codes 
        SET usage_count = usage_count + 1
        WHERE id = NEW.discount_code_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_discount_usage
    AFTER INSERT ON payments
    FOR EACH ROW
    EXECUTE FUNCTION update_discount_usage();

-- ============================================================================
-- Safe trigger attachment (run after all tables are created)
-- Creates triggers only if the target table exists; ignores duplicates
-- ============================================================================
DO $$
DECLARE
    v_sql text;
BEGIN
    -- inquiries
    IF to_regclass('public.inquiries') IS NOT NULL THEN
        BEGIN
            v_sql := 'CREATE TRIGGER trg_inquiries_audit AFTER INSERT OR UPDATE OR DELETE ON public.inquiries FOR EACH ROW EXECUTE FUNCTION public.log_activity_generic()';
            EXECUTE v_sql;
        EXCEPTION WHEN duplicate_object THEN NULL; END;
    END IF;

    -- members
    IF to_regclass('public.members') IS NOT NULL THEN
        BEGIN
            v_sql := 'CREATE TRIGGER trg_members_audit AFTER INSERT OR UPDATE OR DELETE ON public.members FOR EACH ROW EXECUTE FUNCTION public.log_activity_generic()';
            EXECUTE v_sql;
        EXCEPTION WHEN duplicate_object THEN NULL; END;
    END IF;

    -- memberships
    IF to_regclass('public.memberships') IS NOT NULL THEN
        BEGIN
            v_sql := 'CREATE TRIGGER trg_memberships_audit AFTER INSERT OR UPDATE OR DELETE ON public.memberships FOR EACH ROW EXECUTE FUNCTION public.log_activity_generic()';
            EXECUTE v_sql;
        EXCEPTION WHEN duplicate_object THEN NULL; END;
    END IF;

    -- payments
    IF to_regclass('public.payments') IS NOT NULL THEN
        BEGIN
            v_sql := 'CREATE TRIGGER trg_payments_audit AFTER INSERT OR UPDATE OR DELETE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.log_activity_generic()';
            EXECUTE v_sql;
        EXCEPTION WHEN duplicate_object THEN NULL; END;
    END IF;

    -- profiles
    IF to_regclass('public.profiles') IS NOT NULL THEN
        BEGIN
            v_sql := 'CREATE TRIGGER trg_profiles_audit AFTER INSERT OR UPDATE OR DELETE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.log_activity_profiles()';
            EXECUTE v_sql;
        EXCEPTION WHEN duplicate_object THEN NULL; END;
    END IF;

    -- inquiry_followups
    IF to_regclass('public.inquiry_followups') IS NOT NULL THEN
        BEGIN
            v_sql := 'CREATE TRIGGER trg_inquiry_followups_audit AFTER INSERT OR UPDATE OR DELETE ON public.inquiry_followups FOR EACH ROW EXECUTE FUNCTION public.log_activity_inquiry_followups()';
            EXECUTE v_sql;
        EXCEPTION WHEN duplicate_object THEN NULL; END;
    END IF;
END $$;
