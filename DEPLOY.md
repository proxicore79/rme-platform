# Deploying Royal Mail Express International

This app is a **Node/Express web service** (server-rendered pages + JSON APIs)
with all data in **Supabase** and email via **Brevo SMTP** — so it is stateless
on the server and can run on any host that runs Node. Your `.env` secrets stay
out of the code (`.gitignore` already excludes `.env`).

**Pick a path:**

| Host | Type | Cost | Fit | Notes |
|---|---|---|---|---|
| **Render** ⭐ | Web service (always-on Node) | Free tier | **Best fit — zero code changes** | Sleeps after ~15 min idle, cold-boots in seconds |
| **Netlify** | Static + serverless functions | Free tier | Works (adapter included) | Each request runs a function; more moving parts |
| Railway | Web service | Trial credit → ~$5/mo | Great UX | No longer free |
| VPS (any Ubuntu box) | Full server | $5–6/mo | Most control | PM2 + Caddy; you manage it |

> Netlify CAN host this — I added the adapter (`netlify/functions/server.mjs`
> + `netlify.toml`, tested locally) — but **Render is the recommended home**
> because it literally runs `npm start`, the same way the preview does now.

---

## 0 · Prerequisites (both paths)

1. Put the project in a **GitHub repository**:

   ```bash
   cd rmexpress
   git init
   git add .
   git commit -m "Royal Mail Express International"
   # create an EMPTY repo at github.com (no README), then:
   git remote add origin https://github.com/YOUR_USERNAME/rme-platform.git
   git push -u origin main
   ```

   (`.gitignore` already excludes `node_modules/`, `.env` and the demo db, so
   secrets never leave your machine.)

2. **Environment variables** — the exact same set goes into whichever host you
   choose (Dashboard → project → Environment):

   | Variable | Value |
   |---|---|
   | `RM_USE_SUPABASE` | `true` |
   | `SUPABASE_URL` | `https://xvvknywbgihxewtxazkk.supabase.co` |
   | `SUPABASE_SERVICE_ROLE_KEY` | the `eyJ…` service-role key from your Supabase dashboard |
   | `ADMIN_KEY` | **pick a strong new one** (don't ship `rme-admin-2024`) |
   | `SMTP_HOST` | `smtp-relay.brevo.com` |
   | `SMTP_PORT` | `587` |
   | `SMTP_USER` | `b81092001@smtp-brevo.com` |
   | `SMTP_PASS` | your `xsmtpsib-…` Brevo SMTP key |
   | `MAIL_FROM` | `Lifefinderscanner@outlook.com` (a sender **verified in Brevo**) |
   | `PORT` | set by the host (Render injects it; you can ignore it on Netlify) |

---

## ⭐ Path A — Render (recommended, ~10 minutes, no code changes)

1. Go to **render.com** → **Sign up** (free, or "Continue with GitHub").
2. Dashboard → **New +** → **Web Service**.
3. **Connect a repository** → grant GitHub access → pick `rme-platform`.
4. Render auto-detects Node.js. Set:
   - **Name:** `rme-platform` (your URL becomes `https://rme-platform.onrender.com`)
   - **Region:** closest to you / your users (e.g. Frankfurt or Oregon)
   - **Branch:** `main`
   - **Build command:** `npm install`  *(Render default — fine)*
   - **Start command:** `npm start`  *(from package.json — fine)*
   - **Instance Type:** **Free**
5. Open the **Environment** tab and add every variable from the table in step 0.
6. Click **Create Web Service**. Watch the **Logs** tab — you should see:

   ```
   Royal Mail Express International
   backend : supabase (xvvknywbgihxewtxazkk)
   url     : http://0.0.0.0:10000
   ```

   (It auto-seeds demo shipments only if your Supabase tables are empty.)
7. Open **https://rme-platform.onrender.com** and run the verification below.

### Render free-tier notes
- The free instance **sleeps after ~15 minutes** of no traffic; the first request
  after sleeping takes ~30–60 s to boot. Totally fine for a demo/trial.
- To keep it warm, point a free uptime pinger (UptimeRobot, cron-job.org) at
  `https://rme-platform.onrender.com/api/health` every 10 minutes.
- Redeploy after code changes = just `git push` to `main` (or Deploy → "Clear
  build cache & deploy").

---

## Path B — Netlify (works, via serverless functions)

The repo already contains the adapter, so this is mostly dashboard work:

1. **netlify.com** → **Add new site** → **Import an existing project** → pick
   the GitHub repo.
2. Build settings auto-load from `netlify.toml`:
   - Build command: `npm ci --omit=dev || npm install`
   - Publish directory: `public`
   - Functions directory: `netlify/functions`
3. **Site settings → Environment variables**: add the same env table as above.
4. **Deploy.** When it finishes, open your `*.netlify.app` URL.

### Netlify gotchas
- Every page request runs a serverless function — a warm-up ping helps latency.
- The **admin console and pages render server-side**, so cold functions are the
  only "delay" you'll notice.
- If a route returns 404 in the Netlify UI but works locally, check the
  `[[redirects]]` catch-all in `netlify.toml` is deployed (they are).
- Netlify's free tier includes plenty of function invocations for this traffic
  level; you only pay if you exceed it.

---

## ✅ Verification checklist (after deploying to either host)

Replace `https://YOUR-APP-URL` below.

1. Homepage renders:
   ```bash
   curl -s https://YOUR-APP-URL/api/health
   # expect: {"ok":true,"service":"Royal Mail Express International","backend":"supabase","project":"xvvknywbgihxewtxazkk","ready":true}
   ```
2. Live tracking works (demo shipment seeded in Supabase):
   ```
   https://YOUR-APP-URL/track.html?q=RME-US-260901-240820-93
   ```
3. Admin console unlocks:
   ```
   https://YOUR-APP-URL/admin.html        (use your new ADMIN_KEY)
   ```
4. **Email fires end-to-end:** in Admin → Shipments, advance a shipment to a new
   stage → the notification stream shows `email/sent` (not `simulated`), and the
   email arrives at the sender/recipient address.
5. Booking issues a real tracking number (use the Book page, then track it).

---

## 🛠 Updating code later

- **Render:** `git push` → Render auto-deploys (or click **Manual Deploy**).
- **Netlify:** `git push` → Netlify auto-deploys.

---

## Security & launch checklist

- [ ] `ADMIN_KEY` changed to a strong secret in the host's env (not the default).
- [ ] Supabase service-role key exists **only** in host env + your local `.env`.
- [ ] The email address in `MAIL_FROM` is **verified as a Brevo sender**, and the
      same address is checked for the first test emails (check Junk/Spam too).
- [ ] If you connect a **custom domain**, add it on the host (Render/Netlify give
      free TLS certs) and update `site.url` if you want the footer/emails to show it.
- [ ] Replace placeholder phone/address/demo content before marketing the site.
