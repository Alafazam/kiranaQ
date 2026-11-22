// Small UI kit per DESIGN.md: moulded 52px controls, tokens only, lucide icons.
import { useEffect } from 'react'
import { AlertTriangle, ShoppingCart, CheckCircle2, Clock, Loader2, Minus, Plus, RotateCcw, X } from 'lucide-react'
import { useT } from '../i18n.js'

export function Button({ variant = 'secondary', busy = false, disabled, className = '', children, icon: Icon, ...rest }) {
  return (
    <button
      type="button"
      className={`mould mould-${variant} ${className}`}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      {...rest}
    >
      {busy ? <Loader2 size={20} strokeWidth={2} className="animate-spin" aria-hidden /> : Icon ? <Icon size={20} strokeWidth={2} aria-hidden /> : null}
      {children}
    </button>
  )
}

export function IconButton({ label, icon: Icon, className = '', variant = 'text', ...rest }) {
  return (
    <button type="button" aria-label={label} title={label} className={`mould mould-${variant} px-0 ${/(^|\s)w-/.test(className) ? '' : 'w-control'} ${className}`} {...rest}>
      <Icon size={22} strokeWidth={2} aria-hidden />
    </button>
  )
}

export function Card({ className = '', children, ...rest }) {
  return <section className={`bg-surface rounded-card shadow-lift ${className}`} {...rest}>{children}</section>
}

export function Stepper({ value, step = 1, onChange, label, unit }) {
  return (
    <div className="flex items-center gap-2" role="group" aria-label={label}>
      <IconButton variant="secondary" icon={Minus} label={`${label} −${step}`} disabled={value <= 0} onClick={() => onChange(Math.max(0, value - step))} />
      <span className="num text-xl min-w-[4.5rem] text-center" aria-live="polite">{value}<span className="text-sm text-muted ml-1">{unit}</span></span>
      <IconButton variant="secondary" icon={Plus} label={`${label} +${step}`} onClick={() => onChange(value + step)} />
    </div>
  )
}

export function Sheet({ open, onClose, title, children }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose?.()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-ink opacity-40 fade-enter" onClick={onClose} />
      <div className="relative w-full max-w-app bg-surface rounded-t-[14px] p-4 pb-6 shadow-lift sheet-enter">
        {title && (
          <div className="flex items-start gap-2 mb-3">
            <h2 className="text-xl flex-1">{title}</h2>
            {onClose && <IconButton icon={X} label="Close" className="min-h-[44px] w-11 -mr-2 -mt-1" onClick={onClose} />}
          </div>
        )}
        {children}
      </div>
    </div>
  )
}

export function Dialog({ open, title, body, confirmLabel, cancelLabel, onConfirm, onCancel }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" role="alertdialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-ink opacity-40 fade-enter" onClick={onCancel} />
      <Card className="relative w-full max-w-app p-4 fade-enter">
        <h2 className="text-xl">{title}</h2>
        <p className="mt-2 text-ink-2">{body}</p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <Button onClick={onCancel} autoFocus>{cancelLabel}</Button>
          <Button variant="secondary" onClick={onConfirm}>{confirmLabel}</Button>
        </div>
      </Card>
    </div>
  )
}

export function Badge({ children, className = '' }) {
  return <span className={`inline-flex items-center gap-1 rounded-pill px-2 py-0.5 text-sm border border-rule text-muted ${className}`}>{children}</span>
}

const STATUS = {
  runs_out: { icon: AlertTriangle, key: 'runs_out_first', cls: 'text-danger' },
  order: { icon: ShoppingCart, key: 'order', cls: 'text-ink' },
  ok: { icon: CheckCircle2, key: 'enough', cls: 'text-muted' },
  no_history: { icon: Clock, key: 'first_log', cls: 'text-muted' },
}
export function StatusLabel({ status, text, className = '' }) {
  const t = useT()
  const s = STATUS[status]
  const Icon = s.icon
  return (
    <span className={`inline-flex items-center gap-1.5 font-medium ${s.cls} ${className}`}>
      <Icon size={20} strokeWidth={2} aria-hidden />
      {text ?? t(s.key)}
    </span>
  )
}

export function Stamp({ done, children }) {
  return (
    <span
      className={`stamp inline-block shrink-0 whitespace-nowrap text-sm font-medium px-3 py-1 rounded-control ${done ? 'text-accent stamp-land' : 'text-muted'}`}
    >
      {children}
    </span>
  )
}

export function Skeleton({ className = '' }) {
  return <div className={`skeleton ${className}`} aria-hidden />
}

export function Loading({ rows = 3, label }) {
  return (
    <div role="status" aria-label={label} className="space-y-3">
      {Array.from({ length: rows }, (_, i) => <Skeleton key={i} className="h-16" />)}
    </div>
  )
}

export function ErrorState({ onRetry }) {
  const t = useT()
  return (
    <Card className="p-4">
      <p className="flex items-center gap-2 font-medium"><AlertTriangle size={20} aria-hidden />{t('error_title')}</p>
      <p className="mt-1 text-ink-2">{t('error_body')}</p>
      <Button icon={RotateCcw} className="mt-3" onClick={onRetry}>{t('retry')}</Button>
    </Card>
  )
}

export function EmptyState({ title, body, children }) {
  return (
    <Card className="p-4">
      <h2 className="text-lg">{title}</h2>
      <p className="mt-1 text-ink-2">{body}</p>
      {children && <div className="mt-3">{children}</div>}
    </Card>
  )
}

const tintIndex = (i) => ((Math.max(1, i || 1) - 1) % 5) + 1
const DOT_BG = { 1: 'bg-t-1', 2: 'bg-t-2', 3: 'bg-t-3', 4: 'bg-t-4', 5: 'bg-t-5' }
// White card with the distributor's colour as a left stripe.
export const stripeClass = (i) => `bg-surface stripe-${tintIndex(i)}`
// Small dot or bar in lists, never behind text.
export const dotClass = (i) => DOT_BG[tintIndex(i)]
