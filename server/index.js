/**
 * Royal Mail Express International — Express application.
 * Serves the marketing site, quote & booking, live tracking with a full
 * timeline, notification dispatch and the admin console.
 *
 * Storage backend: demo JSON store by default, or live Supabase when
 * RM_USE_SUPABASE=true (+ the schema in /supabase/schema.sql applied).
 */
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import express from 'express';
import { env, mode, describeMode } from './config.js';
import { getStore } from './db.js';
import { parseTracking, makeTracking, originFromTracking } from './tracking.js';
import { quoteLane, FX_USD } from './rates.js';
import { ORIGINS, DESTINATIONS, SERVICES, STAGES_AIR, STAGES_SEA, stageListFor, stageFor, findOrigin, findDestination, findService, EXCEPTION_STATUSES } from './catalogue.js';
import { sendNotifications } from './notify.js';
import { renderPage } from './render.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const app = express();

app.disable('x-powered-by');
app.use(express.json({ limit: '300kb' }));

/* ------------------------------------------------------------- */
/* Static assets                                                  */
/* ------------------------------------------------------------- */
app.use('/css', express.static(path.join(ROOT, 'public/css')));
app.use('/js', express.static(path.join(ROOT, 'public/js')));
app.use('/img', express.static(path.join(ROOT, 'public/img'), { maxAge: '1h' }));

/* ------------------------------------------------------------- */
/* Shared helpers                                                 */
/* ------------------------------------------------------------- */
const site = {
  name: 'Royal Mail Express International',
  short: 'RME International',
  url: 'http://localhost',
};

const ok = (res, data) => res.json({ ok: true, ...data });
const fail = (res, status, error) => res.status(status).json({ ok: false, error });

function bearerKey(req) {
  const h = req.headers.authorization || '';
  if (h.startsWith('Bearer ')) return h.slice(7);
  if (req.headers['x-admin-key']) return req.headers['x-admin-key'];
  if (req.query.key) return String(req.query.key);
  return '';
}

function isAdmin(req) {
  return bearerKey(req) === env.adminKey;
}

function requireAdmin(req, res, next) {
  if (!isAdmin(req)) return res.status(401).json({ ok: false, error: 'Admin access denied.' });
  next();
}

async function buildTrackResponse(trackingNo) {
  const store = getStore();
  const parsed = parseTracking(trackingNo);
  if (!parsed) throw Object.assign(new Error('That does not look like a valid RME tracking number. Format: RME-US-260901-123456-00'), { code: 400 });
  const shipment = await store.getShipment(parsed);
  if (!shipment) throw Object.assign(new Error(`No shipment found for ${parsed}. Double-check the number or contact our support desk.`), { code: 404 });

  const stageList = stageListFor(shipment.service);
  const reached = new Set((shipment.events || []).map((e) => e.code));
  const now = Date.now();
  const milestones = stageList.map((s, i) => {
    const event = (shipment.events || []).filter((e) => e.code === s.code).sort((a, b) => new Date(b.at) - new Date(a.at))[0];
    const reachedIdx = reached.has(s.code) ? i : (shipment.events || []).some((e) => stageList.findIndex((x) => x.code === e.code) === i);
    let state = 'todo';
    if (reached.has(s.code)) state = i < shipment.currentIndex ? 'done' : 'active';
    else if (i < shipment.currentIndex) state = 'done';
    else if (i === shipment.currentIndex) state = 'active';
    return {
      code: s.code, label: s.label, icon: s.icon, hint: s.hint, i,
      state,
      location: event?.location || null,
      at: event?.at || null,
      note: event?.note || '',
    };
  });
  const exceptions = EXCEPTION_STATUSES.filter((e) => reached.has(e.code)).map((e) => {
    const ev = (shipment.events || []).filter((x) => x.code === e.code).pop();
    return { ...e, location: ev?.location, at: ev?.at, note: ev?.note || shipment.onHoldReason || '' };
  });

  const eta = {
    date: shipment.etaDate || null,
    windowText: deliveryWindowText(shipment),
  };

  return { shipment: publicShipment(shipment), milestones, exceptions, eta, statusMeta: stageFor(shipment.service, shipment.currentStatus) };
}

