import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCards } from '../src/core/plan.js';

const dist = (id, date) => ({ id, name: `D${id}`, tint_index: id, next_visit_date: date, days_to_next_visit: 1, cycle_days: 7, visit_date_set: true });
const line = (item_id, distributor_id, status, extra = {}) => ({ item_id, distributor_id, status, ...extra });

test('cards sort by next visit; no-distributor card is last', () => {
  const cards = buildCards(
    [line(1, null, 'ok'), line(2, 2, 'ok'), line(3, 1, 'ok')],
    [dist(1, '2026-11-30'), dist(2, '2026-11-24')],
  );
  assert.deepEqual(cards.map((c) => c.distributor?.id ?? null), [2, 1, null]);
});

test('lines go into runs_out, order, enough, first_log buckets', () => {
  const [card] = buildCards(
    [line(1, 1, 'no_history'), line(2, 1, 'ok'), line(3, 1, 'order'), line(4, 1, 'runs_out')],
    [dist(1, '2026-11-24')],
  );
  assert.deepEqual(card.runs_out.map((l) => l.item_id), [4]);
  assert.deepEqual(card.order.map((l) => l.item_id), [3]);
  assert.deepEqual(card.enough.map((l) => l.item_id), [2]);
  assert.deepEqual(card.first_log.map((l) => l.item_id), [1]);
});

test('distributor without lines gets no card', () => {
  const cards = buildCards([line(1, 1, 'ok')], [dist(1, '2026-11-24'), dist(2, '2026-11-25')]);
  assert.equal(cards.length, 1);
});

test('confirmed when every order line has final_qty', () => {
  const d = [dist(1, '2026-11-24')];
  assert.equal(buildCards([line(1, 1, 'order', { final_qty: 6 }), line(2, 1, 'runs_out', { final_qty: 0 })], d)[0].confirmed, true);
  assert.equal(buildCards([line(1, 1, 'order', { final_qty: 6 }), line(2, 1, 'runs_out')], d)[0].confirmed, false);
  assert.equal(buildCards([line(1, 1, 'ok')], d)[0].confirmed, false);
});

test('visit_recorded from the distributor or a line', () => {
  const d = [dist(1, '2026-11-24')];
  assert.equal(buildCards([line(1, 1, 'ok')], d)[0].visit_recorded, false);
  assert.equal(buildCards([line(1, 1, 'ok', { visit_recorded: true })], d)[0].visit_recorded, true);
});

test('unknown distributor fails loudly', () => {
  assert.throws(() => buildCards([line(1, 99, 'ok')], [dist(1, '2026-11-24')]));
});
