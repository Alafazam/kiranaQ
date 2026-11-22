// KiranaQ server entry point.
import 'dotenv/config';
import { initDb } from './src/db.js';
import { createApp } from './src/app.js';
import { createClock } from './src/clock.js';
import { createRealAi } from './src/ai/real.js';
import { DEFAULT_PORT, HOST } from './src/config.js';
import { seedIfEmpty } from './scripts/seed.js';

const PORT = Number.parseInt(process.env.PORT ?? String(DEFAULT_PORT), 10);
const SHUTDOWN_TIMEOUT_MS = 5000;

const db = initDb();
const clock = createClock();
seedIfEmpty(db, clock);
const app = createApp({ db, ai: createRealAi({ db }), clock });

const server = app.listen(PORT, HOST, () => {
  console.log(`[kiranaq] listening on http://${HOST}:${PORT} (today ${clock.today()})`);
});

process.on('unhandledRejection', (err) => console.error('[kiranaq] unhandled rejection:', err));
process.on('uncaughtException', (err) => {
  console.error('[kiranaq] uncaught exception, exiting:', err);
  process.exit(1);
});

function shutdown(signal) {
  console.log(`[kiranaq] ${signal} received, closing`);
  setTimeout(() => process.exit(0), SHUTDOWN_TIMEOUT_MS).unref();
  server.close(() => {
    try { db.pragma('wal_checkpoint(TRUNCATE)'); db.close(); } catch (_) {}
    process.exit(0);
  });
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
