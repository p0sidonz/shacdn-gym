-- ============================================================================
-- STEP 5: TEST THE MEMBER ATTENDANCE TABLE
-- Run this to verify everything is working correctly
-- ============================================================================

-- Test 1: Check if table exists and structure is correct
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'member_attendance' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Test 2: Check if indexes were created
SELECT 
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'member_attendance'
ORDER BY indexname;

-- Test 3: Check if RLS is enabled
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename = 'member_attendance';

-- Test 4: Check if policies exist
SELECT 
    policyname,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'member_attendance';

-- Test 5: Check if functions exist
SELECT 
    routine_name,
    routine_type
FROM information_schema.routines 
WHERE routine_name LIKE '%member_attendance%' 
OR routine_name = 'auto_checkout_members'
ORDER BY routine_name;

-- Test 6: Check if view exists
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_name = 'member_attendance_stats';

-- Test 7: Try a basic insert (this will fail if no members exist, but will test table structure)
-- Uncomment the next lines if you want to test with actual data:

/*
-- This is just a structure test - replace with real gym_id and member_id
INSERT INTO member_attendance (
    gym_id, 
    member_id, 
    date, 
    check_in_time,
    auto_checkout
) VALUES (
    'your-gym-id-here'::UUID,     -- Replace with actual gym ID
    'your-member-id-here'::UUID,  -- Replace with actual member ID
    CURRENT_DATE,
    NOW(),
    FALSE
);
*/

-- Success message
SELECT 'member_attendance table setup completed successfully!' as status;
