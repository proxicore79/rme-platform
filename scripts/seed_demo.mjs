/**
 * (Re)build the demo database with the seeded demo shipments.
 * Usage: node scripts/seed_demo.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { seedShipments } from '../server/seed.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const file = path.join(here, '..', 'data', 'demo-db.json');
const data = { ...seedShipments(), meta: { seq: 0 } };
fs.mkdirSync(path.dirname(file), { recursive: true });
fs.writeFileSync(file, JSON.stringify(data, null, 2));
console.log(`Seeded ${data.shipments.length} shipments, ${data.events.length} events, ${data.notifications.length} notifications → ${path.relative(process.cwd(), file)}`);
