-- Clean up all the complicated staff-related tables and functions
-- Reset to simple approach

-- Drop only the staff invitation/linking tables (keep role_permissions)
DROP TABLE IF EXISTS staff_invitations CASCADE;
DROP TABLE IF EXISTS staff_profiles CASCADE;

-- Drop all the functions we created
DROP FUNCTION IF EXISTS manual_link_staff_account(TEXT, UUID);
DROP FUNCTION IF EXISTS link_staff_signup();

-- Drop any triggers
DROP TRIGGER IF EXISTS on_staff_user_signup ON auth.users;

-- Reset staff table to simple approach - make user_id required again
ALTER TABLE staff DROP CONSTRAINT IF EXISTS staff_user_id_fkey;
ALTER TABLE staff ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE staff ADD CONSTRAINT staff_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Clean up any orphaned staff records that might have NULL user_id
DELETE FROM staff WHERE user_id IS NULL;
