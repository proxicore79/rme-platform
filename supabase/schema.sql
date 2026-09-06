-- =====================================================================
-- Royal Mail Express International — Supabase schema (PostgreSQL)
-- Paste into: Supabase Dashboard → SQL Editor → New query → Run.
-- The server talks to these tables with the SERVICE_ROLE key.
-- =====================================================================

create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------
-- SHIPMENTS
-- ----------------------------------------------------------------
create table if not exists public.shipments (
  id                    uuid primary key default gen_random_uuid(),
  tracking_no           text not null unique,
  origin                text not null check (origin in ('US','UK','CN')),
  origin_city           text not null default '',
  destination_key       text not null,
  destination_city      text not null,
  destination_country   text not null default 'Uganda',
  service               text not null check (service in ('EXPRESS','STANDARD','SEA')),
  stage_mode            text not null default 'air' check (stage_mode in ('air','sea')),
  current_index         int  not null default 0,
  current_status        text not null default 'REGISTERED',
  sender                jsonb not null default '{}'::jsonb,
  recipient             jsonb not null default '{}'::jsonb,
  parcel                jsonb not null default '{}'::jsonb,
  declared_value_usd    numeric(12,2) not null default 0,
  insured               boolean not null default false,
  total_usd             numeric(12,2) not null default 0,
  quote                 jsonb not null default '{}'::jsonb,
  notify_prefs          jsonb not null default '{}'::jsonb,
  notes                 text not null default '',
  eta_date              timestamptz,
  eta_min_date          timestamptz,
  last_event_at         timestamptz default now(),
  booked_at             timestamptz not null default now(),
  source                text not null default 'web',
  delivered_to          text,
  on_hold_reason        text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
create index if not exists idx_shipments_tracking  on public.shipments (tracking_no);
create index if not exists idx_shipments_status    on public.shipments (current_status);
create index if not exists idx_shipments_origin    on public.shipments (origin);
create index if not exists idx_shipments_booked    on public.shipments (booked_at desc);

-- ----------------------------------------------------------------
-- STATUS EVENTS  (the tracking timeline)
-- ----------------------------------------------------------------
create table if not exists public.status_events (
  id          uuid primary key default gen_random_uuid(),
  shipment_id uuid not null references public.shipments (id) on delete cascade,
  tracking_no text not null,
  code        text not null,
  label       text not null,
  location    text not null default '',
  note        text not null default '',
  actor       text not null default 'RME operations',
  at          timestamptz not null default now(),
  created_at  timestamptz not null default now()
);
create index if not exists idx_events_shipment on public.status_events (shipment_id, at asc);

-- ----------------------------------------------------------------
-- NOTIFICATIONS  (outbound email / sms / in-app log)
-- ----------------------------------------------------------------
create table if not exists public.notifications (
  id          uuid primary key default gen_random_uuid(),
  shipment_id uuid references public.shipments (id) on delete cascade,
  tracking_no text not null default '',
  channel     text not null default 'email' check (channel in ('email','sms','app')),
  to_recip    text,
  kind        text not null default 'status' check (kind in ('status','booking','system','reminder')),
  subject     text not null default '',
  body        text not null default '',
  status      text not null default 'simulated' check (status in ('sent','simulated','failed')),
  created_at  timestamptz not null default now()
);
create index if not exists idx_notifs_shipment on public.notifications (shipment_id, created_at desc);

-- ----------------------------------------------------------------
-- (Optional) tracking subscribers — request status by email/sms.
-- Enable RLS + Supabase Auth later if you want public self-service.
-- ----------------------------------------------------------------
create table if not exists public.tracking_subscribers (
  id          uuid primary key default gen_random_uuid(),
  tracking_no text not null,
  email       text,
  phone       text,
  created_at  timestamptz not null default now()
);

-- ----------------------------------------------------------------
-- Updated-at trigger
-- ----------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_shipments_updated on public.shipments;
create trigger trg_shipments_updated
  before update on public.shipments
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------
-- RLS (defence in depth — the server bypasses via service-role key)
-- ----------------------------------------------------------------
alter table public.shipments enable row level security;
alter table public.status_events enable row level security;
alter table public.notifications enable row level security;

create policy "Public can track by number (read shipments)"
  on public.shipments for select
  using (true);

create policy "Authenticated admins full access"
  on public.shipments for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create policy "Events readable by tracking number"
  on public.status_events for select
  using (true);

create policy "Notifications internal only"
  on public.notifications for select
  using (auth.role() = 'service_role' or auth.role() = 'authenticated');

grant all on public.shipments, public.status_events, public.notifications, public.tracking_subscribers to service_role;

-- ----------------------------------------------------------------
-- Extra column for parity with the app model (safe to run twice):
-- ----------------------------------------------------------------
alter table public.shipments add column if not exists last_event_at timestamptz default now();

-- Done. Verify with:
--   select count(*) from public.shipments;
