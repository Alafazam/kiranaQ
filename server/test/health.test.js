import { test } from 'node:test';
import assert from 'node:assert/strict';
import { initDb } from '../src/db.js';
import { createApp } from '../src/app.js';

test('GET /api/health returns ok', async () => {
  process.env.NODE_ENV = 'test';
  const db = initDb(':memory:');
  const server = createApp(db).listen(0);
  try {
    const { port } = server.address();
    const res = await fetch(`http://127.0.0.1:${port}/api/health`);
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { status: 'ok', db: true });
  } finally {
    server.close();
    db.close();
  }
});
