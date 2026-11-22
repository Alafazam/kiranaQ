// Restock log and visit confirm (R13).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withApp } from './helpers.js';
import { seedFixture, movableClock, call, logBody, saveHistory, findLine, ITEM, DIST } from './fixtures-b.js';

function setup() {
  const clock = movableClock('2026-11-22');
  return { clock, opts: { setup: seedFixture, clock } };
}

/** History, then a same-day restock log: Maggi 5 -> 17, Surf 1 -> 13, Rin unchanged. */
async function restock(base, clock) {
  await saveHistory(base, clock);
  return call(base, 'POST', '/logs', logBody({ 1: 17, 2: 13, 3: 38, 5: 6 }));
}

function snapshot(db) {
  const q = (sql) => db.prepare(sql).all();
  return {
    visit: q('SELECT store_id, distributor_id, log_id, visited_on FROM visit ORDER BY id'),
    receipt: q('SELECT * FROM receipt ORDER BY visit_id, item_id'),
    result: q('SELECT * FROM item_result ORDER BY log_id, item_id'),
    state: q('SELECT store_id, item_id, rate_per_day, last_log_id FROM item_state ORDER BY item_id'),
    distributor: q('SELECT * FROM distributor ORDER BY id'),
  };
}

test('same-day restock log gives a Sharma candidate and keeps the old rate', async () => {
  const { clock, opts } = setup();
  await withApp(async ({ base, db }) => {
    const { status, body } = await restock(base, clock);
    assert.equal(status, 201);
    assert.equal(body.delivery_candidates.length, 1);
    const cand = body.delivery_candidates[0];
    assert.equal(cand.distributor_id, DIST.sharma);
    assert.equal(cand.name, 'Sharma Traders');
    assert.deepEqual(cand.items.map((i) => [i.item_id, i.rise]).sort(), [[ITEM.maggi, 12], [ITEM.surf, 12]]);
    assert.ok(cand.items.every((i) => i.name_en.length > 0 && typeof i.sku_key === 'string'));
    assert.equal(findLine(body.cards, ITEM.maggi).line.rate_per_day, 1.5);
    assert.equal(db.prepare('SELECT has_restock FROM stock_log WHERE id = ?').get(body.log_id).has_restock, 1);
  }, opts);
});

test('confirm saves visit and receipts, moves next visit to today + cycle, and is idempotent', async () => {
  const { clock, opts } = setup();
  await withApp(async ({ base, db }) => {
    const { body } = await restock(base, clock);
    const stateBefore = snapshot(db).state;
    const first = await call(base, 'POST', `/logs/${body.log_id}/visits`, { distributor_id: DIST.sharma, confirmed: true });
    assert.equal(first.status, 200);
    assert.equal(first.body.distributor.last_visit_date, '2026-11-22');
    assert.equal(first.body.distributor.next_visit_date, '2026-11-29');
    assert.equal(first.body.distributor.days_to_next_visit, 7);

    const sharmaCard = first.body.cards.find((c) => c.distributor?.id === DIST.sharma);
    assert.equal(sharmaCard.visit_recorded, true);
    assert.equal(sharmaCard.distributor.next_visit_date, '2026-11-29');
    // Re-planned with the stored rate: Maggi 17 at 1.5/day now needs an order for 14 days.
    const maggi = findLine(first.body.cards, ITEM.maggi);
    assert.equal(maggi.line.rate_per_day, 1.5);
    assert.equal(maggi.line.suggested_qty, 12);

    const rows = snapshot(db);
    assert.equal(rows.visit.length, 1);
    assert.deepEqual(rows.receipt.map((r) => [r.item_id, r.received_qty]), [[ITEM.maggi, 12], [ITEM.surf, 12]]);
    assert.deepEqual(rows.state, stateBefore, 'item_state is never touched');

    const second = await call(base, 'POST', `/logs/${body.log_id}/visits`, { distributor_id: DIST.sharma, confirmed: true });
    assert.equal(second.status, 200);
    assert.deepEqual(second.body, first.body);
    assert.deepEqual(snapshot(db), rows, 'same rows after a second confirm');

    const logs = (await call(base, 'GET', '/logs')).body;
    assert.deepEqual(logs[0].visits, [{ distributor_id: DIST.sharma, name: 'Sharma Traders' }]);
  }, opts);
});

test('confirmed: false changes nothing', async () => {
  const { clock, opts } = setup();
  await withApp(async ({ base, db }) => {
    const { body } = await restock(base, clock);
    const before = snapshot(db);
    const res = await call(base, 'POST', `/logs/${body.log_id}/visits`, { distributor_id: DIST.sharma, confirmed: false });
    assert.equal(res.status, 200);
    assert.deepEqual(snapshot(db), before);
    assert.equal(res.body.distributor.next_visit_date, '2026-11-24');
  }, opts);
});

test('a non-candidate distributor gives 400; unknown log or distributor gives 404', async () => {
  const { clock, opts } = setup();
  await withApp(async ({ base }) => {
    const { body } = await restock(base, clock);
    const res = await call(base, 'POST', `/logs/${body.log_id}/visits`, { distributor_id: DIST.gupta, confirmed: true });
    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, 'not_a_candidate');
    assert.equal((await call(base, 'POST', '/logs/999/visits', { distributor_id: DIST.sharma, confirmed: true })).status, 404);
    assert.equal((await call(base, 'POST', `/logs/${body.log_id}/visits`, { distributor_id: 999, confirmed: true })).status, 404);
    assert.equal((await call(base, 'POST', `/logs/${body.log_id}/visits`, { distributor_id: DIST.sharma })).status, 400);
  }, opts);
});
