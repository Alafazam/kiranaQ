import { test } from 'node:test';
import assert from 'node:assert/strict';
import { initDb } from '../src/db.js';
import { createApp } from '../src/app.js';

async function withServer(speech, fn) {
  process.env.NODE_ENV = 'test';
  const db = initDb(':memory:');
  const server = createApp(db, { speech }).listen(0);
  try {
    await fn(`http://127.0.0.1:${server.address().port}`);
  } finally {
    server.close();
    db.close();
  }
}

test('POST /api/tts returns audio', async () => {
  const speech = { speakFn: async () => Buffer.from('RIFFfake') };
  await withServer(speech, async (base) => {
    const res = await fetch(`${base}/api/tts`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text: 'hello' }),
    });
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('content-type'), 'audio/wav');
    assert.equal(Buffer.from(await res.arrayBuffer()).toString(), 'RIFFfake');
  });
});

test('POST /api/tts rejects empty text', async () => {
  await withServer({}, async (base) => {
    const res = await fetch(`${base}/api/tts`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text: ' ' }),
    });
    assert.equal(res.status, 400);
  });
});

test('POST /api/stt returns transcript', async () => {
  const speech = { transcribeFn: async () => ({ transcript: 'ok', languageCode: 'en-IN' }) };
  await withServer(speech, async (base) => {
    const form = new FormData();
    form.append('audio', new Blob(['x'], { type: 'audio/wav' }), 'a.wav');
    const res = await fetch(`${base}/api/stt`, { method: 'POST', body: form });
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { transcript: 'ok', languageCode: 'en-IN' });
  });
});

test('POST /api/stt rejects a missing file', async () => {
  await withServer({}, async (base) => {
    const res = await fetch(`${base}/api/stt`, { method: 'POST', body: new FormData() });
    assert.equal(res.status, 400);
  });
});
