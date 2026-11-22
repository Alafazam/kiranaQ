// Voice assistant state: talk history, screen context, action handlers, confirm step.
// Screens call useAssistant({context, handlers}). Spec: specs/2026-11-22-voice-assistant.
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { api } from '../api.js'
import { useLang, useT } from '../i18n.js'
import { playBlob } from '../voice.js'
import { ACTION_SCREEN, MAX_HISTORY_TURNS, MAX_TEXT_CHARS, NAV_TARGETS, WRITE_TYPES, cleanActions, screenName, SERVER_ASK_AGAIN } from './actions.js'
import { isNo, isYes, localAssist } from './local.js'

const HANDLER_WAIT_MS = 3000
const HANDLER_POLL_MS = 100
const SETTLE_MS = 60
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const AssistantContext = createContext(null)
export const useAssistantState = () => useContext(AssistantContext)

// Screen hook: publish context and register handlers while mounted.
// Handler keys: an action type ("save_log"), or type plus distributor id ("confirm_order:2").
export function useAssistant({ context, handlers } = {}) {
  const a = useContext(AssistantContext)
  const handlersRef = useRef(handlers)
  handlersRef.current = handlers
  const ctxJson = JSON.stringify(context ?? null)
  useEffect(() => {
    if (!a || !context) return undefined
    return a.publish(context)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctxJson])
  const keys = Object.keys(handlers || {}).join(',')
  useEffect(() => {
    if (!a || !keys) return undefined
    return a.register(keys.split(','), handlersRef)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keys])
  return a
}

