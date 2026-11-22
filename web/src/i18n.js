// All UI text, English and Hindi. t(key, args) fills {name} slots.
// The `reasons` block has one template per key in server/src/core/reasons.js.
import { createContext, useContext } from 'react'

// Day and month names are English in every language (Hinglish style, Alaf's choice).
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export const dict = {
  en: {
    app: 'KiranaQ',
    home: 'Home', orders: 'Orders', settings: 'Settings',
    take_log: 'Take stock log',
    next_visits: 'Next visits', stock_logs: 'Stock logs', distributor_visits: 'Distributor visits', see_all: 'See all',
    last_visit_on: 'Last visit {date}', runs_out_before: 'Runs out before this visit', no_runs_out: 'Nothing runs out before this visit',
    today: 'Today', in_days: 'in {n} days', in_one_day: 'tomorrow', on_day: 'today',
    items_n: '{n} items', runs_out_n: '{n} run out', runs_out_1: '1 runs out',
    no_dist_title: 'No distributors yet', no_dist_body: 'Add the distributors who visit your shop.', add_distributor: 'Add distributor',
    empty_logs_title: 'No stock logs yet',
    empty_logs_body: 'Take your first stock log. Two logs are needed to learn how fast items sell.',
    error_title: 'Could not load', error_body: 'Check the connection and try again.', retry: 'Try again',
    step_photo: 'Photo', step_check: 'Check', step_result: 'Result',
    take_photo: 'Take a photo', use_sample: 'Use a sample photo', pick_sample: 'Pick a sample photo',
    photos_max: 'Up to {n} photos', remove_photo: 'Remove photo', photo_removed: 'Photo removed', undo: 'Undo',
    box_hint: 'Drag the corners over the shelf part that faces the camera. Only items inside the box are counted.',
    counted_in_box: 'Counted inside the box only', count_box: 'Count box', samples_failed: 'Could not load sample photos.',
    count_without_photo: 'Count without photo', count_items: 'Count items', counting: 'Counting items…',
    vision_failed: 'Could not count from photo. Count by voice or tap.',
    discard_title: 'Discard this log?', discard_body: 'The counts you made will be lost.', discard: 'Discard', keep: 'Keep',
    items_found: '{n} items found', not_sure: 'Not sure', add_item: 'Add item', pick_item: 'Pick an item',
    item_removed: 'Item removed', remove_item: 'Remove item',
    hold_to_speak: 'Hold to speak', listening: 'Listening… release to stop', mic_blocked: 'Mic blocked: type instead',
    hearing: 'Understanding…', type_instead: 'Or type: Maggi 8, Surf 5', apply_text: 'Apply',
    i_heard: 'I heard: {text}', yes_apply: 'Yes, apply', no_retry: 'No, try again', say_again: 'Please say it again',
    no_changes: 'No count changed.', stt_failed: 'Could not hear that. Type instead.',
    save_log: 'Save log', saving: 'Saving…', read_out: 'Read out', copy_list: 'Copy list', copied: 'List copied',
    visit_q: 'Did {name} deliver today?', yes_delivered: 'Yes, delivered', no: 'No',
    next_visit: 'Next visit {date}', every_n: 'every {n} days', in_n_every: '{when}, every {n} days',
    runs_out_first: 'Runs out first', order_on: 'Order on {day}', order: 'Order', enough: 'Enough', first_log: 'First log',
    days_left: '{n} days left', day_left: '1 day left', no_runout: 'Does not run out',
    confirm_order: 'Confirm {name} order', ordered_on: 'Ordered {date}', not_confirmed: 'Not confirmed', delivered_on: 'Delivered {date}',
    not_counted: '{n} items not counted', not_counted_1: '1 item not counted', no_distributor: 'No distributor', set_distributor: 'Set a distributor in Settings',
    orders_empty_title: 'No orders yet', orders_empty_body: 'Take a stock log to see what to order from each distributor.',
    past_log: 'Stock log', counts: 'Counts', see_result: 'See result',
    distributors: 'Distributors', items: 'Items', language: 'Language', theme: 'Theme',
    theme_system: 'System', theme_light: 'Light', theme_dark: 'Dark', about: 'About', version: 'Version {v}',
    synthetic: 'Synthetic data only', name: 'Name', cycle_days: 'Visit every (days)', last_visit: 'Last visit', note: 'Note',
    save: 'Save', saved: 'Saved', save_failed: 'Could not save. Try again.', active: 'Active', distributor: 'Distributor',
    back: 'Back', close: 'Close', tts_failed: 'Could not play audio. Read the list on screen.',
    case_n: '{n} cases', case_1: '1 case',
  },
  hi: {
    app: 'किरानाQ',
    home: 'होम', orders: 'ऑर्डर', settings: 'सेटिंग',
    take_log: 'स्टॉक गिनें',
    next_visits: 'Distributor kab aayenge', stock_logs: 'Saman kab kab aya', distributor_visits: 'Distributor kab aayenge', see_all: 'सब देखें',
    last_visit_on: 'पिछली विज़िट {date}', runs_out_before: 'इस विज़िट से पहले खत्म होगा', no_runs_out: 'इस विज़िट से पहले कुछ खत्म नहीं होगा',
    today: 'आज', in_days: '{n} दिन में', in_one_day: 'कल', on_day: 'आज',
    items_n: '{n} आइटम', runs_out_n: '{n} khatm honge', runs_out_1: '1 khatm hoga',
    no_dist_title: 'अभी कोई वितरक नहीं', no_dist_body: 'जो वितरक आपकी दुकान आते हैं, उन्हें जोड़ें।', add_distributor: 'वितरक जोड़ें',
    empty_logs_title: 'अभी कोई स्टॉक लॉग नहीं',
    empty_logs_body: 'पहला स्टॉक लॉग लें। बिक्री की रफ़्तार जानने के लिए दो लॉग चाहिए।',
    error_title: 'लोड नहीं हुआ', error_body: 'कनेक्शन देखें और फिर कोशिश करें।', retry: 'फिर कोशिश करें',
    step_photo: 'फ़ोटो', step_check: 'जाँच', step_result: 'नतीजा',
    take_photo: 'फ़ोटो लें', use_sample: 'नमूना फ़ोटो लें', pick_sample: 'नमूना फ़ोटो चुनें',
    photos_max: 'ज़्यादा से ज़्यादा {n} फ़ोटो', remove_photo: 'फ़ोटो हटाएँ', photo_removed: 'फ़ोटो हटाई', undo: 'वापस लें',
    box_hint: 'कोने खींचकर बॉक्स को शेल्फ़ के सामने वाले हिस्से पर रखें। सिर्फ़ बॉक्स के अंदर के आइटम गिने जाएँगे।',
    counted_in_box: 'सिर्फ़ बॉक्स के अंदर गिना', count_box: 'गिनती बॉक्स', samples_failed: 'नमूना फ़ोटो लोड नहीं हुईं।',
    count_without_photo: 'बिना फ़ोटो गिनें', count_items: 'आइटम गिनें', counting: 'आइटम गिने जा रहे हैं…',
    vision_failed: 'फ़ोटो से गिनती नहीं हुई। बोलकर या दबाकर गिनें।',
    discard_title: 'यह लॉग छोड़ दें?', discard_body: 'आपकी गिनती मिट जाएगी।', discard: 'छोड़ें', keep: 'रखें',
    items_found: '{n} आइटम मिले', not_sure: 'पक्का नहीं', add_item: 'आइटम जोड़ें', pick_item: 'आइटम चुनें',
    item_removed: 'आइटम हटाया', remove_item: 'आइटम हटाएँ',
    hold_to_speak: 'दबाकर बोलें', listening: 'सुन रहे हैं… छोड़ें तो रुकेगा', mic_blocked: 'माइक बंद है: लिखें',
    hearing: 'समझ रहे हैं…', type_instead: 'या लिखें: मैगी 8, सर्फ 5', apply_text: 'लागू करें',
    i_heard: 'मैंने सुना: {text}', yes_apply: 'हाँ, लागू करें', no_retry: 'नहीं, फिर से', say_again: 'कृपया फिर से बोलें',
    no_changes: 'कोई गिनती नहीं बदली।', stt_failed: 'सुनाई नहीं दिया। लिखकर बताएँ।',
    save_log: 'लॉग सेव करें', saving: 'सेव हो रहा है…', read_out: 'सुनाएँ', copy_list: 'लिस्ट कॉपी करें', copied: 'लिस्ट कॉपी हुई',
    visit_q: 'क्या {name} ने आज माल दिया?', yes_delivered: 'हाँ, दिया', no: 'नहीं',
    next_visit: 'अगली विज़िट {date}', every_n: 'हर {n} दिन', in_n_every: '{when}, हर {n} दिन',
    runs_out_first: 'पहले खत्म होगा', order_on: '{day} को ऑर्डर', order: 'ऑर्डर', enough: 'काफ़ी है', first_log: 'पहला लॉग',
    days_left: '{n} दिन बचे', day_left: '1 दिन बचा', no_runout: 'खत्म नहीं होगा',
    confirm_order: '{name} ऑर्डर पक्का करें', ordered_on: 'ऑर्डर {date}', not_confirmed: 'पक्का नहीं', delivered_on: 'मिला {date}',
    not_counted: '{n} आइटम नहीं गिने', not_counted_1: '1 आइटम नहीं गिना', no_distributor: 'कोई वितरक नहीं', set_distributor: 'सेटिंग में वितरक चुनें',
    orders_empty_title: 'अभी कोई ऑर्डर नहीं', orders_empty_body: 'हर वितरक का ऑर्डर देखने के लिए स्टॉक लॉग लें।',
    past_log: 'स्टॉक लॉग', counts: 'गिनती', see_result: 'नतीजा देखें',
    distributors: 'वितरक', items: 'आइटम', language: 'भाषा', theme: 'थीम',
    theme_system: 'सिस्टम', theme_light: 'हल्का', theme_dark: 'गहरा', about: 'जानकारी', version: 'वर्ज़न {v}',
    synthetic: 'सिर्फ़ नकली डेटा', name: 'नाम', cycle_days: 'हर कितने दिन आते हैं', last_visit: 'पिछली विज़िट', note: 'नोट',
    save: 'सेव करें', saved: 'सेव हुआ', save_failed: 'सेव नहीं हुआ। फिर कोशिश करें।', active: 'चालू', distributor: 'वितरक',
    back: 'पीछे', close: 'बंद करें', tts_failed: 'आवाज़ नहीं चली। स्क्रीन पर लिस्ट पढ़ें।',
    case_n: '{n} पेटी', case_1: '1 पेटी',
  },
}

