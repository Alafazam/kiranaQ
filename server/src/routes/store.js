// Store, distributors and items routes (spec "API > Store, distributors, items"). Owner: Lane B.
import express from 'express';
import { httpError } from '../app.js';
import { nextVisit } from '../core/schedule.js';
import { listItems, getItem, updateItem } from '../repo/items.js';
import {
  getStore, setStoreLanguage, listDistributors, getDistributor, getDistributorByName,
  insertDistributor, updateDistributor, activeItemCounts,
} from '../repo/store.js';
import { latestRunsOutCounts, distributorOrders } from '../repo/logs.js';
import { isValidDate } from '../repo/dates.js';

// Same limits as the distributor.cycle_days CHECK in migrations.js.
const MIN_CYCLE_DAYS = 1;
const MAX_CYCLE_DAYS = 60;
// Distributor tints in the UI: 1..TINT_COUNT by position, wrapping.
const TINT_COUNT = 5;
const LANGUAGES = ['hi', 'en'];
// Phone rule (distributor-actions R6): digits, spaces, + and - only; 10-15 digits after cleaning.
const PHONE_CHARS = /^[0-9+\- ]+$/;
const MIN_PHONE_DIGITS = 10;
const MAX_PHONE_DIGITS = 15;

/** Trimmed phone, or null when empty. Throws 400 bad_phone when it breaks R6. Never logs the value. */
function cleanPhone(raw) {
  if (raw === null || raw === undefined) return null;
  if (typeof raw !== 'string') throw httpError(400, 'bad_phone', 'phone must be text');
  const phone = raw.trim();
  if (phone === '') return null;
  const digits = phone.replace(/\D/g, '').length;
  if (!PHONE_CHARS.test(phone) || digits < MIN_PHONE_DIGITS || digits > MAX_PHONE_DIGITS) {
    throw httpError(400, 'bad_phone', `phone must have ${MIN_PHONE_DIGITS}-${MAX_PHONE_DIGITS} digits; only digits, spaces, + and -`);
  }
  return phone;
}

/**
 * Every distributor of the store with its schedule as of `today`, in id order.
 * Shape: {id, name, note, cycle_days, last_visit_date, tint_index, next_visit_date, days_to_next_visit, visit_date_set}.
 */
export function distributorSchedules(db, storeId, today) {
  return listDistributors(db, storeId).map((d, i) => ({
    ...d,
    tint_index: (i % TINT_COUNT) + 1,
    ...nextVisit(d.last_visit_date, d.cycle_days, today),
  }));
}

function parseId(raw) {
  const id = Number(raw);
  if (!Number.isInteger(id) || id < 1) throw httpError(404, 'not_found', 'No such id');
  return id;
}

function validateDistributorFields(body, { partial }) {
  if (body === null || typeof body !== 'object') throw httpError(400, 'bad_request', 'Body must be an object');
  const out = {};
  if ('name' in body || !partial) {
    if (typeof body.name !== 'string' || body.name.trim() === '') throw httpError(400, 'bad_name', 'name is required');
    out.name = body.name.trim();
  }
  if ('cycle_days' in body || !partial) {
    const c = body.cycle_days;
    if (!Number.isInteger(c) || c < MIN_CYCLE_DAYS || c > MAX_CYCLE_DAYS) {
      throw httpError(400, 'bad_cycle_days', `cycle_days must be an integer ${MIN_CYCLE_DAYS}-${MAX_CYCLE_DAYS}`);
    }
    out.cycle_days = c;
  }
  if ('note' in body) {
    if (body.note !== null && typeof body.note !== 'string') throw httpError(400, 'bad_note', 'note must be text');
    out.note = body.note;
  }
  if ('phone' in body) out.phone = cleanPhone(body.phone);
  if ('last_visit_date' in body) {
    if (body.last_visit_date !== null && !isValidDate(body.last_visit_date)) {
      throw httpError(400, 'bad_date', 'last_visit_date must be YYYY-MM-DD or null');
    }
    out.last_visit_date = body.last_visit_date;
  }
  return out;
}

