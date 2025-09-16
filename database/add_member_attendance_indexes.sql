-- ============================================================================
-- STEP 2: ADD INDEXES FOR PERFORMANCE
-- Run this AFTER the table is created successfully
-- ============================================================================

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
