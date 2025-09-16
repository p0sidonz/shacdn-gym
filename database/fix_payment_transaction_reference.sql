-- Fix payment transaction_reference column
-- Add missing transaction_reference column to payments table

ALTER TABLE payments ADD COLUMN IF NOT EXISTS transaction_reference VARCHAR(100);

-- Update existing records to use transaction_id as transaction_reference
UPDATE payments 
SET transaction_reference = transaction_id 
WHERE transaction_reference IS NULL AND transaction_id IS NOT NULL;

-- Add comment
COMMENT ON COLUMN payments.transaction_reference IS 'External payment gateway reference number';
