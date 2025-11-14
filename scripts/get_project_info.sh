#!/bin/bash
# ============================================================================
# Get Supabase Project Information
# ============================================================================

echo "Getting Supabase project information..."
echo ""

cd "$(dirname "$0")/.."

# Try to get info from Supabase CLI
if command -v supabase &> /dev/null; then
  echo "Checking Supabase status..."
  STATUS=$(supabase status 2>&1)
  
  if echo "$STATUS" | grep -q "API URL"; then
    echo "✓ Found Supabase project:"
    echo ""
    echo "$STATUS" | grep -E "API URL|anon key" | head -5
    echo ""
    echo "To get your Service Role Key:"
    echo "  1. Go to Supabase Dashboard"
    echo "  2. Settings → API"
    echo "  3. Copy the 'service_role' key (secret)"
  else
    echo "⚠️  Supabase project not found locally"
    echo ""
    echo "To find your project details:"
    echo "  1. Go to Supabase Dashboard"
    echo "  2. Find your Project Reference in the URL or Settings → General"
    echo "  3. Get Service Role Key from Settings → API → service_role"
  fi
else
  echo "⚠️  Supabase CLI not found"
  echo ""
  echo "To find your project details:"
  echo "  1. Go to Supabase Dashboard"
  echo "  2. Find your Project Reference in the URL (e.g., abc123xyz in https://abc123xyz.supabase.co)"
  echo "  3. Get Service Role Key from Settings → API → service_role (secret key)"
fi

echo ""

