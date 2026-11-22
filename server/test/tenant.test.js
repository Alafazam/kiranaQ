// Tenant isolation: store 1 routes never read or change store 2 rows.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withApp } from './helpers.js';
import { seedFixture, movableClock, call, logBody, saveHistory, ITEM, DIST } from './fixtures-b.js';

const TABLES = ['distributor', 'item', 'stock_log', 'stock_count', 'item_result', 'visit', 'receipt', 'item_state'];

function store2Rows(db) {
  return Object.fromEntries(TABLES.map((t) => [t, db.prepare(`SELECT * FROM ${t} WHERE store_id = 2`).all()]));
}

/** Store 2 gets its own log, result, state and visit, so every table has a store 2 row. */
function seedStore2(db) {
  seedFixture(db);
  db.prepare("INSERT INTO stock_log (id, store_id, log_date, created_at, source) VALUES (900, 2, '2026-11-21', '2026-11-21T06:30:00Z', 'manual')").run();
  db.prepare("INSERT INTO stock_count (log_id, item_id, store_id, count, source) VALUES (900, 6, 2, 50, 'tap')").run();
  db.prepare(
    `INSERT INTO item_result (log_id, item_id, store_id, distributor_id, status, suggested_qty, reason_key, reason_args)
     VALUES (900, 6, 2, 3, 'runs_out', 6, 'runs_out_before_visit', '{}')`,
  ).run();
  db.prepare("INSERT INTO item_state (store_id, item_id, rate_per_day, last_log_id, updated_at) VALUES (2, 6, 9, 900, '2026-11-21')").run();
  db.prepare("INSERT INTO visit (id, store_id, distributor_id, log_id, visited_on, created_at) VALUES (900, 2, 3, 900, '2026-11-21', '2026-11-21')").run();
  db.prepare('INSERT INTO receipt (visit_id, item_id, store_id, received_qty) VALUES (900, 6, 2, 6)').run();
}

test('store 1 lists and writes never read or change store 2', async () => {
  const clock = movableClock('2026-11-22');
  await withApp(async ({ base, db }) => {
    const before = store2Rows(db);

    // Lists show only store 1.
    assert.ok((await call(base, 'GET', '/distributors')).body.every((d) => d.id !== DIST.otherStore));
    assert.ok((await call(base, 'GET', '/items')).body.every((i) => i.id !== ITEM.otherStoreMaggi));
    assert.deepEqual((await call(base, 'GET', '/logs')).body, []);
    assert.deepEqual((await call(base, 'GET', '/orders/latest')).body, { cards: [] });
    assert.equal((await call(base, 'GET', '/logs/900')).status, 404);
    assert.equal((await call(base, 'GET', '/logs/900/result')).status, 404);

    // Writes to store 2 ids are refused.
    assert.equal((await call(base, 'PUT', `/distributors/${DIST.otherStore}`, { cycle_days: 3 })).status, 404);
    assert.equal((await call(base, 'PUT', `/items/${ITEM.otherStoreMaggi}`, { active: false })).status, 404);
    assert.equal((await call(base, 'PUT', `/items/${ITEM.maggi}`, { distributor_id: DIST.otherStore })).status, 400);
    assert.equal((await call(base, 'POST', '/logs', logBody({ [ITEM.otherStoreMaggi]: 3 }))).status, 400);
    assert.equal((await call(base, 'PUT', '/logs/900/order', { distributor_id: DIST.otherStore, lines: [] })).status, 404);
    assert.equal((await call(base, 'POST', '/logs/900/visits', { distributor_id: DIST.otherStore, confirmed: true })).status, 404);

    // A full store 1 flow, including a same-name distributor and a visit.
    await saveHistory(base, clock);
    const restock = await call(base, 'POST', '/logs', logBody({ 1: 17, 2: 13 }));
    await call(base, 'POST', `/logs/${restock.body.log_id}/visits`, { distributor_id: DIST.sharma, confirmed: true });
    await call(base, 'PUT', `/logs/${restock.body.log_id}/order`, { distributor_id: DIST.sharma, lines: [] });
    await call(base, 'PUT', `/distributors/${DIST.sharma}`, { cycle_days: 5 });
    await call(base, 'PUT', '/store', { language: 'en' });

    assert.deepEqual(store2Rows(db), before, 'store 2 rows unchanged');
    assert.equal(db.prepare('SELECT language FROM store WHERE id = 2').get().language, 'en');
    assert.ok((await call(base, 'GET', '/logs')).body.every((l) => l.id !== 900));
  }, { setup: seedStore2, clock });
});
