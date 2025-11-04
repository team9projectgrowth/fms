/*
  # Add Tenant Approval System
  Run this migration to add approval workflow for tenants
*/

-- Add approved column (default false - requires approval)
ALTER TABLE tenants 
ADD COLUMN IF NOT EXISTS approved boolean DEFAULT false;

-- Add approval tracking columns
ALTER TABLE tenants
ADD COLUMN IF NOT EXISTS approved_at timestamptz;

ALTER TABLE tenants
ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES users(id) ON DELETE SET NULL;

-- Create index for filtering by approval status
CREATE INDEX IF NOT EXISTS idx_tenants_approved ON tenants(approved);

-- Add comments
COMMENT ON COLUMN tenants.approved IS 'Whether the tenant registration has been approved by a super admin';
COMMENT ON COLUMN tenants.approved_at IS 'Timestamp when the tenant was approved';
COMMENT ON COLUMN tenants.approved_by IS 'ID of the admin who approved this tenant';

