/**
 * Operational catalogue for Royal Mail Express International:
 * origin countries, African destinations, services and the canonical
 * shipment status engine shared by every shipment.
 */

export const ORIGINS = [
  {
    code: 'US', flag: '🇺🇸', name: 'United States of America', short: 'USA',
    gateways: ['New York (JFK)', 'Atlanta (ATL)', 'Houston (IAH)', 'Los Angeles (LAX)'],
    partner: 'RME Americas Partner Network', blurb: 'Door-to-door from 50 states',
  },
  {
    code: 'UK', flag: '🇬🇧', name: 'United Kingdom', short: 'United Kingdom',
    gateways: ['London Heathrow (LHR)', 'London Gatwick', 'Manchester (MAN)'],
    partner: 'RME UK & Ireland Network', blurb: 'Door-to-door from England, Scotland, Wales & N.Ireland',
  },
  {
    code: 'CN', flag: '🇨🇳', name: "China (People's Republic)", short: 'China',
    gateways: ['Shenzhen (SZX)', 'Shanghai (PVG)', 'Yiwu consolidation', 'Guangzhou (CAN)'],
    partner: 'RME China Trade Desks', blurb: 'Air freight & LCL sea consolidation from mainland China',
  },
];

export const DESTINATIONS = [
  { key: 'Kampala', country: 'Uganda', flag: '🇺🇬', gateway: 'Entebbe Intl (EBB)', countryFactor: 1.0, lastMileUsd: 12, note: 'Home & office delivery across Kampala metropolitan area' },
  { key: 'Entebbe', country: 'Uganda', flag: '🇺🇬', gateway: 'Entebbe Intl (EBB)', countryFactor: 1.0, lastMileUsd: 14, note: 'Airport-side collection or delivery' },
  { key: 'Gulu', country: 'Uganda', flag: '🇺🇬', gateway: 'Entebbe Intl (EBB)', countryFactor: 1.08, lastMileUsd: 24, note: 'Upcountry delivery via northern network' },
  { key: 'Mbarara', country: 'Uganda', flag: '🇺🇬', gateway: 'Entebbe Intl (EBB)', countryFactor: 1.06, lastMileUsd: 22, note: 'Western Uganda corridor' },
  { key: 'Nairobi', country: 'Kenya', flag: '🇰🇪', gateway: 'Jomo Kenyatta Intl (NBO)', countryFactor: 1.1, lastMileUsd: 14, note: 'Express clearances via JKIA' },
  { key: 'Mombasa', country: 'Kenya', flag: '🇰🇪', gateway: 'Mombasa Port (MBA)', countryFactor: 1.12, lastMileUsd: 16, note: 'Sea-freight gateway for East Africa' },
  { key: 'Kigali', country: 'Rwanda', flag: '🇷🇼', gateway: 'Kigali Intl (KGL)', countryFactor: 1.12, lastMileUsd: 16, note: 'Rwanda door delivery' },
  { key: 'Dar es Salaam', country: 'Tanzania', flag: '🇹🇿', gateway: 'Julius Nyerere Intl (DAR)', countryFactor: 1.14, lastMileUsd: 18, note: 'Tanzania port & air gateway' },
  { key: 'Juba', country: 'South Sudan', flag: '🇸🇸', gateway: 'Juba Intl (JUB)', countryFactor: 1.22, lastMileUsd: 30, note: 'South Sudan — special handling applies' },
  { key: 'Bujumbura', country: 'Burundi', flag: '🇧🇮', gateway: 'Melchior Ndadaye Intl (BJM)', countryFactor: 1.2, lastMileUsd: 22, note: 'Burundi door delivery' },
  { key: 'Kinshasa', country: 'DR Congo', flag: '🇨🇩', gateway: 'N’Djili Intl (FIH)', countryFactor: 1.35, lastMileUsd: 28, note: 'DRC — customs brokerage included' },
  { key: 'Accra', country: 'Ghana', flag: '🇬🇭', gateway: 'Kotoka Intl (ACC)', countryFactor: 1.4, lastMileUsd: 24, note: 'West Africa express' },
  { key: 'Lagos', country: 'Nigeria', flag: '🇳🇬', gateway: 'Murtala Muhammed (LOS)', countryFactor: 1.45, lastMileUsd: 26, note: 'Nigeria door delivery' },
  { key: 'Johannesburg', country: 'South Africa', flag: '🇿🇦', gateway: 'O.R. Tambo Intl (JNB)', countryFactor: 1.35, lastMileUsd: 24, note: 'Southern Africa express' },
  { key: 'Addis Ababa', country: 'Ethiopia', flag: '🇪🇹', gateway: 'Bole Intl (ADD)', countryFactor: 1.3, lastMileUsd: 22, note: 'Horn of Africa express' },
];

export const SERVICES = [
  {
    code: 'EXPRESS', name: 'Express Air', icon: '⚡', tagline: 'Fastest door-to-door',
    daysMin: 3, daysMax: 5, blurb: 'Priority air freight with dedicated handling, export customs pre-clearance and same-day dispatch from origin hub. Typical Kampala transit 3–5 business days after pickup.',
  },
  {
    code: 'STANDARD', name: 'Standard Air', icon: '✈️', tagline: 'Best value by air',
    daysMin: 5, daysMax: 8, blurb: 'Consolidated air freight with full tracking. The everyday choice for personal effects, trade samples and e-commerce — typically 5–8 business days.',
  },
  {
    code: 'SEA', name: 'Economy Sea (LCL)', icon: '🚢', tagline: 'Best for volume',
    daysMin: 28, daysMax: 40, blurb: 'Less-than-container consolidation via Mombasa for heavy or bulky cargo (min. chargeable 20 kg). The most economical way to move household goods and commercial shipments to East Africa.',
  },
];

