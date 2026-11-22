// Store and distributor queries. Every query takes storeId (tenant rule).

export function getStore(db, storeId) {
  return db.prepare('SELECT id, name, language FROM store WHERE id = ?').get(storeId) ?? null;
}

export function setStoreLanguage(db, storeId, language) {
  db.prepare('UPDATE store SET language = ? WHERE id = ?').run(language, storeId);
  return getStore(db, storeId);
}

const DISTRIBUTOR_COLS = 'id, name, note, phone, cycle_days, last_visit_date';

/** All distributors of the store, ordered by id (tint_index follows this order). */
export function listDistributors(db, storeId) {
  return db.prepare(`SELECT ${DISTRIBUTOR_COLS} FROM distributor WHERE store_id = ? ORDER BY id`).all(storeId);
}

export function getDistributor(db, storeId, id) {
  return db.prepare(`SELECT ${DISTRIBUTOR_COLS} FROM distributor WHERE store_id = ? AND id = ?`).get(storeId, id) ?? null;
}

export function getDistributorByName(db, storeId, name) {
  return db.prepare(`SELECT ${DISTRIBUTOR_COLS} FROM distributor WHERE store_id = ? AND name = ?`).get(storeId, name) ?? null;
}

export function insertDistributor(db, storeId, { name, note = null, phone = null, cycle_days, last_visit_date = null }, now) {
  const info = db
    .prepare(
      `INSERT INTO distributor (store_id, name, note, phone, cycle_days, last_visit_date, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(storeId, name, note, phone, cycle_days, last_visit_date, now);
  return getDistributor(db, storeId, Number(info.lastInsertRowid));
}

/** fields: any of {name, note, phone, cycle_days, last_visit_date}, already validated. */
export function updateDistributor(db, storeId, id, fields) {
  const allowed = ['name', 'note', 'phone', 'cycle_days', 'last_visit_date'].filter((k) => k in fields);
  if (allowed.length > 0) {
    const sets = allowed.map((k) => `${k} = ?`).join(', ');
    db.prepare(`UPDATE distributor SET ${sets} WHERE store_id = ? AND id = ?`).run(...allowed.map((k) => fields[k]), storeId, id);
  }
  return getDistributor(db, storeId, id);
}

/** Active item count per distributor id. */
export function activeItemCounts(db, storeId) {
  const rows = db
    .prepare('SELECT distributor_id, COUNT(*) AS n FROM item WHERE store_id = ? AND active = 1 AND distributor_id IS NOT NULL GROUP BY distributor_id')
    .all(storeId);
  return new Map(rows.map((r) => [r.distributor_id, r.n]));
}

/** Move last_visit_date forward to visitDate; never moves it back (safe to call twice). */
export function recordVisitDate(db, storeId, id, visitDate) {
  db.prepare(
    `UPDATE distributor SET last_visit_date = ?
      WHERE store_id = ? AND id = ? AND (last_visit_date IS NULL OR last_visit_date < ?)`,
  ).run(visitDate, storeId, id, visitDate);
}
