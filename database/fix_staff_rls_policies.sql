-- Fix Staff RLS Policies
-- Add missing RLS policies for staff table

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Gym owners can manage staff" ON staff;
DROP POLICY IF EXISTS "Staff can view own record" ON staff;

-- Gym owners can manage all staff in their gyms
CREATE POLICY "Gym owners can manage staff" ON staff
FOR ALL
USING (
  gym_id IN (
    SELECT id FROM gyms WHERE owner_id = auth.uid()
  )
)
WITH CHECK (
  gym_id IN (
    SELECT id FROM gyms WHERE owner_id = auth.uid()
  )
);

-- Staff members can view their own records
CREATE POLICY "Staff can view own record" ON staff
FOR SELECT
USING (auth.uid() = user_id);

-- Add missing RLS policies for other tables that might be affected

-- Members table
DROP POLICY IF EXISTS "Gym owners can manage members" ON members;
DROP POLICY IF EXISTS "Members can view own record" ON members;

CREATE POLICY "Gym owners can manage members" ON members
FOR ALL
USING (
  gym_id IN (
    SELECT id FROM gyms WHERE owner_id = auth.uid()
  )
)
WITH CHECK (
  gym_id IN (
    SELECT id FROM gyms WHERE owner_id = auth.uid()
  )
);

CREATE POLICY "Members can view own record" ON members
FOR SELECT
USING (auth.uid() = user_id);

-- Membership packages
DROP POLICY IF EXISTS "Gym owners can manage packages" ON membership_packages;
DROP POLICY IF EXISTS "Users can view packages" ON membership_packages;

CREATE POLICY "Gym owners can manage packages" ON membership_packages
FOR ALL
USING (
  gym_id IN (
    SELECT id FROM gyms WHERE owner_id = auth.uid()
  )
)
WITH CHECK (
  gym_id IN (
    SELECT id FROM gyms WHERE owner_id = auth.uid()
  )
);

CREATE POLICY "Users can view packages" ON membership_packages
FOR SELECT
USING (
  gym_id IN (
    SELECT g.id FROM gyms g
    LEFT JOIN staff s ON s.gym_id = g.id
    LEFT JOIN members m ON m.gym_id = g.id
    WHERE g.owner_id = auth.uid() 
    OR s.user_id = auth.uid() 
    OR m.user_id = auth.uid()
  )
);

-- Payments
DROP POLICY IF EXISTS "Gym owners can manage payments" ON payments;
DROP POLICY IF EXISTS "Members can view own payments" ON payments;

CREATE POLICY "Gym owners can manage payments" ON payments
FOR ALL
USING (
  gym_id IN (
    SELECT id FROM gyms WHERE owner_id = auth.uid()
  )
)
WITH CHECK (
  gym_id IN (
    SELECT id FROM gyms WHERE owner_id = auth.uid()
  )
);

CREATE POLICY "Members can view own payments" ON payments
FOR SELECT
USING (
  member_id IN (
    SELECT id FROM members WHERE user_id = auth.uid()
  )
);

-- Memberships
DROP POLICY IF EXISTS "Gym owners can manage memberships" ON memberships;
DROP POLICY IF EXISTS "Members can view own memberships" ON memberships;

CREATE POLICY "Gym owners can manage memberships" ON memberships
FOR ALL
USING (
  member_id IN (
    SELECT m.id FROM members m
    JOIN gyms g ON g.id = m.gym_id
    WHERE g.owner_id = auth.uid()
  )
)
WITH CHECK (
  member_id IN (
    SELECT m.id FROM members m
    JOIN gyms g ON g.id = m.gym_id
    WHERE g.owner_id = auth.uid()
  )
);

CREATE POLICY "Members can view own memberships" ON memberships
FOR SELECT
USING (
  member_id IN (
    SELECT id FROM members WHERE user_id = auth.uid()
  )
);

-- Training sessions
DROP POLICY IF EXISTS "Gym staff can manage training sessions" ON training_sessions;
DROP POLICY IF EXISTS "Members can view own sessions" ON training_sessions;

CREATE POLICY "Gym staff can manage training sessions" ON training_sessions
FOR ALL
USING (
  trainer_id IN (
    SELECT s.id FROM staff s
    JOIN gyms g ON g.id = s.gym_id
    WHERE g.owner_id = auth.uid() OR s.user_id = auth.uid()
  )
  OR
  member_id IN (
    SELECT m.id FROM members m
    JOIN gyms g ON g.id = m.gym_id
    WHERE g.owner_id = auth.uid()
  )
)
WITH CHECK (
  trainer_id IN (
    SELECT s.id FROM staff s
    JOIN gyms g ON g.id = s.gym_id
    WHERE g.owner_id = auth.uid() OR s.user_id = auth.uid()
  )
  OR
  member_id IN (
    SELECT m.id FROM members m
    JOIN gyms g ON g.id = m.gym_id
    WHERE g.owner_id = auth.uid()
  )
);

CREATE POLICY "Members can view own sessions" ON training_sessions
FOR SELECT
USING (
  member_id IN (
    SELECT id FROM members WHERE user_id = auth.uid()
  )
);

-- Attendance
DROP POLICY IF EXISTS "Gym staff can manage attendance" ON attendance;
DROP POLICY IF EXISTS "Users can view own attendance" ON attendance;

CREATE POLICY "Gym staff can manage attendance" ON attendance
FOR ALL
USING (
  gym_id IN (
    SELECT g.id FROM gyms g
    LEFT JOIN staff s ON s.gym_id = g.id
    WHERE g.owner_id = auth.uid() OR s.user_id = auth.uid()
  )
)
WITH CHECK (
  gym_id IN (
    SELECT g.id FROM gyms g
    LEFT JOIN staff s ON s.gym_id = g.id
    WHERE g.owner_id = auth.uid() OR s.user_id = auth.uid()
  )
);

CREATE POLICY "Users can view own attendance" ON attendance
FOR SELECT
USING (auth.uid() = user_id);

-- Inquiries
DROP POLICY IF EXISTS "Gym staff can manage inquiries" ON inquiries;

CREATE POLICY "Gym staff can manage inquiries" ON inquiries
FOR ALL
USING (
  gym_id IN (
    SELECT g.id FROM gyms g
    LEFT JOIN staff s ON s.gym_id = g.id
    WHERE g.owner_id = auth.uid() OR s.user_id = auth.uid()
  )
)
WITH CHECK (
  gym_id IN (
    SELECT g.id FROM gyms g
    LEFT JOIN staff s ON s.gym_id = g.id
    WHERE g.owner_id = auth.uid() OR s.user_id = auth.uid()
  )
);

-- Expenses
DROP POLICY IF EXISTS "Gym owners can manage expenses" ON expenses;

CREATE POLICY "Gym owners can manage expenses" ON expenses
FOR ALL
USING (
  gym_id IN (
    SELECT id FROM gyms WHERE owner_id = auth.uid()
  )
)
WITH CHECK (
  gym_id IN (
    SELECT id FROM gyms WHERE owner_id = auth.uid()
  )
);

-- Notifications
DROP POLICY IF EXISTS "Users can manage own notifications" ON notifications;

CREATE POLICY "Users can manage own notifications" ON notifications
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
