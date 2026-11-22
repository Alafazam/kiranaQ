// E5: restock detection on 10 synthetic before/after pairs (6 deliveries, 4 count noise).
// Bar: 6/6 deliveries asked about the right distributor, at most 1 false question.
import fs from 'node:fs';
import { findDeliveryCandidates } from '../../server/src/core/restock.js';

const MAX_FALSE_QUESTIONS = 1;
const pairs = JSON.parse(fs.readFileSync(new URL('pairs.json', import.meta.url), 'utf8'));

let asked = 0;
let deliveries = 0;
let falseQuestions = 0;
for (const pair of pairs) {
  const found = findDeliveryCandidates([pair.row]);
  const questioned = found.length === 1 && found[0].distributor_id === pair.row.distributor_id;
  if (pair.delivery) { deliveries += 1; if (questioned) asked += 1; }
  else if (found.length > 0) falseQuestions += 1;
  console.log(`${questioned ? 'ASK ' : 'skip'}  ${pair.delivery ? 'delivery' : 'noise   '}  ${pair.name}`);
}
console.log(`\nDeliveries asked: ${asked}/${deliveries}. False questions: ${falseQuestions}/${pairs.length - deliveries}.`);
const pass = asked === deliveries && falseQuestions <= MAX_FALSE_QUESTIONS;
console.log(pass ? 'PASS' : 'FAIL');
if (!pass) process.exitCode = 1;
