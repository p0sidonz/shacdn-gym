-- Fix CORS and RLS Issues for Staff Creation
-- This script fixes the RLS policies to allow proper staff creation

-- First, let's check and fix the profiles table RLS policies
-- The current policy only allows users to insert their own profile
-- But we need to allow gym owners to create profiles for staff

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- Create more flexible policies for profiles
-- Users can manage their own profiles
CREATE POLICY "Users can manage own profile" ON profiles
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Gym owners can manage profiles for their staff and members
CREATE POLICY "Gym owners can manage profiles" ON profiles
FOR ALL
USING (
  user_id IN (
    SELECT s.user_id FROM staff s
    JOIN gyms g ON g.id = s.gym_id
    WHERE g.owner_id = auth.uid()
  )
  OR
  user_id IN (
    SELECT m.user_id FROM members m
    JOIN gyms g ON g.id = m.gym_id
    WHERE g.owner_id = auth.uid()
  )
)
WITH CHECK (
  user_id IN (
    SELECT s.user_id FROM staff s
    JOIN gyms g ON g.id = s.gym_id
    WHERE g.owner_id = auth.uid()
  )
  OR
  user_id IN (
    SELECT m.user_id FROM members m
    JOIN gyms g ON g.id = m.gym_id
    WHERE g.owner_id = auth.uid()
  )
);

-- Staff can view profiles of members in their gym
CREATE POLICY "Staff can view member profiles" ON profiles
FOR SELECT
USING (
  user_id IN (
    SELECT m.user_id FROM members m
    JOIN staff s ON s.gym_id = m.gym_id
    WHERE s.user_id = auth.uid()
  )
);

-- Fix staff table RLS policies
-- Drop existing policies
DROP POLICY IF EXISTS "Gym owners can manage staff" ON staff;
DROP POLICY IF EXISTS "Staff can view own record" ON staff;

-- Gym owners can manage all staff in their gyms
CREATE POLICY "Gym owners can manage staff" ON staff
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

-- Staff can view their own record
CREATE POLICY "Staff can view own record" ON staff
FOR SELECT
USING (auth.uid() = user_id);

-- Staff can view other staff in their gym
CREATE POLICY "Staff can view gym staff" ON staff
FOR SELECT
USING (
  gym_id IN (
    SELECT s.gym_id FROM staff s
    WHERE s.user_id = auth.uid()
  )
);

-- Fix members table RLS policies
DROP POLICY IF EXISTS "Gym owners can manage members" ON members;
DROP POLICY IF EXISTS "Members can view own record" ON members;

CREATE POLICY "Gym owners can manage members" ON members
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

CREATE POLICY "Members can view own record" ON members
FOR SELECT
USING (auth.uid() = user_id);

-- Staff can view members in their gym
CREATE POLICY "Staff can view gym members" ON members
FOR SELECT
USING (
  gym_id IN (
    SELECT s.gym_id FROM staff s
    WHERE s.user_id = auth.uid()
  )
);

-- Fix memberships table RLS policies
DROP POLICY IF EXISTS "Gym owners can manage memberships" ON memberships;
DROP POLICY IF EXISTS "Members can view own memberships" ON memberships;

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

-- Fix payments table RLS policies
DROP POLICY IF EXISTS "Gym owners can manage payments" ON payments;
DROP POLICY IF EXISTS "Members can view own payments" ON payments;

CREATE POLICY "Gym owners can manage payments" ON payments
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

CREATE POLICY "Members can view own payments" ON payments
FOR SELECT
USING (
  member_id IN (
    SELECT id FROM members WHERE user_id = auth.uid()
  )
);

-- Staff can view payments in their gym
CREATE POLICY "Staff can view gym payments" ON payments
FOR SELECT
USING (
  gym_id IN (
    SELECT s.gym_id FROM staff s
    WHERE s.user_id = auth.uid()
  )
);

-- Add a function to help with staff creation
CREATE OR REPLACE FUNCTION create_staff_profile(
  p_user_id UUID,
  p_first_name TEXT,
  p_last_name TEXT,
  p_phone TEXT
)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  -- Insert profile for staff member
  INSERT INTO profiles (user_id, first_name, last_name, phone)
  VALUES (p_user_id, p_first_name, p_last_name, p_phone)
  ON CONFLICT (user_id) DO UPDATE SET
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    phone = EXCLUDED.phone;
  
  result := json_build_object(
    'success', true,
    'message', 'Profile created successfully'
  );
  
  RETURN result;
EXCEPTION
  WHEN OTHERS THEN
    result := json_build_object(
      'success', false,
      'error', SQLERRM
    );
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_staff_profile TO authenticated;
