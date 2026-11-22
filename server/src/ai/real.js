// Builds the real AI object. Owner: Lane C (Phase 0 wires only the tested Sarvam speech calls).
import { speak, transcribe } from './sarvam.js';

function notReady(name) {
  return async () => {
    throw Object.assign(new Error(`${name} not implemented yet (Lane C)`), { code: 'not_implemented' });
  };
}

export function createRealAi({ db } = {}) {
  return {
    countItems: notReady('countItems'),
    stt: (audio, opts = {}) => transcribe(audio, opts),
    tts: (text, opts = {}) => speak(text, opts),
    parseEdits: notReady('parseEdits'),
  };
}
