/*
  # Add Automation Webhook URL to Tenants Table
  
  This migration adds the automation_webhook_url column to the tenants table
  to allow tenants to configure their automation layer webhook endpoint.
*/

-- Add automation_webhook_url column (nullable)
ALTER TABLE tenants 
ADD COLUMN IF NOT EXISTS automation_webhook_url text;

-- Add comment
COMMENT ON COLUMN tenants.automation_webhook_url IS 'Webhook URL for automation layer to receive ticket updates (configured per tenant)';

