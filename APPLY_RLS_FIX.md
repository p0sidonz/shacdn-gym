# RLS Policy Fix for Refund Requests

## Problem
You're getting this error when creating refund requests:
```
Error creating refund request: Unknown error
Object code: "42501"
details: null
hint: null
message: "new row violates row-level security policy for table \"refund_requests\""
```

## Solution
The RLS policies for the `refund_requests` table are missing INSERT permissions for members and staff.

## Steps to Fix

### 1. Go to Supabase Dashboard
1. Open your Supabase project dashboard
2. Go to the SQL Editor section
3. Create a new query

### 2. Run These SQL Commands
Copy and paste the following SQL commands into the SQL editor and run them:

```sql
-- Drop existing policies
DROP POLICY IF EXISTS "Gym owners can manage refunds" ON refund_requests;
DROP POLICY IF EXISTS "Members can view own refunds" ON refund_requests;
DROP POLICY IF EXISTS "Staff can view gym refunds" ON refund_requests;
DROP POLICY IF EXISTS "Members can insert own refunds" ON refund_requests;
DROP POLICY IF EXISTS "Staff can insert gym refunds" ON refund_requests;

-- Create comprehensive policies

-- 1. Gym owners can manage all refunds in their gym
CREATE POLICY "Gym owners can manage refunds" ON refund_requests
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

-- 2. Staff can view and insert refund requests in their gym
CREATE POLICY "Staff can view gym refunds" ON refund_requests
FOR SELECT
USING (
  gym_id IN (
    SELECT s.gym_id FROM staff s
    WHERE s.user_id = auth.uid()
  )
);

CREATE POLICY "Staff can insert gym refunds" ON refund_requests
FOR INSERT
WITH CHECK (
  gym_id IN (
    SELECT s.gym_id FROM staff s
    WHERE s.user_id = auth.uid()
  )
);

-- 3. Members can view their own refund requests
CREATE POLICY "Members can view own refunds" ON refund_requests
FOR SELECT
USING (
  member_id IN (
    SELECT id FROM members WHERE user_id = auth.uid()
  )
);

-- 4. Members can insert their own refund requests
CREATE POLICY "Members can insert own refunds" ON refund_requests
FOR INSERT
WITH CHECK (
  member_id IN (
    SELECT id FROM members WHERE user_id = auth.uid()
  )
);

-- Grant necessary permissions
GRANT ALL ON refund_requests TO authenticated;
```

### 3. Test the Fix
After running the SQL commands:
1. Try creating a refund request again
2. The error should be resolved
3. You should be able to see both payments and refunds in the Payments page

## What This Fix Does

1. **Gym Owners**: Can manage all refunds in their gym (view, insert, update, delete)
2. **Staff Members**: Can view and insert refund requests for their gym
3. **Members**: Can view and insert their own refund requests
4. **Unified View**: The Payments page now shows both payments and refunds together, with refunds displayed as negative amounts

## New Features Added

### Enhanced Payments Page
- Shows both payments and refunds in one unified view
- Refunds appear as negative amounts (e.g., -₹500)
- Color coding: Green for payments, Red for refunds
- Summary cards showing total amount, payment count, refund count, and net revenue
- Advanced filtering by type, status, date range, and search
- Clear visual indicators for different transaction types

### Better User Experience
- No need to check separate sections for payments and refunds
- Easy to see the complete financial picture
- Refunds are clearly marked and easy to identify
- All transaction details in one place

## Testing
After applying the fix, test these scenarios:
1. Create a payment (should work as before)
2. Create a refund request (should now work without RLS error)
3. View the Payments page (should show both payments and refunds)
4. Check that refunds appear as negative amounts
5. Verify filtering works correctly

