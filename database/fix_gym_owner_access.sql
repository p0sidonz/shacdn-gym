-- Fix Gym Owner Access Issues
-- Ensure gym owners can access all data in their gym

-- First, let's disable RLS temporarily to fix policies
ALTER TABLE staff DISABLE ROW LEVEL SECURITY;
ALTER TABLE follow_ups DISABLE ROW LEVEL SECURITY;
ALTER TABLE training_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE members DISABLE ROW LEVEL SECURITY;
ALTER TABLE memberships DISABLE ROW LEVEL SECURITY;
ALTER TABLE payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE refund_requests DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "Staff can view own data" ON staff;
DROP POLICY IF EXISTS "Gym owners can view gym staff" ON staff;
DROP POLICY IF EXISTS "Gym owners can manage gym staff" ON staff;
DROP POLICY IF EXISTS "Staff can view same gym staff" ON staff;
DROP POLICY IF EXISTS "Staff can update own data" ON staff;
DROP POLICY IF EXISTS "Staff can insert own data" ON staff;
DROP POLICY IF EXISTS "Gym staff can view follow-ups" ON follow_ups;
DROP POLICY IF EXISTS "Gym staff can manage follow-ups" ON follow_ups;
DROP POLICY IF EXISTS "Gym staff can view training sessions" ON training_sessions;
DROP POLICY IF EXISTS "Gym staff can manage training sessions" ON training_sessions;

-- Re-enable RLS
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE follow_ups ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE refund_requests ENABLE ROW LEVEL SECURITY;

-- Create comprehensive policies for gym owners
-- Staff policies
CREATE POLICY "Gym owners full access to staff" ON staff FOR ALL USING (
  gym_id IN (SELECT id FROM gyms WHERE owner_id = auth.uid())
);

-- Members policies
CREATE POLICY "Gym owners full access to members" ON members FOR ALL USING (
  gym_id IN (SELECT id FROM gyms WHERE owner_id = auth.uid())
);

-- Memberships policies
CREATE POLICY "Gym owners full access to memberships" ON memberships FOR ALL USING (
  member_id IN (
    SELECT id FROM members WHERE gym_id IN (
      SELECT id FROM gyms WHERE owner_id = auth.uid()
    )
  )
);

-- Payments policies
CREATE POLICY "Gym owners full access to payments" ON payments FOR ALL USING (
  gym_id IN (SELECT id FROM gyms WHERE owner_id = auth.uid())
);

-- Refund requests policies
CREATE POLICY "Gym owners full access to refunds" ON refund_requests FOR ALL USING (
  gym_id IN (SELECT id FROM gyms WHERE owner_id = auth.uid())
);

-- Follow-ups policies
CREATE POLICY "Gym owners full access to follow-ups" ON follow_ups FOR ALL USING (
  gym_id IN (SELECT id FROM gyms WHERE owner_id = auth.uid())
);

-- Training sessions policies
CREATE POLICY "Gym owners full access to training sessions" ON training_sessions FOR ALL USING (
  member_id IN (
    SELECT id FROM members WHERE gym_id IN (
      SELECT id FROM gyms WHERE owner_id = auth.uid()
    )
  )
);

-- Staff can view their own data
CREATE POLICY "Staff can view own data" ON staff FOR SELECT USING (auth.uid() = user_id);

-- Staff can view members in their gym
CREATE POLICY "Staff can view gym members" ON members FOR SELECT USING (
  gym_id = (SELECT gym_id FROM staff WHERE user_id = auth.uid() LIMIT 1)
);

-- Staff can view memberships for their gym members
CREATE POLICY "Staff can view gym memberships" ON memberships FOR SELECT USING (
  member_id IN (
    SELECT id FROM members WHERE gym_id = (
      SELECT gym_id FROM staff WHERE user_id = auth.uid() LIMIT 1
    )
  )
);

-- Staff can view payments for their gym
CREATE POLICY "Staff can view gym payments" ON payments FOR SELECT USING (
  gym_id = (SELECT gym_id FROM staff WHERE user_id = auth.uid() LIMIT 1)
);

-- Staff can view follow-ups for their gym
CREATE POLICY "Staff can view gym follow-ups" ON follow_ups FOR SELECT USING (
  gym_id = (SELECT gym_id FROM staff WHERE user_id = auth.uid() LIMIT 1)
);

-- Staff can view training sessions for their gym
CREATE POLICY "Staff can view gym training sessions" ON training_sessions FOR SELECT USING (
  member_id IN (
    SELECT id FROM members WHERE gym_id = (
      SELECT gym_id FROM staff WHERE user_id = auth.uid() LIMIT 1
    )
  )
);

-- Staff can manage follow-ups for their gym
CREATE POLICY "Staff can manage gym follow-ups" ON follow_ups FOR ALL USING (
  gym_id = (SELECT gym_id FROM staff WHERE user_id = auth.uid() LIMIT 1)
);

-- Staff can manage training sessions for their gym
CREATE POLICY "Staff can manage gym training sessions" ON training_sessions FOR ALL USING (
  member_id IN (
    SELECT id FROM members WHERE gym_id = (
      SELECT gym_id FROM staff WHERE user_id = auth.uid() LIMIT 1
    )
  )
);
