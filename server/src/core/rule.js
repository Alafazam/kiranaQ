// Rate, days of cover and order quantity for one item. Pure. Owner: Lane A.
// All quantities are in units. No numeric literals here except 0 and 1 (spec R10).
import { SAFETY_MARGIN, STOCKOUT_STEP_UP, RATE_SMOOTHING, DEFAULT_CYCLE_DAYS } from './config.js';

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
 * @param {string|null} [input.distributor]     name, passed through to reason_args
 * @param {string|null} [input.next_visit_date] passed through to reason_args
 * @returns {{rate_per_day: number|null, days_of_cover: number|null,
 *   status: 'runs_out'|'order'|'ok'|'no_history', suggested_qty: number,
 *   call_early: boolean, days_out: number|null, reason_key: string, reason_args: object}}
 */
export function computeItem(input) {
  const { p, c, d, o, rose, pack_size, distributor = null, next_visit_date = null } = input;
  const cycle_days = input.cycle_days ?? DEFAULT_CYCLE_DAYS;
  const days_to_next_visit = input.days_to_next_visit ?? DEFAULT_CYCLE_DAYS;

  const keepOld = Boolean(rose) || d === 0;
  if (p === null || p === undefined || (keepOld && (o === null || o === undefined))) {
    return {
      rate_per_day: null, days_of_cover: null, status: 'no_history', suggested_qty: 0,
      call_early: false, days_out: null, reason_key: 'no_history', reason_args: {},
    };
  }

  let rate;
  if (keepOld) {
    rate = o;
  } else {
    const sold = Math.max(p - c, 0);
    let observed = sold / d;
    if (c === 0) observed *= 1 + STOCKOUT_STEP_UP;
    rate = o === null || o === undefined ? observed : RATE_SMOOTHING * observed + (1 - RATE_SMOOTHING) * o;
  }

  const days_of_cover = rate > 0 ? c / rate : null;
  const need = rate * (days_to_next_visit + cycle_days) * SAFETY_MARGIN - c;
  const suggested_qty = roundupToPack(Math.max(need, 0), pack_size);
  const call_early = days_of_cover !== null && days_of_cover < days_to_next_visit;
  const days_out = call_early ? days_to_next_visit - days_of_cover : null;
  const status = call_early ? 'runs_out' : suggested_qty > 0 ? 'order' : 'ok';

  let reason_key;
  let reason_args;
  if (status === 'runs_out' && c === 0) {
    reason_key = 'ran_out_last_time';
    reason_args = { rate_per_day: rate, suggested_qty, distributor, next_visit_date };
  } else if (status === 'runs_out') {
    reason_key = 'runs_out_before_visit';
    reason_args = { days_of_cover, distributor, days_to_next_visit, days_out };
  } else if (status === 'order') {
    reason_key = 'order_needed';
    reason_args = { rate_per_day: rate, days_of_cover, suggested_qty, distributor, next_visit_date };
  } else {
    reason_key = 'no_order_needed';
    reason_args = { days_of_cover, distributor, next_visit_date };
  }

  return { rate_per_day: rate, days_of_cover, status, suggested_qty, call_early, days_out, reason_key, reason_args };
}

/** Round a unit quantity up to a whole number of packs, in units. */
export function roundupToPack(qty, packSize) {
  if (!(packSize >= 1)) throw new Error(`invalid pack size: ${packSize}`);
  if (qty <= 0) return 0;
  return Math.ceil(qty / packSize) * packSize;
}
