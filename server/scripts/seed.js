// Demo seed. Owner: Lane A. Loads one synthetic store, 3 distributors, 3 past logs and 1 visit.
// All dates are relative to clock.today(). Results come from the real core functions.
// CLI: node scripts/seed.js [--reset]
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { initDb } from '../src/db.js';
import { createClock } from '../src/clock.js';
import { DEMO_STORE_ID, DEFAULT_CYCLE_DAYS } from '../src/core/config.js';
import { computeItem } from '../src/core/rule.js';
import { nextVisit } from '../src/core/schedule.js';
import { findDeliveryCandidates, risenItemIds } from '../src/core/restock.js';

const CATALOG_PATH = fileURLToPath(new URL('../seed/catalog.json', import.meta.url));
const STORE_NAME = 'Demo Kirana';
const STORE_LANGUAGE = 'hi';
const MS_PER_DAY = 86400000;

// last_visit_days_ago is the visit before the first seeded log.
const DISTRIBUTORS = [
  { key: 'sharma', name: 'Sharma Traders', note: 'HUL and Nestle', cycle_days: 7, tint_index: 1, last_visit_days_ago: 12 },
  { key: 'gupta', name: 'Gupta Wholesale', note: 'Biscuits and snacks', cycle_days: 4, tint_index: 2, last_visit_days_ago: 7 },
  { key: 'mehta', name: 'Mehta Distributors', note: 'Staples and oil', cycle_days: 15, tint_index: 3, last_visit_days_ago: 20 },
];
const LOG_DAYS_AGO = [6, 3, 1];
const DELIVERY_DISTRIBUTOR_KEY = 'gupta';    // delivered on the second log
const DELIVERY_ITEM_COUNT = 3;
const DELIVERY_PACKS = 2;
const SKIPPED_ITEM_MODULO = 11;              // these items are left out of log 2 ("not counted")
const RATE_BASE = 0.4;
const RATE_STEP = 0.45;
const RATE_STEPS = 5;
const COVER_BASE_DAYS = 9;
const COVER_STEP_DAYS = 3;
const COVER_STEPS = 4;
const EXTRA_PACK_MODULO = 3;
const VISION_SOURCE_MODULO = 2;

function addDays(ymd, days) {
  return new Date(Date.parse(`${ymd}T00:00:00Z`) + days * MS_PER_DAY).toISOString().slice(0, 10);
}

function daysBetween(from, to) {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / MS_PER_DAY);
}

export function clearStore(db) {
  db.transaction(() => {
    for (const table of ['receipt', 'visit', 'item_result', 'item_state', 'stock_count', 'stock_log', 'item', 'distributor', 'ai_call', 'store']) {
      db.prepare(`DELETE FROM ${table}`).run();
    }
  })();
}

/** Hidden "true" stock curve for an item: count at a given number of days ago. */
function trueCount(item, index, daysAgo, startDaysAgo) {
  const rate = RATE_BASE + (index % RATE_STEPS) * RATE_STEP;
  const start = Math.round(rate * (COVER_BASE_DAYS + (index % COVER_STEPS) * COVER_STEP_DAYS))
    + (index % EXTRA_PACK_MODULO) * item.pack_size;
  return Math.max(start - Math.round(rate * (startDaysAgo - daysAgo)), 0);
}

