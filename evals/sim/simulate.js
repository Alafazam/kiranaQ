// E4: does the learning rule beat fixed starter quantities? Free, seeded, no chart library.
// Usage: node simulate.js   (writes sim-table.md and sim-chart.svg next to this file)
import fs from 'node:fs';
import { computeItem, roundupToPack } from '../../server/src/core/rule.js';

const SEED = 20261122;
const WEEKS = 12;
const WEEK_DAYS = 7;
const ITEM_COUNT = 25;
const CYCLES = [4, 7, 15];
const PACK_SIZES = [1, 6, 12];
const MIN_DEMAND = 0.3;
const MAX_DEMAND = 3;
const GUESS_LOW = 0.4;    // owner's starter guess is this far off the true demand, at best
const GUESS_HIGH = 2.2;   // ... and this far, at worst

function mulberry32(seed) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function poisson(rand, lambda) {
  const limit = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do { k += 1; p *= rand(); } while (p > limit);
  return k - 1;
}

function makeItems(rand) {
  return Array.from({ length: ITEM_COUNT }, (_, i) => {
    const demand = MIN_DEMAND + rand() * (MAX_DEMAND - MIN_DEMAND);
    const cycle = CYCLES[i % CYCLES.length];
    const pack = PACK_SIZES[Math.floor(rand() * PACK_SIZES.length)];
    const guess = demand * (GUESS_LOW + rand() * (GUESS_HIGH - GUESS_LOW));
    return { id: i + 1, demand, cycle, pack, starter: Math.max(roundupToPack(guess * cycle, pack), pack) };
  });
}

/** Run one policy over all days. Returns per-week stock-out item-days and leftover units at visits. */
function runPolicy(items, demandByDay, policy) {
  const weeks = Array.from({ length: WEEKS }, () => ({ stockoutDays: 0, leftover: 0, visits: 0 }));
  const totalDays = WEEKS * WEEK_DAYS;
  for (const item of items) {
    let stock = item.starter;
    let log = { count: stock, day: 0 };   // the day-0 log
    let rate = null;
    for (let day = 1; day <= totalDays; day += 1) {
      const wanted = demandByDay[item.id][day];
      const week = weeks[Math.floor((day - 1) / WEEK_DAYS)];
      if (wanted > stock) week.stockoutDays += 1;
      stock = Math.max(stock - wanted, 0);
      if (day % item.cycle !== 0) continue;
      // Visit day: log before the delivery, then order, then log again after it.
      week.leftover += stock;
      week.visits += 1;
      let order = item.starter;
      if (policy === 'learning') {
        const r = computeItem({
          p: log.count, c: stock, d: day - log.day, o: rate, rose: false,
          pack_size: item.pack, cycle_days: item.cycle, days_to_next_visit: 0,
        });
        rate = r.rate_per_day;
        if (r.status !== 'no_history') order = r.suggested_qty;
      }
      stock += order;
      log = { count: stock, day };
    }
  }
  return weeks;
}

export function simulate() {
  const rand = mulberry32(SEED);
  const items = makeItems(rand);
  const totalDays = WEEKS * WEEK_DAYS;
  const demandByDay = {};
  for (const item of items) {
    demandByDay[item.id] = [0];
    for (let day = 1; day <= totalDays; day += 1) demandByDay[item.id].push(poisson(rand, item.demand));
  }
  return {
    fixed: runPolicy(items, demandByDay, 'fixed'),
    learning: runPolicy(items, demandByDay, 'learning'),
  };
}

