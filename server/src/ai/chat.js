// One place for the two chat providers (Sarvam, Claude) and the timeout. Returns text; callers parse it.
import Anthropic from '@anthropic-ai/sdk';
import { SarvamAIClient } from 'sarvamai';
import { MODEL_TIMEOUT_MS } from '../core/config.js';

// Reasoning models spend tokens thinking first; a low limit gives empty content.
export const CHAT_MAX_TOKENS = 4096;
const DEFAULT_TEMPERATURE = 0;
const EMPTY_RETRIES = 1; // reasoning models sometimes return empty content; ask once more

let sarvam;
let anthropic;

function sarvamClient() {
  if (!sarvam) {
    if (!process.env.SARVAM_API_KEY) throw codedError('no_key', 'SARVAM_API_KEY is not set');
    sarvam = new SarvamAIClient({ apiSubscriptionKey: process.env.SARVAM_API_KEY });
  }
  return sarvam;
}

function anthropicClient() {
  if (!anthropic) {
    if (!process.env.ANTHROPIC_API_KEY) throw codedError('no_key', 'ANTHROPIC_API_KEY is not set');
    anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return anthropic;
}

export function codedError(code, message) {
  return Object.assign(new Error(message), { code });
}

function withTimeout(promise, ms) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(codedError('timeout', `model call took over ${ms} ms`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

/**
 * Ask a chat model. `images` is [{buffer, mimeType}] (may be empty).
 * @returns {Promise<string>} the model text; throws coded errors (timeout, empty_response, no_key, model_error)
 */
export async function askModel({ provider, model, system, prompt, images = [], timeoutMs = MODEL_TIMEOUT_MS }) {
  const call = provider === 'claude' ? askClaude : askSarvam;
  for (let attempt = 1; attempt <= EMPTY_RETRIES + 1; attempt += 1) {
    const text = await withTimeout(call({ model, system, prompt, images }), timeoutMs);
    if (typeof text === 'string' && text.trim()) return text;
  }
  throw codedError('empty_response', 'model returned no content');
}

async function askSarvam({ model, system, prompt, images }) {
  const userContent = [
    { type: 'text', text: prompt },
    ...images.map((img) => ({ type: 'image_url', image_url: { url: `data:${img.mimeType};base64,${img.buffer.toString('base64')}` } })),
  ];
  const messages = [
    ...(system ? [{ role: 'system', content: system }] : []),
    { role: 'user', content: images.length ? userContent : prompt },
  ];
  const res = await sarvamClient().chat.completionsV2({ model, max_tokens: CHAT_MAX_TOKENS, temperature: DEFAULT_TEMPERATURE, messages });
  return res.choices?.[0]?.message?.content;
}

async function askClaude({ model, system, prompt, images }) {
  const content = [
    ...images.map((img) => ({ type: 'image', source: { type: 'base64', media_type: img.mimeType, data: img.buffer.toString('base64') } })),
    { type: 'text', text: prompt },
  ];
  const res = await anthropicClient().messages.create({
    model,
    max_tokens: CHAT_MAX_TOKENS,
    temperature: DEFAULT_TEMPERATURE,
    ...(system && { system }),
    messages: [{ role: 'user', content }],
  });
  return res.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
}
