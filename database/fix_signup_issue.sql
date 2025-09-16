-- Fix the signup issue by removing the problematic trigger
-- The trigger is interfering with normal user signups

-- Drop the problematic trigger that's causing signup failures
DROP TRIGGER IF EXISTS on_staff_user_signup ON auth.users;

-- Drop the function too since it's causing issues
DROP FUNCTION IF EXISTS link_staff_signup();

-- We'll handle staff linking manually through the app instead of triggers
-- This ensures normal signups work perfectly

-- Optional: Add a simple function to manually link staff when they sign up
-- This can be called from the frontend when needed
CREATE OR REPLACE FUNCTION manual_link_staff_account(
  p_email TEXT,
  p_user_id UUID
)
RETURNS JSON AS $$
DECLARE
  staff_record RECORD;
  result JSON;
BEGIN
  -- Find staff record waiting for this email
  SELECT s.*, si.id as invitation_id INTO staff_record
  FROM staff s
  INNER JOIN staff_invitations si ON si.staff_id = s.id
  WHERE si.email = p_email
  AND si.used_at IS NULL
  AND si.expires_at > NOW()
  AND s.user_id IS NULL;

  IF FOUND THEN
    -- Update staff record with real user_id and activate
    UPDATE staff 
    SET user_id = p_user_id, status = 'active', updated_at = NOW()
    WHERE id = staff_record.id;

    -- Mark invitation as used
    UPDATE staff_invitations
    SET used_at = NOW(), used_by = p_user_id
    WHERE id = staff_record.invitation_id;

    -- Copy staff info to main profiles table
    INSERT INTO profiles (user_id, first_name, last_name, phone)
    SELECT p_user_id, sp.first_name, sp.last_name, sp.phone
    FROM staff_profiles sp
    WHERE sp.staff_id = staff_record.id
    ON CONFLICT (user_id) DO UPDATE SET
      first_name = EXCLUDED.first_name,
      last_name = EXCLUDED.last_name,
      phone = EXCLUDED.phone;

    result := json_build_object(
      'success', true,
      'message', 'Staff account linked successfully',
      'staff_id', staff_record.id,
      'role', staff_record.role
    );
  ELSE
    result := json_build_object(
      'success', false,
      'message', 'No pending staff record found for this email'
    );
  END IF;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