/** Canonical air timeline — every code is a milestone shown on the tracking timeline. */
export const STAGES_AIR = [
  { code: 'REGISTERED', label: 'Shipment registered', icon: '📦', hint: 'Booking confirmed and tracking number issued.' },
  { code: 'PICKUP_SCHEDULED', label: 'Pickup scheduled', icon: '📅', hint: 'A courier appointment has been arranged with the sender.' },
  { code: 'PICKED_UP', label: 'Picked up from sender', icon: '🚚', hint: 'Your package is with our driver and heading to the origin hub.' },
  { code: 'ARRIVED_ORIGIN_HUB', label: 'Arrived at origin hub', icon: '🏭', hint: 'Received and security-screened at the regional export facility.' },
  { code: 'EXPORT_SCAN', label: 'Export customs clearance', icon: '🛃', hint: 'Documentation filed and export customs approval received.' },
  { code: 'DEPARTED_ORIGIN', label: 'Departed origin — international leg', icon: '✈️', hint: 'Dispatched on the international air leg toward East Africa.' },
  { code: 'IN_TRANSIT', label: 'In transit (international)', icon: '🌍', hint: 'En route to the regional gateway hub.' },
  { code: 'ARRIVED_GATEWAY', label: 'Arrived at regional gateway', icon: '🛬', hint: 'Landed at the regional gateway airport (e.g. Entebbe / JKIA).' },
  { code: 'CUSTOMS_CLEARANCE', label: 'Import customs clearance', icon: '🛃', hint: 'Our licensed broker is clearing your shipment with Uganda Revenue Authority / local customs.' },
  { code: 'CUSTOMS_CLEARED', label: 'Customs cleared', icon: '✅', hint: 'Import duties and clearance completed — released for delivery.' },
  { code: 'OUT_FOR_DELIVERY', label: 'Out for delivery', icon: '🚚', hint: 'Loaded on the final delivery vehicle.' },
  { code: 'DELIVERED', label: 'Delivered', icon: '🎉', hint: 'Signed for and delivered to the recipient. Thank you for shipping with RME.' },
];

/** Sea timeline (LCL via Mombasa / Dar es Salaam). */
export const STAGES_SEA = [
  { code: 'REGISTERED', label: 'Shipment registered', icon: '📦', hint: 'LCL booking confirmed. Cargo booked onto next vessel slot.' },
  { code: 'PICKUP_SCHEDULED', label: 'Pickup / delivery to warehouse', icon: '📅', hint: 'Collection or drop-off arranged at our consolidation warehouse.' },
  { code: 'PICKED_UP', label: 'Received at consolidation warehouse', icon: '🏭', hint: 'Cargo received, weighed and consolidated.' },
  { code: 'ARRIVED_ORIGIN_HUB', label: 'Consolidation complete', icon: '📦', hint: 'Palletized into a container at the port of loading.' },
  { code: 'EXPORT_SCAN', label: 'Export customs & port handling', icon: '🛃', hint: 'Container gated in and export documentation lodged.' },
  { code: 'DEPARTED_ORIGIN', label: 'Vessel departed origin port', icon: '🚢', hint: 'Sailing toward Mombasa / Dar es Salaam.' },
  { code: 'IN_TRANSIT', label: 'At sea (in transit)', icon: '🌊', hint: 'Vessel en route — ETA as advised on your timeline.' },
  { code: 'ARRIVED_GATEWAY', label: 'Vessel arrived — port discharge', icon: '🛬', hint: 'Container discharged at the East African gateway port.' },
  { code: 'CUSTOMS_CLEARANCE', label: 'Import customs clearance', icon: '🛃', hint: 'Import entries and duties processed by our clearing agent.' },
  { code: 'CUSTOMS_CLEARED', label: 'Customs cleared', icon: '✅', hint: 'Container released. Cargo de-stuffed for road haulage.' },
  { code: 'OUT_FOR_DELIVERY', label: 'Out for delivery', icon: '🚚', hint: 'On the truck for final delivery.' },
  { code: 'DELIVERED', label: 'Delivered', icon: '🎉', hint: 'Delivered to the consignee and signed for.' },
];

export const EXCEPTION_STATUSES = [
  { code: 'ON_HOLD', label: 'Delivery exception — on hold', icon: '⚠️', hint: 'A hold has been applied. Our team is resolving and will update you.' },
  { code: 'ADDRESS_ISSUE', label: 'Delivery address issue', icon: '📍', hint: 'We could not complete delivery — recipient contact needed.' },
];

export function stageListFor(serviceCode) {
  return serviceCode === 'SEA' ? STAGES_SEA : STAGES_AIR;
}

export function stageIndex(serviceCode, code) {
  return stageListFor(serviceCode).findIndex((s) => s.code === code);
}

export function stageFor(serviceCode, code) {
  const list = stageListFor(serviceCode);
  return list.find((s) => s.code === code) || list.find((s) => s.code === 'REGISTERED');
}

export function findOrigin(code) {
  return ORIGINS.find((o) => o.code === code);
}
export function findDestination(key) {
  return DESTINATIONS.find((d) => d.key === key);
}
export function findService(code) {
  return SERVICES.find((s) => s.code === code);
}

/** Business-day ETA helpers */
export function addBusinessDays(date, n) {
  const d = new Date(date);
  let added = 0;
  while (added < n) {
    d.setDate(d.getDate() + 1);
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) added += 1;
  }
  return d;
}

export function fmtDate(d) {
  if (!d) return null;
  return new Date(d).toISOString();
}
