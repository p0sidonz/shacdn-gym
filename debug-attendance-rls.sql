-- ============================================================================
-- DEBUG ATTENDANCE RLS POLICY ISSUE
-- ============================================================================

-- 1. Check if policies exist
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'member_attendance'
ORDER BY policyname;

-- 2. Check table permissions for anon
SELECT 
    grantee,
    privilege_type,
    is_grantable
FROM information_schema.role_table_grants 
WHERE table_name = 'member_attendance'
AND grantee = 'anon';

-- 3. Test the exact condition manually
SELECT 
    m.id as member_id,
    m.gym_id,
    m.status,
    'a36ae637-2768-4766-a799-478537412c08'::uuid as target_gym_id,
    '61e91c95-d774-4daa-a4e0-6e60c25845e4'::uuid as target_member_id,
    CASE 
        WHEN m.id = '61e91c95-d774-4daa-a4e0-6e60c25845e4'::uuid 
        AND m.gym_id = 'a36ae637-2768-4766-a799-478537412c08'::uuid
        AND m.status = 'active' 
        THEN 'POLICY CONDITION PASSES' 
        ELSE 'POLICY CONDITION FAILS' 
    END as policy_check
FROM members m 
WHERE m.id = '61e91c95-d774-4daa-a4e0-6e60c25845e4'::uuid;

-- 4. Temporarily disable RLS to test insert
ALTER TABLE member_attendance DISABLE ROW LEVEL SECURITY;

-- Test insert without RLS
INSERT INTO member_attendance (
    gym_id,
    member_id,
    membership_id,
    check_in_time,
    date
) VALUES (
    'a36ae637-2768-4766-a799-478537412c08'::uuid,  -- gym_id
    '61e91c95-d774-4daa-a4e0-6e60c25845e4'::uuid,  -- member_id
    '6b4c1b1f-4adb-4f5c-81b9-a8462d5159c7'::uuid,  -- membership_id (active PT membership)
    NOW(),
    CURRENT_DATE
) RETURNING id, gym_id, member_id, check_in_time;

-- Re-enable RLS
ALTER TABLE member_attendance ENABLE ROW LEVEL SECURITY;

-- 5. Check if the insert worked
SELECT COUNT(*) as attendance_records 
FROM member_attendance 
WHERE member_id = '61e91c95-d774-4daa-a4e0-6e60c25845e4'::uuid;

-- 6. If insert worked, delete it for clean test
DELETE FROM member_attendance 
WHERE member_id = '61e91c95-d774-4daa-a4e0-6e60c25845e4'::uuid;