function publicShipment(s) {
  const { events, quote, ...rest } = s;
  const origin = findOrigin(s.origin);
  const dest = findDestination(s.destinationKey);
  const serv = findService(s.service);
  return {
    ...rest,
    originFlag: origin?.flag, destinationFlag: dest?.flag,
    serviceName: serv?.name, serviceIcon: serv?.icon,
    timelineLength: stageListFor(s.service).length,
  };
}

function deliveryWindowText(s) {
  if (s.currentStatus === 'DELIVERED') return 'Delivered';
  if (!s.etaDate) return 'Estimated delivery window shown on the timeline';
  const d = new Date(s.etaDate).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  return `Estimated delivery by ${d}`;
}

/* ------------------------------------------------------------- */
/* JSON API — public                                              */
/* ------------------------------------------------------------- */
app.get('/api/health', (req, res) => ok(res, { service: site.name, backend: mode, ...describeMode(), time: new Date().toISOString() }));

app.get('/api/lookups', (req, res) => {
  ok(res, {
    origins: ORIGINS, destinations: DESTINATIONS, services: SERVICES,
    stages: { air: STAGES_AIR, sea: STAGES_SEA }, exceptions: EXCEPTION_STATUSES,
    fx: FX_USD,
    currencies: { US: 'USD', UK: 'GBP', CN: 'CNY' },
  });
});

app.get('/api/quote', (req, res) => {
  try {
    const q = {
      origin: req.query.origin, destinationKey: req.query.to,
      serviceCode: req.query.service, weightKg: parseFloat(req.query.weight),
      dims: req.query.l && req.query.w && req.query.h ? { l: +req.query.l, w: +req.query.w, h: +req.query.h } : null,
      declaredValue: parseFloat(req.query.value || 0), insured: req.query.ins === 'true' || req.query.ins === '1',
    };
    if (!q.origin || !q.destinationKey || !q.serviceCode || !(q.weightKg > 0)) return fail(res, 400, 'origin, to, service and weight are required.');
    const quote = quoteLane(q);
    const origin = findOrigin(q.origin);
    const dest = findDestination(q.destinationKey);
    ok(res, { quote, lane: { origin: origin.short, destination: `${dest.city ?? dest.key}, ${dest.country}`, service: findService(q.serviceCode).name } });
  } catch (e) {
    fail(res, 400, e.message);
  }
});

app.get('/api/rates/:origin/:service', (req, res) => {
  try {
    const matrix = [1, 5, 10, 20, 45, 100, 250].map((kg) => {
      const q = quoteLane({ origin: req.params.origin, destinationKey: 'Kampala', serviceCode: req.params.service, weightKg: kg, declaredValue: 0, insured: false });
      return { kg, total: q.total, perKg: Math.round((q.total / kg) * 100) / 100 };
    });
    ok(res, { origin: req.params.origin, service: req.params.service, rows: matrix });
  } catch (e) {
    fail(res, 400, e.message);
  }
});

app.get('/api/track/:tracking', async (req, res) => {
  try {
    const data = await buildTrackResponse(req.params.tracking);
    ok(res, data);
  } catch (e) {
    fail(res, e.code || 500, e.message);
  }
});

