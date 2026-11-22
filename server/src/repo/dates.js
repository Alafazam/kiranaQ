// Business date helpers (YYYY-MM-DD, no time zone math: dates are already store-local).

const MS_PER_DAY = 86400000;
const YMD = /^\d{4}-\d{2}-\d{2}$/;

function dayNumber(ymd) {
  const t = Date.parse(`${ymd}T00:00:00Z`);
  if (Number.isNaN(t)) throw new Error(`invalid date: ${ymd}`);
  return Math.round(t / MS_PER_DAY);
}

/** Whole days from a to b (b - a). */
export function daysBetween(a, b) {
  return dayNumber(b) - dayNumber(a);
}

export function addDays(ymd, n) {
  return new Date((dayNumber(ymd) + n) * MS_PER_DAY).toISOString().slice(0, 10);
}

export function isValidDate(value) {
  if (typeof value !== 'string' || !YMD.test(value)) return false;
  try {
    return addDays(value, 0) === value;
  } catch {
    return false;
  }
}
