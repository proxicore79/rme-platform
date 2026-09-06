/**
 * Demo seed data — realistic international shipments across all three origin
 * lanes (US / UK / China) at different points in the journey, plus a fully
 * delivered shipment and one delivery exception, so the admin console and
 * tracking pages look alive on first run.
 */
import { makeTracking } from './tracking.js';
import { stageListFor, stageFor, addBusinessDays } from './catalogue.js';

let n = 0;
const hoursAgo = (h, base = Date.now()) => new Date(base - h * 3600_000).toISOString();
const future = (days) => addBusinessDays(new Date(), days).toISOString();

function build({ id, trackingNo, origin, originCity, gateway, destinationKey, destinationCity, destinationCountry, countryFlag, service, sender, recipient, parcel, declaredValueUsd, insured, totalUsd, stageCodes, startedHoursAgo, hourSpacing, notes }) {
  const events = [];
  const labels = stageListFor(service);
  stageCodes.forEach((code, i) => {
    const meta = stageFor(service, code);
    const at = hoursAgo(startedHoursAgo - i * hourSpacing);
    let location = originCity;
    if (code === 'ARRIVED_ORIGIN_HUB') location = `${originCity} · RME export hub`;
    if (['DEPARTED_ORIGIN', 'IN_TRANSIT', 'ARRIVED_GATEWAY'].includes(code)) location = service === 'SEA' ? 'Mombasa corridor (Indian Ocean)' : gateway;
    if (code === 'CUSTOMS_CLEARANCE') location = destinationCity.startsWith('Nairobi') ? 'Nairobi · JKIA customs' : 'Entebbe · URA customs';
    if (code === 'CUSTOMS_CLEARED') location = destinationCity.startsWith('Nairobi') ? 'Nairobi customs office' : 'Entebbe · URA customs';
    if (['OUT_FOR_DELIVERY', 'DELIVERED'].includes(code)) location = `${destinationCity} · last mile`;
    events.push({
      id: `${id}-e${i}`,
      shipmentId: id,
      trackingNo,
      code,
      label: meta.label,
      location,
      note: i === stageCodes.length - 1 ? meta.hint : '',
      actor: code === 'REGISTERED' ? 'customer service' : 'RME operations',
      at,
    });
  });
  const last = events[events.length - 1];
  return {
    id,
    trackingNo,
    origin,
    originCity,
    destinationKey,
    destinationCity,
    destinationCountry,
    countryFlag,
    service,
    stageMode: service === 'SEA' ? 'sea' : 'air',
    currentIndex: labels.findIndex((s) => s.code === stageCodes[stageCodes.length - 1]),
    currentStatus: stageCodes[stageCodes.length - 1],
    sender, recipient, parcel,
    declaredValueUsd, insured, totalUsd,
    quote: {},
    notifyPrefs: { senderEmail: true, senderPhone: false, recipientEmail: true, recipientPhone: false },
    notes: notes || '',
    etaDate: future(6),
    etaMinDate: future(3),
    bookedAt: hoursAgo(startedHoursAgo),
    createdAt: hoursAgo(startedHoursAgo),
    updatedAt: hoursAgo(-2),
    lastEventAt: last.at,
    source: 'web',
    events,
  };
}

