// SQLite setup. WAL mode is on.
import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { DB_PATH_DEFAULT } from './config.js';
import { migrate } from './migrations.js';

export const BASE_SCHEMA = `
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS meta (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`;

export function initDb(dbPath = process.env.DB_PATH ?? DB_PATH_DEFAULT) {
  if (dbPath !== ':memory:') fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = new Database(dbPath);
  db.exec(BASE_SCHEMA);
  migrate(db);
  return db;
}
