-- Fix RLS policies for refund_requests table
-- This allows proper access for gym owners, staff, and members

-- ============================================================================
-- REFUND REQUESTS TABLE RLS FIX
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Gym owners can manage refunds" ON refund_requests;
DROP POLICY IF EXISTS "Members can view own refunds" ON refund_requests;
DROP POLICY IF EXISTS "Staff can view gym refunds" ON refund_requests;
DROP POLICY IF EXISTS "Members can insert own refunds" ON refund_requests;
DROP POLICY IF EXISTS "Staff can insert gym refunds" ON refund_requests;

-- Create comprehensive policies

-- 1. Gym owners can manage all refunds in their gym
CREATE POLICY "Gym owners can manage refunds" ON refund_requests
FOR ALL
USING (
  gym_id IN (
    SELECT id FROM gyms WHERE owner_id = auth.uid()
  )
)
WITH CHECK (
  gym_id IN (
    SELECT id FROM gyms WHERE owner_id = auth.uid()
  )
);

-- 2. Staff can view and insert refund requests in their gym
CREATE POLICY "Staff can view gym refunds" ON refund_requests
FOR SELECT
USING (
  gym_id IN (
    SELECT s.gym_id FROM staff s
    WHERE s.user_id = auth.uid()
  )
);

CREATE POLICY "Staff can insert gym refunds" ON refund_requests
FOR INSERT
WITH CHECK (
  gym_id IN (
    SELECT s.gym_id FROM staff s
    WHERE s.user_id = auth.uid()
  )
);

-- 3. Members can view their own refund requests
CREATE POLICY "Members can view own refunds" ON refund_requests
FOR SELECT
USING (
  member_id IN (
    SELECT id FROM members WHERE user_id = auth.uid()
  )
);

-- 4. Members can insert their own refund requests
CREATE POLICY "Members can insert own refunds" ON refund_requests
FOR INSERT
WITH CHECK (
  member_id IN (
    SELECT id FROM members WHERE user_id = auth.uid()
  )
);

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Grant necessary permissions
GRANT ALL ON refund_requests TO authenticated;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check if policies are working correctly
-- You can run these queries to verify the policies work:

-- 1. Check if gym owner can see all refunds in their gym
-- SELECT * FROM refund_requests WHERE gym_id = 'your-gym-id';

-- 2. Check if staff can see refunds in their gym
-- SELECT * FROM refund_requests WHERE gym_id = 'your-gym-id';

-- 3. Check if member can see their own refunds
-- SELECT * FROM refund_requests WHERE member_id = 'your-member-id';

-- 4. Test insert permissions
-- INSERT INTO refund_requests (gym_id, member_id, membership_id, refund_type, requested_amount, eligible_amount, reason)
-- VALUES ('gym-id', 'member-id', 'membership-id', 'full_refund', 100.00, 100.00, 'Test refund');
