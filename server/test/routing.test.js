import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { initDb } from '../src/db.js';
import { createApp } from '../src/app.js';
import { fixedClock } from '../src/clock.js';
import { createFakeAi } from '../src/ai/fake.js';

// A tiny public dir: app index.html and a landing page.
function makePublic() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kq-public-'));
  fs.writeFileSync(path.join(dir, 'index.html'), '<html>APP</html>');
  fs.mkdirSync(path.join(dir, 'landing'));
  fs.writeFileSync(path.join(dir, 'landing', 'index.html'), '<html>LANDING</html>');
  return dir;
}

async function withServer(fn) {
  process.env.NODE_ENV = 'test';
  const db = initDb(':memory:');
  const publicDir = makePublic();
  const server = createApp({ db, ai: createFakeAi(), clock: fixedClock('2026-11-22'), publicDir }).listen(0);
  try {
    await fn(`http://127.0.0.1:${server.address().port}`);
  } finally {
    server.close();
    db.close();
    fs.rmSync(publicDir, { recursive: true, force: true });
  }
}

test('/ redirects to the landing page', async () => {
  await withServer(async (base) => {
    const res = await fetch(`${base}/`, { redirect: 'manual' });
    assert.equal(res.status, 302);
    assert.equal(res.headers.get('location'), '/landing/');
    assert.match(await (await fetch(`${base}/landing/`)).text(), /LANDING/);
  });
});

test('the app is served at /app/ and its deep routes', async () => {
  await withServer(async (base) => {
    assert.match(await (await fetch(`${base}/app/`)).text(), /APP/);
    assert.match(await (await fetch(`${base}/app/log/new/check`)).text(), /APP/);
  });
});

test('old app links redirect under /app', async () => {
  await withServer(async (base) => {
    const res = await fetch(`${base}/orders`, { redirect: 'manual' });
    assert.equal(res.status, 302);
    assert.equal(res.headers.get('location'), '/app/orders');
  });
});
