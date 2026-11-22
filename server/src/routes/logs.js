// Logs, results, orders and visits routes (spec "API > Logs and results"). Owner: Lane B.
// Rule math lives in core/*; this file loads inputs, calls core and saves outputs in one transaction.
import express from 'express';
import { httpError } from '../app.js';
import { DEFAULT_CYCLE_DAYS, MAX_IMAGES, MAX_STORED_COUNT } from '../core/config.js';
import { computeItem } from '../core/rule.js';
import { nextVisit } from '../core/schedule.js';
import { buildCards } from '../core/plan.js';
import { findDeliveryCandidates, risenItemIds } from '../core/restock.js';
import { itemsById } from '../repo/items.js';
import { getDistributor, recordVisitDate } from '../repo/store.js';
import {
  insertLog, getLog, latestLogId, listLogs, insertCount, logCounts, notCountedCount, priorCounts,
  upsertResult, resultLines, setFinalQty, upsertItemState, ensureVisit, upsertReceipt,
  visitDistributorIds, setHasRestock,
} from '../repo/logs.js';
import { daysBetween, addDays } from '../repo/dates.js';
import { distributorSchedules } from './store.js';

const LOG_SOURCES = ['photo', 'manual'];
const COUNT_SOURCES = ['vision', 'voice', 'tap'];
const ORDER_STATUSES = ['runs_out', 'order'];

function parseId(raw) {
  const id = Number(raw);
  if (!Number.isInteger(id) || id < 1) throw httpError(404, 'not_found', 'No such log');
  return id;
}

function validateLogBody(body, items) {
  if (body === null || typeof body !== 'object') throw httpError(400, 'bad_request', 'Body must be an object');
  if (!LOG_SOURCES.includes(body.source)) throw httpError(400, 'bad_source', 'source must be photo or manual');
  const photoCount = body.photo_count ?? 0;
  if (!Number.isInteger(photoCount) || photoCount < 0 || photoCount > MAX_IMAGES) {
    throw httpError(400, 'bad_photo_count', `photo_count must be 0-${MAX_IMAGES}`);
  }
  if (!Array.isArray(body.counts) || body.counts.length === 0) throw httpError(400, 'empty_log', 'counts must be a non-empty list');
  const seen = new Set();
  const counts = body.counts.map((c) => {
    if (c === null || typeof c !== 'object' || !items.has(c.item_id)) throw httpError(400, 'unknown_item', `Unknown item ${c?.item_id}`);
    if (seen.has(c.item_id)) throw httpError(400, 'duplicate_item', `Item ${c.item_id} is listed twice`);
    seen.add(c.item_id);
    if (!Number.isInteger(c.count) || c.count < 0 || c.count > MAX_STORED_COUNT) {
      throw httpError(400, 'bad_count', `count must be an integer 0-${MAX_STORED_COUNT}`);
    }
    const source = c.source ?? 'tap';
    if (!COUNT_SOURCES.includes(source)) throw httpError(400, 'bad_count_source', 'count source must be vision, voice or tap');
    const visionCount = c.vision_count ?? null;
    const visionConfidence = c.vision_confidence ?? null;
    if (visionCount !== null && !Number.isInteger(visionCount)) throw httpError(400, 'bad_vision_count', 'vision_count must be an integer');
    if (visionConfidence !== null && !(typeof visionConfidence === 'number' && visionConfidence >= 0 && visionConfidence <= 1)) {
      throw httpError(400, 'bad_vision_confidence', 'vision_confidence must be 0-1');
    }
    return { item_id: c.item_id, count: c.count, source, vision_count: visionCount, vision_confidence: visionConfidence };
  });
  return { source: body.source, photo_count: photoCount, counts };
}

/** Rule inputs for one item: its distributor's schedule, or the default cycle when it has none. */
function planItem({ item, dist, p, c, d, o, rose, logDate }) {
  const cycleDays = dist ? dist.cycle_days : DEFAULT_CYCLE_DAYS;
  const daysToNext = dist ? dist.days_to_next_visit : DEFAULT_CYCLE_DAYS;
  const nextDate = dist ? dist.next_visit_date : addDays(logDate, DEFAULT_CYCLE_DAYS);
  const out = computeItem({
    p, c, d, o, rose, pack_size: item.pack_size, cycle_days: cycleDays, days_to_next_visit: daysToNext,
    distributor: dist ? dist.name : null, next_visit_date: nextDate,
  });
  return { ...out, item_id: item.id, distributor_id: item.distributor_id, next_visit_date: nextDate };
}

