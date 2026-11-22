// Shared test helpers: an app on an in-memory DB, a fixed clock and the fake AI.
import { initDb } from '../src/db.js';
import { createApp } from '../src/app.js';
import { fixedClock } from '../src/clock.js';
import { createFakeAi } from '../src/ai/fake.js';

export const TEST_TODAY = '2026-11-22';

export async function withApp(fn, { ai = createFakeAi(), clock = fixedClock(TEST_TODAY), speech, setup } = {}) {
  process.env.NODE_ENV = 'test';
  const db = initDb(':memory:');
  if (setup) await setup(db);
  const server = createApp({ db, ai, clock, speech }).listen(0);
  try {
    await fn({ base: `http://127.0.0.1:${server.address().port}`, db });
  } finally {
    server.close();
    db.close();
  }
}

/** Insert the demo store row (id 1) and a second store (id 2) for tenant tests. */
export function insertStores(db, now = `${TEST_TODAY}T06:30:00.000Z`) {
  const ins = db.prepare('INSERT INTO store (id, name, language, created_at) VALUES (?, ?, ?, ?)');
  ins.run(1, 'Demo Kirana', 'hi', now);
  ins.run(2, 'Other Store', 'en', now);
}
