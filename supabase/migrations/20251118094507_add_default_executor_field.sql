/*
  # Add Default Executor Field to Executor Profiles
  
  This migration adds the ability to mark one executor per tenant as the default executor
  for unassigned tickets.
  
  1. Changes
    - Add `is_default_executor` boolean field to `executor_profiles` table
    - Create index for faster lookups
    - Create trigger to ensure only one default executor per tenant
  
  2. Security
    - No RLS changes needed - existing policies apply
*/

-- Add is_default_executor column
ALTER TABLE executor_profiles 
ADD COLUMN IF NOT EXISTS is_default_executor BOOLEAN DEFAULT false NOT NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_executor_profiles_is_default_executor 
ON executor_profiles(tenant_id, is_default_executor) 
WHERE is_default_executor = true;

-- Function to ensure only one default executor per tenant
CREATE OR REPLACE FUNCTION ensure_single_default_executor()
RETURNS TRIGGER AS $$
BEGIN
  -- If setting an executor as default, unset all other defaults for the same tenant
  IF NEW.is_default_executor = true THEN
    UPDATE executor_profiles
    SET is_default_executor = false
    WHERE tenant_id = NEW.tenant_id
      AND id != NEW.id
      AND is_default_executor = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to enforce single default per tenant
DROP TRIGGER IF EXISTS trigger_ensure_single_default_executor ON executor_profiles;
CREATE TRIGGER trigger_ensure_single_default_executor
  BEFORE INSERT OR UPDATE OF is_default_executor ON executor_profiles
  FOR EACH ROW
  WHEN (NEW.is_default_executor = true)
  EXECUTE FUNCTION ensure_single_default_executor();

-- Add comment for documentation
COMMENT ON COLUMN executor_profiles.is_default_executor IS 'Marks this executor as the default for unassigned tickets. Only one executor per tenant can be marked as default.';

