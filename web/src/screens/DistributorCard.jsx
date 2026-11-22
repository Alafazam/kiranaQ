// The signature card: one per distributor. Runs out first, order, enough, first log.
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Volume2, Copy, ChevronDown } from 'lucide-react'
import { api } from '../api.js'
import { useT } from '../i18n.js'
import { Button, Stamp, StatusLabel, Stepper } from '../ui/kit.jsx'
import { useToast } from '../ui/Toast.jsx'
import ItemLabel from '../ui/ItemLabel.jsx'
import { playBlob } from '../voice.js'

const firstLog = (card) => card.first_log || card.no_history || []
const qtyOf = (l) => (l.final_qty ?? l.suggested_qty)

function packText(t, qty, pack) {
  const cases = qty / pack
  if (Number.isInteger(cases) && cases > 0) return cases === 1 ? t('case_1') : t('case_n', { n: cases })
  return null
}

function daysLeftText(t, l) {
  if (l.days_of_cover == null) return t('no_runout')
  const n = Math.round(l.days_of_cover * 10) / 10
  return n <= 1 ? t('day_left') : t('days_left', { n })
}

function OrderLine({ line, qty, onQty, locked }) {
  const t = useT()
  return (
    <li className="border-t border-rule px-1 py-3">
      <div className="flex items-center justify-between gap-2">
        <ItemLabel item={line} />
        <p className={`shrink-0 whitespace-nowrap text-sm font-medium tabular-nums ${line.status === 'runs_out' ? 'text-danger' : 'text-ink-2'}`}>{daysLeftText(t, line)}</p>
      </div>
      <p className="mt-1 text-sm text-ink-2">{t.reason(line.reason_key, line.reason_args)}</p>
      <div className="mt-2 flex items-center justify-between gap-2">
        {locked ? (
          <span className="num text-lg">{qty} {line.unit}</span>
        ) : (
          <Stepper value={qty} step={line.pack_size} unit={line.unit} label={t.itemName(line)} onChange={onQty} />
        )}
        {packText(t, qty, line.pack_size) && <span className="num text-sm text-muted">{packText(t, qty, line.pack_size)}</span>}
      </div>
    </li>
  )
}

export default function DistributorCard({ card, logId, onChange }) {
  const t = useT()
  const toast = useToast()
  const d = card.distributor
  const orderLines = [...card.runs_out, ...card.order]
  const [qty, setQty] = useState(() => Object.fromEntries(orderLines.map((l) => [l.item_id, qtyOf(l)])))
  const [busy, setBusy] = useState(null)
  const [openEnough, setOpenEnough] = useState(false)
  const locked = card.confirmed

  function listText() {
    const head = d ? d.name : t('no_distributor')
    const rows = orderLines.filter((l) => qty[l.item_id] > 0).map((l) => `${t.itemName(l)}: ${qty[l.item_id]} ${l.unit}`)
    return [head, ...rows].join('\n')
  }

  async function confirm() {
    setBusy('confirm')
    try {
      const res = await api.confirmOrder(logId, { distributor_id: d.id, lines: orderLines.map((l) => ({ item_id: l.item_id, final_qty: qty[l.item_id] })) })
      onChange?.(res)
    } catch (e) {
      console.error('confirm failed', e)
      toast(t('save_failed'))
    }
    setBusy(null)
  }

  async function readOut() {
    setBusy('read')
    try {
      const blob = await api.tts(listText().replace(/\n/g, '. '), t.lang)
      await playBlob(blob)
    } catch (e) {
      console.warn('tts failed', e)
      toast(t('tts_failed'))
    }
    setBusy(null)
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(listText())
      toast(t('copied'))
    } catch (e) {
      console.warn('copy failed', e)
      toast(listText())
    }
  }

  return (
    <article className="pt-4 border-t-[2px] border-rule first:border-t-0 first:pt-0">
      <header className="px-1 pb-3">
        <div className="flex items-start justify-between gap-2">
          <h2 className="text-xl">{d ? d.name : t('no_distributor')}</h2>
          {d && (card.confirmed || orderLines.length > 0) && (
            <Stamp done={card.confirmed}>{card.confirmed ? t('ordered_on', { date: t.date(d.next_visit_date) }) : t('not_confirmed')}</Stamp>
          )}
        </div>
        {d ? (
          <>
            <p className="mt-1">{t('next_visit', { date: '' })}<span className="num">{t.date(d.next_visit_date, true)}</span></p>
            <p className="text-sm text-ink-2">{t('in_n_every', { when: t.when(d.days_to_next_visit), n: d.cycle_days })}</p>
          </>
        ) : (
          <Link to="/settings/items" className="text-sm underline">{t('set_distributor')}</Link>
        )}
        {card.visit_recorded && <p className="mt-2"><Stamp done>{t('delivered_on', { date: t.date(new Date().toISOString().slice(0, 10)) })}</Stamp></p>}
      </header>

      {card.runs_out.length > 0 && (
        <section className="mb-3">
          <StatusLabel status="runs_out" className="px-1 mb-2" />
          <ul>
            {card.runs_out.map((l) => <OrderLine key={l.item_id} line={l} qty={qty[l.item_id]} locked={locked} onQty={(v) => setQty({ ...qty, [l.item_id]: v })} />)}
          </ul>
        </section>
      )}
      {card.order.length > 0 && (
        <section className="mb-3">
          <StatusLabel status="order" text={d ? t('order_on', { day: t.day(d.next_visit_date) }) : t('order')} className="px-1 mb-2" />
          <ul>
            {card.order.map((l) => <OrderLine key={l.item_id} line={l} qty={qty[l.item_id]} locked={locked} onQty={(v) => setQty({ ...qty, [l.item_id]: v })} />)}
          </ul>
        </section>
      )}
      {card.enough.length > 0 && (
        <section className="mb-3 border-t border-rule">
          <button type="button" aria-expanded={openEnough} onClick={() => setOpenEnough(!openEnough)} className="w-full flex items-center gap-2 px-3 min-h-control text-left">
            <StatusLabel status="ok" />
            <span className="flex-1 truncate text-ink-2">{card.enough.map((l) => t.itemName(l)).join(', ')}</span>
            <ChevronDown size={20} aria-hidden className={openEnough ? 'rotate-180' : ''} />
          </button>
          {openEnough && (
            <ul className="divide-y divide-rule px-3 pb-2">
              {card.enough.map((l) => (
                <li key={l.item_id} className="py-2">
                  <div className="flex items-center justify-between gap-2"><ItemLabel item={l} size="sm" /><span className="num text-sm text-ink-2">{daysLeftText(t, l)}</span></div>
                  <p className="text-sm text-muted">{t.reason(l.reason_key, l.reason_args)}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
      {firstLog(card).length > 0 && (
        <section className="mb-3 border-t border-rule px-1 py-2">
          <StatusLabel status="no_history" />
          <ul className="mt-2 space-y-2">{firstLog(card).map((l) => <li key={l.item_id}><ItemLabel item={l} size="sm" /></li>)}</ul>
          <p className="text-sm text-muted">{t.reason('no_history')}</p>
        </section>
      )}

      {orderLines.length > 0 && (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <Button icon={Volume2} busy={busy === 'read'} onClick={readOut}>{t('read_out')}</Button>
            <Button icon={Copy} onClick={copy}>{t('copy_list')}</Button>
          </div>
          {d && !card.confirmed && (
            <Button variant="primary" className="w-full" busy={busy === 'confirm'} onClick={confirm}>{t('confirm_order', { name: d.name })}</Button>
          )}
        </div>
      )}
    </article>
  )
}
