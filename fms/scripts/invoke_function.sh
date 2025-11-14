#!/bin/bash
# ============================================================================
# Invoke Ticket Activity Webhook Function
# ============================================================================

echo "=========================================="
echo "Invoke Ticket Activity Webhook Function"
echo "=========================================="
echo ""

# Get project details from Supabase status
echo "Checking Supabase project details..."
cd "$(dirname "$0")/.."

# Try to get project ref from Supabase CLI
PROJECT_REF=$(supabase status 2>/dev/null | grep "API URL" | sed 's/.*https:\/\/\([^.]*\)\..*/\1/' | head -1)

if [ -z "$PROJECT_REF" ]; then
  echo "⚠️  Could not auto-detect project reference"
  echo ""
  echo "Please provide your Supabase project details:"
  echo ""
  read -p "Enter your Supabase Project Reference (from your Supabase URL): " PROJECT_REF
  echo ""
fi

if [ -z "$PROJECT_REF" ]; then
  echo "❌ Project reference is required"
  echo ""
  echo "Find it in your Supabase Dashboard URL:"
  echo "Example: https://abc123xyz.supabase.co → Project ref is 'abc123xyz'"
  exit 1
fi

echo "✓ Using Project Reference: $PROJECT_REF"
echo ""

# Get service role key
echo "To get your Service Role Key:"
echo "1. Go to Supabase Dashboard → Settings → API"
echo "2. Find the 'service_role' key (secret, starts with 'eyJ')"
echo "3. Copy it here"
echo ""
read -p "Enter your Service Role Key: " SERVICE_ROLE_KEY

if [ -z "$SERVICE_ROLE_KEY" ]; then
  echo "❌ Service role key is required"
  exit 1
fi

echo ""
echo "=========================================="
echo "Invoking function..."
echo "=========================================="
echo ""

URL="https://${PROJECT_REF}.supabase.co/functions/v1/ticket-activity-webhook"

echo "URL: $URL"
echo ""

# Invoke the function
RESPONSE=$(curl -X POST "$URL" \
  -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -d '{}' \
  -w "\nHTTP_STATUS:%{http_code}" \
  -s)

# Extract HTTP status and body
HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_STATUS/d')

echo "Response:"
echo "----------"
if command -v jq &> /dev/null; then
  echo "$BODY" | jq . 2>/dev/null || echo "$BODY"
else
  echo "$BODY"
fi
echo "----------"
echo ""

if [ "$HTTP_STATUS" = "200" ]; then
  echo "✅ SUCCESS! Function invoked successfully"
  echo ""
  echo "Check the response above for:"
  echo "  - processed: Number of queue items processed"
  echo "  - delivered: Number successfully sent to Make"
  echo "  - failed: Number that failed (check errors)"
else
  echo "❌ FAILED! HTTP Status: $HTTP_STATUS"
  echo ""
  echo "Common issues:"
  echo "  - Invalid project reference"
  echo "  - Invalid service role key"
  echo "  - Function not deployed"
  echo ""
  echo "Try:"
  echo "  1. Verify project reference in Supabase Dashboard URL"
  echo "  2. Copy the service_role key from Settings → API"
  echo "  3. Check function is deployed: supabase functions list"
fi

echo ""

