// "+ Add distributor" form (spec R5): name, mobile (optional), visit every N days, last visit (optional).
import { useState } from 'react'
import { api } from '../api.js'
import { useT } from '../i18n.js'
import { useStore } from '../state.jsx'
import { isValidPhone } from '../phone.js'
import { Button, Sheet } from '../ui/kit.jsx'
import { useToast } from '../ui/Toast.jsx'

const MIN_CYCLE_DAYS = 1
const MAX_CYCLE_DAYS = 60
const DEFAULT_CYCLE_DAYS = 7
const EMPTY = { name: '', phone: '', cycle_days: DEFAULT_CYCLE_DAYS, last_visit_date: '' }

export default function AddDistributorSheet({ open, onClose, onAdded }) {
  const t = useT()
  const toast = useToast()
  const { distributors } = useStore()
  const [f, setF] = useState(EMPTY)
  const [busy, setBusy] = useState(false)
  const cycleOk = Number.isInteger(Number(f.cycle_days)) && f.cycle_days >= MIN_CYCLE_DAYS && f.cycle_days <= MAX_CYCLE_DAYS
  const phoneOk = f.phone.trim() === '' || isValidPhone(f.phone)
  const valid = f.name.trim() !== '' && cycleOk && phoneOk
  const field = 'w-full min-h-control rounded-control border border-rule bg-surface px-3 text-ink placeholder:text-muted'

  async function save() {
    setBusy(true)
    try {
      const body = { name: f.name.trim(), cycle_days: Number(f.cycle_days) }
      if (f.phone.trim()) body.phone = f.phone.trim()
      if (f.last_visit_date) body.last_visit_date = f.last_visit_date
      const d = await api.createDistributor(body)
      console.info('distributor added', { id: d.id })
      distributors.reload()
      toast(t('distributor_added', { name: d.name }))
      setF(EMPTY)
      onAdded?.(d)
      onClose()
    } catch (e) {
      console.error('add distributor failed', e?.code)
      toast(e?.code === 'bad_phone' ? t('bad_phone') : t('save_failed'))
    }
    setBusy(false)
  }

  return (
    <Sheet open={open} onClose={onClose} title={t('new_distributor')}>
      <div className="space-y-3 max-h-[60vh] overflow-y-auto">
        <label className="block"><span className="block mb-1 text-ink-2">{t('name')}</span>
          <input className={field} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} autoFocus /></label>
        <label className="block"><span className="block mb-1 text-ink-2">{t('phone')}</span>
          <input className={`${field} num`} type="tel" inputMode="tel" autoComplete="off" placeholder={t('phone_hint')} aria-invalid={!phoneOk}
            value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
          {!phoneOk && <span className="block mt-1 text-sm text-ink-2">{t('bad_phone')}</span>}</label>
        <label className="block"><span className="block mb-1 text-ink-2">{t('cycle_days_hint')}</span>
          <input className={`${field} num`} type="number" inputMode="numeric" min={MIN_CYCLE_DAYS} max={MAX_CYCLE_DAYS} aria-invalid={!cycleOk}
            value={f.cycle_days} onChange={(e) => setF({ ...f, cycle_days: e.target.value === '' ? '' : Number(e.target.value) })} /></label>
        <label className="block"><span className="block mb-1 text-ink-2">{t('last_visit_optional')}</span>
          <input className={`${field} num`} type="date" value={f.last_visit_date} onChange={(e) => setF({ ...f, last_visit_date: e.target.value })} /></label>
      </div>
      <Button variant="primary" className="w-full mt-4" busy={busy} disabled={!valid} onClick={save}>{t('save')}</Button>
    </Sheet>
  )
}
