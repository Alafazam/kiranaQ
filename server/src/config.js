// Server settings. Values come from the environment (.env is loaded in server.js).
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const SERVER_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const DEFAULT_PORT = 3000;
export const HOST = '0.0.0.0';
export const PUBLIC_DIR = path.join(SERVER_ROOT, 'public');
export const DB_PATH_DEFAULT = path.join(SERVER_ROOT, 'data', 'kiranaq.db');
export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
