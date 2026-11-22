import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Mic, MicOff, Plus, Trash2, Send } from 'lucide-react'
import { api } from '../api.js'
import { useT } from '../i18n.js'
import { clearDraft, readDraft, useStore, writeDraft } from '../state.jsx'
import { Badge, Button, Card, Dialog, ErrorState, IconButton, Loading, Sheet, Stepper } from '../ui/kit.jsx'
import { TopBar, Steps } from '../ui/TopBar.jsx'
import { useToast } from '../ui/Toast.jsx'
import { canRecord, startRecording } from '../voice.js'
import VisitSheet from './VisitSheet.jsx'
import ItemLabel from '../ui/ItemLabel.jsx'
import { BoxOverlay } from '../ui/BoxEditor.jsx'
import { useAssistant } from '../assistant/AssistantProvider.jsx'

// Below this vision confidence a row shows "Not sure".
const LOW_CONFIDENCE = 0.7
// Count sources the API accepts (spec "Data model": who set the final value).
// Older drafts in sessionStorage may still hold photo / edited / manual.
const COUNT_SOURCE = { vision: 'vision', voice: 'voice', tap: 'tap', photo: 'vision', edited: 'tap', manual: 'tap' }

export default function Check() {
  const t = useT()
  const navigate = useNavigate()
  const toast = useToast()
  const { items } = useStore()
  const draft = useMemo(() => readDraft() || { counts: [], source: 'manual', photo_count: 0 }, [])
  const [counts, setCounts] = useState(draft.counts || [])
  const [addOpen, setAddOpen] = useState(false)
  const [confirmBack, setConfirmBack] = useState(false)
  const [saving, setSaving] = useState(false)
  const [visit, setVisit] = useState(null)
  // voice
  const [recState, setRecState] = useState('idle') // idle | recording | working | blocked
  const [heard, setHeard] = useState(null) // {text, edits, unclear, ask}
  const [typed, setTyped] = useState('')
  const [showText, setShowText] = useState(!canRecord())
  const recRef = useRef(null)

  const byId = useMemo(() => new Map((items.data || []).map((it) => [it.id, it])), [items.data])

  function update(next) {
    setCounts(next)
    writeDraft({ ...draft, ...(readDraft() || {}), counts: next })
  }
  function setCount(itemId, value) {
    update(counts.map((c) => (c.item_id === itemId ? { ...c, count: value, source: c.source === 'vision' && c.vision_count === value ? 'vision' : 'tap' } : c)))
  }
  function removeRow(itemId) {
    const i = counts.findIndex((c) => c.item_id === itemId)
    const removed = counts[i]
    const next = counts.filter((c) => c.item_id !== itemId)
    update(next)
    toast(t('item_removed'), { label: t('undo'), onClick: () => update([...next.slice(0, i), removed, ...next.slice(i)]) })
  }
  function addRow(itemId) {
    setAddOpen(false)
    update([...counts, { item_id: itemId, count: 0, source: 'tap' }])
  }

  async function understand(text) {
    setRecState('working')
    try {
      const res = await api.parse({ text, lang: t.lang, draft: counts.map(({ item_id, count }) => ({ item_id, count })) })
      setHeard({ text, ...res })
    } catch (e) {
      console.error('parse failed', e)
      setHeard({ text, edits: [], unclear: true, ask: t('say_again') })
    }
    setRecState('idle')
  }

  async function micDown(e) {
    e.preventDefault()
    if (recState !== 'idle') return
    try {
      recRef.current = await startRecording(() => micUp())
      setRecState('recording')
    } catch (err) {
      console.warn('mic blocked', err)
      setRecState('blocked')
      setShowText(true)
    }
  }
  async function micUp() {
    const rec = recRef.current
    if (!rec) return
    recRef.current = null
    setRecState('working')
    const blob = await rec.stop()
    try {
      const res = await api.stt(blob, t.lang)
      const text = res.transcript ?? res.text ?? ''
      if (!text.trim()) throw new Error('empty transcript')
      await understand(text)
    } catch (err) {
      console.error('stt failed', err)
      toast(t('stt_failed'))
      setShowText(true)
      setRecState('idle')
    }
  }

  function applyEdits(edits = heard.edits) {
    let next = [...(readDraft()?.counts || counts)]
    for (const ed of edits) {
      const i = next.findIndex((c) => c.item_id === ed.item_id)
      if (i >= 0) next[i] = { ...next[i], count: ed.count, source: 'voice' }
      else next.push({ item_id: ed.item_id, count: ed.count, source: 'voice' })
    }
    update(next)
    setHeard(null)
  }

  const assistant = useAssistant({
    context: { draft: counts.map(({ item_id, count }) => ({ item_id, count })) },
    handlers: { set_counts: (a) => applyEdits(a.edits || []), save_log: () => save() },
  })
  const countedOnce = useRef(false)
  useEffect(() => {
    if (countedOnce.current || items.status !== 'ok') return
    countedOnce.current = true
    assistant?.notify(t('assist_counted', { n: counts.length }), { options: [t('save_log')] })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.status])

  async function save() {
    setSaving(true)
    try {
      const body = {
        source: draft.source || 'manual',
        photo_count: draft.photo_count || 0,
        counts: counts.map((c) => ({ ...c, source: COUNT_SOURCE[c.source] ?? 'tap' })),
      }
      const res = await api.createLog(body)
      clearDraft()
      const goResult = () => navigate(`/log/${res.log_id}/result`, { replace: true, state: { not_counted: res.not_counted, fromSave: true } })
      if (res.delivery_candidates?.length) setVisit({ logId: res.log_id, candidates: res.delivery_candidates, done: goResult })
      else goResult()
    } catch (e) {
      console.error('save failed', e)
      toast(t('save_failed'))
    }
    setSaving(false)
  }

  const notAdded = (items.data || []).filter((it) => it.active && !counts.some((c) => c.item_id === it.id))
  const micLabel = recState === 'recording' ? t('listening') : recState === 'working' ? t('hearing') : recState === 'blocked' ? t('mic_blocked') : t('hold_to_speak')

  return (
    <>
      <TopBar onBack={() => setConfirmBack(true)}><Steps current={1} /></TopBar>
      <main className="mx-auto max-w-app px-4 pb-72">
        {items.status === 'loading' && <Loading rows={4} />}
        {items.status === 'error' && <ErrorState onRetry={items.reload} />}
        {items.status === 'ok' && (
          <>
            {draft.photos?.length > 0 && (
              <div className="mt-2 mb-3">
                <ul className="flex gap-2">
                  {draft.photos.filter((p) => typeof p === 'object').map((p, i) => (
                    <li key={i} className="relative w-24 overflow-hidden rounded-control border border-rule">
                      <img src={p.src} alt="" className="block w-full" />
                      <BoxOverlay box={p.box} />
                    </li>
                  ))}
                </ul>
                <p className="mt-1 text-sm text-ink-2">{t('counted_in_box')}</p>
              </div>
            )}
            <h2 className="text-lg mt-2 mb-3">{t('items_found', { n: counts.length })}</h2>
            <Card>
              <ul className="divide-y divide-rule">
                {counts.map((c) => {
                  const it = byId.get(c.item_id)
                  if (!it) return null
                  const unsure = c.source === 'vision' && c.vision_confidence != null && c.vision_confidence < LOW_CONFIDENCE
                  const cases = Math.floor(c.count / it.pack_size)
                  return (
                    <li key={c.item_id} className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <ItemLabel item={it} className="flex-1" />
                        {unsure && <Badge>{t('not_sure')}</Badge>}
                        <IconButton icon={Trash2} label={t('remove_item')} className="min-h-[44px] w-11 text-muted" onClick={() => removeRow(c.item_id)} />
                      </div>
                      <div className="mt-1 flex items-center justify-between gap-2">
                        <Stepper value={c.count} unit={it.unit} label={t.itemName(it)} onChange={(v) => setCount(c.item_id, v)} />
                        {cases > 0 && <span className="num text-sm text-muted">{cases === 1 ? t('case_1') : t('case_n', { n: cases })}</span>}
                      </div>
                    </li>
                  )
                })}
              </ul>
              <div className="p-3 border-t border-rule">
                <Button variant="text" icon={Plus} className="w-full" disabled={notAdded.length === 0} onClick={() => setAddOpen(true)}>{t('add_item')}</Button>
              </div>
            </Card>
          </>
        )}
      </main>
      <div className="fixed inset-x-0 bottom-0 z-20 bg-paper border-t border-rule pt-3 pb-4">
        <div className="mx-auto max-w-app px-4 space-y-2">
          <button type="button"
            className={`mould w-full ${recState === 'recording' ? 'mould-selected' : 'mould-secondary'} touch-none`}
            disabled={recState === 'working' || recState === 'blocked'}
            aria-busy={recState === 'working' || undefined}
            onPointerDown={micDown} onPointerUp={micUp} onPointerLeave={() => recState === 'recording' && micUp()}
            onContextMenu={(e) => e.preventDefault()}>
            {recState === 'blocked' ? <MicOff size={22} aria-hidden /> : <Mic size={22} aria-hidden />}
            {micLabel}
          </button>
          {showText ? (
            <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (typed.trim()) { understand(typed.trim()); setTyped('') } }}>
              <input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder={t('type_instead')} aria-label={t('type_instead')}
                className="flex-1 min-h-control rounded-control border border-rule bg-surface px-3 text-ink placeholder:text-muted" />
              <IconButton icon={Send} label={t('apply_text')} variant="secondary" type="submit" disabled={!typed.trim() || recState === 'working'} />
            </form>
          ) : (
            <button type="button" className="w-full text-sm text-muted underline min-h-[44px]" onClick={() => setShowText(true)}>{t('type_instead')}</button>
          )}
          <Button variant="primary" className="w-full text-lg" busy={saving} disabled={counts.length === 0} onClick={save}>
            {saving ? t('saving') : t('save_log')}
          </Button>
        </div>
      </div>

      <Sheet open={addOpen} onClose={() => setAddOpen(false)} title={t('pick_item')}>
        <ul className="divide-y divide-rule max-h-[60vh] overflow-y-auto">
          {notAdded.map((it) => (
            <li key={it.id}><button type="button" className="w-full text-left py-3 min-h-control" onClick={() => addRow(it.id)}><ItemLabel item={it} size="sm" /></button></li>
          ))}
        </ul>
      </Sheet>

      <Sheet open={Boolean(heard)} onClose={() => setHeard(null)} title={heard ? t('i_heard', { text: heard.text }) : ''}>
        {heard && (
          <>
            {heard.unclear && <p className="mb-3 font-medium">{heard.ask || t('say_again')}</p>}
            {heard.edits.length === 0 ? (
              <p className="mb-3 text-ink-2">{t('no_changes')}</p>
            ) : (
              <ul className="divide-y divide-rule mb-4">
                {heard.edits.map((ed) => {
                  const it = byId.get(ed.item_id)
                  const before = counts.find((c) => c.item_id === ed.item_id)?.count
                  return (
                    <li key={ed.item_id} className="flex justify-between py-2">
                      {it ? <ItemLabel item={it} size="sm" /> : <span>{ed.item_id}</span>}
                      <span className="num">{before != null && <span className="text-muted line-through mr-2">{before}</span>}{ed.count}</span>
                    </li>
                  )
                })}
              </ul>
            )}
            <div className="grid grid-cols-2 gap-3">
              <Button onClick={() => setHeard(null)}>{t('no_retry')}</Button>
              <Button variant="primary" disabled={heard.edits.length === 0} onClick={() => applyEdits()}>{t('yes_apply')}</Button>
            </div>
          </>
        )}
      </Sheet>

      {visit && <VisitSheet logId={visit.logId} candidates={visit.candidates} onDone={visit.done} />}

      <Dialog open={confirmBack} title={t('discard_title')} body={t('discard_body')} confirmLabel={t('discard')} cancelLabel={t('keep')}
        onCancel={() => setConfirmBack(false)} onConfirm={() => { clearDraft(); navigate('/') }} />
    </>
  )
}
