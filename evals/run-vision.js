// E1: vision count eval. Sends evals/vision/shelf-0N.box.jpg (or shelf-0N.jpg if no box file) and compares with shelf-0N.truth.json.
// Metrics: precision (returned items really there), recall (there items returned), share of counts within ±20% or ±1 pack.
// Photos without a truth file are skipped. Usage: pnpm eval:vision (from server/)
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, loadCatalog, loadRealAi, writeCheckSection, readCheckSection, replaceBlock } from './lib.js';
import { validateVision } from '../server/src/ai/validate.js';

const VISION_DIR = path.join(ROOT, 'evals', 'vision');
const PRECISION_BAR = 0.9;
const RECALL_BAR = 0.6;
const WITHIN_BAR = 0.6;
const COUNT_TOLERANCE = 0.2;

const catalog = loadCatalog();
const idByKey = new Map(catalog.map((it) => [it.sku_key, it]));
const keyById = new Map(catalog.map((it) => [it.id, it.sku_key]));
const ai = await loadRealAi();

const photos = fs.readdirSync(VISION_DIR).filter((f) => /^shelf-\d+\.truth\.json$/.test(f)).sort();
let returned = 0;
let correctReturned = 0;
let expected = 0;
let found = 0;
let within = 0;
const rows = [];

for (const truthFile of photos) {
  const truth = JSON.parse(fs.readFileSync(path.join(VISION_DIR, truthFile), 'utf8'));
  const base = truthFile.replace('.truth.json', '');
  const boxFile = path.join(VISION_DIR, `${base}.box.jpg`);
  const imageFile = fs.existsSync(boxFile) ? boxFile : path.join(VISION_DIR, truth.photo ?? `${base}.jpg`);
  let got = [];
  let error;
  try {
    const raw = await ai.countItems([{ buffer: fs.readFileSync(imageFile), mimeType: 'image/jpeg' }], catalog);
    got = validateVision(raw.items, catalog).items;
  } catch (err) {
    error = err.code ?? 'error';
  }
  const truthByKey = new Map(truth.items.map((t) => [t.sku_key, t.count]));
  const gotByKey = new Map(got.map((g) => [keyById.get(g.item_id), g.count]));
  const hits = [...gotByKey.keys()].filter((k) => truthByKey.has(k));
  const ok = hits.filter((k) => {
    const want = truthByKey.get(k);
    const have = gotByKey.get(k);
    const pack = idByKey.get(k).pack_size;
    return Math.abs(have - want) <= Math.max(COUNT_TOLERANCE * want, 1) || Math.abs(have - want) <= pack;
  });
  const uncertain = new Set(truth.uncertain ?? []);
  const scored = [...gotByKey.keys()].filter((k) => !uncertain.has(k)).length; // uncertain skus count neither way
  returned += scored;
  correctReturned += hits.length;
  expected += truthByKey.size;
  found += hits.length;
  within += ok.length;
  rows.push({ base, returned: gotByKey.size, hits: hits.length, expected: truthByKey.size, within: ok.length, error });
  console.log(`${base}: returned ${gotByKey.size}, right items ${hits.length}/${truthByKey.size}, counts within bar ${ok.length}/${hits.length}${error ? ` (${error})` : ''}`);
}

const ratio = (a, b) => (b === 0 ? 0 : a / b);
const precision = ratio(correctReturned, returned);
const recall = ratio(found, expected);
const withinShare = ratio(within, found);
const pass = precision >= PRECISION_BAR && recall >= RECALL_BAR && withinShare >= WITHIN_BAR;
const provider = process.env.VISION_PROVIDER ?? 'sarvam';
console.log(`E1: precision ${precision.toFixed(2)}, recall ${recall.toFixed(2)}, within ±20%/±1 pack ${withinShare.toFixed(2)}: ${pass ? 'PASS' : 'BELOW BAR'}`);

const table = rows.map((r) => `| ${r.base} | ${r.returned} | ${r.hits}/${r.expected} | ${r.within}/${r.hits} |${r.error ? ` ${r.error}` : ''}`).join('\n');
const block =
  `### E1 vision count (${new Date().toISOString().slice(0, 10)})\n\n` +
  `Provider \`${provider}\`, ${photos.length} photos with truth files, real model.\n\n` +
  `| Metric | Result | Bar |\n|---|---|---|\n` +
  `| Precision | ${precision.toFixed(2)} | ≥ 0.9 |\n| Recall | ${recall.toFixed(2)} | ≥ 0.6 |\n| Counts within ±20% or ±1 pack | ${withinShare.toFixed(2)} | ≥ 0.6 |\n\n` +
  `| Photo | Items returned | Right items / expected | Counts within bar |\n|---|---|---|---|\n${table}\n\n` +
  `Verdict: **${pass ? 'PASS' : 'BELOW BAR'}**.\n`;
writeCheckSection('Lane C', replaceBlock(readCheckSection('Lane C'), '### E1', block));