export function storeRouter({ db, clock }) {
  const router = express.Router();

  function distributorView(storeId, id) {
    return distributorSchedules(db, storeId, clock.today()).find((d) => d.id === id);
  }

  router.get('/store', (req, res) => {
    const store = getStore(db, req.storeId);
    if (!store) throw httpError(404, 'not_found', 'Store not found');
    res.json(store);
  });

  router.put('/store', (req, res) => {
    const language = req.body?.language;
    if (!LANGUAGES.includes(language)) throw httpError(400, 'bad_language', 'language must be hi or en');
    if (!getStore(db, req.storeId)) throw httpError(404, 'not_found', 'Store not found');
    res.json(setStoreLanguage(db, req.storeId, language));
  });

  router.get('/distributors', (req, res) => {
    const items = activeItemCounts(db, req.storeId);
    const runsOut = latestRunsOutCounts(db, req.storeId);
    const list = distributorSchedules(db, req.storeId, clock.today())
      .map((d) => ({ ...d, item_count: items.get(d.id) ?? 0, runs_out_count: runsOut.get(d.id) ?? 0 }))
      .sort((a, b) => a.next_visit_date.localeCompare(b.next_visit_date) || a.id - b.id);
    res.json(list);
  });

  router.post('/distributors', (req, res) => {
    const fields = validateDistributorFields(req.body, { partial: false });
    if (getDistributorByName(db, req.storeId, fields.name)) throw httpError(409, 'name_exists', 'A distributor with this name exists');
    const created = insertDistributor(db, req.storeId, fields, clock.now());
    console.log(`[kiranaq] distributor ${created.id} created for store ${req.storeId}`);
    res.status(201).json(distributorView(req.storeId, created.id));
  });

  router.put('/distributors/:id', (req, res) => {
    const id = parseId(req.params.id);
    if (!getDistributor(db, req.storeId, id)) throw httpError(404, 'not_found', 'Distributor not found');
    const fields = validateDistributorFields(req.body, { partial: true });
    if (fields.name) {
      const other = getDistributorByName(db, req.storeId, fields.name);
      if (other && other.id !== id) throw httpError(409, 'name_exists', 'A distributor with this name exists');
    }
    updateDistributor(db, req.storeId, id, fields);
    console.log(`[kiranaq] distributor ${id} updated (${Object.keys(fields).join(', ')})`);
    res.json(distributorView(req.storeId, id));
  });

  router.get('/distributors/:id/orders', (req, res) => {
    const id = parseId(req.params.id);
    if (!getDistributor(db, req.storeId, id)) throw httpError(404, 'not_found', 'Distributor not found');
    res.json(distributorOrders(db, req.storeId, id));
  });

  router.get('/items', (req, res) => {
    res.json(listItems(db, req.storeId));
  });

  router.put('/items/:id', (req, res) => {
    const id = parseId(req.params.id);
    if (!getItem(db, req.storeId, id)) throw httpError(404, 'not_found', 'Item not found');
    const body = req.body ?? {};
    const fields = {};
    if ('distributor_id' in body) {
      const did = body.distributor_id;
      if (did !== null && (!Number.isInteger(did) || !getDistributor(db, req.storeId, did))) {
        throw httpError(400, 'bad_distributor', 'distributor_id must be a distributor of this store or null');
      }
      fields.distributor_id = did;
    }
    if ('active' in body) {
      if (typeof body.active !== 'boolean') throw httpError(400, 'bad_active', 'active must be true or false');
      fields.active = body.active;
    }
    if (Object.keys(fields).length === 0) throw httpError(400, 'bad_request', 'Send distributor_id or active');
    const item = updateItem(db, req.storeId, id, fields);
    console.log(`[kiranaq] item ${id} updated (${Object.keys(fields).join(', ')})`);
    res.json(item);
  });

  return router;
}
