-- ============================================================================
-- MEMBER ATTENDANCE TABLE FOR GYM CHECK-IN/CHECK-OUT SYSTEM
-- ============================================================================

-- Create member attendance table for gym check-ins/check-outs
CREATE TABLE member_attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    gym_id UUID REFERENCES gyms(id) ON DELETE CASCADE,
    member_id UUID REFERENCES members(id) ON DELETE CASCADE,
    membership_id UUID REFERENCES memberships(id) ON DELETE CASCADE,
    
    -- Date and time tracking
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    check_in_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    check_out_time TIMESTAMP WITH TIME ZONE,
    
    -- Duration and status
    duration_minutes INTEGER GENERATED ALWAYS AS (
        CASE 
            WHEN check_out_time IS NOT NULL 
            THEN EXTRACT(EPOCH FROM (check_out_time - check_in_time)) / 60
            ELSE NULL 
        END
    ) STORED,
    
    -- Auto-checkout flag for forgotten checkouts
    auto_checkout BOOLEAN DEFAULT FALSE,
    
    -- Additional fields
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT check_checkout_after_checkin CHECK (
        check_out_time IS NULL OR check_out_time > check_in_time
    ),
    
    -- Unique constraint to prevent duplicate check-ins on same day
    UNIQUE(member_id, date)
);

-- Create indexes for better performance
CREATE INDEX idx_member_attendance_gym_id ON member_attendance(gym_id);
CREATE INDEX idx_member_attendance_member_id ON member_attendance(member_id);
CREATE INDEX idx_member_attendance_date ON member_attendance(date);
CREATE INDEX idx_member_attendance_check_in_time ON member_attendance(check_in_time);
CREATE INDEX idx_member_attendance_membership_id ON member_attendance(membership_id);
CREATE INDEX idx_member_attendance_auto_checkout ON member_attendance(auto_checkout);

-- Composite indexes for common queries
CREATE INDEX idx_member_attendance_gym_date ON member_attendance(gym_id, date);
CREATE INDEX idx_member_attendance_member_date ON member_attendance(member_id, date);
CREATE INDEX idx_member_attendance_pending_checkout ON member_attendance(gym_id, date) 
    WHERE check_out_time IS NULL;

-- RLS Policies for member_attendance
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

-- Public insert policy for the scan page (validates member belongs to gym)
CREATE POLICY "Public can insert valid member attendance" ON member_attendance
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM members m 
            WHERE m.id = member_id 
            AND m.gym_id = member_attendance.gym_id
            AND m.status = 'active'
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

-- Public update policy for check-out (validates member and existing check-in)
CREATE POLICY "Public can update member checkout" ON member_attendance
    FOR UPDATE USING (
        check_out_time IS NULL AND -- Can only update if not already checked out
        EXISTS (
            SELECT 1 FROM members m 
            WHERE m.id = member_id 
            AND m.gym_id = member_attendance.gym_id
            AND m.status = 'active'
        )
    );

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_member_attendance_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
CREATE TRIGGER update_member_attendance_updated_at 
    BEFORE UPDATE ON member_attendance 
    FOR EACH ROW 
    EXECUTE FUNCTION update_member_attendance_updated_at_column();

-- Create function for auto-checkout (can be called by cron job or manually)
CREATE OR REPLACE FUNCTION auto_checkout_members(target_gym_id UUID DEFAULT NULL)
RETURNS TABLE (
    gym_id UUID,
    affected_count INTEGER,
    checkout_time TIMESTAMP WITH TIME ZONE
) AS $$
DECLARE
    cutoff_time TIMESTAMP WITH TIME ZONE;
    checkout_timestamp TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Calculate cutoff time (yesterday 11:59 PM)
    cutoff_time := (CURRENT_DATE - INTERVAL '1 day')::timestamp + INTERVAL '23 hours 59 minutes';
    checkout_timestamp := cutoff_time;
    
    -- If target_gym_id is provided, only process that gym
    IF target_gym_id IS NOT NULL THEN
        -- Update attendance records for specific gym
        UPDATE member_attendance 
        SET 
            check_out_time = checkout_timestamp,
            auto_checkout = TRUE,
            updated_at = NOW()
        WHERE 
            member_attendance.gym_id = target_gym_id
            AND check_out_time IS NULL 
            AND check_in_time < cutoff_time;
            
        -- Return result for specific gym
        RETURN QUERY
        SELECT 
            target_gym_id,
            (SELECT COUNT(*)::INTEGER 
             FROM member_attendance 
             WHERE member_attendance.gym_id = target_gym_id 
             AND auto_checkout = TRUE 
             AND check_out_time = checkout_timestamp),
            checkout_timestamp;
    ELSE
        -- Process all gyms
        RETURN QUERY
        WITH updated_records AS (
            UPDATE member_attendance 
            SET 
                check_out_time = checkout_timestamp,
                auto_checkout = TRUE,
                updated_at = NOW()
            WHERE 
                check_out_time IS NULL 
                AND check_in_time < cutoff_time
            RETURNING member_attendance.gym_id
        ),
        gym_counts AS (
            SELECT 
                ur.gym_id,
                COUNT(*)::INTEGER as affected_count
            FROM updated_records ur
            GROUP BY ur.gym_id
        )
        SELECT 
            gc.gym_id,
            gc.affected_count,
            checkout_timestamp
        FROM gym_counts gc;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON member_attendance TO authenticated;
GRANT SELECT, INSERT, UPDATE ON member_attendance TO anon; -- For public scan page
GRANT EXECUTE ON FUNCTION auto_checkout_members TO authenticated;

-- Create a view for attendance statistics
CREATE OR REPLACE VIEW member_attendance_stats AS
SELECT 
    ma.gym_id,
    ma.date,
    COUNT(*) as total_visits,
    COUNT(*) FILTER (WHERE ma.check_out_time IS NULL) as currently_in_gym,
    COUNT(*) FILTER (WHERE ma.auto_checkout = TRUE) as auto_checkouts,
    AVG(ma.duration_minutes) as avg_duration_minutes,
    MIN(ma.check_in_time) as first_checkin,
    MAX(ma.check_in_time) as last_checkin,
    EXTRACT(HOUR FROM mode() WITHIN GROUP (ORDER BY EXTRACT(HOUR FROM ma.check_in_time))) as peak_hour
FROM member_attendance ma
GROUP BY ma.gym_id, ma.date;

-- Grant access to the view
GRANT SELECT ON member_attendance_stats TO authenticated;

-- Add helpful comments
COMMENT ON TABLE member_attendance IS 'Member gym check-in/check-out attendance tracking';
COMMENT ON COLUMN member_attendance.auto_checkout IS 'TRUE if member was automatically checked out (forgot to check out)';
COMMENT ON COLUMN member_attendance.duration_minutes IS 'Calculated field showing gym session duration in minutes';
COMMENT ON FUNCTION auto_checkout_members IS 'Function to automatically check out members who forgot to check out';
COMMENT ON VIEW member_attendance_stats IS 'Daily attendance statistics aggregated by gym';
