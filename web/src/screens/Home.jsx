import { Link, useNavigate } from 'react-router-dom'
import { Camera, AlertTriangle, Truck, ChevronRight } from 'lucide-react'
import { api } from '../api.js'
import { useT } from '../i18n.js'
import { useLoad, useStore } from '../state.jsx'
import { Button, Card, EmptyState, ErrorState, Skeleton, tintClass } from '../ui/kit.jsx'
import { TopBar, LangChip } from '../ui/TopBar.jsx'

function DistributorStrip() {
  const t = useT()
  const navigate = useNavigate()
  const { distributors } = useStore()
  if (distributors.status === 'loading') {
    return <div className="flex gap-3" aria-hidden>{[0, 1, 2].map((i) => <Skeleton key={i} className="h-32 w-40 shrink-0" />)}</div>
  }
  if (distributors.status === 'error') return <ErrorState onRetry={distributors.reload} />
  const list = distributors.data || []
  if (list.length === 0) {
    return (
      <EmptyState title={t('no_dist_title')} body={t('no_dist_body')}>
        <Button onClick={() => navigate('/settings')}>{t('add_distributor')}</Button>
      </EmptyState>
    )
  }
  return (
    <ul className="flex gap-3 overflow-x-auto -mx-4 px-4 pb-2 snap-x">
      {list.map((d) => (
        <li key={d.id} className="snap-start shrink-0">
          <Link to="/distributors" className={`block w-40 rounded-card p-3 ${tintClass(d.tint_index ?? d.id)}`}>
            <p className="font-medium truncate">{d.name}</p>
            <p className="num text-lg mt-1">{t.day(d.next_visit_date)}</p>
            <p className="num">{t.date(d.next_visit_date)}</p>
            <p className="text-sm text-ink-2">{t.when(d.days_to_next_visit)}</p>
            {d.runs_out_count > 0 && (
              <p className="mt-2 flex items-center gap-1 text-sm font-medium text-danger">
                <AlertTriangle size={20} aria-hidden />{t.runsOut(d.runs_out_count)}
              </p>
            )}
          </Link>
        </li>
      ))}
    </ul>
  )
}

function LogList() {
  const t = useT()
  const logs = useLoad(() => api.logs(), [])
  const today = new Date()
  const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  if (logs.status === 'loading') return <div className="space-y-2" aria-hidden>{[0, 1, 2].map((i) => <Skeleton key={i} className="h-[72px]" />)}</div>
  if (logs.status === 'error') return <ErrorState onRetry={logs.reload} />
  if (logs.data.length === 0) return <EmptyState title={t('empty_logs_title')} body={t('empty_logs_body')} />
  return (
    <Card>
      <ul className="divide-y divide-rule">
        {logs.data.map((log) => (
          <li key={log.id}>
            <Link to={`/log/${log.id}/result`} className="flex items-center gap-3 px-4 py-3 min-h-[72px]">
              <div className="flex-1">
                <p className="font-medium">
                  {log.log_date === todayIso ? `${t('today')}, ${t.date(log.log_date)}` : t.date(log.log_date, true)}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-2">
                  <span>{t('items_n', { n: log.item_count })}</span>
                  {log.runs_out_count > 0 && (
                    <span className="flex items-center gap-1 text-danger font-medium"><AlertTriangle size={20} aria-hidden />{t.runsOut(log.runs_out_count)}</span>
                  )}
                  {log.visits.map((v) => (
                    <span key={v.distributor_id} className="flex items-center gap-1"><Truck size={20} aria-hidden />{v.name}</span>
                  ))}
                </div>
              </div>
              <ChevronRight size={20} className="text-muted" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  )
}

export default function Home() {
  const t = useT()
  const navigate = useNavigate()
  const store = useLoad(() => api.store(), [])
  return (
    <>
      <TopBar title={store.data?.name ?? t('app')} right={<LangChip />} />
      <main className="mx-auto max-w-app px-4 pb-48">
        <div className="mt-2 mb-3 flex items-center justify-between">
          <h2 className="text-lg">{t('next_visits')}</h2>
          <Link to="/distributors" className="text-sm underline min-h-[44px] flex items-center">{t('see_all')}</Link>
        </div>
        <DistributorStrip />
        <h2 className="text-lg mt-6 mb-3">{t('stock_logs')}</h2>
        <LogList />
      </main>
      <div className="fixed inset-x-0 bottom-[61px] z-20 bg-paper pt-2 pb-3">
        <div className="mx-auto max-w-app px-4">
          <Button variant="primary" icon={Camera} className="w-full text-lg" onClick={() => navigate('/log/new')}>{t('take_log')}</Button>
        </div>
      </div>
    </>
  )
}
