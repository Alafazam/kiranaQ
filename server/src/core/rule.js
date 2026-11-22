// Rate, days of cover and order quantity for one item. Pure. Owner: Lane A.
// All quantities are in units. No numeric literals here except 0 and 1 (spec R10).

/**
 * @param {object} input
 * @param {number|null} input.p   previous count (null = no earlier counted log)
 * @param {number} input.c        current count
 * @param {number|null} input.d   days since the item's last counted log
 * @param {number|null} input.o   old rate per day
 * @param {boolean} input.rose    true when restock.js marked the item as risen
 * @param {number} input.pack_size
 * @param {number} input.cycle_days
 * @param {number} input.days_to_next_visit
 * @returns {{rate_per_day: number|null, days_of_cover: number|null,
 *   status: 'runs_out'|'order'|'ok'|'no_history', suggested_qty: number,
 *   call_early: boolean, days_out: number|null, reason_key: string, reason_args: object}}
 */
export function computeItem(input) {
  throw new Error('not implemented: computeItem (Lane A)');
}

/** Round a unit quantity up to a whole number of packs, in units. */
export function roundupToPack(qty, packSize) {
  throw new Error('not implemented: roundupToPack (Lane A)');
}
