-- ============================================================================
-- STEP-BY-STEP MEMBER ATTENDANCE TABLE CREATION
-- Run this in Supabase SQL Editor
-- ============================================================================

-- Step 1: Create the basic table structure
CREATE TABLE member_attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    gym_id UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    membership_id UUID REFERENCES memberships(id) ON DELETE CASCADE,
    
    -- Date and time tracking
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    check_in_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    check_out_time TIMESTAMP WITH TIME ZONE,
    
    -- Auto-checkout flag for forgotten checkouts
    auto_checkout BOOLEAN DEFAULT FALSE,
    
    -- Additional fields
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT check_checkout_after_checkin CHECK (
        check_out_time IS NULL OR check_out_time > check_in_time
    ),
    
    -- Unique constraint to prevent duplicate check-ins on same day
    UNIQUE(member_id, date)
);
