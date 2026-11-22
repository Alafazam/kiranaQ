import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withApp } from './helpers.js';

test('GET /api/health returns ok, db and key flags (never values)', async () => {
  await withApp(async ({ base }) => {
    const res = await fetch(`${base}/api/health`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.ok, true);
    assert.equal(body.db, true);
    assert.equal(typeof body.keys.sarvam, 'boolean');
    assert.equal(typeof body.keys.anthropic, 'boolean');
  });
});

test('migration 1 creates every table', async () => {
  await withApp(async ({ db }) => {
    const names = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all().map((r) => r.name);
    for (const t of ['store', 'distributor', 'item', 'stock_log', 'stock_count', 'item_result', 'visit', 'receipt', 'item_state', 'ai_call']) {
      assert.ok(names.includes(t), `missing table ${t}`);
    }
  });
});

test('unknown API route gives a JSON 404', async () => {
  await withApp(async ({ base }) => {
    const res = await fetch(`${base}/api/nope`);
    assert.equal(res.status, 404);
    assert.equal((await res.json()).error.code, 'not_found');
  });
});
