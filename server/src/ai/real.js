// Builds the real AI object. Providers come from core/config.js (VISION_PROVIDER, PARSE_PROVIDER).
// Logging of ai_call rows is done by the routes (one home), using describe(kind) for provider and model.
import { PARSE_PROVIDER, SARVAM_STT_MODEL, SARVAM_TTS_MODEL, VISION_PROVIDER } from '../core/config.js';
import { speak, transcribe } from './sarvam.js';
import { countItems, visionModel } from './vision.js';
import { parseEdits, parseModel } from './parse.js';

const DESCRIBE = {
  vision: () => ({ provider: VISION_PROVIDER, model: visionModel() }),
  parse: () => ({ provider: PARSE_PROVIDER, model: parseModel() }),
  stt: () => ({ provider: 'sarvam', model: SARVAM_STT_MODEL }),
  tts: () => ({ provider: 'sarvam', model: SARVAM_TTS_MODEL }),
};

export function createRealAi() {
  return {
    countItems: (images, catalog) => countItems(images, catalog),
    stt: (audio, opts = {}) => transcribe(audio, opts),
    tts: (text, opts = {}) => speak(text, opts),
    parseEdits: (text, ctx) => parseEdits(text, ctx),
    describe: (kind) => DESCRIBE[kind](),
  };
}
