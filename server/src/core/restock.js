// Delivery candidates from a log where counts went up. Pure. Owner: Lane A.
import { RESTOCK_MIN_PACKS } from './config.js';

/** Rise in units above what the old rate predicts; null when there is no earlier count. */
function riseOf(row) {
  if (row.p === null || row.p === undefined) return null;
  const hasRate = row.o !== null && row.o !== undefined && row.d !== null && row.d !== undefined;
  const expectedBefore = hasRate ? Math.max(row.p - row.o * row.d, 0) : row.p;
  return row.c - expectedBefore;
}

function isRisen(row) {
  const rise = riseOf(row);
  return rise !== null && rise >= RESTOCK_MIN_PACKS * row.pack_size;
}

/**
 * @param {Array<{item_id:number, distributor_id:number|null, p:number|null, c:number,
 *   d:number|null, o:number|null, pack_size:number}>} rows
 * @returns {Array<{distributor_id:number, items:Array<{item_id:number, rise:number}>}>}
 *   expected_before = o null ? p : max(p - o*d, 0); rise = c - expected_before;
 *   risen when rise >= RESTOCK_MIN_PACKS * pack_size. Items with no distributor are left out.
 */
export function findDeliveryCandidates(rows) {
  const byDistributor = new Map();
  for (const row of rows) {
    if (row.distributor_id === null || row.distributor_id === undefined || !isRisen(row)) continue;
    if (!byDistributor.has(row.distributor_id)) byDistributor.set(row.distributor_id, []);
    byDistributor.get(row.distributor_id).push({ item_id: row.item_id, rise: riseOf(row) });
  }
  return [...byDistributor].map(([distributor_id, items]) => ({ distributor_id, items }));
}

/** Set of item_ids that rose (used by the rule to keep the old rate). */
export function risenItemIds(rows) {
  return new Set(rows.filter(isRisen).map((row) => row.item_id));
}
