/**
 * Quick Supabase connection check.
 * Usage:  node scripts/check_supabase.mjs
 * Verifies the project URL is reachable and, if a service key is present,
 * that the shipments table exists.
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL || 'https://xvvknywbgihxewtxazkk.supabase.co';
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

console.log(`Supabase project : ${url}`);
if (!key) {
  console.log('Service-role key  : (not set — cannot query schema)');
  console.log('\nTo finish Supabase wiring:');
  console.log('  1. SQL Editor → run supabase/schema.sql');
  console.log('  2. .env → RM_USE_SUPABASE=true + SUPABASE_SERVICE_ROLE_KEY=<service role key>');
  console.log('  3. Restart the server. Demo data seeds automatically on first Supabase run too.\n');
  process.exit(0);
}

try {
  const sb = createClient(url, key, { auth: { persistSession: false } });
  const { data, error, count } = await sb.from('shipments').select('*', { count: 'exact', head: true });
  if (error) throw error;
  console.log(`Service key OK. "shipments" table exists (${count} rows).`);
  const ev = await sb.from('status_events').select('*', { count: 'exact', head: true });
  const nf = await sb.from('notifications').select('*', { count: 'exact', head: true });
  console.log(`Tables OK → shipments ✓  status_events ${ev.error ? '✗' : '✓'}  notifications ${nf.error ? '✗' : '✓'}`);
  if (ev.error) console.log('Missing table hint:', ev.error.message);
  process.exit(0);
} catch (e) {
  console.error('Connection failed:', e.message);
  console.error('Check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}
