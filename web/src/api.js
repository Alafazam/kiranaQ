// API client. VITE_USE_MOCK=1 serves the JSON in ./mock so screens work before the server.
// Errors throw ApiError with the server's {error:{code,message}} when given.
import mockStore from './mock/store.json'
import mockDistributors from './mock/distributors.json'
import mockItems from './mock/items.json'
import mockLogs from './mock/logs.json'
import mockResult from './mock/result.json'

export const USE_MOCK = import.meta.env.VITE_USE_MOCK === '1'
const MOCK_DELAY_MS = 350
// A request that never answers must end in the error state, not an endless skeleton.
// Longer than the server's model timeout so vision and parse can finish.
const REQUEST_TIMEOUT_MS = 45000

export class ApiError extends Error {
  constructor(status, code, message) {
    super(message || code || `HTTP ${status}`)
    this.status = status
    this.code = code
  }
}

async function request(path, { method = 'GET', json, form, raw } = {}) {
  const opts = { method, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) }
  if (json !== undefined) {
    opts.headers = { 'Content-Type': 'application/json' }
    opts.body = JSON.stringify(json)
  } else if (form) {
    opts.body = form
  }
  let res
  try {
    res = await fetch(`/api${path}`, opts)
  } catch (e) {
    console.error(`API ${method} ${path} failed`, e)
    throw new ApiError(0, e.name === 'TimeoutError' ? 'timeout' : 'network', e.message)
  }
  if (!res.ok) {
    let code, message
    try { const b = await res.json(); code = b?.error?.code; message = b?.error?.message } catch { /* not JSON */ }
    throw new ApiError(res.status, code, message)
  }
  return raw ? res.blob() : res.json()
}

// ---- mock state (in memory, per page load) ----
const clone = (x) => JSON.parse(JSON.stringify(x))
const mock = {
  store: clone(mockStore),
  distributors: clone(mockDistributors),
  items: clone(mockItems),
  logs: clone(mockLogs),
  results: { 4: clone(mockResult) },
}
const wait = (v) => new Promise((r) => setTimeout(() => r(clone(v)), MOCK_DELAY_MS))
function mockCounts(logId) {
  const r = mock.results[logId] || mock.results[4]
  return r.cards.flatMap((c) => [...c.runs_out, ...c.order, ...c.enough, ...(c.first_log || c.no_history || [])])
    .map((l) => ({ item_id: l.item_id, count: l.count, source: 'photo', vision_count: l.count, vision_confidence: 0.9 }))
}
// A rough word match so the mock parser can answer "maggi 8, surf 5".
function mockParse(text, lang, draft) {
  const edits = []
  for (const part of text.split(/[,;]| and | और /i)) {
    const m = part.match(/(.+?)\s+(\d+)/)
    if (!m) continue
    const word = m[1].trim().toLowerCase()
    const item = mock.items.find((it) => it.aliases.some((a) => word.includes(a.toLowerCase())) || it.name_en.toLowerCase().includes(word))
    if (item) edits.push({ item_id: item.id, count: Number(m[2]) })
  }
  return edits.length ? { edits, unclear: false } : { edits: [], unclear: true, ask: 'Please say it again' }
}

const real = {
  store: () => request('/store'),
  setLanguage: (language) => request('/store', { method: 'PUT', json: { language } }),
  distributors: () => request('/distributors'),
  updateDistributor: (id, body) => request(`/distributors/${id}`, { method: 'PUT', json: body }),
  items: () => request('/items'),
  updateItem: (id, body) => request(`/items/${id}`, { method: 'PUT', json: body }),
  logs: () => request('/logs'),
  log: (id) => request(`/logs/${id}`),
  createLog: (body) => request('/logs', { method: 'POST', json: body }),
  result: (id) => request(`/logs/${id}/result`),
  latestOrders: () => request('/orders/latest'),
  confirmOrder: (id, body) => request(`/logs/${id}/order`, { method: 'PUT', json: body }),
  recordVisit: (id, body) => request(`/logs/${id}/visits`, { method: 'POST', json: body }),
  vision: (blobs) => {
    const form = new FormData()
    blobs.forEach((b, i) => form.append('images', b, `photo-${i + 1}.jpg`))
    return request('/vision', { method: 'POST', form })
  },
  stt: (blob, lang) => {
    const form = new FormData()
    form.append('audio', blob, blob.type.includes('mp4') ? 'clip.mp4' : 'clip.webm')
    form.append('lang', lang)
    return request('/stt', { method: 'POST', form })
  },
  parse: (body) => request('/parse', { method: 'POST', json: body }),
  tts: (text, lang) => request('/tts', { method: 'POST', json: { text, lang }, raw: true }),
  assist: (body) => request('/assist', { method: 'POST', json: body }),
}

