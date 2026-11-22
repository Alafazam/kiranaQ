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

// ---- Voice assistant (POST /api/assist) ----
const ASSIST_SAY_MAX = 200;
const ASSIST_OPTIONS_MAX = 4;
const ASSIST_OPTION_MAX_CHARS = 30;
const MAX_SAMPLE_INDEX = 9;
const MAX_QTY = 9999;
const NAV_TARGETS = new Set(['home', 'orders', 'distributors', 'settings']);
const LANGS = new Set(['hi', 'en']);
const EXPECTS = new Set(['answer', 'confirm', 'done']);
export const WRITE_ACTIONS = new Set(['save_log', 'confirm_order', 'visit']);

const isInt = (v, min, max) => Number.isInteger(v) && v >= min && v <= max;

/** Returns a clean action object, or null when the action is unknown or its params are bad. */
function cleanAction(a, { itemIds, distributorIds }) {
  if (!a || typeof a.type !== 'string') return null;
  const dist = (id) => distributorIds.has(id);
  switch (a.type) {
    case 'navigate': return NAV_TARGETS.has(a.to) ? { type: a.type, to: a.to } : null;
    case 'start_log':
    case 'count_photo':
    case 'count_manual':
    case 'save_log': return { type: a.type };
    case 'use_sample': return isInt(a.index, 0, MAX_SAMPLE_INDEX) ? { type: a.type, index: a.index } : null;
    case 'set_counts': {
      const rows = Array.isArray(a.edits) ? a.edits : [];
      const ok = rows.length > 0 && rows.every((r) => itemIds.has(r?.item_id) && isInt(r.count, 0, MAX_COUNT) && (r.confidence === undefined || (typeof r.confidence === 'number' && r.confidence >= MIN_CONFIDENCE)));
      return ok ? { type: a.type, edits: rows.map((r) => ({ item_id: r.item_id, count: r.count })) } : null;
    }
    case 'visit': return dist(a.distributor_id) && typeof a.delivered === 'boolean' ? { type: a.type, distributor_id: a.distributor_id, delivered: a.delivered } : null;
    case 'confirm_order':
    case 'read_out': return dist(a.distributor_id) ? { type: a.type, distributor_id: a.distributor_id } : null;
    case 'set_qty': return dist(a.distributor_id) && itemIds.has(a.item_id) && isInt(a.qty, 0, MAX_QTY) ? { type: a.type, distributor_id: a.distributor_id, item_id: a.item_id, qty: a.qty } : null;
    case 'set_language': return LANGS.has(a.lang) ? { type: a.type, lang: a.lang } : null;
    default: return null;
  }
}

/** Distributor ids the model may name: those the app put in the context. */
export function contextDistributorIds(context) {
  const ids = new Set();
  for (const d of context?.distributors ?? []) ids.add(d?.id);
  for (const c of context?.cards ?? []) ids.add(c?.distributor_id);
  if (context?.visit?.distributor_id !== undefined) ids.add(context.visit.distributor_id);
  return ids;
}

/**
 * Raw assist answer -> {say, actions, expect, options?}. Unknown or bad actions are dropped; a write
 * action forces expect "confirm". When actions were dropped and none are left, `say` is replaced by askAgain.
 * Returns null when there is no usable `say` (the caller then answers with askAgain).
 */
export function validateAssist(raw, { catalog, context, askAgain }) {
  if (typeof raw?.say !== 'string' || !raw.say.trim()) return null;
  const ctx = { itemIds: new Set(catalog.map((c) => c.id)), distributorIds: contextDistributorIds(context) };
  const proposed = Array.isArray(raw.actions) ? raw.actions : [];
  const actions = proposed.map((a) => cleanAction(a, ctx)).filter(Boolean);
  const droppedAll = proposed.length > 0 && actions.length === 0;
  let expect = EXPECTS.has(raw.expect) ? raw.expect : 'answer';
  if (actions.some((a) => WRITE_ACTIONS.has(a.type))) expect = 'confirm';
  const out = { say: droppedAll ? askAgain : raw.say.trim().slice(0, ASSIST_SAY_MAX), actions, expect: droppedAll ? 'answer' : expect };
  const options = Array.isArray(raw.options) ? raw.options.filter((o) => typeof o === 'string' && o.trim() && o.length <= ASSIST_OPTION_MAX_CHARS) : [];
  if (options.length) out.options = options.slice(0, ASSIST_OPTIONS_MAX);
  return out;
}
