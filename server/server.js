// KiranaQ server entry point.
import 'dotenv/config';
import { initDb } from './src/db.js';
import { createApp } from './src/app.js';
import { DEFAULT_PORT, HOST } from './src/config.js';

const PORT = Number.parseInt(process.env.PORT ?? String(DEFAULT_PORT), 10);
const SHUTDOWN_TIMEOUT_MS = 5000;

const db = initDb();
const app = createApp(db);

const server = app.listen(PORT, HOST, () => {
  console.log(`[kiranaq] listening on http://${HOST}:${PORT}`);
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
