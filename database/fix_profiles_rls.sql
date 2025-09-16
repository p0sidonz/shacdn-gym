-- Temporary fix for profiles RLS issue
-- This allows the profile query to work during development

-- Disable RLS temporarily on profiles table
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Alternative: Create a more permissive policy
-- ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
-- DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
-- CREATE POLICY "Allow profile access" ON profiles FOR ALL USING (true);
