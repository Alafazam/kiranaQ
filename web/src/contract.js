// API shapes the web app relies on (spec section "API"). Phase 0 contract; Lane B serves these.
// All counts and quantities are in units; show packs with pack_size.

/**
 * @typedef {Object} Line
 * @property {number} item_id
 * @property {string} name_en
 * @property {string} name_hi
 * @property {number} count
 * @property {number} pack_size
 * @property {string} unit             pcs | kg | packet | bottle
 * @property {number|null} rate_per_day
 * @property {number|null} days_of_cover  null = does not run out
 * @property {'runs_out'|'order'|'ok'|'no_history'} status
 * @property {number} suggested_qty    units, multiple of pack_size
 * @property {number|null} final_qty   null = not confirmed
 * @property {string} reason_key       see server/src/core/reasons.js
 * @property {Object} reason_args
 */

/**
 * @typedef {Object} Card
 * @property {{id:number, name:string, tint_index:number, next_visit_date:string,
 *   days_to_next_visit:number, cycle_days:number, visit_date_set:boolean}|null} distributor
 *   null = the "No distributor" card (always last)
 * @property {Line[]} runs_out
 * @property {Line[]} order
 * @property {Line[]} enough
 * @property {Line[]} first_log
 * @property {boolean} confirmed
 * @property {boolean} visit_recorded
 */

/**
 * POST /api/logs and GET /api/logs/:id/result return
 * {log_id, log_date, cards: Card[], not_counted: number,
 *  delivery_candidates?: [{distributor_id, name, items:[{item_id, name_en, name_hi, rise}]}]}
 */
export const STATUSES = ['runs_out', 'order', 'ok', 'no_history'];