/* Booking → creates the shipment, issues the tracking number, notifies. */
app.post('/api/booking', async (req, res) => {
  try {
    const b = req.body || {};
    const { origin, destinationKey, service, parcel, sender, recipient } = b;
    const weight = parseFloat(parcel?.weightKg);
    if (!origin || !destinationKey || !service || !(weight > 0)) return fail(res, 400, 'origin, destination (to), service and parcel weight are required.');
    if (!findOrigin(origin)) return fail(res, 400, 'Unknown origin.');
    if (!findDestination(destinationKey)) return fail(res, 400, 'Unknown destination.');
    if (!findService(service)) return fail(res, 400, 'Unknown service.');
    if (!sender?.name) return fail(res, 400, 'Sender name is required.');
    if (!recipient?.name) return fail(res, 400, 'Recipient name is required.');
    if (!recipient?.phone && !recipient?.email) return fail(res, 400, 'Recipient phone or email is required for delivery notifications.');

    const insured = Boolean(b.insured);
    const declared = parseFloat(b.declaredValueUsd || b.declaredValue || 0);
    const quote = quoteLane({
      origin, destinationKey, serviceCode: service, weightKg: weight,
      dims: parcel?.dims && (parcel.dims.l || parcel.dims.w || parcel.dims.h) ? parcel.dims : null,
      declaredValue: declared, insured,
    });

    const dest = findDestination(destinationKey);
    const store = getStore();
    const trackingNo = makeTracking(origin);
    const shipment = await store.createShipment({
      trackingNo, origin,
      originCity: b.originCity || `${findOrigin(origin).short} (origins nationwide)`,
      destinationKey, destinationCity: dest.city || dest.key, destinationCountry: dest.country,
      service,
      currentIndex: 0, currentStatus: 'REGISTERED',
      sender: { name: sender.name, phone: sender.phone || '', email: sender.email || '' },
      recipient: { name: recipient.name, phone: recipient.phone || '', email: recipient.email || '' },
      parcel: {
        description: parcel.description || 'General cargo',
        weightKg: weight, pieces: parseInt(parcel.pieces) || 1,
        dims: parcel.dims || null, valueUsd: declared,
      },
      declaredValueUsd: declared, insured,
      totalUsd: quote.total, quote,
      notifyPrefs: b.notifyPrefs || { senderEmail: true, senderPhone: false, recipientEmail: true, recipientPhone: false },
      notes: b.notes || '',
      etaDate: new Date(quote.etaDate + 'T18:00:00Z').toISOString(),
      etaMinDate: new Date(quote.minDate + 'T18:00:00Z').toISOString(),
      source: 'web',
    });
    const ev = await store.addEvent({
      shipmentId: shipment.id, trackingNo, code: 'REGISTERED', label: stageFor(service, 'REGISTERED').label,
      location: `${originCityLabel(origin)} → ${dest.city}`, note: 'Booking received. Tracking number issued.',
      actor: 'customer service', at: new Date().toISOString(),
    });
    const notifRows = await sendNotifications({ shipmentId: shipment.id, trackingNo, kind: 'booking', shipment, event: ev, notifyPrefs: b.notifyPrefs });

    ok(res, {
      trackingNo, totalUsd: quote.total, currency: quote.currency,
      etaDate: shipment.etaDate, warnings: quote.warnings,
      notified: notifRows.map((r) => ({ channel: r.channel, to: r.to, status: r.status })),
    });
  } catch (e) {
    fail(res, 400, e.message);
  }
});

/* Subscribe to push status updates by email/sms */
app.get('/api/activity', async (req, res) => {
  try {
    const store = getStore();
    const items = (await store.listShipments({ per: 40 })).items.map((s) => s.trackingNo);
    const evs = [];
    for (const t of items.slice(0, 5)) {
      const events = await store.listEvents(t);
      const e = events.filter((x) => !['REGISTERED'].includes(x.code)).pop();
      if (e) evs.push({ trackingNo: t, code: e.code, label: e.label, location: e.location, at: e.at });
    }
    evs.sort((a, b) => new Date(b.at) - new Date(a.at));
    ok(res, { items: evs.slice(0, 8) });
  } catch (e) { fail(res, 500, e.message); }
});

app.post('/api/subscribe', async (req, res) => {
  const { trackingNo, email, phone } = req.body || {};
  const parsed = parseTracking(trackingNo);
  const store = getStore();
  const shipment = parsed ? await store.getShipment(parsed) : null;
  if (!shipment) return fail(res, 404, 'Shipment not found.');
  ok(res, { message: 'Subscription recorded — you will receive an update on the next status change.' });
});

