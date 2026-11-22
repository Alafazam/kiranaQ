// Business date in the store's time zone (IST), as YYYY-MM-DD.
import { STORE_TIMEZONE } from './core/config.js';

export function createClock(timeZone = STORE_TIMEZONE) {
  const fmt = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' });
  return { today: () => fmt.format(new Date()), now: () => new Date().toISOString() };
}

// For tests and demo:check.
export function fixedClock(date, iso = `${date}T06:30:00.000Z`) {
  return { today: () => date, now: () => iso };
}
