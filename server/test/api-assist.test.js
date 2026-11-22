import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withApp, insertStores } from './helpers.js';
import { validateAssist } from '../src/ai/validate.js';

const catalog = [{ id: 1 }, { id: 2 }];
const context = { distributors: [{ id: 5, name: 'Sharma' }] };
const askAgain = 'Phir se bolenge?';
const v = (raw) => validateAssist(raw, { catalog, context, askAgain });

test('validate: good answer passes', () => {
  const out = v({ say: 'Theek hai', actions: [{ type: 'navigate', to: 'orders' }], expect: 'done', options: ['haan', 'nahi'] });
  assert.deepEqual(out, { say: 'Theek hai', actions: [{ type: 'navigate', to: 'orders' }], expect: 'done', options: ['haan', 'nahi'] });
});

test('validate: unknown action dropped; all dropped gives ask again', () => {
  const out = v({ say: 'Done', actions: [{ type: 'delete_everything' }], expect: 'done' });
  assert.deepEqual(out, { say: askAgain, actions: [], expect: 'answer' });
});

test('validate: unknown ids and bad params dropped', () => {
  assert.equal(v({ say: 'x', actions: [{ type: 'confirm_order', distributor_id: 99 }, { type: 'navigate', to: 'moon' }, { type: 'use_sample', index: -1 }] }).actions.length, 0);
  assert.equal(v({ say: 'x', actions: [{ type: 'set_counts', edits: [{ item_id: 77, count: 3 }] }] }).actions.length, 0);
  assert.equal(v({ say: 'x', actions: [{ type: 'set_counts', edits: [{ item_id: 1, count: 3, confidence: 0.1 }] }] }).actions.length, 0);
  assert.equal(v({ say: 'x', actions: [{ type: 'set_qty', distributor_id: 5, item_id: 1, qty: 1.5 }] }).actions.length, 0);
});

test('validate: a write action forces expect confirm', () => {
  for (const action of [{ type: 'save_log' }, { type: 'confirm_order', distributor_id: 5 }, { type: 'visit', distributor_id: 5, delivered: true }]) {
    assert.equal(v({ say: 'Pakka karun?', actions: [action], expect: 'done' }).expect, 'confirm');
  }
});

test('validate: say is cut to 200 chars; no say gives null', () => {
  assert.equal(v({ say: 'a'.repeat(300), actions: [] }).say.length, 200);
  assert.equal(v({ actions: [] }), null);
  assert.equal(v(undefined), null);
});

test('validate: set_counts keeps only item_id and count; bad expect becomes answer', () => {
  const out = v({ say: 'ok', actions: [{ type: 'set_counts', edits: [{ item_id: 1, count: 8, confidence: 0.9 }] }], expect: 'maybe' });
  assert.deepEqual(out.actions, [{ type: 'set_counts', edits: [{ item_id: 1, count: 8 }] }]);
  assert.equal(out.expect, 'answer');
});

function insertItems(db) {
  insertStores(db);
  db.prepare(`INSERT INTO item (id, store_id, sku_key, name_en, name_hi, aliases, item_group, unit, pack_size, active) VALUES (1, 1, 'maggi', 'Maggi', 'मैगी', '[]', 'snacks', 'pcs', 6, 1)`).run();
}
const body = (extra = {}) => JSON.stringify({ text: 'stock ginna hai', lang: 'hi', screen: '/', context: {}, history: [], ...extra });
const post = (base, b) => fetch(`${base}/api/assist`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: b });
const rows = (db) => db.prepare('SELECT * FROM ai_call').all();

test('api: success returns validated answer and writes one ai_call row', async () => {
  const assistFn = async () => ({ say: 'Photo lenge?', actions: [{ type: 'start_log' }, { type: 'bogus' }], expect: 'answer' });
  await withApp(async ({ base, db }) => {
    const res = await post(base, body());
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { say: 'Photo lenge?', actions: [{ type: 'start_log' }], expect: 'answer' });
    assert.equal(rows(db).length, 1);
    assert.ok(!JSON.stringify(rows(db)).includes('stock ginna'));
  }, { setup: insertItems, speech: { assistFn } });
});

test('api: model failure gives 200 ask again', async () => {
  const assistFn = async () => { throw new Error('down'); };
  await withApp(async ({ base, db }) => {
    const res = await post(base, body({ lang: 'en' }));
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { say: 'Please say it again', actions: [], expect: 'answer' });
    assert.equal(rows(db)[0].ok, 0);
  }, { setup: insertItems, speech: { assistFn } });
});

test('api: no assist function behind the ai gives 200 ask again', async () => {
  await withApp(async ({ base }) => {
    const out = await (await post(base, body())).json();
    assert.deepEqual(out.actions, []);
    assert.equal(out.expect, 'answer');
  }, { setup: insertItems });
});

test('api: write action from the model comes back with expect confirm', async () => {
  const assistFn = async () => ({ say: 'Log save karun?', actions: [{ type: 'save_log' }], expect: 'done' });
  await withApp(async ({ base }) => {
    const out = await (await post(base, body({ screen: '/log/new/check' }))).json();
    assert.equal(out.expect, 'confirm');
  }, { setup: insertItems, speech: { assistFn } });
});

test('api: bad input gives 400; history is cut to last 6 turns', async () => {
  let seen;
  const assistFn = async (input) => { seen = input; return { say: 'ok', actions: [] }; };
  await withApp(async ({ base }) => {
    assert.equal((await post(base, body({ text: ' ' }))).status, 400);
    assert.equal((await post(base, body({ lang: 'fr' }))).status, 400);
    assert.equal((await post(base, body({ screen: '/nope' }))).status, 400);
    assert.equal((await post(base, body({ context: 'x' }))).status, 400);
    const history = Array.from({ length: 10 }, (_, i) => ({ role: 'user', text: `t${i}` }));
    assert.equal((await post(base, body({ history }))).status, 200);
    assert.equal(seen.history.length, 6);
    assert.equal(seen.history[0].text, 't4');
  }, { setup: insertItems, speech: { assistFn } });
});