app.post('/api/contact', (req, res) => {
  const { name, email, message } = req.body || {};
  if (!name || !message) return fail(res, 400, 'Name and message are required.');
  ok(res, { message: `Thank you ${name}, our Kampala team will reply within one business day.` });
});

/* ------------------------------------------------------------- */
/* Admin JSON API (requires admin key)                            */
/* ------------------------------------------------------------- */
app.use('/api/admin', requireAdmin);

app.get('/api/admin/meta', (req, res) => ok(res, {
  adminKeyHint: 'Pass header X-Admin-Key (or ?key=) — configured via ADMIN_KEY env. Default for demo: rme-admin-2024',
  backend: mode, env: describeMode(),
}));

app.get('/api/admin/stats', async (req, res) => {
  try {
    const store = getStore();
    const stats = await store.stats();
    ok(res, { stats, backend: mode, backendReady: describeMode() });
  } catch (e) { fail(res, 500, e.message); }
});

app.get('/api/admin/shipments', async (req, res) => {
  try {
    const store = getStore();
    const { total, page, per, items } = await store.listShipments({
      search: req.query.search, status: req.query.status, origin: req.query.origin,
      page: parseInt(req.query.page) || 1, per: parseInt(req.query.per) || 20,
    });
    ok(res, { total, page, per, shipments: items.map((s) => ({ ...s, eventsCount: s.events?.length || 0, events: undefined })) });
  } catch (e) { fail(res, 500, e.message); }
});

app.get('/api/admin/shipments/:ref', async (req, res) => {
  try {
    const store = getStore();
    const s = await store.getShipment(req.params.ref);
    if (!s) return fail(res, 404, 'Shipment not found.');
    ok(res, { shipment: publicShipment(s), timeline: await buildTrackResponse(s.trackingNo) });
  } catch (e) { fail(res, 500, e.message); }
});

app.post('/api/admin/shipments', async (req, res) => {
  try {
    const b = req.body || {};
    const { origin, destinationKey, service, parcel, sender, recipient } = b;
    const weight = parseFloat(parcel?.weightKg);
    if (!origin || !destinationKey || !service || !(weight > 0)) return fail(res, 400, 'origin, destinationKey, service and weight required.');
    const store = getStore();
    const dest = findDestination(destinationKey);
    const trackingNo = makeTracking(origin);
    const declared = parseFloat(b.declaredValueUsd || 0);
    const shipment = await store.createShipment({
      trackingNo, origin, originCity: b.originCity || 'Origin (manual)',
      destinationKey, destinationCity: dest.city || dest.key, destinationCountry: dest.country,
      service, currentIndex: 0, currentStatus: 'REGISTERED',
      sender: { name: sender?.name || '—', phone: sender?.phone || '', email: sender?.email || '' },
      recipient: { name: recipient?.name || '—', phone: recipient?.phone || '', email: recipient?.email || '' },
      parcel: { description: parcel?.description || 'General cargo', weightKg: weight, pieces: parseInt(parcel?.pieces) || 1, dims: parcel?.dims || null, valueUsd: declared },
      declaredValueUsd: declared, insured: !!b.insured, totalUsd: parseFloat(b.totalUsd) || 0,
      notifyPrefs: { senderEmail: true, senderPhone: false, recipientEmail: true, recipientPhone: false },
      notes: b.notes || '', etaDate: b.etaDate ? new Date(b.etaDate).toISOString() : null, source: 'admin',
    });
    await store.addEvent({ shipmentId: shipment.id, trackingNo, code: 'REGISTERED', label: 'Shipment registered', location: b.originCity || 'Origin', note: 'Manual registration by operations team.', actor: 'operations', at: new Date().toISOString() });
    ok(res, { shipment: publicShipment(shipment) });
  } catch (e) { fail(res, 500, e.message); }
});

