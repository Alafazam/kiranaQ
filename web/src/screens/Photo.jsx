import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Camera, Images, X } from 'lucide-react'
import { api } from '../api.js'
import { useT } from '../i18n.js'
import { clearDraft, readDraft, writeDraft } from '../state.jsx'
import { Button, Dialog, ErrorState, IconButton, Loading, Sheet, Skeleton } from '../ui/kit.jsx'
import BoxEditor from '../ui/BoxEditor.jsx'
import { TopBar, Steps } from '../ui/TopBar.jsx'
import { useToast } from '../ui/Toast.jsx'
import { FULL_BOX, MAX_PHOTOS, cropToBlob, fileToObjectUrl, resizeToDataUrl } from '../image.js'
import { useLoad } from '../state.jsx'

// Draft photos are {src, box}; older drafts stored plain data URLs.
const normalize = (list) => (list || []).map((p) => (typeof p === 'string' ? { src: p, box: FULL_BOX } : p))
const loadSamples = () => fetch('/samples/samples.json').then((r) => { if (!r.ok) throw new Error(`samples ${r.status}`); return r.json() })

export default function Photo() {
  const t = useT()
  const navigate = useNavigate()
  const toast = useToast()
  const fileRef = useRef(null)
  const [photos, setPhotos] = useState(() => normalize(readDraft()?.photos))
  const [selected, setSelected] = useState(() => Math.max(0, normalize(readDraft()?.photos).length - 1))
  const [sampleOpen, setSampleOpen] = useState(false)
  const samples = useLoad(loadSamples, [])
  const [counting, setCounting] = useState(false)
  const [confirmBack, setConfirmBack] = useState(false)
  const full = photos.length >= MAX_PHOTOS

  function save(next) {
    setPhotos(next)
    writeDraft({ ...(readDraft() || {}), photos: next })
  }

  async function addFromSrc(src, box = FULL_BOX) {
    try {
      const dataUrl = await resizeToDataUrl(src)
      const next = [...photos, { src: dataUrl, box }].slice(0, MAX_PHOTOS)
      save(next)
      setSelected(next.length - 1)
    } catch (e) {
      console.error('photo resize failed', e)
      toast(t('vision_failed'))
    }
  }

  async function onFiles(e) {
    const files = Array.from(e.target.files || []).slice(0, MAX_PHOTOS - photos.length)
    let next = [...photos]
    for (const f of files) {
      const url = fileToObjectUrl(f)
      try { next.push({ src: await resizeToDataUrl(url), box: FULL_BOX }) } catch (err) { console.error('photo resize failed', err) } finally { URL.revokeObjectURL(url) }
    }
    save(next.slice(0, MAX_PHOTOS))
    setSelected(Math.min(next.length, MAX_PHOTOS) - 1)
    e.target.value = ''
  }

  function remove(i) {
    const removed = photos[i]
    const next = photos.filter((_, j) => j !== i)
    save(next)
    setSelected(Math.max(0, next.length - 1))
    toast(t('photo_removed'), { label: t('undo'), onClick: () => save([...next.slice(0, i), removed, ...next.slice(i)]) })
  }

  function setBox(i, box) {
    save(photos.map((p, j) => (j === i ? { ...p, box } : p)))
  }

  async function count() {
    setCounting(true)
    let counts = []
    try {
      const blobs = await Promise.all(photos.map((p) => cropToBlob(p.src, p.box)))
      const res = await api.vision(blobs)
      if (res.error_code || res.items.length === 0) toast(t('vision_failed'))
      counts = res.items.map((it) => ({ item_id: it.item_id, count: it.count, source: 'vision', vision_count: it.count, vision_confidence: it.confidence }))
    } catch (e) {
      console.error('vision failed', e)
      toast(t('vision_failed'))
    }
    writeDraft({ photos, counts, source: 'photo', photo_count: photos.length })
    setCounting(false)
    navigate('/log/new/check')
  }

  function withoutPhoto() {
    writeDraft({ photos: [], counts: [], source: 'manual', photo_count: 0 })
    navigate('/log/new/check')
  }

  function back() {
    if (photos.length) setConfirmBack(true)
    else navigate('/')
  }

  return (
    <>
      <TopBar onBack={back}><Steps current={0} /></TopBar>
      <main className="mx-auto max-w-app px-4 pb-44">
        {counting ? (
          <div role="status" className="mt-4 space-y-3">
            <p className="text-lg font-medium">{t('counting')}</p>
            {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-[76px]" />)}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 mt-4">
              <button type="button" disabled={full} onClick={() => fileRef.current?.click()}
                className="mould mould-secondary flex-col min-h-[140px] border-dashed text-center">
                <Camera size={24} aria-hidden />{t('take_photo')}
              </button>
              <button type="button" disabled={full} onClick={() => setSampleOpen(true)}
                className="mould mould-secondary flex-col min-h-[140px] text-center">
                <Images size={24} aria-hidden />{t('use_sample')}
              </button>
            </div>
            <input ref={fileRef} type="file" accept="image/*" capture="environment" multiple className="sr-only" onChange={onFiles} tabIndex={-1} aria-hidden />
            <p className="mt-3 text-sm text-muted">{t('photos_max', { n: MAX_PHOTOS })}</p>
            {photos.length > 0 && (
              <ul className="mt-3 grid grid-cols-3 gap-3">
                {photos.map((p, i) => (
                  <li key={i} className="relative">
                    <button type="button" aria-pressed={i === selected} aria-label={`${t('count_box')} ${i + 1}`} onClick={() => setSelected(i)}
                      className={`relative block w-full overflow-hidden rounded-control border-2 ${i === selected ? 'border-accent' : 'border-rule'}`}>
                      <img src={p.src} alt="" className="block w-full aspect-square object-cover" />
                    </button>
                    <IconButton icon={X} label={t('remove_photo')} variant="secondary" className="absolute -top-2 -right-2 !min-h-[44px] !w-[44px]" onClick={() => remove(i)} />
                  </li>
                ))}
              </ul>
            )}
            {photos[selected] && (
              <section className="mt-4">
                <h2 className="text-lg">{t('count_box')}</h2>
                <p className="text-sm text-ink-2 mb-2">{t('box_hint')}</p>
                <BoxEditor src={photos[selected].src} box={photos[selected].box} label={t('count_box')} onChange={(b) => setBox(selected, b)} />
              </section>
            )}
          </>
        )}
      </main>
      <div className="fixed inset-x-0 bottom-0 z-20 bg-paper pt-2 pb-4">
        <div className="mx-auto max-w-app px-4 space-y-2">
          <Button variant="text" className="w-full" disabled={counting} onClick={withoutPhoto}>{t('count_without_photo')}</Button>
          <Button variant="primary" className="w-full text-lg" busy={counting} disabled={photos.length === 0} onClick={count}>
            {counting ? t('counting') : t('count_items')}
          </Button>
        </div>
      </div>
      <Sheet open={sampleOpen} onClose={() => setSampleOpen(false)} title={t('pick_sample')}>
        {samples.status === 'loading' && <Loading rows={2} />}
        {samples.status === 'error' && <ErrorState onRetry={samples.reload} />}
        {samples.status === 'ok' && (
          <ul className="grid grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto">
            {samples.data.map((sample) => (
              <li key={sample.file}>
                <button type="button" className="block w-full text-left rounded-control overflow-hidden border border-rule bg-surface"
                  onClick={() => { setSampleOpen(false); addFromSrc(`/samples/${sample.file}`, sample.box || FULL_BOX) }}>
                  <span className="relative block">
                    <img src={`/samples/${sample.file}`} alt="" className="block aspect-[4/3] w-full object-cover" loading="lazy" />
                  </span>
                  <span className="block px-2 py-1 text-sm">{sample.title}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Sheet>
      <Dialog open={confirmBack} title={t('discard_title')} body={t('discard_body')} confirmLabel={t('discard')} cancelLabel={t('keep')}
        onCancel={() => setConfirmBack(false)} onConfirm={() => { clearDraft(); navigate('/') }} />
    </>
  )
}
