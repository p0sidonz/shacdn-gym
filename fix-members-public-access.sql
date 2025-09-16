-- ============================================================================
-- FIX MEMBERS TABLE PUBLIC ACCESS FOR ATTENDANCE SCAN
-- ============================================================================

-- Add public read access policy for members table
-- This allows the public attendance scan page to look up members
CREATE POLICY "Public can read member basic info for attendance" ON members
FOR SELECT 
TO anon, authenticated
USING (
  -- Allow reading basic member info (member_id, status, gym_id)
  -- This is needed for the public attendance scan page
  status = 'active'
);

-- Also need to grant permissions to anon for members table
GRANT SELECT ON members TO anon;

-- Add public read access for profiles (needed for member names in attendance)
CREATE POLICY "Public can read member profiles for attendance" ON profiles
FOR SELECT 
TO anon, authenticated
USING (
  -- Only allow reading profiles of active members
  id IN (
    SELECT profile_id FROM members WHERE status = 'active'
  )
);

-- Grant select permission on profiles to anon
GRANT SELECT ON profiles TO anon;

-- Add public read access for memberships (needed to check active membership)
CREATE POLICY "Public can read active memberships for attendance" ON memberships
FOR SELECT
TO anon, authenticated
USING (
  -- Only allow reading active memberships
  status = 'active'
  AND member_id IN (
    SELECT id FROM members WHERE status = 'active'
  )
);

-- Grant select permission on memberships to anon
GRANT SELECT ON memberships TO anon;

-- Add public read access for membership_packages (needed for membership details)
CREATE POLICY "Public can read membership packages for attendance" ON membership_packages
FOR SELECT
TO anon, authenticated
USING (true); -- All packages can be read (they're not sensitive)

-- Grant select permission on membership_packages to anon
GRANT SELECT ON membership_packages TO anon;

-- Verify the policies work
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename IN ('members', 'profiles', 'memberships', 'membership_packages')
AND policyname LIKE '%public%' OR policyname LIKE '%anon%'
ORDER BY tablename, policyname;
