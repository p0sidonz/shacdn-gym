-- ============================================================================
-- CHECK MEMBERS-PROFILES RELATIONSHIP STATUS
-- ============================================================================

-- Check if profile_id column exists in members table
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'members' 
AND column_name = 'profile_id';

-- Check current members and their profile relationships
SELECT 
    m.id as member_id,
    m.member_id as member_number,
    m.user_id,
    m.profile_id,
    p.first_name,
    p.last_name,
    p.phone
FROM members m
LEFT JOIN profiles p ON m.profile_id = p.id
LIMIT 10;

-- Check if there are any members without profile_id
SELECT 
    COUNT(*) as total_members,
    COUNT(profile_id) as members_with_profile_id,
    COUNT(*) - COUNT(profile_id) as members_without_profile_id
FROM members;

-- Check if there are any members without profiles
SELECT 
    COUNT(*) as members_without_profiles
FROM members m
LEFT JOIN profiles p ON m.profile_id = p.id
WHERE p.id IS NULL;
