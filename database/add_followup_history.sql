-- Add Follow-up History Table
-- This table tracks all follow-up activities for inquiries

CREATE TABLE IF NOT EXISTS inquiry_followups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    inquiry_id UUID REFERENCES inquiries(id) ON DELETE CASCADE,
    staff_id UUID REFERENCES staff(id) ON DELETE SET NULL,
    followup_type followup_type NOT NULL,
    followup_date TIMESTAMP WITH TIME ZONE NOT NULL,
    followup_method followup_method NOT NULL,
    status followup_status NOT NULL DEFAULT 'scheduled',
    notes TEXT,
    outcome TEXT,
    next_followup_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create enums for follow-up types and methods
DO $$ BEGIN
    CREATE TYPE followup_type AS ENUM (
        'call', 
        'email', 
        'sms', 
        'whatsapp', 
        'visit', 
        'trial_scheduled', 
        'trial_completed', 
        'conversion_attempt',
        'follow_up_reminder'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE followup_method AS ENUM (
        'phone_call',
        'email',
        'sms',
        'whatsapp',
        'in_person',
        'video_call',
        'text_message'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE followup_status AS ENUM (
        'scheduled',
        'completed',
        'cancelled',
        'rescheduled',
        'no_answer',
        'busy',
        'voicemail',
        'successful'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add RLS policies
ALTER TABLE inquiry_followups ENABLE ROW LEVEL SECURITY;

-- Gym owners and managers can manage follow-ups for their gym's inquiries
CREATE POLICY "Gym staff can manage follow-ups" ON inquiry_followups
FOR ALL
USING (
  inquiry_id IN (
    SELECT i.id FROM inquiries i
    JOIN gyms g ON g.id = i.gym_id
    WHERE g.owner_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM staff s 
      WHERE s.gym_id = g.id 
      AND s.user_id = auth.uid()
    )
  )
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_inquiry_followups_inquiry_id ON inquiry_followups(inquiry_id);
CREATE INDEX IF NOT EXISTS idx_inquiry_followups_followup_date ON inquiry_followups(followup_date);
CREATE INDEX IF NOT EXISTS idx_inquiry_followups_status ON inquiry_followups(status);

-- Add updated_at trigger
CREATE TRIGGER update_inquiry_followups_updated_at 
  BEFORE UPDATE ON inquiry_followups 
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Add function to get follow-up history for an inquiry
CREATE OR REPLACE FUNCTION get_inquiry_followup_history(p_inquiry_id UUID)
RETURNS TABLE (
    id UUID,
    followup_type followup_type,
    followup_date TIMESTAMP WITH TIME ZONE,
    followup_method followup_method,
    status followup_status,
    notes TEXT,
    outcome TEXT,
    next_followup_date TIMESTAMP WITH TIME ZONE,
    staff_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        f.id,
        f.followup_type,
        f.followup_date,
        f.followup_method,
        f.status,
        f.notes,
        f.outcome,
        f.next_followup_date,
        CONCAT(p.first_name, ' ', p.last_name) as staff_name,
        f.created_at
    FROM inquiry_followups f
    LEFT JOIN staff s ON s.id = f.staff_id
    LEFT JOIN profiles p ON p.user_id = s.user_id
    WHERE f.inquiry_id = p_inquiry_id
    ORDER BY f.followup_date DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_inquiry_followup_history TO authenticated;

