// Store, distributors and items routes (R9).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withApp } from './helpers.js';
import { seedFixture, call, DIST, ITEM } from './fixtures-b.js';

const opts = { setup: seedFixture };

test('GET and PUT /store', async () => {
  await withApp(async ({ base }) => {
    assert.deepEqual((await call(base, 'GET', '/store')).body, { id: 1, name: 'Demo Kirana', language: 'hi' });
    const put = await call(base, 'PUT', '/store', { language: 'en' });
    assert.equal(put.status, 200);
    assert.equal(put.body.language, 'en');
    assert.equal((await call(base, 'PUT', '/store', { language: 'fr' })).status, 400);
  }, opts);
});

test('GET /distributors is sorted by next visit with schedule and counts', async () => {
  await withApp(async ({ base }) => {
    const { status, body } = await call(base, 'GET', '/distributors');
    assert.equal(status, 200);
    assert.deepEqual(body.map((d) => d.name), ['Gupta Agency', 'Sharma Traders']);
    const [gupta, sharma] = body;
    assert.equal(gupta.next_visit_date, '2026-11-23');
    assert.equal(gupta.days_to_next_visit, 1);
    assert.equal(sharma.next_visit_date, '2026-11-24');
    assert.equal(sharma.days_to_next_visit, 2);
    assert.equal(sharma.item_count, 3);
    assert.equal(sharma.runs_out_count, 0);
    assert.equal(sharma.tint_index, 1);
    assert.equal(gupta.tint_index, 2);
  }, opts);
});

test('POST /distributors: create, 400 on bad input, 409 on duplicate name', async () => {
  await withApp(async ({ base }) => {
    const created = await call(base, 'POST', '/distributors', { name: 'Mehta Stores', cycle_days: 15 });
    assert.equal(created.status, 201);
    assert.equal(created.body.cycle_days, 15);
    assert.equal(created.body.visit_date_set, false);
    assert.equal(created.body.next_visit_date, '2026-12-07');
    assert.equal((await call(base, 'POST', '/distributors', { name: 'Mehta Stores', cycle_days: 7 })).status, 409);
    assert.equal((await call(base, 'POST', '/distributors', { name: 'X', cycle_days: 0 })).status, 400);
    assert.equal((await call(base, 'POST', '/distributors', { name: 'X', cycle_days: 61 })).status, 400);
    assert.equal((await call(base, 'POST', '/distributors', { cycle_days: 7 })).status, 400);
    assert.equal((await call(base, 'POST', '/distributors', { name: 'X', cycle_days: 7, last_visit_date: '2026-13-01' })).status, 400);
  }, opts);
});

test('PUT /distributors/:id: change cycle and last visit, 404, 409', async () => {
  await withApp(async ({ base }) => {
    const put = await call(base, 'PUT', `/distributors/${DIST.sharma}`, { cycle_days: 4, last_visit_date: '2026-11-22' });
    assert.equal(put.status, 200);
    assert.equal(put.body.next_visit_date, '2026-11-26');
    assert.equal(put.body.days_to_next_visit, 4);
    assert.equal((await call(base, 'PUT', '/distributors/999', { cycle_days: 4 })).status, 404);
    assert.equal((await call(base, 'PUT', `/distributors/${DIST.sharma}`, { name: 'Gupta Agency' })).status, 409);
    assert.equal((await call(base, 'PUT', `/distributors/${DIST.sharma}`, { cycle_days: 'x' })).status, 400);
  }, opts);
});

test('GET /items and PUT /items/:id', async () => {
  await withApp(async ({ base }) => {
    const items = (await call(base, 'GET', '/items')).body;
    assert.equal(items.length, 5);
    const maggi = items.find((i) => i.id === ITEM.maggi);
    assert.deepEqual(maggi.aliases, []);
    assert.equal(maggi.active, true);

    const moved = await call(base, 'PUT', `/items/${ITEM.maggi}`, { distributor_id: DIST.gupta, active: false });
    assert.equal(moved.status, 200);
    assert.equal(moved.body.distributor_id, DIST.gupta);
    assert.equal(moved.body.active, false);
    assert.equal((await call(base, 'PUT', `/items/${ITEM.maggi}`, { distributor_id: null })).body.distributor_id, null);
    assert.equal((await call(base, 'PUT', `/items/${ITEM.maggi}`, { distributor_id: 999 })).status, 400);
    assert.equal((await call(base, 'PUT', `/items/${ITEM.maggi}`, { active: 'yes' })).status, 400);
    assert.equal((await call(base, 'PUT', '/items/999', { active: true })).status, 404);
  }, opts);
});

test('distributor phone: optional, trimmed, 400 bad_phone when it breaks the rule', async () => {
  await withApp(async ({ base }) => {
    const list = (await call(base, 'GET', '/distributors')).body;
    assert.ok(list.every((d) => d.phone === null), 'null when not set');

    const created = await call(base, 'POST', '/distributors', { name: 'Mehta Stores', cycle_days: 15, phone: '  +91 98765-43210 ' });
    assert.equal(created.status, 201);
    assert.equal(created.body.phone, '+91 98765-43210');

    const put = await call(base, 'PUT', `/distributors/${DIST.sharma}`, { phone: '9876543210' });
    assert.equal(put.body.phone, '9876543210');
    assert.equal((await call(base, 'PUT', `/distributors/${DIST.sharma}`, { phone: null })).body.phone, null);

    for (const phone of ['12345', '+91 98765 43210 12345', '98765abc10', '(987) 654-3210', 9876543210]) {
      const res = await call(base, 'PUT', `/distributors/${DIST.sharma}`, { phone });
      assert.equal(res.status, 400, String(phone));
      assert.equal(res.body.error.code, 'bad_phone');
    }
    assert.equal((await call(base, 'POST', '/distributors', { name: 'Bad', cycle_days: 7, phone: '123' })).status, 400);
  }, opts);
});

test('seed gives the 3 demo distributors fake phones, also on an older seeded DB', async () => {
  const { seedIfEmpty } = await import('../scripts/seed.js');
  await withApp(async ({ base, db }) => {
    seedIfEmpty(db, { today: () => '2026-11-22', now: () => '2026-11-22T06:30:00.000Z' });
    const phones = (await call(base, 'GET', '/distributors')).body.map((d) => d.phone).sort();
    assert.deepEqual(phones, ['+91 90000 00001', '+91 90000 00002', '+91 90000 00003']);
    const card = (await call(base, 'GET', '/orders/latest')).body.cards.find((c) => c.distributor);
    assert.match(card.distributor.phone, /^\+91 90000 0000\d$/);

    db.prepare('UPDATE distributor SET phone = NULL').run();
    assert.equal(seedIfEmpty(db, { today: () => '2026-11-22', now: () => '2026-11-22T06:30:00.000Z' }), false);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM distributor WHERE phone IS NOT NULL').get().n, 3);
  });
});
