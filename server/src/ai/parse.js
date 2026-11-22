// Spoken text -> stock edits. Default provider Sarvam sarvam-105b, option Claude Haiku (PARSE_PROVIDER).
import { CLAUDE_PARSE_MODEL, PARSE_PROVIDER, SARVAM_PARSE_MODEL } from '../core/config.js';
import { askModel, codedError } from './chat.js';
import { extractJson } from './validate.js';

export function parseModel(provider = PARSE_PROVIDER) {
  return provider === 'claude' ? CLAUDE_PARSE_MODEL : SARVAM_PARSE_MODEL;
}

function catalogLines(catalog) {
  return catalog
    .filter((it) => it.active !== false)
    .map((it) => `${it.id} | ${it.name_en} | ${it.name_hi} | also called: ${(it.aliases ?? []).join(', ')} | pack of ${it.pack_size}`)
    .join('\n');
}

export function buildParsePrompt(text, { lang, draft, catalog }) {
  const byId = new Map(catalog.map((it) => [it.id, it.name_en]));
  const draftLines = draft.map((d) => `${d.item_id} (${byId.get(d.item_id) ?? 'unknown'}): ${d.count}`).join('\n') || '(empty)';
  return [
    'A kirana shop owner speaks corrections to a stock count. The speech may be Hindi, Hinglish or English.',
    `Language hint: ${lang ?? 'unknown'}.`,
    'Catalog (id | English | Hindi | aliases | pack):',
    catalogLines(catalog),
    'Current draft counts (id (name): count):',
    draftLines,
    `Owner said: "${text}"`,
    'Rules:',
    '- Return the NEW absolute count for each item the owner changes. "Maggi 8 hai" -> count 8.',
    '- Relative words ("do kam", "2 more", "teen aur") are applied to the draft count of that item. "do kam" = minus 2, "ek aur" = plus 1. Never below 0.',
    '- Use only catalog ids. Do not guess an item that is not in the catalog.',
    '- If the item is not clear, the number is not clear, or one number could belong to several items, return an empty edits list and put a short question in "ask" in the owner\'s language.',
    '- confidence is 0 to 1 for each edit.',
    'Answer with ONLY JSON, no other text: {"edits": [{"item_id": 1, "count": 8, "confidence": 0.9}], "ask": ""}',
  ].join('\n');
}

/**
 * ai.parseEdits: raw edits with confidence, not validated.
 * @returns {Promise<{edits: Array, ask?: string}>}
 */
export async function parseEdits(text, { lang, draft = [], catalog }, { provider = PARSE_PROVIDER } = {}) {
  const answer = await askModel({
    provider,
    model: parseModel(provider),
    prompt: buildParsePrompt(text, { lang, draft, catalog }),
  });
  const json = extractJson(answer);
  if (!json || typeof json !== 'object' || !Array.isArray(json.edits)) throw codedError('bad_json', 'parse answer was not the expected JSON');
  return { edits: json.edits, ...(typeof json.ask === 'string' && json.ask && { ask: json.ask }) };
}
