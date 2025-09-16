-- Fix RLS policies for member profile creation
-- This allows gym owners to create profiles for new members

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can manage own profile" ON profiles;
DROP POLICY IF EXISTS "Gym owners can manage profiles" ON profiles;
DROP POLICY IF EXISTS "Staff can view member profiles" ON profiles;

-- Create new policies that allow gym owners to create profiles for members
CREATE POLICY "Users can manage own profile" ON profiles
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Gym owners can manage profiles for their staff and members
CREATE POLICY "Gym owners can manage profiles" ON profiles
FOR ALL
USING (
  -- Allow if user is the gym owner
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
  -- Allow if the current user is the gym owner (for creating new profiles)
  OR auth.uid() IN (
    SELECT owner_id FROM gyms
  )
)
WITH CHECK (
  -- Allow if user is the gym owner
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
  -- Allow if the current user is the gym owner (for creating new profiles)
  OR auth.uid() IN (
    SELECT owner_id FROM gyms
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
  OR
  -- Allow gym owners to view all profiles
  auth.uid() IN (
    SELECT owner_id FROM gyms
  )
);

-- Also fix members table RLS to allow gym owners to create members
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
USING (user_id = auth.uid());

-- Staff can view members in their gym
CREATE POLICY "Staff can view gym members" ON members
FOR SELECT
USING (
  gym_id IN (
    SELECT s.gym_id FROM staff s
    WHERE s.user_id = auth.uid()
  )
);

-- Grant necessary permissions
GRANT ALL ON profiles TO authenticated;
GRANT ALL ON members TO authenticated;
