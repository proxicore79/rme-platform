/**
 * Unified data-access layer.
 *   backend = 'demo'     → JSON-file store (in-memory + persisted), seeds included.
 *   backend = 'supabase' → @supabase/supabase-js with the service-role key (server only).
 *
 * Row mapping: Supabase columns are snake_case; the app uses camelCase.
 */

import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import WebSocket from 'ws';
import { env, mode } from './config.js';
import { seedShipments } from './seed.js';

/* ------------------------------------------------------------------ */
/* helpers                                                            */
/* ------------------------------------------------------------------ */
const toCamel = (s) => s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
export function mapRow(row) {
  if (!row) return row;
  const out = {};
  for (const k of Object.keys(row)) out[toCamel(k)] = row[k];
  return out;
}
const snake = (s) => s.replace(/[A-Z]/g, (c) => '_' + c.toLowerCase());
/** Map a camelCase row onto the given snake_case column list (only present keys). */
function pickRowFields(row, fields) {
  const out = {};
  for (const f of fields) {
    const key = toCamel(f);
    if (row[key] !== undefined) out[f] = row[key];
  }
  return out;
}

const uuid = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => { const r = (Math.random() * 16) | 0; return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16); });

/** notifications DB column is `to_recip` (TO is reserved in Postgres). */
function mapNotif(row) {
  const out = mapRow(row);
  if (out && 'toRecip' in out) { out.to = out.toRecip; delete out.toRecip; }
  return out;
}

/* ================================================================== */
/* DEMO backend                                                       */
/* ================================================================== */
class DemoStore {
  constructor() {
    this.file = env.demoDataFile;
    this.data = { shipments: [], events: [], notifications: [], meta: { seq: 0 } };
    this._load();
  }
  _load() {
    try {
      if (fs.existsSync(this.file)) {
        const raw = JSON.parse(fs.readFileSync(this.file, 'utf8'));
        this.data = { shipments: [], events: [], notifications: [], meta: { seq: 0 }, ...raw };
        return;
      }
    } catch (e) { /* corrupt file → reseed */ }
    if (env.autoSeedDemo) {
      const { shipments, events, notifications } = seedShipments();
      this.data = { shipments, events, notifications, meta: { seq: 0 } };
      this._persist();
    }
  }
  _persist() {
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    fs.writeFileSync(this.file, JSON.stringify(this.data, null, 2));
  }
  reset() {
    const { shipments, events, notifications } = seedShipments();
    this.data = { shipments, events, notifications, meta: { seq: 0 } };
    this._persist();
    return this.data;
  }
  now() { return new Date().toISOString(); }
  _shipmentPublic(s) {
    return { ...s, events: this.data.events.filter((e) => e.shipmentId === s.id) };
  }

  async listShipments({ search, status, origin, page = 1, per = 20 } = {}) {
    let rows = [...this.data.shipments];
    if (search) {
      const q = String(search).toLowerCase();
      rows = rows.filter((s) =>
        [s.trackingNo, s.sender?.name, s.recipient?.name, s.originCity, s.destinationCity, s.recipient?.email]
          .filter(Boolean).some((v) => String(v).toLowerCase().includes(q)));
    }
    if (status === 'ACTIVE') rows = rows.filter((s) => s.currentStatus !== 'DELIVERED');
    else if (status) rows = rows.filter((s) => s.currentStatus === status);
    if (origin) rows = rows.filter((s) => s.origin === origin);
    const total = rows.length;
    const start = (page - 1) * per;
    rows = rows.slice(start, start + per);
    return { total, page, per, items: rows.map((s) => this._shipmentPublic(s)) };
  }

  async getShipment(ref) {
    const s = this.data.shipments.find((x) => x.id === ref || x.trackingNo === ref);
    return s ? this._shipmentPublic(s) : null;
  }