export const reasons = {
  en: {
    no_history: 'First log. One more is needed.',
    runs_out_before_visit: 'Runs out in {days_of_cover} days. {distributor} comes in {days_to_next_visit} days. Call early.',
    ran_out_last_time: 'Ran out last time. {rate_per_day} a day. Order {suggested_qty} from {distributor} on {next_visit_date}.',
    order_needed: '{rate_per_day} a day, {days_of_cover} days left. Order {suggested_qty} from {distributor} on {next_visit_date}.',
    no_order_needed: '{days_of_cover} days left. Enough until {distributor} comes on {next_visit_date}.',
  },
  hi: {
    no_history: 'पहला लॉग। एक और लॉग चाहिए।',
    runs_out_before_visit: '{days_of_cover} दिन में खत्म होगा। {distributor} {days_to_next_visit} दिन में आएँगे। पहले फ़ोन करें।',
    ran_out_last_time: 'पिछली बार खत्म हो गया था। रोज़ {rate_per_day}। {next_visit_date} को {distributor} से {suggested_qty} मँगाएँ।',
    order_needed: 'रोज़ {rate_per_day}, {days_of_cover} दिन बचे। {next_visit_date} को {distributor} से {suggested_qty} मँगाएँ।',
    no_order_needed: '{days_of_cover} दिन बचे। {next_visit_date} को {distributor} के आने तक काफ़ी है।',
  },
}