export function seedStore(db, clock) {
  const today = clock.today();
  const now = clock.now();
  const catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'));
  const startDaysAgo = LOG_DAYS_AGO[0];

  db.transaction(() => {
    db.prepare('INSERT INTO store (id, name, language, created_at) VALUES (?, ?, ?, ?)')
      .run(DEMO_STORE_ID, STORE_NAME, STORE_LANGUAGE, now);

    const distributors = new Map();
    for (const d of DISTRIBUTORS) {
      const info = db.prepare(
        'INSERT INTO distributor (store_id, name, note, cycle_days, last_visit_date, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      ).run(DEMO_STORE_ID, d.name, d.note, d.cycle_days, addDays(today, -d.last_visit_days_ago), now);
      distributors.set(d.key, { ...d, id: Number(info.lastInsertRowid), last_visit: addDays(today, -d.last_visit_days_ago) });
    }

    const items = catalog.map((c, index) => {
      const distributor = c.distributor_key ? distributors.get(c.distributor_key) : null;
      if (c.distributor_key && !distributor) throw new Error(`catalog item ${c.sku_key}: unknown distributor ${c.distributor_key}`);
      const info = db.prepare(
        `INSERT INTO item (store_id, distributor_id, sku_key, name_en, name_hi, aliases, item_group, unit, pack_size)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(DEMO_STORE_ID, distributor?.id ?? null, c.sku_key, c.name_en, c.name_hi,
        JSON.stringify(c.aliases ?? []), c.item_group, c.unit, c.pack_size);
      return { ...c, index, id: Number(info.lastInsertRowid), distributor_id: distributor?.id ?? null, pack: c.pack_size };
    });

    const state = new Map(); // item_id -> {count, date, rate, log_id}
    const insLog = db.prepare('INSERT INTO stock_log (store_id, log_date, created_at, source, photo_count, has_restock) VALUES (?, ?, ?, ?, ?, ?)');
    const insCount = db.prepare('INSERT INTO stock_count (log_id, item_id, store_id, count, source) VALUES (?, ?, ?, ?, ?)');
    const insResult = db.prepare(
      `INSERT INTO item_result (log_id, item_id, store_id, distributor_id, rate_per_day, days_of_cover, next_visit_date,
         status, suggested_qty, final_qty, reason_key, reason_args) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );

    LOG_DAYS_AGO.forEach((daysAgo, logIndex) => {
      const logDate = addDays(today, -daysAgo);
      const isDeliveryLog = logIndex === 1;
      const counted = items.filter((it) => !(logIndex === 1 && it.index % SKIPPED_ITEM_MODULO === SKIPPED_ITEM_MODULO - 1));

      const deliveryKeys = isDeliveryLog
        ? counted.filter((it) => it.distributor_id === distributors.get(DELIVERY_DISTRIBUTOR_KEY).id).slice(0, DELIVERY_ITEM_COUNT).map((it) => it.id)
        : [];
      const counts = counted.map((it) => ({
        item: it,
        count: trueCount(it, it.index, daysAgo, startDaysAgo) + (deliveryKeys.includes(it.id) ? DELIVERY_PACKS * it.pack : 0),
      }));

      const rows = counts.map(({ item, count }) => {
        const s = state.get(item.id);
        return {
          item_id: item.id, distributor_id: item.distributor_id, pack_size: item.pack, c: count,
          p: s ? s.count : null, d: s ? daysBetween(s.date, logDate) : null, o: s ? s.rate : null,
        };
      });
      const risen = risenItemIds(rows);
      const candidates = findDeliveryCandidates(rows);

      const logId = Number(insLog.run(DEMO_STORE_ID, logDate, now, 'manual', 0, candidates.length > 0 ? 1 : 0).lastInsertRowid);
      const isLast = logIndex === LOG_DAYS_AGO.length - 1;
      for (const row of rows) {
        const item = items.find((it) => it.id === row.item_id);
        const dist = [...distributors.values()].find((d) => d.id === item.distributor_id) ?? null;
        const cycle = dist?.cycle_days ?? DEFAULT_CYCLE_DAYS;
        const visit = dist ? nextVisit(dist.last_visit, cycle, logDate) : { next_visit_date: addDays(logDate, cycle), days_to_next_visit: cycle };
        const r = computeItem({
          p: row.p, c: row.c, d: row.d, o: row.o, rose: risen.has(row.item_id), pack_size: row.pack_size,
          cycle_days: cycle, days_to_next_visit: visit.days_to_next_visit,
          distributor: dist?.name ?? null, next_visit_date: visit.next_visit_date,
        });
        insCount.run(logId, row.item_id, DEMO_STORE_ID, row.c, item.index % VISION_SOURCE_MODULO === 0 ? 'vision' : 'tap');
        insResult.run(logId, row.item_id, DEMO_STORE_ID, row.distributor_id, r.rate_per_day, r.days_of_cover,
          visit.next_visit_date, r.status, r.suggested_qty, isLast ? null : r.suggested_qty, r.reason_key, JSON.stringify(r.reason_args));
        state.set(row.item_id, { count: row.c, date: logDate, rate: r.rate_per_day, log_id: logId });
      }

      for (const candidate of candidates) {
        const dist = [...distributors.values()].find((d) => d.id === candidate.distributor_id);
        const visitId = Number(db.prepare(
          'INSERT INTO visit (store_id, distributor_id, log_id, visited_on, created_at) VALUES (?, ?, ?, ?, ?)',
        ).run(DEMO_STORE_ID, dist.id, logId, logDate, now).lastInsertRowid);
        for (const it of candidate.items) {
          db.prepare('INSERT INTO receipt (visit_id, item_id, store_id, received_qty) VALUES (?, ?, ?, ?)')
            .run(visitId, it.item_id, DEMO_STORE_ID, Math.round(it.rise));
        }
        dist.last_visit = logDate;
        db.prepare('UPDATE distributor SET last_visit_date = ? WHERE id = ?').run(logDate, dist.id);
      }
    });

    const insState = db.prepare('INSERT INTO item_state (store_id, item_id, rate_per_day, last_log_id, updated_at) VALUES (?, ?, ?, ?, ?)');
    for (const [itemId, s] of state) insState.run(DEMO_STORE_ID, itemId, s.rate, s.log_id, now);
  })();
}

/** Seed only when the store table is empty. Safe to call on every start. */
export function seedIfEmpty(db, clock) {
  const { n } = db.prepare('SELECT COUNT(*) AS n FROM store').get();
  if (n > 0) return false;
  seedStore(db, clock);
  console.log('[kiranaq] demo store seeded');
  return true;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const db = initDb();
  const clock = createClock();
  if (process.argv.includes('--reset')) clearStore(db);
  console.log(seedIfEmpty(db, clock) ? 'seeded' : 'store already has data (use --reset to start over)');
  db.close();
}