  async createShipment(fields) {
    const s = {
      id: uuid(),
      trackingNo: fields.trackingNo,
      origin: fields.origin,
      originCity: fields.originCity || '',
      destinationKey: fields.destinationKey,
      destinationCity: fields.destinationCity,
      destinationCountry: fields.destinationCountry,
      service: fields.service,
      stageMode: fields.service === 'SEA' ? 'sea' : 'air',
      currentIndex: fields.currentIndex ?? 0,
      currentStatus: fields.currentStatus || 'REGISTERED',
      sender: fields.sender, recipient: fields.recipient,
      parcel: fields.parcel,
      declaredValueUsd: fields.declaredValueUsd || 0,
      insured: !!fields.insured,
      totalUsd: fields.totalUsd,
      quote: fields.quote || {},
      notifyPrefs: fields.notifyPrefs || { senderEmail: true, senderPhone: false, recipientEmail: true, recipientPhone: false },
      notes: fields.notes || '',
      etaDate: fields.etaDate || null,
      etaMinDate: fields.etaMinDate || null,
      bookedAt: fields.bookedAt || this.now(),
      createdAt: fields.createdAt || this.now(),
      updatedAt: this.now(),
      lastEventAt: fields.lastEventAt || this.now(),
      source: fields.source || 'web',
    };
    this.data.shipments.push(s);
    this._persist();
    return this._shipmentPublic(s);
  }

  async updateShipment(id, patch) {
    const s = this.data.shipments.find((x) => x.id === id);
    if (!s) return null;
    const allowed = ['recipient', 'sender', 'parcel', 'notes', 'etaDate', 'declaredValueUsd', 'insured', 'notifyPrefs', 'totalUsd', 'currentStatus', 'currentIndex', 'lastEventAt', 'deliveredTo', 'onHoldReason', 'service', 'destinationKey', 'destinationCity'];
    for (const k of allowed) if (k in patch) s[k] = patch[k];
    s.updatedAt = this.now();
    this._persist();
    return this._shipmentPublic(s);
  }

  async addEvent({ shipmentId, trackingNo, code, label, location, note, actor, at }) {
    const ev = { id: uuid(), shipmentId, trackingNo, code, label, location, note: note || '', actor, at: at || this.now() };
    this.data.events.push(ev);
    this._persist();
    return ev;
  }
  async listEvents(trackingNo) {
    return this.data.events.filter((e) => e.trackingNo === trackingNo).sort((a, b) => new Date(a.at) - new Date(b.at));
  }
  async insertNotification(n) {
    const row = { id: uuid(), shipmentId: n.shipmentId, trackingNo: n.trackingNo, channel: n.channel, to_recip: n.to, kind: n.kind, subject: n.subject, body: n.body, status: n.status || 'sent', createdAt: new Date().toISOString() };
    this.data.notifications.push(row);
    this._persist();
    return mapNotif(row);
  }
  async listNotifications({ page = 1, per = 30 } = {}) {
    const rows = [...this.data.notifications].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const total = rows.length;
    return { total, page, per, items: rows.slice((page - 1) * per, page * per).map(mapNotif) };
  }
  async stats() {
    const rows = this.data.shipments;
    const now = Date.now();
    const counts = {};
    for (const s of rows) counts[s.currentStatus] = (counts[s.currentStatus] || 0) + 1;
    const active = rows.filter((s) => !['DELIVERED'].includes(s.currentStatus)).length;
    const byOrigin = {};
    for (const s of rows) byOrigin[s.origin] = (byOrigin[s.origin] || 0) + 1;
    const recent = [...this.data.events]
      .sort((a, b) => new Date(b.at) - new Date(a.at)).slice(0, 12)
      .map((e) => ({ id: e.id, trackingNo: e.trackingNo, code: e.code, label: e.label, location: e.location, at: e.at }));
    return {
      total: rows.length, active, delivered: counts['DELIVERED'] || 0, exceptions: (counts['ON_HOLD'] || 0) + (counts['ADDRESS_ISSUE'] || 0),
      revenueUsd: rows.reduce((a, s) => a + (s.totalUsd || 0), 0),
      bookedToday: rows.filter((s) => new Date(s.bookedAt).toDateString() === new Date().toDateString()).length,
      byOrigin, byStatus: counts,
      notificationsSent: this.data.notifications.length,
      recent,
      updatedAt: new Date().toISOString(),
    };
  }
  activity() {
    const ev = [...this.data.events].sort((a, b) => new Date(b.at) - new Date(a.at)).slice(0, 20);
    const ntf = [...this.data.notifications].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 20);
    return { events: ev, notifications: ntf };
  }
  async upsertBulk(kind, rows) { this.data[kind] = rows; this._persist(); return rows; }
  async demoPackages() {
    const rows = [...this.data.shipments].sort((a, b) => new Date(b.bookedAt) - new Date(a.bookedAt)).slice(0, 6);
    return rows.map((s) => ({ trackingNo: s.trackingNo, origin: s.origin, destination: s.destinationCity, service: s.service, status: s.currentStatus }));
  }
}