/* Advance a shipment's status: {code, location, note} — dispatches notifications. */
app.post('/api/admin/advance', async (req, res) => {
  try {
    const { trackingNo, code, location, note } = req.body || {};
    const parsed = parseTracking(trackingNo);
    const store = getStore();
    const shipment = parsed ? await store.getShipment(parsed) : null;
    if (!shipment) return fail(res, 404, 'Shipment not found.');
    const stageList = stageListFor(shipment.service);
    const exception = EXCEPTION_STATUSES.find((e) => e.code === code);
    const stage = stageList.find((s) => s.code === code);
    if (!stage && !exception) return fail(res, 400, `Unknown stage code "${code}".`);
    if (shipment.currentStatus === 'DELIVERED') return fail(res, 409, 'Shipment already delivered.');

    const isException = Boolean(exception);
    const newIndex = isException ? Math.min(shipment.currentIndex, stageList.length - 1) : stageList.findIndex((s) => s.code === code);
    const label = (isException ? exception : stage).label;
    const meta = isException ? exception : stage;
    const at = new Date().toISOString();

    await store.updateShipment(shipment.id, {
      currentStatus: code,
      currentIndex: newIndex,
      onHoldReason: code === 'ON_HOLD' ? note || shipment.onHoldReason : (code === 'CUSTOMS_CLEARANCE' || code === 'CUSTOMS_CLEARED' ? null : shipment.onHoldReason),
      etaDate: code === 'DELIVERED' || code === 'OUT_FOR_DELIVERY' ? at : shipment.etaDate,
      deliveredTo: code === 'DELIVERED' ? note || null : null,
      lastEventAt: at,
    });

    const ev = await store.addEvent({
      shipmentId: shipment.id, trackingNo: parsed, code, label,
      location: location || shipment.destinationCity,
      note: note || meta.hint, actor: 'RME operations', at,
    });

    const refreshed = await store.getShipment(parsed);
    const notifRows = await sendNotifications({ shipmentId: shipment.id, trackingNo: parsed, kind: 'status', shipment: refreshed, event: ev, notifyPrefs: refreshed.notifyPrefs });
    const track = await buildTrackResponse(parsed);
    ok(res, { event: ev, notifications: notifRows.map((r) => ({ channel: r.channel, to: r.to, status: r.status })), track });
  } catch (e) { fail(res, 500, e.message); }
});

/* Directly set status incl. exceptions: {status, reason?, deliveredTo?} */
app.post('/api/admin/set-status', async (req, res) => {
  try {
    const { id, status, reason, deliveredTo } = req.body || {};
    const store = getStore();
    const shipment = await store.getShipment(id);
    if (!shipment) return fail(res, 404, 'Shipment not found.');
    const stageList = stageListFor(shipment.service);
    const stage = stageList.find((s) => s.code === status);
    const exception = EXCEPTION_STATUSES.find((e) => e.code === status);
    if (!stage && !exception) return fail(res, 400, 'Unknown status code.');
    const newIndex = stage ? stageList.findIndex((s) => s.code === status) : shipment.currentIndex;
    await store.updateShipment(shipment.id, { currentStatus: status, currentIndex: newIndex, onHoldReason: reason || null, deliveredTo: deliveredTo || null });
    const updated = await store.getShipment(shipment.id);
    const ev = await store.addEvent({
      shipmentId: shipment.id, trackingNo: shipment.trackingNo, code: status, label: (stage || exception).label,
      location: shipment.destinationCity, note: reason || (stage || exception).hint, actor: 'RME operations', at: new Date().toISOString(),
    });
    const notifRows = await sendNotifications({ shipmentId: shipment.id, trackingNo: shipment.trackingNo, kind: 'status', shipment: updated, event: ev, notifyPrefs: updated.notifyPrefs });
    ok(res, { shipment: publicShipment(updated), notifications: notifRows.map((r) => ({ channel: r.channel, status: r.status })) });
  } catch (e) { fail(res, 500, e.message); }
});

app.post('/api/admin/delete-shipment', async (req, res) => {
  try {
    const { id } = req.body || {};
    const store = getStore();
    if (mode === 'demo') {
      const idx = store.data.shipments.findIndex((s) => s.id === id);
      if (idx < 0) return fail(res, 404, 'Shipment not found.');
      store.data.shipments.splice(idx, 1);
      store.data.events = store.data.events.filter((e) => e.shipmentId !== id);
      store._persist();
      return ok(res, { deleted: true });
    }
    const { error } = await store.sb.from('shipments').delete().eq('id', id);
    if (error) throw error;
    ok(res, { deleted: true });
  } catch (e) { fail(res, 500, e.message); }
});