/** Restock rows for every item in the log that has an earlier count. */
function restockRows(db, storeId, logId, logDate, counts, items) {
  const priors = priorCounts(db, storeId, logId);
  const rows = counts.map(({ item_id, count }) => {
    const prior = priors.get(item_id);
    const item = items.get(item_id);
    return {
      item_id, distributor_id: item.distributor_id, c: count, pack_size: item.pack_size,
      p: prior ? prior.p : null,
      d: prior ? daysBetween(prior.prev_log_date, logDate) : null,
      o: prior ? prior.o : null,
    };
  });
  return rows;
}

export function logsRouter({ db, clock }) {
  const router = express.Router();

  function schedulesById(storeId, today) {
    return new Map(distributorSchedules(db, storeId, today).map((d) => [d.id, d]));
  }

  function candidatesFor(storeId, log) {
    const items = itemsById(db, storeId);
    const rows = restockRows(db, storeId, log.id, log.log_date, logCounts(db, storeId, log.id), items);
    const schedules = schedulesById(storeId, log.log_date);
    return findDeliveryCandidates(rows).map((cand) => ({
      distributor_id: cand.distributor_id,
      name: schedules.get(cand.distributor_id)?.name ?? null,
      items: cand.items.map(({ item_id, rise }) => {
        const item = items.get(item_id);
        return { item_id, sku_key: item.sku_key, name_en: item.name_en, name_hi: item.name_hi, rise };
      }),
    }));
  }

  /** {log_id, log_date, cards, not_counted, delivery_candidates} for one log. */
  function buildResult(storeId, log) {
    const distributors = distributorSchedules(db, storeId, clock.today()).map((d) => ({
      id: d.id, name: d.name, phone: d.phone, tint_index: d.tint_index, next_visit_date: d.next_visit_date,
      days_to_next_visit: d.days_to_next_visit, cycle_days: d.cycle_days, visit_date_set: d.visit_date_set,
    }));
    const lines = resultLines(db, storeId, log.id).map(({ next_visit_date, ...line }) => line);
    const visited = visitDistributorIds(db, storeId, log.id);
    const cards = buildCards(lines, distributors).map((card) => ({
      ...card,
      visit_recorded: card.distributor !== null && visited.has(card.distributor.id),
    }));
    return {
      log_id: log.id,
      log_date: log.log_date,
      cards,
      not_counted: notCountedCount(db, storeId, log.id),
      delivery_candidates: candidatesFor(storeId, log),
    };
  }

  function requireLog(storeId, rawId) {
    const log = getLog(db, storeId, parseId(rawId));
    if (!log) throw httpError(404, 'not_found', 'Log not found');
    return log;
  }

  const saveLog = db.transaction((storeId, input) => {
    const logDate = clock.today();
    const now = clock.now();
    const items = itemsById(db, storeId);
    const logId = insertLog(db, storeId, { log_date: logDate, created_at: now, source: input.source, photo_count: input.photo_count, has_restock: false });
    for (const c of input.counts) insertCount(db, storeId, logId, c);

    const rows = restockRows(db, storeId, logId, logDate, input.counts, items);
    const risen = risenItemIds(rows);
    setHasRestock(db, storeId, logId, findDeliveryCandidates(rows).length > 0);

    const schedules = schedulesById(storeId, logDate);
    for (const row of rows) {
      const item = items.get(row.item_id);
      const result = planItem({
        item, dist: schedules.get(item.distributor_id) ?? null,
        p: row.p, c: row.c, d: row.d, o: row.o, rose: risen.has(row.item_id), logDate,
      });
      upsertResult(db, storeId, logId, result);
      upsertItemState(db, storeId, { item_id: row.item_id, rate_per_day: result.rate_per_day, last_log_id: logId }, now);
    }
    return logId;
  });

  /** Re-plan one distributor's lines in a log with the stored rate. Never touches item_state. */
  function replanDistributor(storeId, log, distributorId) {
    const items = itemsById(db, storeId);
    const dist = schedulesById(storeId, log.log_date).get(distributorId);
    for (const line of resultLines(db, storeId, log.id)) {
      if (line.distributor_id !== distributorId) continue;
      const hasRate = line.rate_per_day !== null;
      const result = planItem({
        item: items.get(line.item_id), dist,
        p: hasRate ? line.count : null, c: line.count, d: 0, o: line.rate_per_day, rose: true, logDate: log.log_date,
      });
      upsertResult(db, storeId, log.id, { ...result, distributor_id: line.distributor_id });
    }
  }

  const confirmVisit = db.transaction((storeId, log, candidate) => {
    const visitId = ensureVisit(db, storeId, { distributor_id: candidate.distributor_id, log_id: log.id, visited_on: log.log_date }, clock.now());
    for (const { item_id, rise } of candidate.items) upsertReceipt(db, storeId, visitId, item_id, rise);
    recordVisitDate(db, storeId, candidate.distributor_id, log.log_date);
    replanDistributor(storeId, log, candidate.distributor_id);
    return visitId;
  });

  const saveOrder = db.transaction((storeId, logId, distLines, wanted) => {
    for (const [itemId, qty] of wanted) setFinalQty(db, storeId, logId, itemId, qty);
    for (const line of distLines) {
      if (!wanted.has(line.item_id) && line.final_qty === null && ORDER_STATUSES.includes(line.status)) {
        setFinalQty(db, storeId, logId, line.item_id, line.suggested_qty);
      }
    }
  });

  router.get('/logs', (req, res) => {
    res.json(listLogs(db, req.storeId));
  });

  router.post('/logs', (req, res) => {
    const input = validateLogBody(req.body, itemsById(db, req.storeId));
    const logId = saveLog(req.storeId, input);
    const log = getLog(db, req.storeId, logId);
    const result = buildResult(req.storeId, log);
    console.log(`[kiranaq] log ${logId} saved: ${input.counts.length} counts, ${result.delivery_candidates.length} delivery candidates`);
    res.status(201).json(result);
  });

  router.get('/logs/:id', (req, res) => {
    const log = requireLog(req.storeId, req.params.id);
    res.json({ log, counts: logCounts(db, req.storeId, log.id), cards: buildResult(req.storeId, log).cards });
  });

  router.get('/logs/:id/result', (req, res) => {
    res.json(buildResult(req.storeId, requireLog(req.storeId, req.params.id)));
  });

  router.get('/orders/latest', (req, res) => {
    const id = latestLogId(db, req.storeId);
    if (id === null) return res.json({ cards: [] });
    res.json(buildResult(req.storeId, getLog(db, req.storeId, id)));
  });

  router.put('/logs/:id/order', (req, res) => {
    const log = requireLog(req.storeId, req.params.id);
    const body = req.body ?? {};
    const distributorId = body.distributor_id ?? null;
    if (distributorId !== null && !getDistributor(db, req.storeId, distributorId)) throw httpError(404, 'not_found', 'Distributor not found');
    if (!Array.isArray(body.lines)) throw httpError(400, 'bad_lines', 'lines must be a list');
    const distLines = resultLines(db, req.storeId, log.id).filter((l) => l.distributor_id === distributorId);
    const byItem = new Map(distLines.map((l) => [l.item_id, l]));
    const wanted = new Map();
    for (const l of body.lines) {
      const line = byItem.get(l?.item_id);
      if (!line) throw httpError(400, 'not_in_order', `Item ${l?.item_id} is not in this distributor's order`);
      if (wanted.has(l.item_id)) throw httpError(400, 'duplicate_item', `Item ${l.item_id} is listed twice`);
      if (!Number.isInteger(l.final_qty) || l.final_qty < 0 || l.final_qty % line.pack_size !== 0) {
        throw httpError(400, 'bad_qty', `final_qty must be a multiple of the pack (${line.pack_size})`);
      }
      wanted.set(l.item_id, l.final_qty);
    }
    saveOrder(req.storeId, log.id, distLines, wanted);
    console.log(`[kiranaq] order confirmed: log ${log.id}, distributor ${distributorId}, ${wanted.size} changed lines`);
    const { log_id, cards } = buildResult(req.storeId, log);
    res.json({ log_id, cards });
  });

  router.post('/logs/:id/visits', (req, res) => {
    const log = requireLog(req.storeId, req.params.id);
    const body = req.body ?? {};
    if (!Number.isInteger(body.distributor_id)) throw httpError(400, 'bad_distributor', 'distributor_id is required');
    if (typeof body.confirmed !== 'boolean') throw httpError(400, 'bad_confirmed', 'confirmed must be true or false');
    if (!getDistributor(db, req.storeId, body.distributor_id)) throw httpError(404, 'not_found', 'Distributor not found');
    const candidate = candidatesFor(req.storeId, log).find((c) => c.distributor_id === body.distributor_id);
    if (!candidate) throw httpError(400, 'not_a_candidate', 'No items of this distributor went up in this log');
    if (body.confirmed) {
      const visitId = confirmVisit(req.storeId, log, candidate);
      console.log(`[kiranaq] visit ${visitId} recorded: distributor ${candidate.distributor_id}, log ${log.id}`);
    }
    const { log_id, cards } = buildResult(req.storeId, log);
    const distributor = distributorSchedules(db, req.storeId, clock.today()).find((d) => d.id === body.distributor_id);
    res.json({ log_id, cards, distributor });
  });

  return router;
}
