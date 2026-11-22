// Hold-to-speak recorder on MediaRecorder. Stops by itself at MAX_RECORD_MS.
export const MAX_RECORD_MS = 25000

function pickMime() {
  if (typeof MediaRecorder === 'undefined') return null
  for (const m of ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4']) {
    if (MediaRecorder.isTypeSupported?.(m)) return m
  }
  return ''
}

export function canRecord() {
  return Boolean(navigator.mediaDevices?.getUserMedia) && pickMime() !== null
}

// Returns {stop(): Promise<Blob>}. Throws if the mic is blocked.
export async function startRecording(onAutoStop) {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
  const mimeType = pickMime()
  const rec = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
  const chunks = []
  rec.ondataavailable = (e) => e.data.size && chunks.push(e.data)
  const done = new Promise((resolve) => {
    rec.onstop = () => {
      stream.getTracks().forEach((tr) => tr.stop())
      resolve(new Blob(chunks, { type: rec.mimeType || 'audio/webm' }))
    }
  })
  rec.start()
  const timer = setTimeout(() => { if (rec.state === 'recording') { rec.stop(); onAutoStop?.() } }, MAX_RECORD_MS)
  return {
    stop() {
      clearTimeout(timer)
      if (rec.state === 'recording') rec.stop()
      return done
    },
  }
}

// Plays TTS audio bytes. Resolves when playback starts.
export function playBlob(blob) {
  const url = URL.createObjectURL(blob)
  const audio = new Audio(url)
  audio.onended = () => URL.revokeObjectURL(url)
  return audio.play()
}
