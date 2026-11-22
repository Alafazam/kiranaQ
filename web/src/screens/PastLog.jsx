import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../api.js'
import { useT } from '../i18n.js'
import { useLoad, useStore } from '../state.jsx'
import { Button, Card, ErrorState, Loading } from '../ui/kit.jsx'
import { TopBar } from '../ui/TopBar.jsx'

export default function PastLog() {
  const t = useT()
  const { id } = useParams()
  const navigate = useNavigate()
  const { items } = useStore()
  const res = useLoad(() => api.log(id), [id])
  const byId = new Map((items.data || []).map((it) => [it.id, it]))
  return (
    <>
      <TopBar title={t('past_log')} onBack={() => navigate('/')} />
      <main className="mx-auto max-w-app px-4 pb-28">
        {res.status === 'loading' && <Loading rows={4} />}
        {res.status === 'error' && <ErrorState onRetry={res.reload} />}
        {res.status === 'ok' && (
          <>
            <p className="num text-lg mb-3">{t.date(res.data.log.log_date, true)}</p>
            <Card>
              <ul className="divide-y divide-rule">
                {res.data.counts.map((c) => {
                  const it = byId.get(c.item_id)
                  return (
                    <li key={c.item_id} className="flex justify-between px-4 py-3">
                      <span>{it ? t.itemName(it) : c.item_id}</span>
                      <span className="num">{c.count} {it?.unit}</span>
                    </li>
                  )
                })}
              </ul>
            </Card>
            <Button className="w-full mt-4" onClick={() => navigate(`/log/${id}/result`)}>{t('see_result')}</Button>
          </>
        )}
      </main>
    </>
  )
}
