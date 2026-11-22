// Builds the Express app. No listen() here, so tests can use it.
// createApp({db, ai, clock, publicDir?, speech?}): tests pass a fake ai and a fixed clock.
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import path from 'node:path';
import { PUBLIC_DIR } from './config.js';
import { DEMO_STORE_ID } from './core/config.js';
import { assertAi } from './ai/index.js';
import { storeRouter } from './routes/store.js';
import { logsRouter } from './routes/logs.js';
import { speechRouter } from './routes/speech.js';

export function createApp({ db, ai, clock, publicDir = PUBLIC_DIR, speech = {} }) {
  if (!db || !clock) throw new Error('createApp needs db and clock');
  assertAi(ai);
  const app = express();
  app.disable('x-powered-by');
  app.use(cors());
  app.use(express.json({ limit: '1mb' }));
  if (process.env.NODE_ENV !== 'test') app.use(morgan('tiny'));

  // One demo store. Every handler reads req.storeId and passes it to every query.
  app.use('/api', (req, _res, next) => {
    req.storeId = DEMO_STORE_ID;
    next();
  });

  app.get('/api/health', (_req, res) => {
    const row = db.prepare('SELECT 1 AS ok').get();
    res.json({
      ok: true,
      db: row.ok === 1,
      keys: { sarvam: Boolean(process.env.SARVAM_API_KEY), anthropic: Boolean(process.env.ANTHROPIC_API_KEY) },
    });
  });

  app.use('/api', storeRouter({ db, clock }));
  app.use('/api', logsRouter({ db, clock }));
  app.use('/api', speechRouter({ ...speech, db, ai, clock }));

  app.use('/api', (_req, res) => res.status(404).json({ error: { code: 'not_found', message: 'No such API route' } }));

  // The landing page is the front door: / opens /landing/. The app lives at /app/.
  app.get('/', (_req, res) => res.redirect(302, '/landing/'));
  app.use('/app', express.static(publicDir, { index: false }));
  app.use(express.static(publicDir)); // serves /landing/, /products/, /samples/
  // SPA fallback for the app's own routes.
  app.get(/^\/app(\/.*)?$/, (_req, res, next) => {
    res.sendFile(path.join(publicDir, 'index.html'), (err) => {
      if (err) next();
    });
  });
  // Old app links (before the move to /app/) keep working.
  app.get(/^\/(orders|distributors|settings|log)(\/.*)?$/, (req, res) => res.redirect(302, `/app${req.originalUrl}`));

  // Errors: {error: {code, message}}. Throw with err.status and err.code for 4xx.
  app.use((err, req, res, next) => {
    const status = err.status ?? err.statusCode ?? 500;
    if (status >= 500) console.error(`[kiranaq] error handling ${req.method} ${req.path}:`, err);
    if (res.headersSent) return next(err);
    res.status(status).json({
      error: { code: err.code ?? (status === 500 ? 'internal_error' : 'bad_request'), message: status === 500 ? 'Internal error' : err.message },
    });
  });
  return app;
}

/** Helper for routes: throw httpError(400, 'bad_count', 'count out of range'). */
export function httpError(status, code, message) {
  return Object.assign(new Error(message), { status, code });
}