function fill(template, args = {}) {
  return template.replace(/\{(\w+)\}/g, (_, k) => (args[k] ?? `{${k}}`))
}

export function parseDate(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function formatDate(iso, withDay = false) {
  if (!iso) return ''
  const dt = parseDate(iso)
  const base = `${dt.getDate()} ${MONTHS[dt.getMonth()]}`
  return withDay ? `${DAYS[dt.getDay()]}, ${base}` : base
}

export function dayName(iso) {
  if (!iso) return ''
  return DAYS[parseDate(iso).getDay()]
}

function roundNum(v) {
  return typeof v === 'number' ? String(Math.round(v * 10) / 10) : v
}

export function makeT(lang) {
  const table = dict[lang] || dict.en
  const t = (key, args) => fill(table[key] ?? dict.en[key] ?? key, args)
  t.lang = lang
  t.reason = (key, args = {}) => {
    const tpl = (reasons[lang] || reasons.en)[key] ?? reasons.en[key]
    if (!tpl) return ''
    const shown = {}
    for (const [k, v] of Object.entries(args)) {
      shown[k] = k === 'next_visit_date' ? formatDate(v, true) : roundNum(v)
    }
    return fill(tpl, shown)
  }
  t.runsOut = (n) => (n === 1 ? table.runs_out_1 ?? dict.en.runs_out_1 : fill(table.runs_out_n, { n }))
  t.when = (days) => (days <= 0 ? table.on_day : days === 1 ? table.in_one_day : fill(table.in_days, { n: days }))
  t.date = (iso, withDay) => formatDate(iso, withDay)
  t.day = (iso) => dayName(iso)
  t.itemName = (it) => (lang === 'hi' ? it.name_hi || it.name_en : it.name_en)
  return t
}

export const LangContext = createContext({ lang: 'en', setLang: () => {}, t: makeT('en') })
export const useT = () => useContext(LangContext).t
export const useLang = () => useContext(LangContext)
