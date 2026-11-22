// The "Bolo" button and the assistant panel. The panel sits at the bottom; the screen above stays visible.
import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Mic, Square, X, Send, Loader2, Check, Ban } from 'lucide-react'
import { useT } from '../i18n.js'
import { api } from '../api.js'
import { canRecord, startRecording } from '../voice.js'
import { useAssistantState } from './AssistantProvider.jsx'

const TAB_ROUTES = ['/', '/orders', '/distributors', '/settings']

export function BoloButton() {
  const t = useT()
  const a = useAssistantState()
  const { pathname } = useLocation()
  // Screens with the tab bar have the mic in its centre; Check has its own "Hold to speak".
  const hasTabBar = TAB_ROUTES.includes(pathname) || pathname.startsWith('/settings') || /^\/log\/\d+$/.test(pathname)
  if (a.open || hasTabBar || pathname.startsWith('/log/new/check')) return null
  const lift = 'bottom-[150px]'
  return (
    <button type="button" onClick={a.openPanel} aria-label={t('assist_open')}
      className={`fixed right-4 ${lift} z-30 flex flex-col items-center justify-center w-16 h-16 rounded-pill bg-surface text-accent-deep border-2 border-accent shadow-lift active:bg-paper-2`}>
      <Mic size={26} strokeWidth={2.25} aria-hidden />
      <span className="text-sm font-medium leading-none mt-0.5">{t('assist_bolo')}</span>
    </button>
  )
}

export function AssistantPanel() {
  const t = useT()
  const a = useAssistantState()
  const [rec, setRec] = useState('idle') // idle | recording | working | blocked
  const [typed, setTyped] = useState('')
  const recRef = useRef(null)
  const listRef = useRef(null)

  useEffect(() => { listRef.current?.scrollTo({ top: listRef.current.scrollHeight }) }, [a.messages, a.busy])

  if (!a.open) return null

  async function toggleMic() {
    if (rec === 'recording') {
      const r = recRef.current
      recRef.current = null
      setRec('working')
      try {
        const blob = await r.stop()
        const res = await api.stt(blob, t.lang)
        const text = (res.transcript ?? res.text ?? '').trim()
        setRec('idle')
        if (text) await a.send(text)
        else a.notify(t('stt_failed'))
      } catch (e) {
        console.error('assistant: stt failed', e)
        setRec('idle')
        a.notify(t('stt_failed'))
      }
      return
    }
    try {
      recRef.current = await startRecording(() => toggleMic())
      setRec('recording')
    } catch (e) {
      console.warn('assistant: mic blocked', e)
      setRec('blocked')
    }
  }

  const micLabel = rec === 'recording' ? t('assist_tap_stop') : rec === 'working' ? t('hearing') : rec === 'blocked' ? t('mic_blocked') : t('assist_tap_talk')
  const last = a.messages[a.messages.length - 1]

  return (
    <section className="fixed inset-x-0 bottom-0 z-40 h-[62%] flex flex-col sheet-fast" aria-label={t('assist_title')}>
      <div className="w-full h-full bg-surface rounded-t-[14px] border-t border-rule shadow-lift flex flex-col min-h-0">
        <header className="flex items-center gap-2 px-4 pt-3">
                    <h2 className="text-lg flex-1">{t('assist_title')}</h2>
          <button type="button" onClick={a.close} aria-label={t('close')} className="mould mould-text w-11 min-h-[44px] px-0"><X size={22} aria-hidden /></button>
        </header>
        <ol ref={listRef} className="flex-1 min-h-0 overflow-y-auto px-4 py-2 space-y-2" aria-live="polite">
          {a.messages.map((m, i) => (
            <li key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <p className={`max-w-[85%] rounded-card px-3 py-2 ${m.role === 'user' ? 'bg-accent-soft text-ink' : 'bg-paper text-ink border border-rule'}`}>{m.text}</p>
            </li>
          ))}
          {a.busy && <li className="flex items-center gap-2 text-muted"><Loader2 size={18} className="animate-spin" aria-hidden />{t('hearing')}</li>}
        </ol>
        <div className="px-4 pb-4 pt-2 space-y-2 border-t border-rule">
          {a.pending ? (
            <div className="grid grid-cols-2 gap-2">
              <button type="button" className="mould mould-secondary" onClick={() => a.answerPending(false)}><Ban size={20} aria-hidden />{t('no')}</button>
              <button type="button" className="mould mould-primary" onClick={() => a.answerPending(true)}><Check size={20} aria-hidden />{t('yes_short')}</button>
            </div>
          ) : last?.options?.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {last.options.map((o) => (
                <button key={o} type="button" className="mould mould-secondary min-h-[44px] text-sm" onClick={() => a.send(o)}>{o}</button>
              ))}
            </div>
          )}
          <button type="button" onClick={toggleMic} disabled={rec === 'working' || rec === 'blocked' || a.busy || !canRecord()}
            className={`mould w-full text-lg ${rec === 'recording' ? 'mould-selected' : a.pending ? 'mould-secondary' : 'mould-primary'}`}>
            {rec === 'recording' ? <Square size={22} aria-hidden /> : <Mic size={22} aria-hidden />}{micLabel}
          </button>
          <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); const v = typed; setTyped(''); a.send(v) }}>
            <input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder={t('assist_type')} aria-label={t('assist_type')}
              className="flex-1 min-h-[44px] rounded-control border border-rule bg-surface px-3 text-ink placeholder:text-muted" />
            <button type="submit" aria-label={t('apply_text')} disabled={!typed.trim() || a.busy} className="mould mould-secondary w-11 min-h-[44px] px-0"><Send size={20} aria-hidden /></button>
          </form>
        </div>
      </div>
    </section>
  )
}
