import { useEffect, useRef } from 'react'
import { useT } from '../i18n.js'
import { useAssistant } from '../assistant/AssistantProvider.jsx'
import DistributorCard from './DistributorCard.jsx'

// Short summary for the assistant: what runs out first.
function runsOutSummary(t, cards) {
  const names = cards.flatMap((c) => c.runs_out.map((l) => l.name_en))
  return names.length ? t('assist_runs_out', { items: names.slice(0, 3).join(', ') }) : t('assist_nothing_out')
}

export default function CardList({ result, onChange, announce = false }) {
  const t = useT()
  const withDist = result.cards.filter((c) => c.distributor)
  const assistant = useAssistant({
    context: {
      log_id: result.log_id,
      cards: withDist.map((c) => ({
        distributor_id: c.distributor.id, name: c.distributor.name,
        next_visit_date: c.distributor.next_visit_date, days_to_next_visit: c.distributor.days_to_next_visit,
        runs_out: c.runs_out.map((l) => l.item_id),
        order: [...c.runs_out, ...c.order].map((l) => ({ item_id: l.item_id, qty: l.final_qty ?? l.suggested_qty })),
        confirmed: c.confirmed,
      })),
    },
  })
  const said = useRef(false)
  useEffect(() => {
    if (!announce || said.current) return
    said.current = true
    const options = withDist.filter((c) => !c.confirmed).slice(0, 3).map((c) => t('assist_opt_confirm', { name: c.distributor.name.split(' ')[0] }))
    assistant?.notify(t('assist_saved', { summary: runsOutSummary(t, result.cards) }), { options })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [announce])
  return (
    <div className="space-y-4">
      {result.not_counted > 0 && <p className="text-ink-2">{result.not_counted === 1 ? t('not_counted_1') : t('not_counted', { n: result.not_counted })}</p>}
      <div className="space-y-4">
        {result.cards.map((card) => (
          <DistributorCard key={card.distributor?.id ?? 'none'} card={card} logId={result.log_id} onChange={onChange} />
        ))}
      </div>
    </div>
  )
}
