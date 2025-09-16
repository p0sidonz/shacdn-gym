-- Fix RLS for refund_requests table
-- Allow gym owners to create refund requests

-- Drop existing policies
DROP POLICY IF EXISTS "Gym owners can manage refunds" ON refund_requests;
DROP POLICY IF EXISTS "Members can view own refunds" ON refund_requests;
DROP POLICY IF EXISTS "Staff can view gym refunds" ON refund_requests;

-- Create new policies
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

-- Members can view their own refund requests
CREATE POLICY "Members can view own refunds" ON refund_requests
FOR SELECT
USING (
  member_id IN (
    SELECT id FROM members WHERE user_id = auth.uid()
  )
);

-- Staff can view refund requests in their gym
CREATE POLICY "Staff can view gym refunds" ON refund_requests
FOR SELECT
USING (
  gym_id IN (
    SELECT s.gym_id FROM staff s
    WHERE s.user_id = auth.uid()
  )
);

-- Grant permissions
GRANT ALL ON refund_requests TO authenticated;

