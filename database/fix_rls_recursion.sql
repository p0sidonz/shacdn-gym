-- Fix RLS Infinite Recursion Issue
-- The problem is circular dependency in RLS policies

-- Drop all existing staff policies to break the recursion
DROP POLICY IF EXISTS "Staff can view own data" ON staff;
DROP POLICY IF EXISTS "Gym staff can view gym staff" ON staff;
DROP POLICY IF EXISTS "Gym staff can manage gym staff" ON staff;

-- Create simple, non-recursive policies
-- Policy 1: Staff can view their own data
CREATE POLICY "Staff can view own data" ON staff FOR SELECT USING (auth.uid() = user_id);

-- Policy 2: Gym owners can view all staff in their gym
CREATE POLICY "Gym owners can view gym staff" ON staff FOR SELECT USING (
  gym_id IN (
    SELECT id FROM gyms WHERE owner_id = auth.uid()
  )
);

-- Policy 3: Gym owners can manage all staff in their gym
CREATE POLICY "Gym owners can manage gym staff" ON staff FOR ALL USING (
  gym_id IN (
    SELECT id FROM gyms WHERE owner_id = auth.uid()
  )
);

-- Policy 4: Staff can view other staff in the same gym (non-recursive)
CREATE POLICY "Staff can view same gym staff" ON staff FOR SELECT USING (
  gym_id = (
    SELECT gym_id FROM staff WHERE user_id = auth.uid() LIMIT 1
  )
);

-- Policy 5: Staff can update their own data
CREATE POLICY "Staff can update own data" ON staff FOR UPDATE USING (auth.uid() = user_id);

-- Policy 6: Staff can insert their own data
CREATE POLICY "Staff can insert own data" ON staff FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Drop and recreate follow-ups policies to avoid recursion
DROP POLICY IF EXISTS "Gym staff can view follow-ups" ON follow_ups;
DROP POLICY IF EXISTS "Gym staff can manage follow-ups" ON follow_ups;

CREATE POLICY "Gym staff can view follow-ups" ON follow_ups FOR SELECT USING (
  gym_id IN (
    SELECT id FROM gyms WHERE owner_id = auth.uid()
  ) OR
  gym_id = (
    SELECT gym_id FROM staff WHERE user_id = auth.uid() LIMIT 1
  )
);

CREATE POLICY "Gym staff can manage follow-ups" ON follow_ups FOR ALL USING (
  gym_id IN (
    SELECT id FROM gyms WHERE owner_id = auth.uid()
  ) OR
  gym_id = (
    SELECT gym_id FROM staff WHERE user_id = auth.uid() LIMIT 1
  )
);

-- Drop and recreate training sessions policies
DROP POLICY IF EXISTS "Gym staff can view training sessions" ON training_sessions;
DROP POLICY IF EXISTS "Gym staff can manage training sessions" ON training_sessions;

CREATE POLICY "Gym staff can view training sessions" ON training_sessions FOR SELECT USING (
  member_id IN (
    SELECT m.id FROM members m 
    WHERE m.gym_id IN (
      SELECT id FROM gyms WHERE owner_id = auth.uid()
    ) OR m.gym_id = (
      SELECT gym_id FROM staff WHERE user_id = auth.uid() LIMIT 1
    )
  )
);

CREATE POLICY "Gym staff can manage training sessions" ON training_sessions FOR ALL USING (
  member_id IN (
    SELECT m.id FROM members m 
    WHERE m.gym_id IN (
      SELECT id FROM gyms WHERE owner_id = auth.uid()
    ) OR m.gym_id = (
      SELECT gym_id FROM staff WHERE user_id = auth.uid() LIMIT 1
    )
  )
);
