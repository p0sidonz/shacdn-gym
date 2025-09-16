-- Create the create_staff_profile function
-- Run this in your Supabase SQL Editor

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