export function seedShipments() {
  const shipments = [];
  const notifications = [];

  shipments.push(build({
    id: 's-0001',
    trackingNo: 'RME-US-260901-240820-93',
    origin: 'US', originCity: 'Atlanta, GA',
    gateway: 'Entebbe Intl (EBB)',
    destinationKey: 'Kampala', destinationCity: 'Kampala', destinationCountry: 'Uganda', countryFlag: '🇺🇬',
    service: 'EXPRESS', sender: { name: 'Grace Achieng', phone: '+1 404 555 0112', email: 'grace.achieng@example.com' },
    recipient: { name: 'Daniel Okello', phone: '+256 772 555 019', email: 'daniel.okello@example.com' },
    parcel: { description: 'Laptop & documents — family effects', weightKg: 4.2, pieces: 1, dims: { l: 42, w: 32, h: 10 }, valueUsd: 1850 },
    declaredValueUsd: 1850, insured: true, totalUsd: 118.6,
    stageCodes: ['REGISTERED', 'PICKUP_SCHEDULED', 'PICKED_UP', 'ARRIVED_ORIGIN_HUB', 'EXPORT_SCAN', 'DEPARTED_ORIGIN', 'IN_TRANSIT', 'ARRIVED_GATEWAY', 'CUSTOMS_CLEARANCE', 'CUSTOMS_CLEARED', 'OUT_FOR_DELIVERY'],
    startedHoursAgo: 96, hourSpacing: 9,
    notes: 'Fragile — handle with care. Call recipient before delivery.',
  }));

  shipments.push(build({
    id: 's-0002',
    trackingNo: 'RME-US-260901-586932-08',
    origin: 'US', originCity: 'Houston, TX',
    gateway: 'Jomo Kenyatta Intl (NBO)',
    destinationKey: 'Nairobi', destinationCity: 'Nairobi', destinationCountry: 'Kenya', countryFlag: '🇰🇪',
    service: 'STANDARD', sender: { name: 'Marcus Bennett', phone: '+1 713 555 0144', email: 'm.bennett@example.com' },
    recipient: { name: 'Wanjiru Kariuki', phone: '+254 722 555 118', email: 'wanjiru.kariuki@example.com' },
    parcel: { description: 'Medical equipment spare parts', weightKg: 12.8, pieces: 1, dims: { l: 60, w: 40, h: 40 }, valueUsd: 4600 },
    declaredValueUsd: 4600, insured: true, totalUsd: 152.4,
    stageCodes: ['REGISTERED', 'PICKUP_SCHEDULED', 'PICKED_UP', 'ARRIVED_ORIGIN_HUB', 'EXPORT_SCAN', 'DEPARTED_ORIGIN', 'IN_TRANSIT', 'ARRIVED_GATEWAY'],
    startedHoursAgo: 170, hourSpacing: 14,
  }));

  shipments.push(build({
    id: 's-0003',
    trackingNo: 'RME-UK-260901-264364-79',
    origin: 'UK', originCity: 'London',
    gateway: 'Entebbe Intl (EBB)',
    destinationKey: 'Kampala', destinationCity: 'Kampala', destinationCountry: 'Uganda', countryFlag: '🇺🇬',
    service: 'EXPRESS', sender: { name: 'Sarah Mulumba', phone: '+44 20 7946 0832', email: 'sarah.mulumba@example.co.uk' },
    recipient: { name: 'Joseph Wasswa', phone: '+256 701 555 034', email: 'joseph.wasswa@example.com' },
    parcel: { description: 'Business documents & samples (clothing)', weightKg: 6.5, pieces: 2, dims: { l: 50, w: 35, h: 25 }, valueUsd: 920 },
    declaredValueUsd: 920, insured: false, totalUsd: 104.0,
    stageCodes: ['REGISTERED', 'PICKUP_SCHEDULED', 'PICKED_UP', 'ARRIVED_ORIGIN_HUB', 'EXPORT_SCAN', 'DEPARTED_ORIGIN', 'IN_TRANSIT', 'ARRIVED_GATEWAY', 'CUSTOMS_CLEARANCE', 'CUSTOMS_CLEARED'],
    startedHoursAgo: 92, hourSpacing: 8,
    notes: 'DDP — duties billed to RME account. Call recipient before delivery.',
  }));

  shipments.push(build({
    id: 's-0004',
    trackingNo: 'RME-CN-260901-258661-53',
    origin: 'CN', originCity: 'Shenzhen',
    gateway: 'Mombasa Port (MBA)',
    destinationKey: 'Kampala', destinationCity: 'Kampala', destinationCountry: 'Uganda', countryFlag: '🇺🇬',
    service: 'SEA', sender: { name: 'Yiwu Trading Co / Li Wei', phone: '+86 755 5550 2211', email: 'li.wei@ywtrade.example.cn' },
    recipient: { name: 'Nakato Enterprises (J. Nakato)', phone: '+256 782 555 067', email: 'orders@nakato-ent.example.com' },
    parcel: { description: 'Retail goods — 3 pallets (consolidated LCL)', weightKg: 340, pieces: 3, dims: { l: 120, w: 100, h: 160 }, valueUsd: 12000 },
    declaredValueUsd: 12000, insured: true, totalUsd: 1421.0,
    stageCodes: ['REGISTERED', 'PICKUP_SCHEDULED', 'PICKED_UP', 'ARRIVED_ORIGIN_HUB', 'EXPORT_SCAN', 'DEPARTED_ORIGIN', 'IN_TRANSIT'],
    startedHoursAgo: 360, hourSpacing: 40,
    notes: 'Notify consignee 7 days before vessel arrival.',
  }));

  shipments.push(build({
    id: 's-0005',
    trackingNo: 'RME-CN-260901-620436-50',
    origin: 'CN', originCity: 'Guangzhou',
    gateway: 'Entebbe Intl (EBB)',
    destinationKey: 'Mbarara', destinationCity: 'Mbarara', destinationCountry: 'Uganda', countryFlag: '🇺🇬',
    service: 'STANDARD', sender: { name: 'Guangdong Tech Exports', phone: '+86 20 5550 7788', email: 'exports@gdtech.example.cn' },
    recipient: { name: 'Mbarara Hardware Ltd (P. Tumusiime)', phone: '+256 772 555 092', email: 'accounts@mbararahardware.example.com' },
    parcel: { description: 'Solar inverters × 12 (bulk cargo)', weightKg: 86, pieces: 2, dims: { l: 120, w: 80, h: 90 }, valueUsd: 6800 },
    declaredValueUsd: 6800, insured: true, totalUsd: 760.5,
    stageCodes: ['REGISTERED', 'PICKUP_SCHEDULED', 'PICKED_UP', 'ARRIVED_ORIGIN_HUB', 'EXPORT_SCAN', 'DEPARTED_ORIGIN', 'IN_TRANSIT', 'ARRIVED_GATEWAY'],
    startedHoursAgo: 140, hourSpacing: 12,
  }));

  shipments.push(build({
    id: 's-0006',
    trackingNo: 'RME-US-260901-763342-33',
    origin: 'US', originCity: 'New York, NY',
    gateway: 'Entebbe Intl (EBB)',
    destinationKey: 'Kampala', destinationCity: 'Kampala', destinationCountry: 'Uganda', countryFlag: '🇺🇬',
    service: 'EXPRESS', sender: { name: 'Amelia Carter', phone: '+1 212 555 0199', email: 'amelia.carter@example.com' },
    recipient: { name: 'Hope Foundation (C. Ssemanda)', phone: '+256 700 555 028', email: 'admin@hopefoundation.example.com' },
    parcel: { description: 'School supplies donation — 2 boxes', weightKg: 18.5, pieces: 2, dims: { l: 80, w: 60, h: 50 }, valueUsd: 1450 },
    declaredValueUsd: 1450, insured: false, totalUsd: 158.0,
    stageCodes: ['REGISTERED', 'PICKUP_SCHEDULED', 'PICKED_UP', 'ARRIVED_ORIGIN_HUB', 'EXPORT_SCAN', 'DEPARTED_ORIGIN', 'IN_TRANSIT', 'ARRIVED_GATEWAY', 'CUSTOMS_CLEARANCE', 'CUSTOMS_CLEARED', 'OUT_FOR_DELIVERY', 'DELIVERED'],
    startedHoursAgo: 260, hourSpacing: 18,
    deliveredTo: 'C. Ssemanda',
  }));

  // Delivery exception example (7th) — number generated at seed time.
  const exTracking = makeTracking('US', new Date(Date.now() - 10 * 86400_000));
  shipments.push(build({
    id: 's-0007',
    trackingNo: exTracking,
    origin: 'US', originCity: 'Chicago, IL',
    gateway: 'Entebbe Intl (EBB)',
    destinationKey: 'Kampala', destinationCity: 'Kampala', destinationCountry: 'Uganda', countryFlag: '🇺🇬',
    service: 'EXPRESS', sender: { name: 'Nina Okonjo', phone: '+1 312 555 0177', email: 'nina.okonjo@example.com' },
    recipient: { name: 'Emmanuel Kaggwa', phone: '+256 703 555 041', email: 'emmanuel.kaggwa@example.com' },
    parcel: { description: 'Gift shipment — electronics & clothing', weightKg: 9.4, pieces: 1, dims: { l: 55, w: 45, h: 30 }, valueUsd: 2100 },
    declaredValueUsd: 2100, insured: true, totalUsd: 142.3,
    stageCodes: ['REGISTERED', 'PICKUP_SCHEDULED', 'PICKED_UP', 'ARRIVED_ORIGIN_HUB', 'EXPORT_SCAN', 'DEPARTED_ORIGIN', 'IN_TRANSIT', 'ARRIVED_GATEWAY', 'CUSTOMS_CLEARANCE', 'CUSTOMS_CLEARED', 'ON_HOLD'],
    startedHoursAgo: 230, hourSpacing: 16,
    onHoldReason: 'Awaiting importer documentation — recipient to provide ID & purchase invoice.',
  }));

  // A couple of sample notification-log entries for history (older shipments).
  notifications.push({
    id: 'n-0001', shipmentId: 's-0006', trackingNo: 'RME-US-260901-763342-33', channel: 'email', to: 'amelia.carter@example.com',
    kind: 'status', subject: 'RME-US-260901-763342-33 has been delivered', body: 'Your shipment to Kampala was delivered to C. Ssemanda.',
    status: 'sent', createdAt: hoursAgo(24),
  });
  notifications.push({
    id: 'n-0002', shipmentId: 's-0001', trackingNo: 'RME-US-260901-240820-93', channel: 'email', to: 'grace.achieng@example.com',
    kind: 'status', subject: 'RME-US-260901-240820-93 is out for delivery', body: 'Your shipment to Daniel Okello in Kampala is out for delivery today.',
    status: 'sent', createdAt: hoursAgo(5),
  });

  return { shipments, events: shipments.flatMap((s) => s.events), notifications };
}
