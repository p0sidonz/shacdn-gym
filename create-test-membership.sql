-- ============================================================================
-- CREATE TEST MEMBERSHIP FOR MEMBER MEM1757873929530
-- ============================================================================

-- First, check if member exists and get details
SELECT 
    id as member_id,
    member_id as member_number,
    gym_id,
    status
FROM members 
WHERE member_id = 'MEM1757873929530';

-- Check available membership packages for this gym
SELECT 
    id as package_id,
    name,
    package_type,
    price,
    duration_months,
    gym_id
FROM membership_packages 
WHERE gym_id = (
    SELECT gym_id FROM members WHERE member_id = 'MEM1757873929530'
)
LIMIT 5;

-- Create a basic membership for this member
-- Note: Replace the package_id with an actual package ID from your gym
INSERT INTO memberships (
    member_id,
    package_id,
    start_date,
    end_date,
    status,
    original_amount,
    total_amount_due,
    amount_paid,
    amount_pending,
    is_trial
) 
SELECT 
    m.id as member_id,
    mp.id as package_id,
    CURRENT_DATE as start_date,
    CURRENT_DATE + INTERVAL '30 days' as end_date,
    'active'::membership_status as status,
    mp.price as original_amount,
    mp.price as total_amount_due,
    mp.price as amount_paid,  -- Assume paid for testing
    0.00 as amount_pending,
    false as is_trial
FROM members m
CROSS JOIN membership_packages mp
WHERE m.member_id = 'MEM1757873929530'
AND mp.gym_id = m.gym_id
LIMIT 1; -- Only create one membership

-- Verify the membership was created
SELECT 
    m.member_id,
    m.status as member_status,
    ms.id as membership_id,
    ms.status as membership_status,
    ms.start_date,
    ms.end_date,
    mp.name as package_name,
    mp.package_type
FROM members m
JOIN memberships ms ON m.id = ms.member_id
JOIN membership_packages mp ON ms.package_id = mp.id
WHERE m.member_id = 'MEM1757873929530';

-- Test the attendance query (what the app will run)
SELECT 
    m.id,
    m.member_id,
    m.status,
    json_build_object(
        'first_name', p.first_name,
        'last_name', p.last_name,
        'phone', p.phone
    ) as profiles,
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
    ) as memberships
FROM members m
JOIN profiles p ON m.profile_id = p.id
LEFT JOIN memberships ms ON m.id = ms.member_id
LEFT JOIN membership_packages mp ON ms.package_id = mp.id
WHERE m.member_id = 'MEM1757873929530'
AND m.status = 'active'
GROUP BY m.id, m.member_id, m.status, p.first_name, p.last_name, p.phone;
