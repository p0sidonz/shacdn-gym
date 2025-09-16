-- Comprehensive RLS Policy Fix for Gym Management System
-- Run this in your Supabase SQL Editor

-- ============================================================================
-- 1. FIX PROFILES TABLE RLS
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can manage own profile" ON profiles;
DROP POLICY IF EXISTS "Gym owners can manage profiles" ON profiles;
DROP POLICY IF EXISTS "Staff can view member profiles" ON profiles;

-- Create new policies
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
  -- Allow if the current user is the gym owner (for creating new profiles)
  OR auth.uid() IN (
    SELECT owner_id FROM gyms
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

-- ============================================================================
-- 2. FIX MEMBERS TABLE RLS
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Gym owners can manage members" ON members;
DROP POLICY IF EXISTS "Members can view own record" ON members;
DROP POLICY IF EXISTS "Staff can view gym members" ON members;

-- Create new policies
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

-- ============================================================================
-- 3. FIX MEMBERSHIPS TABLE RLS
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Gym owners can manage memberships" ON memberships;
DROP POLICY IF EXISTS "Members can view own memberships" ON memberships;
DROP POLICY IF EXISTS "Staff can view gym memberships" ON memberships;

-- Create new policies
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

-- ============================================================================
-- 4. FIX MEMBERSHIP_PACKAGES TABLE RLS
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Gym owners can manage packages" ON membership_packages;
DROP POLICY IF EXISTS "Staff can view gym packages" ON membership_packages;

-- Create new policies
CREATE POLICY "Gym owners can manage packages" ON membership_packages
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

-- Staff can view packages in their gym
CREATE POLICY "Staff can view gym packages" ON membership_packages
FOR SELECT
USING (
  gym_id IN (
    SELECT s.gym_id FROM staff s
    WHERE s.user_id = auth.uid()
  )
);

-- ============================================================================
-- 5. GRANT PERMISSIONS
-- ============================================================================

-- Grant necessary permissions
GRANT ALL ON profiles TO authenticated;
GRANT ALL ON members TO authenticated;
GRANT ALL ON memberships TO authenticated;
GRANT ALL ON membership_packages TO authenticated;

-- ============================================================================
-- 6. CREATE HELPER FUNCTIONS
-- ============================================================================

-- Create or update profile function
CREATE OR REPLACE FUNCTION create_or_update_profile(
  p_user_id UUID,
  p_first_name TEXT,
  p_last_name TEXT,
  p_phone TEXT,
  p_date_of_birth DATE DEFAULT NULL,
  p_gender TEXT DEFAULT NULL,
  p_address TEXT DEFAULT NULL,
  p_city TEXT DEFAULT NULL,
  p_state TEXT DEFAULT NULL,
  p_postal_code TEXT DEFAULT NULL,
  p_emergency_contact_name TEXT DEFAULT NULL,
  p_emergency_contact_phone TEXT DEFAULT NULL,
  p_emergency_contact_relation TEXT DEFAULT NULL,
  p_blood_group TEXT DEFAULT NULL,
  p_medical_conditions TEXT[] DEFAULT NULL,
  p_medications TEXT[] DEFAULT NULL,
  p_fitness_goals TEXT[] DEFAULT NULL,
  p_preferences JSONB DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  result JSON;
  profile_id UUID;
BEGIN
  -- Insert or update profile
  INSERT INTO profiles (
    user_id, first_name, last_name, phone, date_of_birth, gender,
    address, city, state, postal_code, emergency_contact_name,
    emergency_contact_phone, emergency_contact_relation, blood_group,
    medical_conditions, medications, fitness_goals, preferences
  ) VALUES (
    p_user_id, p_first_name, p_last_name, p_phone, p_date_of_birth, p_gender,
    p_address, p_city, p_state, p_postal_code, p_emergency_contact_name,
    p_emergency_contact_phone, p_emergency_contact_relation, p_blood_group,
    p_medical_conditions, p_medications, p_fitness_goals, p_preferences
  )
  ON CONFLICT (user_id) DO UPDATE SET
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    phone = EXCLUDED.phone,
    date_of_birth = EXCLUDED.date_of_birth,
    gender = EXCLUDED.gender,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    postal_code = EXCLUDED.postal_code,
    emergency_contact_name = EXCLUDED.emergency_contact_name,
    emergency_contact_phone = EXCLUDED.emergency_contact_phone,
    emergency_contact_relation = EXCLUDED.emergency_contact_relation,
    blood_group = EXCLUDED.blood_group,
    medical_conditions = EXCLUDED.medical_conditions,
    medications = EXCLUDED.medications,
    fitness_goals = EXCLUDED.fitness_goals,
    preferences = EXCLUDED.preferences,
    updated_at = NOW()
  RETURNING id INTO profile_id;
  
  result := json_build_object(
    'success', true,
    'profile_id', profile_id,
    'message', 'Profile created/updated successfully'
  );
  
  RETURN result;
EXCEPTION
  WHEN OTHERS THEN
    result := json_build_object(
      'success', false,
      'error', SQLERRM,
      'message', 'Failed to create/update profile'
    );
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION create_or_update_profile TO authenticated;

-- Update the handle_new_user function to be more robust
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Only insert if profile doesn't exist
    INSERT INTO public.profiles (user_id, first_name, last_name, phone)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'phone', '')
    )
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ language 'plpgsql' security definer;
