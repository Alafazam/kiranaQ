// Reason line keys. The rule emits a key and args; the web app builds the sentence
// in the owner's language from web/src/i18n.js (every key needs en and hi).

export const REASON_KEYS = {
  no_history: [],                                                      // "First log. One more is needed."
  runs_out_before_visit: ['days_of_cover', 'distributor', 'days_to_next_visit', 'days_out'],
  ran_out_last_time: ['rate_per_day', 'suggested_qty', 'distributor', 'next_visit_date'],
  order_needed: ['rate_per_day', 'days_of_cover', 'suggested_qty', 'distributor', 'next_visit_date'],
  no_order_needed: ['days_of_cover', 'distributor', 'next_visit_date'],
};

export const REASON_KEY_LIST = Object.keys(REASON_KEYS);
