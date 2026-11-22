// Validation of raw model output (spec R2, R3). Pure functions, no I/O.
import { MAX_COUNT, MIN_CONFIDENCE } from '../core/config.js';

/** Pull a JSON value out of model text (handles code fences and text around it). Returns undefined if none. */
export function extractJson(text) {
  if (typeof text !== 'string') return undefined;
  const cleaned = text.replace(/```(?:json)?/gi, '');
  const pairs = [['{', '}'], ['[', ']']].sort((a, b) => {
    const ia = cleaned.indexOf(a[0]);
    const ib = cleaned.indexOf(b[0]);
    return (ia === -1 ? Infinity : ia) - (ib === -1 ? Infinity : ib);
  });
  for (const [open, close] of pairs) {
    const start = cleaned.indexOf(open);
    const end = cleaned.lastIndexOf(close);
    if (start === -1 || end <= start) continue;
    try {
      return JSON.parse(cleaned.slice(start, end + 1));
    } catch {
      // try the next shape
    }
  }
  try {
    return JSON.parse(cleaned.trim());
  } catch {
    return undefined;
  }
}

function isValidRow(row, knownIds) {
  return (
    row &&
    knownIds.has(row.item_id) &&
    Number.isInteger(row.count) &&
    row.count >= 0 &&
    row.count <= MAX_COUNT &&
    typeof row.confidence === 'number' &&
    row.confidence >= 0 &&
    row.confidence <= 1
  );
}

/**
 * Vision rows -> {items, dropped}. Drops unknown ids, bad counts, bad confidence and repeated ids.
 * @param {unknown} rows raw array from the model
 * @param {Array<{id:number}>} catalog
 */
export function validateVision(rows, catalog) {
  if (!Array.isArray(rows)) return { items: [], dropped: 0 };
  const knownIds = new Set(catalog.map((c) => c.id));
  const seen = new Set();
  const items = [];
  for (const row of rows) {
    if (isValidRow(row, knownIds) && !seen.has(row.item_id)) {
      seen.add(row.item_id);
      items.push({ item_id: row.item_id, count: row.count, confidence: row.confidence });
    }
  }
  return { items, dropped: rows.length - items.length };
}

/**
 * Parse edits -> {edits, unclear, ask?}. Any unknown item, bad row or low confidence makes the
 * whole reply unclear (we never guess). `confidence` is stripped from the output.
 */
export function validateParse(raw, catalog, { ask } = {}) {
  const rows = Array.isArray(raw?.edits) ? raw.edits : [];
  const knownIds = new Set(catalog.map((c) => c.id));
  const ok = rows.length > 0 && rows.every((r) => isValidRow(r, knownIds) && r.confidence >= MIN_CONFIDENCE);
  if (!ok) {
    const out = { edits: [], unclear: true };
    const question = ask ?? raw?.ask;
    if (typeof question === 'string' && question.trim()) out.ask = question;
    return out;
  }
  return { edits: rows.map((r) => ({ item_id: r.item_id, count: r.count })), unclear: false };
}