const fake = {
  store: () => wait(mock.store),
  setLanguage: (language) => { mock.store.language = language; return wait(mock.store) },
  distributors: () => wait(mock.distributors),
  updateDistributor: (id, body) => {
    const d = mock.distributors.find((x) => x.id === id)
    Object.assign(d, body)
    return wait(d)
  },
  items: () => wait(mock.items),
  updateItem: (id, body) => {
    const it = mock.items.find((x) => x.id === id)
    Object.assign(it, body)
    return wait(it)
  },
  logs: () => wait(mock.logs),
  log: (id) => {
    const log = mock.logs.find((l) => l.id === Number(id)) || mock.logs[0]
    return wait({ log, counts: mockCounts(id), cards: (mock.results[id] || mock.results[4]).cards })
  },
  createLog: (body) => {
    const id = Math.max(...mock.logs.map((l) => l.id)) + 1
    const result = clone(mockResult)
    result.log_id = id
    result.not_counted = Math.max(0, mock.items.length - body.counts.length)
    result.delivery_candidates = [{ distributor_id: 1, name: 'Sharma Traders', items: [
      { item_id: 1, name_en: 'Maggi Noodles 70g', name_hi: 'मैगी नूडल्स 70 ग्राम', rise: 12 },
      { item_id: 9, name_en: 'Rin Bar', name_hi: 'रिन साबुन', rise: 4 },
    ] }]
    mock.results[id] = result
    mock.logs.unshift({ id, log_date: result.log_date, item_count: body.counts.length, runs_out_count: 1, visits: [] })
    return wait(result)
  },
  result: (id) => wait(mock.results[id] || { ...mock.results[4], log_id: Number(id) }),
  latestOrders: () => {
    const id = mock.logs[0]?.id
    return wait(id ? (mock.results[id] || mock.results[4]) : { cards: [] })
  },
  confirmOrder: (id, { distributor_id, lines }) => {
    const r = mock.results[id] || mock.results[4]
    const card = r.cards.find((c) => c.distributor?.id === distributor_id)
    for (const l of [...card.runs_out, ...card.order]) {
      const f = lines.find((x) => x.item_id === l.item_id)
      if (f) l.final_qty = f.final_qty
    }
    card.confirmed = true
    return wait(r)
  },
  recordVisit: (id, { distributor_id, confirmed }) => {
    const r = mock.results[id] || mock.results[4]
    if (confirmed) {
      const log = mock.logs.find((l) => l.id === Number(id))
      const d = mock.distributors.find((x) => x.id === distributor_id)
      if (log && d && !log.visits.some((v) => v.distributor_id === distributor_id)) log.visits.push({ distributor_id, name: d.name })
      const card = r.cards.find((c) => c.distributor?.id === distributor_id)
      if (card) card.visit_recorded = true
    }
    return wait({ ...r, distributor: mock.distributors.find((x) => x.id === distributor_id) })
  },
  vision: () => wait({
    items: [
      { item_id: 1, count: 5, confidence: 0.92 }, { item_id: 3, count: 20, confidence: 0.55 },
      { item_id: 7, count: 1, confidence: 0.88 }, { item_id: 9, count: 30, confidence: 0.9 },
      { item_id: 4, count: 14, confidence: 0.81 }, { item_id: 6, count: 3, confidence: 0.86 },
    ],
    dropped: 0,
  }),
  stt: () => wait({ text: 'Maggi 8, Surf 5', transcript: 'Maggi 8, Surf 5', languageCode: 'en-IN' }),
  parse: ({ text, lang, draft }) => wait(mockParse(text, lang, draft)),
  tts: () => Promise.reject(new ApiError(502, 'tts_failed', 'mock has no audio')),
  // No model in mock mode: the assistant uses its local matcher (assistant/local.js).
  assist: () => Promise.reject(new ApiError(404, 'not_found', 'mock has no assistant')),
}

export const api = USE_MOCK ? fake : real
