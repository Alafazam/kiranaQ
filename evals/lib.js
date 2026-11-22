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

/** Body of the "## <heading>" section (without the heading line), or ''. */
export function readCheckSection(heading) {
  if (!fs.existsSync(CHECKS_FILE)) return '';
  const text = fs.readFileSync(CHECKS_FILE, 'utf8');
  const marker = `## ${heading}`;
  const start = text.indexOf(marker);
  if (start === -1) return '';
  const next = text.indexOf('\n## ', start + marker.length);
  return text.slice(start + marker.length, next === -1 ? undefined : next).trim();
}

/** Replace the "### ..." block that starts with `blockHeading` inside a section body (or append it). */
export function replaceBlock(body, blockHeading, block) {
  const start = body.indexOf(blockHeading);
  if (start === -1) return `${body}\n\n${block}`.trim();
  const next = body.indexOf('\n### ', start + blockHeading.length);
  return `${body.slice(0, start)}${block}${next === -1 ? '' : `\n${body.slice(next + 1)}`}`.trim();
}
