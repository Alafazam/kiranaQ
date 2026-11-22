// Delivery candidates from a log where counts went up. Pure. Owner: Lane A.

/**
 * @param {Array<{item_id:number, distributor_id:number|null, p:number|null, c:number,
 *   d:number|null, o:number|null, pack_size:number}>} rows
 * @returns {Array<{distributor_id:number, items:Array<{item_id:number, rise:number}>}>}
 *   expected_before = o null ? p : max(p - o*d, 0); rise = c - expected_before;
 *   risen when rise >= RESTOCK_MIN_PACKS * pack_size. Items with no distributor are left out.
 */
export function findDeliveryCandidates(rows) {
  throw new Error('not implemented: findDeliveryCandidates (Lane A)');
}

/** Set of item_ids that rose (used by the rule to keep the old rate). */
export function risenItemIds(rows) {
  throw new Error('not implemented: risenItemIds (Lane A)');
}
