// Live smoke test: one real call per model route. Needs keys. Prints ok or the error code and latency.
// Never prints transcripts, images or keys.
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRealAi } from '../src/ai/real.js';
import { validateParse, validateVision } from '../src/ai/validate.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const CATALOG_FILE = path.join(ROOT, 'server', 'seed', 'catalog.json');
const SHELF = path.join(ROOT, 'evals', 'vision', 'shelf-01.jpg');
const VOICE_CLIP = path.join(ROOT, 'evals', 'voice', 'hi-01.wav');
const SENTENCE = 'Maggi aath hai';

const catalog = JSON.parse(fs.readFileSync(CATALOG_FILE, 'utf8')).map((it, i) => ({ ...it, id: i + 1, active: true }));
const ai = createRealAi();
let failures = 0;

async function step(name, fn) {
  const started = Date.now();
  try {
    const detail = await fn();
    console.log(`${name.padEnd(8)} ok   ${Date.now() - started} ms  ${detail ?? ''}`);
    return true;
  } catch (err) {
    failures += 1;
    console.log(`${name.padEnd(8)} FAIL ${Date.now() - started} ms  ${err.code ?? 'error'}`);
    return false;
  }
}

let audio;
await step('tts', async () => {
  audio = await ai.tts(SENTENCE, { languageCode: 'hi-IN' });
  if (!audio.length) throw new Error('empty audio');
  return `${audio.length} bytes`;
});

await step('stt', async () => {
  const clip = fs.existsSync(VOICE_CLIP) ? fs.readFileSync(VOICE_CLIP) : audio;
  const keyterms = catalog.flatMap((c) => [c.name_en, ...c.aliases]).slice(0, 50);
  const out = await ai.stt(clip, { filename: 'clip.wav', mimeType: 'audio/wav', keyterms });
  if (!out.transcript?.trim()) throw new Error('empty transcript');
  return `lang ${out.languageCode}, ${out.transcript.length} chars`;
});

await step('parse', async () => {
  const raw = await ai.parseEdits(SENTENCE, { lang: 'hi', draft: [], catalog });
  const out = validateParse(raw, catalog);
  return `edits ${out.edits.length}, unclear ${out.unclear}`;
});

await step('vision', async () => {
  const raw = await ai.countItems([{ buffer: fs.readFileSync(SHELF), mimeType: 'image/jpeg' }], catalog);
  const out = validateVision(raw.items, catalog);
  return `items ${out.items.length}, dropped ${out.dropped}`;
});

console.log(failures === 0 ? 'smoke: all ok' : `smoke: ${failures} failed`);
process.exit(failures === 0 ? 0 : 1);
