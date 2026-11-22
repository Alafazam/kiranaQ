import { useNavigate } from 'react-router-dom'
import { Camera } from 'lucide-react'
import { api } from '../api.js'
import { useT } from '../i18n.js'
import { useLoad } from '../state.jsx'
import { Button, EmptyState, ErrorState, Loading } from '../ui/kit.jsx'
import { TopBar } from '../ui/TopBar.jsx'
import CardList from './CardList.jsx'

export default function Orders() {
  const t = useT()
  const navigate = useNavigate()
  const res = useLoad(() => api.latestOrders(), [])
  return (
    <>
      <TopBar title={t('orders')} />
      <main className="mx-auto max-w-app px-4 pb-44">
        {res.status === 'loading' && <Loading rows={3} />}
        {res.status === 'error' && <ErrorState onRetry={res.reload} />}
        {res.status === 'ok' && (res.data.cards.length === 0 ? (
          <EmptyState title={t('orders_empty_title')} body={t('orders_empty_body')}>
            <Button variant="primary" icon={Camera} className="w-full" onClick={() => navigate('/log/new')}>{t('take_log')}</Button>
          </EmptyState>
        ) : (
          <>
            {res.data.log_date && <p className="mb-3 text-ink-2">{t('past_log')} {t.day(res.data.log_date)}, <span className="num">{t.date(res.data.log_date)}</span></p>}
            <CardList result={res.data} onChange={res.setData} />
          </>
        ))}
      </main>
    </>
  )
}
