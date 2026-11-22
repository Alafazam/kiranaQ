// Lane B API test fixtures: a small store 1 (and a store 2 for tenant checks), a movable clock, JSON calls.
import { insertStores } from './helpers.js';

/** Clock whose date the test can move: clock.set('2026-11-20'). */
export function movableClock(date) {
  let current = date;
  return {
    today: () => current,
    now: () => `${current}T06:30:00.000Z`,
    set(d) { current = d; },
  };
}

/**
 * Store 1: Sharma (id 1, cycle 7, last visit 2026-11-17 -> next 2026-11-24 from the 22nd),
 * Gupta (id 2, cycle 4, last visit 2026-11-19), items Maggi, Surf, Rin (Sharma), Parle-G (Gupta), Chini (none).
 * Store 2: one distributor and one item, ids after store 1's.
 */
export function seedFixture(db) {
  insertStores(db);
  const now = '2026-11-01T06:30:00.000Z';
  const dist = db.prepare(
    'INSERT INTO distributor (id, store_id, name, note, cycle_days, last_visit_date, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
  );
  dist.run(1, 1, 'Sharma Traders', 'HUL items', 7, '2026-11-17', now);
  dist.run(2, 1, 'Gupta Agency', 'biscuits', 4, '2026-11-19', now);
  dist.run(3, 2, 'Sharma Traders', 'other store', 7, '2026-11-17', now);
  const item = db.prepare(
    `INSERT INTO item (id, store_id, distributor_id, sku_key, name_en, name_hi, aliases, item_group, unit, pack_size)
     VALUES (?, ?, ?, ?, ?, ?, '[]', ?, ?, ?)`,
  );
  item.run(1, 1, 1, 'maggi_70g', 'Maggi 70g', 'मैगी', 'snacks', 'pcs', 6);
  item.run(2, 1, 1, 'surf_1kg', 'Surf Excel 1kg', 'सर्फ', 'home_care', 'packet', 6);
  item.run(3, 1, 1, 'rin_bar', 'Rin Bar', 'रिन', 'home_care', 'pcs', 10);
  item.run(4, 1, 2, 'parleg_100g', 'Parle-G 100g', 'पारले-जी', 'biscuits', 'pcs', 24);
  item.run(5, 1, null, 'chini_1kg', 'Chini 1kg', 'चीनी', 'staples', 'kg', 1);
  item.run(6, 2, 3, 'maggi_70g', 'Maggi 70g', 'मैगी', 'snacks', 'pcs', 6);
}

export const ITEM = { maggi: 1, surf: 2, rin: 3, parle: 4, chini: 5, otherStoreMaggi: 6 };
export const DIST = { sharma: 1, gupta: 2, otherStore: 3 };

export async function call(base, method, path, body) {
  const res = await fetch(`${base}/api${path}`, {
    method,
    headers: body === undefined ? {} : { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, body: await res.json() };
}

/** counts: {itemId: count} */
export function logBody(counts) {
  return {
    source: 'manual',
    photo_count: 0,
    counts: Object.entries(counts).map(([id, count]) => ({ item_id: Number(id), count, source: 'tap' })),
  };
}

/** Save the 3-log history used by the logs and visits tests; the clock ends on 2026-11-22. */
export async function saveHistory(base, clock) {
  clock.set('2026-11-18');
  await call(base, 'POST', '/logs', logBody({ 1: 11, 2: 7, 3: 42, 4: 98, 5: 10 }));
  clock.set('2026-11-20');
  await call(base, 'POST', '/logs', logBody({ 1: 8, 2: 4, 3: 40, 4: 50, 5: 8 }));
  clock.set('2026-11-22');
  return call(base, 'POST', '/logs', logBody({ 1: 5, 2: 1, 3: 38, 5: 6 }));
}

export function findLine(cards, itemId) {
  for (const card of cards) {
    for (const bucket of ['runs_out', 'order', 'enough', 'first_log']) {
      const line = card[bucket].find((l) => l.item_id === itemId);
      if (line) return { card, bucket, line };
    }
  }
  return null;
}
