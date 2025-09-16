-- ============================================================================
-- STEP 3: ADD RLS POLICIES
-- Run this AFTER the table and indexes are created successfully
-- ============================================================================

-- Enable RLS
ALTER TABLE member_attendance ENABLE ROW LEVEL SECURITY;

-- Gym owners can see all attendance in their gym
CREATE POLICY "Gym owners can view all member attendance" ON member_attendance
    FOR SELECT USING (
        gym_id IN (
            SELECT id FROM gyms WHERE owner_id = auth.uid()
        )
    );

-- Gym staff can see all attendance in their gym
CREATE POLICY "Gym staff can view member attendance" ON member_attendance
    FOR SELECT USING (
        gym_id IN (
            SELECT gym_id FROM staff WHERE profile_id IN (
                SELECT id FROM profiles WHERE user_id = auth.uid()
            )
        )
    );

-- Members can only see their own attendance
CREATE POLICY "Members can view own attendance" ON member_attendance
    FOR SELECT USING (
        member_id IN (
            SELECT id FROM members WHERE profile_id IN (
                SELECT id FROM profiles WHERE user_id = auth.uid()
            )
        )
    );

-- Gym owners can insert attendance for their gym
CREATE POLICY "Gym owners can insert member attendance" ON member_attendance
    FOR INSERT WITH CHECK (
        gym_id IN (
            SELECT id FROM gyms WHERE owner_id = auth.uid()
        )
    );

-- Gym staff can insert attendance for their gym
CREATE POLICY "Gym staff can insert member attendance" ON member_attendance
    FOR INSERT WITH CHECK (
        gym_id IN (
            SELECT gym_id FROM staff WHERE profile_id IN (
                SELECT id FROM profiles WHERE user_id = auth.uid()
            )
        )
    );

-- Gym owners can update attendance in their gym
CREATE POLICY "Gym owners can update member attendance" ON member_attendance
    FOR UPDATE USING (
        gym_id IN (
            SELECT id FROM gyms WHERE owner_id = auth.uid()
        )
    );

-- Gym staff can update attendance in their gym
CREATE POLICY "Gym staff can update member attendance" ON member_attendance
    FOR UPDATE USING (
        gym_id IN (
            SELECT gym_id FROM staff WHERE profile_id IN (
                SELECT id FROM profiles WHERE user_id = auth.uid()
            )
        )
    );

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON member_attendance TO authenticated;
GRANT SELECT, INSERT, UPDATE ON member_attendance TO anon;
