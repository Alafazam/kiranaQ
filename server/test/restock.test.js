import test from 'node:test';
import assert from 'node:assert/strict';
import { findDeliveryCandidates, risenItemIds } from '../src/core/restock.js';

const maggi = { item_id: 1, distributor_id: 10, p: 4, c: 16, d: 2, o: 0.5, pack_size: 6 };

test('spec example: Maggi expected 3, now 16, rise 13', () => {
  assert.deepEqual(findDeliveryCandidates([maggi]), [{ distributor_id: 10, items: [{ item_id: 1, rise: 13 }] }]);
});

test('count noise below one pack is not a delivery', () => {
  assert.deepEqual(findDeliveryCandidates([{ ...maggi, c: 6 }]), []); // rise 3 < 6
});

test('rise of exactly one pack counts', () => {
  assert.equal(findDeliveryCandidates([{ ...maggi, c: 9 }]).length, 1); // rise 6
});

test('null old rate: expected is the previous count', () => {
  const out = findDeliveryCandidates([{ ...maggi, o: null, c: 10 }]);
  assert.deepEqual(out[0].items, [{ item_id: 1, rise: 6 }]);
});

test('expected never goes below 0', () => {
  const out = findDeliveryCandidates([{ ...maggi, p: 2, o: 5, c: 6 }]);
  assert.deepEqual(out[0].items, [{ item_id: 1, rise: 6 }]);
});

test('no earlier count and no distributor are left out of candidates', () => {
  const rows = [{ ...maggi, p: null }, { ...maggi, item_id: 2, distributor_id: null }];
  assert.deepEqual(findDeliveryCandidates(rows), []);
});

test('items group by distributor', () => {
  const rows = [maggi, { ...maggi, item_id: 2 }, { ...maggi, item_id: 3, distributor_id: 11 }];
  const out = findDeliveryCandidates(rows);
  assert.equal(out.length, 2);
  assert.equal(out.find((x) => x.distributor_id === 10).items.length, 2);
});

test('risenItemIds includes items with no distributor, not first logs', () => {
  const rows = [maggi, { ...maggi, item_id: 2, distributor_id: null }, { ...maggi, item_id: 3, p: null }];
  assert.deepEqual([...risenItemIds(rows)].sort(), [1, 2]);
});
