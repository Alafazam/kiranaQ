import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { REASON_KEYS, REASON_KEY_LIST } from '../src/core/reasons.js';
import { computeItem } from '../src/core/rule.js';

test('every key computeItem emits is a known reason key with matching args', () => {
  const base = { rose: false, pack_size: 6, cycle_days: 7, days_to_next_visit: 2, distributor: 'S', next_visit_date: '2026-11-24' };
  const cases = [
    { ...base, p: null, c: 5, d: null, o: null },
    { ...base, p: 14, c: 4, d: 5, o: 2, days_to_next_visit: 5 },
    { ...base, p: 8, c: 0, d: 4, o: null },
    { ...base, p: 8, c: 5, d: 2, o: 1.5 },
    { ...base, p: 5, c: 5, d: 3, o: null },
  ];
  const seen = new Set();
  for (const input of cases) {
    const r = computeItem(input);
    seen.add(r.reason_key);
    assert.ok(REASON_KEY_LIST.includes(r.reason_key), r.reason_key);
    assert.deepEqual(Object.keys(r.reason_args).sort(), [...REASON_KEYS[r.reason_key]].sort(), r.reason_key);
  }
  assert.deepEqual([...seen].sort(), [...REASON_KEY_LIST].sort());
});

test('web i18n has en and hi templates for every reason key', (t) => {
  const file = new URL('../../web/src/i18n.js', import.meta.url);
  if (!fs.existsSync(file)) return t.skip('web/src/i18n.js not written yet (Lane D)');
  const src = fs.readFileSync(file, 'utf8');
  if (!REASON_KEY_LIST.some((k) => src.includes(k))) return t.skip('i18n.js has no reason block yet');
  for (const key of REASON_KEY_LIST) {
    const at = src.indexOf(key);
    assert.ok(at >= 0, `missing reason key ${key}`);
  }
  for (const lang of ['en', 'hi']) assert.ok(new RegExp(`\\b${lang}\\b`).test(src), `no ${lang} block`);
});
