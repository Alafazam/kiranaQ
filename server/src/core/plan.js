// Group item results into one card per distributor. Pure. Owner: Lane A.

const STATUS_BUCKET = { runs_out: 'runs_out', order: 'order', ok: 'enough', no_history: 'first_log' };

function emptyCard(distributor) {
  return { distributor, runs_out: [], order: [], enough: [], first_log: [], confirmed: false, visit_recorded: false };
}

function hasFinalQty(line) {
  return line.final_qty !== null && line.final_qty !== undefined;
}

function finishCard(card) {
  const orderable = [...card.runs_out, ...card.order];
  card.confirmed = orderable.length > 0 && orderable.every(hasFinalQty);
  const allLines = [...orderable, ...card.enough, ...card.first_log];
  card.visit_recorded = Boolean(card.distributor?.visit_recorded) || allLines.some((l) => l.visit_recorded);
  return card;
}

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
  const cards = new Map(distributors.map((d) => [d.id, emptyCard(d)]));
  const noDistributor = emptyCard(null);
  for (const line of lines) {
    const card = line.distributor_id === null || line.distributor_id === undefined
      ? noDistributor
      : cards.get(line.distributor_id);
    if (!card) throw new Error(`line for unknown distributor ${line.distributor_id}`);
    card[STATUS_BUCKET[line.status]].push(line);
  }
  const sorted = [...cards.values()]
    .filter((card) => card.runs_out.length + card.order.length + card.enough.length + card.first_log.length > 0)
    .sort((a, b) => a.distributor.next_visit_date.localeCompare(b.distributor.next_visit_date)
      || a.distributor.id - b.distributor.id);
  const hasNoDistributorLines = noDistributor.runs_out.length + noDistributor.order.length
    + noDistributor.enough.length + noDistributor.first_log.length > 0;
  if (hasNoDistributorLines) sorted.push(noDistributor);
  return sorted.map(finishCard);
}
