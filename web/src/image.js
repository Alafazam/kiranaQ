// Resize a photo to at most MAX_SIDE px on a canvas, as a JPEG data URL.
export const MAX_SIDE = 1600
export const MAX_PHOTOS = 3
const JPEG_QUALITY = 0.82

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('image load failed'))
    img.src = src
  })
}

export async function resizeToDataUrl(src) {
  const img = await loadImage(src)
  const scale = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(img.naturalWidth * scale)
  canvas.height = Math.round(img.naturalHeight * scale)
  canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
  return canvas.toDataURL('image/jpeg', JPEG_QUALITY)
}

export function fileToObjectUrl(file) {
  return URL.createObjectURL(file)
}

export async function dataUrlToBlob(dataUrl) {
  const res = await fetch(dataUrl)
  return res.blob()
}

// Count box (R2b): fractions of width and height, {x0, y0, x1, y1}.
export const FULL_BOX = { x0: 0, y0: 0, x1: 1, y1: 1 }
export const MIN_BOX_FRACTION = 0.2

// Crops a data URL to the box, then resizes to at most MAX_SIDE px. Returns a JPEG blob.
export async function cropToBlob(src, box = FULL_BOX) {
  const img = await loadImage(src)
  const sx = box.x0 * img.naturalWidth
  const sy = box.y0 * img.naturalHeight
  const sw = (box.x1 - box.x0) * img.naturalWidth
  const sh = (box.y1 - box.y0) * img.naturalHeight
  const scale = Math.min(1, MAX_SIDE / Math.max(sw, sh))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(sw * scale)
  canvas.height = Math.round(sh * scale)
  canvas.getContext('2d').drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height)
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('crop failed'))), 'image/jpeg', JPEG_QUALITY))
}