function table({ fixed, learning }) {
  const rows = fixed.map((f, i) => {
    const l = learning[i];
    return `| ${i + 1} | ${f.stockoutDays} | ${l.stockoutDays} | ${f.leftover} | ${l.leftover} |`;
  });
  const sum = (arr, k) => arr.reduce((s, w) => s + w[k], 0);
  return [
    '# E4: learning rule vs fixed starter quantities',
    '',
    `Synthetic store: ${ITEM_COUNT} items, distributors every ${CYCLES.join(', ')} days, hidden Poisson demand, seed ${SEED}.`,
    'Stock-out = an item-day where demand was higher than stock. Leftover = units on the shelf when the salesperson comes, summed over visits in that week.',
    '',
    '| Week | Stock-out days, fixed | Stock-out days, learning | Leftover, fixed | Leftover, learning |',
    '|---|---|---|---|---|',
    ...rows,
    `| **Total** | **${sum(fixed, 'stockoutDays')}** | **${sum(learning, 'stockoutDays')}** | **${sum(fixed, 'leftover')}** | **${sum(learning, 'leftover')}** |`,
    '',
  ].join('\n');
}

function chart({ fixed, learning }) {
  const W = 640; const H = 360; const L = 56; const R = 20; const T = 40; const B = 50;
  const max = Math.max(...fixed.map((w) => w.stockoutDays), ...learning.map((w) => w.stockoutDays), 1);
  const x = (i) => L + (i * (W - L - R)) / (WEEKS - 1);
  const y = (v) => T + (H - T - B) * (1 - v / max);
  const line = (data, color) => `<polyline fill="none" stroke="${color}" stroke-width="3" points="${data.map((w, i) => `${x(i)},${y(w.stockoutDays)}`).join(' ')}"/>`;
  const ticks = fixed.map((_, i) => `<text x="${x(i)}" y="${H - B + 20}" font-size="12" text-anchor="middle">${i + 1}</text>`).join('');
  const yTicks = [0, 0.5, 1].map((f) => `<text x="${L - 8}" y="${y(max * f) + 4}" font-size="12" text-anchor="end">${Math.round(max * f)}</text>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" font-family="sans-serif">
<rect width="${W}" height="${H}" fill="#ffffff"/>
<text x="${W / 2}" y="24" font-size="16" font-weight="bold" text-anchor="middle">Stock-out days per week: learning vs fixed quantities</text>
<line x1="${L}" y1="${H - B}" x2="${W - R}" y2="${H - B}" stroke="#444"/><line x1="${L}" y1="${T}" x2="${L}" y2="${H - B}" stroke="#444"/>
${ticks}${yTicks}
${line(fixed, '#c0392b')}${line(learning, '#1e8449')}
<text x="${W / 2}" y="${H - 10}" font-size="13" text-anchor="middle">Week</text>
<rect x="${W - 210}" y="${T}" width="14" height="14" fill="#c0392b"/><text x="${W - 190}" y="${T + 12}" font-size="13">Fixed starter quantities</text>
<rect x="${W - 210}" y="${T + 22}" width="14" height="14" fill="#1e8449"/><text x="${W - 190}" y="${T + 34}" font-size="13">Learning rule</text>
</svg>
`;
}

function main() {
  const result = simulate();
  const dir = new URL('.', import.meta.url);
  fs.writeFileSync(new URL('sim-table.md', dir), table(result));
  fs.writeFileSync(new URL('sim-chart.svg', dir), chart(result));
  console.log(table(result));
  const { fixed, learning } = result;
  // Weekly counts are noisy (one week can flip), so the bar is the running total from week 6 on.
  const tail = (arr, from) => arr.slice(from - 1).reduce((s, w) => s + w.stockoutDays, 0);
  const beats = [6, 8, 10, WEEKS].every((from) => tail(learning, from) <= tail(fixed, from));
  console.log(`Stock-out days, weeks 6-${WEEKS}: learning ${tail(learning, 6)} vs fixed ${tail(fixed, 6)}`);
  console.log(`Learning total <= fixed total from week 6, 8, 10 and ${WEEKS} on: ${beats ? 'YES' : 'NO'}`);
  if (!beats) process.exitCode = 1;
}

if (import.meta.url === `file://${process.argv[1]}`) main();
