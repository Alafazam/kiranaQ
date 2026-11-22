// Group item results into one card per distributor. Pure. Owner: Lane A.

/**
 * @param {Array<object>} lines  one per item: item fields + computeItem() output + distributor_id
 * @param {Array<{id:number, name:string, tint_index:number, next_visit_date:string,
 *   days_to_next_visit:number, cycle_days:number, visit_date_set:boolean}>} distributors
 * @returns {Array<{distributor: object|null, runs_out: object[], order: object[], enough: object[],
 *   first_log: object[], confirmed: boolean, visit_recorded: boolean}>}
 *   Cards sorted by next visit; "No distributor" card (distributor null) last.
 *   Inside a card: runs_out, then order, then enough, then first_log.
 */
export function buildCards(lines, distributors) {
  throw new Error('not implemented: buildCards (Lane A)');
}
