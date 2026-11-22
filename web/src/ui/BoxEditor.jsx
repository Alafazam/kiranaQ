// Count box editor: drag the four corners. Box in fractions, min MIN_BOX_FRACTION per side.
import { useRef } from 'react'
import { MIN_BOX_FRACTION } from '../image.js'

const CORNERS = [['x0', 'y0'], ['x1', 'y0'], ['x0', 'y1'], ['x1', 'y1']]
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))

export function BoxOverlay({ box }) {
  return (
    <div className="absolute pointer-events-none border-2 border-accent rounded-[4px]"
      style={{ left: `${box.x0 * 100}%`, top: `${box.y0 * 100}%`, width: `${(box.x1 - box.x0) * 100}%`, height: `${(box.y1 - box.y0) * 100}%`, boxShadow: '0 0 0 9999px var(--color-scrim)' }} />
  )
}

export default function BoxEditor({ src, box, onChange, label }) {
  const ref = useRef(null)

  function onPointerDown(e, [kx, ky]) {
    e.preventDefault()
    const el = e.currentTarget
    el.setPointerCapture(e.pointerId)
    const rect = ref.current.getBoundingClientRect()
    const move = (ev) => {
      const fx = clamp((ev.clientX - rect.left) / rect.width, 0, 1)
      const fy = clamp((ev.clientY - rect.top) / rect.height, 0, 1)
      const next = { ...box }
      next[kx] = kx === 'x0' ? Math.min(fx, box.x1 - MIN_BOX_FRACTION) : Math.max(fx, box.x0 + MIN_BOX_FRACTION)
      next[ky] = ky === 'y0' ? Math.min(fy, box.y1 - MIN_BOX_FRACTION) : Math.max(fy, box.y0 + MIN_BOX_FRACTION)
      box = next
      onChange(next)
    }
    const up = () => {
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerup', up)
      el.removeEventListener('pointercancel', up)
    }
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerup', up)
    el.addEventListener('pointercancel', up)
  }

  return (
    <div ref={ref} className="relative select-none touch-none" aria-label={label}>
      <div className="relative overflow-hidden rounded-control">
        <img src={src} alt="" className="block w-full" draggable={false} />
        <BoxOverlay box={box} />
      </div>
      {CORNERS.map(([kx, ky]) => (
        <button key={kx + ky} type="button" aria-label={`${label} ${kx}${ky}`}
          className="absolute w-11 h-11 -ml-[22px] -mt-[22px] flex items-center justify-center touch-none"
          style={{ left: `${box[kx] * 100}%`, top: `${box[ky] * 100}%` }}
          onPointerDown={(e) => onPointerDown(e, [kx, ky])}>
          <span className="block w-5 h-5 rounded-pill bg-surface border-[3px] border-accent shadow-lift" />
        </button>
      ))}
    </div>
  )
}
