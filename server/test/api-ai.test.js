import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withApp, insertStores } from './helpers.js';
import { createFakeAi } from '../src/ai/fake.js';
import { MAX_IMAGES, MAX_MODEL_CALLS_PER_HOUR, MAX_TTS_CHARS } from '../src/core/config.js';

const KINDS = ['vision', 'stt', 'tts', 'parse'];

function insertItems(db) {
  insertStores(db);
  const ins = db.prepare(
    `INSERT INTO item (id, store_id, sku_key, name_en, name_hi, aliases, item_group, unit, pack_size, active)
     VALUES (?, 1, ?, ?, ?, ?, 'snacks', 'pcs', 6, 1)`,
  );
  ins.run(1, 'maggi-70g', 'Maggi 70g', 'मैगी', '["maggi"]');
  ins.run(2, 'surf-1kg', 'Surf Excel 1kg', 'सर्फ', '["surf"]');
  ins.run(3, 'tea-250g', 'Tea 250g', 'चाय', '["chai"]');
}

const opts = (ai) => ({ ai, setup: insertItems });
const aiRows = (db) => db.prepare('SELECT * FROM ai_call ORDER BY id').all();

function imageForm(count = 1, type = 'image/jpeg') {
  const form = new FormData();
  for (let i = 0; i < count; i += 1) form.append('images', new Blob(['x'], { type }), `p${i}.jpg`);
  return form;
}

