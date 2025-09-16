-- ============================================================================
-- FIX MEMBERS-PROFILES RELATIONSHIP
-- Update existing members to link with their profiles
-- ============================================================================

-- Check if profile_id column exists, if not add it
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'members' AND column_name = 'profile_id'
    ) THEN
        ALTER TABLE members 
        ADD COLUMN profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Create index for better performance (if not exists)
CREATE INDEX IF NOT EXISTS idx_members_profile_id ON members(profile_id);

-- Update existing members to link with their profiles
-- This will link members with profiles based on user_id
UPDATE members 
SET profile_id = profiles.id
FROM profiles 
WHERE members.user_id = profiles.user_id 
AND members.profile_id IS NULL;

-- Make profile_id NOT NULL after updating existing records
ALTER TABLE members 
ALTER COLUMN profile_id SET NOT NULL;

-- Add unique constraint to ensure one profile per member (if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'members' AND constraint_name = 'unique_member_profile'
    ) THEN
        ALTER TABLE members 
        ADD CONSTRAINT unique_member_profile UNIQUE(profile_id);
    END IF;
END $$;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check if all members now have profile_id
SELECT 
    COUNT(*) as total_members,
    COUNT(profile_id) as members_with_profile,
    COUNT(*) - COUNT(profile_id) as members_without_profile
FROM members;

-- Check the relationship
SELECT 
    m.id as member_id,
    m.member_id as member_number,
    p.first_name,
    p.last_name,
    p.phone
FROM members m
JOIN profiles p ON m.profile_id = p.id
LIMIT 5;
