// Item row label: small product thumbnail, English name, Hindi name below (both languages).
// Thumbnail from /products/<sku_key>.jpg when products/index.json lists it; else a letter tile.
import { useEffect, useState } from 'react'
import { useStore } from '../state.jsx'

let productIndex = null // Promise<Set<string>>, loaded once per page
function loadProductIndex() {
  if (!productIndex) {
    productIndex = fetch(`${import.meta.env.BASE_URL}products/index.json`)
      .then((r) => (r.ok ? r.json() : []))
      .then((list) => new Set(Array.isArray(list) ? list : []))
      .catch((e) => {
        console.warn('product images index not loaded', e)
        return new Set()
      })
  }
  return productIndex
}

function useHasImage(skuKey) {
  const [has, setHas] = useState(false)
  useEffect(() => {
    let live = true
    if (skuKey) loadProductIndex().then((set) => live && setHas(set.has(skuKey)))
    return () => { live = false }
  }, [skuKey])
  return has
}

export function ItemThumb({ item, size = 'md' }) {
  const has = useHasImage(item.sku_key)
  const [failed, setFailed] = useState(false)
  const box = size === 'sm' ? 'w-10 h-10' : 'w-12 h-12'
  if (has && !failed) {
    return <img src={`${import.meta.env.BASE_URL}products/${item.sku_key}.jpg`} alt="" loading="lazy" onError={() => setFailed(true)}
      className={`${box} shrink-0 rounded-control object-cover bg-surface border border-rule`} />
  }
  return (
    <span aria-hidden className={`${box} shrink-0 rounded-control flex items-center justify-center font-display text-lg text-ink bg-paper-2 border border-rule`}>
      {(item.name_en || '?').charAt(0).toUpperCase()}
    </span>
  )
}

// `item` can be a line, a count or an item: needs name_en, name_hi, and sku_key or item_id/id.
export default function ItemLabel({ item, size = 'md', className = '' }) {
  const { items } = useStore()
  const id = item.item_id ?? item.id
  const full = item.sku_key && item.name_en ? item : { ...(items.data || []).find((it) => it.id === id), ...item }
  if (!full.sku_key) full.sku_key = (items.data || []).find((it) => it.id === id)?.sku_key
  return (
    <span className={`flex items-center gap-3 min-w-0 ${className}`}>
      <ItemThumb item={full} size={size} />
      <span className="min-w-0">
        <span className="block font-medium leading-snug">{full.name_en}</span>
        {full.name_hi && <span className="block text-sm text-ink-2 leading-snug">{full.name_hi}</span>}
      </span>
    </span>
  )
}