app.post('/api/admin/reset-demo', async (req, res) => {
  try {
    const store = getStore();
    if (mode !== 'demo') return fail(res, 400, 'Reset is only available on the demo backend.');
    const d = store.reset();
    ok(res, { reset: true, shipments: d.shipments.length });
  } catch (e) { fail(res, 500, e.message); }
});

app.get('/api/admin/activity', async (req, res) => {
  try {
    const store = getStore();
    ok(res, store.activity());
  } catch (e) { fail(res, 500, e.message); }
});

app.get('/api/admin/notifications', async (req, res) => {
  try {
    const store = getStore();
    const { total, page, per, items } = await store.listNotifications({ page: parseInt(req.query.page) || 1, per: parseInt(req.query.per) || 40 });
    ok(res, { total, page, per, notifications: items });
  } catch (e) { fail(res, 500, e.message); }
});

/* ------------------------------------------------------------- */
/* Pages (server-rendered)                                        */
/* ------------------------------------------------------------- */
const ctx = (req, extra = {}) => ({
  req, site, origins: ORIGINS, destinations: DESTINATIONS, services: SERVICES,
  adminKey: env.adminKey, backend: mode, ...extra,
});

app.get('/', (req, res) => res.send(renderPage('home', ctx(req))));
app.get('/services.html', (req, res) => res.send(renderPage('services', ctx(req))));
app.get('/quote.html', (req, res) => res.send(renderPage('quote', ctx(req))));
app.get('/book.html', (req, res) => res.send(renderPage('book', ctx(req))));
app.get('/track.html', (req, res) => res.send(renderPage('track', ctx(req, { tracking: req.query.q }))));
app.get('/admin.html', (req, res) => res.send(renderPage('admin', ctx(req, { presetKey: req.query.key }))));
app.get('/contact.html', (req, res) => res.send(renderPage('contact', ctx(req))));
app.get('/about.html', (req, res) => res.send(renderPage('about', ctx(req))));

// Friendly route aliases
app.get('/track', (req, res) => res.redirect(301, '/track.html?q=' + encodeURIComponent(req.query.q || '')));
app.get('/services', (req, res) => res.redirect(301, '/services.html'));
app.get('/quote', (req, res) => res.redirect(301, '/quote.html'));
app.get('/book', (req, res) => res.redirect(301, '/book.html'));
app.get('/admin', (req, res) => res.redirect(301, '/admin.html'));

app.get('/favicon.ico', (req, res) => res.status(204).end());

/* 404 + error handlers */
app.use((req, res) => res.status(404).send(renderPage('404', ctx(req))));
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ ok: false, error: 'Internal server error' });
});

const PORT = env.PORT;

/**
 * Only seed-and-listen when run directly (`node server/index.js`).
 * When this module is imported by a serverless adapter (Netlify/Vercel) the
 * caller only wants the configured Express `app`, never a listening socket.
 */
const isMain =
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (isMain) {
  // In Supabase mode, seed the project with demo shipments on first boot if empty.
  (async function bootstrap() {
    try {
      const store = getStore();
      if (mode === 'supabase') {
        const seeded = await store.ensureSeeded();
        if (seeded) console.log('Supabase project was empty — seeded demo shipments.');
      }
    } catch (e) {
      console.error('Bootstrap note (continuing in current backend):', e.message);
    }
  })();

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n  Royal Mail Express International`);
    console.log(`  backend : ${mode}${mode === 'supabase' ? ` (${describeMode().project})` : ' (built-in demo DB)'}`);
    console.log(`  url     : http://0.0.0.0:${PORT}\n`);
  });
}

export { app };

function originCityLabel(code) {
  const o = findOrigin(code);
  return o ? o.name : code;
}