/* ================================================================== */
/* SUPABASE backend                                                   */
/* ================================================================== */
const FIELDS_SHIPMENT = ['tracking_no', 'origin', 'origin_city', 'destination_key', 'destination_city', 'destination_country', 'service', 'stage_mode', 'current_index', 'current_status', 'sender', 'recipient', 'parcel', 'declared_value_usd', 'insured', 'total_usd', 'quote', 'notify_prefs', 'notes', 'eta_date', 'eta_min_date', 'booked_at', 'source', 'delivered_to', 'on_hold_reason', 'last_event_at'];
const FIELDS_EVENT = ['shipment_id', 'tracking_no', 'code', 'label', 'location', 'note', 'actor', 'at'];
const FIELDS_NOTIF = ['shipment_id', 'tracking_no', 'channel', 'to', 'kind', 'subject', 'body', 'status'];

class SupabaseStore {
  constructor() {
    if (!env.supabaseServiceKey) throw new Error('RM_USE_SUPABASE=true requires SUPABASE_SERVICE_ROLE_KEY');
    // Node <22 has no native WebSocket; supabase-js needs one for its realtime
    // client even though we only use REST — so we hand it the `ws` package.
    this.sb = createClient(env.supabaseUrl, env.supabaseServiceKey, {
      auth: { persistSession: false },
      realtime: { transport: WebSocket },
    });
  }
  _err(e) { throw new Error(`Supabase: ${e?.message || e}`); }

  async listShipments({ search, status, origin, page = 1, per = 20 } = {}) {
    let q = this.sb.from('shipments').select('*', { count: 'exact' }).order('booked_at', { ascending: false }).range((page - 1) * per, page * per - 1);
    if (search) q = q.or(`tracking_no.ilike.%${search}%,sender->>name.ilike.%${search}%,recipient->>name.ilike.%${search}%`);
    if (status === 'ACTIVE') q = q.not('current_status', 'in', '("DELIVERED")');
    else if (status) q = q.eq('current_status', status);
    if (origin) q = q.eq('origin', origin);
    const { data, error, count } = await q;
    if (error) this._err(error);
    return { total: count || 0, page, per, items: data.map(mapRow) };
  }

  async getShipment(ref) {
    const col = String(ref).startsWith('RME') ? 'tracking_no' : 'id';
    const { data, error } = await this.sb.from('shipments').select('*').eq(col, ref).maybeSingle();
    if (error) this._err(error);
    if (!data) return null;
    const shipment = mapRow(data);
    const { data: events } = await this.sb.from('status_events').select('*').eq('shipment_id', shipment.id).order('at', { ascending: true });
    shipment.events = (events || []).map(mapRow);
    return shipment;
  }

  async createShipment(fields) {
    const row = pickRowFields(fields, FIELDS_SHIPMENT);
    const { data, error } = await this.sb.from('shipments').insert(row).select('*').single();
    if (error) this._err(error);
    const { data: events } = await this.sb.from('status_events').select('*').eq('shipment_id', data.id).order('at', { ascending: true });
    const s = mapRow(data);
    s.events = (events || []).map(mapRow);
    return s;
  }

  async updateShipment(id, patch) {
    const row = pickRowFields(patch, FIELDS_SHIPMENT);
    const { data, error } = await this.sb.from('shipments').update(row).eq('id', id).select('*').single();
    if (error) this._err(error);
    return mapRow(data);
  }

