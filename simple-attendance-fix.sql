-- ============================================================================
-- SIMPLE ATTENDANCE RLS FIX - ALLOW ALL PUBLIC ACCESS
-- ============================================================================

-- Drop all existing policies for clean slate
DROP POLICY IF EXISTS "Public can insert valid member attendance" ON member_attendance;
DROP POLICY IF EXISTS "Public can update member checkout" ON member_attendance;

-- Create simple public policies that allow all operations
CREATE POLICY "Allow anon insert attendance" ON member_attendance
FOR INSERT 
TO anon, authenticated
WITH CHECK (true); -- Allow all inserts for now

CREATE POLICY "Allow anon update attendance" ON member_attendance
FOR UPDATE 
TO anon, authenticated
USING (true); -- Allow all updates for now

CREATE POLICY "Allow anon select attendance" ON member_attendance
FOR SELECT 
TO anon, authenticated
USING (true); -- Allow all selects for now

-- Grant all permissions to anon
GRANT ALL ON member_attendance TO anon;

-- Test insert
INSERT INTO member_attendance (
    gym_id,
    member_id,
    membership_id,
    check_in_time,
    date,
    auto_checkout
) VALUES (
    'a36ae637-2768-4766-a799-478537412c08'::uuid,
    '61e91c95-d774-4daa-a4e0-6e60c25845e4'::uuid,
    '6b4c1b1f-4adb-4f5c-81b9-a8462d5159c7'::uuid,
    NOW(),
    CURRENT_DATE,
    false
) RETURNING id, check_in_time;
