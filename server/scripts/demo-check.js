// Demo check (spec 5.3): runs the demo story against the real app with the fake AI. No keys, no network.
// seed -> today log -> Sharma card: Surf runs out, Maggi has an order -> confirm Sharma order
// -> same-day restock log -> Sharma delivery candidate, rates unchanged -> confirm -> Sharma next visit = today + cycle.
// Exit code 0 only when every step matches.
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { initDb } from '../src/db.js';
import { createApp } from '../src/app.js';
import { createClock, fixedClock } from '../src/clock.js';
import { createFakeAi } from '../src/ai/fake.js';
import { seedIfEmpty } from './seed.js';
import { addDays } from '../src/repo/dates.js';

const DEMO_DIR = new URL('../../evals/demo/', import.meta.url);
const SHARMA = 'Sharma Traders';
const SURF = 'surf_excel_1kg';
const MAGGI = 'maggi_70g';

const results = [];
function check(name, ok, detail = '') {
  results.push(ok);
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? `  (${detail})` : ''}`);
}

function readDemo(file) {
  return JSON.parse(fs.readFileSync(fileURLToPath(new URL(file, DEMO_DIR)), 'utf8'));
}

function findLine(cards, itemId) {
  for (const card of cards) {
    for (const bucket of ['runs_out', 'order', 'enough', 'first_log']) {
      const line = card[bucket].find((l) => l.item_id === itemId);
      if (line) return { card, bucket, line };
    }
  }
  return null;
}

async function main() {
  process.env.NODE_ENV = 'test';
  const today = createClock().today();
  const clock = fixedClock(today);
  const db = initDb(':memory:');
  seedIfEmpty(db, clock);
  const server = createApp({ db, ai: createFakeAi(), clock }).listen(0);
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const call = async (method, path, body) => {
    const res = await fetch(`${base}${path}`, {
      method,
      headers: body ? { 'content-type': 'application/json' } : {},
      body: body ? JSON.stringify(body) : undefined,
    });
    return { status: res.status, body: await res.json() };
  };

  try {
    console.log(`demo:check for ${today}`);
    const items = (await call('GET', '/items')).body;
    const idOf = new Map(items.map((i) => [i.sku_key, i.id]));
    const toBody = (demo) => ({
      source: demo.source,
      photo_count: demo.photo_count,
      counts: demo.counts.map(({ sku_key, count }) => {
        if (!idOf.has(sku_key)) throw new Error(`demo file names unknown sku_key ${sku_key}`);
        return { item_id: idOf.get(sku_key), count, source: 'tap' };
      }),
    });
    const sharma = (await call('GET', '/distributors')).body.find((d) => d.name === SHARMA);
    check('seed has Sharma Traders', Boolean(sharma));
    check('seed has logs', (await call('GET', '/logs')).body.length > 0);

    // 1. Today's log.
    const todayLog = await call('POST', '/logs', toBody(readDemo('today-counts.json')));
    check('save today log', todayLog.status === 201, `status ${todayLog.status}`);
    const surf = findLine(todayLog.body.cards, idOf.get(SURF));
    check('Surf is in Sharma runs-out', surf?.bucket === 'runs_out' && surf.card.distributor?.name === SHARMA, `${surf?.bucket} on ${surf?.card.distributor?.name}`);
    const maggi = findLine(todayLog.body.cards, idOf.get(MAGGI));
    check('Maggi has an order quantity', maggi?.line.suggested_qty > 0, `${maggi?.bucket}, ${maggi?.line.suggested_qty} units`);
    check('Surf reason line', surf?.line.reason_key === 'runs_out_before_visit', surf?.line.reason_key);

    // 2. Confirm the Sharma order (accept every suggestion).
    const order = await call('PUT', `/logs/${todayLog.body.log_id}/order`, { distributor_id: sharma.id, lines: [] });
    const sharmaCard = order.body.cards?.find((c) => c.distributor?.id === sharma.id);
    check('confirm Sharma order', order.status === 200 && sharmaCard?.confirmed === true, `status ${order.status}`);

    // 3. Same-day restock log.
    const restock = await call('POST', '/logs', toBody(readDemo('after-restock.json')));
    check('save restock log', restock.status === 201, `status ${restock.status}`);
    const cand = restock.body.delivery_candidates?.find((c) => c.distributor_id === sharma.id);
    check('Sharma is a delivery candidate', Boolean(cand), cand ? cand.items.map((i) => `${i.name_en} +${i.rise}`).join(', ') : 'none');
    for (const [sku, before] of [[SURF, surf], [MAGGI, maggi]]) {
      const after = findLine(restock.body.cards, idOf.get(sku));
      check(`${sku} rate unchanged`, after?.line.rate_per_day === before?.line.rate_per_day, `${before?.line.rate_per_day} -> ${after?.line.rate_per_day}`);
    }

    // 4. Confirm the visit; next visit moves to today + cycle. Twice is safe.
    const visit = await call('POST', `/logs/${restock.body.log_id}/visits`, { distributor_id: sharma.id, confirmed: true });
    const expected = addDays(today, sharma.cycle_days);
    check('confirm visit', visit.status === 200, `status ${visit.status}`);
    check('Sharma next visit = today + cycle', visit.body.distributor?.next_visit_date === expected, `${visit.body.distributor?.next_visit_date} vs ${expected}`);
    const again = await call('POST', `/logs/${restock.body.log_id}/visits`, { distributor_id: sharma.id, confirmed: true });
    check('confirm twice gives the same result', JSON.stringify(again.body) === JSON.stringify(visit.body));
    const home = (await call('GET', '/logs')).body[0];
    check('Home shows the visit', home.visits.some((v) => v.distributor_id === sharma.id));
  } finally {
    server.close();
    db.close();
  }

  const failed = results.filter((ok) => !ok).length;
  console.log(failed === 0 ? `demo:check passed (${results.length} checks)` : `demo:check FAILED (${failed} of ${results.length})`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error('demo:check error:', err);
  process.exit(1);
});
