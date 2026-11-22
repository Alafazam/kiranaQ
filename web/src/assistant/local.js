// Local fallback when /api/assist is missing or fails (spec R8). Keyword rules only, no model.
// Returns the same shape as /api/assist: {say, actions, expect, options?}.
import { api } from '../api.js'

const has = (text, words) => words.some((w) => text.includes(w))
const YES = ['haan', 'han', 'ha ', 'yes', 'ok', 'theek', 'thik', 'हाँ', 'हां', 'जी', 'ठीक', 'kar do', 'करो', 'karo']
const NO = ['nahi', 'nahin', 'no', 'mat', 'नहीं', 'मत', 'cancel']
const HINDI_NAMES = { 'शर्मा': 'sharma', 'गुप्ता': 'gupta', 'मेहता': 'mehta' }
const ORDINALS = [['pehli', 'पहली', 'first', 'ek', 'one', '1'], ['doosri', 'dusri', 'दूसरी', 'second', 'do', 'two', '2'], ['teesri', 'tisri', 'तीसरी', 'third', 'teen', 'three', '3']]

export const isYes = (t) => has(` ${t.toLowerCase()} `, YES) && !isNo(t)
export const isNo = (t) => has(` ${t.toLowerCase()} `, NO)

function findDistributor(text, list) {
  let t = text.toLowerCase()
  for (const [hi, en] of Object.entries(HINDI_NAMES)) t = t.replace(hi, en)
  return (list || []).find((d) => t.includes(d.name.toLowerCase().split(' ')[0]))
}

function lines(t, key, args) { return t(key, args) }

export async function localAssist({ text, lang, screen, context, t }) {
  const raw = text.trim()
  const low = ` ${raw.toLowerCase()} `
  const dists = context.distributors || context.cards?.map((c) => ({ id: c.distributor_id, name: c.name, next_visit_date: c.next_visit_date, days_to_next_visit: c.days_to_next_visit })) || []
  const dist = findDistributor(raw, dists)

  if (has(low, ['english', 'अंग्रेज़ी', 'अंग्रेजी', 'angrezi'])) return { say: 'OK, English.', actions: [{ type: 'set_language', lang: 'en' }], expect: 'done' }
  if (has(low, ['hindi', 'हिंदी', 'हिन्दी'])) return { say: 'ठीक है, हिंदी।', actions: [{ type: 'set_language', lang: 'hi' }], expect: 'done' }

  if (dist && has(low, ['pakka', 'पक्का', 'confirm', 'kar do'])) {
    return { say: lines(t, 'assist_confirm_order_q', { name: dist.name }), actions: [{ type: 'confirm_order', distributor_id: dist.id }], expect: 'confirm' }
  }
  if (dist && has(low, ['suna', 'सुना', 'read', 'bol'])) {
    return { say: lines(t, 'assist_reading', { name: dist.name }), actions: [{ type: 'read_out', distributor_id: dist.id }], expect: 'done' }
  }
  if (has(low, ['kab', 'कब', 'aayega', 'aayenge', 'आएंगे', 'आएगा', 'visit', 'distributor', 'डिस्ट्रीब्यूटर'])) {
    const say = dist
      ? lines(t, 'assist_dist_when', { name: dist.name, date: t.date(dist.next_visit_date, true), when: t.when(dist.days_to_next_visit) })
      : lines(t, 'assist_dist_list')
    return { say, actions: [{ type: 'navigate', to: 'distributors' }], expect: 'done' }
  }
  if (has(low, ['sample', 'नमूना', 'namuna', 'सैंपल'])) {
    const index = Math.max(0, ORDINALS.findIndex((words) => has(low, words.map((w) => ` ${w} `))))
    return { say: lines(t, 'assist_counting'), actions: [{ type: 'use_sample', index }, { type: 'count_photo' }], expect: 'done' }
  }
  if (has(low, ['bina photo', 'बिना', 'without photo', 'khud', 'खुद'])) {
    return { say: lines(t, 'assist_manual'), actions: [{ type: 'count_manual' }], expect: 'answer' }
  }
  if (has(low, ['save', 'सेव', 'ho gaya', 'हो गया', 'done', ' bas '])) {
    return { say: lines(t, 'assist_save_q'), actions: [{ type: 'save_log' }], expect: 'confirm' }
  }
  if (has(low, ['stock', 'स्टॉक', 'ginn', 'गिन', 'naya log', 'new log', 'count'])) {
    return { say: lines(t, 'assist_photo_q'), actions: [{ type: 'start_log' }], expect: 'answer', options: [t('use_sample'), t('count_without_photo')] }
  }
  if (has(low, ['order', 'ऑर्डर', 'mangana', 'मंगाना', 'मँगाना', 'kya lana', 'क्या लाना'])) {
    return { say: lines(t, 'assist_orders'), actions: [{ type: 'navigate', to: 'orders' }], expect: 'answer', options: dists.slice(0, 3).map((d) => t('assist_opt_confirm', { name: d.name.split(' ')[0] })) }
  }
  if (has(low, ['home', 'होम', 'shuru', 'शुरू'])) return { say: lines(t, 'assist_greet_home'), actions: [{ type: 'navigate', to: 'home' }], expect: 'answer' }
  if (has(low, ['setting', 'सेटिंग'])) return { say: 'OK.', actions: [{ type: 'navigate', to: 'settings' }], expect: 'done' }

  // Counts: on the Check screen (or with a draft), use the count parser.
  if (screen === '/log/new/check' && /\d|एक|दो|तीन|चार|पांच|पाँच|छह|सात|आठ|नौ|दस/.test(raw)) {
    try {
      const res = await api.parse({ text: raw, lang, draft: context.draft || [] })
      if (res.edits?.length && !res.unclear) return { say: lines(t, 'assist_counts_done'), actions: [{ type: 'set_counts', edits: res.edits }], expect: 'answer' }
      return { say: res.ask || lines(t, 'say_again'), actions: [], expect: 'answer' }
    } catch (e) {
      console.error('assistant: parse failed', e)
    }
  }
  return { say: lines(t, 'assist_unclear'), actions: [], expect: 'answer', options: [t('take_log'), t('orders'), t('distributors_tab')] }
}
