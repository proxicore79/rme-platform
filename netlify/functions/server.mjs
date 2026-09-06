/**
 * Netlify Functions adapter.
 * Netlify runs one serverless function per request; this wraps the full
 * Express app so every route (pages + APIs) works unchanged. Static assets
 * under /public are served by Netlify's CDN (see netlify.toml), and Express
 * also serves them as a fallback.
 *
 * Env vars required in Netlify dashboard (Site settings → Environment):
 *   RM_USE_SUPABASE, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ADMIN_KEY,
 *   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_FROM
 */
import serverless from 'serverless-http';
import { app } from '../../server/index.js';

export const handler = serverless(app);
