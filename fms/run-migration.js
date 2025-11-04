#!/usr/bin/env node

/**
 * Migration Runner Script
 * This script runs the database migration using Supabase's REST API
 */

const fs = require('fs');
const path = require('path');

// Read .env file manually
function readEnvFile() {
  const envPath = path.join(__dirname, '.env');
  const envContent = fs.readFileSync(envPath, 'utf8');
  const env = {};
  
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        env[key.trim()] = valueParts.join('=').trim();
      }
    }
  });
  
  return env;
}

const env = readEnvFile();

const SUPABASE_URL = env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

// Check if we have the required credentials
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing required environment variables!');
  console.error('You need to add SUPABASE_SERVICE_ROLE_KEY to your .env file');
  console.error('\nTo get your service role key:');
  console.error('1. Go to https://app.supabase.com');
  console.error('2. Select your project');
  console.error('3. Go to Settings → API');
  console.error('4. Copy the "service_role" key');
  console.error('5. Add it to your .env file as: SUPABASE_SERVICE_ROLE_KEY=your_key_here');
  process.exit(1);
}

// Read the migration file
const migrationPath = path.join(__dirname, 'supabase', 'migrations', '20251102130000_fix_users_table_for_supabase_auth.sql');
const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

console.log('🚀 Running migration...');
console.log('Migration file:', migrationPath);
console.log('URL:', SUPABASE_URL.substring(0, 30) + '...');
console.log('');

// Make API call to Supabase
fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_SERVICE_ROLE_KEY,
    'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    'Prefer': 'return=minimal'
  },
  body: JSON.stringify({ sql: migrationSQL })
})
  .then(response => {
    if (!response.ok) {
      return response.text().then(text => {
        throw new Error(`Migration failed: ${text}`);
      });
    }
    return response.text();
  })
  .then(result => {
    console.log('✅ Migration completed successfully!');
    console.log('');
    console.log('Next steps:');
    console.log('1. Go to https://app.supabase.com → Authentication → Users');
    console.log('2. Create your first admin user');
    console.log('3. Add them to the users table (see QUICK_START.md)');
    console.log('4. Try logging in at /dashboard/login');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Migration failed:', error.message);
    console.log('');
    console.log('Alternative: Run the migration manually through Supabase Dashboard:');
    console.log('1. Go to https://app.supabase.com');
    console.log('2. Navigate to SQL Editor');
    console.log('3. Copy the migration file and run it');
    console.log('');
    console.log('See RUN_MIGRATION.md for detailed instructions');
    process.exit(1);
  });
