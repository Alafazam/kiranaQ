import test from 'node:test';
import assert from 'node:assert/strict';
import { computeItem, roundupToPack } from '../src/core/rule.js';

const base = { p: 10, c: 5, d: 2, o: null, rose: false, pack_size: 6, cycle_days: 7, days_to_next_visit: 2 };

test('R6 example: rate 1.5, stock 5, visit in 2 days, cycle 7 -> 12', () => {
  const r = computeItem({ ...base, p: 8, c: 5, d: 2, o: 1.5, rose: false });
  // observed 1.5, smoothed with old 1.5 -> 1.5
  assert.equal(r.rate_per_day, 1.5);
  assert.equal(r.suggested_qty, 12);
  assert.equal(r.status, 'order');
  assert.equal(r.reason_key, 'order_needed');
});

test('first log: no history, no quantity', () => {
  const r = computeItem({ ...base, p: null, d: null, o: null });
  assert.equal(r.status, 'no_history');
  assert.equal(r.rate_per_day, null);
  assert.equal(r.suggested_qty, 0);
  assert.equal(r.reason_key, 'no_history');
});

test('no old rate: rate is the observed rate', () => {
  const r = computeItem({ ...base, p: 10, c: 6, d: 2, o: null });
  assert.equal(r.rate_per_day, 2);
});

test('smoothing mixes the new and the old rate', () => {
  const r = computeItem({ ...base, p: 10, c: 6, d: 2, o: 1 }); // observed 2, old 1
  assert.equal(r.rate_per_day, 1.5);
});

test('stock-out: count 0 raises the observed rate by 25%', () => {
  const r = computeItem({ ...base, p: 8, c: 0, d: 4, o: null });
  assert.equal(r.rate_per_day, 2.5); // 8/4 = 2, x1.25
  assert.equal(r.status, 'runs_out');
  assert.equal(r.days_of_cover, 0);
  assert.equal(r.reason_key, 'ran_out_last_time');
  assert.ok(r.suggested_qty > 0);
});

test('rate 0: cover is null, no order, status ok', () => {
  const r = computeItem({ ...base, p: 5, c: 5, d: 3, o: null });
  assert.equal(r.rate_per_day, 0);
  assert.equal(r.days_of_cover, null);
  assert.equal(r.suggested_qty, 0);
  assert.equal(r.status, 'ok');
  assert.equal(r.reason_key, 'no_order_needed');
});

test('d = 0 keeps the old rate', () => {
  const r = computeItem({ ...base, p: 10, c: 2, d: 0, o: 1 });
  assert.equal(r.rate_per_day, 1);
});

test('d = 0 with no old rate is no_history', () => {
  const r = computeItem({ ...base, p: 10, c: 2, d: 0, o: null });
  assert.equal(r.status, 'no_history');
});

test('rose keeps the old rate even when the count went up', () => {
  const r = computeItem({ ...base, p: 4, c: 16, d: 2, o: 0.5, rose: true });
  assert.equal(r.rate_per_day, 0.5);
});

test('runs out before the visit: call_early and days_out', () => {
  const r = computeItem({ ...base, p: 14, c: 4, d: 5, o: 2, days_to_next_visit: 5 });
  // observed 2, rate 2, cover 2 < 5
  assert.equal(r.status, 'runs_out');
  assert.equal(r.call_early, true);
  assert.equal(r.days_out, 3);
  assert.equal(r.reason_key, 'runs_out_before_visit');
  assert.equal(r.reason_args.days_to_next_visit, 5);
});

test('enough stock: ok with no order', () => {
  const r = computeItem({ ...base, p: 100, c: 98, d: 2, o: 1, days_to_next_visit: 2 });
  assert.equal(r.status, 'ok');
  assert.equal(r.suggested_qty, 0);
});

test('15-day distributor orders more than a 4-day one', () => {
  const short = computeItem({ ...base, p: 10, c: 5, d: 2, o: 2.5, cycle_days: 4, days_to_next_visit: 2 });
  const long = computeItem({ ...base, p: 10, c: 5, d: 2, o: 2.5, cycle_days: 15, days_to_next_visit: 2 });
  assert.ok(long.suggested_qty > short.suggested_qty);
});

test('suggested quantity is a multiple of the pack size', () => {
  const r = computeItem({ ...base, pack_size: 12, p: 30, c: 3, d: 3, o: 9 });
  assert.equal(r.suggested_qty % 12, 0);
});

test('reason args pass the distributor name and visit date through', () => {
  const r = computeItem({ ...base, p: 8, c: 5, d: 2, o: 1.5, distributor: 'Sharma', next_visit_date: '2026-11-24' });
  assert.equal(r.reason_args.distributor, 'Sharma');
  assert.equal(r.reason_args.next_visit_date, '2026-11-24');
});

test('roundupToPack', () => {
  assert.equal(roundupToPack(10.5, 6), 12);
  assert.equal(roundupToPack(12, 6), 12);
  assert.equal(roundupToPack(0, 6), 0);
  assert.equal(roundupToPack(-3, 6), 0);
  assert.equal(roundupToPack(1, 1), 1);
  assert.throws(() => roundupToPack(5, 0));
});
