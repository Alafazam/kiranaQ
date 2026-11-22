// Shared helpers for the model evals. Loads server/.env, builds the real ai and a catalog with ids.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ENV_FILE = path.join(ROOT, 'server', '.env');
if (fs.existsSync(ENV_FILE)) process.loadEnvFile(ENV_FILE);

export const CATALOG_FILE = path.join(ROOT, 'server', 'seed', 'catalog.json');
export const CHECKS_FILE = path.join(ROOT, 'specs', '2026-11-22-kiranaq-stock-log', 'checks.md');

/** Catalog rows shaped like repo/items.js listItems; ids are 1..N in file order (eval-only). */
export function loadCatalog() {
  return JSON.parse(fs.readFileSync(CATALOG_FILE, 'utf8')).map((it, i) => ({ ...it, id: i + 1, active: true, distributor_id: null }));
}

export async function loadRealAi() {
  const { createRealAi } = await import('../server/src/ai/real.js');
  return createRealAi();
}

/** Replace the "## <heading>" section of checks.md (or append it). Other sections stay as they are. */
export function writeCheckSection(heading, body) {
  const marker = `## ${heading}`;
  const current = fs.existsSync(CHECKS_FILE) ? fs.readFileSync(CHECKS_FILE, 'utf8') : '# Checks\n';
  const start = current.indexOf(marker);
  const section = `${marker}\n\n${body.trim()}\n`;
  if (start === -1) {
    fs.writeFileSync(CHECKS_FILE, `${current.trimEnd()}\n\n${section}`);
    return;
  }
  const next = current.indexOf('\n## ', start + marker.length);
  const after = next === -1 ? '' : `\n${current.slice(next + 1)}`;
  fs.writeFileSync(CHECKS_FILE, `${current.slice(0, start)}${section}${after}`);
}
