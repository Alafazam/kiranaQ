// One distributor (spec R2–R4): visit, phone, past orders, items they give.
import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Plus, Pencil, X, ChevronRight } from 'lucide-react'
import { api } from '../api.js'
import { useT } from '../i18n.js'
import { useLoad, useStore } from '../state.jsx'
import { Button, Card, EmptyState, ErrorState, IconButton, Loading, Sheet, stripeClass } from '../ui/kit.jsx'
import ItemLabel from '../ui/ItemLabel.jsx'
import PhoneButton, { PhoneSheet } from '../ui/PhoneButton.jsx'
import { TopBar } from '../ui/TopBar.jsx'
import { useToast } from '../ui/Toast.jsx'

function packText(t, qty, pack) {
  const boxes = qty / pack
  if (!Number.isInteger(boxes) || boxes <= 0) return null
  return boxes === 1 ? t('case_1') : t('case_n', { n: boxes })
}

export default function DistributorDetail() {
  const t = useT()
  const { id } = useParams()
  const did = Number(id)
  const navigate = useNavigate()
  const toast = useToast()
  const { distributors, items } = useStore()
  const orders = useLoad(() => api.distributorOrders(did), [did])
  const [addOpen, setAddOpen] = useState(false)
  const [phoneOpen, setPhoneOpen] = useState(false)
  const [busyItem, setBusyItem] = useState(null)
  const d = distributors.data?.find((x) => x.id === did)
  const own = useMemo(() => (items.data || []).filter((it) => it.distributor_id === did), [items.data, did])
  const others = useMemo(() => (items.data || []).filter((it) => it.active && it.distributor_id !== did), [items.data, did])

  async function assign(item, distributorId) {
    setBusyItem(item.id)
    try {
      await api.updateItem(item.id, { distributor_id: distributorId })
      items.reload()
      distributors.reload()
      return true
    } catch (e) {
      console.error('item assign failed', e?.code)
      toast(t('save_failed'))
      return false
    } finally {
      setBusyItem(null)
    }
  }

  async function add(item) {
    setAddOpen(false)
    if (await assign(item, did)) toast(t('item_moved', { item: item.name_en, name: d.name }))
  }

  async function remove(item) {
    const before = item.distributor_id
    if (await assign(item, null)) {
      toast(t('item_removed_from', { item: item.name_en }), { label: t('undo'), onClick: () => assign(item, before) })
    }
  }

  if (distributors.status === 'loading') return <><TopBar onBack={() => navigate('/distributors')} /><main className="mx-auto max-w-app px-4"><Loading rows={3} /></main></>
  if (!d) return <><TopBar onBack={() => navigate('/distributors')} /><main className="mx-auto max-w-app px-4"><ErrorState onRetry={distributors.reload} /></main></>

  return (
    <>
      <TopBar title={d.name} onBack={() => navigate('/distributors')} />
      <main className="mx-auto max-w-app px-4 pb-28 space-y-5">
        <section className={`rounded-card p-4 shadow-lift ${stripeClass(d.tint_index ?? d.id)}`}>
          <p className="text-lg font-medium">{t.day(d.next_visit_date)}, <span className="num">{t.date(d.next_visit_date)}</span></p>
          <p className="text-ink-2">{t('in_n_every', { when: t.when(d.days_to_next_visit), n: d.cycle_days })}</p>
          {d.last_visit_date && <p className="text-sm text-ink-2">{t('last_visit_on', { date: t.date(d.last_visit_date) })}</p>}
          <div className="mt-3 flex items-center gap-2 border-t border-rule pt-3">
            <span className={`flex-1 ${d.phone ? 'num' : 'text-muted'}`}>{d.phone || t('no_phone_yet')}</span>
            {d.phone && <PhoneButton key={d.phone} distributor={d} />}
            <Button variant="text" icon={d.phone ? Pencil : Plus} className="min-h-[44px] px-3 text-sm" onClick={() => setPhoneOpen(true)}>
              {d.phone ? t('edit_phone') : t('add_phone')}
            </Button>
          </div>
        </section>

        <section>
          <h2 className="text-lg mb-2">{t('past_orders')}</h2>
          {orders.status === 'loading' && <Loading rows={2} />}
          {orders.status === 'error' && <ErrorState onRetry={orders.reload} />}
          {orders.status === 'ok' && orders.data.length === 0 && <EmptyState title={t('past_orders')} body={t('no_past_orders')} />}
          {orders.status === 'ok' && orders.data.length > 0 && (
            <ul className="space-y-3">
              {orders.data.map((o) => (
                <li key={o.log_id}>
                  <Card className="px-4 py-3">
                    <button type="button" onClick={() => navigate(`/log/${o.log_id}/result?d=${did}`)}
                      className="flex w-full min-h-control items-center justify-between gap-2 text-left font-medium rounded-control focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus">
                      <span>{t.day(o.log_date)}, <span className="num">{t.date(o.log_date)}</span></span>
                      <ChevronRight size={20} aria-hidden="true" className="shrink-0 text-muted" />
                    </button>
                    <ul className="mt-2 divide-y divide-rule">
                      {o.lines.map((l) => (
                        <li key={l.item_id} className="flex items-center justify-between gap-2 py-2">
                          <ItemLabel item={l} size="sm" />
                          <span className="shrink-0 text-right">
                            <span className="block num">{l.final_qty} {l.unit}</span>
                            {packText(t, l.final_qty, l.pack_size) && <span className="block num text-sm text-muted">{packText(t, l.final_qty, l.pack_size)}</span>}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg">{t('items_they_give')}</h2>
            <Button variant="text" icon={Plus} className="min-h-[44px] px-3" disabled={items.status !== 'ok' || others.length === 0} onClick={() => setAddOpen(true)}>{t('add_item_to')}</Button>
          </div>
          {items.status === 'loading' && <Loading rows={3} />}
          {items.status === 'error' && <ErrorState onRetry={items.reload} />}
          {items.status === 'ok' && own.length === 0 && (
            <EmptyState title={t('items_they_give')} body={t('no_items_yet')}>
              <Button icon={Plus} disabled={others.length === 0} onClick={() => setAddOpen(true)}>{t('add_item_to')}</Button>
            </EmptyState>
          )}
          {items.status === 'ok' && own.length > 0 && (
            <Card>
              <ul className="divide-y divide-rule">
                {own.map((it) => (
                  <li key={it.id} className="flex items-center gap-2 px-4 py-2">
                    <ItemLabel item={it} size="sm" className="flex-1" />
                    <IconButton icon={X} label={`${t('remove_item')}: ${it.name_en}`} className="min-h-[44px] w-11 text-muted" disabled={busyItem === it.id} onClick={() => remove(it)} />
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </section>
      </main>

      <Sheet open={addOpen} onClose={() => setAddOpen(false)} title={t('add_item_to')}>
        <ul className="divide-y divide-rule max-h-[60vh] overflow-y-auto">
          {others.map((it) => {
            const from = distributors.data?.find((x) => x.id === it.distributor_id)
            return (
              <li key={it.id}>
                <button type="button" className="w-full flex items-center gap-2 py-2 text-left min-h-control" onClick={() => add(it)}>
                  <ItemLabel item={it} size="sm" className="flex-1" />
                  <span className="shrink-0 text-sm text-muted">{from ? from.name : t('no_distributor')}</span>
                </button>
              </li>
            )
          })}
        </ul>
      </Sheet>
      <PhoneSheet key={`${d.id}-${phoneOpen}`} open={phoneOpen} distributor={d} initial={d.phone || ''} onClose={() => setPhoneOpen(false)} />
    </>
  )
}
