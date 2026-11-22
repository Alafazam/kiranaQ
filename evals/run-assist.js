// E6: voice assistant eval on evals/assist/cases.json. Real assist model (parse provider), real prompt, real validation.
// Metric: action match (same action types in order, listed params equal) and `expect` value; U12/U14 must do nothing.
// Usage: node evals/run-assist.js [--limit N] [--use U4,U5]   (pnpm eval:assist). Only a full run writes checks.md.
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, loadCatalog, loadRealAi, writeCheckSection, readCheckSection, replaceBlock } from './lib.js';
import { validateAssist } from '../server/src/ai/validate.js';

const CASES_FILE = path.join(ROOT, 'evals', 'assist', 'cases.json');
const ACTION_BAR = 0.8;
const DIST_IDS = { gupta: 1, mehta: 2, sharma: 3 }; // eval-only ids
const ASK_AGAIN = 'Phir se bolenge?';

const args = process.argv.slice(2);
const flag = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);
const limit = flag('--limit') ? Number(flag('--limit')) : undefined;
const only = flag('--use')?.split(',');

const catalog = loadCatalog();
const idBySku = new Map(catalog.map((it) => [it.sku_key, it.id]));

/** Replace "sku:<key>" and "dist:<key>" strings by ids, anywhere in the value. */
function resolve(v) {
  if (typeof v === 'string' && v.startsWith('sku:')) return idBySku.get(v.slice(4));
  if (typeof v === 'string' && v.startsWith('dist:')) return DIST_IDS[v.slice(5)];
  if (Array.isArray(v)) return v.map(resolve);
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, resolve(x)]));
  return v;
}

const canon = (x) => JSON.stringify(x, (_, val) => (Array.isArray(val) && val.every((e) => e && e.item_id !== undefined) ? [...val].sort((a, b) => a.item_id - b.item_id) : val));

export function actionsMatch(got, want) {
  if (got.length !== want.length) return false;
  return want.every((w, i) => Object.entries(w).every(([k, val]) => canon(got[i][k]) === canon(val)));
}

let cases = JSON.parse(fs.readFileSync(CASES_FILE, 'utf8')).map(resolve);
if (only) cases = cases.filter((c) => only.includes(c.use_case));
if (limit) {
  // one case per use case first, so a small run still covers many use cases
  const seen = new Set();
  const first = cases.filter((c) => !seen.has(c.use_case) && seen.add(c.use_case));
  cases = [...first, ...cases.filter((c) => !first.includes(c))].slice(0, limit);
}

const ai = await loadRealAi();
const results = [];
for (const c of cases) {
  let out;
  let error;
  try {
    const raw = await ai.assist(c.text, { lang: c.lang, screen: c.screen, context: c.context, history: c.history, catalog });
    out = validateAssist(raw, { catalog, context: c.context, askAgain: ASK_AGAIN });
  } catch (err) {
    error = err.code ?? 'error';
  }
  out ??= { say: ASK_AGAIN, actions: [], expect: 'answer' };
  const actionOk = actionsMatch(out.actions, c.expect.actions);
  const expectOk = c.expect.expect === undefined || out.expect === c.expect.expect;
  const sayOk = !c.expect.say_contains_any || c.expect.say_contains_any.some((s) => out.say.includes(s));
  const pass = actionOk && expectOk && sayOk;
  results.push({ ...c, pass, actionOk, expectOk, sayOk, error });
  console.log(`${c.id.padEnd(7)} ${c.style.padEnd(8)} ${pass ? 'PASS' : 'FAIL'}${pass ? '' : ` [actions ${actionOk ? 'ok' : `got ${out.actions.map((a) => a.type).join('+') || 'none'}`}${expectOk ? '' : `, expect ${out.expect}`}${sayOk ? '' : ', say'}]`}${error ? ` (${error})` : ''}`);
}

const passed = results.filter((r) => r.pass).length;
const actionPass = results.filter((r) => r.actionOk && r.expectOk).length;
const rate = passed / results.length;
const verdict = actionPass / results.length >= ACTION_BAR ? 'PASS' : 'BELOW BAR';
const byUse = [...new Set(results.map((r) => r.use_case))].map((u) => {
  const rs = results.filter((r) => r.use_case === u);
  return `| ${u} | ${rs.filter((r) => r.pass).length}/${rs.length} |`;
});
console.log(`E6: ${passed}/${results.length} cases pass (${(rate * 100).toFixed(0)}%), action+expect ${actionPass}/${results.length}: ${verdict}`);

if (!limit && !only) {
  const block =
    `### E6 voice assistant (${new Date().toISOString().slice(0, 10)})\n\n` +
    `Provider \`${process.env.PARSE_PROVIDER ?? 'sarvam'}\`, ${results.length} cases (U1–U14, Hindi / Hinglish / English), real model.\n\n` +
    `| Metric | Result | Bar |\n|---|---|---|\n| Action + expect match | ${actionPass}/${results.length} | ≥ 80% |\n| Full pass (also says the right thing) | ${passed}/${results.length} | – |\n\n` +
    `| Use case | Pass |\n|---|---|\n${byUse.join('\n')}\n\nVerdict: **${verdict}**. Failed: ${results.filter((r) => !r.pass).map((r) => r.id).join(', ') || 'none'}.\n`;
  writeCheckSection('Lane C', replaceBlock(readCheckSection('Lane C'), '### E6', block));
}
