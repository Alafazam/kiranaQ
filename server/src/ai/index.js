// The AI interface every route uses. Real: ai/real.js (Lane C). Fake: ai/fake.js (tests, demo:check).
//
// countItems(images, catalog)  images: [{buffer, mimeType}], catalog: listItems() rows
//   -> {items: [{item_id, count, confidence}]}   raw model answer, not yet validated
// stt(audio, {mimeType, filename, languageCode?, keyterms?})
//   -> {transcript, languageCode}
// tts(text, {languageCode})  -> Buffer (WAV)
// parseEdits(text, {lang, draft: [{item_id, count}], catalog})
//   -> {edits: [{item_id, count, confidence}], ask?: string}   raw, validated by ai/validate.js
//
// assist(text, {lang, screen, context, history, catalog})   OPTIONAL (Bolo voice assistant, spec 2026-11-22-voice-assistant)
//   -> {say, actions: [{type, ...}], expect: 'answer'|'confirm'|'done', options?: string[]}   raw, validated by ai/validate.js
//   Not in AI_METHODS: routes must check `typeof ai.assist === 'function'` and fall back when it is missing.
//
// Every real call writes one ai_call row (repo/aiCalls.js). Each function may throw; routes handle it.

export const AI_METHODS = ['countItems', 'stt', 'tts', 'parseEdits'];

export function assertAi(ai) {
  for (const m of AI_METHODS) {
    if (typeof ai?.[m] !== 'function') throw new Error(`ai.${m} is missing`);
  }
  return ai;
}
