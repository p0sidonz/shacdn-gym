-- ============================================================================
-- FIX MEMBER ATTENDANCE RLS FOR PUBLIC ACCESS
-- ============================================================================

-- Drop existing public policy if it exists and recreate it
DROP POLICY IF EXISTS "Public can insert valid member attendance" ON member_attendance;
DROP POLICY IF EXISTS "Public can update member checkout" ON member_attendance;

-- Create public insert policy for attendance check-in
CREATE POLICY "Public can insert valid member attendance" ON member_attendance
FOR INSERT 
TO anon, authenticated
WITH CHECK (
    -- Validate member exists, is active, and belongs to the gym
    EXISTS (
        SELECT 1 FROM members m 
        WHERE m.id = member_attendance.member_id 
        AND m.gym_id = member_attendance.gym_id
        AND m.status = 'active'
    )
);

-- Create public update policy for attendance check-out
CREATE POLICY "Public can update member checkout" ON member_attendance
FOR UPDATE 
TO anon, authenticated
USING (
    -- Can only update if not already checked out and member is valid
    check_out_time IS NULL 
    AND EXISTS (
        SELECT 1 FROM members m 
        WHERE m.id = member_attendance.member_id 
        AND m.gym_id = member_attendance.gym_id
        AND m.status = 'active'
    )
);

-- Ensure anon has proper permissions
GRANT SELECT, INSERT, UPDATE ON member_attendance TO anon;

-- Test the policy with a sample insert (replace with actual values)
-- This should succeed if the policy is working
/*
INSERT INTO member_attendance (
    gym_id,
    member_id,
    membership_id,
    check_in_time,
    date
) VALUES (
    'a36ae637-2768-4766-a799-478537412c08',  -- gym_id
    '61e91c95-d774-4daa-a4e0-6e60c25845e4',  -- member_id
    '6b4c1b1f-4adb-4f5c-81b9-a8462d5159c7',  -- membership_id (active PT membership)
    NOW(),
    CURRENT_DATE
);
*/

-- Verify policies exist
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies 
WHERE tablename = 'member_attendance'
AND (policyname LIKE '%public%' OR policyname LIKE '%Public%')
ORDER BY policyname;
