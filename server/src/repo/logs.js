// Stock log, count, result, item state, visit and receipt queries.
// Every query takes storeId (tenant rule). Transactions are opened by the caller (routes/logs.js).

export function insertLog(db, storeId, { log_date, created_at, source, photo_count, has_restock }) {
  const info = db
    .prepare(
      `INSERT INTO stock_log (store_id, log_date, created_at, source, photo_count, has_restock)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(storeId, log_date, created_at, source, photo_count, has_restock ? 1 : 0);
  return Number(info.lastInsertRowid);
}

export function getLog(db, storeId, logId) {
  return (
    db
      .prepare('SELECT id, log_date, created_at, source, photo_count, has_restock FROM stock_log WHERE store_id = ? AND id = ?')
      .get(storeId, logId) ?? null
  );
}

export function latestLogId(db, storeId) {
  const r = db.prepare('SELECT id FROM stock_log WHERE store_id = ? ORDER BY log_date DESC, id DESC LIMIT 1').get(storeId);
  return r ? r.id : null;
}

/** Newest first, with item count, runs-out count and recorded visits. */
export function listLogs(db, storeId) {
  const logs = db
    .prepare(
      `SELECT l.id, l.log_date,
              (SELECT COUNT(*) FROM stock_count c WHERE c.store_id = l.store_id AND c.log_id = l.id) AS item_count,
              (SELECT COUNT(*) FROM item_result r WHERE r.store_id = l.store_id AND r.log_id = l.id AND r.status = 'runs_out') AS runs_out_count
         FROM stock_log l WHERE l.store_id = ? ORDER BY l.log_date DESC, l.id DESC`,
    )
    .all(storeId);
  const visits = db
    .prepare(
      `SELECT v.log_id, v.distributor_id, d.name FROM visit v
         JOIN distributor d ON d.id = v.distributor_id AND d.store_id = v.store_id
        WHERE v.store_id = ? ORDER BY v.id`,
    )
    .all(storeId);
  return logs.map((l) => ({
    ...l,
    visits: visits.filter((v) => v.log_id === l.id).map(({ distributor_id, name }) => ({ distributor_id, name })),
  }));
}

export function insertCount(db, storeId, logId, { item_id, count, source, vision_count = null, vision_confidence = null }) {
  db.prepare(
    `INSERT INTO stock_count (log_id, item_id, store_id, count, source, vision_count, vision_confidence)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(logId, item_id, storeId, count, source, vision_count, vision_confidence);
}

export function logCounts(db, storeId, logId) {
  return db
    .prepare(
      `SELECT item_id, count, source, vision_count, vision_confidence
         FROM stock_count WHERE store_id = ? AND log_id = ? ORDER BY item_id`,
    )
    .all(storeId, logId);
}

/** Active items of the store that are not counted in this log. */
export function notCountedCount(db, storeId, logId) {
  return db
    .prepare(
      `SELECT COUNT(*) AS n FROM item i
        WHERE i.store_id = ? AND i.active = 1
          AND NOT EXISTS (SELECT 1 FROM stock_count c WHERE c.store_id = i.store_id AND c.log_id = ? AND c.item_id = i.id)`,
    )
    .get(storeId, logId).n;
}

/**
 * For each item counted in logId: the item's previous counted log before logId.
 * Returns Map item_id -> {p, prev_log_date, o} where o is the rate stored with that previous log
 * (that is the item's item_state rate at the time logId was saved). No entry = no earlier count.
 */
export function priorCounts(db, storeId, logId) {
  const rows = db
    .prepare(
      `SELECT c.item_id, pc.count AS p, pl.log_date AS prev_log_date, pr.rate_per_day AS o
         FROM stock_count c
         JOIN stock_count pc ON pc.store_id = c.store_id AND pc.item_id = c.item_id
          AND pc.log_id = (SELECT MAX(x.log_id) FROM stock_count x
                            WHERE x.store_id = c.store_id AND x.item_id = c.item_id AND x.log_id < c.log_id)
         JOIN stock_log pl ON pl.id = pc.log_id AND pl.store_id = c.store_id
         LEFT JOIN item_result pr ON pr.store_id = c.store_id AND pr.log_id = pc.log_id AND pr.item_id = c.item_id
        WHERE c.store_id = ? AND c.log_id = ?`,
    )
    .all(storeId, logId);
  return new Map(rows.map((r) => [r.item_id, { p: r.p, prev_log_date: r.prev_log_date, o: r.o }]));
}

export function upsertResult(db, storeId, logId, r) {
  db.prepare(
    `INSERT INTO item_result (log_id, item_id, store_id, distributor_id, rate_per_day, days_of_cover, next_visit_date,
                              status, suggested_qty, final_qty, reason_key, reason_args)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)
     ON CONFLICT (log_id, item_id) DO UPDATE SET
       distributor_id = excluded.distributor_id, rate_per_day = excluded.rate_per_day,
       days_of_cover = excluded.days_of_cover, next_visit_date = excluded.next_visit_date,
       status = excluded.status, suggested_qty = excluded.suggested_qty,
       reason_key = excluded.reason_key, reason_args = excluded.reason_args`,
  ).run(
    logId, r.item_id, storeId, r.distributor_id, r.rate_per_day, r.days_of_cover, r.next_visit_date,
    r.status, r.suggested_qty, r.reason_key, JSON.stringify(r.reason_args),
  );
}

/** Result rows of a log joined with item fields and the count: the API "line" shape plus distributor_id. */
export function resultLines(db, storeId, logId) {
  return db
    .prepare(
      `SELECT r.item_id, i.name_en, i.name_hi, c.count, i.pack_size, i.unit, r.rate_per_day, r.days_of_cover,
              r.status, r.suggested_qty, r.final_qty, r.reason_key, r.reason_args, r.distributor_id, r.next_visit_date
         FROM item_result r
         JOIN item i ON i.id = r.item_id AND i.store_id = r.store_id
         JOIN stock_count c ON c.log_id = r.log_id AND c.item_id = r.item_id AND c.store_id = r.store_id
        WHERE r.store_id = ? AND r.log_id = ?
        ORDER BY i.name_en`,
    )
    .all(storeId, logId)
    .map((r) => ({ ...r, reason_args: JSON.parse(r.reason_args) }));
}

export function setFinalQty(db, storeId, logId, itemId, finalQty) {
  db.prepare('UPDATE item_result SET final_qty = ? WHERE store_id = ? AND log_id = ? AND item_id = ?').run(finalQty, storeId, logId, itemId);
}

export function upsertItemState(db, storeId, { item_id, rate_per_day, last_log_id }, now) {
  db.prepare(
    `INSERT INTO item_state (store_id, item_id, rate_per_day, last_log_id, updated_at) VALUES (?, ?, ?, ?, ?)
     ON CONFLICT (store_id, item_id) DO UPDATE SET
       rate_per_day = excluded.rate_per_day, last_log_id = excluded.last_log_id, updated_at = excluded.updated_at`,
  ).run(storeId, item_id, rate_per_day, last_log_id, now);
}

export function getItemState(db, storeId, itemId) {
  return db.prepare('SELECT item_id, rate_per_day, last_log_id FROM item_state WHERE store_id = ? AND item_id = ?').get(storeId, itemId) ?? null;
}

/** Insert the visit once; return its id (same id on a second call). */
export function ensureVisit(db, storeId, { distributor_id, log_id, visited_on }, now) {
  db.prepare(
    `INSERT INTO visit (store_id, distributor_id, log_id, visited_on, created_at) VALUES (?, ?, ?, ?, ?)
     ON CONFLICT (distributor_id, log_id) DO NOTHING`,
  ).run(storeId, distributor_id, log_id, visited_on, now);
  return db.prepare('SELECT id FROM visit WHERE store_id = ? AND distributor_id = ? AND log_id = ?').get(storeId, distributor_id, log_id).id;
}

export function upsertReceipt(db, storeId, visitId, itemId, receivedQty) {
  db.prepare(
    `INSERT INTO receipt (visit_id, item_id, store_id, received_qty) VALUES (?, ?, ?, ?)
     ON CONFLICT (visit_id, item_id) DO UPDATE SET received_qty = excluded.received_qty`,
  ).run(visitId, itemId, storeId, receivedQty);
}

/** Set of distributor ids with a recorded visit in this log. */
export function visitDistributorIds(db, storeId, logId) {
  return new Set(db.prepare('SELECT distributor_id FROM visit WHERE store_id = ? AND log_id = ?').all(storeId, logId).map((r) => r.distributor_id));
}

/** Runs-out item count per distributor in the newest log. */
export function latestRunsOutCounts(db, storeId) {
  const logId = latestLogId(db, storeId);
  if (logId === null) return new Map();
  const rows = db
    .prepare(
      `SELECT distributor_id, COUNT(*) AS n FROM item_result
        WHERE store_id = ? AND log_id = ? AND status = 'runs_out' AND distributor_id IS NOT NULL GROUP BY distributor_id`,
    )
    .all(storeId, logId);
  return new Map(rows.map((r) => [r.distributor_id, r.n]));
}

export function setHasRestock(db, storeId, logId, hasRestock) {
  db.prepare('UPDATE stock_log SET has_restock = ? WHERE store_id = ? AND id = ?').run(hasRestock ? 1 : 0, storeId, logId);
}
