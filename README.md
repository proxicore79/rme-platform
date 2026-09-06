# Royal Mail Express International

Logistics & freight-handling service shipping packages from the **USA, UK and China to Uganda and Africa** — with a public website, an instant door-to-door quote engine, online booking that issues **tracking numbers**, live status **timelines**, automatic **notifications**, and an **operations console** for the team.

> **Deploying?** Follow [`DEPLOY.md`](DEPLOY.md) — Render is the recommended host (zero code changes); a Netlify adapter is included too.

## Quick start

```bash
npm install
npm start          # → http://localhost:4000
```

No database sign-up needed to try it: the app ships with a built-in demo database
(seeded with realistic shipments across all three origin corridors). Flip one
environment variable and the *same* application runs on your Supabase project.

| Page | URL | Purpose |
|---|---|---|
| Home | `/` | Company site + live activity feed |
| Services & rates | `/services.html` | Lane/gateway matrix, inclusions, FAQs |
| Instant quote | `/quote.html` | Live door-to-door calculator |
| Book | `/book.html` | Booking form → issues tracking number |
| Track | `/track.html?q=RME-…` | Public live tracking with journey timeline |
| Admin | `/admin.html` | Operations console (demo key `rme-admin-2024`) |

Demo tracking numbers to try on the tracking page:

```
RME-US-260901-240820-93   (Express, US→Kampala, out for delivery)
RME-UK-260901-264364-79   (Express, UK→Kampala, customs cleared)
RME-CN-260901-258661-53   (Economy Sea, China→Kampala, at sea)
RME-US-260901-763342-33   (Express, delivered)
```

## Tracking numbers & notifications

- **Tracking number format:** `RME-{US|UK|CN}-{YYMMDD}-{6 digits}-{2 check digits}`.
  The final two digits are a base-36 mod-97 checksum, so a mistyped number is
  rejected instantly instead of returning a dead page.
- **Notifications:** every stage change (and every booking) raises notifications
  to the opted-in sender/recipient over **email**, **SMS** and an **in-app
  stream**. With no provider keys configured, messages are fully formed and
  logged with a `simulated` flag — the admin **Notifications** tab shows the
  exact contents that will be delivered.

### Going live with email/SMS
Add keys to `.env` and restart — no code changes:

```bash
# Email (either)
SENDGRID_API_KEY=SG.xxxx
# or SMTP
SMTP_HOST=smtp.yourprovider.com
SMTP_USER=you
SMTP_PASS=****

# SMS
TWILIO_ACCOUNT_SID=AC…
TWILIO_AUTH_TOKEN=…
TWILIO_FROM=+1…
```

## Architecture

```
rmexpress/
├─ server/
│  ├─ index.js       Express app: pages + JSON API + admin API
│  ├─ db.js          Data-access layer (demo JSON store OR Supabase driver)
│  ├─ catalogue.js   Origins, destinations, services, status stages
│  ├─ tracking.js    Tracking-number generator & checksum validator
│  ├─ rates.js       Door-to-door rate engine (weight/volume/zone)
│  ├─ notify.js      Notification dispatcher (SendGrid/SMTP/Twilio/log)
│  ├─ seed.js        Demo shipments, events, notifications
│  └─ render.js      Server-side page rendering
├─ pages/            marketing + portal page templates
├─ public/           CSS/JS/images
├─ supabase/schema.sql   PostgreSQL schema for Supabase
└─ data/demo-db.json     Demo database (auto-created)
```

## Wiring the real Supabase project

The server talks to Postgres through the Supabase **service-role key** (server
only — it is never exposed to the browser; public reads go through the server,
which is enough for this product and keeps one source of truth for status).

Target project: `https://xvvknywbgihxewtxazkk.supabase.co` (service-role key is
already stored in the private `.env` in this workspace).

1. Open **Supabase Dashboard → SQL Editor** and run the contents of
   [`supabase/schema.sql`](supabase/schema.sql) in that project. It creates
   `shipments`, `status_events`, `notifications`, `tracking_subscribers`,
   indexes and RLS policies.
2. In `.env` set `RM_USE_SUPABASE=true` (URL and service-role key are already filled in).
3. Restart: `npm start`. The server verifies the tables and, on first boot
   against an empty project, seeds the demo shipments automatically so the
   console is populated.
4. Sanity check anytime: `node scripts/check_supabase.mjs`.

> This workspace is currently wired to the live project — `RM_USE_SUPABASE=true`
> with the service-role key in `.env`. `node_modules` is re-created with
> `npm install` after each fresh session; your data lives in Supabase and the
> schema file, so nothing is lost.

## API cheat-sheet

| Method | Endpoint | Notes |
|---|---|---|
| GET | `/api/quote?origin=US&to=Kampala&service=EXPRESS&weight=8&l=50&w=40&h=30&ins=true&value=900` | Door-to-door quote |
| GET | `/api/track/:trackingNo` | Shipment + milestones + ETA |
| POST | `/api/booking` | Create booking → returns tracking number, fires notifications |
| GET | `/api/activity`, `/api/lookups`, `/api/rates/:origin/:service` | Public feeds |
| GET | `/api/admin/stats`, `/api/admin/shipments` | Bearer `X-Admin-Key` |
| POST | `/api/admin/advance` `{trackingNo, code, location, note}` | Move a shipment to a stage; notifies |
| POST | `/api/admin/reset-demo` | Reseed the demo DB (demo only) |

## Configuration reference

See [`.env.example`](.env.example) for every variable and what it does. Key ones:

- `RM_USE_SUPABASE` — `true` to use Supabase, otherwise the demo JSON store.
- `SUPABASE_SERVICE_ROLE_KEY` — service-role secret (server only).
- `ADMIN_KEY` — operations-console key (default `rme-admin-2024` for demo).
- `SENDGRID_API_KEY` / `SMTP_*` / `TWILIO_*` — notification providers.

## Production notes

- The admin console is keyed by a shared secret; for a production deployment add
  a proper auth layer (e.g. Supabase Auth + an `admins` table) on top.
- Rates in `server/rates.js` are illustrative templates; connect live carrier
  tariffs when going to production.
- Contact numbers, office addresses and client names in the demo content are
  placeholders — replace with real RME details before launch.
