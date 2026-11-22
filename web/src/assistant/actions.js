// The closed list of actions the assistant may run (spec 2026-11-22-voice-assistant, section 5).
// Writes change stored data and run only after the owner says or taps Yes.
export const ACTION_TYPES = [
  'navigate', 'start_log', 'use_sample', 'count_photo', 'count_manual', 'set_counts',
  'save_log', 'visit', 'confirm_order', 'set_qty', 'read_out', 'set_language',
]
export const WRITE_TYPES = new Set(['save_log', 'visit', 'confirm_order'])
export const NAV_TARGETS = { home: '/', orders: '/orders', distributors: '/distributors', settings: '/settings' }

// The screen where an action's handler lives, when it is not on the current one.
export const ACTION_SCREEN = {
  use_sample: '/log/new', count_photo: '/log/new', count_manual: '/log/new',
  set_counts: '/log/new/check', save_log: '/log/new/check',
  confirm_order: '/orders', set_qty: '/orders', read_out: '/orders',
}

export const MAX_TEXT_CHARS = 500
export const MAX_HISTORY_TURNS = 6

export function cleanActions(actions) {
  const out = []
  for (const a of Array.isArray(actions) ? actions : []) {
    if (a && ACTION_TYPES.includes(a.type)) out.push(a)
    else console.warn('assistant: ignored unknown action', a)
  }
  return out
}
