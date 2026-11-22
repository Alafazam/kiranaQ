import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ChevronRight, Truck, Package } from 'lucide-react'
import { api } from '../api.js'
import { useT, useLang } from '../i18n.js'
import { useStore } from '../state.jsx'
import { Button, Card, EmptyState, ErrorState, Loading, tintClass } from '../ui/kit.jsx'
import { TopBar } from '../ui/TopBar.jsx'
import { useToast } from '../ui/Toast.jsx'

const APP_VERSION = '0.1.0'
const MIN_CYCLE_DAYS = 1
const MAX_CYCLE_DAYS = 60

function Choice({ options, value, onChange, label }) {
  return (
    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }} role="group" aria-label={label}>
      {options.map(([v, text]) => (
        <button key={v} type="button" aria-pressed={value === v} onClick={() => onChange(v)}
          className={`mould ${value === v ? 'mould-selected' : 'mould-secondary'}`}>{text}</button>
      ))}
    </div>
  )
}

export function SettingsHome() {
  const t = useT()
  const { lang, setLang } = useLang()
  const { distributors, items, theme, setTheme } = useStore()
  return (
    <>
      <TopBar title={t('settings')} />
      <main className="mx-auto max-w-app px-4 pb-28 space-y-5">
        <section>
          <h2 className="text-lg mb-2">{t('distributors')}</h2>
          {distributors.status === 'loading' && <Loading rows={2} />}
          {distributors.status === 'error' && <ErrorState onRetry={distributors.reload} />}
          {distributors.status === 'ok' && (distributors.data.length === 0 ? (
            <EmptyState title={t('no_dist_title')} body={t('no_dist_body')} />
          ) : (
            <Card>
              <ul className="divide-y divide-rule">
                {distributors.data.map((d) => (
                  <li key={d.id}>
                    <Link to={`/settings/distributors/${d.id}`} className="flex items-center gap-3 px-4 min-h-[60px]">
                      <span className={`w-3 self-stretch my-3 rounded-pill ${tintClass(d.tint_index ?? d.id)}`} aria-hidden />
                      <span className="flex-1">
                        <span className="block font-medium">{d.name}</span>
                        <span className="block text-sm text-ink-2">{t('every_n', { n: d.cycle_days })}</span>
                      </span>
                      <ChevronRight size={20} className="text-muted" aria-hidden />
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </section>
        <Card>
          <Link to="/settings/items" className="flex items-center gap-3 px-4 min-h-[60px]">
            <Package size={22} aria-hidden />
            <span className="flex-1 font-medium">{t('items')}</span>
            <span className="num text-ink-2">{items.data?.length ?? ''}</span>
            <ChevronRight size={20} className="text-muted" aria-hidden />
          </Link>
        </Card>
        <section>
          <h2 className="text-lg mb-2">{t('language')}</h2>
          <Choice label={t('language')} value={lang} onChange={setLang} options={[['hi', 'हिंदी'], ['en', 'English']]} />
        </section>
        <section>
          <h2 className="text-lg mb-2">{t('theme')}</h2>
          <Choice label={t('theme')} value={theme} onChange={setTheme}
            options={[['system', t('theme_system')], ['light', t('theme_light')], ['dark', t('theme_dark')]]} />
        </section>
        <section>
          <h2 className="text-lg mb-2">{t('about')}</h2>
          <Card className="px-4 py-3">
            <p className="num">{t('version', { v: APP_VERSION })}</p>
            <p className="text-ink-2">{t('synthetic')}</p>
          </Card>
        </section>
      </main>
    </>
  )
}

export function EditDistributor() {
  const t = useT()
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const { distributors, items } = useStore()
  const d = distributors.data?.find((x) => x.id === Number(id))
  const [form, setForm] = useState(null)
  const [busy, setBusy] = useState(false)
  if (distributors.status === 'loading') return <><TopBar onBack={() => navigate(-1)} /><main className="mx-auto max-w-app px-4"><Loading rows={3} /></main></>
  if (!d) return <><TopBar onBack={() => navigate('/settings')} /><main className="mx-auto max-w-app px-4"><ErrorState onRetry={distributors.reload} /></main></>
  const f = form || { name: d.name, cycle_days: d.cycle_days, last_visit_date: d.last_visit_date || '', note: d.note || '' }
  const cycleOk = Number.isInteger(Number(f.cycle_days)) && f.cycle_days >= MIN_CYCLE_DAYS && f.cycle_days <= MAX_CYCLE_DAYS
  const valid = f.name.trim().length > 0 && cycleOk
  const own = (items.data || []).filter((it) => it.distributor_id === d.id)

  async function save() {
    setBusy(true)
    try {
      await api.updateDistributor(d.id, { ...f, cycle_days: Number(f.cycle_days), name: f.name.trim(), last_visit_date: f.last_visit_date || null })
      distributors.reload()
      toast(t('saved'))
      navigate('/settings')
    } catch (e) {
      console.error('distributor save failed', e)
      toast(t('save_failed'))
    }
    setBusy(false)
  }

  const field = 'w-full min-h-control rounded-control border border-rule bg-surface px-3 text-ink'
  return (
    <>
      <TopBar title={d.name} onBack={() => navigate('/settings')} />
      <main className="mx-auto max-w-app px-4 pb-28 space-y-4">
        <label className="block"><span className="block mb-1 text-ink-2">{t('name')}</span>
          <input className={field} value={f.name} onChange={(e) => setForm({ ...f, name: e.target.value })} /></label>
        <label className="block"><span className="block mb-1 text-ink-2">{t('cycle_days')}</span>
          <input className={`${field} num`} type="number" inputMode="numeric" min={MIN_CYCLE_DAYS} max={MAX_CYCLE_DAYS}
            aria-invalid={!cycleOk} value={f.cycle_days} onChange={(e) => setForm({ ...f, cycle_days: e.target.value === '' ? '' : Number(e.target.value) })} /></label>
        <label className="block"><span className="block mb-1 text-ink-2">{t('last_visit')}</span>
          <input className={`${field} num`} type="date" value={f.last_visit_date} onChange={(e) => setForm({ ...f, last_visit_date: e.target.value })} /></label>
        <label className="block"><span className="block mb-1 text-ink-2">{t('note')}</span>
          <input className={field} value={f.note} onChange={(e) => setForm({ ...f, note: e.target.value })} /></label>
        <Button variant="primary" className="w-full" busy={busy} disabled={!valid} onClick={save}>{t('save')}</Button>
        <section>
          <h2 className="text-lg mb-2 flex items-center gap-2"><Truck size={20} aria-hidden />{t('items')}</h2>
          <Card><ul className="divide-y divide-rule">{own.map((it) => <li key={it.id} className="px-4 py-3">{t.itemName(it)}</li>)}</ul></Card>
        </section>
      </main>
    </>
  )
}

export function ItemsList() {
  const t = useT()
  const navigate = useNavigate()
  const toast = useToast()
  const { items, distributors } = useStore()
  const [busyId, setBusyId] = useState(null)

  async function change(it, body) {
    setBusyId(it.id)
    try {
      await api.updateItem(it.id, body)
      items.reload()
    } catch (e) {
      console.error('item save failed', e)
      toast(t('save_failed'))
    }
    setBusyId(null)
  }

  return (
    <>
      <TopBar title={t('items')} onBack={() => navigate('/settings')} />
      <main className="mx-auto max-w-app px-4 pb-28">
        {items.status === 'loading' && <Loading rows={5} />}
        {items.status === 'error' && <ErrorState onRetry={items.reload} />}
        {items.status === 'ok' && (
          <Card>
            <ul className="divide-y divide-rule">
              {items.data.map((it) => (
                <li key={it.id} className="px-4 py-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`font-medium ${it.active ? '' : 'text-muted'}`}>{t.itemName(it)}</span>
                    <label className="flex items-center gap-2 min-h-[44px]">
                      <span className="text-sm text-ink-2">{t('active')}</span>
                      <input type="checkbox" className="w-6 h-6 accent-[var(--color-accent)]" checked={it.active} disabled={busyId === it.id}
                        onChange={(e) => change(it, { active: e.target.checked })} />
                    </label>
                  </div>
                  <select aria-label={`${t('distributor')}: ${t.itemName(it)}`} disabled={busyId === it.id}
                    className="w-full min-h-control rounded-control border border-rule bg-surface px-3 text-ink"
                    value={it.distributor_id ?? ''} onChange={(e) => change(it, { distributor_id: e.target.value ? Number(e.target.value) : null })}>
                    <option value="">{t('no_distributor')}</option>
                    {(distributors.data || []).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </main>
    </>
  )
}
