#!/bin/bash
# ============================================================================
# Quick Invoke Webhook Function
# ============================================================================

PROJECT_REF="mxrjygxhjeubisjrfmfr"
URL="https://${PROJECT_REF}.supabase.co/functions/v1/ticket-activity-webhook"

echo "=========================================="
echo "Invoke Ticket Activity Webhook"
echo "=========================================="
echo ""
echo "Project Reference: $PROJECT_REF"
echo "URL: $URL"
echo ""
echo "To get your Service Role Key:"
echo "  1. Go to Supabase Dashboard"
echo "  2. Settings → API"
echo "  3. Scroll to 'service_role' key (secret, starts with 'eyJ')"
echo "  4. Copy the entire key"
echo ""
read -p "Enter your Service Role Key: " SERVICE_ROLE_KEY

if [ -z "$SERVICE_ROLE_KEY" ]; then
  echo "❌ Service role key is required"
  exit 1
fi

echo ""
echo "Invoking function..."
echo ""

RESPONSE=$(curl -X POST "$URL" \
  -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -d '{}' \
  -w "\nHTTP_STATUS:%{http_code}" \
  -s)

HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_STATUS/d')

echo "HTTP Status: $HTTP_STATUS"
echo ""
echo "Response:"
if command -v jq &> /dev/null; then
  echo "$BODY" | jq . 2>/dev/null || echo "$BODY"
else
  echo "$BODY"
fi

if [ "$HTTP_STATUS" = "200" ]; then
  echo ""
  echo "✅ SUCCESS! Function invoked"
  echo ""
  echo "Check the response above for:"
  echo "  - processed: Items processed"
  echo "  - delivered: Successfully sent"
  echo "  - failed: Failed (check errors if any)"
else
  echo ""
  echo "❌ FAILED! Status: $HTTP_STATUS"
fi

echo ""

