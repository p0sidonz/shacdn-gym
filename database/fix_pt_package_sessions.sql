-- ============================================================================
-- FIX PT PACKAGE SESSIONS
-- This script updates your PT package to include proper session count
-- ============================================================================

-- Update your PT package to include sessions
UPDATE membership_packages 
SET pt_sessions_included = 10  -- Change this to desired number of sessions
WHERE name = 'PT-TEST-30' 
AND package_type = 'personal_training';

-- Verify the update
SELECT 
    name,
    package_type,
    price,
    pt_sessions_included,
    trainer_required,
    is_active
FROM membership_packages 
WHERE package_type = 'personal_training';

-- If you have existing members with this package, update their memberships too
UPDATE memberships 
SET 
    pt_sessions_remaining = 10,  -- Set remaining sessions
    pt_sessions_used = 0
WHERE package_id = (
    SELECT id FROM membership_packages 
    WHERE name = 'PT-TEST-30' 
    AND package_type = 'personal_training'
    LIMIT 1
)
AND pt_sessions_remaining = 0;  -- Only update if currently 0

-- Show updated memberships
SELECT 
    m.id,
    mp.name as package_name,
    m.pt_sessions_remaining,
    m.pt_sessions_used,
    m.status
FROM memberships m
JOIN membership_packages mp ON m.package_id = mp.id
WHERE mp.package_type = 'personal_training';
