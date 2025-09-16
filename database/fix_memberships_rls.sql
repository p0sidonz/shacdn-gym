-- Fix RLS policies for memberships table
-- This allows gym owners to create memberships for their members

-- Drop existing policies if any
DROP POLICY IF EXISTS "Gym owners can manage memberships" ON memberships;
DROP POLICY IF EXISTS "Members can view own memberships" ON memberships;
DROP POLICY IF EXISTS "Staff can view gym memberships" ON memberships;

-- Gym owners can manage memberships for their gym members
CREATE POLICY "Gym owners can manage memberships" ON memberships
FOR ALL
USING (
  member_id IN (
    SELECT m.id FROM members m
    JOIN gyms g ON g.id = m.gym_id
    WHERE g.owner_id = auth.uid()
  )
)
WITH CHECK (
  member_id IN (
    SELECT m.id FROM members m
    JOIN gyms g ON g.id = m.gym_id
    WHERE g.owner_id = auth.uid()
  )
);

-- Members can view their own memberships
CREATE POLICY "Members can view own memberships" ON memberships
FOR SELECT
USING (
  member_id IN (
    SELECT id FROM members WHERE user_id = auth.uid()
  )
);

-- Staff can view memberships in their gym
CREATE POLICY "Staff can view gym memberships" ON memberships
FOR SELECT
USING (
  member_id IN (
    SELECT m.id FROM members m
    JOIN staff s ON s.gym_id = m.gym_id
    WHERE s.user_id = auth.uid()
  )
);

-- Grant necessary permissions
GRANT ALL ON memberships TO authenticated;
