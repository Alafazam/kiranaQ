import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { api } from '../api.js'
import { useT } from '../i18n.js'
import { useLoad } from '../state.jsx'
import { EmptyState, ErrorState, Loading } from '../ui/kit.jsx'
import { TopBar, Steps } from '../ui/TopBar.jsx'
import CardList from './CardList.jsx'

export default function Result() {
  const t = useT()
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const res = useLoad(() => api.result(id), [id])
  const notCounted = location.state?.not_counted
  return (
    <>
      <TopBar onBack={() => navigate('/')}><Steps current={2} /></TopBar>
      <main className="mx-auto max-w-app px-4 pb-12 pt-2">
        {res.status === 'loading' && <Loading rows={3} />}
        {res.status === 'error' && <ErrorState onRetry={res.reload} />}
        {res.status === 'ok' && (res.data.cards.length === 0
          ? <EmptyState title={t('orders_empty_title')} body={t('orders_empty_body')} />
          : <CardList result={{ ...res.data, log_id: res.data.log_id ?? Number(id), not_counted: res.data.not_counted ?? notCounted }} onChange={res.setData} />)}
      </main>
    </>
  )
}
