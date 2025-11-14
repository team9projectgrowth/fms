/**
 * Node.js script to clean up auth users
 * 
 * Usage:
 * 1. Set environment variable:
 *    export SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
 * 
 * 2. Run:
 *    node scripts/cleanup-auth-simple.js
 */

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://mxrjygxhjeubisjrfmfr.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ Error: SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  console.log('\nGet it from: Supabase Dashboard → Settings → API → service_role key');
  process.exit(1);
}

// Import Supabase client
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function cleanup() {
  console.log('🧹 Starting auth users cleanup...\n');

  // Users to keep: Super admins and Yagnesh
  const keepEmails = [
    'team9projectgrowth@gmail.com',  // Super Admin
    'admin@gmail.com',                // Super Admin
    'yagneshraju@gmail.com'           // Yagnesh (Tenant Admin)
  ];

  // Get users to keep from database
  const { data: usersToKeep, error: dbError } = await supabase
    .from('users')
    .select('id, email')
    .in('email', keepEmails);

  if (dbError) {
    console.error('❌ Error fetching users:', dbError.message);
    process.exit(1);
  }

  const keepIds = new Set(usersToKeep?.map(u => u.id) || []);

  console.log('✅ Users to KEEP:');
  usersToKeep?.forEach(u => console.log(`   - ${u.email} (${u.id})`));
  console.log('');

  // Get all auth users
  console.log('📋 Fetching all auth users...');
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();

  if (listError) {
    console.error('❌ Error listing auth users:', listError.message);
    process.exit(1);
  }

  if (!users || users.length === 0) {
    console.log('✨ No auth users found. Nothing to clean.');
    return;
  }

  console.log(`📊 Total auth users found: ${users.length}\n`);

  // Find users to delete
  const toDelete = users.filter(u => !keepIds.has(u.id));

  if (toDelete.length === 0) {
    console.log('✨ All auth users are in the keep list. Nothing to delete.');
    return;
  }

  console.log(`🗑️  Users to DELETE (${toDelete.length}):`);
  toDelete.forEach(u => console.log(`   - ${u.email || 'No email'} (${u.id})`));
  console.log('');

  // Confirm deletion
  console.log('⚠️  About to delete', toDelete.length, 'auth users.');
  console.log('Press Ctrl+C to cancel, or wait 3 seconds to continue...\n');
  await new Promise(resolve => setTimeout(resolve, 3000));

  // Delete users
  let deleted = 0;
  let errors = 0;

  for (const user of toDelete) {
    try {
      const { error } = await supabase.auth.admin.deleteUser(user.id);
      if (error) {
        console.error(`   ❌ Failed to delete ${user.email || user.id}: ${error.message}`);
        errors++;
      } else {
        console.log(`   ✅ Deleted ${user.email || user.id}`);
        deleted++;
      }
    } catch (err) {
      console.error(`   ❌ Error deleting ${user.email || user.id}:`, err.message);
      errors++;
    }
  }

  console.log('\n✨ Cleanup complete!');
  console.log(`   Deleted: ${deleted}`);
  console.log(`   Errors: ${errors}`);
  console.log(`   Kept: ${keepIds.size}`);
}

cleanup().catch(err => {
  console.error('❌ Unexpected error:', err);
  process.exit(1);
});

