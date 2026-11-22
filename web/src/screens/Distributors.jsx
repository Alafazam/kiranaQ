// "Distributor kab aayenge": one band per distributor, sorted by next visit,
// with the items that run out before that visit (from the latest result).
import { Link } from 'react-router-dom'
import { AlertTriangle, CheckCircle2, ChevronRight, Plus } from 'lucide-react'
import { useState } from 'react'
import AddDistributorSheet from './AddDistributorSheet.jsx'
import { api } from '../api.js'
import { useT } from '../i18n.js'
import { useLoad } from '../state.jsx'
import { Button, EmptyState, ErrorState, Skeleton, stripeClass } from '../ui/kit.jsx'
import ItemLabel from '../ui/ItemLabel.jsx'
import { TopBar } from '../ui/TopBar.jsx'
import { useAssistant } from '../assistant/AssistantProvider.jsx'

async function loadVisits() {
  const [distributors, latest] = await Promise.all([api.distributors(), api.latestOrders()])
  const runsOutBy = new Map()
  for (const card of latest.cards || []) {
    if (card.distributor) runsOutBy.set(card.distributor.id, card.runs_out)
  }
  const sorted = [...distributors].sort((a, b) => (a.days_to_next_visit ?? Infinity) - (b.days_to_next_visit ?? Infinity))
  return sorted.map((d) => ({ ...d, runs_out: runsOutBy.get(d.id) || [] }))
}

export default function Distributors() {
  const t = useT()
  const res = useLoad(loadVisits, [])
  const [addOpen, setAddOpen] = useState(false)
  useAssistant({ context: { distributors: (res.data || []).map(({ id, name, next_visit_date, days_to_next_visit }) => ({ id, name, next_visit_date, days_to_next_visit })) } })
  return (
    <>
      <TopBar title={t('distributor_visits')} />
      <main className="mx-auto max-w-app px-4 pb-28">
        {res.status === 'loading' && <div className="space-y-3" aria-hidden>{[0, 1, 2].map((i) => <Skeleton key={i} className="h-40" />)}</div>}
        {res.status === 'error' && <ErrorState onRetry={res.reload} />}
        {res.status === 'ok' && res.data.length === 0 && (
          <EmptyState title={t('no_dist_title')} body={t('no_dist_body')}>
            <Button icon={Plus} onClick={() => setAddOpen(true)}>{t('new_distributor')}</Button>
          </EmptyState>
        )}
        {res.status === 'ok' && res.data.length > 0 && (
          <Button icon={Plus} className="w-full mb-3" onClick={() => setAddOpen(true)}>{t('new_distributor')}</Button>
        )}
        {res.status === 'ok' && res.data.length > 0 && (
          <ul className="space-y-3">
            {res.data.map((d) => (
              <li key={d.id} className={`rounded-card p-3 shadow-lift ${stripeClass(d.tint_index ?? d.id)}`}>
                <Link to={`/distributors/${d.id}`} className="flex items-start gap-2 px-1">
                  <div className="flex-1">
                    <h2 className="text-xl">{d.name}</h2>
                    <p className="text-lg font-medium mt-1">{t.day(d.next_visit_date)}, <span className="num">{t.date(d.next_visit_date)}</span></p>
                    <p className="text-ink-2">{t('in_n_every', { when: t.when(d.days_to_next_visit), n: d.cycle_days })}</p>
                    {d.last_visit_date && <p className="text-sm text-ink-2">{t('last_visit_on', { date: t.date(d.last_visit_date) })}</p>}
                  </div>
                  <ChevronRight size={20} className="mt-1 text-ink-2" aria-hidden />
                </Link>
                <div className="mt-3 border-t border-rule pt-2 px-1">
                  {d.runs_out.length > 0 ? (
                    <>
                      <p className="flex items-center gap-1.5 font-medium text-danger">
                        <AlertTriangle size={20} aria-hidden />{t.runsOut(d.runs_out.length)}
                      </p>
                      <ul className="mt-1">
                        {d.runs_out.map((l) => <li key={l.item_id} className="py-1"><ItemLabel item={l} size="sm" /></li>)}
                      </ul>
                    </>
                  ) : (
                    <p className="flex items-center gap-1.5 text-muted"><CheckCircle2 size={20} aria-hidden />{t('no_runs_out')}</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
      <AddDistributorSheet open={addOpen} onClose={() => setAddOpen(false)} onAdded={() => res.reload()} />
    </>
  )
}
