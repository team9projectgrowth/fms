import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

function loadEnvVars(envPath) {
  const content = fs.readFileSync(envPath, 'utf8');
  const env = {};
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const val = trimmed.slice(idx + 1).trim();
    env[key] = val;
  }
  return env;
}

async function main() {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) {
    console.error('Missing .env.local in current directory');
    process.exit(1);
  }

  const env = loadEnvVars(envPath);
  const url = env.VITE_SUPABASE_URL;
  const anon = env.VITE_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    console.error('VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY not set');
    process.exit(1);
  }

  const supabase = createClient(url, anon);

  console.log('Checking Supabase connectivity...');
  try {
    // A lightweight request to confirm connectivity
    const { data: ping, error: pingError } = await supabase.from('categories').select('id').limit(1);
    if (pingError) {
      console.warn('Categories check error:', pingError.message);
    } else {
      console.log('Categories table reachable');
    }
  } catch (e) {
    console.error('Connectivity check failed:', e.message);
  }

  const tablesToProbe = ['users', 'executors', 'tickets', 'categories', 'priorities'];
  const results = [];
  for (const table of tablesToProbe) {
    try {
      const { error } = await supabase.from(table).select('*', { count: 'exact', head: true });
      results.push({ table, reachable: !error, error: error?.message || null });
    } catch (e) {
      results.push({ table, reachable: false, error: e.message });
    }
  }

  console.log('\nAccessible tables (via anon key):');
  for (const r of results) {
    console.log(`- ${r.table}: ${r.reachable ? 'OK' : 'ERROR'}${r.error ? ` (${r.error})` : ''}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});


