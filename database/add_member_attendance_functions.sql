-- ============================================================================
-- STEP 4: ADD FUNCTIONS AND TRIGGERS
-- Run this AFTER the table, indexes, and RLS policies are created successfully
-- ============================================================================

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

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION auto_checkout_members TO authenticated;

-- Create a view for attendance statistics
CREATE OR REPLACE VIEW member_attendance_stats AS
SELECT 
    ma.gym_id,
    ma.date,
    COUNT(*) as total_visits,
    COUNT(*) FILTER (WHERE ma.check_out_time IS NULL) as currently_in_gym,
    COUNT(*) FILTER (WHERE ma.auto_checkout = TRUE) as auto_checkouts,
    AVG(EXTRACT(EPOCH FROM (ma.check_out_time - ma.check_in_time)) / 60) as avg_duration_minutes,
    MIN(ma.check_in_time) as first_checkin,
    MAX(ma.check_in_time) as last_checkin
FROM member_attendance ma
WHERE ma.check_out_time IS NOT NULL  -- Only include completed sessions for duration calculation
GROUP BY ma.gym_id, ma.date;

-- Grant access to the view
GRANT SELECT ON member_attendance_stats TO authenticated;

-- Add helpful comments
COMMENT ON TABLE member_attendance IS 'Member gym check-in/check-out attendance tracking';
COMMENT ON COLUMN member_attendance.auto_checkout IS 'TRUE if member was automatically checked out (forgot to check out)';
COMMENT ON FUNCTION auto_checkout_members IS 'Function to automatically check out members who forgot to check out';
COMMENT ON VIEW member_attendance_stats IS 'Daily attendance statistics aggregated by gym';
