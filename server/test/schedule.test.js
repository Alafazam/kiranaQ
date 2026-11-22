import test from 'node:test';
import assert from 'node:assert/strict';
import { nextVisit } from '../src/core/schedule.js';

test('visit today gives today + cycle', () => {
  assert.deepEqual(nextVisit('2026-11-22', 7, '2026-11-22'),
    { next_visit_date: '2026-11-29', days_to_next_visit: 7, visit_date_set: true });
});

test('last visit 5 days ago, cycle 7 -> in 2 days', () => {
  const r = nextVisit('2026-11-17', 7, '2026-11-22');
  assert.equal(r.next_visit_date, '2026-11-24');
  assert.equal(r.days_to_next_visit, 2);
});

test('visit due today is today', () => {
  const r = nextVisit('2026-11-15', 7, '2026-11-22');
  assert.equal(r.next_visit_date, '2026-11-22');
  assert.equal(r.days_to_next_visit, 0);
});

test('long ago: first multiple that is today or later', () => {
  const r = nextVisit('2026-10-01', 15, '2026-11-22'); // 52 days -> k = 4 -> +60
  assert.equal(r.next_visit_date, '2026-11-30');
  assert.equal(r.days_to_next_visit, 8);
});

test('no last visit: today + cycle, not set', () => {
  assert.deepEqual(nextVisit(null, 4, '2026-11-22'),
    { next_visit_date: '2026-11-26', days_to_next_visit: 4, visit_date_set: false });
});

test('month and year boundaries', () => {
  assert.equal(nextVisit('2026-12-28', 7, '2026-12-30').next_visit_date, '2027-01-04');
});

test('bad input fails loudly', () => {
  assert.throws(() => nextVisit(null, 0, '2026-11-22'));
  assert.throws(() => nextVisit(null, 7, 'nope'));
});
