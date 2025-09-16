-- ============================================================================
-- FIX MEMBERSHIPS TABLE PUBLIC ACCESS FOR ATTENDANCE SCAN
-- ============================================================================

-- The memberships query is failing because anon users don't have access
-- Add public read access policy for memberships table

CREATE POLICY "Public can read active memberships for attendance" ON memberships
FOR SELECT
TO anon, authenticated
USING (
  -- Only allow reading active memberships of active members
  status = 'active'
  AND member_id IN (
    SELECT id FROM members WHERE status = 'active'
  )
);

-- Grant select permission on memberships to anon
GRANT SELECT ON memberships TO anon;

-- Also ensure membership_packages can be read (for package details)
CREATE POLICY "Public can read membership packages for attendance" ON membership_packages
FOR SELECT
TO anon, authenticated
USING (true); -- All packages can be read (they're not sensitive)

-- Grant select permission on membership_packages to anon
GRANT SELECT ON membership_packages TO anon;

-- Test query to verify the fix works
SELECT 
    m.id,
    m.member_id,
    m.status,
    json_agg(
        json_build_object(
            'id', ms.id,
            'status', ms.status,
            'start_date', ms.start_date,
            'end_date', ms.end_date,
            'membership_packages', json_build_object(
                'name', mp.name,
                'package_type', mp.package_type
            )
        )
    ) FILTER (WHERE ms.id IS NOT NULL) as memberships
FROM members m
LEFT JOIN memberships ms ON m.id = ms.member_id AND ms.status = 'active'
LEFT JOIN membership_packages mp ON ms.package_id = mp.id
WHERE m.member_id = 'MEM1757873929530'
AND m.status = 'active'
GROUP BY m.id, m.member_id, m.status;
