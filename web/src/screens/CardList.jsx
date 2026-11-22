import { useT } from '../i18n.js'
import DistributorCard from './DistributorCard.jsx'

export default function CardList({ result, onChange }) {
  const t = useT()
  return (
    <div className="space-y-4">
      {result.not_counted > 0 && <p className="text-ink-2">{result.not_counted === 1 ? t('not_counted_1') : t('not_counted', { n: result.not_counted })}</p>}
      {result.cards.map((card) => (
        <DistributorCard key={card.distributor?.id ?? 'none'} card={card} logId={result.log_id} onChange={onChange} />
      ))}
    </div>
  )
}
