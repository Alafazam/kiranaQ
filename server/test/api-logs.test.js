// Logs, results and orders (R1, R5-R8).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withApp } from './helpers.js';
import { seedFixture, movableClock, call, logBody, saveHistory, findLine, ITEM, DIST } from './fixtures-b.js';

function setup() {
  const clock = movableClock('2026-11-22');
  return { clock, opts: { setup: seedFixture, clock } };
}

test('first log: every line is first_log (no_history), no candidates', async () => {
  const { opts } = setup();
  await withApp(async ({ base }) => {
    const { status, body } = await call(base, 'POST', '/logs', logBody({ 1: 11, 2: 7, 5: 10 }));
    assert.equal(status, 201);
    assert.equal(body.log_date, '2026-11-22');
    assert.equal(body.not_counted, 2);
    assert.deepEqual(body.delivery_candidates, []);
    const lines = body.cards.flatMap((c) => [...c.runs_out, ...c.order, ...c.enough, ...c.first_log]);
    assert.equal(lines.length, 3);
    for (const l of lines) {
      assert.equal(l.status, 'no_history');
      assert.equal(l.suggested_qty, 0);
      assert.equal(l.reason_key, 'no_history');
    }
    assert.equal(body.cards.at(-1).distributor, null, 'no-distributor card is last');
  }, opts);
});

test('third log: Surf runs out, Maggi order of 12, Rin enough, cards sorted by next visit', async () => {
  const { clock, opts } = setup();
  await withApp(async ({ base, db }) => {
    const { status, body } = await saveHistory(base, clock);
    assert.equal(status, 201);
    assert.equal(body.not_counted, 1, 'Parle-G left out');

    const surf = findLine(body.cards, ITEM.surf);
    assert.equal(surf.bucket, 'runs_out');
    assert.equal(surf.card.distributor.name, 'Sharma Traders');
    assert.equal(surf.line.reason_key, 'runs_out_before_visit');
    assert.ok(surf.line.suggested_qty > 0 && surf.line.suggested_qty % 6 === 0);

    const maggi = findLine(body.cards, ITEM.maggi);
    assert.equal(maggi.bucket, 'order');
    assert.equal(maggi.line.rate_per_day, 1.5);
    assert.equal(maggi.line.suggested_qty, 12, 'R6 example: 1.5 x 9 x 1.15 - 5 -> 12');
    assert.equal(maggi.line.reason_key, 'order_needed');
    assert.equal(maggi.line.reason_args.distributor, 'Sharma Traders');

    assert.equal(findLine(body.cards, ITEM.rin).bucket, 'enough');
    assert.equal(findLine(body.cards, ITEM.parle), null, 'not counted: no line');

    // Sharma (24 Nov) has lines, Gupta has none in this log; the no-distributor card is last.
    assert.equal(body.cards[0].distributor.id, DIST.sharma);
    assert.equal(body.cards.at(-1).distributor, null);
    assert.equal(body.cards[0].confirmed, false);
    assert.equal(body.cards[0].visit_recorded, false);

    // Parle-G was not counted: its rate and last log stay from log 2.
    const parle = db.prepare('SELECT rate_per_day, last_log_id FROM item_state WHERE store_id = 1 AND item_id = ?').get(ITEM.parle);
    assert.equal(parle.rate_per_day, 24);
    assert.equal(parle.last_log_id, 2);

    // Home strip shows runs-out count per distributor.
    const dists = (await call(base, 'GET', '/distributors')).body;
    assert.equal(dists.find((d) => d.id === DIST.sharma).runs_out_count, 1);
  }, opts);
});

test('POST /logs rejects bad bodies', async () => {
  const { opts } = setup();
  await withApp(async ({ base }) => {
    const bad = [
      logBody({}),
      logBody({ 999: 3 }),
      logBody({ 1: -1 }),
      logBody({ 1: 10000 }),
      { ...logBody({ 1: 3 }), source: 'fax' },
      { source: 'manual', counts: [{ item_id: 1, count: 3 }, { item_id: 1, count: 4 }] },
    ];
    for (const body of bad) {
      const res = await call(base, 'POST', '/logs', body);
      assert.equal(res.status, 400, JSON.stringify(body));
      assert.ok(res.body.error.code);
    }
    assert.deepEqual((await call(base, 'GET', '/logs')).body, [], 'nothing saved');
  }, opts);
});

test('GET /logs newest first; GET /logs/:id and /result; GET /orders/latest', async () => {
  const { clock, opts } = setup();
  await withApp(async ({ base }) => {
    assert.deepEqual((await call(base, 'GET', '/orders/latest')).body, { cards: [] });
    await saveHistory(base, clock);
    const logs = (await call(base, 'GET', '/logs')).body;
    assert.deepEqual(logs.map((l) => l.log_date), ['2026-11-22', '2026-11-20', '2026-11-18']);
    assert.equal(logs[0].item_count, 4);
    assert.equal(logs[0].runs_out_count, 2, 'Surf, and Chini on the default cycle');
    assert.deepEqual(logs[0].visits, []);

    const one = (await call(base, 'GET', `/logs/${logs[0].id}`)).body;
    assert.equal(one.log.id, logs[0].id);
    assert.equal(one.counts.length, 4);
    assert.ok(Array.isArray(one.cards));

    const result = (await call(base, 'GET', `/logs/${logs[0].id}/result`)).body;
    const latest = (await call(base, 'GET', '/orders/latest')).body;
    assert.deepEqual(latest, result);
    assert.equal((await call(base, 'GET', '/logs/999/result')).status, 404);
    assert.equal((await call(base, 'GET', '/logs/abc')).status, 404);
  }, opts);
});

test('PUT /logs/:id/order stores final qty (also runs-out lines) and rejects a non-pack qty', async () => {
  const { clock, opts } = setup();
  await withApp(async ({ base }) => {
    const { body } = await saveHistory(base, clock);
    const id = body.log_id;
    const bad = await call(base, 'PUT', `/logs/${id}/order`, { distributor_id: DIST.sharma, lines: [{ item_id: ITEM.maggi, final_qty: 7 }] });
    assert.equal(bad.status, 400);
    const other = await call(base, 'PUT', `/logs/${id}/order`, { distributor_id: DIST.sharma, lines: [{ item_id: ITEM.chini, final_qty: 1 }] });
    assert.equal(other.status, 400, 'item of another card');
    assert.equal((await call(base, 'PUT', '/logs/999/order', { distributor_id: DIST.sharma, lines: [] })).status, 404);

    const ok = await call(base, 'PUT', `/logs/${id}/order`, { distributor_id: DIST.sharma, lines: [{ item_id: ITEM.surf, final_qty: 18 }] });
    assert.equal(ok.status, 200);
    const surf = findLine(ok.body.cards, ITEM.surf);
    assert.equal(surf.line.final_qty, 18);
    assert.equal(findLine(ok.body.cards, ITEM.maggi).line.final_qty, 12, 'unlisted order line takes the suggestion');
    assert.equal(findLine(ok.body.cards, ITEM.rin).line.final_qty, null, 'enough line stays unset');
    assert.equal(surf.card.confirmed, true);

    // Calling again with the same body gives the same cards.
    const again = await call(base, 'PUT', `/logs/${id}/order`, { distributor_id: DIST.sharma, lines: [{ item_id: ITEM.surf, final_qty: 18 }] });
    assert.deepEqual(again.body, ok.body);
  }, opts);
});