  async addEvent(fields) {
    const row = pickRowFields(fields, FIELDS_EVENT);
    const { data, error } = await this.sb.from('status_events').insert(row).select('*').single();
    if (error) this._err(error);
    return mapRow(data);
  }
  async listEvents(trackingNo) {
    const { data, error } = await this.sb.from('status_events').select('*').eq('tracking_no', trackingNo).order('at', { ascending: true });
    if (error) this._err(error);
    return (data || []).map(mapRow);
  }
  async insertNotification(n) {
    const row = {
      shipment_id: n.shipmentId, tracking_no: n.trackingNo, channel: n.channel,
      to_recip: n.to, kind: n.kind, subject: n.subject, body: n.body,
      status: n.status || 'sent',
    };
    const { data, error } = await this.sb.from('notifications').insert(row).select('*').single();
    if (error) this._err(error);
    return mapNotif(data);
  }
  async listNotifications({ page = 1, per = 30 } = {}) {
    let q = this.sb.from('notifications').select('*', { count: 'exact' }).order('created_at', { ascending: false }).range((page - 1) * per, page * per - 1);
    const { data, error, count } = await q;
    if (error) this._err(error);
    return { total: count || 0, page, per, items: (data || []).map(mapNotif) };
  }
  async stats() {
    const { data: rows, error } = await this.sb.from('shipments').select('current_status,origin,total_usd,booked_at');
    if (error) this._err(error);
    const counts = {}; const byOrigin = {};
    let revenueUsd = 0; let bookedToday = 0;
    for (const r of rows) {
      counts[r.current_status] = (counts[r.current_status] || 0) + 1;
      byOrigin[r.origin] = (byOrigin[r.origin] || 0) + 1;
      revenueUsd += r.total_usd || 0;
      if (new Date(r.booked_at).toDateString() === new Date().toDateString()) bookedToday += 1;
    }
    const active = rows.filter((r) => r.current_status !== 'DELIVERED').length;
    const { data: recent } = await this.sb.from('status_events').select('id,tracking_no,code,label,location,at').order('at', { ascending: false }).limit(12);
    const { count: notifCount } = await this.sb.from('notifications').select('*', { count: 'exact', head: true });
    return {
      total: rows.length, active, delivered: counts['DELIVERED'] || 0, exceptions: (counts['ON_HOLD'] || 0) + (counts['ADDRESS_ISSUE'] || 0),
      revenueUsd, bookedToday, byOrigin, byStatus: counts,
      notificationsSent: notifCount || 0,
      recent: (recent || []).map(mapRow),
      updatedAt: new Date().toISOString(),
    };
  }
  async activity() {
    const { data: events } = await this.sb.from('status_events').select('*').order('at', { ascending: false }).limit(20);
    const { data: notifications } = await this.sb.from('notifications').select('*').order('created_at', { ascending: false }).limit(20);
    return { events: (events || []).map(mapRow), notifications: (notifications || []).map(mapRow) };
  }
  async demoPackages() {
    const { data, error } = await this.sb.from('shipments').select('tracking_no,origin,destination_city,service,current_status').order('booked_at', { ascending: false }).limit(6);
    if (error) this._err(error);
    return (data || []).map((r) => ({ trackingNo: r.tracking_no, origin: r.origin, destination: r.destination_city, service: r.service, status: r.current_status }));
  }

  /**
   * Seed demo content when the project is empty so the console and tracking
   * demos are alive on first boot. Safe to call on every start (no-op if rows exist).
   */
  async ensureSeeded() {
    const { count } = await this.sb.from('shipments').select('*', { count: 'exact', head: true });
    if ((count ?? 0) > 0) return false;
    const { shipments, notifications } = seedShipments();
    const idByTracking = {};
    for (const s of shipments) {
      const created = await this.createShipment(s);
      idByTracking[s.trackingNo] = created.id;
      for (const e of s.events || []) {
        await this.addEvent({
          shipmentId: created.id, trackingNo: e.trackingNo, code: e.code,
          label: e.label, location: e.location, note: e.note, actor: e.actor, at: e.at,
        });
      }
    }
    for (const n of notifications) {
      if (!idByTracking[n.trackingNo]) continue;
      await this.insertNotification({ ...n, shipmentId: idByTracking[n.trackingNo] });
    }
    return true;
  }
}

let store;
export function getStore() {
  if (!store) store = mode === 'supabase' ? new SupabaseStore() : new DemoStore();
  return store;
}
export { mode, uuid };
