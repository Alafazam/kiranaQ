// Builds the Express app. No listen() here, so tests can use it.
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import path from 'node:path';
import { PUBLIC_DIR } from './config.js';

export function createApp(db, { publicDir = PUBLIC_DIR } = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.use(cors());
  app.use(express.json({ limit: '1mb' }));
  if (process.env.NODE_ENV !== 'test') app.use(morgan('tiny'));

  app.get('/api/health', (_req, res) => {
    const row = db.prepare('SELECT 1 AS ok').get();
    res.json({ status: 'ok', db: row.ok === 1 });
  });

  // Built web UI, with SPA fallback for non-/api GET requests.
  app.use(express.static(publicDir));
  app.get(/^\/(?!api).*/, (_req, res, next) => {
    res.sendFile(path.join(publicDir, 'index.html'), (err) => {
      if (err) next();
    });
  });

  // Errors return JSON and are logged.
  app.use((err, req, res, next) => {
    console.error(`[kiranaq] error handling ${req.method} ${req.path}:`, err);
    if (res.headersSent) return next(err);
    const status = err.status ?? err.statusCode ?? 500;
    res.status(status).json({ error: status === 500 ? 'internal_error' : err.message });
  });
  return app;
}
