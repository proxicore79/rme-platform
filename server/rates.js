/**
 * RME rate engine — instant door-to-door quotes from US / UK / China to
 * Uganda & Africa. Rates are illustrative templates that demonstrate the
 * full workflow; a production deployment ties these to live carrier tariffs.
 */

import { ORIGINS, DESTINATIONS, SERVICES, findDestination } from './catalogue.js';

const ORIGIN_RAW = {
  // code: { express, standard, sea } USD per kg (door-to-door, first band)
  US: { EXPRESS: 12.9, STANDARD: 8.6, SEA: 3.4, fee: { EXPRESS: 18, STANDARD: 14, SEA: 35 } },
  UK: { EXPRESS: 12.4, STANDARD: 8.2, SEA: 3.4, fee: { EXPRESS: 18, STANDARD: 14, SEA: 35 } },
  CN: { EXPRESS: 13.4, STANDARD: 8.0, SEA: 2.6, fee: { EXPRESS: 18, STANDARD: 14, SEA: 45 } },
};

const WEIGHT_TIERS = [
  { min: 0, mult: 1.0 }, { min: 10, mult: 0.92 }, { min: 25, mult: 0.85 },
  { min: 50, mult: 0.76 }, { min: 100, mult: 0.66 }, { min: 250, mult: 0.58 },
  { min: 500, mult: 0.5 }, { min: 1000, mult: 0.44 },
];

const FUEL_PCT = 0.09;            // fuel & security surcharge
const INSURANCE_PCT = 0.02;       // 2% of declared value
const INSURANCE_MIN_USD = 6;
const VOL_DIVISOR = 5000;         // (cm³)/5000 = volumetric kg
const SEA_MIN_CHARGE_KG = 20;

// Approximate illustrative FX for local-currency display only.
export const FX_USD = {
  UGX: 3850, KES: 130, RWF: 1320, TZS: 2700, SSP: 1900,
  CDF: 2900, GHS: 16, NGN: 1650, ZAR: 18.5, ZMW: 27, BIF: 2900, ETB: 130,
};

export function volumetricKg(dims) {
  if (!dims || !dims.l || !dims.w || !dims.h) return 0;
  return Math.round(((dims.l * dims.w * dims.h) / VOL_DIVISOR) * 10) / 10;
}

function tierMult(weight) {
  let m = 1;
  for (const t of WEIGHT_TIERS) if (weight >= t.min) m = t.mult;
  return m;
}

export function currencyFor(originCode) {
  return originCode === 'UK' ? 'GBP' : originCode === 'CN' ? 'CNY' : 'USD';
}

/**
 * Compute a full quote.
 * @returns {{lines:[{label,amount,currency}], subtotal, insurance, fuel, handling,
 *            freight, freightKg, billableKg, total, currency, origin, destination,
 *            service, eta:{min,max,minDate,maxDate}, warnings:[...]}}
 */
export function quoteLane({ origin, destinationKey, serviceCode, weightKg, dims, declaredValue, insured, today = new Date() }) {
  const originRec = ORIGINS.find((o) => o.code === origin);
  const dest = findDestination(destinationKey);
  const serv = SERVICES.find((s) => s.code === serviceCode);
  if (!originRec || !dest || !serv) throw new Error('Unknown origin/destination/service');

  let billable = Number(weightKg) || 0;
  const vol = volumetricKg(dims);
  if (vol > billable) billable = vol;
  let warnings = [];
  if (serviceCode === 'SEA' && billable < SEA_MIN_CHARGE_KG) {
    billable = SEA_MIN_CHARGE_KG;
    warnings.push(`Economy Sea is consolidated LCL freight — a minimum of ${SEA_MIN_CHARGE_KG} chargeable kg applies.`);
  }

  const raw = ORIGIN_RAW[origin];
  const rateKg = raw[serviceCode];
  const chargeableForMult = Math.max(billable, 1);
  const freight = round2(chargeableForMult * rateKg * dest.countryFactor * tierMult(chargeableForMult));
  const fuel = round2(freight * FUEL_PCT);
  const handling = round2(raw.fee[serviceCode] + dest.lastMileUsd);
  const insurance = insured && declaredValue > 0 ? Math.max(round2(declaredValue * INSURANCE_PCT), INSURANCE_MIN_USD) : 0;
  const subtotal = round2(freight + fuel + handling + insurance);
  const total = round2(subtotal);

  const cur = currencyFor(origin);
  const etaMax = serv.code === 'SEA' ? serv.daysMax + 4 : serv.daysMax;
  const maxDate = businessDaysAfter(today, etaMax);
  const minDate = businessDaysAfter(today, serv.daysMin);

  return {
    lines: [
      { label: `Freight · ${serv.name.toLowerCase()} (${rateKg} USD/kg × ${chargeableForMult} kg × zone ${dest.countryFactor})`, amount: freight },
      { label: 'Fuel & security surcharge (9%)', amount: fuel },
      { label: 'Handling, documentation & last-mile delivery', amount: handling },
      { label: 'Insurance cover (optional)', amount: insurance },
    ],
    freight, fuel, handling, insurance, subtotal, total,
    billableKg: round2(billable), actualKg: Number(weightKg) || 0, volumetricKg: vol,
    currency: 'USD',
    originCurrency: cur,
    etaDays: { min: serv.daysMin, max: etaMax },
    etaDate: maxDate.toISOString().slice(0, 10),
    minDate: minDate.toISOString().slice(0, 10),
    service: serv.code,
    serviceName: serv.name,
    warnings,
    notes: [
      'Door-to-door pricing. Import duties & VAT are settled with customs before release and are not included.',
      insured ? `Shipment covered for ${declaredValue} USD at 2% (min. 6 USD).` : 'Insurance available from 2% of declared value.',
      'Rates are indicative and confirmed in writing at booking.',
    ],
  };
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

function businessDaysAfter(start, n) {
  const d = new Date(start);
  let added = 0;
  while (added < n) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() !== 0 && d.getDay() !== 6) added += 1;
  }
  return d;
}

/** Static reference matrix used by the marketing rate tables. */
export function rateTable(originCode, serviceCode) {
  const dest = findDestination('Kampala');
  const out = [];
  for (const w of [1, 5, 10, 20, 45, 100]) {
    const q = quoteLane({ origin: originCode, destinationKey: 'Kampala', serviceCode: serviceCode, weightKg: w, declaredValue: 0, insured: false });
    out.push({ kg: w, total: q.total, perKg: round2(q.total / w) });
  }
  return out;
}
