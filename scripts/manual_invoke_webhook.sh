#!/bin/bash
# ============================================================================
# Manual Invoke Ticket Activity Webhook Function
# ============================================================================
# This script manually invokes the ticket-activity-webhook function
# to process pending queue items immediately

# Configuration - REPLACE THESE VALUES
PROJECT_REF="YOUR-PROJECT-REF"  # Replace with your Supabase project reference
SERVICE_ROLE_KEY="YOUR-SERVICE-ROLE-KEY"  # Replace with your service role key

# Build the URL
URL="https://${PROJECT_REF}.supabase.co/functions/v1/ticket-activity-webhook"

echo "Invoking ticket-activity-webhook function..."
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

echo "HTTP Status: $HTTP_STATUS"
echo "Response:"
echo "$BODY" | jq . 2>/dev/null || echo "$BODY"

# Check result
if [ "$HTTP_STATUS" = "200" ]; then
  echo ""
  echo "✓ Function invoked successfully!"
  echo "Check the response above for processed/delivered/failed counts"
else
  echo ""
  echo "✗ Function invocation failed with status $HTTP_STATUS"
  echo "Check your PROJECT_REF and SERVICE_ROLE_KEY"
fi