const postJson = (base, path, body) =>
  fetch(`${base}${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });

test('vision: success returns validated items and drops unknown ids', async () => {
  const ai = createFakeAi({
    countItems: async () => ({ items: [{ item_id: 1, count: 12, confidence: 0.9 }, { item_id: 77, count: 3, confidence: 0.9 }] }),
  });
  await withApp(async ({ base, db }) => {
    const res = await fetch(`${base}/api/vision`, { method: 'POST', body: imageForm(2) });
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { items: [{ item_id: 1, count: 12, confidence: 0.9 }], dropped: 1 });
    const rows = aiRows(db);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].kind, 'vision');
    assert.equal(rows[0].ok, 1);
  }, opts(ai));
});

test('vision: model throws gives 200 with empty list and error_code', async () => {
  const ai = createFakeAi({ countItems: async () => { throw Object.assign(new Error('boom'), { code: 'timeout' }); } });
  await withApp(async ({ base, db }) => {
    const res = await fetch(`${base}/api/vision`, { method: 'POST', body: imageForm() });
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { items: [], dropped: 0, error_code: 'timeout' });
    assert.deepEqual([aiRows(db)[0].ok, aiRows(db)[0].error_code], [0, 'timeout']);
  }, opts(ai));
});

test('vision: rejects no image, too many images and a bad type', async () => {
  await withApp(async ({ base }) => {
    assert.equal((await fetch(`${base}/api/vision`, { method: 'POST', body: new FormData() })).status, 400);
    assert.equal((await fetch(`${base}/api/vision`, { method: 'POST', body: imageForm(MAX_IMAGES + 1) })).status, 400);
    assert.equal((await fetch(`${base}/api/vision`, { method: 'POST', body: imageForm(1, 'text/plain') })).status, 400);
  }, opts(createFakeAi()));
});

test('parse: good edit passes, confidence stripped', async () => {
  await withApp(async ({ base }) => {
    const res = await postJson(base, '/api/parse', { text: 'maggi 8 hai', lang: 'hi', draft: [{ item_id: 1, count: 5 }] });
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { edits: [{ item_id: 1, count: 8 }], unclear: false });
  }, opts(createFakeAi()));
});

test('parse: low confidence or unknown item gives unclear with ask', async () => {
  const low = createFakeAi({ parseEdits: async () => ({ edits: [{ item_id: 1, count: 8, confidence: 0.2 }], ask: 'Kaunsa item?' }) });
  await withApp(async ({ base }) => {
    const body = await (await postJson(base, '/api/parse', { text: 'kuch', lang: 'hi', draft: [] })).json();
    assert.deepEqual(body, { edits: [], unclear: true, ask: 'Kaunsa item?' });
  }, opts(low));
  const unknown = createFakeAi({ parseEdits: async () => ({ edits: [{ item_id: 99, count: 8, confidence: 0.99 }] }) });
  await withApp(async ({ base }) => {
    const body = await (await postJson(base, '/api/parse', { text: 'kuch', draft: [] })).json();
    assert.equal(body.unclear, true);
    assert.deepEqual(body.edits, []);
  }, opts(unknown));
});

test('parse: model throws gives 200 unclear', async () => {
  const ai = createFakeAi({ parseEdits: async () => { throw new Error('down'); } });
  await withApp(async ({ base, db }) => {
    const res = await postJson(base, '/api/parse', { text: 'maggi 8', draft: [] });
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { edits: [], unclear: true, ask: 'Please say it again' });
    assert.equal(aiRows(db)[0].ok, 0);
  }, opts(ai));
});

test('parse: bad input gives 400', async () => {
  await withApp(async ({ base }) => {
    assert.equal((await postJson(base, '/api/parse', { draft: [] })).status, 400);
    assert.equal((await postJson(base, '/api/parse', { text: 'x', draft: [{ item_id: 'a', count: 1 }] })).status, 400);
  }, opts(createFakeAi()));
});

test('stt: failure gives 502 stt_failed and passes catalog keyterms', async () => {
  let seen;
  const ai = createFakeAi({ stt: async (_a, o) => { seen = o; throw new Error('down'); } });
  await withApp(async ({ base, db }) => {
    const form = new FormData();
    form.append('audio', new Blob(['x'], { type: 'audio/wav' }), 'a.wav');
    const res = await fetch(`${base}/api/stt`, { method: 'POST', body: form });
    assert.equal(res.status, 502);
    assert.equal((await res.json()).error.code, 'stt_failed');
    assert.ok(seen.keyterms.includes('Maggi 70g'));
    assert.ok(seen.keyterms.includes('chai'));
    assert.equal(aiRows(db)[0].kind, 'stt');
  }, opts(ai));
});

test('tts: too long gives 400; failure gives 502 tts_failed', async () => {
  await withApp(async ({ base }) => {
    const res = await postJson(base, '/api/tts', { text: 'a'.repeat(MAX_TTS_CHARS + 1) });
    assert.equal(res.status, 400);
    assert.equal((await res.json()).error.code, 'text_too_long');
  }, opts(createFakeAi()));
  const ai = createFakeAi({ tts: async () => { throw new Error('down'); } });
  await withApp(async ({ base }) => {
    const res = await postJson(base, '/api/tts', { text: 'hello' });
    assert.equal(res.status, 502);
    assert.equal((await res.json()).error.code, 'tts_failed');
  }, opts(ai));
});

test('ai_call rows hold no content', async () => {
  await withApp(async ({ base, db }) => {
    await postJson(base, '/api/parse', { text: 'secret transcript words', draft: [] });
    await postJson(base, '/api/tts', { text: 'secret spoken words' });
    const dump = JSON.stringify(aiRows(db));
    assert.ok(!dump.includes('secret'));
    assert.deepEqual(aiRows(db).map((r) => r.kind), ['parse', 'tts']);
  }, opts(createFakeAi()));
});

test('rate cap: over MAX_MODEL_CALLS_PER_HOUR gives 429 rate_limited', async () => {
  await withApp(async ({ base, db }) => {
    const ins = db.prepare(
      `INSERT INTO ai_call (store_id, kind, provider, model, ok, latency_ms, created_at) VALUES (1, 'parse', 'x', 'x', 1, 1, '2026-11-22T06:00:00.000Z')`,
    );
    for (let i = 0; i < MAX_MODEL_CALLS_PER_HOUR; i += 1) ins.run();
    const res = await postJson(base, '/api/parse', { text: 'maggi 8', draft: [] });
    assert.equal(res.status, 429);
    assert.equal((await res.json()).error.code, 'rate_limited');
  }, opts(createFakeAi()));
});
