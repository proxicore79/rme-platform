import 'dotenv/config';

/**
 * Central configuration.
 * The app runs two interchangeable storage backends:
 *   1. DEMO  — a built-in JSON-file database (zero setup, works instantly).
 *   2. SUPABASE — live Supabase project, enabled when RM_USE_SUPABASE=true
 *                 AND the schema from /supabase/schema.sql has been applied.
 * Everything else (rates, tracking, notifications, admin) is identical.
 */
const bool = (v, d = false) => (v === undefined ? d : String(v).toLowerCase() === 'true' || String(v) === '1');

export const env = {
  PORT: parseInt(process.env.PORT || '4000', 10),

  useSupabase: bool(process.env.RM_USE_SUPABASE, false),
  supabaseUrl: process.env.SUPABASE_URL || 'https://xvvknywbgihxewtxazkk.supabase.co',
  // IMPORTANT: the service-role key is a server secret. It is never sent to the browser.
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY || '',

  adminKey: process.env.ADMIN_KEY || 'rme-admin-2024',

  demoDataFile: process.env.RM_DEMO_DATA_FILE || new URL('../data/demo-db.json', import.meta.url).pathname,
  autoSeedDemo: bool(process.env.RM_AUTO_SEED, true),

  // ---- Notification providers (all optional). When none are configured the
  // notification engine records every message in the notifications log and
  // flags it `simulated` so the flow is fully demoable without external keys.
  smtpHost: process.env.SMTP_HOST || '',
  smtpPort: parseInt(process.env.SMTP_PORT || '587', 10),
  smtpUser: process.env.SMTP_USER || '',
  smtpPass: process.env.SMTP_PASS || '',
  smtpSecure: bool(process.env.SMTP_SECURE, false),
  mailFrom: process.env.MAIL_FROM || 'notify@royalmail-express.com',

  sendgridKey: process.env.SENDGRID_API_KEY || '',
  sendgridFrom: process.env.SENDGRID_FROM || 'notify@royalmail-express.com',

  twilioSid: process.env.TWILIO_ACCOUNT_SID || '',
  twilioToken: process.env.TWILIO_AUTH_TOKEN || '',
  twilioFrom: process.env.TWILIO_FROM || '',
};

export const mode = env.useSupabase ? 'supabase' : 'demo';

export function describeMode() {
  if (env.useSupabase) {
    const project = env.supabaseUrl.replace(/^https:\/\//, '').replace(/\.supabase\.co.*$/, '');
    return { backend: 'supabase', project, ready: Boolean(env.supabaseServiceKey) };
  }
  return { backend: 'demo', project: 'built-in demo database', ready: true };
}
