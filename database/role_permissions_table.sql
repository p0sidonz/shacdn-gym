-- Role Permissions Table
CREATE TABLE IF NOT EXISTS role_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    gym_id UUID REFERENCES gyms(id) ON DELETE CASCADE,
    role user_role NOT NULL,
    permission_id VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(gym_id, role, permission_id)
);

-- Add RLS
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for role_permissions
DROP POLICY IF EXISTS "Gym owners can manage role permissions" ON role_permissions;
CREATE POLICY "Gym owners can manage role permissions" ON role_permissions 
  FOR ALL USING (
    gym_id IN (
      SELECT id FROM gyms WHERE owner_id = auth.uid()
    )
  );

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_role_permissions_gym_role ON role_permissions(gym_id, role);

-- Add updated_at trigger
DROP TRIGGER IF EXISTS update_role_permissions_updated_at ON role_permissions;
CREATE TRIGGER update_role_permissions_updated_at BEFORE UPDATE ON role_permissions 
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Staff Invitations Table (for linking staff signup with existing records)
CREATE TABLE IF NOT EXISTS staff_invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    gym_id UUID REFERENCES gyms(id) ON DELETE CASCADE,
    staff_id UUID REFERENCES staff(id) ON DELETE CASCADE,
    email VARCHAR(100) NOT NULL,
    invitation_token VARCHAR(100) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used_at TIMESTAMP WITH TIME ZONE,
    used_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(gym_id, email)
);

-- Add RLS
ALTER TABLE staff_invitations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for staff_invitations
DROP POLICY IF EXISTS "Gym owners can manage staff invitations" ON staff_invitations;
CREATE POLICY "Gym owners can manage staff invitations" ON staff_invitations 
  FOR ALL USING (
    gym_id IN (
      SELECT id FROM gyms WHERE owner_id = auth.uid()
    )
  );

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_staff_invitations_token ON staff_invitations(invitation_token);
CREATE INDEX IF NOT EXISTS idx_staff_invitations_email ON staff_invitations(email);

-- Function to link staff signup with existing staff record
CREATE OR REPLACE FUNCTION link_staff_signup()
RETURNS TRIGGER AS $$
DECLARE
    staff_record RECORD;
    invitation_record RECORD;
BEGIN
    -- Check if there's a staff record with this email that needs linking
    SELECT s.*, si.id as invitation_id INTO staff_record
    FROM staff s
    INNER JOIN staff_invitations si ON si.staff_id = s.id
    WHERE si.email = NEW.email
    AND si.used_at IS NULL
    AND si.expires_at > NOW()
    AND s.status = 'inactive';

    -- If found, link the signup
    IF FOUND THEN
        -- Update staff record with real user_id and activate
        UPDATE staff 
        SET user_id = NEW.id, status = 'active', updated_at = NOW()
        WHERE id = staff_record.id;

        -- Mark invitation as used
        UPDATE staff_invitations
        SET used_at = NOW(), used_by = NEW.id
        WHERE id = staff_record.invitation_id;

        -- Update profile with real user_id
        UPDATE profiles
        SET user_id = NEW.id
        WHERE user_id = staff_record.user_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically link staff signup
DROP TRIGGER IF EXISTS on_staff_user_signup ON auth.users;
CREATE TRIGGER on_staff_user_signup
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE link_staff_signup();
