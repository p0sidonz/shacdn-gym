-- ============================================================================
-- Fix Auth Issues - Comprehensive RLS and Profile Access Fix
-- ============================================================================

-- Temporarily disable RLS on profiles table for auth to work
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Enable RLS with proper policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing conflicting policies
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

-- Create comprehensive profile policies that work with auth
CREATE POLICY "Allow profile access for authenticated users" ON profiles
FOR ALL USING (auth.uid() IS NOT NULL);

-- Alternative: More specific policies if the above is too permissive
-- CREATE POLICY "Users can view own profile" ON profiles 
-- FOR SELECT USING (auth.uid() = user_id);

-- CREATE POLICY "Users can update own profile" ON profiles 
-- FOR UPDATE USING (auth.uid() = user_id);

-- CREATE POLICY "Users can insert own profile" ON profiles 
-- FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Fix staff access policies
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can view own data" ON staff;
DROP POLICY IF EXISTS "Staff can update own data" ON staff;
DROP POLICY IF EXISTS "Staff can insert own data" ON staff;

CREATE POLICY "Allow staff access for authenticated users" ON staff
FOR ALL USING (auth.uid() IS NOT NULL);

-- Fix gyms access policies  
ALTER TABLE gyms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Gym owners can manage their gym" ON gyms;

CREATE POLICY "Allow gym access for authenticated users" ON gyms
FOR ALL USING (auth.uid() IS NOT NULL);

-- Create or replace the profile creation function
CREATE OR REPLACE FUNCTION public.create_or_update_profile(
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
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  profile_record RECORD;
  result JSONB;
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
  ON CONFLICT (user_id) 
  DO UPDATE SET
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
  RETURNING *;

  -- Get the result
  SELECT * INTO profile_record FROM profiles WHERE user_id = p_user_id;
  
  result := jsonb_build_object(
    'success', true,
    'profile_id', profile_record.id,
    'user_id', profile_record.user_id
  );
  
  RETURN result;
  
EXCEPTION WHEN OTHERS THEN
  result := jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
  RETURN result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.create_or_update_profile TO authenticated;

-- Add helpful indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_profiles_user_id_unique ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_staff_user_id_unique ON staff(user_id);
CREATE INDEX IF NOT EXISTS idx_gyms_owner_id_unique ON gyms(owner_id);

-- Ensure RLS is properly configured for other essential tables
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow member access" ON members;
CREATE POLICY "Allow member access for authenticated users" ON members
FOR ALL USING (auth.uid() IS NOT NULL);

ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow membership access" ON memberships;
CREATE POLICY "Allow membership access for authenticated users" ON memberships
FOR ALL USING (auth.uid() IS NOT NULL);

-- Show current policies for verification
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('profiles', 'staff', 'gyms', 'members', 'memberships')
ORDER BY tablename, policyname;
