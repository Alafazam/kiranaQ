// All Sarvam calls (text to speech, speech to text). The API key comes from the environment.
import { SarvamAIClient } from 'sarvamai';

export const TTS_MODEL = 'bulbul:v3';
export const STT_MODEL = 'saaras:v4';
export const DEFAULT_LANGUAGE = 'en-IN';
export const TTS_MAX_CHARS = 2500; // REST limit per request
export const STT_MAX_SECONDS = 30; // REST limit per request

let client;
function getClient() {
  if (!client) {
    if (!process.env.SARVAM_API_KEY) throw new Error('SARVAM_API_KEY is not set');
    client = new SarvamAIClient({ apiSubscriptionKey: process.env.SARVAM_API_KEY });
  }
  return client;
}

// Text in, WAV audio out (Buffer).
export async function speak(text, { languageCode = DEFAULT_LANGUAGE, speaker } = {}) {
  if (text.length > TTS_MAX_CHARS) throw new Error(`text is over ${TTS_MAX_CHARS} characters`);
  const res = await getClient().textToSpeech.convert({
    text,
    target_language_code: languageCode,
    model: TTS_MODEL,
    ...(speaker && { speaker }),
  });
  return Buffer.from(res.audios[0], 'base64');
}

// Audio in (Buffer), transcript out. Leave languageCode empty to auto-detect.
export async function transcribe(audio, { filename = 'audio.wav', mimeType = 'audio/wav', languageCode } = {}) {
  const file = new File([audio], filename, { type: mimeType });
  const res = await getClient().speechToText.transcribe({
    file,
    model: STT_MODEL,
    mode: 'codemix',
    ...(languageCode && { language_code: languageCode }),
  });
  return { transcript: res.transcript, languageCode: res.language_code };
}
