import test from 'node:test';
import assert from 'node:assert/strict';
import { initDb } from '../src/db.js';
import { fixedClock } from '../src/clock.js';
import { seedIfEmpty, clearStore } from '../scripts/seed.js';

const one = (db, sql) => db.prepare(sql).get();

test('seeds 1 store, 3 distributors, items, 3 logs, 1 visit with receipts', () => {
  const db = initDb(':memory:');
  assert.equal(seedIfEmpty(db, fixedClock('2026-11-22')), true);
  assert.equal(one(db, 'SELECT COUNT(*) n FROM store').n, 1);
  assert.deepEqual(db.prepare('SELECT cycle_days FROM distributor ORDER BY cycle_days').all().map((r) => r.cycle_days), [4, 7, 15]);
  assert.ok(one(db, 'SELECT COUNT(*) n FROM item').n >= 25);
  assert.equal(one(db, 'SELECT COUNT(*) n FROM stock_log').n, 3);
  assert.equal(one(db, 'SELECT COUNT(*) n FROM visit').n, 1);
  assert.ok(one(db, 'SELECT COUNT(*) n FROM receipt').n > 0);
  assert.ok(one(db, 'SELECT COUNT(*) n FROM item_state').n > 0);
  db.close();
});

test('is idempotent: a second call changes nothing', () => {
  const db = initDb(':memory:');
  const clock = fixedClock('2026-11-22');
  seedIfEmpty(db, clock);
  const before = one(db, 'SELECT COUNT(*) n FROM item_result').n;
  assert.equal(seedIfEmpty(db, clock), false);
  assert.equal(one(db, 'SELECT COUNT(*) n FROM item_result').n, before);
  db.close();
});

test('dates are relative to the clock', () => {
  for (const today of ['2026-11-22', '2027-03-01']) {
    const db = initDb(':memory:');
    seedIfEmpty(db, fixedClock(today));
    const dates = db.prepare('SELECT log_date FROM stock_log ORDER BY log_date').all().map((r) => r.log_date);
    assert.ok(dates.every((d) => d < today));
    assert.ok(Date.parse(today) - Date.parse(dates[0]) <= 7 * 86400000);
    db.close();
  }
});

test('last log has runs-out and order lines; unconfirmed; results use known reason keys', () => {
  const db = initDb(':memory:');
  seedIfEmpty(db, fixedClock('2026-11-22'));
  const last = one(db, 'SELECT id FROM stock_log ORDER BY log_date DESC LIMIT 1').id;
  const rows = db.prepare('SELECT status, final_qty FROM item_result WHERE log_id = ?').all(last);
  assert.ok(rows.some((r) => r.status === 'runs_out'));
  assert.ok(rows.some((r) => r.status === 'order'));
  assert.ok(rows.every((r) => r.final_qty === null));
  db.close();
});

test('clearStore then seed again works', () => {
  const db = initDb(':memory:');
  const clock = fixedClock('2026-11-22');
  seedIfEmpty(db, clock);
  clearStore(db);
  assert.equal(one(db, 'SELECT COUNT(*) n FROM store').n, 0);
  assert.equal(seedIfEmpty(db, clock), true);
  db.close();
});
