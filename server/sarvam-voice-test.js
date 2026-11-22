// Round trip: text -> speech -> text. Needs SARVAM_API_KEY in server/.env.
import 'dotenv/config';
import { speak, transcribe } from './src/ai/sarvam.js';

const text = 'I have twelve packets of Maggi and five bottles of oil.';
const audio = await speak(text);
console.log(`TTS ok: ${audio.length} bytes`);
const out = await transcribe(audio);
console.log('STT result:', out);
