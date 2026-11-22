// Call a distributor: a tel: link when the number is known, else a form to add it (spec R2).
import { useState } from 'react'
import { Phone } from 'lucide-react'
import { api } from '../api.js'
import { useT } from '../i18n.js'
import { useStore } from '../state.jsx'
import { isValidPhone, telHref } from '../phone.js'
import { Button, Sheet } from './kit.jsx'
import { useToast } from './Toast.jsx'

export function PhoneSheet({ open, distributor, initial = '', onClose, onSaved }) {
  const t = useT()
  const toast = useToast()
  const { distributors } = useStore()
  const [value, setValue] = useState(initial)
  const [busy, setBusy] = useState(false)
  const valid = isValidPhone(value)

  async function save() {
    setBusy(true)
    try {
      const phone = value.trim()
      await api.updateDistributor(distributor.id, { phone })
      console.info('distributor phone saved', { distributor_id: distributor.id })
      distributors.reload()
      onSaved?.(phone)
      onClose()
    } catch (e) {
      console.error('phone save failed', e?.code)
      toast(e?.code === 'bad_phone' ? t('bad_phone') : t('save_failed'))
    }
    setBusy(false)
  }

  return (
    <Sheet open={open} onClose={onClose} title={`${t('phone')}: ${distributor.name}`}>
      <label className="block">
        <span className="block mb-1 text-ink-2">{t('phone')}</span>
        <input type="tel" inputMode="tel" autoComplete="off" value={value} onChange={(e) => setValue(e.target.value)} placeholder={t('phone_hint')}
          aria-invalid={value !== '' && !valid}
          className="w-full min-h-control rounded-control border border-rule bg-surface px-3 num text-ink placeholder:text-muted" />
      </label>
      {value !== '' && !valid && <p className="mt-1 text-sm text-ink-2">{t('bad_phone')}</p>}
      <Button variant="primary" className="w-full mt-3" busy={busy} disabled={!valid} onClick={save}>{t('save')}</Button>
    </Sheet>
  )
}

// size "sm" fits inline next to a reason line; "md" is a 44px header button.
export default function PhoneButton({ distributor, size = 'md', className = '' }) {
  const t = useT()
  const [phone, setPhone] = useState(distributor.phone ?? null)
  const [open, setOpen] = useState(false)
  const box = size === 'sm' ? 'min-h-[36px] h-9 px-2 text-sm' : 'min-h-[44px] px-3'
  const label = phone ? t('call_name', { name: distributor.name }) : t('add_phone')
  if (phone) {
    return (
      <a href={telHref(phone)} aria-label={label} title={label} className={`mould mould-secondary ${box} text-accent-deep ${className}`}>
        <Phone size={size === 'sm' ? 16 : 20} aria-hidden />
      </a>
    )
  }
  return (
    <>
      <button type="button" aria-label={label} title={label} onClick={() => setOpen(true)} className={`mould mould-secondary ${box} text-muted ${className}`}>
        <Phone size={size === 'sm' ? 16 : 20} aria-hidden />
      </button>
      <PhoneSheet open={open} distributor={distributor} onClose={() => setOpen(false)} onSaved={setPhone} />
    </>
  )
}
