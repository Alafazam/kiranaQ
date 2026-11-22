// "Did X deliver today?" One sheet per delivery candidate, shown in order.
import { useState } from 'react'
import { api } from '../api.js'
import { useT } from '../i18n.js'
import { Button, Sheet } from '../ui/kit.jsx'
import ItemLabel from '../ui/ItemLabel.jsx'
import { useToast } from '../ui/Toast.jsx'
import { useAssistant } from '../assistant/AssistantProvider.jsx'
import { useEffect, useRef } from 'react'

export default function VisitSheet({ logId, candidates, onDone }) {
  const t = useT()
  const toast = useToast()
  const [index, setIndex] = useState(0)
  const [busy, setBusy] = useState(null)
  const c = candidates[index]
  const assistant = useAssistant({ handlers: { visit: (a) => answer(Boolean(a.delivered)) } })
  const askedFor = useRef(-1) // React dev mode runs effects twice; ask once per candidate
  useEffect(() => {
    if (!c || askedFor.current === index) return
    askedFor.current = index
    const act = (delivered) => [{ type: 'visit', distributor_id: c.distributor_id, delivered }]
    assistant?.notify(t('assist_visit_q', { name: c.name }), { yes: act(true), no: act(false) })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index])
  if (!c) return null

  async function answer(confirmed) {
    setBusy(confirmed ? 'yes' : 'no')
    try {
      await api.recordVisit(logId, { distributor_id: c.distributor_id, confirmed })
    } catch (e) {
      console.error('visit save failed', e)
      toast(t('save_failed'))
      setBusy(null)
      return
    }
    setBusy(null)
    if (index + 1 < candidates.length) setIndex(index + 1)
    else onDone()
  }

  return (
    <Sheet open title={t('visit_q', { name: c.name })} onClose={() => !busy && answer(false)}>
      <ul className="divide-y divide-rule mb-4">
        {c.items.map((it) => (
          <li key={it.item_id} className="flex items-center justify-between py-2">
            <ItemLabel item={it} size="sm" />
            <span className="num">+{it.rise}</span>
          </li>
        ))}
      </ul>
      <div className="grid grid-cols-2 gap-3">
        <Button busy={busy === 'no'} disabled={Boolean(busy)} onClick={() => answer(false)}>{t('no')}</Button>
        <Button variant="primary" busy={busy === 'yes'} disabled={Boolean(busy)} onClick={() => answer(true)}>{t('yes_delivered')}</Button>
      </div>
    </Sheet>
  )
}
