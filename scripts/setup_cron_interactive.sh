#!/bin/bash
# ============================================================================
# Interactive Setup: Ticket Activity Webhook Cron Job
# ============================================================================

PROJECT_REF="mxrjygxhjeubisjrfmfr"

echo "=========================================="
echo "Setup Automatic Webhook Processing"
echo "=========================================="
echo ""
echo "This will set up a cron job to automatically process"
echo "webhook queue items every minute."
echo ""
echo "Project Reference: $PROJECT_REF"
echo ""
echo "To get your Service Role Key:"
echo "  1. Go to Supabase Dashboard"
echo "  2. Settings → API"
echo "  3. Find 'service_role' key (secret, starts with 'eyJ')"
echo "  4. Copy the entire key"
echo ""
read -p "Enter your Service Role Key: " SERVICE_ROLE_KEY

if [ -z "$SERVICE_ROLE_KEY" ]; then
  echo "❌ Service role key is required"
  exit 1
fi

echo ""
echo "=========================================="
echo "Creating SQL script..."
echo "=========================================="

# Create SQL file with the actual key
SQL_FILE="/tmp/setup_cron_$(date +%s).sql"

cat > "$SQL_FILE" << EOF
-- Auto-generated cron setup script
-- Run this in Supabase SQL Editor

-- Enable pg_cron
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Remove existing job if any
SELECT cron.unschedule('ticket-activity-webhook-dispatcher')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'ticket-activity-webhook-dispatcher'
);

-- Schedule the cron job
SELECT cron.schedule(
  'ticket-activity-webhook-dispatcher',
  '* * * * *', -- Every minute
  \$cron\$
  SELECT
    net.http_post(
      url:='https://${PROJECT_REF}.supabase.co/functions/v1/ticket-activity-webhook',
      headers:=jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ${SERVICE_ROLE_KEY}'
      ),
      body:='{}'::jsonb
    ) AS request_id;
  \$cron\$
);

-- Verify it was created
SELECT 
  jobid,
  schedule,
  active,
  jobname,
  '✓ Cron job is scheduled and active!' as status
FROM cron.job
WHERE jobname = 'ticket-activity-webhook-dispatcher';
EOF

echo "✓ SQL script created: $SQL_FILE"
echo ""
echo "=========================================="
echo "Next Steps:"
echo "=========================================="
echo ""
echo "1. Copy the SQL below (or from the file)"
echo "2. Go to Supabase Dashboard → SQL Editor"
echo "3. Paste and run the SQL"
echo "4. Verify it shows '✓ Cron job is scheduled and active!'"
echo ""
echo "--- SQL to run ---"
cat "$SQL_FILE"
echo "--- End SQL ---"
echo ""
echo "SQL file saved at: $SQL_FILE"
echo ""

