-- Fix profile creation to handle existing profiles
-- This creates a function that safely creates or updates profiles

-- Create a function to safely create/update profiles
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

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_or_update_profile TO authenticated;

-- Also update the handle_new_user function to be more robust
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
