-- Add profile_id to members and staff tables
-- This migration adds profile_id columns and updates the relationships

-- Add profile_id to members
ALTER TABLE members 
ADD COLUMN profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE;

-- Add profile_id to staff
ALTER TABLE staff 
ADD COLUMN profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE;

-- Triggers to set profile_id on insert
CREATE OR REPLACE FUNCTION set_profile_id()
RETURNS TRIGGER AS $$
BEGIN
    SELECT id INTO NEW.profile_id FROM profiles WHERE user_id = NEW.user_id;
    IF NEW.profile_id IS NULL THEN
        RAISE EXCEPTION 'Profile not found for user_id %', NEW.user_id;
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql' SECURITY DEFINER;

CREATE TRIGGER set_member_profile_id 
BEFORE INSERT ON members 
FOR EACH ROW EXECUTE FUNCTION set_profile_id();

CREATE TRIGGER set_staff_profile_id 
BEFORE INSERT ON staff 
FOR EACH ROW EXECUTE FUNCTION set_profile_id();

-- Update existing data if any
UPDATE members m 
SET profile_id = p.id 
FROM profiles p 
WHERE m.user_id = p.user_id;

UPDATE staff s 
SET profile_id = p.id 
FROM profiles p 
WHERE s.user_id = p.user_id;

-- Add indexes for performance
CREATE INDEX idx_members_profile_id ON members(profile_id);
CREATE INDEX idx_staff_profile_id ON staff(profile_id);
