import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractJson, validateVision, validateParse } from '../src/ai/validate.js';

const catalog = [{ id: 1 }, { id: 2 }];

test('vision: drops unknown id, bad count, bad confidence, duplicates', () => {
  const rows = [
    { item_id: 1, count: 5, confidence: 0.9 },
    { item_id: 99, count: 5, confidence: 0.9 },
    { item_id: 2, count: -1, confidence: 0.9 },
    { item_id: 2, count: 1000, confidence: 0.9 },
    { item_id: 2, count: 2.5, confidence: 0.9 },
    { item_id: 2, count: 3, confidence: 1.5 },
    { item_id: 2, count: 3, confidence: '0.9' },
    { item_id: 1, count: 6, confidence: 0.9 },
  ];
  const out = validateVision(rows, catalog);
  assert.deepEqual(out.items, [{ item_id: 1, count: 5, confidence: 0.9 }]);
  assert.equal(out.dropped, 7);
});

test('vision: keeps count 0 and 999', () => {
  const out = validateVision([{ item_id: 1, count: 0, confidence: 0 }, { item_id: 2, count: 999, confidence: 1 }], catalog);
  assert.equal(out.items.length, 2);
});

test('vision: non-array gives empty list', () => {
  assert.deepEqual(validateVision(undefined, catalog), { items: [], dropped: 0 });
  assert.deepEqual(validateVision('nope', catalog), { items: [], dropped: 0 });
});

test('extractJson: plain, fenced, wrapped, garbage', () => {
  assert.deepEqual(extractJson('[{"a":1}]'), [{ a: 1 }]);
  assert.deepEqual(extractJson('```json\n{"edits":[]}\n```'), { edits: [] });
  assert.deepEqual(extractJson('Here you go: [1,2] done'), [1, 2]);
  assert.equal(extractJson('not json'), undefined);
  assert.equal(extractJson(undefined), undefined);
});

test('parse: good edits pass and confidence is stripped', () => {
  const out = validateParse({ edits: [{ item_id: 1, count: 8, confidence: 0.9 }] }, catalog);
  assert.deepEqual(out, { edits: [{ item_id: 1, count: 8 }], unclear: false });
});

test('parse: unknown item gives unclear', () => {
  const out = validateParse({ edits: [{ item_id: 42, count: 8, confidence: 0.99 }] }, catalog);
  assert.equal(out.unclear, true);
  assert.deepEqual(out.edits, []);
});

test('parse: low confidence gives unclear and keeps ask', () => {
  const out = validateParse({ edits: [{ item_id: 1, count: 8, confidence: 0.3 }], ask: 'Which item?' }, catalog);
  assert.equal(out.unclear, true);
  assert.equal(out.ask, 'Which item?');
});

test('parse: one bad edit makes the whole reply unclear', () => {
  const out = validateParse({ edits: [{ item_id: 1, count: 8, confidence: 0.9 }, { item_id: 2, count: 3, confidence: 0.1 }] }, catalog);
  assert.equal(out.unclear, true);
});

test('parse: empty or malformed gives unclear', () => {
  assert.equal(validateParse({ edits: [] }, catalog).unclear, true);
  assert.equal(validateParse(undefined, catalog).unclear, true);
  assert.equal(validateParse({ edits: 'x' }, catalog).unclear, true);
});
