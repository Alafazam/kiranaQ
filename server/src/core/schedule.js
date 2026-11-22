// Next visit of a distributor. Pure. Owner: Lane A.

const MS_PER_DAY = 86400000;

function dayNumber(ymd) {
  const t = Date.parse(`${ymd}T00:00:00Z`);
  if (Number.isNaN(t)) throw new Error(`invalid date: ${ymd}`);
  return Math.round(t / MS_PER_DAY);
}

function dateOf(dayNum) {
  return new Date(dayNum * MS_PER_DAY).toISOString().slice(0, 10);
}

/**
 * @param {string|null} lastVisitDate  YYYY-MM-DD, or null when not set
 * @param {number} cycleDays
 * @param {string} today  YYYY-MM-DD
 * @returns {{next_visit_date: string, days_to_next_visit: number, visit_date_set: boolean}}
 *   First lastVisit + k * cycle (k >= 1) that is today or later.
 *   No last visit gives today + cycle and visit_date_set = false.
 */
export function nextVisit(lastVisitDate, cycleDays, today) {
  if (!(cycleDays >= 1)) throw new Error(`invalid cycle days: ${cycleDays}`);
  const t = dayNumber(today);
  if (!lastVisitDate) {
    return { next_visit_date: dateOf(t + cycleDays), days_to_next_visit: cycleDays, visit_date_set: false };
  }
  const last = dayNumber(lastVisitDate);
  const k = Math.max(Math.ceil((t - last) / cycleDays), 1);
  const next = last + k * cycleDays;
  return { next_visit_date: dateOf(next), days_to_next_visit: next - t, visit_date_set: true };
}
