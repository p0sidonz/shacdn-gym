-- Fix Staff Profile Relationship
-- Add profile_id column to staff table and create proper foreign key relationship

-- Add profile_id column to staff table
ALTER TABLE staff ADD COLUMN IF NOT EXISTS profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE;

-- Update existing staff records to link with profiles
-- This assumes that staff.user_id matches profiles.user_id
UPDATE staff 
SET profile_id = profiles.id 
FROM profiles 
WHERE staff.user_id = profiles.user_id;

-- Make profile_id NOT NULL after populating it
ALTER TABLE staff ALTER COLUMN profile_id SET NOT NULL;

-- Add unique constraint
ALTER TABLE staff ADD CONSTRAINT unique_staff_profile UNIQUE(profile_id);

-- Update RLS policies to include the new relationship
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Staff can view own data" ON staff;
DROP POLICY IF EXISTS "Gym staff can view gym staff" ON staff;
DROP POLICY IF EXISTS "Gym staff can manage gym staff" ON staff;

-- Create new policies with proper relationships
CREATE POLICY "Staff can view own data" ON staff FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Gym staff can view gym staff" ON staff FOR SELECT USING (
  gym_id IN (
    SELECT gym_id FROM staff WHERE user_id = auth.uid()
  )
);
CREATE POLICY "Gym staff can manage gym staff" ON staff FOR ALL USING (
  gym_id IN (
    SELECT gym_id FROM staff WHERE user_id = auth.uid()
  )
);

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_staff_profile_id ON staff(profile_id);
CREATE INDEX IF NOT EXISTS idx_staff_gym_id ON staff(gym_id);
