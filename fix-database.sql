-- Quick fix for CORS and RLS issues
-- Run this in your Supabase SQL Editor

-- Fix profiles table RLS policies
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- Create flexible policies
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

-- Add helper function for staff profile creation
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
  INSERT INTO profiles (user_id, first_name, last_name, phone)
  VALUES (p_user_id, p_first_name, p_last_name, p_phone)
  ON CONFLICT (user_id) DO UPDATE SET
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    phone = EXCLUDED.phone;
  
  result := json_build_object('success', true, 'message', 'Profile created successfully');
  RETURN result;
EXCEPTION
  WHEN OTHERS THEN
    result := json_build_object('success', false, 'error', SQLERRM);
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION create_staff_profile TO authenticated;