export function AssistantProvider({ children }) {
  const t = useT()
  const { lang, setLang } = useLang()
  const navigate = useNavigate()
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([]) // {role, text, options?}
  const [busy, setBusy] = useState(false)
  const [pending, setPending] = useState(null) // {yes: actions, no: actions}
  const contexts = useRef(new Map())
  const handlers = useRef(new Map()) // key -> ref of handler object
  const routeRef = useRef(location.pathname)
  routeRef.current = location.pathname
  const openRef = useRef(open)
  openRef.current = open
  const messagesRef = useRef(messages)
  messagesRef.current = messages

  const publish = useCallback((ctx) => {
    const id = Symbol('ctx')
    contexts.current.set(id, ctx)
    return () => contexts.current.delete(id)
  }, [])
  const register = useCallback((keys, ref) => {
    for (const k of keys) handlers.current.set(k, ref)
    return () => { for (const k of keys) if (handlers.current.get(k) === ref) handlers.current.delete(k) }
  }, [])
  const context = () => Object.assign({}, ...contexts.current.values())

  const speak = useCallback(async (text) => {
    try {
      await playBlob(await api.tts(text, lang))
    } catch (e) {
      console.warn('assistant: speech not played', e?.message)
    }
  }, [lang])

  const say = useCallback((text, extra = {}) => {
    setMessages((m) => [...m, { role: 'assistant', text, ...extra }])
    speak(text)
  }, [speak])

  function findHandler(action) {
    const byDist = action.distributor_id != null ? handlers.current.get(`${action.type}:${action.distributor_id}`) : null
    const ref = byDist || handlers.current.get(action.type)
    if (!ref) return null
    const obj = ref.current || {}
    return obj[`${action.type}:${action.distributor_id}`] || obj[action.type] || null
  }

  async function waitHandler(action) {
    for (let waited = 0; waited <= HANDLER_WAIT_MS; waited += HANDLER_POLL_MS) {
      const h = findHandler(action)
      if (h) return h
      await sleep(HANDLER_POLL_MS)
    }
    return null
  }

  async function runOne(action) {
    console.info('assistant: action', action)
    if (action.type === 'navigate') { navigate(NAV_TARGETS[action.to] || '/'); return }
    if (action.type === 'start_log') { navigate('/log/new'); return }
    if (action.type === 'set_language') { setLang(action.lang === 'en' ? 'en' : 'hi'); return }
    let h = findHandler(action)
    if (!h && ACTION_SCREEN[action.type] && !routeRef.current.startsWith('/log/')) navigate(ACTION_SCREEN[action.type])
    if (!h) h = await waitHandler(action)
    if (!h) { console.warn('assistant: no handler on this screen', action); say(t('assist_cannot_here')); return }
    await h(action)
    await sleep(SETTLE_MS) // let the screen re-render before the next action
  }

  async function runAll(actions) {
    for (const a of actions) {
      try { await runOne(a) } catch (e) { console.error('assistant: action failed', a, e); say(t('save_failed')); return }
    }
  }

  // Ask Yes / No before writes. `no` runs when the owner says No (for the visit question).
  const ask = useCallback((text, { yes = [], no = [], options } = {}) => {
    setPending({ yes, no })
    setOpen(true)
    say(text, { options })
  }, [say])

  // A screen tells the assistant something happened; spoken only while the panel is open.
  const notify = useCallback((text, extra) => {
    if (!openRef.current) return
    if (extra?.yes || extra?.no) ask(text, extra)
    else say(text, extra)
  }, [ask, say])

  async function answerPending(yes) {
    const p = pending
    setPending(null)
    setMessages((m) => [...m, { role: 'user', text: yes ? t('yes_short') : t('no') }])
    if (yes) await runAll(p.yes)
    else if (p.no.length) await runAll(p.no)
    else say(t('assist_ok_cancel'))
  }

  const send = useCallback(async (rawText) => {
    const text = rawText.trim().slice(0, MAX_TEXT_CHARS)
    if (!text) return
    if (pending && (isYes(text) || isNo(text))) {
      setMessages((m) => [...m, { role: 'user', text }])
      const p = pending
      setPending(null)
      if (isYes(text)) await runAll(p.yes)
      else if (p.no.length) await runAll(p.no)
      else say(t('assist_ok_cancel'))
      return
    }
    setPending(null)
    const history = messagesRef.current.slice(-MAX_HISTORY_TURNS).map(({ role, text: tx }) => ({ role, text: tx }))
    setMessages((m) => [...m, { role: 'user', text }])
    setBusy(true)
    const body = { text, lang, screen: screenName(routeRef.current), context: context(), history }
    let res
    try {
      res = await api.assist(body)
    } catch (e) {
      console.info('assistant: /api/assist not available, using local rules', e?.code || e?.message)
      res = await localAssist({ ...body, t })
    }
    // The model could not act: try the local rules before asking the owner to repeat.
    if (SERVER_ASK_AGAIN.has(res.say) && !res.actions?.length) {
      const local = await localAssist({ ...body, t })
      if (local.actions.length) {
        console.info('assistant: server asked again, local rules matched')
        res = local
      }
    }
    setBusy(false)
    const actions = cleanActions(res.actions)
    const writes = actions.filter((a) => WRITE_TYPES.has(a.type))
    const safe = actions.filter((a) => !WRITE_TYPES.has(a.type))
    if (writes.length) {
      await runAll(safe)
      ask(res.say || t('assist_sure'), { yes: writes })
      return
    }
    say(res.say || t('assist_ok'), { options: res.options })
    await runAll(safe)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending, lang, t])

  const openPanel = useCallback(() => {
    setOpen(true)
    if (messagesRef.current.length === 0) {
      const path = routeRef.current
      const greet = path.startsWith('/log/new/check') ? t('assist_greet_check') : path.startsWith('/log/new') ? t('assist_photo_q')
        : path === '/orders' || path.endsWith('/result') ? t('assist_orders') : t('assist_greet_home')
      say(greet, { options: [t('take_log'), t('orders'), t('distributors_tab')] })
    }
  }, [say, t])

  const value = { open, openPanel, close: () => setOpen(false), messages, busy, pending, send, answerPending, notify, ask, publish, register }
  return <AssistantContext.Provider value={value}>{children}</AssistantContext.Provider>
}
