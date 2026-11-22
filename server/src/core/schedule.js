// Next visit of a distributor. Pure. Owner: Lane A.

/**
 * @param {string|null} lastVisitDate  YYYY-MM-DD, or null when not set
 * @param {number} cycleDays
 * @param {string} today  YYYY-MM-DD
 * @returns {{next_visit_date: string, days_to_next_visit: number, visit_date_set: boolean}}
 *   The visit day itself does not count: a visit today gives today + cycle.
 *   No last visit gives today + cycle and visit_date_set = false.
 */
export function nextVisit(lastVisitDate, cycleDays, today) {
  throw new Error('not implemented: nextVisit (Lane A)');
}
