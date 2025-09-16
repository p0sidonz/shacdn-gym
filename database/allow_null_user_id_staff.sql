-- Allow NULL user_id in staff table for pending accounts
-- This enables creating staff records before the user account exists

-- First, drop the foreign key constraint
ALTER TABLE staff DROP CONSTRAINT staff_user_id_fkey;

-- Modify the column to allow NULL
ALTER TABLE staff ALTER COLUMN user_id DROP NOT NULL;

-- Add the foreign key constraint back, but allow NULL values
ALTER TABLE staff ADD CONSTRAINT staff_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create a simple staff_profiles table to store staff info before they sign up
CREATE TABLE IF NOT EXISTS staff_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  staff_id UUID REFERENCES staff(id) ON DELETE CASCADE,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  email VARCHAR(100) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(staff_id)
);

-- Add RLS for staff_profiles
ALTER TABLE staff_profiles ENABLE ROW LEVEL SECURITY;

-- RLS policy for staff_profiles
DROP POLICY IF EXISTS "Gym owners can manage staff profiles" ON staff_profiles;
CREATE POLICY "Gym owners can manage staff profiles" ON staff_profiles
FOR ALL
USING (
  staff_id IN (
    SELECT s.id FROM staff s
    JOIN gyms g ON g.id = s.gym_id  
    WHERE g.owner_id = auth.uid()
  )
)
WITH CHECK (
  staff_id IN (
    SELECT s.id FROM staff s
    JOIN gyms g ON g.id = s.gym_id
    WHERE g.owner_id = auth.uid()
  )
);

-- Update the staff linking trigger to handle NULL user_id
CREATE OR REPLACE FUNCTION link_staff_signup()
RETURNS TRIGGER AS $$
DECLARE
    staff_record RECORD;
    invitation_record RECORD;
BEGIN
    -- Check if there's a staff record with this email that needs linking
    SELECT s.*, si.id as invitation_id INTO staff_record
    FROM staff s
    INNER JOIN staff_invitations si ON si.staff_id = s.id
    WHERE si.email = NEW.email
    AND si.used_at IS NULL
    AND si.expires_at > NOW()
    AND s.user_id IS NULL; -- Look for records with NULL user_id

    -- If found, link the signup
    IF FOUND THEN
        -- Update staff record with real user_id and activate
        UPDATE staff 
        SET user_id = NEW.id, status = 'active', updated_at = NOW()
        WHERE id = staff_record.id;

        -- Mark invitation as used
        UPDATE staff_invitations
        SET used_at = NOW(), used_by = NEW.id
        WHERE id = staff_record.invitation_id;

        -- Update the main profiles table with staff info
        INSERT INTO profiles (user_id, first_name, last_name, phone)
        SELECT NEW.id, sp.first_name, sp.last_name, sp.phone
        FROM staff_profiles sp
        WHERE sp.staff_id = staff_record.id
        ON CONFLICT (user_id) DO UPDATE SET
          first_name = EXCLUDED.first_name,
          last_name = EXCLUDED.last_name,
          phone = EXCLUDED.phone;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
