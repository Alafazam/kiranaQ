// E2: voice parse eval on evals/voice/phrases.json. Real parse model, typed phrases (no audio).
// Metric: exact {item_id, count} match on clear phrases; re-ask on unclear ones (no guess).
// Usage: node evals/run-parse.js   (from the server dir: pnpm eval:parse)
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, loadCatalog, loadRealAi, writeCheckSection, readCheckSection, replaceBlock } from './lib.js';
import { validateParse } from '../server/src/ai/validate.js';

const PHRASES_FILE = path.join(ROOT, 'evals', 'voice', 'phrases.json');
const EXACT_BAR = 0.9;
const idsArg = process.argv.includes('--ids') ? process.argv[process.argv.indexOf('--ids') + 1].split(',') : undefined;
const allPhrases = JSON.parse(fs.readFileSync(PHRASES_FILE, 'utf8'));
const phrases = idsArg ? allPhrases.filter((p) => idsArg.includes(p.id)) : allPhrases;
const catalog = loadCatalog();
const idByKey = new Map(catalog.map((it) => [it.sku_key, it.id]));
const ai = await loadRealAi();

function toIds(rows) {
  return rows.map((r) => ({ item_id: idByKey.get(r.sku_key), count: r.count }));
}
const sortKey = (rows) => JSON.stringify([...rows].sort((a, b) => a.item_id - b.item_id));

const results = [];
for (const p of phrases) {
  let got;
  let error;
  try {
    const raw = await ai.parseEdits(p.text, { lang: p.lang, draft: toIds(p.draft), catalog });
    got = validateParse(raw, catalog);
  } catch (err) {
    error = err.code ?? 'error';
    got = { edits: [], unclear: true };
  }
  const expectUnclear = p.expect.unclear === true;
  const pass = expectUnclear ? got.unclear : !got.unclear && sortKey(got.edits) === sortKey(toIds(p.expect.edits));
  results.push({ id: p.id, lang: p.lang, expectUnclear, pass, error });
  console.log(`${p.id} ${p.lang.padEnd(7)} ${expectUnclear ? 'unclear' : 'clear  '} ${pass ? 'PASS' : 'FAIL'}${error ? ` (${error})` : ''}`);
}

const clear = results.filter((r) => !r.expectUnclear);
const unclear = results.filter((r) => r.expectUnclear);
const clearPass = clear.filter((r) => r.pass).length;
const unclearPass = unclear.filter((r) => r.pass).length;
const rate = clearPass / clear.length;
const verdict = rate >= EXACT_BAR && unclearPass === unclear.length ? 'PASS' : 'BELOW BAR';
const failed = results.filter((r) => !r.pass).map((r) => r.id).join(', ') || 'none';
const provider = process.env.PARSE_PROVIDER ?? 'sarvam';

console.log(`E2: clear ${clearPass}/${clear.length} (${(rate * 100).toFixed(0)}%), unclear re-ask ${unclearPass}/${unclear.length}: ${verdict}`);

if (idsArg) process.exit(0); // partial run: do not write checks.md
const block =
  `### E2 voice parse (${new Date().toISOString().slice(0, 10)})\n\n` +
  `Provider \`${provider}\`, ${phrases.length} typed phrases, real model.\n\n` +
  `| Metric | Result | Bar |\n|---|---|---|\n` +
  `| Exact match on clear phrases | ${clearPass}/${clear.length} (${(rate * 100).toFixed(0)}%) | ≥ 90% |\n` +
  `| Unclear phrases that re-ask (no guess) | ${unclearPass}/${unclear.length} | 4/4 |\n\n` +
  `Verdict: **${verdict}**. Failed ids: ${failed}.\n`;
writeCheckSection('Lane C', replaceBlock(readCheckSection('Lane C'), '### E2', block));
